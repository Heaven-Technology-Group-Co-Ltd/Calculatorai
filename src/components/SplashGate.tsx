"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { LoadingScreen } from "@/components/features/loading/LoadingScreen";
import { useLanguage } from "@/lib/LanguageContext";

const STORAGE_KEY = "splash_seen";

export function SplashGate({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(true);
  const { language: lang } = useLanguage();
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    // Skip splash on repeat visits (same tab session).
    // sessionStorage is only readable after mount (SSR-safe), so the sync
    // setState here is intentional — lazy init would cause a hydration mismatch.
    if (sessionStorage.getItem(STORAGE_KEY)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowSplash(false);
    }
  }, []);

  const handleEnter = useCallback(() => {
    sessionStorage.setItem(STORAGE_KEY, "1");
    setShowSplash(false);

    if (status !== "authenticated") {
      router.push("/login");
    }
  }, [router, status]);

  if (!showSplash) return <>{children}</>;

  return <LoadingScreen onEnter={handleEnter} lang={lang} />;
}
