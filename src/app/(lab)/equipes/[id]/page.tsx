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
  useState,
} from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { LabPicker } from "@/app/(lab)/components/lab-picker";
import { EquipeColorPicker } from "./equipe-color-picker";
import { EquipeLogoUpload } from "./equipe-logo-upload";
import { GenderSwitch } from "./gender-switch";
import { YearRollPicker } from "./year-roll-picker";
import { PersonAvatarPlaceholder } from "@/app/(lab)/components/person-avatar-placeholder";
import styles from "./equipe-hub.module.css";

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
  is_hidden?: boolean | null;
  is_virtual?: boolean | null;
};

type VenueOption = { id: string; full_name: string };
type Athlete = {
  id: string;
  full_name: string;
  surname: string | null;
  photo_url: string | null;
  position_id: string | null;
  position: { id: string; full_name: string; abbreviation: string; display_order: number } | null;
};
type StaffMember = {
  id: string;
  full_name: string;
  surname: string | null;
  photo_url: string | null;
  role: { full_name: string } | null;
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
  scheduled: "var(--color-text-secondary)", ongoing: "var(--color-brand)", finished: "var(--color-text-secondary)", postponed: "var(--color-danger)",
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

function displayNickname(surname: string | null, fullName: string): string {
  return (surname?.trim() || fullName).toUpperCase();
}

function sortByNickname<T extends { surname: string | null; full_name: string }>(a: T, b: T): number {
  return displayNickname(a.surname, a.full_name).localeCompare(displayNickname(b.surname, b.full_name), "pt-BR");
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className={styles.sectionHeader}>
      <div>
        <p className={styles.sectionTitle}>{title}</p>
        {subtitle && <p className={styles.sectionSubtitle}>{subtitle}</p>}
      </div>
      <div className={styles.sectionLine} />
    </div>
  );
}

