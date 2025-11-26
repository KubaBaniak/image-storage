import { Module } from '@nestjs/common';
import { InferenceClient } from '@huggingface/inference';
import { EmbeddingService } from './embedding.service';

@Module({
  providers: [
    EmbeddingService,
    {
      provide: 'HFClient',
      useFactory: () => {
        const HF_TOKEN = process.env.HF_TOKEN;
        if (!HF_TOKEN) {
          throw new Error('HF_TOKEN is not set');
        }

        return new InferenceClient(HF_TOKEN);
      },
    },
  ],
  exports: [EmbeddingService],
})
export class MlModule {}
