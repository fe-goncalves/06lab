/// ATLETAS / ID / PAGE

"use client";

import { createClient } from "@/lib/supabase";
import { toast } from "@/app/(lab)/components/toast";
import { LabSelect } from "@/app/(lab)/components/lab-select";
import { StintTimelinePanel } from "@/app/(lab)/components/stint-timeline-panel";
import type { StintRecord } from "@/app/(lab)/components/stint-timeline-utils";
import { EntityHubShell } from "@/app/(lab)/components/entity-hub-shell";
import { EntityHubSectionHeader } from "@/app/(lab)/components/entity-hub-section-header";
import { EntityLogoUpload } from "@/app/(lab)/components/entity-logo-upload";
import { GenderSwitch, normalizePersonGender } from "@/app/(lab)/components/gender-switch";
import { BirthDatePicker } from "@/app/(lab)/components/birth-date-picker";
import { PersonAvatarPlaceholder } from "@/app/(lab)/components/person-avatar-placeholder";
import styles from "@/app/(lab)/components/entity-hub.module.css";
import {
  editarAtleta, editarStintCompleto, excluirAtleta, removerStint, toggleAtletaAtivo,
  transferirAtleta, verificarPodeExcluirAtleta,
} from "../actions";
import { LabSwitch } from "@/app/(lab)/components/lab-switch";
import { isPersonActive } from "@/app/(lab)/components/person-list-toolbar";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

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
  is_active: boolean | null;
};

type Position = { id: string; full_name: string; abbreviation: string };
type Team = { id: string; full_name: string; short_name: string | null; logo_url?: string | null; primary_color?: string | null; gender?: string | null };
type StintHistory = StintRecord;
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

