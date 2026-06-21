/// comissao / ID / PAGE

"use client";

import {
  editarMembro, editarStintMembroCompleto, excluirMembro, removerStintMembro, toggleMembroAtivo,
  transferirMembro, verificarPodeExcluirMembro,
} from "../actions";
import { LabSwitch } from "@/app/(lab)/components/lab-switch";
import { isPersonActive } from "@/app/(lab)/components/person-list-toolbar";
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
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type StaffRole  = { id: string; full_name: string };
type Team = { id: string; full_name: string; short_name: string | null; logo_url?: string | null };
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
type StintHistory = StintRecord;
type StaffCareerStats = {
  total_matches_attended: number;
  total_titles: number;
  total_runner_up: number;
  total_third_place: number;
  total_best_coach: number;
  total_totw: number;
  total_motw: number;
  total_yellow_cards: number;
  total_red_cards: number;
};
type StaffEditionStat = {
  edition_id: string;
  matches_attended: number;
  yellow_cards: number;
  red_cards: number;
  motw_count: number;
  totw_count: number;
  best_coach_count: number;
  competition_editions: {
    seasons: { name: string } | null;
    competitions: { full_name: string; short_name: string | null } | null;
  } | null;
};

const TABS = [
  { key: "informacao",      label: "INFORMAÇÃO"      },
  { key: "linha_do_tempo",  label: "LINHA DO TEMPO"  },
  { key: "inscricoes",      label: "INSCRIÇÕES"      },
];

function applyDateMask(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}
function formatDateToBR(iso: string | null) {
  if (!iso) return "";
  const p = iso.split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
}
function initialsFromName(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length >= 2) return ((p[0]?.[0] ?? "") + (p[p.length - 1]?.[0] ?? "")).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
}

