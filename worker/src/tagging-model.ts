import { pipeline } from "@huggingface/transformers";
import "dotenv/config";

export interface TaggingModel {
  inferTagsFromImage(imageUrl: string): Promise<string | null>;
}

export class ImageToTextModel implements TaggingModel {
  private model: string = "Xenova/vit-gpt2-image-captioning";

  async inferTagsFromImage(imageUrl: string): Promise<string | null> {
    const pipe = await pipeline("image-to-text", this.model, { dtype: "fp32" });
    const output = (await pipe(imageUrl)) as { generated_text: string }[];
    return output?.[0]?.generated_text || null;
  }
}
