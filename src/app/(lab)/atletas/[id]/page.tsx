/// ATLETAS / ID / PAGE

"use client";

import { createClient } from "@/lib/supabase";
import Breadcrumb from "@/app/(lab)/components/breadcrumb";
import { toast } from "@/app/(lab)/components/toast";
import { LabSelect } from "@/app/(lab)/components/lab-select";
import { editarAtleta, vincularAtleta, adicionarStint, removerStint, editarStint, toggleStintAtivo } from "../actions";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";

type AthleteRow = {
  id: string;
  organization_id: string;
  full_name: string;
  surname: string | null;
  gender: string | null;
  photo_url: string | null;
  position_id: string | null;
  rg: string | null;
  cpf: string | null;
  birth_date: string | null;
};

type Position = { id: string; full_name: string; abbreviation: string };
type Team = { id: string; full_name: string; logo_url?: string | null; primary_color?: string | null };
type StintHistory = {
  id: string;
  team_id: string;
  started_at: string;
  ended_at: string | null;
  is_current: boolean;
  is_active: boolean;
  movement_type: string | null;
  teams: { id: string; full_name: string; abbreviation: string | null; logo_url: string | null; primary_color?: string | null } | null;
};
type EditionStat = {
  edition_id: string;
  team_id: string | null;
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
  matches_played: number;
  motm_count: number;
  competition_editions: {
    seasons: { name: string; years: { value: number } | null } | null;
    competitions: { full_name: string; short_name: string | null } | null;
  } | null;
};
type Award = {
  id: string;
  award_type: string;
  edition_id: string;
  competition_editions: {
    seasons: { name: string } | null;
    competitions: { full_name: string; short_name: string | null } | null;
  } | null;
};
type RosterEntry = {
  id: string;
  edition_team_id: string;
  status: string;
  submitted_at: string;
  edition_teams: {
    edition_id: string;
    teams: { logo_url: string | null; full_name: string; abbreviation: string | null } | null;
    competition_editions: {
      seasons: { name: string } | null;
      competitions: { full_name: string; short_name: string | null } | null;
    } | null;
  } | null;
};

const MOVEMENT_LABELS: Record<string, string> = {
  arrival: "Chegada", transfer: "Transferência", loan: "Empréstimo", departure: "Saída",
};
const MOVEMENT_COLORS: Record<string, string> = {
  arrival: "#BFF205", transfer: "#A6A6A6", loan: "#F2C005", departure: "#FF4444",
};
const AWARD_LABELS: Record<string, string> = {
  top_scorer: "Artilheiro", top_assists: "Garçom", mvp: "MVP",
  best_goalkeeper: "Melhor Goleiro", best_coach: "Melhor Técnico",
  revelation: "Revelação", best_defense: "Melhor Defesa",
  best_performance: "Melhor Desempenho", champion: "Campeão",
  runner_up: "Vice-campeão", third_place: "Terceiro Lugar",
};
const AWARD_ICONS: Record<string, string> = {
  top_scorer: "⚽", top_assists: "🎯", mvp: "⭐", best_goalkeeper: "🧤",
  best_coach: "📋", champion: "🏆", runner_up: "🥈", third_place: "🥉",
  revelation: "🌟", best_defense: "🛡️", best_performance: "💪",
};

function formatDateToBR(iso: string | null): string {
  if (!iso) return "";
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}
function applyDateMask(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}
function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
}
function parseDateToISO(br: string): string | null {
  const clean = br.replace(/\D/g, "");
  if (clean.length !== 8) return null;
  return `${clean.slice(4, 8)}-${clean.slice(2, 4)}-${clean.slice(0, 2)}`;
}