export default function AtletaPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";

  const [activeTab, setActiveTab] = useState<"informacao" | "linha_do_tempo" | "inscricoes">("informacao");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [togglingActive, setTogglingActive] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [deleteReasons, setDeleteReasons] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  const [positions, setPositions] = useState<Position[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [stintHistory, setStintHistory] = useState<StintHistory[]>([]);
  const [editionStats, setEditionStats] = useState<EditionStat[]>([]);
  const [awards, setAwards] = useState<Award[]>([]);
  const [rosterEntries, setRosterEntries] = useState<RosterEntry[]>([]);

  const [fullName, setFullName] = useState("");
  const [surname, setSurname] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [positionId, setPositionId] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [rg, setRg] = useState("");
  const [cpf, setCpf] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [currentTeam, setCurrentTeam] = useState<{ name: string; logo: string | null } | null>(null);
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
      supabase.from("teams").select("id, full_name, short_name, logo_url, primary_color, gender, is_virtual").eq("organization_id", profile.organization_id).eq("is_virtual", false).order("full_name"),
      supabase.from("athlete_team_stints").select("id, team_id, teams(id, full_name, logo_url, primary_color)").eq("athlete_id", id).eq("is_current", true).maybeSingle(),
      supabase.from("athlete_team_stints").select("id, team_id, started_at, ended_at, is_current, is_active, hide_free_after, teams(id, full_name, short_name, abbreviation, logo_url, primary_color)").eq("athlete_id", id).order("started_at", { ascending: false }),
      // team_id e years(value) adicionados para suportar os filtros
      supabase.from("athlete_edition_stats").select("edition_id, team_id, goals, assists, yellow_cards, red_cards, matches_played, motm_count, competition_editions(seasons(name, years(value)), competitions(full_name, short_name))").eq("athlete_id", id).order("edition_id", { ascending: false }),
      supabase.from("edition_awards").select("id, award_type, edition_id, competition_editions(seasons(name), competitions(full_name, short_name))").eq("athlete_id", id).order("edition_id", { ascending: false }),
      supabase.from("edition_roster_entries").select("id, edition_team_id, status, submitted_at, edition_teams(edition_id, teams(logo_url, full_name, abbreviation), competition_editions(seasons(name), competitions(full_name, short_name)))").eq("athlete_id", id).eq("member_type", "athlete").order("submitted_at", { ascending: true }),
    ]);

    if (athleteErr || !athlete) { setLoadError("Atleta não encontrado."); setLoading(false); return; }
    const a = athlete as AthleteRow;
    setFullName(a.full_name ?? "");
    setSurname(a.surname ?? "");
    setGender(normalizePersonGender(a.gender));
    setPositionId(a.position_id ?? "");
    setBirthDate(formatDateToBR(a.birth_date));
    setRg(a.rg ?? "");
    setCpf(a.cpf ?? "");
    setIsActive(isPersonActive(a.is_active));
    setPhotoUrl(a.photo_url);
    const deleteCheck = await verificarPodeExcluirAtleta(id);
    setCanDelete(deleteCheck.canDelete);
    setDeleteReasons(deleteCheck.reasons);
    setPositions((posData ?? []) as Position[]);
    setTeams((teamsData ?? []) as Team[]);
    const cs = currentStintData as any;
    setCurrentTeam(cs?.teams ? { name: cs.teams.full_name, logo: cs.teams.logo_url ?? null } : null);
    setStintHistory((historyData ?? []) as StintHistory[]);
    setEditionStats((statsData ?? []) as EditionStat[]);
    setAwards((awardsData ?? []) as Award[]);
    setRosterEntries((rosterData ?? []) as RosterEntry[]);
    setLoading(false);
  }, [id, router]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  function handlePendingPhotoChange(file: File | null) {
    setPendingPhoto(file);
    setPreviewUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return file ? URL.createObjectURL(file) : null;
    });
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

  async function handleEditStint(
    stintId: string,
    data: {
      startedAt: string;
      endedAt: string | null;
      isCurrent: boolean;
      isActive: boolean;
      hideFreeAfter?: boolean;
    },
  ) {
    const result = await editarStintCompleto(stintId, data);
    if ("error" in result) return { error: result.error };
    toast("success", "Vínculo atualizado.");
    await load();
    return {};
  }

  async function handleTransfer(startedAt: string, teamId: string | null, leaveFree: boolean) {
    const result = await transferirAtleta(id, startedAt, teamId, leaveFree);
    if ("error" in result) return { error: result.error };
    toast("success", leaveFree ? "Atleta sem clube." : "Transferência registrada.");
    await load();
    return {};
  }

  async function handleDeleteStint(stintId: string) {
    const result = await removerStint(stintId);
    if ("error" in result) return { error: result.error };
    toast("success", "Vínculo excluído.");
    await load();
    return {};
  }

  async function handleToggleActive(next: boolean) {
    setTogglingActive(true);
    try {
      const result = await toggleAtletaAtivo(id, next);
      if ("error" in result) { toast("error", result.error); return; }
      setIsActive(next);
      toast("success", next ? "Atleta reativado." : "Atleta desativado.");
    } finally {
      setTogglingActive(false);
    }
  }

  async function handleDelete() {
    if (!canDelete) return;
    if (!window.confirm("Excluir este atleta permanentemente? Esta ação não pode ser desfeita.")) return;
    setDeleting(true);
    try {
      const result = await excluirAtleta(id);
      if ("error" in result) { toast("error", result.error); return; }
      toast("success", "Atleta excluído.");
      router.push("/atletas");
    } finally {
      setDeleting(false);
    }
  }

  const displayPhoto = previewUrl ?? photoUrl;
  const positionFull = positions.find(p => p.id === positionId)?.full_name ?? null;
  const availableTeams = teams.filter((t) => t.gender === gender);

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

  const titleBase = surname.trim() || fullName.trim() || "Atleta";
  const headerTitle = titleBase.toUpperCase();
  const positionAndTeam = [positionFull, currentTeam?.name].filter(Boolean).join(" | ");
  const headerDetail = surname.trim()
    ? (fullName.trim() || "—")
    : (positionAndTeam || "—");
  const tabs = [
    { key: "informacao", label: "INFORMAÇÃO" },
    { key: "linha_do_tempo", label: "LINHA DO TEMPO" },
    { key: "inscricoes", label: "INSCRIÇÕES" },
  ];

  return (
    <EntityHubShell
      breadcrumb={[{ label: "Atletas", href: "/atletas" }, { label: headerTitle }]}
      avatar={
        <div className={styles.avatarSlot}>
          {displayPhoto
            ? <img src={displayPhoto} alt="" className={styles.avatarImg} />
            : (
              <div className={styles.avatarPlaceholderFill}>
                <PersonAvatarPlaceholder fill className={styles.avatarPlaceholderIcon} />
              </div>
            )
          }
        </div>
      }
      title={headerTitle}
      subtitle={headerDetail}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(key) => setActiveTab(key as "informacao" | "linha_do_tempo" | "inscricoes")}
      showSave={activeTab === "informacao"}
      saveFormId="form-atleta"
      saving={saving}
      loading={loading}
      loadError={loadError}
    >
      {activeTab === "informacao" && (
        <form id="form-atleta" onSubmit={handleSubmit} className={styles.formWrap}>
          <EntityHubSectionHeader title="Atleta" subtitle="Dados pessoais e status no laboratório" />

          <EntityLogoUpload
            value={pendingPhoto}
            onChange={handlePendingPhotoChange}
            existingUrl={photoUrl}
            label="Foto do atleta"
            hint="PNG, JPG ou WebP · proporção 1:1 recomendada"
            round
          />

          <div className={styles.fieldStack}>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="athlete-full-name">Nome completo *</label>
              <input
                id="athlete-full-name"
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className={styles.input}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="athlete-surname">Apelido / nome de jogo</label>
              <input
                id="athlete-surname"
                type="text"
                value={surname}
                onChange={e => setSurname(e.target.value.toUpperCase())}
                className={styles.inputUppercase}
              />
            </div>

            <div className={styles.field}>
              <span className={styles.fieldLabel}>Gênero</span>
              <GenderSwitch value={gender} onChange={setGender} />
            </div>

            <div className={styles.fieldRow2}>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Posição</span>
                <div className={styles.glassSelect}>
                  <LabSelect
                    value={positionId}
                    onChange={setPositionId}
                    placeholder="—"
                    options={positions.map((p) => ({ value: p.id, label: p.full_name }))}
                  />
                </div>
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Data de nascimento</span>
                <BirthDatePicker
                  id="athlete-birth-date"
                  value={birthDate}
                  onChange={setBirthDate}
                />
              </div>
            </div>

            <div className={styles.fieldRow2}>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="athlete-rg">RG</label>
                <input
                  id="athlete-rg"
                  type="text"
                  value={rg}
                  onChange={e => setRg(e.target.value.replace(/[^\d.\-]/g, ""))}
                  className={styles.input}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="athlete-cpf">CPF</label>
                <input
                  id="athlete-cpf"
                  type="text"
                  value={cpf}
                  onChange={e => setCpf(e.target.value.replace(/[^\d.\-\/]/g, ""))}
                  placeholder="000.000.000-00"
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleTitle}>Ativo</span>
                <span className={styles.toggleDesc}>Atletas inativos ficam ocultos na listagem padrão</span>
              </div>
              <LabSwitch checked={isActive} onChange={handleToggleActive} disabled={togglingActive} />
            </div>
          </div>

          <div className={styles.dangerZone}>
            <p className={styles.dangerTitle}>Zona de perigo</p>
            {canDelete ? (
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={deleting}
                className={styles.dangerBtn}
              >
                {deleting ? "Excluindo…" : "Excluir atleta"}
              </button>
            ) : (
              <p className={styles.dangerDesc}>
                Exclusão indisponível{deleteReasons.length > 0 ? `: ${deleteReasons.join(", ")}.` : "."}
              </p>
            )}
          </div>
        </form>
      )}

      {activeTab === "linha_do_tempo" && (
        <div className={styles.contentWide}>
          <StintTimelinePanel
            stints={stintHistory}
            teams={availableTeams.map((t) => ({
              id: t.id,
              full_name: t.full_name,
              short_name: t.short_name,
              logo_url: t.logo_url ?? null,
            }))}
            accentColor="var(--color-brand)"
            onEditStint={handleEditStint}
            onTransfer={handleTransfer}
            onDeleteStint={handleDeleteStint}
          />
        </div>
      )}

      {activeTab === "inscricoes" && (
        <div className={styles.contentWide}>
          <div className={styles.listPanel}>
            <div className={styles.listPanelHeader}>
              <div className={styles.listPanelTitle}>
                <span className={styles.listPanelName}>Inscrições</span>
                <span className={styles.listPanelCount}>{tournaments.length}</span>
              </div>
              <input
                type="text"
                placeholder="Buscar…"
                value={tournamentSearch}
                onChange={e => setTournamentSearch(e.target.value)}
                className={styles.listPanelSearch}
              />
            </div>
            {tournaments.length === 0 ? (
              <p className={styles.loadingMono} style={{ padding: "16px 18px" }}>
                {tournamentSearch ? "Nenhum resultado." : "Nenhuma inscrição registrada."}
              </p>
            ) : (
              <div>
                {tournaments.map((t) => (
                  <div key={t.editionId} className={styles.listRow}>
                    {t.logos.length > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: -4, flexShrink: 0 }}>
                        {t.logos.map((logo, i) => (
                          <div
                            key={i}
                            title={logo.full_name}
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: "50%",
                              border: "2px solid var(--color-surface)",
                              backgroundColor: "var(--color-input-bg)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              overflow: "hidden",
                              marginLeft: i > 0 ? -8 : 0,
                              position: "relative",
                              zIndex: t.logos.length - i,
                            }}
                          >
                            {logo.logo_url
                              ? <img src={logo.logo_url} alt={logo.full_name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                              : (
                                <span style={{ fontFamily: "var(--font-mono)", fontSize: 7, fontWeight: 800, color: "var(--color-icon-muted)" }}>
                                  {(logo.abbreviation ?? logo.full_name).slice(0, 2).toUpperCase()}
                                </span>
                              )
                            }
                          </div>
                        ))}
                      </div>
                    )}
                    <div className={styles.listRowMain}>
                      <p className={styles.listRowTitle}>{t.competition}</p>
                      <p className={styles.listRowSub}>{t.season}</p>
                    </div>
                    <span className={`${styles.statusBadge} ${t.status === "approved" ? styles.statusBadgeApproved : ""}`.trim()}>
                      {t.status === "approved" ? "Aprovado" : "Pendente"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </EntityHubShell>
  );
}