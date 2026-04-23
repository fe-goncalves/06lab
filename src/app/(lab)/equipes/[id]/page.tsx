"use client";

import { createClient } from "@/lib/supabase";
import Breadcrumb from "@/app/(lab)/components/breadcrumb";
import { toast } from "@/app/(lab)/components/toast";
import { editarEquipe } from "../actions";
import { useParams, useRouter } from "next/navigation";
import {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

type TeamRow = Record<string, unknown> & {
  id: string;
  organization_id: string;
  full_name: string;
  short_name: string | null;
  abbreviation: string | null;
  gender: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  tertiary_color: string | null;
  founded_year: number | null;
  home_venue_id: string | null;
  parent_team_id?: string | null;
};

type VenueOption = { id: string; full_name: string };
type TeamOption = { id: string; full_name: string; gender: string | null };
type Athlete = {
  id: string;
  full_name: string;
  surname: string | null;
  photo_url: string | null;
  position_id: string | null;
  position: { id: string; full_name: string; abbreviation: string; display_order: number } | null;
};
type Match = {
  id: string;
  match_date: string | null;
  status: string;
  score_a: number;
  score_b: number;
  team_a_id: string | null;
  team_b_id: string | null;
  teams_a: { full_name: string; abbreviation: string | null; logo_url: string | null } | null;
  teams_b: { full_name: string; abbreviation: string | null; logo_url: string | null } | null;
  phases: { competition_editions: { competitions: { full_name: string } | null } | null } | null;
};

const STATUS_LABEL: Record<string, string> = {
  scheduled: "AG", ongoing: "AO VIVO", finished: "FT", postponed: "AD",
};
const STATUS_COLOR: Record<string, string> = {
  scheduled: "#A6A6A6", ongoing: "#BFF205", finished: "#A6A6A6", postponed: "#FF4444",
};

function colorInputValue(hex: string | null | undefined): string {
  if (!hex) return "#000000";
  const h = hex.startsWith("#") ? hex : `#${hex}`;
  return /^#[0-9A-Fa-f]{6}$/i.test(h) ? h.toLowerCase() : "#000000";
}

function initialsFromTeam(team: { abbreviation: string | null; full_name: string }): string {
  const abbr = team.abbreviation?.trim();
  if (abbr && abbr.length >= 1) return abbr.slice(0, 2).toUpperCase();
  const name = team.full_name.trim();
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0]?.[0];
    const b = parts[parts.length - 1]?.[0];
    if (a && b) return (a + b).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "—";
}

function genderBadgeLabel(gender: string | null): string {
  if (!gender) return "—";
  const g = gender.trim().toLowerCase();
  if (g === "male" || g === "m" || g === "masculino") return "Masculino";
  if (g === "female" || g === "f" || g === "feminino") return "Feminino";
  return gender;
}

function genderMatchesForm(form: "male" | "female", db: string | null): boolean {
  const g = String(db ?? "").toLowerCase();
  if (form === "male") return g === "male" || g === "m" || g === "masculino";
  return g === "female" || g === "f" || g === "feminino";
}

