"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Search, UserCog, UserPlus } from "lucide-react";
import { toast } from "@/app/(lab)/components/toast";
import { LabCheckbox } from "@/app/(lab)/components/lab-checkbox";
import { LabPicker } from "@/app/(lab)/components/lab-picker";
import { PersonAvatar } from "@/app/(lab)/components/person-avatar";
import {
  listarRepresentantes,
  listarEquipesOrganizacao,
  criarRepresentante,
  type RepresentativeRow,
  type TeamOption,
} from "@/app/(lab)/configuracoes/actions";
import {
  modalCloseButtonStyle,
  modalHeaderDividerStyle,
  modalOverlayStyle,
  modalPanelStyle,
  secondaryButtonStyle,
} from "@/lib/lab-ui-styles";
import styles from "@/app/(lab)/components/entity-hub.module.css";
import { RepresentanteDetailModal } from "./representante-detail-modal";

const STATUS_TABS = [
  { id: "active" as const, label: "ATIVOS" },
  { id: "all" as const, label: "TODOS" },
];

function TeamLogoMini({
  team,
}: {
  team: { logo_url: string | null; short_label: string; full_name: string };
}) {
  return (
    <div className={styles.hubListTeamLogoMain} title={team.full_name} style={{ width: 26, height: 26, flexShrink: 0 }}>
      {team.logo_url ? (
        <img src={team.logo_url} alt="" loading="lazy" decoding="async" />
      ) : (
        <span className={styles.hubListTeamLogoFallback}>{team.short_label.slice(0, 2)}</span>
      )}
    </div>
  );
}

