import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CreatePresignedUploadRequestDto } from './dto/createPresignedUploadRequest.dto';
import { ImagesService } from './images.service';
import { GetPreviewUrlsDto } from './dto/getPreviewUrls.dto';

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

  @HttpCode(201)
  @Post(':id/embed')
  addImageEmbeddings(@Param('id') id: string) {
    return this.imagesService.setEmbeddings(id);
  }

  @Get('preview')
  async getPreviewUrls(@Query() query: GetPreviewUrlsDto) {
    const test = await this.imagesService.getPreviewUrls(query);
    return test;
  }

  @Get('original')
  getOriginalImageUrl(@Query('filename') filename: string) {
    return this.imagesService.getOriginalImageUrl(filename);
  }

  @Delete('')
  deleteImage(@Body('imageId') imageId: string) {
    return this.imagesService.deleteImage(imageId);
  }
}
