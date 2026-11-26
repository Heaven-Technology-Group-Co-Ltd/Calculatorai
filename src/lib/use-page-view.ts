"use client";

import { useEffect, useRef, useCallback } from "react";


/**
 * Tracks page views by sending a POST to /api/page-views on mount and
 * when the pathname changes. Debounced to avoid duplicate sends.
 */
export function usePageView(path?: string) {
  const sessionIdRef = useRef<string | null>(null);
  const lastPathRef = useRef<string | null>(null);

  const track = useCallback(
    (currentPath: string) => {
      // Skip duplicate tracks for the same path
      if (lastPathRef.current === currentPath) return;
      lastPathRef.current = currentPath;

      // Use sendBeacon for reliability during page unload, fallback to fetch
      if (!sessionIdRef.current) {
        try {
          sessionIdRef.current = sessionStorage.getItem("analytics-session-id");
          if (!sessionIdRef.current && typeof globalThis.crypto?.randomUUID === "function") {
            sessionIdRef.current = globalThis.crypto.randomUUID();
            sessionStorage.setItem("analytics-session-id", sessionIdRef.current);
          }
        } catch (error) {
          console.warn("[PageViews] Session storage unavailable", error);
        }
      }
      const payload = JSON.stringify({
        path: currentPath,
        sessionId: sessionIdRef.current,
        referrer: document.referrer || undefined,
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
    []
  );

  useEffect(() => {
    const currentPath = path || window.location.pathname;
    track(currentPath);
  }, [path, track]);
}
