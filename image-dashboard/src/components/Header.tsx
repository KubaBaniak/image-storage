import { Upload } from "lucide-react";

export function Header({
  total,
  onOpenUpload,
}: {
  total: number | null;
  onOpenUpload: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 backdrop-blur bg-white/70 dark:bg-neutral-900/60 border-b border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-linear-to-br from-indigo-500 to-fuchsia-500" />
          <div>
            <h1 className="text-lg font-semibold leading-tight">
              Image Library
            </h1>
            <p className="text-xs text-neutral-500">
              Wyszukuj, przeglądaj, powiększaj
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenUpload}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 dark:border-neutral-800 px-3 py-2 text-sm hover:bg-neutral-100/60 dark:hover:bg-neutral-800/50"
          >
            <Upload className="h-4 w-4" /> Prześlij
          </button>
          <div className="text-xs text-neutral-500 hidden sm:block">
            {total !== null ? `${total} zdjęć` : ""}
          </div>
        </div>
      </div>
    </header>
  );
}
