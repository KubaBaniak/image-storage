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
        update: jest.fn().mockImplementation(() => ({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error,
          }),
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error,
            }),
          }),
        })),
        eq: jest.fn().mockResolvedValue({
          data: null,
          error,
        }),
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error,
          }),
        }),
        single: jest.fn().mockResolvedValue({
          data: null,
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
