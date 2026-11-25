"use client";

import { useRef } from "react";
import type { MouseEvent } from "react";

/**
 * A press only counts as a backdrop press when it starts and ends on the dialog
 * element itself. Pressing inside the panel and releasing on the backdrop (a
 * drag-selection) fires a click whose target is the dialog, the nearest common
 * ancestor, so comparing the click target alone closed the dialog mid-drag.
 */
export function isBackdropClick(
  startedOnDialog: boolean,
  clickTargetIsDialog: boolean
): boolean {
  return startedOnDialog && clickTargetIsDialog;
}

export function useBackdropClose(onClose: () => void) {
  const startedOnDialog = useRef(false);

  return {
    onMouseDown: (event: MouseEvent<HTMLDialogElement>) => {
      startedOnDialog.current = event.target === event.currentTarget;
    },
    onClick: (event: MouseEvent<HTMLDialogElement>) => {
      const shouldClose = isBackdropClick(
        startedOnDialog.current,
        event.target === event.currentTarget
      );
      startedOnDialog.current = false;
      if (shouldClose) onClose();
    },
  };
}
