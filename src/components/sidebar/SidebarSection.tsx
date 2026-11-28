"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import styles from "./SidebarSection.module.css";

export const sectionSpring = { type: "spring" as const, stiffness: 320, damping: 30, mass: 0.8 };
export const chevronSpring = { type: "spring" as const, stiffness: 400, damping: 26, mass: 0.5 };

/** Keep in sync with .sectionContent max-height in the CSS module. */
const SECTION_MAX_HEIGHT = 260;

/** Measure the inner wrapper's scrollHeight so framer-motion gets a pixel value, not "auto". */
function useContentHeight(isOpen: boolean, deps: React.ReactNode): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState(0);
  useEffect(() => {
    if (isOpen && ref.current) {
      const raf = requestAnimationFrame(() => {
        if (ref.current) setHeight(ref.current.scrollHeight);
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [isOpen, deps]);
  return [ref, height];
}

export interface SidebarSectionProps {
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  extra?: React.ReactNode;
  itemCount?: number;
  /** Max height for the collapsible content area before it scrolls internally. Default 260px. */
  maxHeight?: number;
}

const SidebarSectionInner: React.FC<SidebarSectionProps> = ({
  label,
  isOpen,
  onToggle,
  children,
  extra,
  itemCount,
  maxHeight = SECTION_MAX_HEIGHT,
}) => {
  const contentId = React.useId();
  const [contentRef, measuredHeight] = useContentHeight(isOpen, children);
  return (
    <>
      {/* ── Trigger Button ── */}
      <motion.button
        type="button"
        onClick={onToggle}
        className={`${styles.sectionTrigger} ${isOpen ? styles.sectionTriggerOpen : ""}`}
        aria-expanded={isOpen}
        aria-controls={contentId}
        aria-label={`Toggle ${label} section`}
        layout="position"
        transition={sectionSpring}
      >
        {/* Label + Count */}
        <span className={styles.sectionLeft}>
          <span className={`sidebar-section-title ${styles.sectionLabel}`}>
            {label}
          </span>
          {itemCount !== undefined && (
            <span className={styles.sectionCount}>{itemCount}</span>
          )}
        </span>

        {/* Right: extra + chevron */}
        <span className={styles.sectionActions}>
          {extra}
          <motion.span
            className={styles.sectionChevron}
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={chevronSpring}
          >
            <ChevronDown size={12} strokeWidth={2.5} />
          </motion.span>
        </span>
      </motion.button>

      {/* ── Collapsible Content ── */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={contentId}
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: Math.min(measuredHeight || 1, maxHeight), opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={sectionSpring}
            style={{ maxHeight }}
            className={styles.sectionContent}
          >
            <div ref={contentRef} className={styles.sectionContentInner}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export const SidebarSection = React.memo(SidebarSectionInner);
