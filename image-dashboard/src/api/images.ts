export type ImageItem = {
  path: string;
  signedUrl: string;
  thumbUrl?: string;
  title?: string;
  tags?: string[];
};

export type FetchResponse = {
  items: ImageItem[];
  nextCursor?: string | null;
};

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
  for (const [k, v] of Object.entries(params))
    if (v !== undefined && v !== null && String(v).length > 0)
      usp.set(k, String(v));
  const qs = usp.toString();
  return qs ? `${base}/api/images?${qs}` : `${base}/api/images`;
}

export async function fetchImages({
  q = "",
  cursor,
  limit = 30,
}: {
  q?: string;
  cursor?: string | null;
  limit?: number;
}): Promise<FetchResponse> {
  const url = buildImagesUrl({ q, cursor: cursor ?? undefined, limit });

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
  const data = (await res.json()) as FetchResponse;
  console.log(data);
  const items = (data.items || []).map((it) => ({
    ...it,
    path: it.path,
    thumbUrl: it.thumbUrl || it.signedUrl,
  }));
  return { items, nextCursor: data.nextCursor ?? null };
}
