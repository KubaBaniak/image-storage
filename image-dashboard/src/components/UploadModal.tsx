import { useEffect, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import {
  requestImageVerification,
  requestPresignedUpload,
  uploadViaXhr,
} from "../api/uploads";

export function UploadModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setPreviewUrl(null);
      setError(null);
      setProgress(0);
      setBusy(false);
    }
  }, [open]);

  const onPick = (f: File) => {
    if (!f.type.startsWith("image/")) {
      setError("Wybierz plik graficzny.");
      return;
    }
    if (f.size > 25 * 1024 * 1024) {
      setError("Maksymalny rozmiar to 25 MB.");
      return;
    }
    setError(null);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onPick(f);
  };

  const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) onPick(f);
  };

  const onUpload = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    setProgress(0);
    try {
      const meta = {
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      };
      const { imageId, originalUrl } = await requestPresignedUpload(meta);
      await uploadViaXhr(file, originalUrl, (pct) => setProgress(pct));
      await requestImageVerification(imageId);
      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e?.message || "Upload nie powiódł się");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="font-semibold">Prześlij obraz</div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            className="rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 p-6 text-sm text-neutral-500 flex flex-col items-center justify-center gap-3"
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="preview"
                className="max-h-48 rounded-lg"
              />
            ) : (
              <>
                <Upload className="h-8 w-8" />
                <div>
                  <span className="font-medium">Przeciągnij i upuść</span> lub
                  wybierz plik
                </div>
              </>
            )}
            <input
              id="file-input"
              type="file"
              accept="image/*"
              onChange={onInputChange}
              className="hidden"
            />
            <label
              htmlFor="file-input"
              className="mt-2 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
            >
              Wybierz plik
            </label>
            {file && (
              <div className="text-xs text-neutral-500">
                {file.name} • {(file.size / 1024 / 1024).toFixed(2)} MB
              </div>
            )}
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          {busy && (
            <div className="w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-2 overflow-hidden">
              <div
                className="h-2 bg-indigo-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-xl px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            Anuluj
          </button>
          <button
            onClick={onUpload}
            disabled={!file || busy}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 text-sm disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}{" "}
            Wyślij
          </button>
        </div>
      </div>
    </div>
  );
}
