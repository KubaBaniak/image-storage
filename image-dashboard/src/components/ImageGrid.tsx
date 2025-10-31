import type { ImageItem } from "../api/images";

export function ImageGrid({
  items,
  onOpen,
}: {
  items: ImageItem[];
  onOpen: (index: number) => void;
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {items.map((img, i) => (
          <button
            key={img.path}
            onClick={() => onOpen(i)}
            className="group relative overflow-hidden rounded-xl border border-neutral-200/60 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900"
            title={img.title || img.path}
          >
            <img
              src={img.thumbUrl || img.signedUrl}
              alt={img.title || img.signedUrl}
              loading="lazy"
              className="aspect-4/3 w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
            <div className="absolute inset-x-0 bottom-0 p-2 bg-linear-to-t from-black/50 to-transparent text-white text-xs flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="truncate">{img.path || "Bez tytułu"}</span>
              {img.tags && (
                <span className="ml-auto inline-flex gap-1">
                  {img.tags.slice(0, 2).map((t) => (
                    <span
                      key={t}
                      className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]"
                    >
                      {t}
                    </span>
                  ))}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
