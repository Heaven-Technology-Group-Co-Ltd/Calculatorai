"use client";

import { useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";

/**
 * Tracks page views by sending a POST to /api/page-views on mount and
 * when the pathname changes. Debounced to avoid duplicate sends.
 */
export function usePageView(path?: string) {
  const { data: session } = useSession();
  const lastPathRef = useRef<string | null>(null);

  const track = useCallback(
    (currentPath: string) => {
      // Skip duplicate tracks for the same path
      if (lastPathRef.current === currentPath) return;
      lastPathRef.current = currentPath;

      // Use sendBeacon for reliability during page unload, fallback to fetch
      const payload = JSON.stringify({
        path: currentPath,
        sessionId: (session as unknown as { accessToken?: string })?.accessToken || null,
      });
      const blob = new Blob([payload], { type: "application/json" });

      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/page-views", blob);
      } else {
        fetch("/api/page-views", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {
          // Silently fail — analytics should never break the app
        });
      }
    },
    [session]
  );

  useEffect(() => {
    const currentPath = path || window.location.pathname;
    track(currentPath);
  }, [path, track]);
}
