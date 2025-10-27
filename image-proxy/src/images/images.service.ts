import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  OnModuleInit,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreatePresignedUploadRequestDto } from './dto/createPresignedUploadRequest.dto';
import { v4 as uuidv4 } from 'uuid';

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

  private isValidFile(metadata: CreatePresignedUploadRequestDto) {
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
      throw new BadRequestException('Unsupported mime type');
    }

    const filePath = `${imageId}.${ext}`;
    const imageRecord = {
      id: imageId,
      storage_path: filePath,
      expected_mime_type: metadata.mimeType,
      expected_size_bytes: metadata.sizeBytes,
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
}
