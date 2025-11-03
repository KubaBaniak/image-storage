import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: (cfg: ConfigService) => ({
        connection: {
          host: cfg.get<string>('REDIS_HOST', '127.0.0.1'),
          port: Number(cfg.get<string>('RESIS_PORT', '6379')),
          password: cfg.get<string>('REDIS_PASSWORD') || '',
        },
        prefix: 'imgsvc',
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({ name: 'image-tagging' }),
  ],
  providers: [],
  exports: [BullModule],
})
export class QueueModule {}
