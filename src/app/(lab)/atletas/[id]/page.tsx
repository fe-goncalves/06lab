"use client";

import { createClient } from "@/lib/supabase";
import Breadcrumb from "@/app/(lab)/components/breadcrumb";
import { toast } from "@/app/(lab)/components/toast";
import { editarAtleta, vincularAtleta, adicionarStint, removerStint, editarStint } from "../actions";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

// ─── Tipos ───────────────────────────────────────────────────────────────────

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
type Team = { id: string; full_name: string };

type StintHistory = {
  id: string;
  team_id: string;
  started_at: string;
  ended_at: string | null;
  is_current: boolean;
  movement_type: string | null;
  teams: { id: string; full_name: string; abbreviation: string | null; logo_url: string | null } | null;
};

type EditionStat = {
  edition_id: string;
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
  matches_played: number;
  motm_count: number;
  competition_editions: {
    seasons: { name: string } | null;
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
  edition_teams: {
    edition_id: string;
    competition_editions: {
      seasons: { name: string } | null;
      competitions: { full_name: string; short_name: string | null } | null;
    } | null;
  } | null;
};

// ─── Constantes ──────────────────────────────────────────────────────────────

const MOVEMENT_LABELS: Record<string, string> = {
  arrival: "Chegada",
  transfer: "Transferência",
  loan: "Empréstimo",
  departure: "Saída",
};

const MOVEMENT_COLORS: Record<string, string> = {
  arrival: "#BFF205",
  transfer: "#A6A6A6",
  loan: "#F2C005",
  departure: "#FF4444",
};

const AWARD_LABELS: Record<string, string> = {
  top_scorer: "Artilheiro",
  top_assists: "Garçom",
  mvp: "MVP",
  best_goalkeeper: "Melhor Goleiro",
  best_coach: "Melhor Técnico",
  revelation: "Revelação",
  best_defense: "Melhor Defesa",
  best_performance: "Melhor Desempenho",
  champion: "Campeão",
  runner_up: "Vice-campeão",
  third_place: "Terceiro Lugar",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Componente principal ────────────────────────────────────────────────────

export default function AtletaPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<"informacoes" | "historico" | "estatisticas">("informacoes");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Dados
  const [positions, setPositions] = useState<Position[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [stintHistory, setStintHistory] = useState<StintHistory[]>([]);
  const [editionStats, setEditionStats] = useState<EditionStat[]>([]);
  const [awards, setAwards] = useState<Award[]>([]);
  const [rosterEntries, setRosterEntries] = useState<RosterEntry[]>([]);

  // Form atleta
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

  // Vínculo
  const [currentStintId, setCurrentStintId] = useState<string | null>(null);
  const [currentTeamName, setCurrentTeamName] = useState<string | null>(null);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferTeamId, setTransferTeamId] = useState("");
  const [transferring, setTransferring] = useState(false);

  // Edição de stint
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

  // Busca de torneios
  const [tournamentSearch, setTournamentSearch] = useState("");

  const load = useCallback(async () => {
    if (!id) { setLoadError("ID inválido."); setLoading(false); return; }
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: profile } = await supabase
      .from("user_profiles").select("organization_id")
      .eq("auth_user_id", user.id).maybeSingle();

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
      supabase.from("teams").select("id, full_name").eq("organization_id", profile.organization_id).order("full_name"),
      supabase.from("athlete_team_stints").select("id, team_id, teams(id, full_name)").eq("athlete_id", id).eq("is_current", true).maybeSingle(),
      supabase.from("athlete_team_stints")
        .select("id, team_id, started_at, ended_at, is_current, movement_type, teams(id, full_name, abbreviation, logo_url)")
        .eq("athlete_id", id).order("started_at", { ascending: false }),
      supabase.from("athlete_edition_stats")
        .select("edition_id, goals, assists, yellow_cards, red_cards, matches_played, motm_count, competition_editions(seasons(name), competitions(full_name, short_name))")
        .eq("athlete_id", id).order("edition_id", { ascending: false }),
      supabase.from("edition_awards")
        .select("id, award_type, edition_id, competition_editions(seasons(name), competitions(full_name, short_name))")
        .eq("athlete_id", id).order("edition_id", { ascending: false }),
      supabase.from("edition_roster_entries")
        .select("id, edition_team_id, status, edition_teams(edition_id, competition_editions(seasons(name), competitions(full_name, short_name)))")
        .eq("athlete_id", id).eq("member_type", "athlete"),
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
    setCurrentStintId((currentStintData as any)?.id ?? null);
    setCurrentTeamName((currentStintData as any)?.teams?.full_name ?? null);
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
    e.preventDefault();
    setSaving(true);
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
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
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
    setShowTransfer(false);
    setTransferTeamId("");
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
    const supabase = createClient();
    const started = parseDateToISO(editStintStarted);
    const ended = parseDateToISO(editStintEnded);
    const { error } = await supabase
      .from("athlete_team_stints")
      .update({
        movement_type: editStintMovement || null,
        started_at: started ?? undefined,
        ended_at: ended ?? null,
      })
      .eq("id", stintId);
    setSavingStint(false);
    if (error) { toast("error", error.message); return; }
    toast("success", "Vínculo atualizado.");
    setEditingStintId(null);
    await load();
  }

  async function handleAddStint() {
    if (!addStintTeamId || !addStintStarted) {
      toast("error", "Equipe e data de início são obrigatórios.");
      return;
    }
    const started = parseDateToISO(addStintStarted);
    if (!started) { toast("error", "Data de início inválida."); return; }
    const ended = addStintEnded ? parseDateToISO(addStintEnded) : null;
    setAddingStint(true);
    const result = await adicionarStint(id, addStintTeamId, addStintMovement, started, ended);
    setAddingStint(false);
    if ("error" in result) { toast("error", result.error); return; }
    toast("success", "Vínculo adicionado.");
    setShowAddStint(false);
    setAddStintTeamId("");
    setAddStintMovement("arrival");
    setAddStintStarted("");
    setAddStintEnded("");
    await load();
  }

  async function handleRemoveStint(stintId: string) {
    if (!confirm("Remover este vínculo da linha do tempo?")) return;
    const result = await removerStint(stintId);
    if ("error" in result) { toast("error", result.error); return; }
    toast("success", "Vínculo removido.");
    await load();
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

  const displayPhoto = previewUrl ?? photoUrl;
  const positionAbbr = positions.find(p => p.id === positionId)?.abbreviation ?? null;

  const inputClass = "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]";
  const inputStyle = { borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" };

  // Torneios únicos inscritos
  const tournaments = rosterEntries
    .map(r => ({
      editionId: r.edition_teams?.edition_id ?? "",
      competition: r.edition_teams?.competition_editions?.competitions?.short_name ?? r.edition_teams?.competition_editions?.competitions?.full_name ?? "—",
      season: r.edition_teams?.competition_editions?.seasons?.name ?? "—",
      status: r.status,
    }))
    .filter((t, idx, arr) => arr.findIndex(x => x.editionId === t.editionId) === idx)
    .filter(t => {
      if (!tournamentSearch) return true;
      return t.competition.toLowerCase().includes(tournamentSearch.toLowerCase()) ||
        t.season.toLowerCase().includes(tournamentSearch.toLowerCase());
    });

  if (loading) return <div className="p-8" style={{ color: "var(--color-text-secondary)" }}>Carregando…</div>;
  if (loadError) return <div className="p-8" style={{ color: "var(--color-text-primary)" }}>{loadError}</div>;

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "var(--color-background)" }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
        <div className="px-8 pt-6 pb-0">
          <Breadcrumb items={[{ label: "Atletas", href: "/atletas" }, { label: surname || fullName || "Atleta" }]} />

          <div className="mb-4 flex items-center gap-4">
            {displayPhoto ? (
              <img src={displayPhoto} alt="" className="h-14 w-14 shrink-0 rounded-full border object-cover"
                style={{ borderColor: "var(--color-border)" }} />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border font-display text-lg font-bold"
                style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" }}>
                {initialsFromName(fullName || "?")}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-2xl font-bold truncate" style={{ color: "var(--color-text-primary)" }}>
                {surname || fullName || "Atleta"}
              </h1>
              <div className="flex items-center gap-3 mt-0.5">
                {positionAbbr && (
                  <span className="font-mono text-xs" style={{ color: "var(--color-brand)" }}>{positionAbbr}</span>
                )}
                {currentTeamName && (
                  <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>· {currentTeamName}</span>
                )}
              </div>
            </div>
            {activeTab === "informacoes" && (
              <button type="submit" form="form-atleta" disabled={saving}
                className="shrink-0 rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
                {saving ? "Salvando…" : "Salvar alterações"}
              </button>
            )}
          </div>

          {/* Abas */}
          <div className="flex gap-6">
            {[
              { key: "informacoes", label: "INFORMAÇÕES" },
              { key: "historico", label: "HISTÓRICO" },
              { key: "estatisticas", label: "ESTATÍSTICAS" },
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

      {/* Conteúdo */}
      <div className="flex-1 px-8 py-6">

        {/* ABA INFORMAÇÕES */}
        {activeTab === "informacoes" && (
          <div>
            <form id="form-atleta" onSubmit={handleSubmit}>
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Foto */}
                <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
                  <h2 className="mb-4 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>Foto</h2>
                  <div className="mb-4 flex justify-center">
                    {displayPhoto ? (
                      <img src={displayPhoto} alt="" className="h-32 w-32 rounded-full border object-cover" style={{ borderColor: "var(--color-border)" }} />
                    ) : (
                      <div className="flex h-32 w-32 items-center justify-center rounded-full border text-2xl font-bold"
                        style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" }}>
                        {initialsFromName(fullName || "?")}
                      </div>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoChange} />
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="w-full rounded-lg border px-3 py-2 text-sm font-medium"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}>
                    Trocar foto
                  </button>
                </div>

                {/* Dados */}
                <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
                  <h2 className="mb-4 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>Dados</h2>
                  <div className="flex flex-col gap-4">
                    <label className="flex flex-col gap-1">
                      <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Nome completo</span>
                      <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} className={inputClass} style={inputStyle} />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Apelido</span>
                      <input type="text" value={surname} onChange={e => setSurname(e.target.value)} className={inputClass} style={inputStyle} />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Gênero</span>
                      <select value={gender} onChange={e => setGender(e.target.value)} className={inputClass} style={inputStyle}>
                        <option value="">Selecione…</option>
                        <option value="male">Masculino</option>
                        <option value="female">Feminino</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Posição</span>
                      <select value={positionId} onChange={e => setPositionId(e.target.value)} className={inputClass} style={inputStyle}>
                        <option value="">Selecione…</option>
                        {positions.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Data de nascimento</span>
                      <input type="text" placeholder="DD/MM/AAAA" value={birthDate}
                        onChange={e => setBirthDate(applyDateMask(e.target.value))}
                        onPaste={e => { e.preventDefault(); setBirthDate(applyDateMask(e.clipboardData.getData("text"))); }}
                        maxLength={10} className={inputClass} style={inputStyle} />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>RG</span>
                      <input type="text" value={rg} onChange={e => setRg(e.target.value.replace(/[^\d.\-]/g, ""))} className={inputClass} style={inputStyle} />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>CPF</span>
                      <input type="text" value={cpf} onChange={e => setCpf(e.target.value.replace(/[^\d.\-\/]/g, ""))} placeholder="000.000.000-00" className={inputClass} style={inputStyle} />
                    </label>
                  </div>
                </div>
              </div>
            </form>

            {/* Vínculo */}
            <div className="mt-6 rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              <h2 className="mb-4 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>Vínculo com equipe</h2>
              <div className="flex flex-col gap-3">
                <p className="text-sm" style={{ color: "var(--color-text-primary)" }}>
                  Equipe atual:{" "}
                  <span className="font-medium" style={{ color: currentTeamName ? "var(--color-brand)" : "var(--color-text-secondary)" }}>
                    {currentTeamName ?? "Sem clube"}
                  </span>
                </p>
                {!showTransfer ? (
                  <button type="button" onClick={() => setShowTransfer(true)}
                    className="self-start rounded-lg border px-3 py-2 text-sm font-medium"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}>
                    {currentTeamName ? "Transferir" : "Vincular equipe"}
                  </button>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <select value={transferTeamId} onChange={e => setTransferTeamId(e.target.value)}
                      className="rounded-lg border px-3 py-2 text-sm outline-none"
                      style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" }}>
                      <option value="">Selecione a equipe…</option>
                      {teams.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                    </select>
                    <button type="button" onClick={handleVincular} disabled={!transferTeamId || transferring}
                      className="rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50"
                      style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
                      {transferring ? "Salvando…" : "Confirmar"}
                    </button>
                    <button type="button" onClick={() => { setShowTransfer(false); setTransferTeamId(""); }}
                      className="rounded-lg border px-3 py-2 text-sm"
                      style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ABA HISTÓRICO */}
        {activeTab === "historico" && (
          <div className="space-y-6">
            {/* Linha do tempo */}
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
                <h2 className="font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
                  Linha do tempo
                </h2>
                <button type="button" onClick={() => setShowAddStint(v => !v)}
                  className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-brand)" }}>
                  + Adicionar
                </button>
              </div>

              {/* Form de adicionar */}
              {showAddStint && (
                <div className="px-5 py-4 border-b space-y-3" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }}>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <label className="flex flex-col gap-1">
                      <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>Equipe *</span>
                      <select value={addStintTeamId} onChange={e => setAddStintTeamId(e.target.value)} className={inputClass} style={inputStyle}>
                        <option value="">Selecione…</option>
                        {teams.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>Tipo</span>
                      <select value={addStintMovement} onChange={e => setAddStintMovement(e.target.value)} className={inputClass} style={inputStyle}>
                        {Object.entries(MOVEMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>Início *</span>
                      <input type="text" placeholder="DD/MM/AAAA" value={addStintStarted}
                        onChange={e => setAddStintStarted(applyDateMask(e.target.value))}
                        maxLength={10} className={inputClass} style={inputStyle} />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>Fim</span>
                      <input type="text" placeholder="DD/MM/AAAA" value={addStintEnded}
                        onChange={e => setAddStintEnded(applyDateMask(e.target.value))}
                        maxLength={10} className={inputClass} style={inputStyle} />
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={handleAddStint} disabled={addingStint}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50"
                      style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
                      {addingStint ? "Adicionando…" : "Confirmar"}
                    </button>
                    <button type="button" onClick={() => setShowAddStint(false)}
                      className="rounded-lg border px-3 py-1.5 text-sm"
                      style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {stintHistory.length === 0 ? (
                <p className="px-5 py-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>Nenhum vínculo registrado.</p>
              ) : (
                stintHistory.map((stint, idx) => (
                  <div key={stint.id} style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none" }}>
                    {editingStintId === stint.id ? (
                      <div className="px-5 py-4 space-y-3">
                        <div className="flex items-center gap-3 mb-2">
                          {stint.teams?.logo_url ? (
                            <img src={stint.teams.logo_url} alt="" className="h-7 w-7 rounded object-contain shrink-0" />
                          ) : (
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded border text-xs font-bold"
                              style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                              {stint.teams?.abbreviation?.slice(0, 2) ?? "?"}
                            </div>
                          )}
                          <span className="font-medium text-sm" style={{ color: "var(--color-text-primary)" }}>
                            {stint.teams?.full_name ?? "Equipe"}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <label className="flex flex-col gap-1">
                            <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>Tipo</span>
                            <select value={editStintMovement} onChange={e => setEditStintMovement(e.target.value)} className={inputClass} style={inputStyle}>
                              {Object.entries(MOVEMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>Início</span>
                            <input type="text" placeholder="DD/MM/AAAA" value={editStintStarted}
                              onChange={e => setEditStintStarted(applyDateMask(e.target.value))}
                              maxLength={10} className={inputClass} style={inputStyle} />
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>Fim</span>
                            <input type="text" placeholder="DD/MM/AAAA" value={editStintEnded}
                              onChange={e => setEditStintEnded(applyDateMask(e.target.value))}
                              maxLength={10} className={inputClass} style={inputStyle} />
                          </label>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => handleSaveStint(stint.id)} disabled={savingStint}
                            className="rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50"
                            style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
                            {savingStint ? "Salvando…" : "Salvar"}
                          </button>
                          <button type="button" onClick={() => setEditingStintId(null)}
                            className="rounded-lg border px-3 py-1.5 text-sm"
                            style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4 px-5 py-3 group">
                        <div className="shrink-0 w-24">
                          <span className="font-mono text-xs font-bold rounded px-2 py-0.5"
                            style={{
                              backgroundColor: `${MOVEMENT_COLORS[stint.movement_type ?? "arrival"]}22`,
                              color: MOVEMENT_COLORS[stint.movement_type ?? "arrival"],
                            }}>
                            {MOVEMENT_LABELS[stint.movement_type ?? "arrival"] ?? "—"}
                          </span>
                        </div>
                        {stint.teams?.logo_url ? (
                          <img src={stint.teams.logo_url} alt="" className="h-8 w-8 rounded border object-contain shrink-0"
                            style={{ borderColor: "var(--color-border)" }} />
                        ) : (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border text-xs font-bold"
                            style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-secondary)" }}>
                            {stint.teams?.abbreviation?.slice(0, 2) ?? stint.teams?.full_name?.slice(0, 2) ?? "?"}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm" style={{ color: "var(--color-text-primary)" }}>
                            {stint.teams?.full_name ?? "Equipe desconhecida"}
                          </p>
                          <p className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                            {new Date(stint.started_at + "T00:00:00").toLocaleDateString("pt-BR")}
                            {" → "}
                            {stint.ended_at
                              ? new Date(stint.ended_at + "T00:00:00").toLocaleDateString("pt-BR")
                              : "atual"}
                          </p>
                        </div>
                        {stint.is_current && (
                          <span className="shrink-0 rounded px-2 py-0.5 font-mono text-xs"
                            style={{ backgroundColor: "rgba(191,242,5,0.15)", color: "var(--color-brand)" }}>
                            atual
                          </span>
                        )}
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button type="button" onClick={() => openEditStint(stint)}
                            className="rounded border px-2 py-1 font-mono text-xs"
                            style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                            Editar
                          </button>
                          {!stint.is_current && (
                            <button type="button" onClick={() => handleRemoveStint(stint.id)}
                              className="rounded border px-2 py-1 font-mono text-xs transition-colors hover:border-[var(--color-danger)]"
                              style={{ borderColor: "var(--color-border)", color: "var(--color-danger)" }}>
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

            {/* Torneios inscritos */}
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
                <h2 className="font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
                  Torneios inscritos ({rosterEntries.length})
                </h2>
                <input type="text" placeholder="Buscar…" value={tournamentSearch}
                  onChange={e => setTournamentSearch(e.target.value)}
                  className="rounded-lg border px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                  style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)", width: 160 }} />
              </div>
              {tournaments.length === 0 ? (
                <p className="px-5 py-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  {tournamentSearch ? "Nenhum resultado." : "Nenhum torneio registrado."}
                </p>
              ) : (
                tournaments.map((t, idx) => (
                  <div key={t.editionId} className="flex items-center gap-4 px-5 py-3"
                    style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none" }}>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate" style={{ color: "var(--color-text-primary)" }}>{t.competition}</p>
                      <p className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>{t.season}</p>
                    </div>
                    <span className="shrink-0 font-mono text-xs rounded px-2 py-0.5"
                      style={{
                        backgroundColor: t.status === "approved" ? "rgba(191,242,5,0.15)" : "rgba(255,255,255,0.06)",
                        color: t.status === "approved" ? "var(--color-brand)" : "#A6A6A6",
                      }}>
                      {t.status === "approved" ? "Aprovado" : "Pendente"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
            </div>

            {/* Torneios inscritos */}
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
                <h2 className="font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
                  Torneios inscritos ({rosterEntries.length})
                </h2>
                <input
                  type="text"
                  placeholder="Buscar…"
                  value={tournamentSearch}
                  onChange={e => setTournamentSearch(e.target.value)}
                  className="rounded-lg border px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                  style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)", width: 160 }}
                />
              </div>
              {tournaments.length === 0 ? (
                <p className="px-5 py-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  {tournamentSearch ? "Nenhum resultado." : "Nenhum torneio registrado."}
                </p>
              ) : (
                tournaments.map((t, idx) => (
                  <div key={t.editionId} className="flex items-center gap-4 px-5 py-3"
                    style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none" }}>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate" style={{ color: "var(--color-text-primary)" }}>
                        {t.competition}
                      </p>
                      <p className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                        {t.season}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-xs rounded px-2 py-0.5"
                      style={{
                        backgroundColor: t.status === "approved" ? "rgba(191,242,5,0.15)" : "rgba(255,255,255,0.06)",
                        color: t.status === "approved" ? "var(--color-brand)" : "#A6A6A6",
                      }}>
                      {t.status === "approved" ? "Aprovado" : "Pendente"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ABA ESTATÍSTICAS */}
        {activeTab === "estatisticas" && (
          <div className="space-y-6">
            {/* Stats por edição */}
            {editionStats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="font-display text-xl" style={{ color: "var(--color-text-primary)" }}>Sem estatísticas</p>
                <p className="mt-2 font-mono text-sm" style={{ color: "#A6A6A6" }}>
                  Nenhuma edição com dados registrados.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
                <div className="px-5 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
                  <h2 className="font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
                    Por edição
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                        {["Competição", "Temporada", "J", "G", "A", "AM", "VM", "MOTM"].map(h => (
                          <th key={h} className="px-4 py-3 text-left font-mono text-xs"
                            style={{ color: "var(--color-text-secondary)" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {editionStats.map((stat, idx) => (
                        <tr key={stat.edition_id}
                          style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none" }}
                          className="hover:bg-[rgba(255,255,255,0.02)]">
                          <td className="px-4 py-3 text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                            {stat.competition_editions?.competitions?.short_name ?? stat.competition_editions?.competitions?.full_name ?? "—"}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                            {stat.competition_editions?.seasons?.name ?? "—"}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>{stat.matches_played ?? 0}</td>
                          <td className="px-4 py-3 font-mono text-sm font-bold" style={{ color: "var(--color-brand)" }}>{stat.goals ?? 0}</td>
                          <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>{stat.assists ?? 0}</td>
                          <td className="px-4 py-3 font-mono text-xs" style={{ color: "#F2C005" }}>{stat.yellow_cards ?? 0}</td>
                          <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--color-danger)" }}>{stat.red_cards ?? 0}</td>
                          <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--color-brand)" }}>{stat.motm_count ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Premiações */}
            {awards.length > 0 && (
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
                <div className="px-5 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
                  <h2 className="font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
                    Premiações ({awards.length})
                  </h2>
                </div>
                {awards.map((award, idx) => (
                  <div key={award.id} className="flex items-center gap-4 px-5 py-3"
                    style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none" }}>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: "rgba(191,242,5,0.1)" }}>
                      <span className="text-lg">🏆</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm" style={{ color: "var(--color-text-primary)" }}>
                        {AWARD_LABELS[award.award_type] ?? award.award_type}
                      </p>
                      <p className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                        {award.competition_editions?.competitions?.short_name ?? award.competition_editions?.competitions?.full_name ?? "—"}
                        {" · "}
                        {award.competition_editions?.seasons?.name ?? "—"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}