import { Transform } from 'class-transformer';
import {
  IsBase64,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class GetPreviewUrlsDto {
  @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 25;

  @IsBase64()
  @IsOptional()
  after?: string;

  @IsOptional()
  @IsString()
  q?: string;
}
