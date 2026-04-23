"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { toast } from "@/app/(lab)/components/toast";
import Breadcrumb from "@/app/(lab)/components/breadcrumb";
import Link from "next/link";
import { ChevronDown, Plus, ChevronRight } from "lucide-react";
import { criarEdicao, editarEdicao } from "./edicoes/actions";

type Competition = any;
type Edition = { id: string; season_id: string; status: string; season_name: string; year_value: number };
type Season = { id: string; name: string; year_value: number };
type Team = { id: string; full_name: string; abbreviation: string | null; logo_url: string | null };

type Match = {
  id: string;
  match_date: string | null;
  match_time: string | null;
  status: string;
  score_a: number;
  score_b: number;
  teams_a: { full_name: string; abbreviation: string | null; logo_url: string | null } | null;
  teams_b: { full_name: string; abbreviation: string | null; logo_url: string | null } | null;
  rounds: { name: string; custom_label: string | null } | null;
  phases: { full_name: string; custom_label: string | null } | null;
};

type Phase = {
  id: string;
  full_name: string;
  custom_label: string | null;
  phase_type: string;
  display_order: number;
  is_current: boolean;
};

type EditionTeam = {
  id: string;
  team_id: string;
  arrival_origin: string | null;
  teams: Team | null;
};

type Standing = any;
type Scorer = any;

const STATUS_LABEL: Record<string, string> = {
  scheduled: "AG", ongoing: "AO VIVO", finished: "FT", postponed: "AD",
};
const STATUS_COLOR: Record<string, string> = {
  scheduled: "#A6A6A6", ongoing: "#BFF205", finished: "#A6A6A6", postponed: "#FF4444",
};
const PHASE_TYPE_LABEL: Record<string, string> = {
  round_robin: "Pontos Corridos", group_stage: "Fase de Grupos",
  knockout: "Mata-mata", conference: "Conferência",
};

