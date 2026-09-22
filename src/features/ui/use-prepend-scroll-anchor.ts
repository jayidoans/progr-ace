"use client";

import { useLayoutEffect, useRef } from "react";

type ScrollAnchor = { top: number; targetId: string };

export function usePrependScrollAnchor(dependency: unknown) {
  const pendingScrollAnchor = useRef<ScrollAnchor | null>(null);

  useLayoutEffect(() => {
    const pending = pendingScrollAnchor.current;
    if (!pending) return;

    const element = document.getElementById(pending.targetId);
    if (element) window.scrollBy({ top: element.getBoundingClientRect().top - pending.top });
    pendingScrollAnchor.current = null;
  }, [dependency]);

  return (targetId: string) => {
    const element = document.getElementById(targetId);
    if (element) {
      pendingScrollAnchor.current = { targetId, top: element.getBoundingClientRect().top };
    }
  };
}
