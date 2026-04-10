"use client";

import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export type PinnedCompetition = {
  id: string;
  displayName: string;
};

type LabSidebarClientProps = {
  pinnedCompetitions: PinnedCompetition[];
};

const STORAGE_KEY = "sidebar-collapsed";

function IconTrophy() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
      aria-hidden
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

function IconGrid() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
      aria-hidden
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function IconOrg() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
      aria-hidden
    >
      <path d="M3 21h18" />
      <path d="M5 21V7l8-4v18" />
      <path d="M19 21V11l-6-4" />
      <path d="M9 9v.01" />
      <path d="M9 12v.01" />
      <path d="M9 15v.01" />
      <path d="M9 18v.01" />
    </svg>
  );
}

function IconGear() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
      aria-hidden
    >
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
      aria-hidden
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  );
}

function IconChevronLeft() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

const subLinkClass =
  "block rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-[color-mix(in_oklab,var(--color-brand)_10%,transparent)]";

export default function LabSidebarClient({
  pinnedCompetitions,
}: LabSidebarClientProps) {
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      setIsCollapsed(localStorage.getItem(STORAGE_KEY) === "true");
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, String(isCollapsed));
    } catch {
      /* ignore */
    }
  }, [isCollapsed, hydrated]);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((c) => !c);
  }, []);

  const handleSignOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }, [router]);

  const asideWidth = isCollapsed ? 56 : 240;

  const sectionHeaderClass =
    "flex w-full items-center justify-between gap-1 rounded-md px-3 py-2 text-left font-mono text-[11px] font-medium uppercase tracking-widest transition-colors hover:bg-[color-mix(in_oklab,var(--color-brand)_8%,transparent)]";

  return (
    <aside
      className="flex shrink-0 flex-col border-r transition-all duration-200"
      style={{
        width: asideWidth,
        minWidth: asideWidth,
        backgroundColor: "var(--color-surface)",
        borderColor: "var(--color-border)",
      }}
    >
      {/* Topo */}
      {!isCollapsed ? (
        <div
          className="flex items-center gap-2 border-b px-3 py-3"
          style={{ borderColor: "var(--color-border)" }}
        >
          <Link href="/" className="flex min-w-0 flex-1 items-center gap-2">
            <img
              src="/brand/logo.svg"
              alt=""
              className="h-8 w-auto shrink-0"
              style={{ maxHeight: 32 }}
            />
            <span
              className="font-display truncate text-sm font-semibold uppercase"
              style={{ color: "var(--color-brand)" }}
            >
              06LAB
            </span>
          </Link>
          <button
            type="button"
            onClick={toggleCollapse}
            className="flex shrink-0 items-center justify-center rounded-md border p-1.5 transition-colors hover:bg-[color-mix(in_oklab,var(--color-brand)_12%,transparent)]"
            style={{
              borderColor: "var(--color-border)",
              color: "var(--color-text-secondary)",
            }}
            title="Recolher"
            aria-label="Recolher menu"
          >
            <IconChevronLeft />
          </button>
        </div>
      ) : (
        <div
          className="flex flex-col items-center gap-2 border-b py-3"
          style={{ borderColor: "var(--color-border)" }}
        >
          <Link href="/" title="06LAB" className="flex justify-center">
            <img
              src="/brand/logo.svg"
              alt=""
              className="h-6 w-6 object-contain"
              style={{ maxHeight: 24, maxWidth: 24 }}
            />
          </Link>
          <button
            type="button"
            onClick={toggleCollapse}
            className="flex items-center justify-center rounded-md border p-1.5 transition-colors hover:bg-[color-mix(in_oklab,var(--color-brand)_12%,transparent)]"
            style={{
              borderColor: "var(--color-border)",
              color: "var(--color-text-secondary)",
            }}
            title="Expandir"
            aria-label="Expandir menu"
          >
            <IconChevronRight />
          </button>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3">
        {!isCollapsed ? (
          <>
            <div className="mb-1">
              <Link
                href="/competicoes"
                className={sectionHeaderClass}
                style={{ color: "var(--color-text-primary)" }}
              >
                <span>COMPETIÇÕES</span>
                <span style={{ color: "var(--color-text-secondary)" }}>&gt;</span>
              </Link>
              <div
                className="ml-2 mt-1 space-y-0.5 border-l pl-2"
                style={{ borderColor: "var(--color-border)" }}
              >
                <Link
                  href="/competicoes"
                  className={subLinkClass}
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Todas as competições
                </Link>
                {pinnedCompetitions.map((c) => (
                  <Link
                    key={c.id}
                    href={`/competicoes/${c.id}`}
                    className={`${subLinkClass} flex items-center gap-2`}
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-sm"
                      style={{ backgroundColor: "var(--color-border)" }}
                      aria-hidden
                    />
                    <span className="truncate">{c.displayName}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div
              className="my-3 border-t"
              style={{ borderColor: "var(--color-border)" }}
            />

            <div className="mb-1">
              <Link
                href="/base"
                className={sectionHeaderClass}
                style={{ color: "var(--color-text-primary)" }}
              >
                <span>BASE</span>
                <span style={{ color: "var(--color-text-secondary)" }}>&gt;</span>
              </Link>
              <div
                className="ml-2 mt-1 space-y-0.5 border-l pl-2"
                style={{ borderColor: "var(--color-border)" }}
              >
                {[
                  ["Todos os cadastros", "/base"],
                  ["Equipes", "/equipes"],
                  ["Atletas", "/atletas"],
                  ["Comissão Técnica", "/comissao"],
                ].map(([label, href]) => (
                  <Link
                    key={href}
                    href={href}
                    className={subLinkClass}
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            <div
              className="my-3 border-t"
              style={{ borderColor: "var(--color-border)" }}
            />

            <div className="mb-1">
              <Link
                href="/organizacao"
                className={sectionHeaderClass}
                style={{ color: "var(--color-text-primary)" }}
              >
                <span>ORGANIZAÇÃO</span>
                <span style={{ color: "var(--color-text-secondary)" }}>&gt;</span>
              </Link>
              <div
                className="ml-2 mt-1 space-y-0.5 border-l pl-2"
                style={{ borderColor: "var(--color-border)" }}
              >
                {[
                  ["Rankings", "/rankings"],
                  ["Estatísticas", "/estatisticas"],
                  ["Arbitragem", "/arbitros"],
                  ["Arenas", "/arenas"],
                ].map(([label, href]) => (
                  <Link
                    key={href}
                    href={href}
                    className={subLinkClass}
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 py-1">
            <Link
              href="/competicoes"
              title="COMPETIÇÕES"
              className="flex h-10 w-10 items-center justify-center rounded-md border transition-colors hover:bg-[color-mix(in_oklab,var(--color-brand)_12%,transparent)]"
              style={{
                borderColor: "var(--color-border)",
                color: "var(--color-brand)",
              }}
            >
              <IconTrophy />
            </Link>
            <Link
              href="/base"
              title="BASE"
              className="flex h-10 w-10 items-center justify-center rounded-md border transition-colors hover:bg-[color-mix(in_oklab,var(--color-brand)_12%,transparent)]"
              style={{
                borderColor: "var(--color-border)",
                color: "var(--color-brand)",
              }}
            >
              <IconGrid />
            </Link>
            <Link
              href="/organizacao"
              title="ORGANIZAÇÃO"
              className="flex h-10 w-10 items-center justify-center rounded-md border transition-colors hover:bg-[color-mix(in_oklab,var(--color-brand)_12%,transparent)]"
              style={{
                borderColor: "var(--color-border)",
                color: "var(--color-brand)",
              }}
            >
              <IconOrg />
            </Link>
          </div>
        )}
      </nav>

      <div
        className="mt-auto border-t px-2 py-3"
        style={{ borderColor: "var(--color-border)" }}
      >
        {!isCollapsed ? (
          <div className="flex flex-col gap-1">
            <Link
              href="/configuracoes"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-[color-mix(in_oklab,var(--color-brand)_10%,transparent)]"
              style={{ color: "var(--color-text-secondary)" }}
            >
              <span style={{ color: "var(--color-brand)" }}>
                <IconGear />
              </span>
              Configurações
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-[color-mix(in_oklab,var(--color-brand)_10%,transparent)]"
              style={{ color: "var(--color-text-secondary)" }}
            >
              <span style={{ color: "var(--color-brand)" }}>
                <IconLogout />
              </span>
              Sair
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Link
              href="/configuracoes"
              title="Configurações"
              className="flex h-10 w-10 items-center justify-center rounded-md border transition-colors hover:bg-[color-mix(in_oklab,var(--color-brand)_12%,transparent)]"
              style={{
                borderColor: "var(--color-border)",
                color: "var(--color-brand)",
              }}
            >
              <IconGear />
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              title="Sair"
              className="flex h-10 w-10 items-center justify-center rounded-md border transition-colors hover:bg-[color-mix(in_oklab,var(--color-brand)_12%,transparent)]"
              style={{
                borderColor: "var(--color-border)",
                color: "var(--color-brand)",
              }}
              aria-label="Sair"
            >
              <IconLogout />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
