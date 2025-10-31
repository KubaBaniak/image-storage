import { Search, X } from "lucide-react";

export function SearchBar({
  value,
  onChange,
  onReset,
}: {
  value: string;
  onChange: (v: string) => void;
  onReset: () => void;
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-4">
      <div className="relative">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Szukaj po nazwie, tagach…"
          className="w-full rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70 backdrop-blur px-10 py-3 text-sm outline-none focus:ring-2 ring-indigo-500/40"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
        {value && (
          <button
            onClick={onReset}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
