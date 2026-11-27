"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { apiGet, apiPost, apiDelete } from "@/lib/api-client";
import { decodeHistoryExpression } from "@/lib/history-payload";

// ── Types ────────────────────────────────────────────────────────────────────

export interface HistoryItem {
  id: string;
  calcId: string;
  calcTitle: string;
  inputs: Record<string, string>;
  result: string;
  unit: string;
  ts: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = "math_calc_history_v3";
export const MAX_HISTORY = 100;
const DEBOUNCE_MS = 500;

function loadFromSessionStorage(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveToSessionStorage(items: HistoryItem[]): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_HISTORY)));
  } catch {
    /* quota exceeded — silently drop */
  }
}

function mapApiRow(row: Record<string, unknown>): HistoryItem {
  const decoded = decodeHistoryExpression(row.expression);
  return {
    id: String(row.id),
    calcId: decoded?.calcId ?? "",
    calcTitle: decoded?.calcTitle ?? String(row.expression ?? ""),
    inputs: decoded?.inputs ?? {},
    result: String(row.result ?? ""),
    unit: decoded?.unit ?? "",
    ts: new Date(String(row.timestamp)).getTime(),
  };
}

/** Extract user id from the next-auth session (NextAuth v4 JWT callback adds it) */
function getUserId(
  session: { user?: Record<string, unknown> | null } | null
): string | undefined {
  return session?.user?.id as string | undefined;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Central history hook — dual mode:
 *   Authenticated users: API-backed (Supabase calculation_history table)
 *   Anonymous users:     sessionStorage fallback
 */
let fallbackIdCounter = 0;

function createOptimisticId(): string {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === "function") return cryptoApi.randomUUID();
  if (typeof cryptoApi?.getRandomValues === "function") {
    return Array.from(cryptoApi.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  fallbackIdCounter += 1;
  return `${Date.now().toString(36)}-${fallbackIdCounter.toString(36)}`;
}

export function useHistory() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  const userId = getUserId(session);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Hydrate on mount / auth change ────────────────────────────────────────
  useEffect(() => {
    if (status === "loading") return;

    if (status === "authenticated" && userId) {
      apiGet<Record<string, unknown>[]>("/api/history")
        .then((rows) => {
          if (Array.isArray(rows)) setHistory(rows.map(mapApiRow));
        })
        .catch(() => {
          /* silent — show empty */
        })
        .finally(() => setHydrated(true));
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing session hydrate, refactor out of scope
      setHistory(loadFromSessionStorage());
      setHydrated(true);
    }
  }, [status, userId]);

  // ── Debounced sessionStorage write (anonymous fallback) ─────────────────
  useEffect(() => {
    if (!hydrated || status === "authenticated") return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveToSessionStorage(history);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [history, hydrated, status]);

  // ── Flush pending write when tab closes (debounce would drop it) ─────────
  useEffect(() => {
    if (!hydrated || status === "authenticated") return;

    const flush = () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      saveToSessionStorage(history);
    };
    const onHidden = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onHidden);
    };
  }, [history, hydrated, status]);

  // ── addToHistory ──────────────────────────────────────────────────────────
  const addToHistory = useCallback(
    (item: Omit<HistoryItem, "id" | "ts">) => {
      const optimisticId = createOptimisticId();
      const newItem: HistoryItem = {
        ...item,
        id: optimisticId,
        ts: Date.now(),
      };

      // Optimistic local update
      setHistory((prev) => [newItem, ...prev].slice(0, MAX_HISTORY));

      // Persist to server if authenticated
      if (status === "authenticated" && userId) {
        apiPost<{ id?: string | number }>("/api/history", {
          calcId: item.calcId, calcTitle: item.calcTitle, inputs: item.inputs,
          result: item.result, unit: item.unit,
        }).then((entry) => {
          if (entry?.id && String(entry.id) !== optimisticId) {
            setHistory((previous) => previous.map((entryRow) =>
              entryRow.id === optimisticId ? { ...entryRow, id: String(entry.id) } : entryRow));
          }
        })
          .catch(() => {
            /* silent — keep optimistic */
          });
      }
    },
    [status, userId]
  );

  // ── deleteItem ────────────────────────────────────────────────────────────
  const deleteItem = useCallback(
    (id: string) => {
      // Captured via box (not a let shadowed by closure CFA) so the catch can roll back
      const removed: { item?: HistoryItem } = {};
      setHistory((prev) => {
        const item = prev.find((h) => h.id === id);
        if (item) removed.item = item;
        return prev.filter((h) => h.id !== id);
      });

      if (status === "authenticated") {
        apiDelete(`/api/history/${encodeURIComponent(id)}`).catch(() => {
          // Server delete failed — put the item back (list is newest-first)
          const item = removed.item;
          if (!item) return;
          setHistory((prev) => [item, ...prev].slice(0, MAX_HISTORY));
        });
      }
    },
    [status]
  );

  // ── clearAll ──────────────────────────────────────────────────────────────
  const clearAll = useCallback(() => {
    const previous = history;
    setHistory([]);

    if (status === "authenticated") {
      apiDelete("/api/history")
        .catch((err) => {
          console.error("[useHistory] clearAll failed on server, rolling back:", err);
          setHistory(previous);
        });
    }
  }, [status, history]);

  return { history, addToHistory, deleteItem, clearAll };
}
