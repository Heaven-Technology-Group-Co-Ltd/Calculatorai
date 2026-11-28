"use client";

import "@/app/globals.css";
import styles from "./global-error.module.css";

/**
 * Next.js Global Error Boundary
 *
 * Catches any unhandled rendering error in the root layout subtree.
 * Uses Ursa design system tokens with globals.css imported.
 */

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body className={styles.body}>
        <div className={styles.content}>
          <h1 className={styles.title}>
            <span aria-hidden="true">⚠️</span> Something went wrong
          </h1>
          <p className={styles.message}>
            Please try again. If this keeps happening, contact support.
          </p>
          <button
            onClick={() => reset()}
            className={styles.retryButton}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
