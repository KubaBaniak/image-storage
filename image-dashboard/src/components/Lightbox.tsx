import {
  ChevronLeft,
  ChevronRight,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useKeyDown } from "../hooks/useKeyDown";
import { clsx } from "../utils/clsx";
import type { ImageItem } from "../api/images";

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
  const canPrev = index > 0;
  const canNext = index < items.length - 1;

  useKeyDown((e) => {
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowLeft" && canPrev) onNavigate(index - 1);
    if (e.key === "ArrowRight" && canNext) onNavigate(index + 1);
  });

  useEffect(() => setZoom(1), [index]);

  return (
    <div className="fixed inset-0 z-40 bg-black/90 text-white flex items-center justify-center p-6">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10"
      >
        <X />
      </button>
      <img
        src={item.signedUrl}
        alt={item.title || item.path}
        className={clsx(
          "max-h-full max-w-full rounded-xl select-none",
          zoom > 1 && "cursor-grab",
        )}
        style={{ transform: `scale(${zoom})` }}
      />
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 bg-white/10 rounded-full px-2 py-1 text-xs">
        <button
          disabled={!canPrev}
          onClick={() => canPrev && onNavigate(index - 1)}
        >
          <ChevronLeft />
        </button>
        <span>
          {index + 1} / {items.length}
        </span>
        <button
          disabled={!canNext}
          onClick={() => canNext && onNavigate(index + 1)}
        >
          <ChevronRight />
        </button>
        <button onClick={() => setZoom((z) => Math.max(1, z - 0.25))}>
          <ZoomOut />
        </button>
        <button onClick={() => setZoom(1)}>
          <Maximize2 />
        </button>
        <button onClick={() => setZoom((z) => Math.min(3, z + 0.25))}>
          <ZoomIn />
        </button>
      </div>
    </div>
  );
}
