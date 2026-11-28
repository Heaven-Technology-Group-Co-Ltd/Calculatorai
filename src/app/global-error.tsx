"use client";

import "@/app/globals.css";

/**
 * Next.js Global Error Boundary
 *
 * Catches any unhandled rendering error in the root layout subtree.
 * Uses Ursa design system tokens with globals.css imported.
 */

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          fontFamily: "var(--font-base, system-ui, sans-serif)",
          background: "var(--bg)",
          color: "var(--text)",
          textAlign: "center",
          padding: "2rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "2rem", marginBottom: "1rem", color: "var(--error)" }}>
            <span aria-hidden="true">⚠️</span> Something went wrong
          </h1>
          <p style={{ opacity: 0.7, marginBottom: "2rem", color: "var(--text-secondary)" }}>
            Please try again. If this keeps happening, contact support.
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: "0.75rem 2rem",
              borderRadius: "var(--radius-sm)",
              border: "none",
              background: "var(--primary)",
              color: "var(--bg)",
              fontSize: "1rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
