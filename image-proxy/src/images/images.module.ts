import { Module } from '@nestjs/common';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { ImagesController } from './images.controller';
import { ImagesService } from './images.service';
import { HttpModule } from '@nestjs/axios';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [SupabaseModule, QueueModule, HttpModule],
  controllers: [ImagesController],
  providers: [ImagesService],
})
export class ImagesModule {}
