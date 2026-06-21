"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { ThemeToggle } from "./theme-toggle";
import styles from "./entity-hub.module.css";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className={`${styles.entityHub} ${styles.authPage}`}>
      <div className={styles.authGlow} aria-hidden />
      <div className={styles.authThemeWrap}>
        <ThemeToggle collapsed />
      </div>
      <div className={styles.authInner}>
        <div className={styles.authBrand}>
          <Image
            src="/brand/logo.svg"
            alt="06.lab"
            width={52}
            height={52}
            priority
          />
          <div className={styles.authBrandText}>
            <p className={styles.authTitle}>06.lab</p>
            <p className={styles.authSubtitle}>Painel administrativo</p>
          </div>
        </div>
        <div className={styles.authCard}>{children}</div>
      </div>
    </div>
  );
}
