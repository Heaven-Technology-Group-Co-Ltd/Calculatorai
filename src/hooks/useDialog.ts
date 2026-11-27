"use client";

import { useEffect, useRef, type SyntheticEvent } from "react";
import { useBackdropClose } from "@/lib/dialog-backdrop";

function closeDialog(dialog: HTMLDialogElement) {
  if (dialog.open && typeof dialog.close === "function") dialog.close();
}

function syncDialog(dialog: HTMLDialogElement, open: boolean) {
  if (open && !dialog.open && typeof dialog.showModal === "function") dialog.showModal();
  if (!open) closeDialog(dialog);
}

export function useDialog({ open, onClose, mountKey }: { open: boolean; onClose: () => void; mountKey?: boolean }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const backdrop = useBackdropClose(onClose);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    syncDialog(dialog, open);
    return () => closeDialog(dialog);
  }, [open, mountKey]);
  return { dialogRef, dialogProps: { ...backdrop, onCancel: (event: SyntheticEvent<HTMLDialogElement>) => { event.preventDefault(); onClose(); } } };
}
