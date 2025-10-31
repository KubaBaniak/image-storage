import {
  BadRequestException,
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
import { normalizeMime, equalsMime } from './helpers/helpers';

const STORAGE_BUCKET_NAME = 'images';

const MIME_EXT_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

@Injectable()
export class ImagesService implements OnModuleInit {
  private maxFileSizeBytes?: number;
  private acceptedMimeTypes?: string[];

  constructor(private readonly supabaseService: SupabaseService) {}

  async onModuleInit() {
    const { data, error } = await this.supabaseService
      .getClient()
      .storage.getBucket(STORAGE_BUCKET_NAME);

    if (error) {
      throw new InternalServerErrorException('Error accessing storage bucket');
    }

    this.maxFileSizeBytes = data.file_size_limit;
    this.acceptedMimeTypes = data.allowed_mime_types;
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

  async generatePresignedUrl(
    metadata: CreatePresignedUploadRequestDto,
  ): Promise<{ signedUrl: string }> {
    if (!this.isValidFile(metadata)) {
      throw new BadRequestException('Invalid file format');
    }
    const imageId = uuidv4();
    const client = this.supabaseService.getClient();
    const ext = MIME_EXT_MAP[metadata.mimeType];
    if (!ext) {
      throw new BadRequestException('Unsupported MIME type');
    }
    const filePath = `${imageId}.${ext}`;

    const imageRecord = {
      id: imageId,
      storage_path: filePath,
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

    const { data, error: signedUploadUrlError } = await client.storage
      .from(STORAGE_BUCKET_NAME)
      .createSignedUploadUrl(filePath, { upsert: true });

    if (signedUploadUrlError) {
      throw new InternalServerErrorException('Failed to generate upload URL');
    }
    return { signedUrl: data.signedUrl };
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

    return this.validateImageDb(imageId, { mimeType: expMime, size: expSize });
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
    return { size: image.data.size, contentType: image.data.contentType };
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
    data: { mimeType: string; size: number },
  ) {
    const client = this.supabaseService.getClient();
    const record = await client
      .from('images')
      .update({
        status: 'accepted',
        mime_type: data.mimeType,
        size_bytes: data.size,
        validated_at: new Date().toISOString(),
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
        validated_at: new Date().toISOString(),
      })
      .eq('id', imageId);

    if (invalidateError) {
      throw new InternalServerErrorException(
        'Error during invalidation of file',
      );
    }
  }

  async getImages() {
    const client = this.supabaseService.getClient();
    const { data: files } = await client.storage
      .from(STORAGE_BUCKET_NAME)
      .list();
    const paths = (files ?? []).map((file) => file.name);
    const { data: signedUrls } = await client.storage
      .from(STORAGE_BUCKET_NAME)
      .createSignedUrls(paths, 60 * 60);
    return signedUrls;
  }
}
