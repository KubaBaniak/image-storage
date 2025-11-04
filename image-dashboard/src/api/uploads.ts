export type PresignResponse = {
  imageId: string;
  originalUrl: string;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL as string | undefined;

function buildUrl(path: string) {
  const base = API_BASE ? API_BASE.replace(/\/+$/, "") : "";
  console.log(base);
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}

export async function requestPresignedUpload(meta: {
  mimeType: string;
  sizeBytes: number;
}): Promise<PresignResponse> {
  const res = await fetch(buildUrl("/api/images/presign"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(meta),
  });
  console.log(res);
  if (!res.ok) throw new Error(`Presign failed: ${res.status}`);
  return (await res.json()) as PresignResponse;
}

export async function requestImageVerification(imageId: string) {
  const res = await fetch(buildUrl("/api/images/verify"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageId }),
  });
  if (!res.ok) throw new Error(`Verification failed: ${res.status}`);
  return (await res.json()) as PresignResponse;
}

export function uploadViaXhr(
  file: File,
  uploadUrl: string,
  onProgress?: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("PUT", uploadUrl, true);
    xhr.setRequestHeader(
      "Content-Type",
      file.type || "application/octet-stream",
    );

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        const pct = Math.round((e.loaded / e.total) * 100);
        onProgress(pct);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(file);
  });
}
