import { Module } from '@nestjs/common';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { ImagesController } from './images.controller';
import { ImagesService } from './images.service';

@Module({
  imports: [SupabaseModule],
  controllers: [ImagesController],
  providers: [ImagesService],
})
export class ImagesModule {}