export default function CompeticaoHub({
  competition,
  editions,
  seasons,
  allTeams,
  orgId,
}: {
  competition: Competition;
  editions: Edition[];
  seasons: Season[];
  allTeams: Team[];
  orgId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<"jogos" | "competicao" | "classificacao" | "artilharia" | "configuracoes">("jogos");
  const [selectedEditionId, setSelectedEditionId] = useState<string>(
    searchParams.get("edicao") ?? editions[0]?.id ?? ""
  );
  const [showEditionDropdown, setShowEditionDropdown] = useState(false);

  // Dados carregados dinamicamente
  const [matches, setMatches] = useState<Match[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [editionTeams, setEditionTeams] = useState<EditionTeam[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [scorers, setScorers] = useState<Scorer[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [loadingPhases, setLoadingPhases] = useState(false);

  // Estados de formulário
  const [showNewEdition, setShowNewEdition] = useState(false);
  const [newEditionSeasonId, setNewEditionSeasonId] = useState("");
  const [savingEdition, setSavingEdition] = useState(false);

  const selectedEdition = editions.find(e => e.id === selectedEditionId);

  const inputClass = "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]";
  const inputStyle = { borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" };

  // Carrega dados da edição selecionada
  const loadEditionData = useCallback(async (editionId: string) => {
    if (!editionId) return;
    const supabase = createClient();

    setLoadingMatches(true);
    setLoadingPhases(true);

    const [
      { data: matchesData },
      { data: phasesData },
      { data: teamsData },
      { data: standingsData },
      { data: scorersData },
    ] = await Promise.all([
      supabase.from("matches")
        .select("id, match_date, match_time, status, score_a, score_b, teams_a:teams!matches_team_a_id_fkey(full_name, abbreviation, logo_url), teams_b:teams!matches_team_b_id_fkey(full_name, abbreviation, logo_url), rounds(name, custom_label), phases(full_name, custom_label)")
        .in("phase_id", await getPhaseIds(supabase, editionId))
        .order("match_date", { ascending: false }),
      supabase.from("phases")
        .select("id, full_name, custom_label, phase_type, display_order, is_current")
        .eq("edition_id", editionId).order("display_order"),
      supabase.from("edition_teams")
        .select("id, team_id, arrival_origin, teams(id, full_name, abbreviation, logo_url)")
        .eq("edition_id", editionId).order("display_order"),
      supabase.from("team_edition_stats")
        .select("*, teams(id, full_name, abbreviation, logo_url, primary_color)")
        .eq("edition_id", editionId)
        .order("points", { ascending: false })
        .order("goals_scored", { ascending: false }),
      supabase.from("athlete_edition_stats")
        .select("*, athletes(id, full_name, surname, photo_url), team:teams(id, full_name, abbreviation)")
        .eq("edition_id", editionId)
        .gt("goals", 0)
        .order("goals", { ascending: false })
        .limit(15),
    ]);

    setMatches((matchesData as any) ?? []);
    setPhases((phasesData as any) ?? []);
    setEditionTeams((teamsData as any) ?? []);
    setStandings(standingsData ?? []);
    setScorers(scorersData ?? []);
    setLoadingMatches(false);
    setLoadingPhases(false);
  }, []);

  useEffect(() => {
    if (selectedEditionId) {
      loadEditionData(selectedEditionId);
    }
  }, [selectedEditionId, loadEditionData]);

  async function getPhaseIds(supabase: any, editionId: string): Promise<string[]> {
    const { data } = await supabase.from("phases").select("id").eq("edition_id", editionId);
    return (data ?? []).map((p: any) => p.id);
  }

  async function handleCreateEdition() {
    if (!newEditionSeasonId) return;
    setSavingEdition(true);
    const fd = new FormData();
    fd.append("season_id", newEditionSeasonId);
    const result = await criarEdicao(competition.id, fd);
    setSavingEdition(false);
    if ("error" in result) { toast("error", result.error); return; }
    toast("success", "Edição criada com sucesso.");
    setShowNewEdition(false);
    setSelectedEditionId(result.id);
    router.refresh();
  }

  // Agrupa partidas por rodada/fase
  const matchesByRound: Record<string, { label: string; matches: Match[] }> = {};
  matches.forEach(m => {
    const key = m.rounds?.custom_label ?? m.rounds?.name ?? m.phases?.custom_label ?? m.phases?.full_name ?? "Sem rodada";
    if (!matchesByRound[key]) matchesByRound[key] = { label: key, matches: [] };
    matchesByRound[key].matches.push(m);
  });

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "var(--color-background)" }}>
      {/* Header da competição */}
      <div className="border-b" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
        <div className="px-8 pt-6 pb-0">
          <Breadcrumb items={[{ label: "Competições", href: "/competicoes" }, { label: competition.full_name ?? "Competição" }]} />

          {/* Identidade + seletor de edição */}
          <div className="mb-4 flex items-center gap-4">
            {competition.logo_url ? (
              <img src={competition.logo_url} alt="" className="h-14 w-14 rounded-xl border object-contain shrink-0"
                style={{ borderColor: "var(--color-border)" }} />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border font-display text-lg font-bold"
                style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" }}>
                {competition.full_name?.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
                {competition.full_name}
              </h1>
              {/* Seletor de edição */}
              <div className="relative mt-1 inline-block">
                <button
                  type="button"
                  onClick={() => setShowEditionDropdown(v => !v)}
                  className="flex items-center gap-1.5 rounded-lg border px-3 py-1 text-sm"
                  style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" }}
                >
                  {selectedEdition?.season_name ?? "Selecionar edição"}
                  <ChevronDown size={14} />
                </button>
                {showEditionDropdown && (
                  <div className="absolute left-0 top-9 z-50 min-w-[180px] rounded-xl border shadow-lg"
                    style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
                    {editions.map(e => (
                      <button key={e.id} type="button"
                        onClick={() => { setSelectedEditionId(e.id); setShowEditionDropdown(false); }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-[rgba(255,255,255,0.05)]"
                        style={{ color: e.id === selectedEditionId ? "var(--color-brand)" : "var(--color-text-primary)" }}>
                        {e.season_name}
                        {e.id === selectedEditionId && <span className="ml-auto text-xs" style={{ color: "var(--color-brand)" }}>✓</span>}
                      </button>
                    ))}
                    <div className="border-t" style={{ borderColor: "var(--color-border)" }}>
                      <button type="button"
                        onClick={() => { setShowEditionDropdown(false); setShowNewEdition(true); }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm"
                        style={{ color: "var(--color-brand)" }}>
                        <Plus size={13} /> Nova edição
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Abas */}
          <div className="flex gap-6">
            {[
              { key: "jogos", label: "JOGOS" },
              { key: "competicao", label: "COMPETIÇÃO" },
              { key: "classificacao", label: "CLASSIFICAÇÃO" },
              { key: "artilharia", label: "ARTILHARIA" },
              { key: "configuracoes", label: "CONFIGURAÇÕES" },
            ].map(tab => (
              <button key={tab.key} type="button"
                onClick={() => setActiveTab(tab.key as any)}
                className="border-b-2 pb-3 font-mono text-xs transition-colors"
                style={{
                  borderColor: activeTab === tab.key ? "var(--color-brand)" : "transparent",
                  color: activeTab === tab.key ? "var(--color-brand)" : "#A6A6A6",
                }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Modal nova edição */}
      {showNewEdition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55">
          <div className="w-full max-w-sm rounded-xl border p-6"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            <h2 className="mb-4 font-display text-lg" style={{ color: "var(--color-text-primary)" }}>Nova edição</h2>
            <label className="flex flex-col gap-1 mb-4">
              <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Temporada</span>
              <select value={newEditionSeasonId} onChange={e => setNewEditionSeasonId(e.target.value)} className={inputClass} style={inputStyle}>
                <option value="">Selecione…</option>
                {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowNewEdition(false)}
                className="rounded-lg border px-4 py-2 text-sm"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                Cancelar
              </button>
              <button type="button" onClick={handleCreateEdition} disabled={savingEdition || !newEditionSeasonId}
                className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
                {savingEdition ? "Criando…" : "Criar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo das abas */}
      <div className="flex-1 px-8 py-6">

        {/* ABA JOGOS */}
        {activeTab === "jogos" && (
          <div>
            {loadingMatches ? (
              <p className="font-mono text-sm" style={{ color: "#A6A6A6" }}>Carregando…</p>
            ) : matches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="font-display text-xl" style={{ color: "var(--color-text-primary)" }}>Sem partidas</p>
                <p className="mt-2 font-mono text-sm" style={{ color: "#A6A6A6" }}>Nenhuma partida registrada nesta edição.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.values(matchesByRound).map(group => (
                  <div key={group.label}>
                    <p className="mb-3 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
                      {group.label}
                    </p>
                    <div className="rounded-xl border overflow-hidden"
                      style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
                      {group.matches.map((m, idx) => (
                        <Link key={m.id} href={`/partidas/${m.id}`}
                          className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[rgba(255,255,255,0.03)]"
                          style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none" }}>
                          <div className="w-14 shrink-0 text-center">
                            <p className="font-mono text-xs font-bold" style={{ color: STATUS_COLOR[m.status] ?? "#A6A6A6" }}>
                              {STATUS_LABEL[m.status] ?? m.status.toUpperCase()}
                            </p>
                            {m.match_date && (
                              <p className="font-mono text-xs" style={{ color: "#555" }}>
                                {new Date(m.match_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-1 flex-col gap-1.5">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 min-w-0">
                                {m.teams_a?.logo_url ? (
                                  <img src={m.teams_a.logo_url} alt="" className="h-5 w-5 rounded object-contain shrink-0" />
                                ) : (
                                  <div className="h-5 w-5 shrink-0 rounded" style={{ backgroundColor: "var(--color-border)" }} />
                                )}
                                <span className="truncate text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                                  {m.teams_a?.full_name ?? "A definir"}
                                </span>
                              </div>
                              <span className="font-display text-lg font-bold shrink-0"
                                style={{ color: m.status === "scheduled" ? "#555" : "var(--color-text-primary)" }}>
                                {m.status === "scheduled" ? "-" : m.score_a}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 min-w-0">
                                {m.teams_b?.logo_url ? (
                                  <img src={m.teams_b.logo_url} alt="" className="h-5 w-5 rounded object-contain shrink-0" />
                                ) : (
                                  <div className="h-5 w-5 shrink-0 rounded" style={{ backgroundColor: "var(--color-border)" }} />
                                )}
                                <span className="truncate text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                                  {m.teams_b?.full_name ?? "A definir"}
                                </span>
                              </div>
                              <span className="font-display text-lg font-bold shrink-0"
                                style={{ color: m.status === "scheduled" ? "#555" : "var(--color-text-primary)" }}>
                                {m.status === "scheduled" ? "-" : m.score_b}
                              </span>
                            </div>
                          </div>
                          <ChevronRight size={16} style={{ color: "#555" }} />
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ABA COMPETIÇÃO */}
        {activeTab === "competicao" && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Equipes */}
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
                <h2 className="font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
                  Equipes ({editionTeams.length})
                </h2>
              </div>
              {editionTeams.length === 0 ? (
                <p className="px-5 py-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>Nenhuma equipe adicionada.</p>
              ) : (
                editionTeams.map((et, idx) => (
                  <div key={et.id} className="flex items-center gap-3 px-5 py-3"
                    style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none" }}>
                    {et.teams?.logo_url ? (
                      <img src={et.teams.logo_url} alt="" className="h-8 w-8 rounded object-contain shrink-0" />
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border text-xs font-bold"
                        style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                        {et.teams?.abbreviation?.slice(0, 2) ?? "?"}
                      </div>
                    )}
                    <span className="flex-1 text-sm" style={{ color: "var(--color-text-primary)" }}>
                      {et.teams?.full_name ?? "—"}
                    </span>
                    {et.arrival_origin && (
                      <span className="font-mono text-xs rounded px-2 py-0.5"
                        style={{ backgroundColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                        {et.arrival_origin}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Fases */}
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
                <h2 className="font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
                  Fases ({phases.length})
                </h2>
                <Link
                  href={`/competicoes/${competition.id}/edicoes/${selectedEditionId}/fases/nova`}
                  className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-brand)" }}>
                  <Plus size={12} /> Nova fase
                </Link>
              </div>
              {phases.length === 0 ? (
                <p className="px-5 py-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>Nenhuma fase criada.</p>
              ) : (
                phases.map((phase, idx) => (
                  <Link key={phase.id}
                    href={`/competicoes/${competition.id}/edicoes/${selectedEditionId}/fases/${phase.id}`}
                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-[rgba(255,255,255,0.03)]"
                    style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none" }}>
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                        {phase.custom_label ?? phase.full_name}
                      </p>
                      <p className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                        {PHASE_TYPE_LABEL[phase.phase_type] ?? phase.phase_type}
                      </p>
                    </div>
                    {phase.is_current && (
                      <span className="font-mono text-xs rounded px-2 py-0.5"
                        style={{ backgroundColor: "rgba(191,242,5,0.15)", color: "var(--color-brand)" }}>
                        atual
                      </span>
                    )}
                    <ChevronRight size={14} style={{ color: "#555" }} />
                  </Link>
                ))
              )}
            </div>
          </div>
        )}

        {/* ABA CLASSIFICAÇÃO */}
        {activeTab === "classificacao" && (
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
            {standings.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm" style={{ color: "var(--color-text-secondary)" }}>
                Nenhum dado de classificação disponível.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                      {["#", "Equipe", "J", "V", "E", "D", "GP", "GC", "SG", "PTS"].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-mono text-xs"
                          style={{ color: "var(--color-text-secondary)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((row: any, idx: number) => (
                      <tr key={row.team_id}
                        style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none" }}
                        className="hover:bg-[rgba(255,255,255,0.02)]">
                        <td className="px-4 py-3 font-mono text-xs"
                          style={{ color: idx < 4 ? "var(--color-brand)" : "var(--color-text-secondary)" }}>
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {row.teams?.logo_url ? (
                              <img src={row.teams.logo_url} alt="" className="h-5 w-5 rounded object-contain" />
                            ) : (
                              <div className="h-5 w-5 rounded" style={{ backgroundColor: "var(--color-border)" }} />
                            )}
                            <span className="font-medium text-xs" style={{ color: "var(--color-text-primary)" }}>
                              {row.teams?.abbreviation ?? row.teams?.full_name ?? "—"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>{row.matches_played ?? 0}</td>
                        <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>{row.wins ?? 0}</td>
                        <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>{row.draws ?? 0}</td>
                        <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>{row.losses ?? 0}</td>
                        <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>{row.goals_scored ?? 0}</td>
                        <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>{row.goals_conceded ?? 0}</td>
                        <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                          {((row.goals_scored ?? 0) - (row.goals_conceded ?? 0)) > 0 ? "+" : ""}
                          {(row.goals_scored ?? 0) - (row.goals_conceded ?? 0)}
                        </td>
                        <td className="px-4 py-3 font-mono text-sm font-bold" style={{ color: "var(--color-brand)" }}>
                          {row.points ?? 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ABA ARTILHARIA */}
        {activeTab === "artilharia" && (
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
            {scorers.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm" style={{ color: "var(--color-text-secondary)" }}>
                Nenhum gol registrado nesta edição.
              </p>
            ) : (
              scorers.map((scorer: any, idx: number) => (
                <div key={scorer.athlete_id}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-[rgba(255,255,255,0.02)]"
                  style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none" }}>
                  <span className="w-6 font-mono text-xs text-right shrink-0"
                    style={{ color: idx < 3 ? "var(--color-brand)" : "var(--color-text-secondary)" }}>
                    {idx + 1}
                  </span>
                  {scorer.athletes?.photo_url ? (
                    <img src={scorer.athletes.photo_url} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                      style={{ backgroundColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                      {(scorer.athletes?.surname ?? scorer.athletes?.full_name ?? "?").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" style={{ color: "var(--color-text-primary)" }}>
                      {scorer.athletes?.surname ?? scorer.athletes?.full_name ?? "—"}
                    </p>
                    {scorer.team?.full_name && (
                      <p className="text-xs truncate" style={{ color: "var(--color-text-secondary)" }}>
                        {scorer.team.abbreviation ?? scorer.team.full_name}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-6 shrink-0">
                    <div className="text-center">
                      <p className="font-display text-xl font-bold" style={{ color: "var(--color-brand)" }}>{scorer.goals ?? 0}</p>
                      <p className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>gols</p>
                    </div>
                    {(scorer.assists ?? 0) > 0 && (
                      <div className="text-center">
                        <p className="font-display text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>{scorer.assists}</p>
                        <p className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>assist.</p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ABA CONFIGURAÇÕES DA EDIÇÃO */}
        {activeTab === "configuracoes" && (
          <EdicaoConfigTab
            selectedEditionId={selectedEditionId}
            selectedEditionName={selectedEdition?.season_name ?? ""}
          />
        )}
      </div>
    </div>
  );
}

// Aba de configurações — mantém o formulário de edição existente
function EdicaoConfigTab({ selectedEditionId, selectedEditionName }: { selectedEditionId: string; selectedEditionName: string }) {
  const [editionStatus, setEditionStatus] = useState("planned");
  const [isPublic, setIsPublic] = useState(false);
  const [minAthletes, setMinAthletes] = useState("");
  const [maxAthletes, setMaxAthletes] = useState("");
  const [yellowThreshold, setYellowThreshold] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const inputClass = "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]";
  const inputStyle = { borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" };

  useEffect(() => {
    if (!selectedEditionId) return;
    async function load() {
      const supabase = createClient();
      const [{ data: ed }, { data: settings }] = await Promise.all([
        supabase.from("competition_editions").select("status").eq("id", selectedEditionId).maybeSingle(),
        supabase.from("edition_settings").select("*").eq("edition_id", selectedEditionId).maybeSingle(),
      ]);
      setEditionStatus(ed?.status ?? "planned");
      setIsPublic(settings?.is_public ?? false);
      setMinAthletes(String(settings?.min_athletes ?? ""));
      setMaxAthletes(String(settings?.max_athletes ?? ""));
      setYellowThreshold(String(settings?.yellow_card_suspension_threshold ?? ""));
      setLoaded(true);
    }
    void load();
  }, [selectedEditionId]);

  async function handleSave() {
    setSaving(true);
    const fd = new FormData();
    fd.append("status", editionStatus);
    fd.append("is_public", String(isPublic));
    fd.append("min_athletes", minAthletes);
    fd.append("max_athletes", maxAthletes);
    fd.append("yellow_card_threshold", yellowThreshold);
    const result = await editarEdicao(selectedEditionId, fd);
    setSaving(false);
    if ("error" in result) { toast("error", result.error); return; }
    toast("success", "Configurações salvas.");
  }

  if (!loaded) return <p className="font-mono text-sm" style={{ color: "#A6A6A6" }}>Carregando…</p>;

  return (
    <div className="max-w-xl space-y-6">
      <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
        <h2 className="mb-1 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
          Configurações da edição
        </h2>
        <p className="mb-4 font-mono text-xs" style={{ color: "var(--color-brand)" }}>{selectedEditionName}</p>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Status</span>
            <select value={editionStatus} onChange={e => setEditionStatus(e.target.value)} className={inputClass} style={inputStyle}>
              <option value="planned">Planejada</option>
              <option value="ongoing">Em andamento</option>
              <option value="finished">Finalizada</option>
              <option value="cancelled">Cancelada</option>
            </select>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} className="h-4 w-4" />
            <span className="text-sm" style={{ color: "var(--color-text-primary)" }}>Visível no 06.score</span>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Mínimo de atletas por equipe</span>
            <input type="number" value={minAthletes} onChange={e => setMinAthletes(e.target.value)} className={inputClass} style={inputStyle} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Máximo de atletas por equipe</span>
            <input type="number" value={maxAthletes} onChange={e => setMaxAthletes(e.target.value)} className={inputClass} style={inputStyle} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Limite de amarelos para suspensão</span>
            <input type="number" value={yellowThreshold} onChange={e => setYellowThreshold(e.target.value)} className={inputClass} style={inputStyle} />
          </label>
        </div>
      </div>
      <button type="button" onClick={handleSave} disabled={saving}
        className="rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-50"
        style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
        {saving ? "Salvando…" : "Salvar configurações"}
      </button>
    </div>
  );
}