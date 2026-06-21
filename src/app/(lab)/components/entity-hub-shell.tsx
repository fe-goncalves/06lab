"use client";

import type { ReactNode } from "react";
import Breadcrumb from "@/app/(lab)/components/breadcrumb";
import styles from "./entity-hub.module.css";

type BreadcrumbItem = { label: string; href?: string };

type TabItem = {
  key: string;
  label: string;
  badge?: number;
};

type EntityHubShellProps = {
  breadcrumb: BreadcrumbItem[];
  avatar: ReactNode;
  title: string;
  subtitle?: string;
  tabs?: TabItem[];
  activeTab?: string;
  onTabChange?: (key: string) => void;
  showSave?: boolean;
  saveFormId?: string;
  saving?: boolean;
  saveLabel?: string;
  loading?: boolean;
  loadError?: string | null;
  children: ReactNode;
  contentClassName?: string;
  hubClassName?: string;
};

export function EntityHubShell({
  breadcrumb,
  avatar,
  title,
  subtitle,
  tabs,
  activeTab,
  onTabChange,
  showSave = false,
  saveFormId,
  saving = false,
  saveLabel = "Salvar",
  loading = false,
  loadError = null,
  children,
  contentClassName,
  hubClassName,
}: EntityHubShellProps) {
  if (loading) {
    return (
      <div className={`${styles.entityHub} ${styles.page} ${styles.loading}`}>
        Carregando…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={`${styles.entityHub} ${styles.page} ${styles.loading}`} style={{ color: "var(--color-text-primary)" }}>
        {loadError}
      </div>
    );
  }

  return (
    <div className={`${styles.entityHub} ${styles.page} ${hubClassName ?? ""}`.trim()}>
      <div className={styles.header}>
        <div className={styles.headerGlow} />
        <div className={styles.headerSurface} />

        <div className={styles.headerInner}>
          <Breadcrumb items={breadcrumb} />

          <div className={styles.heroRow}>
            {avatar}
            <div className={styles.heroMeta}>
              <h1 className={styles.title}>{title}</h1>
              {subtitle && <p className={styles.headerDetail}>{subtitle}</p>}
            </div>
            {showSave && saveFormId && (
              <button
                type="submit"
                form={saveFormId}
                disabled={saving}
                className={styles.saveBtn}
              >
                {saving ? "Salvando…" : saveLabel}
              </button>
            )}
          </div>

          <div className={styles.stripe} />

          {tabs && tabs.length > 0 && activeTab && onTabChange && (
            <div className={styles.tabBar}>
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => onTabChange(tab.key)}
                  className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ""}`}
                >
                  {tab.label}
                  {tab.badge != null && tab.badge > 0 && (
                    <span className={styles.tabBadge}>{tab.badge}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={`${styles.content} ${contentClassName ?? ""}`.trim()}>
        {children}
      </div>
    </div>
  );
}
