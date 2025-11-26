import { Module } from '@nestjs/common';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { ImagesController } from './images.controller';
import { ImagesService } from './images.service';
import { HttpModule } from '@nestjs/axios';
import { QueueModule } from '../queue/queue.module';
import { QdrantClient } from '@qdrant/js-client-rest';
import { MlModule } from '../ml/ml.module';

@Module({
  imports: [SupabaseModule, QueueModule, HttpModule, MlModule],
  controllers: [ImagesController],
  providers: [
    ImagesService,
    {
      provide: 'QdrantClient',
      useFactory: () => {
        return new QdrantClient({ url: 'http://localhost:6333' });
      },
    },
  ],
})
export class ImagesModule {}
