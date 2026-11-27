"use client";

import React from "react";
import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { usePageView } from "@/lib/use-page-view";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  usePageView();
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
