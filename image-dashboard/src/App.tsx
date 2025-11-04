import { useEffect, useMemo, useState } from "react";
import { fetchImages } from "./api/images";
import { Header } from "./components/Header";
import { SearchBar } from "./components/SearchBar";
import { GridSkeleton } from "./components/GridSkeleton";
import { ImageGrid } from "./components/ImageGrid";
import { Lightbox } from "./components/Lightbox";
import { LoadMoreSentinel } from "./components/LoadMoreSentinel";
import { UploadModal } from "./components/UploadModal";
import { useDebounced } from "./hooks/useDebounced";
import { Loader2 } from "lucide-react";
import type { ImageItem } from "./api/types";

export default function App() {
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query, 350);

  const [items, setItems] = useState<ImageItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const total = useMemo(
    () => (initialized ? items.length : null),
    [initialized, items.length],
  );

  const runFetch = async (mode: "reset" | "more") => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetchImages({
        q: debounced,
        after: mode === "more" ? cursor : null,
      });
      setItems((prev) =>
        mode === "reset" ? res.items : [...prev, ...res.items],
      );
      setCursor(res.nextCursor ?? null);
      setInitialized(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runFetch("reset");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const canLoadMore = !!cursor;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <Header total={total} onOpenUpload={() => setUploadOpen(true)} />

      <SearchBar
        value={query}
        onChange={setQuery}
        onReset={() => setQuery("")}
      />

      {!initialized && <GridSkeleton />}

      {initialized && (
        <>
          {items.length === 0 ? (
            <div className="mx-auto max-w-7xl px-4 py-16 text-center text-neutral-500">
              Brak wyników dla{" "}
              <span className="font-medium">„{debounced}”</span>
            </div>
          ) : (
            <ImageGrid items={items} onOpen={(i) => setLightboxIndex(i)} />
          )}

          <div className="mx-auto max-w-7xl px-4 pb-12">
            {canLoadMore ? (
              <>
                <button
                  onClick={() => runFetch("more")}
                  disabled={loading}
                  className="mx-auto block rounded-xl border border-neutral-200 dark:border-neutral-800 px-4 py-2 text-sm hover:bg-neutral-100/60 dark:hover:bg-neutral-800/50 disabled:opacity-50"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Wczytywanie…
                    </span>
                  ) : (
                    "Wczytaj więcej"
                  )}
                </button>
                <LoadMoreSentinel onVisible={() => runFetch("more")} />
              </>
            ) : (
              initialized &&
              items.length > 0 && (
                <div className="text-center text-xs text-neutral-500">
                  To już wszystkie wyniki
                </div>
              )
            )}
          </div>
        </>
      )}

      {lightboxIndex !== null && (
        <Lightbox
          items={items}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={(next) =>
            setLightboxIndex(Math.max(0, Math.min(items.length - 1, next)))
          }
        />
      )}

      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSuccess={() => runFetch("reset")}
      />
    </div>
  );
}
