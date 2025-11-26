import { InferenceClient, InferenceProvider } from '@huggingface/inference';
import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

@Injectable()
export class EmbeddingService {
  constructor(@Inject('HFClient') private readonly client: InferenceClient) {}

  private model = 'sentence-transformers/all-MiniLM-L6-v2';
  private provider: InferenceProvider = 'hf-inference';

  async embedCaption(caption: string): Promise<number[]> {
    try {
      const result = await this.client.featureExtraction({
        model: this.model,
        inputs: caption,
        provider: this.provider,
      });

      const embedding = Array.isArray(result[0])
        ? (result[0] as number[])
        : (result as number[]);

      return embedding;
    } catch {
      throw new InternalServerErrorException(
        'Failed during creation of embeddings',
      );
    }
  }
}
