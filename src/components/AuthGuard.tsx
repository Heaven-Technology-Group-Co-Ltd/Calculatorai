"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Calculator } from "lucide-react";
import styles from "./AuthGuard.module.css";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className={styles.loadingWrap}>
        <div className={styles.calcIcon}>
          <Calculator size={22} />
        </div>
        <div className={styles.loadingDots}>
          <div className={styles.dot} />
          <div className={styles.dot} />
          <div className={styles.dot} />
        </div>
      </div>
    );
  }

  if (!session?.user) return null;

  return <>{children}</>;
}
