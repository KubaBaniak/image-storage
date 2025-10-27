import { IsIn, IsInt, IsString, Max } from 'class-validator';

export class CreatePresignedUploadRequestDto {
  @IsString()
  @IsIn(['image/png', 'image/jpeg', 'image/webp'], {
    message: 'mimeType must be one of: image/png, image/jpeg, image/webp',
  })
  mimeType: string;

  @IsInt()
  @Max(10485760)
  sizeBytes: number;
}
