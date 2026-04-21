"use client";

import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dice6, Search, CircleUser } from "lucide-react";
import { useState } from "react";

type Team = {
  id: string;
  full_name: string;
  abbreviation: string | null;
  logo_url: string | null;
  primary_color: string | null;
};

type CachedData = {
  competitions?: number;
  teams?: number;
  athletes?: number;
  matches?: number;
  goals?: number;
  assists?: number;
  yellow_cards?: number;
  red_cards?: number;
  referees?: number;
  news?: number;
  photos?: number;
  users?: number;
};

type Props = {
  orgName: string;
  orgLogo: string | null;
  orgId: string;
  teams: Team[];
  cachedData: CachedData | null;
  cacheUpdatedAt: string | null;
};

const MONTHS = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
];

function formatDate() {
  const d = new Date();
  return `${d.getDate()} DE ${MONTHS[d.getMonth()].toUpperCase()} DE ${d.getFullYear()}`;
}

export default function DashboardClient({
  orgName,
  orgLogo,
  orgId,
  teams,
  cachedData: initialCache,
  cacheUpdatedAt: initialUpdatedAt,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"dashboard" | "jogos">("dashboard");
  const [cache, setCache] = useState<CachedData | null>(initialCache);
  const [updatedAt, setUpdatedAt] = useState<string | null>(initialUpdatedAt);
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    const supabase = createClient();

    const [
      { count: competitions },
      { count: teamsCount },
      { count: athletes },
      { count: matches },
      { count: referees },
      { count: users },
      { data: goalActions },
      { data: assistActions },
      { data: yellowActions },
      { data: redActions },
    ] = await Promise.all([
      supabase.from("competitions").select("*", { count: "exact", head: true }).eq("organization_id", orgId),
      supabase.from("teams").select("*", { count: "exact", head: true }).eq("organization_id", orgId),
      supabase.from("athletes").select("*", { count: "exact", head: true }).eq("organization_id", orgId),
      supabase.from("matches").select("*", { count: "exact", head: true }),
      supabase.from("referees").select("*", { count: "exact", head: true }).eq("organization_id", orgId),
      supabase.from("user_profiles").select("*", { count: "exact", head: true }).eq("organization_id", orgId),
      supabase.from("match_actions").select("id").eq("action_type", "goal"),
      supabase.from("match_actions").select("id").not("secondary_athlete_id", "is", null).eq("action_type", "goal"),
      supabase.from("match_actions").select("id").in("action_type", ["yellow_card", "red_yellow_card"]),
      supabase.from("match_actions").select("id").in("action_type", ["red_card", "red_yellow_card"]),
    ]);

    const newData: CachedData = {
      competitions: competitions ?? 0,
      teams: teamsCount ?? 0,
      athletes: athletes ?? 0,
      matches: matches ?? 0,
      goals: goalActions?.length ?? 0,
      assists: assistActions?.length ?? 0,
      yellow_cards: yellowActions?.length ?? 0,
      red_cards: redActions?.length ?? 0,
      referees: referees ?? 0,
      news: 0,
      photos: 0,
      users: users ?? 0,
    };

    const now = new Date().toISOString();

    await supabase.from("dashboard_cache").upsert({
      organization_id: orgId,
      data: newData,
      updated_at: now,
    }, { onConflict: "organization_id" });

    setCache(newData);
    setUpdatedAt(now);
    setRefreshing(false);
  }

  const stat = (key: keyof CachedData) => cache?.[key] ?? "—";

  const statCards = [
    { label: "COMPETIÇÕES", value: stat("competitions"), href: "/competicoes" },
    { label: "EQUIPES", value: stat("teams"), href: "/equipes" },
    { label: "ATLETAS", value: stat("athletes"), href: "/atletas" },
    { label: "PARTIDAS", value: stat("matches"), href: "/competicoes" },
    { label: "GOLS", value: stat("goals"), href: "/competicoes" },
    { label: "ASSISTÊNCIAS", value: stat("assists"), href: "/competicoes" },
    { label: "CARTÕES AMARELOS", value: stat("yellow_cards"), href: "/suspensoes" },
    { label: "CARTÕES VERMELHOS", value: stat("red_cards"), href: "/suspensoes" },
    { label: "ÁRBITROS", value: stat("referees"), href: "/arbitros" },
    { label: "NOTÍCIAS", value: stat("news"), href: "#" },
    { label: "FOTOS", value: stat("photos"), href: "#" },
    { label: "USUÁRIOS", value: stat("users"), href: "/usuarios" },
  ];

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "var(--color-background)" }}>
      {/* Header bar */}
      <div
        className="flex h-14 shrink-0 items-center border-b px-8"
        style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}
      >
        {/* Abas centralizadas */}
        <div className="flex flex-1 items-center justify-center gap-8">
          <button
            type="button"
            onClick={() => setActiveTab("dashboard")}
            className="flex items-center gap-2 font-mono text-sm font-normal transition-opacity"
            style={{ color: activeTab === "dashboard" ? "var(--color-brand)" : "#A6A6A6" }}
          >
            <span
              className="flex h-5 w-5 items-center justify-center"
              style={{ color: activeTab === "dashboard" ? "var(--color-brand)" : "#A6A6A6" }}
            >
              <Dice6 size={16} strokeWidth={2} />
            </span>
            DASHBOARD
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("jogos")}
            className="flex items-center gap-2 font-mono text-sm font-normal transition-opacity"
            style={{ color: activeTab === "jogos" ? "var(--color-brand)" : "#A6A6A6" }}
          >
            <span
              className="flex h-5 w-5 items-center justify-center"
              style={{ color: activeTab === "jogos" ? "var(--color-brand)" : "#A6A6A6" }}
            >
              {/* Soccer pitch SVG customizado */}
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <rect x="1" y="2" width="14" height="12" rx="1" />
                <line x1="8" y1="2" x2="8" y2="14" />
                <rect x="1" y="5" width="3" height="6" />
                <rect x="12" y="5" width="3" height="6" />
                <circle cx="8" cy="8" r="2" />
              </svg>
            </span>
            JOGOS
          </button>
        </div>

        {/* Ações direita */}
        <div className="flex items-center gap-3">
          <button type="button" className="transition-opacity hover:opacity-70"
            style={{ color: "#A6A6A6" }}>
            <Search size={18} strokeWidth={2} />
          </button>
          <Link href="/perfil" className="transition-opacity hover:opacity-70"
            style={{ color: "#A6A6A6" }}>
            <CircleUser size={28} strokeWidth={1.5} />
          </Link>
        </div>
      </div>

      {/* Conteúdo */}
      {activeTab === "dashboard" ? (
        <div className="flex-1 px-8 py-8">
          {/* Seção 1 — Apresentação */}
          <div className="mb-10 flex items-center gap-5">
            {orgLogo ? (
              <img
                src={orgLogo}
                alt=""
                className="h-20 w-20 rounded-xl border object-contain"
                style={{ borderColor: "var(--color-border)" }}
              />
            ) : (
              <div
                className="flex h-20 w-20 items-center justify-center rounded-xl border text-2xl font-bold"
                style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)", color: "var(--color-text-primary)" }}
              >
                {orgName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h1
                className="font-display text-4xl font-bold"
                style={{ color: "var(--color-text-primary)" }}
              >
                Olá, {orgName}!
              </h1>
              <p
                className="mt-1 font-mono text-sm"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {formatDate()}
              </p>
            </div>
          </div>

          {/* Seção 2 — Cards de equipes */}
          <div className="mb-10">
            <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "thin" }}>
              {teams.map((team) => (
                <TeamCard key={team.id} team={team} />
              ))}
              <Link
                href="/equipes"
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border font-mono text-lg transition-colors hover:border-[var(--color-brand)]"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
              >
                ›››
              </Link>
            </div>
          </div>

          {/* Seção 3 — Cards gerais */}
          <div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {statCards.map((card) => (
                <StatCard
                  key={card.label}
                  label={card.label}
                  value={card.value}
                  href={card.href}
                />
              ))}
            </div>

            {/* Atualizar dados */}
            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="font-mono text-xs transition-opacity hover:opacity-70 disabled:opacity-40"
                style={{ color: "#A6A6A6" }}
              >
                {refreshing ? "ATUALIZANDO..." : "ATUALIZAR DADOS"}
              </button>
              {updatedAt && (
                <span className="font-mono text-xs" style={{ color: "#555" }}>
                  Última atualização: {new Date(updatedAt).toLocaleString("pt-BR")}
                </span>
              )}
            </div>
          </div>

          {/* Marca d'água */}
          <div className="mt-16 text-center">
            <p className="font-mono text-xs" style={{ color: "#2A2A2A" }}>
              06.LAB /// 06.SCORE
            </p>
          </div>
        </div>
      ) : (
        <JogosTab />
      )}
    </div>
  );
}

