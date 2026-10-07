"use client";

import { useSyncExternalStore } from "react";

/** Retorna se a media query casa. No servidor assume `false` (layout mobile-first). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notificar) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", notificar);
      return () => mql.removeEventListener("change", notificar);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