export default function EquipeHubPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";

  const [activeTab, setActiveTab] = useState<"informacao" | "elenco">("informacao");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  // Informação
  const [venues, setVenues] = useState<VenueOption[]>([]);
  const [fullName, setFullName] = useState("");
  const [shortName, setShortName] = useState("");
  const [abbreviation, setAbbreviation] = useState("");
  const [foundedYear, setFoundedYear] = useState<string>("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [homeVenueId, setHomeVenueId] = useState<string>("");
  const [parentTeamId, setParentTeamId] = useState<string>("");
  const [isHidden, setIsHidden] = useState(false);
  const [primaryColor, setPrimaryColor] = useState("#000000");
  const [secondaryColor, setSecondaryColor] = useState("#000000");
  const [tertiaryColor, setTertiaryColor] = useState("#000000");
  const [displayLogoUrl, setDisplayLogoUrl] = useState<string | null>(null);
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [genderLocked, setGenderLocked] = useState(false);
  const [isVirtual, setIsVirtual] = useState(false);

  // Elenco
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loadingAthletes, setLoadingAthletes] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [elencoLoaded, setElencoLoaded] = useState(false);

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
    const { data: venuesData } = await supabase
      .from("venues")
      .select("id, full_name")
      .eq("organization_id", profile.organization_id)
      .order("full_name");
    const [
      { count: athleteStintCount },
      { count: matchCount },
      { count: editionCount },
    ] = await Promise.all([
      supabase.from("athlete_team_stints").select("id", { count: "exact", head: true }).eq("team_id", id),
      supabase.from("matches").select("id", { count: "exact", head: true }).or(`team_a_id.eq.${id},team_b_id.eq.${id}`),
      supabase.from("edition_teams").select("id", { count: "exact", head: true }).eq("team_id", id),
    ]);
    setGenderLocked(
      (athleteStintCount ?? 0) > 0
      || (matchCount ?? 0) > 0
      || (editionCount ?? 0) > 0,
    );
    setIsVirtual(!!team.is_virtual);
    setVenues((venuesData ?? []) as VenueOption[]);
    setFullName(team.full_name ?? "");
    setShortName(team.short_name ?? "");
    setAbbreviation(team.abbreviation ?? "");
    setFoundedYear(team.founded_year != null && Number.isFinite(team.founded_year) ? String(team.founded_year) : "");
    const gRaw = String(team.gender ?? "").toLowerCase();
    setGender(gRaw === "female" || gRaw === "f" || gRaw === "feminino" ? "female" : "male");
    setHomeVenueId(team.home_venue_id ?? "");
    setParentTeamId(typeof team.parent_team_id === "string" ? team.parent_team_id : "");
    setIsHidden(!!team.is_hidden);
    setPrimaryColor(colorInputValue(team.primary_color));
    setSecondaryColor(colorInputValue(team.secondary_color));
    setTertiaryColor(colorInputValue(team.tertiary_color));
    setDisplayLogoUrl(team.logo_url);
    setPendingLogoFile(null);
    setPreviewObjectUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    setLoadingData(false);
  }, [id, router]);

  async function loadElenco() {
    setLoadingAthletes(true);
    setLoadingStaff(true);
    const supabase = createClient();
    const [{ data: athleteData }, { data: staffData }] = await Promise.all([
      supabase
        .from("athlete_team_stints")
        .select("athletes(id, full_name, surname, photo_url, position_id, player_positions(id, full_name, abbreviation, display_order))")
        .eq("team_id", id)
        .eq("is_current", true),
      supabase
        .from("staff_team_stints")
        .select("staff_members(id, full_name, surname, photo_url, staff_roles(full_name))")
        .eq("team_id", id)
        .eq("is_current", true),
    ]);
    const athleteList = (athleteData ?? [])
      .map((s: { athletes: Record<string, unknown> | null }) => {
        const a = s.athletes as (Athlete & { player_positions: Athlete["position"] }) | null;
        if (!a) return null;
        return { ...a, position: a.player_positions ?? null };
      })
      .filter((a): a is Athlete => a !== null)
      .sort(sortByNickname);
    const staffList = (staffData ?? [])
      .map((s: { staff_members: Record<string, unknown> | null }) => {
        const m = s.staff_members as (Omit<StaffMember, "role"> & { staff_roles: StaffMember["role"] }) | null;
        if (!m) return null;
        return { ...m, role: m.staff_roles ?? null };
      })
      .filter((m): m is StaffMember => m !== null)
      .sort(sortByNickname);
    setAthletes(athleteList);
    setStaff(staffList);
    setLoadingAthletes(false);
    setLoadingStaff(false);
    setElencoLoaded(true);
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
  useEffect(() => { setElencoLoaded(false); }, [id]);
  useEffect(() => {
    if (activeTab === "elenco" && !elencoLoaded) void loadElenco();
  }, [activeTab, elencoLoaded, id]);
  useEffect(() => { return () => { if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl); }; }, [previewObjectUrl]);

  function handleLogoChange(file: File | null) {
    setPendingLogoFile(file);
    setPreviewObjectUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    if (isVirtual) return;
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
      fd.append("is_hidden", isHidden ? "true" : "false");
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
  const headerTitle = (shortName.trim() || fullName.trim() || "Equipe").toUpperCase();
  const headerDetail = abbreviation.trim()
    ? `${abbreviation.trim().toUpperCase()}  |  ${fullName.trim() || "—"}`
    : (fullName.trim() || "—");
  const genderCrumbLabel = genderBadgeLabel(gender);
  const venueOptions = venues.map((v) => ({ id: v.id, label: v.full_name }));
  const loadingElenco = loadingAthletes || loadingStaff;

  if (loadingData) return (
    <div className={`${styles.equipeHub} ${styles.loading}`}>
      Carregando…
    </div>
  );
  if (loadError) return (
    <div className={`${styles.equipeHub} ${styles.loading}`} style={{ color: "var(--color-text-primary)" }}>
      {loadError}
    </div>
  );

  return (
    <div className={`${styles.equipeHub} ${styles.page}`}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.headerGlow} />
        <div className={styles.headerSurface} />

        <div className={styles.headerInner}>
          <Breadcrumb items={[
            { label: "Equipes", href: "/equipes" },
            { label: genderCrumbLabel },
            { label: headerTitle },
          ]} />

          <div className={styles.heroRow}>
            <div className={styles.logoSlot}>
              {headerLogoSrc
                ? <img src={headerLogoSrc} alt="" className={styles.logoImg} />
                : <span className={styles.logoInitials}>
                    {initialsFromTeam({ abbreviation, full_name: fullName })}
                  </span>
              }
            </div>

            <div className={styles.heroMeta}>
              <h1 className={styles.title}>{headerTitle}</h1>
              <p className={styles.headerDetail}>{headerDetail}</p>
            </div>

            {activeTab === "informacao" && !isVirtual && (
              <button type="submit" form="form-editar-equipe" disabled={saving} className={styles.saveBtn}>
                {saving ? "Salvando…" : "Salvar"}
              </button>
            )}
          </div>

          <div className={styles.stripe} />

          <div className={styles.tabBar}>
            {[
              { key: "informacao", label: "INFORMAÇÃO" },
              { key: "elenco", label: "ELENCO" },
            ].map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as "informacao" | "elenco")}
                className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ""}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Conteúdo ────────────────────────────────────────────────────── */}
      <div className={styles.content}>

        {activeTab === "informacao" && (
          <form id="form-editar-equipe" onSubmit={handleSubmit} className={styles.formWrap}>
                {isVirtual && (
                  <div className={styles.virtualNotice} role="status">
                    <p className={styles.virtualNoticeTitle}>Pool do sistema</p>
                    <p className={styles.virtualNoticeDesc}>
                      &quot;Sem Clube&quot; não é uma equipe real — apenas agrupa atletas e comissão sem vínculo.
                      Os dados não podem ser editados.
                    </p>
                  </div>
                )}

                <SectionHeader title="Equipe" subtitle={isVirtual ? "Somente leitura" : "Identidade, dados cadastrais e visibilidade"} />

                <EquipeLogoUpload
                  value={pendingLogoFile}
                  onChange={handleLogoChange}
                  existingUrl={displayLogoUrl}
                  disabled={isVirtual}
                />

                <div className={styles.fieldStack}>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel} htmlFor="eq-full-name">Nome completo *</label>
                    <input id="eq-full-name" type="text" required value={fullName} onChange={e => setFullName(e.target.value)} className={styles.input} readOnly={isVirtual} disabled={isVirtual} />
                  </div>

                  <div className={styles.fieldRow2}>
                    <div className={styles.field}>
                      <label className={styles.fieldLabel} htmlFor="eq-short-name">Nome curto</label>
                      <input id="eq-short-name" type="text" value={shortName} onChange={e => setShortName(e.target.value)} className={styles.input} readOnly={isVirtual} disabled={isVirtual} />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.fieldLabel} htmlFor="eq-abbr">Sigla</label>
                      <input id="eq-abbr" type="text" maxLength={3} value={abbreviation}
                        onChange={e => setAbbreviation(e.target.value.slice(0, 3).toUpperCase())}
                        className={styles.inputAbbr} readOnly={isVirtual} disabled={isVirtual} />
                    </div>
                  </div>

                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Gênero</span>
                    <GenderSwitch
                      value={gender}
                      onChange={setGender}
                      disabled={isVirtual || genderLocked}
                      hint={
                        !isVirtual && genderLocked
                          ? "Não é possível alterar: existem atletas, jogos ou inscrições em competições vinculados."
                          : undefined
                      }
                    />
                  </div>

                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Cores do time</span>
                    <div className={styles.colorTiles}>
                      <EquipeColorPicker
                        value={primaryColor}
                        onChange={setPrimaryColor}
                        ariaLabel="Cor primária"
                        disabled={isVirtual}
                      />
                      <EquipeColorPicker
                        value={secondaryColor}
                        onChange={setSecondaryColor}
                        ariaLabel="Cor secundária"
                        disabled={isVirtual}
                      />
                      <EquipeColorPicker
                        value={tertiaryColor}
                        onChange={setTertiaryColor}
                        ariaLabel="Cor terciária"
                        disabled={isVirtual}
                      />
                    </div>
                  </div>

                  <div className={styles.fieldRowVenue}>
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>Fundação</span>
                      <YearRollPicker value={foundedYear} onChange={setFoundedYear} disabled={isVirtual} />
                    </div>
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>Estádio / local</span>
                      <div className={styles.glassSelect}>
                        <LabPicker
                          options={venueOptions}
                          value={homeVenueId}
                          onChange={setHomeVenueId}
                          placeholder="Selecione o local"
                          searchPlaceholder="Buscar estádio…"
                          emptyLabel="—"
                          allowEmpty
                          showLogos={false}
                          disabled={isVirtual}
                        />
                      </div>
                    </div>
                  </div>

                  {!isVirtual && (
                  <div className={styles.toggleRow}>
                    <div>
                      <span className={styles.toggleTitle}>Ocultar no site público</span>
                      <span className={styles.toggleDesc}>A equipe não aparecerá no site público</span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isHidden}
                      onClick={() => setIsHidden((v) => !v)}
                      className={isHidden ? styles.switchOn : styles.switchOff}
                    >
                      <span className={isHidden ? styles.switchThumbOn : styles.switchThumbOff} />
                    </button>
                  </div>
                  )}
                </div>
          </form>
        )}

        {activeTab === "elenco" && (
          <div className={styles.elencoWrap}>
            {loadingElenco ? (
              <p className={styles.loadingMono}>Carregando…</p>
            ) : athletes.length === 0 && staff.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>👥</div>
                <p className={styles.emptyTitle}>Elenco vazio</p>
                <p className={styles.emptyDesc}>Nenhum atleta ou membro da comissão vinculado a esta equipe.</p>
                <Link href="/atletas" className={styles.emptyLink}>
                  Ir para atletas →
                </Link>
              </div>
            ) : (
              <>
                <div className={styles.elencoSection}>
                  <div className={styles.elencoSectionTitle}>
                    <span className={styles.elencoSectionName}>Atletas</span>
                    <span className={styles.elencoSectionCount}>{athletes.length}</span>
                    <div className={styles.elencoSectionLine} />
                  </div>

                  {athletes.length === 0 ? (
                    <p className={styles.emptyDesc}>Nenhum atleta vinculado.</p>
                  ) : (
                    <div className={styles.rosterList}>
                      {athletes.map((athlete) => (
                        <Link key={athlete.id} href={`/atletas/${athlete.id}`} className={styles.rosterRow}>
                          <div className={styles.avatar}>
                            {athlete.photo_url
                              ? <img src={athlete.photo_url} alt="" className={styles.avatarImg} />
                              : (
                                <div className={styles.avatarFallback}>
                                  <PersonAvatarPlaceholder fill />
                                </div>
                              )
                            }
                          </div>

                          <div className={styles.rosterInfo}>
                            <p className={styles.rosterName}>{displayNickname(athlete.surname, athlete.full_name)}</p>
                            <p className={styles.rosterMeta}>
                              <span className={styles.rosterMetaPos}>{athlete.position?.full_name ?? "Sem posição"}</span>
                              <span className={styles.rosterMetaSep}>|</span>
                              {athlete.full_name}
                            </p>
                          </div>

                          <ChevronRight size={14} className={styles.rosterChevron} />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                <div className={styles.elencoSection}>
                  <div className={styles.elencoSectionTitle}>
                    <span className={styles.elencoSectionName}>Comissão técnica</span>
                    <span className={styles.elencoSectionCount}>{staff.length}</span>
                    <div className={styles.elencoSectionLine} />
                  </div>

                  {staff.length === 0 ? (
                    <p className={styles.emptyDesc}>Nenhum membro da comissão vinculado.</p>
                  ) : (
                    <div className={styles.rosterList}>
                      {staff.map((member) => (
                        <Link key={member.id} href={`/comissao/${member.id}`} className={styles.rosterRow}>
                          <div className={styles.avatar}>
                            {member.photo_url
                              ? <img src={member.photo_url} alt="" className={styles.avatarImg} />
                              : (
                                <div className={styles.avatarFallback}>
                                  <PersonAvatarPlaceholder fill />
                                </div>
                              )
                            }
                          </div>

                          <div className={styles.rosterInfo}>
                            <p className={styles.rosterName}>{displayNickname(member.surname, member.full_name)}</p>
                            <p className={styles.rosterMeta}>
                              <span className={styles.rosterMetaPos}>{member.role?.full_name ?? "Comissão"}</span>
                              <span className={styles.rosterMetaSep}>|</span>
                              {member.full_name}
                            </p>
                          </div>

                          <ChevronRight size={14} className={styles.rosterChevron} />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}