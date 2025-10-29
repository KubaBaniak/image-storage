import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TestingModule, Test } from '@nestjs/testing';
import createSupabaseServiceMock from '../supabase/helpers/createMockSupabaseClient';
import { SupabaseService } from '../supabase/supabase.service';
import { ImagesService } from './images.service';

describe('ImagesService', () => {
  let imagesService: ImagesService;

  beforeEach(async () => {
    const supabaseMock = createSupabaseServiceMock({
      file_size_limit: 5 * 1024 * 1024,
      allowed_mime_types: ['image/png', 'image/jpeg', 'image/webp'],
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImagesService,
        {
          provide: SupabaseService,
          useValue: supabaseMock,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    imagesService = module.get<ImagesService>(ImagesService);

    await imagesService.onModuleInit();
  });

  it('should be defined', () => {
    expect(imagesService).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should throw InternalServerErrorException if Supabase returns error', async () => {
      const errorSupabaseMock = createSupabaseServiceMock({
        file_size_limit: 0,
        allowed_mime_types: [],
        error: new Error('something went wrong'),
      });

      const moduleWithError: TestingModule = await Test.createTestingModule({
        providers: [
          ImagesService,
          {
            provide: SupabaseService,
            useValue: errorSupabaseMock,
          },
          {
            provide: ConfigService,
            useValue: { get: jest.fn() },
          },
        ],
      }).compile();

      const failingService = moduleWithError.get<ImagesService>(ImagesService);

      await expect(failingService.onModuleInit()).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
    });
  });

  describe('isValidFile', () => {
    it('should correctly validate file', () => {
      const metadata = {
        mimeType: 'image/png',
        sizeBytes: 5 * 1024 * 1024,
      };

      const result = imagesService.isValidFile(metadata);

      expect(result).toBe(true);
    });

    it('should return false for files exceeding max size', () => {
      const metadata = {
        mimeType: 'image/png',
        sizeBytes: 999999999999,
      };

      const result = imagesService.isValidFile(metadata);

      expect(result).toBe(false);
    });

    it('should return false for files with unacceptable MIME types', () => {
      const metadata = {
        mimeType: 'application/x-msdownload',
        sizeBytes: 1024,
      };

      const result = imagesService.isValidFile(metadata);

      expect(result).toBe(false);
    });
  });

  describe('generatePresignedUrl', () => {
    it('should generate generatePresignedUrl', async () => {
      const metadata = {
        mimeType: 'image/png',
        sizeBytes: 5 * 1024 * 1024,
      };

      const result = await imagesService.generatePresignedUrl(metadata);

      expect(result).toHaveProperty('signedUrl');
      expect(result.signedUrl).toBeDefined();
      expect(typeof result.signedUrl).toBe('string');
    });
  });
});
