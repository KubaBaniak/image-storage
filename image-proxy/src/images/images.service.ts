import {
  BadGatewayException,
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  OnModuleInit,
  UnprocessableEntityException,
} from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { v4 as uuidv4 } from 'uuid';
import { CreatePresignedUploadRequestDto } from './dto/createPresignedUploadRequest.dto';
import { Tables } from 'src/schema';
import {
  normalizeMime,
  equalsMime,
  decodeCursor,
  encodeCursor,
} from './helpers/helpers';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QdrantClient } from '@qdrant/js-client-rest';
import { EmbeddingService } from 'src/ml/embedding.service';
import { GetPreviewUrlsDto } from './dto/getPreviewUrls.dto';

const STORAGE_BUCKET_NAME = 'images';
const ORIGINALS_FOLDER_NAME = 'originals';

const MIME_EXT_MAP: Record<string, string> = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
};

@Injectable()
export class ImagesService implements OnModuleInit {
  private maxFileSizeBytes?: number;
  private acceptedMimeTypes?: string[];
  private collectionName = 'thumbnail-images';

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly embeddingService: EmbeddingService,
    @InjectQueue('image-tagging') private readonly taggingQueue: Queue,
    @Inject('QdrantClient') private readonly vectorClient: QdrantClient,
  ) {}

  async onModuleInit() {
    await Promise.all([
      this.initializeBucket(),
      this.initializeVectorStorageClient(),
    ]);
  }

  private async initializeBucket() {
    const { data, error } = await this.supabaseService
      .getClient()
      .storage.getBucket(STORAGE_BUCKET_NAME);

    if (error) {
      throw new InternalServerErrorException('Error accessing storage bucket');
    }

    this.maxFileSizeBytes = data.file_size_limit;
    this.acceptedMimeTypes = data.allowed_mime_types;
  }

  private async initializeVectorStorageClient() {
    const { exists } = await this.vectorClient.collectionExists(
      this.collectionName,
    );

    if (exists) {
      console.info(
        'Default Qdrant collection detected - skipping initialization',
      );
      return;
    }

    await this.vectorClient.createCollection(this.collectionName, {
      timeout: 10000,
      vectors: { size: 384, distance: 'Cosine' },
    });

    console.info('Default Qdrant collection created');
  }

  isValidFile(metadata: CreatePresignedUploadRequestDto) {
    if (
      this.maxFileSizeBytes !== undefined &&
      metadata.sizeBytes > this.maxFileSizeBytes
    ) {
      return false;
    }

    if (
      this.acceptedMimeTypes !== undefined &&
      this.acceptedMimeTypes.length > 0 &&
      !this.acceptedMimeTypes.includes(metadata.mimeType)
    ) {
      return false;
    }

    return true;
  }

  async generatePresignedUrl(metadata: CreatePresignedUploadRequestDto) {
    if (!this.isValidFile(metadata)) {
      throw new BadRequestException('Invalid file format');
    }
    const imageId = uuidv4();
    const client = this.supabaseService.getClient();
    const ext = MIME_EXT_MAP[metadata.mimeType];
    if (!ext) {
      throw new BadRequestException('Unsupported MIME type');
    }
    const filename = `${imageId}.${ext}`;
    const originalPath = `${ORIGINALS_FOLDER_NAME}/${filename}`;

    const imageRecord = {
      id: imageId,
      storage_path: originalPath,
      expected_mime_type: metadata.mimeType.toLowerCase(),
      expected_size_bytes: metadata.sizeBytes,
      status: 'pending' as const,
      created_at: new Date().toISOString(),
    };

    const { error: createError } = await client
      .from('images')
      .insert(imageRecord);

    if (createError) {
      throw new InternalServerErrorException('Failed to create image record');
    }

    const { data, error: originalUrlError } = await client.storage
      .from(STORAGE_BUCKET_NAME)
      .createSignedUploadUrl(originalPath, { upsert: true });

    if (originalUrlError) {
      throw new InternalServerErrorException(
        'Failed to generate original upload URL',
      );
    }

    return {
      imageId,
      originalUrl: data.signedUrl,
    };
  }

  async validateUploadFile(imageId: string) {
    const dbImageRecord = await this.getDbImageRecord(imageId, 'pending');

    if (!dbImageRecord) {
      throw new NotFoundException('Image not found or not pending');
    }

    const storageImageRecord = await this.getStorageImageFile(
      dbImageRecord.storage_path,
    );

    if (!storageImageRecord) {
      throw new UnprocessableEntityException(
        'File not found in storage (upload not completed yet)',
      );
    }

    const expSize = dbImageRecord.expected_size_bytes;
    const actSize = storageImageRecord.size;
    const expMime = normalizeMime(dbImageRecord.expected_mime_type);
    const actMime = normalizeMime(storageImageRecord.contentType);

    const sizeMismatch = expSize !== actSize;
    const mimeMismatch = !equalsMime(expMime, actMime);

    if (sizeMismatch || mimeMismatch) {
      const reason =
        sizeMismatch && mimeMismatch
          ? 'size_and_mime_mismatch'
          : sizeMismatch
            ? 'size_mismatch'
            : 'mime_mismatch';

      await this.invalidateImageDb(imageId, reason);
      throw new UnprocessableEntityException('Uploaded file failed validation');
    }

    try {
      await this.callThumbFunction(storageImageRecord.name);
    } catch {
      await this.invalidateImageDb(imageId, 'thumbnail_function_failed');
      throw new InternalServerErrorException('Thumbnail generation failed');
    }

    const thumbPath = this.toThumbPath(storageImageRecord.name);
    const thumbReady = await this.waitForThumbnail(thumbPath, 10_000);

    if (!thumbReady) {
      await this.invalidateImageDb(imageId, 'thumbnail_not_ready');
      throw new InternalServerErrorException('Thumbnail not available yet');
    }

    const validationResult = await this.validateImageDb(imageId, {
      mimeType: expMime,
      size: expSize,
      previewPath: thumbPath,
    });

    await this.taggingQueue.add(
      'tag-image',
      { imageId },
      {
        jobId: imageId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
      },
    );

    return validationResult;
  }

  async getStorageImageFile(storageFilePath: string) {
    const client = this.supabaseService.getClient();
    const image = await client.storage
      .from(STORAGE_BUCKET_NAME)
      .info(storageFilePath);
    if (!image.data?.contentType || !image.data.size) {
      throw new InternalServerErrorException(
        'Could not get storage image data',
      );
    }

    return {
      name: image.data.name,
      size: image.data.size,
      contentType: image.data.contentType,
    };
  }

  async getDbImageRecord(
    imageId: string,
    status?: 'rejected' | 'pending' | 'accepted',
  ): Promise<Tables<'images'>> {
    const client = this.supabaseService.getClient();
    let query = client.from('images').select('*').eq('id', imageId);
    if (status) query = query.eq('status', status);

    const { data, error } = await query.single();

    if (error) throw new InternalServerErrorException('DB error');
    if (!data) throw new NotFoundException('Image not found');

    return data;
  }

  async validateImageDb(
    imageId: string,
    data: { mimeType: string; size: number; previewPath: string },
  ) {
    const client = this.supabaseService.getClient();
    const record = await client
      .from('images')
      .update({
        status: 'accepted',
        mime_type: data.mimeType,
        preview_path: data.previewPath,
        size_bytes: data.size,
        validated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        rejection_reason: null,
      })
      .eq('id', imageId)
      .select()
      .single();

    if (!record) {
      throw new InternalServerErrorException('Error during validation of file');
    }
    return { id: record.data?.id, path: record.data?.storage_path };
  }

  async invalidateImageDb(imageId: string, reason: string) {
    const client = this.supabaseService.getClient();
    const { error: invalidateError } = await client
      .from('images')
      .update({
        status: 'rejected',
        rejection_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', imageId);

    if (invalidateError) {
      throw new InternalServerErrorException(
        'Error during invalidation of file',
      );
    }
  }

  async getPreviewUrls({ limit, after, q }: GetPreviewUrlsDto) {
    const client = this.supabaseService.getClient();

    let query = client
      .from('images')
      .select('id, preview_path, created_at')
      .eq('status', 'accepted')
      .not('preview_path', 'is', null)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });

    if (after) {
      const { createdAt, id } = decodeCursor(after);
      query = query.or(
        `created_at.lt.${createdAt},and(created_at.eq.${createdAt},id.lt.${id})`,
      );
    }

    query = query.limit(limit + 1);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const rows = data ?? [];
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    const last = page[page.length - 1];
    const lastCreatedAt = last?.created_at;
    const lastId = last?.id;

    const nextCursor =
      hasMore && lastCreatedAt
        ? encodeCursor({ createdAt: lastCreatedAt, id: lastId })
        : null;

    const paths = page.map((r) => r.preview_path as string);

    const { data: signed, error: signErr } = await client.storage
      .from(STORAGE_BUCKET_NAME)
      .createSignedUrls(paths, 60 * 60);

    if (signErr) throw new Error(signErr.message);

    const items = page.map((r, i) => ({
      id: r.id,
      createdAt: r.created_at,
      previewPath: r.preview_path,
      signedUrl: signed?.[i]?.signedUrl ?? null,
      signError: signed?.[i]?.error ?? null,
    }));

    if (!q) {
      return { items, nextCursor, limit };
    }
    return {
      items: await this.filterImagesByCaption(q, items, limit),
      nextCursor,
      limit,
    };
  }

  toThumbPath(name: string) {
    return name.replace(/^originals\//, 'thumbnails/');
  }

  async callThumbFunction(originalName: string) {
    const url =
      'https://wwnpuqvgffpdjvbmtdnb.supabase.co/functions/v1/generate-thumbnail';
    const key = this.configService.get<string>('SUPABASE_ANON_KEY');
    const res = await firstValueFrom(
      this.httpService.post(
        url,
        { record: { bucket: STORAGE_BUCKET_NAME, name: originalName } },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
          },
          timeout: 10_000,
          validateStatus: () => true,
        },
      ),
    );

    if (res.status < 200 || res.status >= 300) {
      throw new InternalServerErrorException('Thumbnail function failed');
    }
  }

  async waitForThumbnail(thumbPath: string, totalMs = 8000) {
    const client = this.supabaseService.getClient();
    const start = Date.now();
    let delay = 250;

    while (Date.now() - start < totalMs) {
      const { data, error } = await client.storage
        .from(STORAGE_BUCKET_NAME)
        .download(thumbPath);

      if (!error && data) return true;

      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(delay * 2, 1500);
    }
    return false;
  }

  async deleteImage(imageId: string) {
    const client = this.supabaseService.getClient();

    const dbImageRecord = await this.getDbImageRecord(imageId);

    const toDelete: string[] = [];
    if (dbImageRecord.storage_path) toDelete.push(dbImageRecord.storage_path);
    if (dbImageRecord.preview_path) toDelete.push(dbImageRecord.preview_path);

    const { error: storageErr } = await client.storage
      .from(STORAGE_BUCKET_NAME)
      .remove(toDelete);

    if (storageErr)
      throw new BadRequestException(
        `Storage delete failed - ${storageErr.message}`,
      );

    const { error: delErr } = await client
      .from('images')
      .delete()
      .eq('id', imageId);

    if (delErr) {
      console.error(`Failed to delete images: ${toDelete.join(', ')}`);
      throw new BadRequestException('DB delete failed');
    }
  }

  async getOriginalImageUrl(filename: string) {
    const client = this.supabaseService.getClient();

    const { data, error } = await client.storage
      .from(STORAGE_BUCKET_NAME)
      .createSignedUrl(`originals/${filename}`, 60 * 60);

    if (error)
      throw new BadGatewayException('Could not get URL of original image');

    return { signedUrl: data.signedUrl };
  }

  async setEmbeddings(id: string) {
    const image = await this.getDbImageRecord(id);
    if (!image.description) {
      throw new BadRequestException(
        'Could not genereate embeddings due to missing image description',
      );
    }

    const embeddings = await this.embeddingService.embedText(image.description);
    return this.vectorClient.upsert(this.collectionName, {
      wait: true,
      points: [
        {
          id,
          vector: embeddings,
          payload: { caption: image.description },
        },
      ],
    });
  }

  async filterImagesByCaption(
    searchText: string,
    images: {
      id: string;
      createdAt: string | null;
      previewPath: string | null;
      signedUrl: string | null;
      signError: string | null;
    }[],
    limit: number,
  ) {
    const embededSearchText = await this.embeddingService.embedText(searchText);

    const searchResults = await this.vectorClient.query(this.collectionName, {
      query: embededSearchText,
      limit,
    });

    const imageById = new Map(images.map((img) => [img.id, img]));

    return searchResults.points
      .filter((point) => point.score > 0.15)
      .map((point) => imageById.get(point.id as string))
      .filter((img): img is (typeof images)[number] => !!img);
  }
}