function SectionHeader({ title, color }: { title: string; color?: string | null }) {
  const c = color ?? "#BFF205";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase" as const, color: c }}>
        {title}
      </span>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, ${c}44, transparent)` }} />
    </div>
  );
}

export default function AtletaPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<"informacoes" | "historico" | "estatisticas">("informacoes");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [positions, setPositions] = useState<Position[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [stintHistory, setStintHistory] = useState<StintHistory[]>([]);
  const [editionStats, setEditionStats] = useState<EditionStat[]>([]);
  const [awards, setAwards] = useState<Award[]>([]);
  const [rosterEntries, setRosterEntries] = useState<RosterEntry[]>([]);

  const [fullName, setFullName] = useState("");
  const [surname, setSurname] = useState("");
  const [gender, setGender] = useState("");
  const [positionId, setPositionId] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [rg, setRg] = useState("");
  const [cpf, setCpf] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [currentTeam, setCurrentTeam] = useState<{ name: string; logo: string | null; color: string | null } | null>(null);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferTeamId, setTransferTeamId] = useState("");
  const [transferring, setTransferring] = useState(false);

  const [editingStintId, setEditingStintId] = useState<string | null>(null);
  const [editStintMovement, setEditStintMovement] = useState("");
  const [editStintStarted, setEditStintStarted] = useState("");
  const [editStintEnded, setEditStintEnded] = useState("");
  const [savingStint, setSavingStint] = useState(false);

  const [showAddStint, setShowAddStint] = useState(false);
  const [addStintTeamId, setAddStintTeamId] = useState("");
  const [addStintMovement, setAddStintMovement] = useState("arrival");
  const [addStintStarted, setAddStintStarted] = useState("");
  const [addStintEnded, setAddStintEnded] = useState("");
  const [addingStint, setAddingStint] = useState(false);

  const [tournamentSearch, setTournamentSearch] = useState("");

  // ── Filtros de estatísticas ──────────────────────────────────────────
  const [filterTeamId, setFilterTeamId] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterSeason, setFilterSeason] = useState("");
  const [filterCompetition, setFilterCompetition] = useState("");

  const load = useCallback(async () => {
    if (!id) { setLoadError("ID inválido."); setLoading(false); return; }
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data: profile } = await supabase.from("user_profiles").select("organization_id").eq("auth_user_id", user.id).maybeSingle();
    if (!profile?.organization_id) { setLoadError("Organização não encontrada."); setLoading(false); return; }

    const [
      { data: athlete, error: athleteErr },
      { data: posData },
      { data: teamsData },
      { data: currentStintData },
      { data: historyData },
      { data: statsData },
      { data: awardsData },
      { data: rosterData },
    ] = await Promise.all([
      supabase.from("athletes").select("*").eq("id", id).maybeSingle(),
      supabase.from("player_positions").select("id, full_name, abbreviation").eq("sport_slug", "football7").order("display_order"),
      supabase.from("teams").select("id, full_name, logo_url, primary_color").eq("organization_id", profile.organization_id).order("full_name"),
      supabase.from("athlete_team_stints").select("id, team_id, teams(id, full_name, logo_url, primary_color)").eq("athlete_id", id).eq("is_current", true).maybeSingle(),
      supabase.from("athlete_team_stints").select("id, team_id, started_at, ended_at, is_current, is_active, movement_type, teams(id, full_name, abbreviation, logo_url, primary_color)").eq("athlete_id", id).order("started_at", { ascending: false }),
      // team_id e years(value) adicionados para suportar os filtros
      supabase.from("athlete_edition_stats").select("edition_id, team_id, goals, assists, yellow_cards, red_cards, matches_played, motm_count, competition_editions(seasons(name, years(value)), competitions(full_name, short_name))").eq("athlete_id", id).order("edition_id", { ascending: false }),
      supabase.from("edition_awards").select("id, award_type, edition_id, competition_editions(seasons(name), competitions(full_name, short_name))").eq("athlete_id", id).order("edition_id", { ascending: false }),
      supabase.from("edition_roster_entries").select("id, edition_team_id, status, submitted_at, edition_teams(edition_id, teams(logo_url, full_name, abbreviation), competition_editions(seasons(name), competitions(full_name, short_name)))").eq("athlete_id", id).eq("member_type", "athlete").order("submitted_at", { ascending: true }),
    ]);

    if (athleteErr || !athlete) { setLoadError("Atleta não encontrado."); setLoading(false); return; }
    const a = athlete as AthleteRow;
    setFullName(a.full_name ?? "");
    setSurname(a.surname ?? "");
    setGender(a.gender ?? "");
    setPositionId(a.position_id ?? "");
    setBirthDate(formatDateToBR(a.birth_date));
    setRg(a.rg ?? "");
    setCpf(a.cpf ?? "");
    setPhotoUrl(a.photo_url);
    setPositions((posData ?? []) as Position[]);
    setTeams((teamsData ?? []) as Team[]);
    const cs = currentStintData as any;
    setCurrentTeam(cs?.teams ? { name: cs.teams.full_name, logo: cs.teams.logo_url ?? null, color: cs.teams.primary_color ?? null } : null);
    setStintHistory((historyData ?? []) as StintHistory[]);
    setEditionStats((statsData ?? []) as EditionStat[]);
    setAwards((awardsData ?? []) as Award[]);
    setRosterEntries((rosterData ?? []) as RosterEntry[]);
    setLoading(false);
  }, [id, router]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPendingPhoto(f);
    setPreviewUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(f); });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      const fd = new FormData();
      fd.append("full_name", fullName.trim());
      fd.append("surname", surname.trim());
      fd.append("gender", gender);
      fd.append("position_id", positionId);
      fd.append("birth_date", birthDate);
      fd.append("rg", rg);
      fd.append("cpf", cpf);
      if (pendingPhoto) fd.append("photo", pendingPhoto);
      const result = await editarAtleta(id, fd);
      if ("error" in result) { toast("error", result.error); return; }
      toast("success", "Alterações salvas.");
      setPendingPhoto(null);
      if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
      await load();
    } finally { setSaving(false); }
  }

  async function handleVincular() {
    if (!transferTeamId) return;
    setTransferring(true);
    const result = await vincularAtleta(id, transferTeamId);
    setTransferring(false);
    if ("error" in result) { toast("error", result.error); return; }
    toast("success", "Vínculo atualizado.");
    setShowTransfer(false); setTransferTeamId("");
    await load();
  }

  function openEditStint(stint: StintHistory) {
    setEditingStintId(stint.id);
    setEditStintMovement(stint.movement_type ?? "arrival");
    setEditStintStarted(formatDateToBR(stint.started_at));
    setEditStintEnded(formatDateToBR(stint.ended_at));
  }

  async function handleSaveStint(stintId: string) {
    setSavingStint(true);
    const started = parseDateToISO(editStintStarted);
    const ended = editStintEnded ? parseDateToISO(editStintEnded) : null;
    if (!started) { toast("error", "Data de início inválida."); setSavingStint(false); return; }
    const result = await editarStint(stintId, editStintMovement, started, ended);
    setSavingStint(false);
    if ("error" in result) { toast("error", result.error); return; }
    toast("success", "Vínculo atualizado.");
    setEditingStintId(null);
    await load();
  }

  async function handleAddStint() {
    if (!addStintTeamId || !addStintStarted) { toast("error", "Equipe e data de início são obrigatórios."); return; }
    const started = parseDateToISO(addStintStarted);
    if (!started) { toast("error", "Data de início inválida."); return; }
    const ended = addStintEnded ? parseDateToISO(addStintEnded) : null;
    setAddingStint(true);
    const result = await adicionarStint(id, addStintTeamId, addStintMovement, started, ended);
    setAddingStint(false);
    if ("error" in result) { toast("error", result.error); return; }
    toast("success", "Vínculo adicionado.");
    setShowAddStint(false);
    setAddStintTeamId(""); setAddStintMovement("arrival"); setAddStintStarted(""); setAddStintEnded("");
    await load();
  }

  async function handleToggleStintAtivo(stintId: string, currentValue: boolean) {
    const result = await toggleStintAtivo(stintId, !currentValue);
    if ("error" in result) { toast("error", result.error); return; }
    toast("success", !currentValue ? "Passagem exibida." : "Passagem ocultada.");
    await load();
  }

  async function handleRemoveStint(stintId: string) {
    if (!confirm("Remover este vínculo da linha do tempo?")) return;
    const result = await removerStint(stintId);
    if ("error" in result) { toast("error", result.error); return; }
    toast("success", "Vínculo removido.");
    await load();
  }

  const displayPhoto = previewUrl ?? photoUrl;
  const positionAbbr = positions.find(p => p.id === positionId)?.abbreviation ?? null;
  const positionFull = positions.find(p => p.id === positionId)?.full_name ?? null;
  const teamColor = currentTeam?.color ?? null;
  const accentColor = teamColor ?? "#BFF205";
  const border = "1px solid rgba(255,255,255,0.08)";

  const inputBaseStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px",
    backgroundColor: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)", borderRadius: 9,
    fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-text-primary)",
    outline: "none", transition: "border-color 0.15s", colorScheme: "dark" as any,
  };

  // Agrupa por editionId — preserva todas as logos (uma por entry aprovada)
  const tournamentsMap = new Map<string, {
    editionId: string;
    competition: string;
    season: string;
    status: string;
    logos: { logo_url: string | null; full_name: string; abbreviation: string | null }[];
  }>();

  for (const r of rosterEntries) {
    const editionId = r.edition_teams?.edition_id ?? "";
    if (!editionId) continue;
    if (!tournamentsMap.has(editionId)) {
      tournamentsMap.set(editionId, {
        editionId,
        competition: r.edition_teams?.competition_editions?.competitions?.short_name ?? r.edition_teams?.competition_editions?.competitions?.full_name ?? "—",
        season: r.edition_teams?.competition_editions?.seasons?.name ?? "—",
        status: r.status,
        logos: [],
      });
    }
    const entry = tournamentsMap.get(editionId)!;
    // status: se qualquer entry for approved, marca como approved
    if (r.status === "approved") entry.status = "approved";
    // adiciona a logo da equipe desta entry (evita duplicatas de logo_url)
    const teamLogo = r.edition_teams?.teams ?? null;
    if (teamLogo) {
      const alreadyAdded = entry.logos.some(l => l.full_name === teamLogo.full_name);
      if (!alreadyAdded) entry.logos.push(teamLogo);
    }
  }

  const tournaments = Array.from(tournamentsMap.values()).filter(t => {
    if (!tournamentSearch) return true;
    return t.competition.toLowerCase().includes(tournamentSearch.toLowerCase()) || t.season.toLowerCase().includes(tournamentSearch.toLowerCase());
  });

  // ── Opções únicas para os dropdowns de filtro ────────────────────────
  const statsTeamOptions = Array.from(
    new Map(
      editionStats
        .filter(s => s.team_id)
        .map(s => {
          const team = teams.find(t => t.id === s.team_id);
          return [s.team_id!, team?.full_name ?? s.team_id!];
        })
    ).entries()
  ).map(([id, name]) => ({ id, name }));

  const statsYearOptions = Array.from(
    new Set(
      editionStats
        .map(s => s.competition_editions?.seasons?.years?.value)
        .filter((v): v is number => v != null)
    )
  ).sort((a, b) => b - a);

  const statsSeasonOptions = Array.from(
    new Map(
      editionStats
        .filter(s => s.competition_editions?.seasons?.name)
        .map(s => [s.competition_editions!.seasons!.name, s.competition_editions!.seasons!.name])
    ).entries()
  ).map(([value]) => value);

  const statsCompetitionOptions = Array.from(
    new Map(
      editionStats
        .filter(s => s.competition_editions?.competitions?.full_name)
        .map(s => [
          s.competition_editions!.competitions!.full_name,
          s.competition_editions!.competitions!.short_name ?? s.competition_editions!.competitions!.full_name,
        ])
    ).entries()
  ).map(([full, short]) => ({ full, short }));

  // ── Filtragem client-side cumulativa ─────────────────────────────────
  const filteredStats = editionStats.filter(s => {
    if (filterTeamId && s.team_id !== filterTeamId) return false;
    if (filterYear && s.competition_editions?.seasons?.years?.value !== Number(filterYear)) return false;
    if (filterSeason && s.competition_editions?.seasons?.name !== filterSeason) return false;
    if (filterCompetition && s.competition_editions?.competitions?.full_name !== filterCompetition) return false;
    return true;
  });

  const hasActiveFilter = filterTeamId || filterYear || filterSeason || filterCompetition;

  function clearFilters() {
    setFilterTeamId("");
    setFilterYear("");
    setFilterSeason("");
    setFilterCompetition("");
  }

  if (loading) return (
    <div style={{ padding: "48px 32px", fontFamily: "var(--font-mono)", fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
      Carregando…
    </div>
  );
  if (loadError) return (
    <div style={{ padding: "48px 32px", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-text-primary)" }}>
      {loadError}
    </div>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", flexDirection: "column", backgroundColor: "var(--color-background)" }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ borderBottom: "1px solid var(--color-border)", position: "relative", overflow: "hidden" }}>
        {/* Degradê com a cor do time atual */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: teamColor
            ? `linear-gradient(135deg, ${teamColor}22 0%, transparent 55%)`
            : `linear-gradient(135deg, rgba(191,242,5,0.05) 0%, transparent 55%)`,
        }} />
        <div style={{ position: "absolute", inset: 0, backgroundColor: "var(--color-surface)", opacity: 0.88, pointerEvents: "none" }} />

        <div style={{ padding: "20px 32px 0", position: "relative", zIndex: 1 }}>
          <Breadcrumb items={[{ label: "Atletas", href: "/atletas" }, { label: surname || fullName || "Atleta" }]} />

          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
            {/* Foto circular */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div style={{
                width: 60, height: 60, borderRadius: "50%", overflow: "hidden",
                border: `2px solid ${teamColor ? teamColor + "66" : "rgba(255,255,255,0.12)"}`,
                backgroundColor: "rgba(255,255,255,0.06)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {displayPhoto
                  ? <img src={displayPhoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <span style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 800, color: accentColor }}>
                      {initialsFromName(fullName || "?")}
                    </span>
                }
              </div>
              {/* Botão câmera */}
              <button type="button" onClick={() => fileInputRef.current?.click()}
                style={{ position: "absolute", bottom: -2, right: -2, width: 20, height: 20, borderRadius: "50%", backgroundColor: "#BFF205", border: "2px solid var(--color-background)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <Camera size={9} strokeWidth={2.5} color="#0a0a0a" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handlePhotoChange} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Pills */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" as const }}>
                {positionAbbr && (
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", padding: "2px 8px", borderRadius: 20, border: `1px solid ${accentColor}44`, color: accentColor, backgroundColor: `${accentColor}11` }}>
                    {positionAbbr}
                  </span>
                )}
                {currentTeam && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "2px 8px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.04)" }}>
                    {currentTeam.logo && <img src={currentTeam.logo} alt="" style={{ width: 13, height: 13, objectFit: "contain" }} />}
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.4)" }}>
                      {currentTeam.name}
                    </span>
                  </div>
                )}
                {birthDate && (() => {
                  const iso = parseDateToISO(birthDate);
                  if (!iso) return null;
                  const age = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
                  return (
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.25)", padding: "2px 8px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.07)" }}>
                      {age} anos
                    </span>
                  );
                })()}
              </div>

              {/* Nome */}
              <h1 style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 900, color: "var(--color-text-primary)", letterSpacing: "0.01em", lineHeight: 1.1, margin: 0 }}>
                {surname || fullName || "Atleta"}
              </h1>
              {surname && (
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>
                  {fullName}
                </p>
              )}
            </div>

            {/* Botão salvar */}
            {activeTab === "informacoes" && (
              <button type="submit" form="form-atleta" disabled={saving}
                style={{ flexShrink: 0, padding: "9px 22px", borderRadius: 9, border: "none", cursor: saving ? "not-allowed" : "pointer", backgroundColor: saving ? "rgba(191,242,5,0.3)" : "#BFF205", color: "#0a0a0a", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" as const, opacity: saving ? 0.6 : 1 }}>
                {saving ? "Salvando…" : "Salvar"}
              </button>
            )}
          </div>

          {/* Faixa colorida */}
          {teamColor && (
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, ${teamColor}80 0%, transparent 60%)`, pointerEvents: "none" }} />
          )}

          {/* Abas */}
          <div style={{ display: "flex", gap: 0 }}>
            {[
              { key: "informacoes", label: "INFORMAÇÕES" },
              { key: "historico", label: "HISTÓRICO" },
              { key: "estatisticas", label: "ESTATÍSTICAS" },
            ].map(tab => (
              <button key={tab.key} type="button"
                onClick={() => setActiveTab(tab.key as any)}
                style={{ padding: "11px 18px", border: "none", borderBottom: `2px solid ${activeTab === tab.key ? accentColor : "transparent"}`, backgroundColor: "transparent", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", color: activeTab === tab.key ? accentColor : "#666", cursor: "pointer", transition: "color 0.12s" }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Conteúdo ────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, padding: "24px 32px" }}>

        {/* ── ABA INFORMAÇÕES ─────────────────────────────────────────── */}
        {activeTab === "informacoes" && (
          <form id="form-atleta" onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, maxWidth: 860 }}>

              {/* Card Foto */}
              <div style={{ borderRadius: 14, border, backgroundColor: "var(--color-surface)", padding: "20px 20px 24px" }}>
                <SectionHeader title="Foto" color={accentColor} />

                <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{ width: 110, height: 110, borderRadius: "50%", overflow: "hidden", border: `2px dashed ${teamColor ? teamColor + "55" : "rgba(255,255,255,0.12)"}`, backgroundColor: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "border-color 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = accentColor + "88"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = teamColor ? teamColor + "55" : "rgba(255,255,255,0.12)"}>
                    {displayPhoto
                      ? <img src={displayPhoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <div style={{ textAlign: "center" as const }}>
                          <Camera size={22} color="rgba(255,255,255,0.15)" />
                          <p style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(255,255,255,0.2)", marginTop: 4 }}>Trocar foto</p>
                        </div>
                    }
                  </div>
                </div>

                <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.2)", textAlign: "center" as const, marginBottom: 24 }}>
                  JPG, PNG ou WebP
                </p>

                {/* Vínculo com equipe */}
                <SectionHeader title="Vínculo atual" color={accentColor} />
                <div style={{ borderRadius: 10, border, backgroundColor: currentTeam ? `${accentColor}08` : "rgba(255,255,255,0.02)", padding: "12px 14px", marginBottom: 12 }}>
                  {currentTeam ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {currentTeam.logo
                        ? <img src={currentTeam.logo} alt="" style={{ width: 28, height: 28, objectFit: "contain", flexShrink: 0 }} />
                        : <div style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: "rgba(255,255,255,0.06)", flexShrink: 0 }} />
                      }
                      <div>
                        <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>{currentTeam.name}</p>
                        <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: accentColor, margin: 0, marginTop: 1 }}>Equipe atual</p>
                      </div>
                    </div>
                  ) : (
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.25)", fontStyle: "italic", margin: 0 }}>Sem clube</p>
                  )}
                </div>

                {!showTransfer ? (
                  <button type="button" onClick={() => setShowTransfer(true)}
                    style={{ width: "100%", padding: "8px", borderRadius: 9, border: `1px solid ${accentColor}33`, backgroundColor: "transparent", color: accentColor, fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, cursor: "pointer", transition: "all 0.12s" }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = `${accentColor}10`; e.currentTarget.style.borderColor = `${accentColor}66`; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.borderColor = `${accentColor}33`; }}>
                    {currentTeam ? "Transferir" : "Vincular equipe"}
                  </button>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <LabSelect value={transferTeamId} onChange={setTransferTeamId} placeholder="Selecione a equipe…"
                      options={teams.map((t) => ({ value: t.id, label: t.full_name }))} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="button" onClick={handleVincular} disabled={!transferTeamId || transferring}
                        style={{ flex: 2, padding: "8px", borderRadius: 8, border: "none", backgroundColor: !transferTeamId || transferring ? "rgba(191,242,5,0.3)" : "#BFF205", color: "#0a0a0a", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800, cursor: !transferTeamId || transferring ? "not-allowed" : "pointer" }}>
                        {transferring ? "Salvando…" : "Confirmar"}
                      </button>
                      <button type="button" onClick={() => { setShowTransfer(false); setTransferTeamId(""); }}
                        style={{ flex: 1, padding: "8px", borderRadius: 8, border, background: "none", color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Card Dados */}
              <div style={{ borderRadius: 14, border, backgroundColor: "var(--color-surface)", padding: "20px 20px 24px" }}>
                <SectionHeader title="Dados pessoais" color={accentColor} />
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                  <div>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 5 }}>Nome completo *</span>
                    <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)}
                      style={inputBaseStyle}
                      onFocus={e => e.target.style.borderColor = `${accentColor}55`}
                      onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"} />
                  </div>

                  <div>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 5 }}>Apelido / nome de jogo</span>
                    <input type="text" value={surname} onChange={e => setSurname(e.target.value)}
                      style={inputBaseStyle}
                      onFocus={e => e.target.style.borderColor = `${accentColor}55`}
                      onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"} />
                  </div>

                  {/* Gênero — pill buttons */}
                  <div>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 7 }}>Gênero</span>
                    <div style={{ display: "flex", gap: 8 }}>
                      {[{ v: "male", l: "Masculino" }, { v: "female", l: "Feminino" }, { v: "", l: "—" }].map(opt => (
                        <button key={opt.v} type="button" onClick={() => setGender(opt.v)}
                          style={{ flex: 1, padding: "7px 0", borderRadius: 9, border: `1px solid ${gender === opt.v ? `${accentColor}55` : "rgba(255,255,255,0.08)"}`, backgroundColor: gender === opt.v ? `${accentColor}10` : "transparent", color: gender === opt.v ? accentColor : "rgba(255,255,255,0.4)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, cursor: "pointer", transition: "all 0.12s" }}>
                          {opt.l}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Posição */}
                  <div>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 5 }}>Posição</span>
                    <LabSelect value={positionId} onChange={setPositionId} placeholder="—"
                      options={positions.map((p) => ({ value: p.id, label: p.full_name }))} />
                  </div>

                  {/* Data de nascimento */}
                  <div>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 5 }}>Data de nascimento</span>
                    <input type="text" placeholder="DD/MM/AAAA" value={birthDate}
                      onChange={e => setBirthDate(applyDateMask(e.target.value))}
                      onPaste={e => { e.preventDefault(); setBirthDate(applyDateMask(e.clipboardData.getData("text"))); }}
                      maxLength={10} style={inputBaseStyle}
                      onFocus={e => e.target.style.borderColor = `${accentColor}55`}
                      onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"} />
                  </div>

                  {/* RG + CPF */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 5 }}>RG</span>
                      <input type="text" value={rg} onChange={e => setRg(e.target.value.replace(/[^\d.\-]/g, ""))}
                        style={inputBaseStyle}
                        onFocus={e => e.target.style.borderColor = `${accentColor}55`}
                        onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"} />
                    </div>
                    <div>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 5 }}>CPF</span>
                      <input type="text" value={cpf} onChange={e => setCpf(e.target.value.replace(/[^\d.\-\/]/g, ""))}
                        placeholder="000.000.000-00" style={inputBaseStyle}
                        onFocus={e => e.target.style.borderColor = `${accentColor}55`}
                        onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* ── ABA HISTÓRICO ────────────────────────────────────────────── */}
        {activeTab === "historico" && (
          <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Linha do tempo */}
            <div style={{ borderRadius: 14, border, backgroundColor: "var(--color-surface)", overflow: "hidden" }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <SectionHeader title="Linha do tempo" color={accentColor} />
                <button type="button" onClick={() => setShowAddStint(v => !v)}
                  style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${accentColor}33`, backgroundColor: showAddStint ? `${accentColor}10` : "transparent", color: accentColor, fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" as const, cursor: "pointer", transition: "all 0.12s", flexShrink: 0 }}>
                  + Adicionar
                </button>
              </div>

              {/* Formulário adicionar stint */}
              {showAddStint && (
                <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.07)", backgroundColor: "rgba(255,255,255,0.02)" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 5 }}>Equipe *</span>
                      <LabSelect value={addStintTeamId} onChange={setAddStintTeamId} placeholder="Selecione…"
                        options={teams.map((t) => ({ value: t.id, label: t.full_name }))} />
                    </div>
                    <div>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 5 }}>Tipo</span>
                      <LabSelect value={addStintMovement} onChange={setAddStintMovement}
                        options={Object.entries(MOVEMENT_LABELS).map(([k, v]) => ({ value: k, label: v }))} />
                    </div>
                    <div>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 5 }}>Início *</span>
                      <input type="text" placeholder="DD/MM/AAAA" value={addStintStarted}
                        onChange={e => setAddStintStarted(applyDateMask(e.target.value))}
                        maxLength={10} style={inputBaseStyle} />
                    </div>
                    <div>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 5 }}>Fim</span>
                      <input type="text" placeholder="DD/MM/AAAA" value={addStintEnded}
                        onChange={e => setAddStintEnded(applyDateMask(e.target.value))}
                        maxLength={10} style={inputBaseStyle} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" onClick={handleAddStint} disabled={addingStint}
                      style={{ padding: "8px 18px", borderRadius: 8, border: "none", backgroundColor: addingStint ? "rgba(191,242,5,0.3)" : "#BFF205", color: "#0a0a0a", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800, cursor: addingStint ? "not-allowed" : "pointer" }}>
                      {addingStint ? "Adicionando…" : "Confirmar"}
                    </button>
                    <button type="button" onClick={() => setShowAddStint(false)}
                      style={{ padding: "8px 14px", borderRadius: 8, border, background: "none", color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {stintHistory.length === 0 ? (
                <p style={{ padding: "20px 18px", fontFamily: "var(--font-mono)", fontSize: 12, color: "rgba(255,255,255,0.25)" }}>
                  Nenhum vínculo registrado.
                </p>
              ) : (
                stintHistory.map((stint, idx) => (
                  <div key={stint.id} style={{ borderTop: idx > 0 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                    {editingStintId === stint.id ? (
                      <div style={{ padding: "14px 18px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                          {stint.teams?.logo_url
                            ? <img src={stint.teams.logo_url} alt="" style={{ width: 24, height: 24, objectFit: "contain", flexShrink: 0 }} />
                            : <div style={{ width: 24, height: 24, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.06)", flexShrink: 0 }} />
                          }
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)" }}>
                            {stint.teams?.full_name ?? "Equipe"}
                          </span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                          <div>
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 4 }}>Tipo</span>
                            <LabSelect value={editStintMovement} onChange={setEditStintMovement}
                              options={Object.entries(MOVEMENT_LABELS).map(([k, v]) => ({ value: k, label: v }))} />
                          </div>
                          <div>
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 4 }}>Início</span>
                            <input type="text" placeholder="DD/MM/AAAA" value={editStintStarted}
                              onChange={e => setEditStintStarted(applyDateMask(e.target.value))}
                              maxLength={10} style={inputBaseStyle} />
                          </div>
                          <div>
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 4 }}>Fim</span>
                            <input type="text" placeholder="DD/MM/AAAA" value={editStintEnded}
                              onChange={e => setEditStintEnded(applyDateMask(e.target.value))}
                              maxLength={10} style={inputBaseStyle} />
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button type="button" onClick={() => handleSaveStint(stint.id)} disabled={savingStint}
                            style={{ padding: "7px 16px", borderRadius: 8, border: "none", backgroundColor: savingStint ? "rgba(191,242,5,0.3)" : "#BFF205", color: "#0a0a0a", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800, cursor: "pointer" }}>
                            {savingStint ? "Salvando…" : "Salvar"}
                          </button>
                          <button type="button" onClick={() => setEditingStintId(null)}
                            style={{ padding: "7px 12px", borderRadius: 8, border, background: "none", color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 18px", opacity: stint.is_active !== false ? 0.85 : 0.35, transition: "opacity 0.1s" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = "1"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = stint.is_active !== false ? "0.85" : "0.35"}>

                        {/* Badge de movimento */}
                        <div style={{ flexShrink: 0, width: 80 }}>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.06em", padding: "3px 8px", borderRadius: 20, backgroundColor: `${MOVEMENT_COLORS[stint.movement_type ?? "arrival"]}18`, color: MOVEMENT_COLORS[stint.movement_type ?? "arrival"], border: `1px solid ${MOVEMENT_COLORS[stint.movement_type ?? "arrival"]}33` }}>
                            {MOVEMENT_LABELS[stint.movement_type ?? "arrival"] ?? "—"}
                          </span>
                        </div>

                        {/* Logo do time */}
                        <div style={{ width: 32, height: 32, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {stint.teams?.logo_url
                            ? <img src={stint.teams.logo_url} alt="" style={{ width: 28, height: 28, objectFit: "contain", filter: stint.is_active !== false ? "none" : "grayscale(1)" }} />
                            : <div style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.3)" }}>
                                  {(stint.teams?.abbreviation ?? stint.teams?.full_name ?? "?").slice(0, 2).toUpperCase()}
                                </span>
                              </div>
                          }
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>
                            {stint.teams?.full_name ?? "Equipe desconhecida"}
                          </p>
                          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.3)", margin: 0, marginTop: 1 }}>
                            {new Date(stint.started_at + "T00:00:00").toLocaleDateString("pt-BR")}
                            {" → "}
                            {stint.ended_at ? new Date(stint.ended_at + "T00:00:00").toLocaleDateString("pt-BR") : "atual"}
                          </p>
                        </div>

                        {stint.ended_at === null && (
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 20, backgroundColor: `${accentColor}18`, color: accentColor, border: `1px solid ${accentColor}33`, flexShrink: 0 }}>
                            atual
                          </span>
                        )}

                        {/* Ações */}
                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                          <button type="button" onClick={() => openEditStint(stint)}
                            style={{ padding: "4px 10px", borderRadius: 7, border, background: "none", color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, cursor: "pointer", transition: "all 0.1s" }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = `${accentColor}44`; e.currentTarget.style.color = accentColor; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}>
                            Editar
                          </button>
                          <button type="button" onClick={() => handleToggleStintAtivo(stint.id, stint.is_active !== false)}
                            style={{ padding: "4px 10px", borderRadius: 7, border: `1px solid ${stint.is_active !== false ? "rgba(255,255,255,0.1)" : "rgba(191,242,5,0.25)"}`, background: "none", color: stint.is_active !== false ? "rgba(255,255,255,0.3)" : "rgba(191,242,5,0.7)", fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, cursor: "pointer", transition: "all 0.1s" }}
                            onMouseEnter={e => { e.currentTarget.style.opacity = "1"; }}
                            onMouseLeave={e => { e.currentTarget.style.opacity = "0.85"; }}>
                            {stint.is_active !== false ? "Ocultar" : "Exibir"}
                          </button>
                          {stint.ended_at !== null && (
                            <button type="button" onClick={() => handleRemoveStint(stint.id)}
                              style={{ padding: "4px 10px", borderRadius: 7, border: "1px solid rgba(255,68,68,0.2)", background: "none", color: "rgba(255,68,68,0.5)", fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, cursor: "pointer", transition: "all 0.1s" }}
                              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,68,68,0.5)"; e.currentTarget.style.color = "#FF4444"; }}
                              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,68,68,0.2)"; e.currentTarget.style.color = "rgba(255,68,68,0.5)"; }}>
                              Remover
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Inscrições */}
            <div style={{ borderRadius: 14, border, backgroundColor: "var(--color-surface)", overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase" as const, color: accentColor }}>
                    Inscrições
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.25)" }}>{tournaments.length}</span>
                </div>
                <input type="text" placeholder="Buscar…" value={tournamentSearch}
                  onChange={e => setTournamentSearch(e.target.value)}
                  style={{ ...inputBaseStyle, width: 150, padding: "6px 10px" }}
                  onFocus={e => e.target.style.borderColor = `${accentColor}44`}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"} />
              </div>
              {tournaments.length === 0 ? (
                <p style={{ padding: "16px 18px", fontFamily: "var(--font-mono)", fontSize: 12, color: "rgba(255,255,255,0.25)" }}>
                  {tournamentSearch ? "Nenhum resultado." : "Nenhuma inscrição registrada."}
                </p>
              ) : (
                tournaments.map((t, idx) => (
                  <div key={t.editionId} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 18px", borderTop: idx > 0 ? "1px solid rgba(255,255,255,0.06)" : "none", opacity: 0.85, transition: "opacity 0.1s" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = "1"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "0.85"}>

                    {/* Logos das equipes pelas quais foi inscrito */}
                    {t.logos.length > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: -4, flexShrink: 0 }}>
                        {t.logos.map((logo, i) => (
                          <div key={i} title={logo.full_name} style={{ width: 26, height: 26, borderRadius: "50%", border: "2px solid var(--color-surface)", backgroundColor: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", marginLeft: i > 0 ? -8 : 0, position: "relative", zIndex: t.logos.length - i }}>
                            {logo.logo_url
                              ? <img src={logo.logo_url} alt={logo.full_name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                              : <span style={{ fontFamily: "var(--font-mono)", fontSize: 7, fontWeight: 800, color: "rgba(255,255,255,0.4)" }}>
                                  {(logo.abbreviation ?? logo.full_name).slice(0, 2).toUpperCase()}
                                </span>
                            }
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                        {t.competition}
                      </p>
                      <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.3)", margin: 0, marginTop: 1 }}>{t.season}</p>
                    </div>

                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 20, flexShrink: 0, backgroundColor: t.status === "approved" ? `${accentColor}18` : "rgba(255,255,255,0.06)", color: t.status === "approved" ? accentColor : "#A6A6A6", border: `1px solid ${t.status === "approved" ? accentColor + "33" : "rgba(255,255,255,0.08)"}` }}>
                      {t.status === "approved" ? "Aprovado" : "Pendente"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── ABA ESTATÍSTICAS ─────────────────────────────────────────── */}
        {activeTab === "estatisticas" && (
          <div style={{ maxWidth: 760, display: "flex", flexDirection: "column", gap: 24 }}>

            {editionStats.length === 0 && awards.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 0", textAlign: "center" as const }}>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>Sem estatísticas</p>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 6 }}>Nenhuma edição com dados registrados.</p>
              </div>
            ) : (
              <>
                {/* ── Filtros ────────────────────────────────────────────── */}
                {editionStats.length > 0 && (
                  <div style={{ borderRadius: 14, border, backgroundColor: "var(--color-surface)", padding: "16px 18px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase" as const, color: accentColor }}>
                        Filtros
                      </span>
                      {hasActiveFilter && (
                        <button type="button" onClick={clearFilters}
                          style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.35)", background: "none", border: "none", cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase" as const }}
                          onMouseEnter={e => e.currentTarget.style.color = accentColor}
                          onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.35)"}>
                          Limpar filtros
                        </button>
                      )}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>

                      {/* Filtro — Clube */}
                      <div>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 5 }}>
                          Clube
                        </span>
                        <LabSelect value={filterTeamId} onChange={setFilterTeamId} placeholder="Todos"
                          options={statsTeamOptions.map((t) => ({ value: t.id, label: t.name }))} />
                      </div>

                      {/* Filtro — Ano */}
                      <div>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 5 }}>
                          Ano
                        </span>
                        <LabSelect value={filterYear} onChange={setFilterYear} placeholder="Todos"
                          options={statsYearOptions.map((y) => ({ value: String(y), label: String(y) }))} />
                      </div>

                      {/* Filtro — Temporada */}
                      <div>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 5 }}>
                          Temporada
                        </span>
                        <LabSelect value={filterSeason} onChange={setFilterSeason} placeholder="Todas"
                          options={statsSeasonOptions.map((s) => ({ value: s, label: s }))} />
                      </div>

                      {/* Filtro — Competição */}
                      <div>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 5 }}>
                          Competição
                        </span>
                        <LabSelect value={filterCompetition} onChange={setFilterCompetition} placeholder="Todas"
                          options={statsCompetitionOptions.map((c) => ({ value: c.full, label: c.short }))} />
                      </div>

                    </div>
                  </div>
                )}

                {/* ── Tabela de stats ───────────────────────────────────── */}
                {editionStats.length > 0 && (
                  <div style={{ borderRadius: 14, border, backgroundColor: "var(--color-surface)", overflow: "hidden" }}>
                    <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <SectionHeader title="Por edição" color={accentColor} />
                      {hasActiveFilter && (
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.25)" }}>
                          {filteredStats.length} de {editionStats.length} edições
                        </span>
                      )}
                    </div>

                    {filteredStats.length === 0 ? (
                      <p style={{ padding: "20px 18px", fontFamily: "var(--font-mono)", fontSize: 12, color: "rgba(255,255,255,0.25)" }}>
                        Nenhum resultado para os filtros selecionados.
                      </p>
                    ) : (
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" as const }}>
                          <thead>
                            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                              {["Competição", "Temporada", "J", "G", "A", "AM", "VM", "MOTM"].map(h => (
                                <th key={h} style={{ padding: "10px 14px", textAlign: "left" as const, fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", whiteSpace: "nowrap" as const }}>
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {filteredStats.map((stat, idx) => (
                              <tr key={stat.edition_id} style={{ borderTop: idx > 0 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                                <td style={{ padding: "11px 14px", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)", whiteSpace: "nowrap" as const }}>
                                  {stat.competition_editions?.competitions?.short_name ?? stat.competition_editions?.competitions?.full_name ?? "—"}
                                </td>
                                <td style={{ padding: "11px 14px", fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.35)", whiteSpace: "nowrap" as const }}>
                                  {stat.competition_editions?.seasons?.name ?? "—"}
                                </td>
                                <td style={{ padding: "11px 14px", fontFamily: "var(--font-mono)", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{stat.matches_played ?? 0}</td>
                                <td style={{ padding: "11px 14px", fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 800, color: accentColor }}>{stat.goals ?? 0}</td>
                                <td style={{ padding: "11px 14px", fontFamily: "var(--font-mono)", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{stat.assists ?? 0}</td>
                                <td style={{ padding: "11px 14px", fontFamily: "var(--font-mono)", fontSize: 12, color: "#F2C005" }}>{stat.yellow_cards ?? 0}</td>
                                <td style={{ padding: "11px 14px", fontFamily: "var(--font-mono)", fontSize: 12, color: "#FF4444" }}>{stat.red_cards ?? 0}</td>
                                <td style={{ padding: "11px 14px", fontFamily: "var(--font-mono)", fontSize: 12, color: accentColor }}>{stat.motm_count ?? 0}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {awards.length > 0 && (
                  <div style={{ borderRadius: 14, border, backgroundColor: "var(--color-surface)", overflow: "hidden" }}>
                    <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                      <SectionHeader title={`Premiações (${awards.length})`} color={accentColor} />
                    </div>
                    {awards.map((award, idx) => (
                      <div key={award.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", borderTop: idx > 0 ? "1px solid rgba(255,255,255,0.06)" : "none", opacity: 0.85, transition: "opacity 0.1s" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = "1"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "0.85"}>
                        <div style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: `${accentColor}12`, border: `1px solid ${accentColor}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 16 }}>
                          {AWARD_ICONS[award.award_type] ?? "🏆"}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>
                            {AWARD_LABELS[award.award_type] ?? award.award_type}
                          </p>
                          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.3)", margin: 0, marginTop: 1 }}>
                            {award.competition_editions?.competitions?.short_name ?? award.competition_editions?.competitions?.full_name ?? "—"}
                            {" · "}
                            {award.competition_editions?.seasons?.name ?? "—"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}