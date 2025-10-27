import { Body, Controller, Post } from '@nestjs/common';
import { ImagesService } from './images.service';
import { CreatePresignedUploadRequestDto } from './dto/createPresignedUploadRequest.dto';

@Controller('images')
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  @Post('presign')
  presignImageUpload(
    @Body() presignRequestData: CreatePresignedUploadRequestDto,
  ) {
    return this.imagesService.generatePresignedUrl(presignRequestData);
  }
}
