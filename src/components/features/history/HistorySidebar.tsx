"use client";

import React, { useRef, useEffect, useCallback } from "react";
import { Clock, Trash2, X, Ghost } from "lucide-react";
import { uiTranslations } from "@/lib/translations";
import {
  HistorySidebarProps,
  HistoryItemData,
} from "./HistorySidebar.data";
import styles from "./HistorySidebar.module.css";

function HistoryItem({
  item,
  onRestore,
  onDeleteItem,
}: {
  item: HistoryItemData;
  onRestore: (item: HistoryItemData) => void;
  onDeleteItem: (id: string) => void;
}) {
  const onClick = useCallback(() => onRestore(item), [item, onRestore]);
  const onDeleteClick = useCallback(
    () => onDeleteItem(item.id),
    [item.id, onDeleteItem]
  );

  return (
    <div className={`hs-item ${styles.itemCard}`}>
      <button
        type="button"
        className={styles.itemRestoreBtn}
        onClick={onClick}
      >
        <div className="hs-item-title">{item.calcTitle}</div>
        <div className="hs-item-result">{item.result}</div>
        <div className="hs-item-time">
          {new Date(item.ts).toLocaleString()}
        </div>
      </button>
      <button
        type="button"
        onClick={onDeleteClick}
        className={`modal-close ${styles.itemDeleteBtn}`}
        aria-label="Delete"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

const MemoHistoryItem = React.memo(HistoryItem);

function HistorySidebarInner({
  show,
  onClose,
  lang,
  history,
  onRestore,
  onDelete,
  onClearAll,
  isMobile,
}: HistorySidebarProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (show) {
      if (typeof dialog.showModal === "function" && !dialog.open) {
        dialog.showModal();
      }
    } else {
      if (typeof dialog.close === "function" && dialog.open) {
        dialog.close();
      }
    }
  }, [show, isMobile]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const rect = dialog.getBoundingClientRect();
    const isOutside =
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom;
    if (isOutside) {
      onClose();
    }
  };

  const historyLabel = uiTranslations.history[lang];
  const clearLabel = uiTranslations.clearAll[lang] || "Clear All";
  const emptyLabel = uiTranslations.noHistory[lang] || "No history";

  if (isMobile) {
    return (
      <dialog
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={historyLabel}
        className={styles.bottomSheet}
        onClick={handleBackdropClick}
        onCancel={(e) => {
          e.preventDefault();
          onClose();
        }}
      >
        <div className={styles.sheetHandle} />
        <div className={styles.sheetHeader}>
          <span className={styles.sheetTitle}>{historyLabel}</span>
          {history.length > 0 && (
            <button
              className={styles.clearBtn}
              onClick={onClearAll}
            >
              {clearLabel}
            </button>
          )}
        </div>
        <div className={styles.sheetContent}>
          {history.length === 0 ? (
            <div className={styles.empty}>{emptyLabel}</div>
          ) : (
            history.map((item) => (
              <div key={item.id} className={styles.sheetItem}>
                <div className={styles.itemContent}>
                  <div className={styles.itemTitle}>{item.calcTitle}</div>
                  <div className={styles.itemResult}>{item.result}</div>
                  <div className={styles.itemTime}>
                    {new Date(item.ts).toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRestore(item);
                  }}
                  className={styles.restoreBtn}
                  aria-label="Restore"
                >
                  <Clock size={14} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item.id, e as React.MouseEvent);
                  }}
                  className={styles.deleteBtn}
                  aria-label="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </dialog>
    );
  }

  return (
    <dialog
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={historyLabel}
      className={styles.drawer}
      onClick={handleBackdropClick}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className={styles.drawerInner}>
        <div className={styles.headerRow}>
          <div className={styles.headerTitle}>
            <Clock size={18} />
            {historyLabel}
          </div>
          <div className={styles.headerActions}>
            {history.length > 0 && (
              <button
                className={styles.clearBtn}
                onClick={onClearAll}
              >
                {clearLabel}
              </button>
            )}
            <button
              className={`modal-close ${styles.closeBtn}`}
              onClick={onClose}
              aria-label="Close history"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className={styles.list}>
          {history.length === 0 ? (
            <div className={styles.empty}>
              <Ghost size={32} />
              <span>{emptyLabel}</span>
            </div>
          ) : (
            history.map((item) => (
              <MemoHistoryItem
                key={item.id}
                item={item}
                onRestore={onRestore}
                onDeleteItem={(id: string) => onDelete(id, {} as React.MouseEvent)}
              />
            ))
          )}
        </div>
      </div>
    </dialog>
  );
}

export const HistorySidebar = React.memo(HistorySidebarInner);
