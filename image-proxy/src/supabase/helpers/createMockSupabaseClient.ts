export default function createSupabaseServiceMock({
  file_size_limit,
  allowed_mime_types,
  error = null,
}: {
  file_size_limit: number;
  allowed_mime_types: string[];
  error?: unknown;
}) {
  return {
    getClient: jest.fn().mockReturnValue({
      storage: {
        getBucket: jest.fn().mockResolvedValue({
          data: error
            ? null
            : {
                file_size_limit,
                allowed_mime_types,
              },
          error,
        }),
        from: jest.fn().mockReturnValue({
          createSignedUploadUrl: jest.fn().mockResolvedValue({
            data: { signedUrl: 'http://example.com/upload-url' },
            error,
          }),
        }),
      },
      from: jest.fn().mockReturnValue({
        insert: jest.fn().mockResolvedValue({
          error,
        }),
        update: jest.fn().mockResolvedValue({
          error,
        }),
        eq: jest.fn().mockResolvedValue({
          error,
        }),
        select: jest.fn().mockResolvedValue({
          error,
        }),
        single: jest.fn().mockResolvedValue({
          error,
        }),
        createSignedUrl: jest.fn().mockResolvedValue({
          data: { signedUrl: 'http://example.com/signed-url' },
          error,
        }),
      }),
    }),
  };
}
