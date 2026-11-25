"use client";

import React, { useRef, useEffect, useState } from "react";
import {
  BookOpen,
  X,
  Lightbulb,
  Monitor,
  Smartphone,
  Layers,
} from "lucide-react";
import {
  InfoModalProps,
  GuideDeviceCategory,
  INFO_TRANSLATIONS,
  GUIDE_STEPS,
  GUIDE_TIPS,
} from "./InfoModal.data";
import styles from "./InfoModal.module.css";
import { useSyncExternalStore } from "react";
import { useBackdropClose } from "@/lib/dialog-backdrop";

const MOBILE_QUERY = "(max-width: 767px)";

function subscribeViewport(onChange: () => void) {
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function getIsNarrowViewport() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function getIsNarrowServerSnapshot() {
  return false;
}

function InfoModalInner({ show, onClose, lang }: InfoModalProps) {
  // Derived during render from the live viewport: the default tab follows the
  // screen, and a manual pick overrides it until the modal closes.
  const isNarrow = useSyncExternalStore(
    subscribeViewport,
    getIsNarrowViewport,
    getIsNarrowServerSnapshot,
  );
  const [tabChoice, setTabChoice] = useState<GuideDeviceCategory | null>(null);
  const deviceTab = tabChoice ?? (isNarrow ? "mobile" : "pc");
  const dialogRef = useRef<HTMLDialogElement>(null);

  const handleClose = () => {
    setTabChoice(null);
    onClose();
  };

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
    return () => {
      if (typeof dialog?.close === "function" && dialog.open) {
        dialog.close();
      }
    };
  }, [show]);

  const backdropClose = useBackdropClose(handleClose);


  const filteredSteps = GUIDE_STEPS.filter((step) => {
    if (deviceTab === "all") return true;
    return step.device === "all" || step.device === deviceTab;
  });

  const filteredTips = GUIDE_TIPS.filter((tip) => {
    if (deviceTab === "all") return true;
    return tip.device === "all" || tip.device === deviceTab;
  });

  const deviceTabIds = ["all", "pc", "mobile"] as const;
  const handleDeviceTablistKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const idx = deviceTabIds.indexOf(deviceTab);
    const next = e.key === "ArrowRight"
      ? (idx + 1) % deviceTabIds.length
      : (idx - 1 + deviceTabIds.length) % deviceTabIds.length;
    setTabChoice(deviceTabIds[next]);
    document.getElementById(`info-device-tab-${deviceTabIds[next]}`)?.focus();
  };

  return (
    <dialog
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="info-modal-title"
      className="modal-container m-info-container"
      onMouseDown={backdropClose.onMouseDown}
      onClick={backdropClose.onClick}
      onCancel={(e) => {
        e.preventDefault();
        handleClose();
      }}
    >
      <div className="modal-header">
        <div className="modal-header-icon">
          <BookOpen size={20} />
        </div>
        <div className={`modal-header-text ${styles.headerText}`}>
          <div className="modal-header-title" id="info-modal-title">
            {lang === "th" ? "วิธีใช้งาน" : "How to Use"}
          </div>
          <div className="modal-header-sub">
            {INFO_TRANSLATIONS.guideSub[lang]}
          </div>
        </div>
        <button
          type="button"
          className="modal-close"
          onClick={() => handleClose()}
          aria-label={lang === "th" ? "ปิด" : "Close"}
        >
          <X size={16} />
        </button>
      </div>

      <div className="modal-body">
        {/* Device Segmented Control Tabs */}
        <div className={styles.deviceTabs} role="tablist" aria-label="Device view" onKeyDown={handleDeviceTablistKeyDown}>
          <button
            type="button"
            id="info-device-tab-all"
            className={`${styles.deviceTab} ${deviceTab === "all" ? styles.deviceTabActive : ""}`}
            onClick={() => setTabChoice("all")}
            role="tab"
            aria-selected={deviceTab === "all"}
            aria-controls="info-device-panel"
            tabIndex={deviceTab === "all" ? 0 : -1}
          >
            <Layers size={14} />
            <span>{INFO_TRANSLATIONS.guideTabAll[lang]}</span>
          </button>
          <button
            type="button"
            id="info-device-tab-pc"
            className={`${styles.deviceTab} ${deviceTab === "pc" ? styles.deviceTabActive : ""}`}
            onClick={() => setTabChoice("pc")}
            role="tab"
            aria-selected={deviceTab === "pc"}
            aria-controls="info-device-panel"
            tabIndex={deviceTab === "pc" ? 0 : -1}
          >
            <Monitor size={14} />
            <span>{INFO_TRANSLATIONS.guideTabPC[lang]}</span>
          </button>
          <button
            type="button"
            id="info-device-tab-mobile"
            className={`${styles.deviceTab} ${deviceTab === "mobile" ? styles.deviceTabActive : ""}`}
            onClick={() => setTabChoice("mobile")}
            role="tab"
            aria-selected={deviceTab === "mobile"}
            aria-controls="info-device-panel"
            tabIndex={deviceTab === "mobile" ? 0 : -1}
          >
            <Smartphone size={14} />
            <span>{INFO_TRANSLATIONS.guideTabMobile[lang]}</span>
          </button>
        </div>

        {/* Guide Steps List */}
        <div
          className="m-info-steps"
          role="tabpanel"
          id="info-device-panel"
          aria-labelledby={`info-device-tab-${deviceTab}`}
          tabIndex={0}
        >
          {filteredSteps.map((step) => {
            const StepIcon = step.icon;
            return (
              <div key={step.id} className="m-info-step">
                <div className="m-info-step-num">
                  <StepIcon size={18} />
                </div>
                <div className="m-info-step-content">
                  <div className={styles.stepTitleContainer}>
                    <div className={styles.stepTitleText}>{step.title[lang]}</div>
                    <div className={styles.badgeRow}>
                      {step.device === "pc" && (
                        <span className={`${styles.badge} ${styles.badgePC}`}>💻 PC</span>
                      )}
                      {step.device === "mobile" && (
                        <span className={`${styles.badge} ${styles.badgeMobile}`}>📱 Mobile</span>
                      )}
                      {step.device === "all" && (
                        <span className={`${styles.badge} ${styles.badgeAll}`}>💻 PC & 📱 Mobile</span>
                      )}
                      {step.kbdHint && (
                        <span className={styles.kbdBadge}>{step.kbdHint}</span>
                      )}
                    </div>
                  </div>
                  <p>{step.desc[lang]}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pro Tips Section */}
        {filteredTips.length > 0 && (
          <div className="m-info-tips">
            {filteredTips.map((tip) => (
              <span key={tip.id} className="m-info-tip">
                <Lightbulb size={13} style={{ color: "var(--warning)", flexShrink: 0 }} />
                <span className={styles.tipLabel}>{tip.text[lang]}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="m-info-footer">
        <button type="button" className="m-info-btn" onClick={() => handleClose()}>
          {INFO_TRANSLATIONS.guideGotIt[lang]}
        </button>
      </div>
    </dialog>
  );
}

export const InfoModal = React.memo(InfoModalInner);
