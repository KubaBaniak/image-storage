import { useEffect } from "react";

export function useKeyDown(handler: (e: KeyboardEvent) => void) {
  useEffect(() => {
    const on = (e: KeyboardEvent) => handler(e);
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [handler]);
}
