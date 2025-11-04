import {
  ChevronLeft,
  ChevronRight,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useKeyDown } from "../hooks/useKeyDown";
import { clsx } from "../utils/clsx";
import type { ImageItem } from "../api/images";
import { getOriginalSignedUrl } from "../api/images";

export function Lightbox({
  items,
  index,
  onClose,
  onNavigate,
}: {
  items: ImageItem[];
  index: number;
  onClose: () => void;
  onNavigate: (next: number) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const item = items[index];
  item.path = item.path.split("/").pop() || item.path;
  const canPrev = index > 0;
  const canNext = index < items.length - 1;

  // displayUrl starts as preview (fast), then we upgrade to original
  const previewUrl = item.signedUrl;
  const [displayUrl, setDisplayUrl] = useState(previewUrl);
  const [loadingOriginal, setLoadingOriginal] = useState(false);

  // load original each time the index changes
  useEffect(() => {
    let aborted = false;
    setZoom(1);
    setDisplayUrl(previewUrl);
    setLoadingOriginal(true);

    (async () => {
      try {
        const originalUrl = await getOriginalSignedUrl(item.path);
        if (aborted) return;

        await new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () =>
            reject(new Error("Failed to load original image"));
          img.src = originalUrl;
        });

        if (!aborted) setDisplayUrl(originalUrl);
      } catch {
        // keep preview on failure
      } finally {
        if (!aborted) setLoadingOriginal(false);
      }
    })();

    return () => {
      aborted = true;
    };
  }, [index, item.path, previewUrl]);

  useKeyDown((e) => {
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowLeft" && canPrev) onNavigate(index - 1);
    if (e.key === "ArrowRight" && canNext) onNavigate(index + 1);
    if (e.key === "+" || e.key === "=")
      setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)));
    if (e.key === "-" || e.key === "_")
      setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)));
  });

  const title = useMemo(() => item.path, [item.path]);

  const onDownload = () => {
    getOriginalSignedUrl(item.path).then((url) => {
      const a = document.createElement("a");
      a.href = url;
      a.download = title;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/90 text-white">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 z-20 rounded-full bg-neutral-900/80 border border-white/15 shadow-lg backdrop-blur-md hover:bg-neutral-900/90 focus:outline-none focus:ring-2 focus:ring-white/40"
        aria-label="Zamknij"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Title chip */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 text-sm px-3 py-1 rounded-full bg-neutral-900/80 border border-white/15 shadow-md backdrop-blur-md">
        {title}
      </div>

      {/* Image area */}
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <img
          src={displayUrl}
          alt={title}
          className={clsx(
            "max-h-full max-w-full rounded-xl select-none",
            zoom > 1 ? "cursor-grab active:cursor-grabbing" : "",
          )}
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "center center",
          }}
          draggable={false}
          onDoubleClick={() => setZoom((z) => (z === 1 ? 2 : 1))}
        />

        {/* Bottom scrim to improve contrast on bright images */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-black/70 to-transparent" />

        {loadingOriginal && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 text-xs bg-neutral-900/80 border border-white/15 shadow px-2 py-1 rounded-full backdrop-blur-md">
            Ładowanie oryginału…
          </div>
        )}
      </div>

      {/* Controls toolbar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-neutral-900/80 text-white backdrop-blur-md rounded-full px-2 py-1 text-xs border border-white/15 shadow-lg">
        <button
          disabled={!canPrev}
          onClick={() => canPrev && onNavigate(index - 1)}
          className="p-2 rounded-full hover:bg-white/10 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-white/40"
          title="Poprzednie"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="px-2">
          {index + 1} / {items.length}
        </div>

        <button
          disabled={!canNext}
          onClick={() => canNext && onNavigate(index + 1)}
          className="p-2 rounded-full hover:bg-white/10 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-white/40"
          title="Następne"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <div className="mx-2 h-5 w-px bg-white/20" />

        <button
          onClick={() => setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)))}
          className="p-2 rounded-full hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
          title="Pomniejsz"
        >
          <ZoomOut className="h-5 w-5" />
        </button>
        <button
          onClick={() => setZoom(1)}
          className="p-2 rounded-full hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
          title="Dopasuj"
        >
          <Maximize2 className="h-5 w-5" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))}
          className="p-2 rounded-full hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
          title="Powiększ"
        >
          <ZoomIn className="h-5 w-5" />
        </button>

        <div className="mx-2 h-5 w-px bg-white/20" />

        <button
          onClick={onDownload}
          className="p-2 rounded-full hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
          title="Pobierz oryginał"
        >
          <Download className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
