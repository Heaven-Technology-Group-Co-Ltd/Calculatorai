"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import styles from "./AdminGuard.module.css";

export interface AdminUser {
  id: string;
  name: string | null;
  email: string | null;
  is_admin: boolean;
}

interface AdminGuardProps {
  children: (adminUser: AdminUser) => React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  // Ref, not state: only guards against double-fetch in the effect — no re-render needed
  const checkedRef = useRef(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated" && session?.user && !checkedRef.current) {
      checkedRef.current = true;
      fetch("/api/auth/admin-check", { headers: { "Content-Type": "application/json" } })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data?.is_admin) {
            setAdminUser({
              id: data.data.id,
              name: data.data.name ?? null,
              email: data.data.email ?? null,
              is_admin: true,
            });
          }
        })
        .catch((err) => {
          console.error("Admin check failed:", err);
        });
    }
  }, [status, session, router]);

  if (!adminUser) {
    return (
      <div className={styles.loadingWrap}>
        <div className={styles.shieldIcon}>
          <Shield size={24} color="var(--primary)" />
        </div>
        <div className={styles.loadingDots}>
          <div className={styles.dot} />
          <div className={styles.dot} />
          <div className={styles.dot} />
        </div>
      </div>
    );
  }

  if (!adminUser) return null;

  return <>{children(adminUser)}</>;
}
