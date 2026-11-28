"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import styles from "./Toast.module.css";

export type ToastTone = "success" | "error" | "info";
export interface ToastMessage { id: number; message: string; tone: ToastTone }
export const TOAST_DURATION_MS = 4000;
interface ToastContextValue { showToast: (message: string, tone?: ToastTone) => void }
const ToastContext = createContext<ToastContextValue | null>(null);
let nextToastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [notices, setNotices] = useState<ToastMessage[]>([]);
  const showToast = useCallback((message: string, tone: ToastTone = "success") => {
    const id = ++nextToastId;
    setNotices((current) => [...current, { id, message, tone }]);
  }, []);
  const dismiss = useCallback((id: number) => setNotices((current) => current.filter((notice) => notice.id !== id)), []);
  const contextValue = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className={styles.region}>
        {notices.map((notice) => (
          <ToastNotice key={notice.id} notice={notice} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function ToastNotice({ notice, onDismiss }: { notice: ToastMessage; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(notice.id), TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [notice.id, onDismiss]);

  return (
    <div className={`${styles.toast} ${styles[notice.tone]}`} role="status" aria-live="polite">
      <span>{notice.message}</span>
      <button type="button" className={styles.close} aria-label="Dismiss notification" onClick={() => onDismiss(notice.id)}>
        <X size={16} aria-hidden="true" focusable="false" />
      </button>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