function HubModal({
  open,
  title,
  onClose,
  children,
  maxWidth = 440,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: number;
}) {
  if (!open) return null;
  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={{ ...modalPanelStyle, maxWidth }} onClick={(e) => e.stopPropagation()}>
        <div style={{
          padding: "16px 20px",
          ...modalHeaderDividerStyle,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <p style={{
            fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 800,
            letterSpacing: "0.1em", textTransform: "uppercase",
            color: "var(--color-text-primary)", margin: 0,
          }}>
            {title}
          </p>
          <button type="button" onClick={onClose} style={{ ...modalCloseButtonStyle, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ padding: "16px 20px 20px" }}>{children}</div>
      </div>
    </div>
  );
}

function TeamCheckboxList({
  teams,
  selectedIds,
  onToggle,
  search,
  onSearchChange,
}: {
  teams: TeamOption[];
  selectedIds: string[];
  onToggle: (teamId: string) => void;
  search: string;
  onSearchChange: (v: string) => void;
}) {
  const q = search.trim().toLowerCase();
  const filtered = q
    ? teams.filter((t) =>
        t.full_name.toLowerCase().includes(q)
        || (t.short_name ?? "").toLowerCase().includes(q)
        || t.short_label.toLowerCase().includes(q),
      )
    : teams;

  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>Equipes</span>
      <div style={{ position: "relative" }}>
        <Search
          size={14}
          style={{
            position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
            color: "var(--color-text-faint)", pointerEvents: "none",
          }}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar equipe…"
          className={styles.input}
          style={{ paddingLeft: 36 }}
        />
      </div>
      <div className={styles.teamCheckList}>
        {filtered.length === 0 ? (
          <p className={styles.loadingMono} style={{ textAlign: "center", padding: "16px 12px" }}>
            Nenhuma equipe encontrada.
          </p>
        ) : (
          filtered.map((team) => {
            const checked = selectedIds.includes(team.id);
            const primary = team.short_name?.trim() || team.full_name;
            const showFull = team.short_name && team.short_name.trim() !== team.full_name;
            return (
              <label
                key={team.id}
                className={`${styles.teamCheckRow} ${checked ? styles.teamCheckRowSelected : ""}`}
              >
                <LabCheckbox checked={checked} onChange={() => onToggle(team.id)} accentColor="var(--color-brand)" />
                <TeamLogoMini team={team} />
                <span className={styles.teamCheckName}>
                  <strong>{primary}</strong>
                  {showFull && (
                    <span style={{ display: "block", fontSize: 11, color: "var(--news-caption)", fontWeight: 400 }}>
                      {team.full_name}
                    </span>
                  )}
                </span>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function RepresentantesClient({ orgId }: { orgId: string }) {
  const [representatives, setRepresentatives] = useState<RepresentativeRow[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [activeFilter, setActiveFilter] = useState<"active" | "all">("active");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [teamFilter, setTeamFilter] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [detailRep, setDetailRep] = useState<RepresentativeRow | null>(null);
  const [createFullName, setCreateFullName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createTeamIds, setCreateTeamIds] = useState<string[]>([]);
  const [createTeamSearch, setCreateTeamSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [createFeedback, setCreateFeedback] = useState<string | null>(null);

  async function reload() {
    const [repsResult, teamsResult] = await Promise.all([
      listarRepresentantes(orgId),
      listarEquipesOrganizacao(orgId),
    ]);
    if ("error" in repsResult) { setLoadError(repsResult.error); return; }
    if ("error" in teamsResult) { setLoadError(teamsResult.error); return; }
    setRepresentatives(repsResult.representatives);
    setTeams(teamsResult.teams);
    setLoadError(null);
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      await reload();
      setLoading(false);
    }
    void load();
  }, [orgId]);

  function toggleTeamId(ids: string[], teamId: string, setter: (v: string[]) => void) {
    setter(ids.includes(teamId) ? ids.filter((id) => id !== teamId) : [...ids, teamId]);
  }

  function closeCreateModal() {
    setShowCreate(false);
    setCreateFullName("");
    setCreateEmail("");
    setCreatePassword("");
    setCreateTeamIds([]);
    setCreateTeamSearch("");
    setCreateFeedback(null);
  }

  async function handleCreate() {
    setCreating(true);
    setCreateFeedback(null);
    const fd = new FormData();
    fd.append("full_name", createFullName);
    fd.append("email", createEmail);
    fd.append("password", createPassword);
    createTeamIds.forEach((id) => fd.append("team_ids", id));
    const result = await criarRepresentante(fd);
    setCreating(false);
    if ("error" in result) {
      setCreateFeedback(result.error);
      return;
    }
    toast("success", "Representante criado.");
    closeCreateModal();
    await reload();
  }

  const counts = useMemo(
    () => ({
      active: representatives.filter((r) => r.status === "active").length,
      all: representatives.length,
    }),
    [representatives],
  );

  const teamPickerOptions = useMemo(
    () =>
      teams.map((team) => ({
        id: team.id,
        label: team.short_name ?? team.full_name,
        logo_url: team.logo_url,
        searchText: `${team.full_name} ${team.short_name ?? ""} ${team.short_label}`,
      })),
    [teams],
  );

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return representatives
      .filter((r) => activeFilter === "all" || r.status === "active")
      .filter((r) => {
        if (!teamFilter) return true;
        return r.teams.some((t) => t.id === teamFilter);
      })
      .filter((r) => {
        if (!q) return true;
        return (
          r.full_name.toLowerCase().includes(q)
          || r.email.toLowerCase().includes(q)
          || r.teams.some((t) => t.short_label.toLowerCase().includes(q) || t.full_name.toLowerCase().includes(q))
        );
      });
  }, [representatives, activeFilter, teamFilter, deferredSearch]);

  const canCreate = createFullName && createEmail && createPassword.length >= 6 && createTeamIds.length > 0;
  const temFiltro = !!teamFilter || !!search.trim();

  return (
    <div className={`${styles.entityHub} ${styles.page} ${styles.hubListPage} ${styles.personListHub} ${styles.adminHub} ${styles.adminHubTabs}`}>
      <div className={`${styles.header} ${styles.orgHubHeaderTabsOnly}`}>
        <div className={styles.headerGlow} />
        <div className={styles.headerSurface} />
        <div className={styles.headerInner}>
          <div className={styles.tabBar}>
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                className={`${styles.tab} ${activeFilter === tab.id ? styles.tabActive : ""}`}
              >
                {tab.label}
                {!loading && <span className={styles.tabBadge}>{counts[tab.id]}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={`${styles.content} ${styles.hubListContent}`}>
        <main className={styles.hallMain}>
          <div className={styles.rankingsTitleRow}>
            <div>
              <h2 className={styles.hallCategoryTitle}>Representantes</h2>
              <p className={styles.sectionSubtitle}>
                Clique em um representante para editar login, senha, foto e equipes.
              </p>
            </div>
            <div className={styles.rankingsTitleActions}>
              <div className={styles.hallFilterField}>
                <LabPicker
                  value={teamFilter}
                  onChange={setTeamFilter}
                  emptyLabel="Equipe"
                  searchPlaceholder="Buscar equipe…"
                  menuSans
                  triggerSans
                  showLogos
                  options={teamPickerOptions}
                />
              </div>
              {temFiltro && (
                <button
                  type="button"
                  onClick={() => { setSearch(""); setTeamFilter(""); }}
                  className={styles.hallClearBtn}
                >
                  Limpar
                </button>
              )}
              <button
                type="button"
                onClick={() => { setShowCreate(true); setCreateFeedback(null); }}
                className={styles.saveBtn}
              >
                <UserPlus size={14} strokeWidth={2.5} />
                Criar
              </button>
            </div>
          </div>

          <div className={styles.adminFiltersBlock}>
            <div className={styles.hubListSearchRow}>
              <div className={styles.newsSearchWrap}>
                <Search size={15} strokeWidth={2} className={styles.newsSearchIcon} aria-hidden />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nome ou e-mail…"
                  className={styles.newsSearchInput}
                  aria-label="Buscar representante"
                />
              </div>
            </div>
          </div>

          <div className={`${styles.hubListBare} ${styles.athleteListStack} ${styles.adminListSection}`}>
            {loading ? (
              <p className={styles.loadingMono} style={{ padding: "24px 4px" }}>Carregando representantes…</p>
            ) : loadError ? (
              <p className={styles.formError} style={{ padding: "16px 4px" }}>{loadError}</p>
            ) : filtered.length === 0 ? (
              <div className={styles.listPanelEmpty}>
                <UserCog size={32} strokeWidth={1.5} className={styles.newsEmptyIcon} />
                <p className={styles.listPanelEmptyTitle}>
                  {temFiltro ? "Nenhum resultado" : activeFilter === "active" ? "Nenhum representante ativo" : "Nenhum representante"}
                </p>
                <p className={styles.newsEmptyDesc}>
                  {temFiltro ? "Tente ajustar os filtros." : "Crie representantes para gerenciar inscrições por equipe."}
                </p>
              </div>
            ) : (
              filtered.map((rep) => {
                const inactive = rep.status !== "active";
                return (
                  <button
                    key={rep.id}
                    type="button"
                    onClick={() => setDetailRep(rep)}
                    className={`${styles.hallRankRowButton} ${inactive ? styles.athleteListRowInactive : ""}`}
                  >
                    <div className={styles.athleteListRowInner}>
                      <div className={styles.athleteListRowLink}>
                        <PersonAvatar
                          photoUrl={rep.photo_url}
                          size={36}
                          className={styles.athleteListAvatar}
                          style={{ opacity: inactive ? 0.55 : 1 }}
                        />
                        <div className={styles.athleteListDetails}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <p className={styles.athleteListNickname}>{rep.full_name.toUpperCase()}</p>
                            {inactive && (
                              <span className={`${styles.hubChip} ${styles.hubChipWarning}`}>Inativo</span>
                            )}
                          </div>
                          {rep.teams.length > 0 && (
                            <div className={styles.hubChipRow} style={{ marginTop: 6, alignItems: "center" }}>
                              {rep.teams.map((t) => (
                                <TeamLogoMini key={t.id} team={t} />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </main>
      </div>

      {detailRep && (
        <RepresentanteDetailModal
          rep={detailRep}
          teams={teams}
          onClose={() => setDetailRep(null)}
          onUpdated={async () => {
            await reload();
            setDetailRep(null);
          }}
          onRemoved={(id) => {
            setRepresentatives((prev) => prev.filter((r) => r.id !== id));
            setDetailRep(null);
          }}
        />
      )}

      <HubModal open={showCreate} title="Criar representante" onClose={closeCreateModal} maxWidth={460}>
        <div className={styles.fieldStack}>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="rep-name">Nome completo</label>
            <input id="rep-name" type="text" value={createFullName} onChange={(e) => setCreateFullName(e.target.value)} className={styles.input} />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="rep-email">E-mail</label>
            <input id="rep-email" type="email" value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} className={styles.input} />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="rep-pass">Senha inicial</label>
            <input id="rep-pass" type="password" value={createPassword} onChange={(e) => setCreatePassword(e.target.value)} className={styles.input} placeholder="Mínimo 6 caracteres" />
          </div>
          <TeamCheckboxList
            teams={teams}
            selectedIds={createTeamIds}
            onToggle={(id) => toggleTeamId(createTeamIds, id, setCreateTeamIds)}
            search={createTeamSearch}
            onSearchChange={setCreateTeamSearch}
          />
        </div>
        {createFeedback && <p className={styles.formError} style={{ marginTop: 14 }}>{createFeedback}</p>}
        <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
          <button type="button" className={styles.modalPrimaryBtn} onClick={() => void handleCreate()} disabled={creating || !canCreate}>
            {creating ? "Criando…" : "Criar"}
          </button>
          <button type="button" style={secondaryButtonStyle} onClick={closeCreateModal} disabled={creating}>Cancelar</button>
        </div>
      </HubModal>
    </div>
  );
}
