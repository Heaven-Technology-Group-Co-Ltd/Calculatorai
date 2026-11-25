"use client";

import { usePageView } from "@/lib/use-page-view";

export function PageViewTracker() {
  usePageView();
  return null;
}