export default function EquipeHubPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<"informacao" | "elenco" | "jogos">("informacao");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  // Informação
  const [venues, setVenues] = useState<VenueOption[]>([]);
  const [siblingTeams, setSiblingTeams] = useState<TeamOption[]>([]);
  const [fullName, setFullName] = useState("");
  const [shortName, setShortName] = useState("");
  const [abbreviation, setAbbreviation] = useState("");
  const [foundedYear, setFoundedYear] = useState<string>("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [homeVenueId, setHomeVenueId] = useState<string>("");
  const [parentTeamId, setParentTeamId] = useState<string>("");
  const [primaryColor, setPrimaryColor] = useState("#000000");
  const [secondaryColor, setSecondaryColor] = useState("#000000");
  const [tertiaryColor, setTertiaryColor] = useState("#000000");
  const [displayLogoUrl, setDisplayLogoUrl] = useState<string | null>(null);
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Elenco
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loadingAthletes, setLoadingAthletes] = useState(false);

  // Jogos
  const [matches, setMatches] = useState<Match[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  const loadTeamAndOptions = useCallback(async () => {
    if (!id) { setLoadError("ID inválido."); setLoadingData(false); return; }
    setLoadingData(true);
    setLoadError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); setLoadingData(false); return; }

    const { data: profile } = await supabase
      .from("user_profiles").select("organization_id")
      .eq("auth_user_id", user.id).maybeSingle();

    if (!profile?.organization_id) { setLoadError("Organização não encontrada."); setLoadingData(false); return; }

    const { data: teamRow, error: teamErr } = await supabase
      .from("teams").select("*").eq("id", id).maybeSingle();

    if (teamErr || !teamRow) { setLoadError("Equipe não encontrada."); setLoadingData(false); return; }

    const team = teamRow as TeamRow;
    if (team.organization_id !== profile.organization_id) { setLoadError("Equipe não encontrada."); setLoadingData(false); return; }

    const [{ data: venuesData }, { data: othersData }] = await Promise.all([
      supabase.from("venues").select("id, full_name").eq("organization_id", profile.organization_id).order("full_name"),
      supabase.from("teams").select("id, full_name, gender").eq("organization_id", profile.organization_id).neq("id", id).order("full_name"),
    ]);

    setVenues((venuesData ?? []) as VenueOption[]);
    setSiblingTeams((othersData ?? []) as TeamOption[]);
    setFullName(team.full_name ?? "");
    setShortName(team.short_name ?? "");
    setAbbreviation(team.abbreviation ?? "");
    setFoundedYear(team.founded_year != null && Number.isFinite(team.founded_year) ? String(team.founded_year) : "");
    const gRaw = String(team.gender ?? "").toLowerCase();
    setGender(gRaw === "female" || gRaw === "f" || gRaw === "feminino" ? "female" : "male");
    setHomeVenueId(team.home_venue_id ?? "");
    setParentTeamId(typeof team.parent_team_id === "string" ? team.parent_team_id : "");
    setPrimaryColor(colorInputValue(team.primary_color));
    setSecondaryColor(colorInputValue(team.secondary_color));
    setTertiaryColor(colorInputValue(team.tertiary_color));
    setDisplayLogoUrl(team.logo_url);
    setPendingLogoFile(null);
    setPreviewObjectUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    setLoadingData(false);
  }, [id, router]);

  async function loadAthletes() {
    setLoadingAthletes(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("athlete_team_stints")
      .select("athletes(id, full_name, surname, photo_url, position_id, player_positions(id, full_name, abbreviation, display_order))")
      .eq("team_id", id)
      .eq("is_current", true);
    const list = (data ?? []).map((s: any) => ({
      ...s.athletes,
      position: s.athletes?.player_positions ?? null,
    })).filter(Boolean);
    setAthletes(list);
    setLoadingAthletes(false);
  }

  async function loadMatches() {
    setLoadingMatches(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("matches")
      .select("id, match_date, status, score_a, score_b, team_a_id, team_b_id, teams_a:teams!matches_team_a_id_fkey(full_name, abbreviation, logo_url), teams_b:teams!matches_team_b_id_fkey(full_name, abbreviation, logo_url), phases(competition_editions(competitions(full_name)))")
      .or(`team_a_id.eq.${id},team_b_id.eq.${id}`)
      .order("match_date", { ascending: false })
      .limit(30);
    setMatches((data as any) ?? []);
    setLoadingMatches(false);
  }

  useEffect(() => { void loadTeamAndOptions(); }, [loadTeamAndOptions]);

  useEffect(() => {
    if (activeTab === "elenco" && athletes.length === 0) loadAthletes();
    if (activeTab === "jogos" && matches.length === 0) loadMatches();
  }, [activeTab]);

  useEffect(() => {
    if (!parentTeamId) return;
    const stillValid = siblingTeams.some(t => t.id === parentTeamId && genderMatchesForm(gender, t.gender));
    if (!stillValid) setParentTeamId("");
  }, [gender, parentTeamId, siblingTeams]);

  useEffect(() => {
    return () => { if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl); };
  }, [previewObjectUrl]);

  function handleLogoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setPreviewObjectUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    if (!f) { setPendingLogoFile(null); return; }
    setPendingLogoFile(f);
    setPreviewObjectUrl(URL.createObjectURL(f));
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("full_name", fullName.trim());
      fd.append("short_name", shortName.trim());
      fd.append("abbreviation", abbreviation.trim().slice(0, 3));
      fd.append("founded_year", foundedYear.trim());
      fd.append("gender", gender);
      fd.append("home_venue_id", homeVenueId);
      fd.append("parent_team_id", parentTeamId);
      fd.append("primary_color", primaryColor);
      fd.append("secondary_color", secondaryColor);
      fd.append("tertiary_color", tertiaryColor);
      if (pendingLogoFile) fd.append("logo", pendingLogoFile);
      const result = await editarEquipe(id, fd);
      if ("error" in result) { toast("error", result.error); return; }
      toast("success", "Alterações salvas com sucesso.");
      await loadTeamAndOptions();
    } finally {
      setSaving(false);
    }
  }

  const headerLogoSrc = previewObjectUrl ?? displayLogoUrl;
  const parentOptions = siblingTeams.filter(t => genderMatchesForm(gender, t.gender));
  const inputClass = "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]";
  const inputStyle = { borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" };

  // Agrupa atletas por posição
  const athletesByPosition: Record<string, { posLabel: string; order: number; athletes: Athlete[] }> = {};
  athletes.forEach(a => {
    const key = a.position?.id ?? "sem-posicao";
    const label = a.position?.full_name ?? "Sem posição";
    const order = a.position?.display_order ?? 99;
    if (!athletesByPosition[key]) athletesByPosition[key] = { posLabel: label, order, athletes: [] };
    athletesByPosition[key].athletes.push(a);
  });
  const positionGroups = Object.values(athletesByPosition).sort((a, b) => a.order - b.order);

  if (loadingData) return <div className="p-8" style={{ color: "var(--color-text-secondary)" }}>Carregando…</div>;
  if (loadError) return <div className="p-8" style={{ color: "var(--color-text-primary)" }}>{loadError}</div>;

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "var(--color-background)" }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
        <div className="px-8 pt-6 pb-0">
          <Breadcrumb items={[{ label: "Equipes", href: "/equipes" }, { label: fullName || "Equipe" }]} />

          <div className="mb-4 flex items-center gap-4">
            {headerLogoSrc ? (
              <img src={headerLogoSrc} alt="" className="h-14 w-14 shrink-0 rounded-xl border object-contain"
                style={{ borderColor: "var(--color-border)" }} />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border font-display text-lg font-bold"
                style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" }}>
                {initialsFromTeam({ abbreviation, full_name: fullName })}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-2xl font-bold truncate" style={{ color: "var(--color-text-primary)" }}>
                {fullName || "Equipe"}
              </h1>
              <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                {genderBadgeLabel(gender)}
              </span>
            </div>
            {activeTab === "informacao" && (
              <button type="submit" form="form-editar-equipe" disabled={saving}
                className="shrink-0 rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
                {saving ? "Salvando…" : "Salvar alterações"}
              </button>
            )}
          </div>

          {/* Abas */}
          <div className="flex gap-6">
            {[
              { key: "informacao", label: "INFORMAÇÃO" },
              { key: "elenco", label: "ELENCO" },
              { key: "jogos", label: "JOGOS" },
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

        {/* ABA INFORMAÇÃO */}
        {activeTab === "informacao" && (
          <form id="form-editar-equipe" onSubmit={handleSubmit}>
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Identidade */}
              <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
                <h2 className="mb-4 font-mono text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
                  Identidade
                </h2>
                <div className="mb-4 flex justify-center">
                  {headerLogoSrc ? (
                    <img src={headerLogoSrc} alt="" className="h-28 w-28 rounded-xl border object-contain" style={{ borderColor: "var(--color-border)" }} />
                  ) : (
                    <div className="flex h-28 w-28 items-center justify-center rounded-xl border text-xl font-bold"
                      style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" }}>
                      {initialsFromTeam({ abbreviation, full_name: fullName })}
                    </div>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/png,image/webp,image/svg+xml" className="hidden" onChange={handleLogoFileChange} />
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="mb-6 w-full rounded-lg border px-3 py-2 text-sm font-medium"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}>
                  Trocar logo
                </button>
                <div className="flex flex-wrap gap-6">
                  {([
                    ["primary_color", primaryColor, setPrimaryColor],
                    ["secondary_color", secondaryColor, setSecondaryColor],
                    ["tertiary_color", tertiaryColor, setTertiaryColor],
                  ] as const).map(([key, value, setVal]) => (
                    <label key={key} className="flex flex-col items-center gap-2" style={{ color: "var(--color-text-secondary)" }}>
                      <span className="relative h-10 w-10 overflow-hidden rounded-full border-2" style={{ borderColor: "var(--color-border)" }}>
                        <input type="color" value={value} onChange={(e) => setVal(e.target.value)}
                          className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
                        <span className="pointer-events-none block h-full w-full" style={{ backgroundColor: value }} />
                      </span>
                      <span className="font-mono text-xs">{value}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Dados */}
              <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
                <h2 className="mb-4 font-mono text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
                  Dados
                </h2>
                <div className="flex flex-col gap-4">
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Nome completo</span>
                    <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} className={inputClass} style={inputStyle} />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Nome curto</span>
                    <input type="text" value={shortName} onChange={e => setShortName(e.target.value)} className={inputClass} style={inputStyle} />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Sigla</span>
                    <input type="text" maxLength={3} value={abbreviation}
                      onChange={e => setAbbreviation(e.target.value.slice(0, 3).toUpperCase())}
                      className={`${inputClass} uppercase`} style={inputStyle} />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Ano de fundação</span>
                    <input type="number" value={foundedYear} onChange={e => setFoundedYear(e.target.value)} className={inputClass} style={inputStyle} />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Gênero</span>
                    <select value={gender} onChange={e => setGender(e.target.value as "male" | "female")} className={inputClass} style={inputStyle}>
                      <option value="male">Masculino</option>
                      <option value="female">Feminino</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Local</span>
                    <select value={homeVenueId} onChange={e => setHomeVenueId(e.target.value)} className={inputClass} style={inputStyle}>
                      <option value="">Nenhum</option>
                      {venues.map(v => <option key={v.id} value={v.id}>{v.full_name}</option>)}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Seção feminina / masculina de</span>
                    <select value={parentTeamId} onChange={e => setParentTeamId(e.target.value)} className={inputClass} style={inputStyle}>
                      <option value="">Nenhum</option>
                      {parentOptions.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                    </select>
                  </label>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* ABA ELENCO */}
        {activeTab === "elenco" && (
          <div>
            {loadingAthletes ? (
              <p className="font-mono text-sm" style={{ color: "#A6A6A6" }}>Carregando…</p>
            ) : athletes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="font-display text-xl" style={{ color: "var(--color-text-primary)" }}>Elenco vazio</p>
                <p className="mt-2 font-mono text-sm" style={{ color: "#A6A6A6" }}>
                  Nenhum atleta vinculado a esta equipe.
                </p>
                <Link href="/atletas" className="mt-4 font-mono text-sm" style={{ color: "var(--color-brand)" }}>
                  Ir para atletas →
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {positionGroups.map(group => (
                  <div key={group.posLabel}>
                    <p className="mb-3 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
                      {group.posLabel} ({group.athletes.length})
                    </p>
                    <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
                      {group.athletes.map((athlete, idx) => (
                        <Link key={athlete.id} href={`/atletas/${athlete.id}`}
                          className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-[rgba(255,255,255,0.03)]"
                          style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none" }}>
                          {athlete.photo_url ? (
                            <img src={athlete.photo_url} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                              style={{ backgroundColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                              {(athlete.surname ?? athlete.full_name).slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate" style={{ color: "var(--color-text-primary)" }}>
                              {athlete.surname ?? athlete.full_name}
                            </p>
                            <p className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                              {athlete.full_name}
                            </p>
                          </div>
                          <ChevronRight size={14} style={{ color: "#555" }} />
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ABA JOGOS */}
        {activeTab === "jogos" && (
          <div>
            {loadingMatches ? (
              <p className="font-mono text-sm" style={{ color: "#A6A6A6" }}>Carregando…</p>
            ) : matches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="font-display text-xl" style={{ color: "var(--color-text-primary)" }}>Sem partidas</p>
                <p className="mt-2 font-mono text-sm" style={{ color: "#A6A6A6" }}>
                  Nenhuma partida registrada para esta equipe.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
                {matches.map((m, idx) => {
                  const isHome = m.team_a_id === id;
                  const opponent = isHome ? m.teams_b : m.teams_a;
                  const myScore = isHome ? m.score_a : m.score_b;
                  const oppScore = isHome ? m.score_b : m.score_a;
                  const compName = (m.phases as any)?.competition_editions?.competitions?.full_name ?? "—";

                  return (
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
                      <div className="flex flex-1 items-center gap-3 min-w-0">
                        {opponent?.logo_url ? (
                          <img src={opponent.logo_url} alt="" className="h-8 w-8 rounded object-contain shrink-0" />
                        ) : (
                          <div className="h-8 w-8 shrink-0 rounded" style={{ backgroundColor: "var(--color-border)" }} />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
                            {isHome ? "vs" : "@"} {opponent?.full_name ?? "A definir"}
                          </p>
                          <p className="font-mono text-xs truncate" style={{ color: "var(--color-text-secondary)" }}>
                            {compName}
                          </p>
                        </div>
                      </div>
                      {m.status !== "scheduled" && (
                        <div className="shrink-0 text-right">
                          <p className="font-display text-lg font-bold" style={{
                            color: myScore > oppScore ? "var(--color-brand)" : myScore < oppScore ? "var(--color-danger)" : "var(--color-text-secondary)"
                          }}>
                            {myScore} — {oppScore}
                          </p>
                        </div>
                      )}
                      <ChevronRight size={14} style={{ color: "#555" }} />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}