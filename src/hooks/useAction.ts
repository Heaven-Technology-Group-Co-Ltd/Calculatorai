"use client";

import { useCallback, useState } from "react";
import { ClientApiError } from "@/lib/api-client";

export function useAction<Args extends unknown[], Output>(action: (...args: Args) => Promise<Output>) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const clearError = useCallback(() => { setError(null); setCode(null); }, []);
  const run = useCallback(async (...args: Args): Promise<Output> => {
    setSubmitting(true);
    clearError();
    try {
      return await action(...args);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Request failed");
      setCode(failure instanceof ClientApiError ? failure.code ?? null : null);
      throw failure;
    } finally {
      setSubmitting(false);
    }
  }, [action, clearError]);
  return { submitting, error, code, clearError, run };
}
