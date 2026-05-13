"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Crown, Users, UserRound, LogOut } from "lucide-react";
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

  // Quebra nome em até 2 linhas se necessário
  const nameFontSize = displayName.length > 12 ? "13px" : displayName.length > 8 ? "16px" : "20px";

  return (
    <aside
      className="relative flex h-screen w-56 shrink-0 flex-col overflow-y-auto overflow-x-hidden"
      style={{ backgroundColor: "var(--color-surface)" }}
    >
      {/* Degradê lateral direito */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-[3px]"
        style={{
          background: "linear-gradient(180deg, #D7F205 0%, #BFF205 100%)",
        }}
        aria-hidden
      />

      {/* SEÇÃO 1 — Logo + Nome da organização */}
      <Link href="/" className="flex items-center gap-3 px-5 pt-7 pb-6 transition-opacity hover:opacity-80">
        <img
          src={faviconSrc}
          alt=""
          className="h-8 w-8 shrink-0 rounded object-contain"
        />
        <span
          className="font-mono font-normal leading-tight"
          style={{
            color: "#F2F2F2",
            fontSize: nameFontSize,
            fontWeight: 700,
            wordBreak: "break-word",
            maxWidth: "120px",
          }}
        >
          {displayName.toUpperCase()}
        </span>
      </Link>

      {/* SEÇÃO 2 — Competições fixadas */}
      {pinnedCompetitions.length > 0 && (
        <div className="px-5 pt-2 pb-5">
          <div className="flex flex-col gap-3">
            {pinnedCompetitions.slice(0, 3).map((comp) => (
              <Link
                key={comp.id}
                href={`/competicoes/${comp.id}`}
                className="flex items-center gap-2 font-mono text-base font-normal leading-tight transition-opacity hover:opacity-70"
                style={{ color: "var(--color-text-primary)", fontSize: "15px" }}
              >
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded"
                  style={{ backgroundColor: "rgba(215,242,5,0.1)" }}
                >
                  {comp.logo_url ? (
                    <img src={comp.logo_url} alt="" className="h-full w-full object-contain" />
                  ) : (
                    <Crown size={13} strokeWidth={2.2} style={{ color: "var(--color-brand-alt)" }} />
                  )}
                </span>
                <span className="truncate">{comp.displayName}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Separador */}
      {pinnedCompetitions.length > 0 && (
        <div className="mx-5 mb-5 h-px" style={{ backgroundColor: "var(--color-border)" }} />
      )}

      {/* SEÇÃO 3 — Cadastros mais usados */}
      <div className="flex flex-col gap-3 px-5 pb-6">
        <SidebarIconItem
          href="/competicoes"
          icon={<Crown size={16} strokeWidth={2.5} />}
          label="COMPETIÇÕES"
        />
        <SidebarIconItem
          href="/equipes"
          icon={<Users size={16} strokeWidth={2.5} />}
          label="EQUIPES"
        />
        <SidebarIconItem
          href="/atletas"
          icon={<UserRound size={16} strokeWidth={2.5} />}
          label="ATLETAS"
        />
      </div>

      {/* Separador */}
      <div className="mx-5 mb-5 h-px" style={{ backgroundColor: "var(--color-border)" }} />

      {/* SEÇÃO 4 — Navegação geral */}
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

      {/* Separador */}
      <div className="mx-5 mb-5 h-px" style={{ backgroundColor: "var(--color-border)" }} />

      {/* SEÇÃO 5 — Sistema, Perfil, Sair */}
      <div className="mt-auto flex flex-col gap-3 px-5 pb-7">
        <SidebarTextItem href="/sistema" label="SISTEMA" />
        <SidebarTextItem href="/perfil" label="PERFIL" />
        <button
          type="button"
          onClick={handleSignOut}
          className="flex items-center gap-3 font-mono font-normal transition-opacity hover:opacity-70"
          style={{ color: "#FF4444", fontSize: "15px" }}
        >
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded"
            style={{ backgroundColor: "rgba(255,68,68,0.15)" }}
          >
            <LogOut size={14} strokeWidth={2.5} style={{ color: "#FF4444" }} />
          </span>
          SAIR
        </button>
      </div>
    </aside>
  );
}

function SidebarIconItem({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 font-mono font-normal transition-opacity hover:opacity-70"
      style={{ color: "#F2F2F2", fontSize: "15px" }}
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
      <span style={{ color: "#F2F2F2" }}>{label}</span>
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
