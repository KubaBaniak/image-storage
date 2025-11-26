import type { BackendItem, FetchResponse, ImageItem } from "./types";

function resolveApiBase(envValue?: unknown): string {
  const env = typeof envValue === "string" ? envValue : undefined;
  return env ?? "";
}

export const API_BASE: string = (() => {
  let viteEnv: unknown = undefined;
  try {
    viteEnv = import.meta.env.VITE_API_BASE_URL;
  } catch {
    viteEnv = undefined;
  }
  return resolveApiBase(viteEnv);
})();

export function buildImagesUrl(
  params: Record<string, string | number | null | undefined>,
): string {
  const base = API_BASE ? API_BASE.replace(/\/+$/, "") : "";
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && String(v).length > 0)
      usp.set(k, String(v));
  }
  const qs = usp.toString();
  return qs ? `${base}/api/images/preview?${qs}` : `${base}/api/images/preview`;
}

export async function fetchImages({
  q = "",
  after,
  limit = 30,
}: {
  q?: string;
  after?: string | null;
  limit?: number;
}): Promise<FetchResponse> {
  const url = buildImagesUrl({ q, after: after ?? undefined, limit });

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);

  const payload = (await res.json()) as {
    items: BackendItem[];
    nextCursor?: string | null;
  };

  const items: ImageItem[] = (payload.items ?? []).map((it) => ({
    id: it.id,
    path: it.previewPath,
    signedUrl: it.signedUrl ?? null,
    error:
      typeof it.signError === "string"
        ? it.signError
        : (it.signError?.message ?? null),
    createdAt: it.createdAt ?? undefined,
  }));

  return { items, nextCursor: payload.nextCursor ?? null };
}

export async function getOriginalSignedUrl(
  originalImageFilename: string,
): Promise<string> {
  const base = API_BASE ? API_BASE.replace(/\/+$/, "") : "";
  const url = `${base}/api/images/original?filename=${encodeURIComponent(originalImageFilename)}`;

  const res = await fetch(url);
  if (!res.ok)
    throw new Error(`Failed to get original signed URL: ${res.status}`);
  const data = (await res.json()) as { signedUrl: string };
  if (!data?.signedUrl) throw new Error("Missing signedUrl in response");
  return data.signedUrl;
}
