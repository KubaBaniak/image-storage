import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ImagesModule } from './images/images.module';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from './supabase/supabase.module';
import { QueueModule } from './queue/queue.module';

@Module({
  imports: [
    ImagesModule,
    ConfigModule.forRoot({ isGlobal: true }),
    SupabaseModule,
    QueueModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
