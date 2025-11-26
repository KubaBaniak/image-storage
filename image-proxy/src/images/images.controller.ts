import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
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
  @Patch(':id/embed')
  addImageEmbeddings(@Param('id') id: string) {
    return this.imagesService.setEmbeddings(id);
  }

  @Get('preview')
  getPreviewUrls(@Query() query: GetPreviewUrlsDto) {
    return this.imagesService.getPreviewUrls(query);
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
