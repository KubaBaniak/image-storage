export function GridSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {Array.from({ length: 15 }).map((_, i) => (
        <div
          key={i}
          className="aspect-4/3 rounded-xl bg-neutral-200/60 dark:bg-neutral-800 animate-pulse"
        />
      ))}
    </div>
  );
}