function TeamCard({ team }: { team: Team }) {
  const [hovered, setHovered] = useState(false);
  const color = team.primary_color ?? "#BFF205";

  return (
    <Link
      href={`/equipes/${team.id}`}
      className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border transition-all duration-200"
      style={{
        borderColor: hovered ? color : "var(--color-border)",
        backgroundColor: hovered ? `${color}22` : "transparent",
        boxShadow: hovered ? `0 0 12px ${color}55` : "none",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {team.logo_url ? (
        <img
          src={team.logo_url}
          alt={team.abbreviation ?? team.full_name}
          className="h-10 w-10 rounded object-contain transition-all duration-200"
          style={{ opacity: hovered ? 1 : 0.35 }}
        />
      ) : (
        <span
          className="font-mono text-xs font-bold transition-all duration-200"
          style={{
            color: hovered ? color : "var(--color-text-secondary)",
            opacity: hovered ? 1 : 0.5,
          }}
        >
          {team.abbreviation?.slice(0, 3) ?? team.full_name.slice(0, 3)}
        </span>
      )}
    </Link>
  );
}

function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: number | string;
  href: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href={href}
      className="flex flex-col justify-between rounded-xl border p-5 transition-all duration-200"
      style={{
        borderColor: hovered ? "var(--color-brand)" : "var(--color-border)",
        backgroundColor: hovered ? "rgba(191,242,5,0.04)" : "var(--color-surface)",
        boxShadow: hovered ? "0 0 16px rgba(191,242,5,0.1)" : "none",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <p
        className="font-display text-4xl font-bold"
        style={{ color: "var(--color-text-primary)" }}
      >
        {value}
      </p>
      <div className="mt-3 flex items-center justify-between">
        <p
          className="font-mono text-xs"
          style={{ color: hovered ? "var(--color-brand)" : "var(--color-text-secondary)" }}
        >
          {label}
        </p>
        <span
          className="font-mono text-xs"
          style={{ color: hovered ? "var(--color-brand)" : "var(--color-text-secondary)" }}
        >
          ›››
        </span>
      </div>
    </Link>
  );
}

function JogosTab() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="text-center">
        <p
          className="font-display text-2xl"
          style={{ color: "var(--color-text-primary)" }}
        >
          Agenda de Jogos
        </p>
        <p
          className="mt-2 font-mono text-sm"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Em construção — wireframe a caminho.
        </p>
      </div>
    </div>
  );
}