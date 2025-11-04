export type ImageItem = {
  id: string;
  path: string;
  signedUrl: string | null;
  error: string | null;
  createdAt?: string;
};

export type BackendItem = {
  id: string;
  createdAt: string | null;
  previewPath: string;
  signedUrl: string | null;
  signError: { message?: string } | string | null;
};

export type FetchResponse = {
  items: ImageItem[];
  nextCursor: string | null;
};
