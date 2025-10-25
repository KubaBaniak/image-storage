import { Controller, Get } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';

@Controller('images')
export class ImagesController {
  constructor(private readonly supabaseService: SupabaseService) {}
  @Get('HealthCheck')
  async checkHealth() {
    const client = this.supabaseService.getClient();
    return client.storage.listBuckets();
  }
}