export default function MembroPage() {
  const params  = useParams();
  const router  = useRouter();
  const id      = typeof params.id === "string" ? params.id : "";

  const [activeTab,    setActiveTab]    = useState<"informacao" | "linha_do_tempo" | "inscricoes">("informacao");
  const [loading,      setLoading]      = useState(true);
  const [loadError,    setLoadError]    = useState<string | null>(null);
  const [saving,       setSaving]       = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [togglingActive, setTogglingActive] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [deleteReasons, setDeleteReasons] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  const [roles,         setRoles]         = useState<StaffRole[]>([]);
  const [teams,         setTeams]         = useState<Team[]>([]);
  const [stintHistory,  setStintHistory]  = useState<StintHistory[]>([]);
  const [rosterEntries, setRosterEntries] = useState<RosterEntry[]>([]);
  const [careerStats, setCareerStats] = useState<StaffCareerStats | null>(null);
  const [editionStats, setEditionStats] = useState<StaffEditionStat[]>([]);

  const [fullName,     setFullName]     = useState("");
  const [surname,      setSurname]      = useState("");
  const [gender,       setGender]       = useState<"male" | "female">("male");
  const [staffRoleId,  setStaffRoleId]  = useState("");
  const [rg,           setRg]           = useState("");
  const [cpf,          setCpf]          = useState("");
  const [birthDate,    setBirthDate]    = useState("");
  const [photoUrl,     setPhotoUrl]     = useState<string | null>(null);
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [headerPhotoUrl, setHeaderPhotoUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) { setLoadError("ID inválido."); setLoading(false); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data: profile } = await supabase
      .from("user_profiles").select("organization_id")
      .eq("auth_user_id", user.id).maybeSingle();

      const [
        { data: member, error },
        { data: rolesData },
        { data: teamsData },
        { data: historyData },
        { data: rosterData },
        { data: careerStatsData },
        { data: editionStatsData },
      ] = await Promise.all([
        supabase.from("staff_members").select("*").eq("id", id).maybeSingle(),
        supabase.from("staff_roles").select("id, full_name").eq("sport_slug", "football7").order("display_order"),
        supabase.from("teams").select("id, full_name, short_name, logo_url, gender, is_virtual").eq("organization_id", profile?.organization_id ?? "").eq("is_virtual", false).order("full_name"),
        supabase.from("staff_team_stints")
          .select("id, team_id, started_at, ended_at, is_current, is_active, hide_free_after, teams(id, full_name, short_name, abbreviation, logo_url)")
          .eq("staff_member_id", id).order("started_at", { ascending: false }),
        supabase.from("edition_roster_entries")
          .select("id, edition_team_id, status, submitted_at, edition_teams(edition_id, teams(logo_url, full_name, abbreviation), competition_editions(seasons(name), competitions(full_name, short_name)))")
          .eq("staff_member_id", id).eq("member_type", "staff").order("submitted_at", { ascending: true }),
        supabase.from("staff_career_stats")
          .select("total_matches_attended, total_titles, total_runner_up, total_third_place, total_best_coach, total_totw, total_motw, total_yellow_cards, total_red_cards")
          .eq("staff_member_id", id).maybeSingle(),
        supabase.from("staff_edition_stats")
          .select("edition_id, matches_attended, yellow_cards, red_cards, motw_count, totw_count, best_coach_count, competition_editions(seasons(name), competitions(full_name, short_name))")
          .eq("staff_member_id", id).order("edition_id", { ascending: false }),
      ]);

    if (error || !member) { setLoadError("Membro não encontrado."); setLoading(false); return; }

    setFullName(member.full_name ?? "");
    setSurname(member.surname ?? "");
    setGender(normalizePersonGender(member.gender));
    setStaffRoleId(member.staff_role_id ?? "");
    setRg(member.rg ?? "");
    setCpf(member.cpf ?? "");
    setBirthDate(formatDateToBR(member.birth_date));
    setIsActive(isPersonActive(member.is_active));
    setPhotoUrl(member.photo_url);
    const deleteCheck = await verificarPodeExcluirMembro(id);
    setCanDelete(deleteCheck.canDelete);
    setDeleteReasons(deleteCheck.reasons);
    setRoles((rolesData ?? []) as StaffRole[]);
    setTeams((teamsData ?? []) as Team[]);
    setStintHistory((historyData ?? []) as StintHistory[]);
    setRosterEntries((rosterData ?? []) as RosterEntry[]);
    setCareerStats((careerStatsData as StaffCareerStats | null) ?? null);
    setEditionStats((editionStatsData ?? []) as StaffEditionStat[]);
    setLoading(false);
  }, [id, router]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!pendingPhoto) {
      setHeaderPhotoUrl(photoUrl);
      return;
    }
    const url = URL.createObjectURL(pendingPhoto);
    setHeaderPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingPhoto, photoUrl]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("full_name", fullName.trim());
      fd.append("surname", surname.trim());
      fd.append("gender", gender);
      fd.append("staff_role_id", staffRoleId);
      fd.append("rg", rg);
      fd.append("cpf", cpf);
      fd.append("birth_date", birthDate);
      if (pendingPhoto) fd.append("photo", pendingPhoto);
      const result = await editarMembro(id, fd);
      if ("error" in result) { toast("error", result.error); return; }
      toast("success", "Alterações salvas.");
      setPendingPhoto(null);
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
    const result = await editarStintMembroCompleto(stintId, data);
    if ("error" in result) return { error: result.error };
    toast("success", "Vínculo atualizado.");
    await load();
    return {};
  }

  async function handleTransfer(startedAt: string, teamId: string | null, leaveFree: boolean) {
    const result = await transferirMembro(id, startedAt, teamId, leaveFree);
    if ("error" in result) return { error: result.error };
    toast("success", leaveFree ? "Membro sem clube." : "Transferência registrada.");
    await load();
    return {};
  }

  async function handleDeleteStint(stintId: string) {
    const result = await removerStintMembro(stintId);
    if ("error" in result) return { error: result.error };
    toast("success", "Vínculo excluído.");
    await load();
    return {};
  }

  async function handleToggleActive(next: boolean) {
    setTogglingActive(true);
    try {
      const result = await toggleMembroAtivo(id, next);
      if ("error" in result) { toast("error", result.error); return; }
      setIsActive(next);
      toast("success", next ? "Membro reativado." : "Membro desativado.");
    } finally {
      setTogglingActive(false);
    }
  }

  async function handleDelete() {
    if (!canDelete) return;
    if (!window.confirm("Excluir este membro permanentemente? Esta ação não pode ser desfeita.")) return;
    setDeleting(true);
    try {
      const result = await excluirMembro(id);
      if ("error" in result) { toast("error", result.error); return; }
      toast("success", "Membro excluído.");
      router.push("/comissao");
    } finally {
      setDeleting(false);
    }
  }

  const availableTeams = teams;

  const inscricoes = (() => {
    const map = new Map<string, {
      editionId: string;
      competition: string;
      season: string;
      status: string;
      logos: { logo_url: string | null; full_name: string; abbreviation: string | null }[];
    }>();
    for (const r of rosterEntries) {
      const editionId = r.edition_teams?.edition_id ?? "";
      if (!editionId) continue;
      if (!map.has(editionId)) {
        map.set(editionId, {
          editionId,
          competition: r.edition_teams?.competition_editions?.competitions?.short_name ?? r.edition_teams?.competition_editions?.competitions?.full_name ?? "—",
          season: r.edition_teams?.competition_editions?.seasons?.name ?? "—",
          status: r.status,
          logos: [],
        });
      }
      const entry = map.get(editionId)!;
      if (r.status === "approved") entry.status = "approved";
      const teamLogo = r.edition_teams?.teams ?? null;
      if (teamLogo && !entry.logos.some((l) => l.full_name === teamLogo.full_name)) {
        entry.logos.push(teamLogo);
      }
    }
    return Array.from(map.values());
  })();

  const title = (surname || fullName || "Membro").toUpperCase();
  const subtitle = fullName || "Membro";

  return (
    <EntityHubShell
      breadcrumb={[
        { label: "Comissão Técnica", href: "/comissao" },
        { label: surname || fullName || "Membro" },
      ]}
      avatar={
        <div className={styles.avatarSlot}>
          {headerPhotoUrl ? (
            <img src={headerPhotoUrl} alt="" className={styles.avatarImg} />
          ) : (
            <div className={styles.avatarPlaceholderFill}>
              <PersonAvatarPlaceholder fill className={styles.avatarPlaceholderIcon} />
            </div>
          )}
        </div>
      }
      title={title}
      subtitle={subtitle}
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={(key) => setActiveTab(key as "informacao" | "linha_do_tempo" | "inscricoes")}
      showSave={activeTab === "informacao"}
      saveFormId="form-membro"
      saving={saving}
      loading={loading}
      loadError={loadError}
      contentClassName={styles.contentWide}
    >
      {activeTab === "informacao" && (
        <form id="form-membro" onSubmit={handleSubmit} className={styles.formWrap}>
          <EntityHubSectionHeader
            title="Informações"
            subtitle="Identidade e dados principais do membro"
          />

          <EntityLogoUpload
            value={pendingPhoto}
            onChange={setPendingPhoto}
            existingUrl={photoUrl}
            label="Foto do membro"
            hint="PNG, JPG ou WebP · proporção 1:1 recomendada"
            round
          />

          <div className={styles.fieldStack}>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="membro-full-name">Nome completo *</label>
              <input
                id="membro-full-name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={styles.input}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="membro-surname">Apelido</label>
              <input
                id="membro-surname"
                type="text"
                value={surname}
                onChange={(e) => setSurname(e.target.value.toUpperCase())}
                className={styles.inputUppercase}
              />
            </div>

            <div className={styles.field}>
              <span className={styles.fieldLabel}>Gênero</span>
              <GenderSwitch value={gender} onChange={setGender} />
            </div>

            <div className={styles.fieldRow2}>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Função</span>
                <div className={styles.glassSelect}>
                  <LabSelect
                    value={staffRoleId}
                    onChange={setStaffRoleId}
                    placeholder="Selecione…"
                    options={roles.map((r) => ({ value: r.id, label: r.full_name }))}
                  />
                </div>
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Data de nascimento</span>
                <BirthDatePicker
                  id="membro-birth-date"
                  value={birthDate}
                  onChange={setBirthDate}
                />
              </div>
            </div>

            <div className={styles.fieldRow2}>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="membro-rg">RG</label>
                <input
                  id="membro-rg"
                  type="text"
                  value={rg}
                  onChange={(e) => setRg(e.target.value.replace(/[^\d.\-]/g, ""))}
                  className={styles.input}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="membro-cpf">CPF</label>
                <input
                  id="membro-cpf"
                  type="text"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value.replace(/[^\d.\-\/]/g, ""))}
                  placeholder="000.000.000-00"
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleTitle}>Ativo</span>
                <span className={styles.toggleDesc}>
                  Membros inativos ficam ocultos na listagem padrão
                </span>
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
                {deleting ? "Excluindo…" : "Excluir membro"}
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
      )}

      {activeTab === "inscricoes" && (
        <div className={styles.listPanel}>
          <div className={styles.listPanelHeader}>
            <div className={styles.listPanelTitle}>
              <span className={styles.listPanelName}>Inscrições</span>
              <span className={styles.listPanelCount}>{inscricoes.length}</span>
            </div>
          </div>

          {inscricoes.length === 0 ? (
            <p className={styles.dangerDesc} style={{ padding: "16px 18px" }}>
              Nenhuma inscrição registrada.
            </p>
          ) : (
            inscricoes.map((t) => (
              <div key={t.editionId} className={styles.listRow}>
                {t.logos.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                    {t.logos.map((logo, i) => (
                      <div
                        key={`${t.editionId}-${logo.full_name}-${i}`}
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
                        {logo.logo_url ? (
                          <img src={logo.logo_url} alt={logo.full_name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                        ) : (
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 7, fontWeight: 800, color: "var(--color-icon-muted)" }}>
                            {(logo.abbreviation ?? logo.full_name).slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className={styles.listRowMain}>
                  <p className={styles.listRowTitle}>{t.competition}</p>
                  <p className={styles.listRowSub}>{t.season}</p>
                </div>

                <span className={`${styles.statusBadge} ${t.status === "approved" ? styles.statusBadgeApproved : ""}`}>
                  {t.status === "approved" ? "Aprovado" : "Pendente"}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </EntityHubShell>
  );
}
