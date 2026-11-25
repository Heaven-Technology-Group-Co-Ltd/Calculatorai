"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { User, LogOut, LogIn } from "lucide-react";
import { LogoutModal } from "@/components/LogoutModal";
import styles from "./AuthButton.module.css";

export const AuthButton: React.FC = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [navLoading, setNavLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const prevPathname = useRef(pathname);

  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      setNavLoading(true);
      const timer = setTimeout(() => setNavLoading(false), 600);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  const isLoading = status === "loading" || navLoading;

  const handleSignOut = () => {
    setShowConfirm(true);
  };

  const confirmSignOut = () => {
    setShowConfirm(false);
    signOut({ callbackUrl: "/login" });
  };

  if (isLoading) {
    return (
      <div className={`sidebar-bottom-profile ${styles.loadingSkeleton}`}>
        <div className={styles.loadingRow}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={styles.loadingDot}
              style={{ animation: `skeletonPulse 1.2s ease-in-out infinite`, animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (session) {
    return (
      <>
        <div className={`sidebar-bottom-profile ${styles.profileRow}`}>
          <div className={styles.profileInfoRow}>
            <div className="profile-avatar">
              <User size={16} />
            </div>
            <div className="profile-info">
              <span className="profile-name">
                {session.user?.name || session.user?.email || "User"}
              </span>
              <span className="profile-status">Online</span>
            </div>
          </div>
          <button
            className={styles.logoutBtn}
            title="Sign out"
            onClick={handleSignOut}
          >
            <LogOut size={16} />
          </button>
        </div>

        <LogoutModal
          show={showConfirm}
          onClose={() => setShowConfirm(false)}
          onConfirm={confirmSignOut}
          lang="en"
        />
      </>
    );
  }

  return (
    <div className={`sidebar-bottom-profile ${styles.signInWrap}`}>
      <button
        className={`sidebar-nav-item ${styles.signInBtn}`}
        onClick={() => signIn(undefined, { callbackUrl: "/" })}
      >
        <LogIn size={16} />
        <span>Sign In</span>
      </button>
    </div>
  );
};
