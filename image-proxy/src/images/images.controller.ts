import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { CreatePresignedUploadRequestDto } from './dto/createPresignedUploadRequest.dto';
import { ImagesService } from './images.service';

@Controller('images')
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  @Post('presign')
  presignImageUpload(
    @Body() presignRequestData: CreatePresignedUploadRequestDto,
  ) {
    return this.imagesService.generatePresignedUrl(presignRequestData);
  }

  @HttpCode(200)
  @Post('verify')
  verifyImage(@Body('imageId') imageId: string) {
    return this.imagesService.validateUploadFile(imageId);
  }

  @Get()
  getImages() {
    return this.imagesService.getImages();
  }
}
