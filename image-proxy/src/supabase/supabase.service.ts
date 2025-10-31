import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from 'src/schema';

@Injectable()
export class SupabaseService {
  private readonly client: SupabaseClient<Database>;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseServiceRoleKey = this.configService.get<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );

    if (supabaseUrl === undefined || supabaseServiceRoleKey === undefined) {
      console.error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set');
      throw new InternalServerErrorException(
        'Error while initializing Supabase client',
      );
    }

    const client = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    this.client = client;
  }

  getClient(): SupabaseClient<Database> {
    return this.client;
  }
}
