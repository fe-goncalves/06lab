"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Crown,
  Users,
  UserRound,
  LogOut,
  Newspaper,
  ChevronLeft,
  ChevronRight,
  Menu,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

type PinnedCompetition = {
  id: string;
  displayName: string;
  logo_url: string | null;
};

type OrgInfo = {
  name: string;
  short_name: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  slug: string | null;
  custom_domain: string | null;
};

type Props = {
  pinnedCompetitions: PinnedCompetition[];
  orgInfo: OrgInfo;
};

export default function LabSidebarClient({ pinnedCompetitions, orgInfo }: Props) {
  const router = useRouter();

  // collapsed: estado do desktop (expandido ou recolhido)
  // Começa false para evitar flash, lê o localStorage após montar
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // mobileOpen: controla o drawer no mobile
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar_collapsed");
    if (saved === "true") setCollapsed(true);
    setMounted(true);
  }, []);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebar_collapsed", String(next));
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const faviconSrc = orgInfo.favicon_url ?? orgInfo.logo_url ?? "/brand/logo.svg";
  const displayName = orgInfo.short_name ?? orgInfo.name ?? "06LAB";
  const siteUrl = orgInfo.custom_domain
    ? `https://${orgInfo.custom_domain}`
    : orgInfo.slug
      ? `https://06.score/${orgInfo.slug}`
      : "#";

  const nameFontSize =
    displayName.length > 12 ? "13px" : displayName.length > 8 ? "16px" : "20px";

  // Antes de montar, usa false para evitar flash de conteúdo errado
  const isCollapsed = mounted ? collapsed : false;

  return (
    <>
      {/* ─────────────────────────────────────────
          BOTÃO HAMBURGER — só aparece no mobile
      ───────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 flex h-9 w-9 items-center justify-center rounded md:hidden"
        style={{
          backgroundColor: "var(--color-surface)",
          color: "#F2F2F2",
          border: "1px solid var(--color-border)",
        }}
        aria-label="Abrir menu"
      >
        <Menu size={18} strokeWidth={2} />
      </button>

      {/* ─────────────────────────────────────────
          OVERLAY — fundo escuro no mobile
      ───────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      {/* ─────────────────────────────────────────
          SIDEBAR
          Desktop: sempre visível, largura animada
          Mobile: drawer fixo, entra/sai com translate
      ───────────────────────────────────────── */}
      <aside
        style={{ backgroundColor: "var(--color-surface)", flexShrink: 0 }}
        className={[
          // Estrutura base
          "relative flex h-screen flex-col overflow-y-auto overflow-x-hidden transition-all duration-300",
          // Desktop: largura varia com estado
          isCollapsed ? "md:w-16" : "md:w-56",
          // Mobile: drawer fixo, largura fixa em 224px (w-56)
          "fixed inset-y-0 left-0 z-50 w-56 md:relative md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        ].join(" ")}
      >
        {/* Degradê lateral direito (decorativo) */}
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-[3px]"
          style={{ background: "linear-gradient(180deg, #D7F205 0%, #BFF205 100%)" }}
          aria-hidden
        />

        {/* ── SEÇÃO 1 — Header da org + botão toggle ── */}
        <div
          className={[
            "flex items-center gap-3 pt-7 pb-6",
            isCollapsed ? "flex-col px-0 justify-center" : "px-5 justify-between",
          ].join(" ")}
        >
          {/* Logo */}
          <Link
            href="/"
            className={[
              "flex items-center gap-3 transition-opacity hover:opacity-80 min-w-0",
              isCollapsed ? "justify-center w-full" : "",
            ].join(" ")}
          >
            <img
              src={faviconSrc}
              alt=""
              className="h-8 w-8 shrink-0 rounded object-contain"
            />
            {/* Nome some quando collapsed */}
            {!isCollapsed && (
              <span
                className="font-mono font-bold leading-tight truncate"
                style={{
                  color: "#F2F2F2",
                  fontSize: nameFontSize,
                  wordBreak: "break-word",
                  maxWidth: "120px",
                }}
              >
                {displayName.toUpperCase()}
              </span>
            )}
          </Link>

          {/* Botão toggle — fica abaixo da logo quando collapsed */}
          <button
            type="button"
            onClick={toggleCollapsed}
            className={[
              "hidden md:flex shrink-0 items-center justify-center rounded transition-opacity hover:opacity-70",
              isCollapsed ? "h-7 w-7 mt-1" : "h-6 w-6",
            ].join(" ")}
            style={{
              backgroundColor: "rgba(215,242,5,0.1)",
              color: "var(--color-brand-alt)",
            }}
            title={isCollapsed ? "Expandir sidebar" : "Recolher sidebar"}
            aria-label={isCollapsed ? "Expandir sidebar" : "Recolher sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight size={14} strokeWidth={2.5} />
            ) : (
              <ChevronLeft size={14} strokeWidth={2.5} />
            )}
          </button>
        </div>

        {/* ── SEÇÃO 2 — Competições pinadas ── */}
        {pinnedCompetitions.length > 0 && (
          <div className={["pb-5", isCollapsed ? "px-0" : "px-5"].join(" ")}>
            <div className="flex flex-col gap-3">
              {pinnedCompetitions.slice(0, 3).map((comp) => (
                <Link
                  key={comp.id}
                  href={`/competicoes/${comp.id}`}
                  className={[
                    "flex items-center gap-2 font-mono text-base font-normal leading-tight transition-opacity hover:opacity-70",
                    isCollapsed ? "justify-center px-0" : "",
                  ].join(" ")}
                  style={{ color: "var(--color-text-primary)", fontSize: "15px" }}
                  title={isCollapsed ? comp.displayName : undefined}
                >
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded"
                    style={{ backgroundColor: "rgba(215,242,5,0.1)" }}
                  >
                    {comp.logo_url ? (
                      <img
                        src={comp.logo_url}
                        alt=""
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <Crown
                        size={13}
                        strokeWidth={2.2}
                        style={{ color: "var(--color-brand-alt)" }}
                      />
                    )}
                  </span>
                  {/* Nome some quando collapsed */}
                  {!isCollapsed && (
                    <span className="truncate">{comp.displayName}</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Separador */}
        {pinnedCompetitions.length > 0 && (
          <div
            className="mb-5 h-px"
            style={{
              backgroundColor: "var(--color-border)",
              marginLeft: isCollapsed ? "12px" : "20px",
              marginRight: isCollapsed ? "12px" : "20px",
            }}
          />
        )}

        {/* ── SEÇÃO 3 — Cadastros com ícone ── */}
        <div
          className={[
            "flex flex-col gap-3 pb-6",
            isCollapsed ? "items-center px-0" : "px-5",
          ].join(" ")}
        >
          <SidebarIconItem
            href="/competicoes"
            icon={<Crown size={16} strokeWidth={2.5} />}
            label="COMPETIÇÕES"
            collapsed={isCollapsed}
          />
          <SidebarIconItem
            href="/equipes"
            icon={<Users size={16} strokeWidth={2.5} />}
            label="EQUIPES"
            collapsed={isCollapsed}
          />
          <SidebarIconItem
            href="/atletas"
            icon={<UserRound size={16} strokeWidth={2.5} />}
            label="ATLETAS"
            collapsed={isCollapsed}
          />
          <SidebarIconItem
            href="/noticias"
            icon={<Newspaper size={16} strokeWidth={2.5} />}
            label="NOTÍCIAS"
            collapsed={isCollapsed}
          />
        </div>

        {/* Separador */}
        <div
          className="mb-5 h-px"
          style={{
            backgroundColor: "var(--color-border)",
            marginLeft: isCollapsed ? "12px" : "20px",
            marginRight: isCollapsed ? "12px" : "20px",
          }}
        />

        {/* ── SEÇÃO 4 — Navegação geral (só visível expandido) ── */}
        {!isCollapsed && (
          <div className="flex flex-col gap-3 px-5 pb-6">
            <SidebarTextItem href="/organizacao" label="ORGANIZAÇÃO" />
            <SidebarTextItem href="/configuracoes" label="CONFIGURAÇÕES" />
            <Link
              href={siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono font-normal transition-opacity hover:opacity-70"
              style={{ color: "var(--color-brand-alt)", fontSize: "15px" }}
            >
              SITE OFICIAL
            </Link>
          </div>
        )}

        {/* Separador (só expandido) */}
        {!isCollapsed && (
          <div
            className="mx-5 mb-5 h-px"
            style={{ backgroundColor: "var(--color-border)" }}
          />
        )}

        {/* ── SEÇÃO 5 — Sistema, Perfil, Sair ── */}
        <div
          className={[
            "mt-auto flex flex-col gap-3 pb-7",
            isCollapsed ? "items-center px-0" : "px-5",
          ].join(" ")}
        >
          {!isCollapsed && (
            <>
              <SidebarTextItem href="/sistema" label="SISTEMA" />
              <SidebarTextItem href="/perfil" label="PERFIL" />
            </>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className={[
              "flex items-center gap-3 font-mono font-normal transition-opacity hover:opacity-70",
              isCollapsed ? "justify-center" : "",
            ].join(" ")}
            style={{ color: "#FF4444", fontSize: "15px" }}
            title={isCollapsed ? "Sair" : undefined}
          >
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded"
              style={{ backgroundColor: "rgba(255,68,68,0.15)" }}
            >
              <LogOut size={14} strokeWidth={2.5} style={{ color: "#FF4444" }} />
            </span>
            {!isCollapsed && "SAIR"}
          </button>
        </div>
      </aside>
    </>
  );
}

// ─────────────────────────────────────────────────────────
// Sub-componentes
// ─────────────────────────────────────────────────────────

function SidebarIconItem({
  href,
  icon,
  label,
  collapsed,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "flex items-center gap-3 font-mono font-normal transition-opacity hover:opacity-70",
        collapsed ? "justify-center" : "",
      ].join(" ")}
      style={{ color: "#F2F2F2", fontSize: "15px" }}
      title={collapsed ? label : undefined}
    >
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded"
        style={{
          backgroundColor: "rgba(215,242,5,0.1)",
          color: "var(--color-brand-alt)",
        }}
      >
        {icon}
      </span>
      {!collapsed && <span style={{ color: "#F2F2F2" }}>{label}</span>}
    </Link>
  );
}

function SidebarTextItem({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between font-mono font-normal transition-opacity hover:opacity-70"
      style={{ color: "#A6A6A6", fontSize: "15px" }}
    >
      {label}
      <span style={{ color: "#A6A6A6", fontSize: "12px" }}>›</span>
    </Link>
  );
}