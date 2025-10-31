import { useEffect, useRef } from "react";

export function LoadMoreSentinel({ onVisible }: { onVisible: () => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => e.isIntersecting && onVisible());
    });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [onVisible]);
  return <div ref={ref} className="h-10" />;
}
