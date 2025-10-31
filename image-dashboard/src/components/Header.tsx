export function Header({ total }: { total: number | null }) {
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
        <div className="text-xs text-neutral-500">
          {total !== null ? `${total} zdjęć` : ""}
        </div>
      </div>
    </header>
  );
}
