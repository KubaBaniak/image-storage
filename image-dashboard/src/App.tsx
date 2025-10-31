import { useState, useMemo, useEffect } from "react";
import { fetchImages, type ImageItem } from "./api/images";
import { Header } from "./components/Header";
import { SearchBar } from "./components/SearchBar";
import { GridSkeleton } from "./components/GridSkeleton";
import { ImageGrid } from "./components/ImageGrid";
import { Lightbox } from "./components/Lightbox";
import { LoadMoreSentinel } from "./components/LoadMoreSentinel";
import { useDebounced } from "./hooks/useDebounced";

export default function App() {
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query, 350);

  const [items, setItems] = useState<ImageItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const total = useMemo(
    () => (initialized ? items.length : null),
    [initialized, items],
  );

  const runFetch = async (mode: "reset" | "more") => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetchImages({
        q: debounced,
        cursor: mode === "more" ? cursor : null,
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
  }, [debounced]);

  const canLoadMore = !!cursor;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <Header total={total} />
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
          {canLoadMore && (
            <div className="mx-auto max-w-7xl px-4 pb-12">
              <LoadMoreSentinel onVisible={() => runFetch("more")} />
            </div>
          )}
        </>
      )}

      {lightboxIndex !== null && (
        <Lightbox
          items={items}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={(n) =>
            setLightboxIndex(Math.max(0, Math.min(items.length - 1, n)))
          }
        />
      )}
    </div>
  );
}
