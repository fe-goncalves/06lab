"use client";

import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { Dice6, Search, Bell, Calendar } from "lucide-react";
import { useState, useEffect } from "react";

type Team = {
  id: string;
  full_name: string;
  abbreviation: string | null;
  logo_url: string | null;
  primary_color: string | null;
};

type Match = {
  id: string;
  match_date: string | null;
  match_time: string | null;
  status: string;
  score_a: number;
  score_b: number;
  team_a_id: string | null;
  team_b_id: string | null;
  teams_a: { full_name: string; abbreviation: string | null; logo_url: string | null } | null;
  teams_b: { full_name: string; abbreviation: string | null; logo_url: string | null } | null;
  phases: {
    competition_editions: {
      competitions: { full_name: string; logo_url: string | null } | null;
    } | null;
  } | null;
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
  userId: string;
};

const MONTHS = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];
const DAYS_SHORT = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const MONTHS_SHORT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function formatFullDate() {
  const d = new Date();
  return `${d.getDate()} DE ${MONTHS[d.getMonth()].toUpperCase()} DE ${d.getFullYear()}`;
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function buildCalendarDays(centerDate: Date, range = 10) {
  const days: Date[] = [];
  for (let i = -range; i <= range; i++) {
    const d = new Date(centerDate);
    d.setDate(centerDate.getDate() + i);
    days.push(d);
  }
  return days;
}

const STATUS_LABEL: Record<string, string> = {
  scheduled: "AG",
  ongoing: "AO VIVO",
  finished: "FT",
  postponed: "AD",
};

const STATUS_COLOR: Record<string, string> = {
  scheduled: "#A6A6A6",
  ongoing: "#BFF205",
  finished: "#A6A6A6",
  postponed: "#FF4444",
};

export default function DashboardClient({
  orgName,
  orgLogo,
  orgId,
  teams,
  cachedData: initialCache,
  cacheUpdatedAt: initialUpdatedAt,
  userId,
}: Props) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "jogos">("dashboard");
  const [cache, setCache] = useState<CachedData | null>(initialCache);
  const [updatedAt, setUpdatedAt] = useState<string | null>(initialUpdatedAt);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotif, setShowNotif] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Jogos
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [calendarDays] = useState(() => buildCalendarDays(today, 14));
  const [matches, setMatches] = useState<Match[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    if (activeTab === "jogos") {
      loadMatches(selectedDate);
    }
  }, [activeTab, selectedDate]);

  async function loadNotifications() {
    const supabase = createClient();
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("recipient_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    setNotifications(data ?? []);
    setUnreadCount((data ?? []).filter((n: any) => !n.is_read).length);
  }

  async function markAllRead() {
    const supabase = createClient();
    const ids = notifications.filter(n => !n.is_read).map(n => n.id);
    if (ids.length === 0) return;
    await supabase.from("notifications").update({ is_read: true }).in("id", ids);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }

  async function loadMatches(date: Date) {
    setLoadingMatches(true);
    const supabase = createClient();
    const dateStr = toDateStr(date);
    const { data } = await supabase
      .from("matches")
      .select("id, match_date, match_time, status, score_a, score_b, team_a_id, team_b_id, teams_a:teams!matches_team_a_id_fkey(full_name, abbreviation, logo_url), teams_b:teams!matches_team_b_id_fkey(full_name, abbreviation, logo_url), phases(competition_editions(competitions(full_name, logo_url)))")
      .eq("match_date", dateStr)
      .order("match_time", { nullsFirst: false });
    setMatches((data as any) ?? []);
    setLoadingMatches(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    const supabase = createClient();
    const [
      { count: competitions },
      { count: teamsCount },
      { count: athletes },
      { count: matchesCount },
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
      matches: matchesCount ?? 0,
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

  // Agrupa partidas por competição
  const matchesByCompetition: Record<string, { compName: string; compLogo: string | null; matches: Match[] }> = {};
  matches.forEach(m => {
    const compName = m.phases?.competition_editions?.competitions?.full_name ?? "Sem competição";
    const compLogo = m.phases?.competition_editions?.competitions?.logo_url ?? null;
    if (!matchesByCompetition[compName]) {
      matchesByCompetition[compName] = { compName, compLogo, matches: [] };
    }
    matchesByCompetition[compName].matches.push(m);
  });

  const isToday = toDateStr(selectedDate) === toDateStr(today);

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
            className="flex items-center gap-2 font-mono text-sm transition-opacity"
            style={{ color: activeTab === "dashboard" ? "var(--color-brand)" : "#A6A6A6" }}
          >
            <Dice6 size={16} strokeWidth={2} style={{ color: activeTab === "dashboard" ? "var(--color-brand)" : "#A6A6A6" }} />
            DASHBOARD
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("jogos")}
            className="flex items-center gap-2 font-mono text-sm transition-opacity"
            style={{ color: activeTab === "jogos" ? "var(--color-brand)" : "#A6A6A6" }}
          >
            <Calendar size={16} strokeWidth={2} style={{ color: activeTab === "jogos" ? "var(--color-brand)" : "#A6A6A6" }} />
            JOGOS
          </button>
        </div>

        {/* Direita — search + notificações */}
        <div className="flex items-center gap-4">
          <button type="button" className="transition-opacity hover:opacity-70" style={{ color: "#A6A6A6" }}>
            <Search size={17} strokeWidth={2} />
          </button>

          {/* Sino de notificações */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotif(v => !v)}
              className="relative flex h-8 w-8 items-center justify-center rounded-lg border transition-colors"
              style={{ borderColor: "var(--color-border)", color: "#A6A6A6" }}
            >
              <Bell size={16} strokeWidth={2} />
              {unreadCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-xs font-bold"
                  style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {showNotif && (
              <div
                className="absolute right-0 top-10 z-50 w-80 rounded-xl border shadow-lg"
                style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
              >
                <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--color-border)" }}>
                  <p className="font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
                    Notificações
                  </p>
                  {unreadCount > 0 && (
                    <button type="button" onClick={markAllRead} className="text-xs" style={{ color: "var(--color-brand)" }}>
                      Marcar todas como lidas
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="p-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>Nenhuma notificação.</p>
                  ) : (
                    <ul>
                      {notifications.map(n => (
                        <li key={n.id}
                          className="flex gap-3 border-b px-4 py-3 last:border-b-0"
                          style={{ borderColor: "var(--color-border)", backgroundColor: n.is_read ? "transparent" : "rgba(191,242,5,0.04)" }}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm" style={{ color: "var(--color-text-primary)" }}>{n.message}</p>
                            <p className="mt-0.5 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                              {new Date(n.created_at).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                          {!n.is_read && (
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: "var(--color-brand)" }} />
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      {activeTab === "dashboard" ? (
        <div className="flex-1 px-8 py-8">
          {/* Seção 1 — Apresentação */}
          <div className="mb-10 flex items-center gap-5">
            {orgLogo ? (
              <img src={orgLogo} alt="" className="h-20 w-20 rounded-xl border object-contain"
                style={{ borderColor: "var(--color-border)" }} />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-xl border text-2xl font-bold"
                style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)", color: "var(--color-text-primary)" }}>
                {orgName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="font-display text-4xl font-bold" style={{ color: "var(--color-text-primary)" }}>
                Olá, {orgName}!
              </h1>
              <p className="mt-1 font-mono text-sm" style={{ color: "var(--color-text-secondary)" }}>
                {formatFullDate()}
              </p>
            </div>
          </div>

          {/* Seção 2 — Cards de equipes */}
          <div className="mb-10">
            <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "thin" }}>
              {teams.map(team => <TeamCard key={team.id} team={team} />)}
              <Link href="/equipes"
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border font-mono text-sm transition-colors hover:border-[var(--color-brand)]"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                ›››
              </Link>
            </div>
          </div>

          {/* Seção 3 — Cards gerais */}
          <div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {statCards.map(card => (
                <StatCard key={card.label} label={card.label} value={card.value} href={card.href} />
              ))}
            </div>
            <div className="mt-6 flex items-center gap-3">
              <button type="button" onClick={handleRefresh} disabled={refreshing}
                className="font-mono text-xs transition-opacity hover:opacity-70 disabled:opacity-40"
                style={{ color: "#A6A6A6" }}>
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
        /* ABA JOGOS */
        <div className="flex-1 flex flex-col">
          {/* Calendário horizontal */}
          <div
            className="border-b px-8 py-4"
            style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}
          >
            <div className="flex gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {calendarDays.map(day => {
                const isSelected = toDateStr(day) === toDateStr(selectedDate);
                const isTodayDay = toDateStr(day) === toDateStr(today);
                return (
                  <button
                    key={toDateStr(day)}
                    type="button"
                    onClick={() => setSelectedDate(day)}
                    className="flex shrink-0 flex-col items-center gap-1 rounded-lg px-3 py-2 transition-all"
                    style={{
                      backgroundColor: isSelected ? "var(--color-brand)" : "transparent",
                      minWidth: "52px",
                    }}
                  >
                    <span
                      className="font-mono text-xs"
                      style={{ color: isSelected ? "var(--color-background)" : "#A6A6A6" }}
                    >
                      {DAYS_SHORT[day.getDay()].toUpperCase()}
                    </span>
                    <span
                      className="font-display text-lg font-bold"
                      style={{ color: isSelected ? "var(--color-background)" : isTodayDay ? "var(--color-brand)" : "var(--color-text-primary)" }}
                    >
                      {day.getDate()}
                    </span>
                    <span
                      className="font-mono text-xs"
                      style={{ color: isSelected ? "var(--color-background)" : "#555" }}
                    >
                      {MONTHS_SHORT[day.getMonth()]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lista de partidas */}
          <div className="flex-1 overflow-y-auto px-8 py-6">
            {loadingMatches ? (
              <div className="flex items-center justify-center py-16">
                <p className="font-mono text-sm" style={{ color: "#A6A6A6" }}>Carregando...</p>
              </div>
            ) : Object.keys(matchesByCompetition).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-6 opacity-20">
                  <Calendar size={64} strokeWidth={1} style={{ color: "var(--color-text-primary)" }} />
                </div>
                <p className="font-display text-xl" style={{ color: "var(--color-text-primary)" }}>
                  Sem partidas
                </p>
                <p className="mt-2 font-mono text-sm" style={{ color: "#A6A6A6" }}>
                  Nenhuma partida agendada para {day => day}{selectedDate.getDate()} de {MONTHS[selectedDate.getMonth()].toLowerCase()}.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.values(matchesByCompetition).map(group => (
                  <div key={group.compName}>
                    {/* Header da competição */}
                    <div className="mb-3 flex items-center gap-3">
                      {group.compLogo ? (
                        <img src={group.compLogo} alt="" className="h-6 w-6 rounded object-contain" />
                      ) : (
                        <div className="h-6 w-6 rounded" style={{ backgroundColor: "var(--color-border)" }} />
                      )}
                      <p className="font-mono text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                        {group.compName.toUpperCase()}
                      </p>
                      <span className="font-mono text-xs" style={{ color: "#555" }}>
                        {group.matches.length} {group.matches.length === 1 ? "partida" : "partidas"}
                      </span>
                    </div>

                    {/* Partidas da competição */}
                    <div
                      className="rounded-xl border overflow-hidden"
                      style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}
                    >
                      {group.matches.map((m, idx) => (
                        <Link
                          key={m.id}
                          href={`/partidas/${m.id}`}
                          className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[rgba(255,255,255,0.03)]"
                          style={{
                            borderTop: idx > 0 ? `1px solid var(--color-border)` : "none",
                          }}
                        >
                          {/* Status e hora */}
                          <div className="w-14 shrink-0 text-center">
                            <p
                              className="font-mono text-xs font-bold"
                              style={{ color: STATUS_COLOR[m.status] ?? "#A6A6A6" }}
                            >
                              {STATUS_LABEL[m.status] ?? m.status.toUpperCase()}
                            </p>
                            {m.match_time && m.status === "scheduled" && (
                              <p className="font-mono text-xs" style={{ color: "#555" }}>
                                {m.match_time.slice(0, 5)}
                              </p>
                            )}
                          </div>

                          {/* Equipes e placar */}
                          <div className="flex flex-1 flex-col gap-1.5">
                            {/* Time A */}
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 min-w-0">
                                {m.teams_a?.logo_url ? (
                                  <img src={m.teams_a.logo_url} alt="" className="h-5 w-5 rounded object-contain shrink-0" />
                                ) : (
                                  <div className="h-5 w-5 shrink-0 rounded" style={{ backgroundColor: "var(--color-border)" }} />
                                )}
                                <span className="truncate text-sm" style={{
                                  color: m.status === "finished" && m.score_a > m.score_b
                                    ? "var(--color-text-primary)"
                                    : m.status === "finished"
                                    ? "#A6A6A6"
                                    : "var(--color-text-primary)",
                                  fontWeight: m.status === "finished" && m.score_a > m.score_b ? 600 : 400,
                                }}>
                                  {m.teams_a?.full_name ?? "A definir"}
                                </span>
                              </div>
                              <span
                                className="font-display text-lg font-bold shrink-0"
                                style={{ color: m.status === "scheduled" ? "#555" : "var(--color-text-primary)" }}
                              >
                                {m.status === "scheduled" ? "-" : m.score_a}
                              </span>
                            </div>

                            {/* Time B */}
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 min-w-0">
                                {m.teams_b?.logo_url ? (
                                  <img src={m.teams_b.logo_url} alt="" className="h-5 w-5 rounded object-contain shrink-0" />
                                ) : (
                                  <div className="h-5 w-5 shrink-0 rounded" style={{ backgroundColor: "var(--color-border)" }} />
                                )}
                                <span className="truncate text-sm" style={{
                                  color: m.status === "finished" && m.score_b > m.score_a
                                    ? "var(--color-text-primary)"
                                    : m.status === "finished"
                                    ? "#A6A6A6"
                                    : "var(--color-text-primary)",
                                  fontWeight: m.status === "finished" && m.score_b > m.score_a ? 600 : 400,
                                }}>
                                  {m.teams_b?.full_name ?? "A definir"}
                                </span>
                              </div>
                              <span
                                className="font-display text-lg font-bold shrink-0"
                                style={{ color: m.status === "scheduled" ? "#555" : "var(--color-text-primary)" }}
                              >
                                {m.status === "scheduled" ? "-" : m.score_b}
                              </span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
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

function StatCard({ label, value, href }: { label: string; value: number | string; href: string }) {
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
      <p className="font-display text-4xl font-bold" style={{ color: "var(--color-text-primary)" }}>
        {value}
      </p>
      <div className="mt-3 flex items-center justify-between">
        <p className="font-mono text-xs" style={{ color: hovered ? "var(--color-brand)" : "var(--color-text-secondary)" }}>
          {label}
        </p>
        <span className="font-mono text-xs" style={{ color: hovered ? "var(--color-brand)" : "var(--color-text-secondary)" }}>
          ›››
        </span>
      </div>
    </Link>
  );
}