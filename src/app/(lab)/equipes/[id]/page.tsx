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
import { ChevronRight, Camera } from "lucide-react";

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
  teams_a: { full_name: string; abbreviation: string | null; logo_url: string | null; primary_color: string | null } | null;
  teams_b: { full_name: string; abbreviation: string | null; logo_url: string | null; primary_color: string | null } | null;
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
    const a = parts[0]?.[0]; const b = parts[parts.length - 1]?.[0];
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

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
      <div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase" as const, color: "#BFF205" }}>{title}</span>
        {subtitle && <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.25)", marginTop: 1 }}>{subtitle}</p>}
      </div>
      <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, rgba(191,242,5,0.3), transparent)" }} />
    </div>
  );
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
    setLoadingData(true); setLoadError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); setLoadingData(false); return; }
    const { data: profile } = await supabase.from("user_profiles").select("organization_id").eq("auth_user_id", user.id).maybeSingle();
    if (!profile?.organization_id) { setLoadError("Organização não encontrada."); setLoadingData(false); return; }
    const { data: teamRow, error: teamErr } = await supabase.from("teams").select("*").eq("id", id).maybeSingle();
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
      .eq("team_id", id).eq("is_current", true);
    const list = (data ?? []).map((s: any) => ({ ...s.athletes, position: s.athletes?.player_positions ?? null })).filter(Boolean);
    setAthletes(list);
    setLoadingAthletes(false);
  }

  async function loadMatches() {
    setLoadingMatches(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("matches")
      .select("id, match_date, status, score_a, score_b, team_a_id, team_b_id, teams_a:teams!matches_team_a_id_fkey(full_name, abbreviation, logo_url, primary_color), teams_b:teams!matches_team_b_id_fkey(full_name, abbreviation, logo_url, primary_color), phases(competition_editions(competitions(full_name)))")
      .or(`team_a_id.eq.${id},team_b_id.eq.${id}`)
      .order("match_date", { ascending: false }).limit(30);
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
  useEffect(() => { return () => { if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl); }; }, [previewObjectUrl]);

  function handleLogoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setPreviewObjectUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    if (!f) { setPendingLogoFile(null); return; }
    setPendingLogoFile(f);
    setPreviewObjectUrl(URL.createObjectURL(f));
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault(); setSaving(true);
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
    } finally { setSaving(false); }
  }

  const headerLogoSrc = previewObjectUrl ?? displayLogoUrl;
  const parentOptions = siblingTeams.filter(t => genderMatchesForm(gender, t.gender));

  // Agrupamento por posição
  const athletesByPosition: Record<string, { posLabel: string; order: number; athletes: Athlete[] }> = {};
  athletes.forEach(a => {
    const key = a.position?.id ?? "sem-posicao";
    const label = a.position?.full_name ?? "Sem posição";
    const order = a.position?.display_order ?? 99;
    if (!athletesByPosition[key]) athletesByPosition[key] = { posLabel: label, order, athletes: [] };
    athletesByPosition[key].athletes.push(a);
  });
  const positionGroups = Object.values(athletesByPosition).sort((a, b) => a.order - b.order);

  // Cores para uso no header
  const teamColor = primaryColor !== "#000000" ? primaryColor : null;
  const border = "1px solid rgba(255,255,255,0.08)";

  const inputBaseStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    backgroundColor: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 9,
    fontFamily: "var(--font-mono)",
    fontSize: 12,
    color: "var(--color-text-primary)",
    outline: "none",
    transition: "border-color 0.15s",
  };

  if (loadingData) return (
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
        {/* Degradê com a cor do time */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: teamColor
            ? `linear-gradient(135deg, ${teamColor}22 0%, transparent 55%)`
            : `linear-gradient(135deg, rgba(191,242,5,0.06) 0%, transparent 55%)`,
        }} />
        <div style={{ position: "absolute", inset: 0, backgroundColor: "var(--color-surface)", opacity: 0.85, pointerEvents: "none" }} />

        <div style={{ padding: "20px 32px 0", position: "relative", zIndex: 1 }}>
          <Breadcrumb items={[{ label: "Equipes", href: "/equipes" }, { label: fullName || "Equipe" }]} />

          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
            {/* Logo */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div style={{
                width: 60, height: 60, borderRadius: 14, overflow: "hidden",
                border: `2px solid ${teamColor ? teamColor + "55" : "rgba(255,255,255,0.1)"}`,
                backgroundColor: "rgba(255,255,255,0.04)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {headerLogoSrc
                  ? <img src={headerLogoSrc} alt="" style={{ width: 52, height: 52, objectFit: "contain" }} />
                  : <span style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 800, color: teamColor ?? "#BFF205" }}>
                      {initialsFromTeam({ abbreviation, full_name: fullName })}
                    </span>
                }
              </div>
              {/* Botão trocar logo — ícone sobreposto */}
              <button type="button" onClick={() => fileInputRef.current?.click()}
                style={{ position: "absolute", bottom: -4, right: -4, width: 22, height: 22, borderRadius: "50%", backgroundColor: "#BFF205", border: "2px solid var(--color-background)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <Camera size={10} strokeWidth={2.5} color="#0a0a0a" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/png,image/webp,image/svg+xml" style={{ display: "none" }} onChange={handleLogoFileChange} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Pills de metadados */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" as const }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", padding: "2px 8px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", backgroundColor: "rgba(255,255,255,0.04)" }}>
                  {genderBadgeLabel(gender)}
                </span>
                {foundedYear && (
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", padding: "2px 8px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.25)" }}>
                    Est. {foundedYear}
                  </span>
                )}
                {/* Swatches de cores */}
                <div style={{ display: "flex", gap: 4, marginLeft: 4 }}>
                  {[primaryColor, secondaryColor, tertiaryColor].filter(c => c && c !== "#000000").map((c, i) => (
                    <div key={i} style={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: c, border: "1px solid rgba(255,255,255,0.15)" }} />
                  ))}
                </div>
              </div>

              {/* Nome */}
              <h1 style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 900, color: "var(--color-text-primary)", letterSpacing: "0.01em", lineHeight: 1.1, margin: 0 }}>
                {fullName || "Equipe"}
              </h1>
              {abbreviation && (
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: teamColor ?? "rgba(255,255,255,0.3)", marginTop: 2 }}>
                  {abbreviation}
                </p>
              )}
            </div>

            {/* Botão salvar — só na aba informação */}
            {activeTab === "informacao" && (
              <button type="submit" form="form-editar-equipe" disabled={saving}
                style={{ flexShrink: 0, padding: "9px 22px", borderRadius: 9, border: "none", cursor: saving ? "not-allowed" : "pointer", backgroundColor: saving ? "rgba(191,242,5,0.3)" : "#BFF205", color: "#0a0a0a", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" as const, transition: "opacity 0.12s", opacity: saving ? 0.6 : 1 }}>
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
              { key: "informacao", label: "INFORMAÇÃO" },
              { key: "elenco", label: "ELENCO" },
              { key: "jogos", label: "JOGOS" },
            ].map(tab => (
              <button key={tab.key} type="button"
                onClick={() => setActiveTab(tab.key as any)}
                style={{ padding: "11px 18px", border: "none", borderBottom: `2px solid ${activeTab === tab.key ? (teamColor ?? "#BFF205") : "transparent"}`, backgroundColor: "transparent", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", color: activeTab === tab.key ? (teamColor ?? "#BFF205") : "#666", cursor: "pointer", transition: "color 0.12s" }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Conteúdo ────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, padding: "24px 32px" }}>

        {/* ── ABA INFORMAÇÃO ───────────────────────────────────────────── */}
        {activeTab === "informacao" && (
          <form id="form-editar-equipe" onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, maxWidth: 860 }}>

              {/* Card Identidade Visual */}
              <div style={{ borderRadius: 14, border, backgroundColor: "var(--color-surface)", padding: "20px 20px 24px" }}>
                <SectionHeader title="Identidade visual" />

                {/* Preview logo grande */}
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{ width: 100, height: 100, borderRadius: 18, border: `2px dashed ${teamColor ? teamColor + "55" : "rgba(255,255,255,0.12)"}`, backgroundColor: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "border-color 0.15s", overflow: "hidden" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = teamColor ? teamColor + "99" : "rgba(191,242,5,0.4)"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = teamColor ? teamColor + "55" : "rgba(255,255,255,0.12)"}>
                    {headerLogoSrc
                      ? <img src={headerLogoSrc} alt="" style={{ width: 88, height: 88, objectFit: "contain" }} />
                      : <div style={{ textAlign: "center" as const }}>
                          <Camera size={20} color="rgba(255,255,255,0.2)" />
                          <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.2)", marginTop: 4 }}>Trocar logo</p>
                        </div>
                    }
                  </div>
                </div>

                <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.2)", textAlign: "center" as const, marginBottom: 20 }}>
                  PNG, WebP ou SVG
                </p>

                {/* Cores */}
                <SectionHeader title="Cores do time" />
                <div style={{ display: "flex", gap: 12 }}>
                  {([
                    { label: "Primária", val: primaryColor, set: setPrimaryColor },
                    { label: "Secundária", val: secondaryColor, set: setSecondaryColor },
                    { label: "Terciária", val: tertiaryColor, set: setTertiaryColor },
                  ] as const).map(({ label, val, set }) => (
                    <label key={label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer" }}>
                      <div style={{ position: "relative", width: 44, height: 44, borderRadius: "50%", overflow: "hidden", border: "2px solid rgba(255,255,255,0.1)", cursor: "pointer" }}>
                        <input type="color" value={val} onChange={e => set(e.target.value)}
                          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", cursor: "pointer", opacity: 0 }} />
                        <span style={{ pointerEvents: "none", display: "block", width: "100%", height: "100%", backgroundColor: val }} />
                      </div>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em", textTransform: "uppercase" as const }}>{label}</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: val !== "#000000" ? val : "rgba(255,255,255,0.2)" }}>{val}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Card Dados */}
              <div style={{ borderRadius: 14, border, backgroundColor: "var(--color-surface)", padding: "20px 20px 24px" }}>
                <SectionHeader title="Dados da equipe" />
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                  {/* Nome completo */}
                  <div>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 5 }}>Nome completo *</span>
                    <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)}
                      style={inputBaseStyle}
                      onFocus={e => e.target.style.borderColor = "rgba(191,242,5,0.4)"}
                      onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"} />
                  </div>

                  {/* Nome curto + Sigla */}
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
                    <div>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 5 }}>Nome curto</span>
                      <input type="text" value={shortName} onChange={e => setShortName(e.target.value)}
                        style={inputBaseStyle}
                        onFocus={e => e.target.style.borderColor = "rgba(191,242,5,0.4)"}
                        onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"} />
                    </div>
                    <div>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 5 }}>Sigla</span>
                      <input type="text" maxLength={3} value={abbreviation}
                        onChange={e => setAbbreviation(e.target.value.slice(0, 3).toUpperCase())}
                        style={{ ...inputBaseStyle, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.1em", textAlign: "center" as const }}
                        onFocus={e => e.target.style.borderColor = "rgba(191,242,5,0.4)"}
                        onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"} />
                    </div>
                  </div>

                  {/* Gênero — pill buttons */}
                  <div>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 7 }}>Gênero</span>
                    <div style={{ display: "flex", gap: 8 }}>
                      {(["male", "female"] as const).map(g => (
                        <button key={g} type="button" onClick={() => setGender(g)}
                          style={{ flex: 1, padding: "8px 0", borderRadius: 9, border: `1px solid ${gender === g ? "rgba(191,242,5,0.4)" : "rgba(255,255,255,0.08)"}`, backgroundColor: gender === g ? "rgba(191,242,5,0.08)" : "transparent", color: gender === g ? "#BFF205" : "rgba(255,255,255,0.4)", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all 0.12s" }}>
                          {g === "male" ? "Masculino" : "Feminino"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Ano de fundação + Local */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
                    <div>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 5 }}>Fundação</span>
                      <input type="number" value={foundedYear} onChange={e => setFoundedYear(e.target.value)}
                        placeholder="—"
                        style={{ ...inputBaseStyle, textAlign: "center" as const }}
                        onFocus={e => e.target.style.borderColor = "rgba(191,242,5,0.4)"}
                        onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"} />
                    </div>
                    <div>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 5 }}>Estádio / local</span>
                      <select value={homeVenueId} onChange={e => setHomeVenueId(e.target.value)}
                        style={{ ...inputBaseStyle, cursor: "pointer", colorScheme: "dark" as any }}>
                        <option value="">—</option>
                        {venues.map(v => <option key={v.id} value={v.id}>{v.full_name}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Time pai */}
                  <div>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 5 }}>Seção de</span>
                    <select value={parentTeamId} onChange={e => setParentTeamId(e.target.value)}
                      style={{ ...inputBaseStyle, cursor: "pointer", colorScheme: "dark" as any }}>
                      <option value="">Nenhum</option>
                      {parentOptions.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* ── ABA ELENCO ───────────────────────────────────────────────── */}
        {activeTab === "elenco" && (
          <div style={{ maxWidth: 640 }}>
            {loadingAthletes ? (
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Carregando…</p>
            ) : athletes.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", textAlign: "center" as const }}>
                <div style={{ width: 56, height: 56, borderRadius: 14, border: "1px dashed rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <span style={{ fontSize: 22 }}>👥</span>
                </div>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>Elenco vazio</p>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 6 }}>Nenhum atleta vinculado a esta equipe.</p>
                <Link href="/atletas" style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#BFF205", marginTop: 16, textDecoration: "none" }}>
                  Ir para atletas →
                </Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {positionGroups.map(group => (
                  <div key={group.posLabel}>
                    {/* Header do grupo de posição */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase" as const, color: teamColor ?? "#BFF205" }}>
                        {group.posLabel}
                      </span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.2)" }}>
                        {group.athletes.length}
                      </span>
                      <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, ${teamColor ? teamColor + "40" : "rgba(191,242,5,0.2)"}, transparent)` }} />
                    </div>

                    <div style={{ borderRadius: 12, border, backgroundColor: "var(--color-surface)", overflow: "hidden" }}>
                      {group.athletes.map((athlete, idx) => (
                        <Link key={athlete.id} href={`/atletas/${athlete.id}`}
                          style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", textDecoration: "none", borderTop: idx > 0 ? "1px solid rgba(255,255,255,0.06)" : "none", transition: "background 0.1s", opacity: 0.85 }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.03)"; (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; (e.currentTarget as HTMLElement).style.opacity = "0.85"; }}>

                          {/* Avatar */}
                          <div style={{ width: 38, height: 38, borderRadius: "50%", overflow: "hidden", border: `2px solid ${teamColor ? teamColor + "44" : "rgba(191,242,5,0.2)"}`, flexShrink: 0 }}>
                            {athlete.photo_url
                              ? <img src={athlete.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              : <div style={{ width: "100%", height: "100%", backgroundColor: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)" }}>
                                  {(athlete.surname ?? athlete.full_name).slice(0, 2).toUpperCase()}
                                </div>
                            }
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                              {athlete.surname ?? athlete.full_name}
                            </p>
                            {athlete.surname && (
                              <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.3)", margin: 0, marginTop: 1 }}>
                                {athlete.full_name}
                              </p>
                            )}
                          </div>

                          <ChevronRight size={13} style={{ color: "rgba(255,255,255,0.2)", flexShrink: 0 }} />
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ABA JOGOS ───────────────────────────────────────────────── */}
        {activeTab === "jogos" && (
          <div style={{ maxWidth: 760 }}>
            {loadingMatches ? (
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Carregando…</p>
            ) : matches.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", textAlign: "center" as const }}>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>Sem partidas</p>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 6 }}>Nenhuma partida registrada para esta equipe.</p>
              </div>
            ) : (
              <div style={{ borderRadius: 12, border, backgroundColor: "var(--color-surface)", overflow: "hidden" }}>
                {matches.map((m, idx) => {
                  const isHome = m.team_a_id === id;
                  const opponent = isHome ? m.teams_b : m.teams_a;
                  const myScore = isHome ? m.score_a : m.score_b;
                  const oppScore = isHome ? m.score_b : m.score_a;
                  const compName = (m.phases as any)?.competition_editions?.competitions?.full_name ?? "—";
                  const isScheduled = m.status === "scheduled";
                  const oppColor = opponent?.primary_color ?? null;
                  const won = myScore > oppScore;
                  const lost = myScore < oppScore;

                  return (
                    <MatchRowEquipe
                      key={m.id}
                      matchId={m.id}
                      idx={idx}
                      isHome={isHome}
                      opponent={opponent}
                      myScore={myScore}
                      oppScore={oppScore}
                      compName={compName}
                      matchDate={m.match_date}
                      status={m.status}
                      teamColor={teamColor}
                    />
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

// ─── MatchRowEquipe ──────────────────────────────────────────────────────────

function MatchRowEquipe({ matchId, idx, isHome, opponent, myScore, oppScore, compName, matchDate, status, teamColor }: {
  matchId: string;
  idx: number;
  isHome: boolean;
  opponent: { full_name: string; abbreviation: string | null; logo_url: string | null; primary_color: string | null } | null;
  myScore: number;
  oppScore: number;
  compName: string;
  matchDate: string | null;
  status: string;
  teamColor: string | null;
}) {
  const [hovered, setHovered] = useState(false);
  const isScheduled = status === "scheduled";
  const won = !isScheduled && myScore > oppScore;
  const lost = !isScheduled && myScore < oppScore;
  const drew = !isScheduled && myScore === oppScore;
  const resultColor = won ? "#BFF205" : lost ? "#FF4444" : "rgba(255,255,255,0.4)";
  const oppColor = opponent?.primary_color ?? null;

  return (
    <Link href={`/partidas/${matchId}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", gap: 14, padding: "0 18px", height: 60,
        textDecoration: "none", borderTop: idx > 0 ? "1px solid rgba(255,255,255,0.06)" : "none",
        backgroundColor: hovered ? "rgba(255,255,255,0.025)" : "transparent",
        transition: "background 0.1s", position: "relative" as const,
        opacity: hovered ? 1 : 0.82,
      }}>
      {/* Faixa colorida no hover */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 1,
        background: hovered ? `linear-gradient(90deg, ${teamColor ?? "#BFF205"}80 0%, ${oppColor ? oppColor + "80" : "transparent"} 100%)` : "transparent",
        transition: "opacity 0.2s", pointerEvents: "none",
      }} />

      {/* Data + status */}
      <div style={{ width: 48, flexShrink: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: STATUS_COLOR[status] ?? "#A6A6A6" }}>
          {STATUS_LABEL[status] ?? status.toUpperCase()}
        </span>
        {matchDate && (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.2)" }}>
            {new Date(matchDate + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
          </span>
        )}
      </div>

      <div style={{ width: 1, height: 20, backgroundColor: "rgba(255,255,255,0.07)", flexShrink: 0 }} />

      {/* Adversário */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <div style={{ width: 32, height: 32, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {opponent?.logo_url
            ? <img src={opponent.logo_url} alt="" style={{ width: 30, height: 30, objectFit: "contain" }} />
            : <div style={{ width: 30, height: 30, borderRadius: 7, backgroundColor: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.3)" }}>
                  {(opponent?.abbreviation ?? opponent?.full_name ?? "?").slice(0, 2).toUpperCase()}
                </span>
              </div>
          }
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginRight: 4 }}>{isHome ? "vs" : "@"}</span>
            {opponent?.full_name ?? "A definir"}
          </p>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.25)", margin: 0, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
            {compName}
          </p>
        </div>
      </div>

      {/* Placar */}
      {!isScheduled && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {/* Badge W/D/L */}
          <div style={{ width: 18, height: 18, borderRadius: 4, backgroundColor: won ? "rgba(191,242,5,0.15)" : lost ? "rgba(255,68,68,0.15)" : "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 800, color: resultColor }}>
              {won ? "V" : lost ? "D" : "E"}
            </span>
          </div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700, color: resultColor, lineHeight: 1 }}>
            {myScore}–{oppScore}
          </span>
        </div>
      )}

      <ChevronRight size={12} style={{ color: "rgba(255,255,255,0.15)", flexShrink: 0 }} />
    </Link>
  );
}