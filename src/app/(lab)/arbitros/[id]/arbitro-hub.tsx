"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "@/app/(lab)/components/toast";
import { editarArbitro } from "../actions";
import { LabPicker } from "@/app/(lab)/components/lab-picker";
import { GenderSwitch, normalizePersonGender } from "@/app/(lab)/components/gender-switch";
import { PersonAvatarPlaceholder } from "@/app/(lab)/components/person-avatar-placeholder";
import { EntityHubShell } from "@/app/(lab)/components/entity-hub-shell";
import { EntityHubSectionHeader } from "@/app/(lab)/components/entity-hub-section-header";
import { EntityLogoUpload } from "@/app/(lab)/components/entity-logo-upload";
import styles from "@/app/(lab)/components/entity-hub.module.css";

// ─── Types ─────────────────────────────────────────────────────────────────────

type RefereeRole = { id: string; name: string };

type Referee = {
  id: string;
  full_name: string;
  surname: string | null;
  photo_url: string | null;
  phone: string | null;
  pix_key: string | null;
  referee_role_id: string | null;
  profile_public: boolean;
  birth_date: string | null;
  gender: string | null;
};

type TeamInfo = {
  id: string;
  full_name: string;
  abbreviation: string | null;
  logo_url: string | null;
  primary_color: string | null;
} | null;

type MatchEntry = {
  matchRefereeId: string;
  matchId: string;
  matchDate: string | null;
  status: string | null;
  scoreA: number | null;
  scoreB: number | null;
  teamA: TeamInfo;
  teamB: TeamInfo;
  phaseName: string | null;
  editionId: string | null;
  competitionId: string | null;
  competitionName: string | null;
  competitionShort: string | null;
  seasonName: string | null;
  yearValue: number | null;
  refereeRoleId: string | null;
};

type CardAction = {
  id: string;
  matchId: string;
  actionType: "yellow_card" | "red_card" | "red_yellow_card";
  teamId: string | null;
};

type Props = {
  referee: Referee;
  matches: MatchEntry[];
  refereeRoles: RefereeRole[];
  cardActions: CardAction[];
};

// ─── Constants ─────────────────────────────────────────────────────────────────

const REFEREE_ROLES_STATIC = [
  { id: "e9bd3156-58b3-4758-8c6e-5d48e53228e0", label: "Árbitro" },
  { id: "556252c8-8365-466b-9a8e-464364a09902", label: "Assistente" },
  { id: "4dba8c5a-025f-4487-b4e8-60a16c104b2d", label: "Mesário" },
  { id: "0833c834-6548-4775-affb-48bd095d8cde", label: "Staff" },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch { return dateStr; }
}

function getRoleLabel(roleId: string | null, roles: RefereeRole[]): string {
  if (!roleId) return "—";
  return REFEREE_ROLES_STATIC.find(r => r.id === roleId)?.label
    ?? roles.find(r => r.id === roleId)?.name
    ?? "—";
}

// ─── MatchRow ──────────────────────────────────────────────────────────────────

function MatchRow({ match, roles, isFirst }: { match: MatchEntry; roles: RefereeRole[]; isFirst: boolean }) {
  const [hovered, setHovered] = useState(false);
  const scoreReady = match.status === "finished" && match.scoreA !== null && match.scoreB !== null;
  const competitionLabel = match.competitionShort ?? match.competitionName ?? "—";
  const roleLabel = getRoleLabel(match.refereeRoleId, roles);
  const colorA = match.teamA?.primary_color ?? "#555";
  const colorB = match.teamB?.primary_color ?? "#555";

  return (
    <Link
      href={`/partidas/${match.matchId}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={styles.matchRow}
      style={{ borderTop: isFirst ? "none" : undefined }}
    >
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, ${colorA}80 50%, ${colorB}80 50%)`, opacity: hovered ? 1 : 0, transition: "opacity 0.12s" }} />

      <div style={{ width: 80, flexShrink: 0 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-text-muted)" }}>{formatDate(match.matchDate)}</span>
      </div>

      <div style={{ width: 140, flexShrink: 0 }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>{competitionLabel}</p>
        {match.phaseName && <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--color-text-faint)", margin: 0, marginTop: 1 }}>{match.phaseName}</p>}
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end", flex: 1 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)", textAlign: "right" }}>
            {(match.teamA?.abbreviation ?? match.teamA?.full_name ?? "?").toUpperCase()}
          </span>
          {match.teamA?.logo_url && <img src={match.teamA.logo_url} alt="" style={{ width: 24, height: 24, objectFit: "contain" }} />}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, backgroundColor: "var(--color-hover-bg)", padding: "4px 10px", borderRadius: 8, minWidth: 72, justifyContent: "center" }}>
          {scoreReady ? (
            <>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 800, color: "var(--color-text-primary)" }}>{match.scoreA}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-text-ghost)" }}>×</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 800, color: "var(--color-text-primary)" }}>{match.scoreB}</span>
            </>
          ) : (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-hint)" }}>{match.status === "ongoing" ? "AO VIVO" : "—"}</span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          {match.teamB?.logo_url && <img src={match.teamB.logo_url} alt="" style={{ width: 24, height: 24, objectFit: "contain" }} />}
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)" }}>
            {(match.teamB?.abbreviation ?? match.teamB?.full_name ?? "?").toUpperCase()}
          </span>
        </div>
      </div>

      <div style={{ width: 100, flexShrink: 0, textAlign: "right" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.06em", padding: "3px 8px", borderRadius: 20, backgroundColor: "var(--color-brand-selected-bg)", color: "var(--color-brand)", border: "1px solid rgba(191,242,5,0.15)" }}>
          {roleLabel}
        </span>
      </div>
    </Link>
  );
}

// ─── AbaInformações ────────────────────────────────────────────────────────────

function AbaInformacoes({
  referee,
  onSavingChange,
}: {
  referee: Referee;
  onSavingChange: (saving: boolean) => void;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(referee.full_name);
  const [refereeRoleId, setRefereeRoleId] = useState(referee.referee_role_id ?? "");
  const [gender, setGender] = useState<"male" | "female">(() => normalizePersonGender(referee.gender));
  const [phone, setPhone] = useState(referee.phone ?? "");
  const [pixKey, setPix] = useState(referee.pix_key ?? "");
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    onSavingChange(saving);
    return () => onSavingChange(false);
  }, [saving, onSavingChange]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!fullName.trim()) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("full_name", fullName.trim());
      fd.append("referee_role_id", refereeRoleId);
      fd.append("gender", gender);
      fd.append("phone", phone.trim());
      fd.append("pix_key", pixKey.trim());
      if (pendingPhoto) fd.append("photo", pendingPhoto);
      const result = await editarArbitro(referee.id, fd);
      if ("error" in result) { toast("error", result.error); return; }
      toast("success", "Alterações salvas.");
      setPendingPhoto(null);
      router.refresh();
    } finally { setSaving(false); }
  }

  return (
    <form id="form-arbitro" onSubmit={handleSubmit} className={styles.contentWide}>
      <EntityHubSectionHeader title="INFORMAÇÕES" subtitle="Identidade e contatos do árbitro" />

      <EntityLogoUpload
        value={pendingPhoto}
        onChange={setPendingPhoto}
        existingUrl={referee.photo_url}
        label="Foto do árbitro"
        hint="PNG, JPG ou WebP · proporção 1:1 recomendada"
        round
      />

      <div className={styles.fieldStack}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Função</label>
          <div className={styles.segmentRow}>
            {REFEREE_ROLES_STATIC.map(role => (
              <button
                key={role.id}
                type="button"
                onClick={() => setRefereeRoleId(role.id)}
                className={`${styles.segmentBtn} ${refereeRoleId === role.id ? styles.segmentBtnActive : ""}`.trim()}
              >
                {role.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="referee-full-name">Nome completo *</label>
          <input
            id="referee-full-name"
            type="text"
            required
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            className={styles.input}
          />
        </div>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Gênero</span>
          <GenderSwitch value={gender} onChange={setGender} />
        </div>

        <div className={styles.fieldRow2}>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="referee-phone">Telefone</label>
            <input
              id="referee-phone"
              type="text"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="(00) 00000-0000"
              className={styles.input}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="referee-pix">Chave Pix</label>
            <input
              id="referee-pix"
              type="text"
              value={pixKey}
              onChange={e => setPix(e.target.value)}
              placeholder="CPF, e-mail, telefone ou chave aleatória"
              className={styles.input}
            />
          </div>
        </div>
      </div>
    </form>
  );
}

// ─── AbaJogos ──────────────────────────────────────────────────────────────────

function AbaJogos({ matches, roles }: { matches: MatchEntry[]; roles: RefereeRole[] }) {
  if (matches.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>🏁</div>
        <p className={styles.emptyTitle}>Nenhum jogo registrado</p>
        <p className={styles.emptyDesc}>Este árbitro ainda não foi vinculado a nenhuma partida.</p>
      </div>
    );
  }

  const sorted = [...matches].sort((a, b) => {
    if (!a.matchDate && !b.matchDate) return 0;
    if (!a.matchDate) return 1;
    if (!b.matchDate) return -1;
    return b.matchDate.localeCompare(a.matchDate);
  });

  return (
    <div>
      <EntityHubSectionHeader title="JOGOS APITADOS" subtitle={`${matches.length} ${matches.length === 1 ? "partida" : "partidas"}`} />
      <div className={styles.matchList}>
        {sorted.map((match, idx) => (
          <MatchRow key={match.matchRefereeId} match={match} roles={roles} isFirst={idx === 0} />
        ))}
      </div>
    </div>
  );
}

// ─── AbaEstatisticas ───────────────────────────────────────────────────────────

function AbaEstatisticas({ matches, cardActions }: { matches: MatchEntry[]; cardActions: CardAction[] }) {
  const [filterCompetitionId, setFilterCompetitionId] = useState("");
  const [filterTeamId, setFilterTeamId] = useState("");
  const [filterYear, setFilterYear] = useState("");

  const competitions = useMemo(() => {
    const map = new Map<string, { id: string; label: string; searchText: string }>();
    matches.forEach(m => {
      if (m.competitionId) {
        map.set(m.competitionId, {
          id: m.competitionId,
          label: m.competitionShort ?? m.competitionName ?? m.competitionId,
          searchText: m.competitionName ?? m.competitionShort ?? m.competitionId,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [matches]);

  const teams = useMemo(() => {
    const map = new Map<string, { id: string; label: string; logo_url: string | null; searchText: string }>();
    matches.forEach(m => {
      if (m.teamA) {
        map.set(m.teamA.id, {
          id: m.teamA.id,
          label: (m.teamA.abbreviation ?? m.teamA.full_name).toUpperCase(),
          logo_url: m.teamA.logo_url,
          searchText: m.teamA.full_name,
        });
      }
      if (m.teamB) {
        map.set(m.teamB.id, {
          id: m.teamB.id,
          label: (m.teamB.abbreviation ?? m.teamB.full_name).toUpperCase(),
          logo_url: m.teamB.logo_url,
          searchText: m.teamB.full_name,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [matches]);

  const years = useMemo(() => {
    const set = new Set<number>();
    matches.forEach(m => { if (m.yearValue) set.add(m.yearValue); });
    return Array.from(set).sort((a, b) => b - a);
  }, [matches]);

  const yearOptions = useMemo(
    () => years.map((y) => ({ id: String(y), label: String(y) })),
    [years],
  );

  const filteredMatchIds = useMemo(() => {
    return new Set(
      matches
        .filter(m => {
          if (filterCompetitionId && m.competitionId !== filterCompetitionId) return false;
          if (filterTeamId && m.teamA?.id !== filterTeamId && m.teamB?.id !== filterTeamId) return false;
          if (filterYear && m.yearValue !== Number(filterYear)) return false;
          return true;
        })
        .map(m => m.matchId)
    );
  }, [matches, filterCompetitionId, filterTeamId, filterYear]);

  const stats = useMemo(() => {
    const filtered = cardActions.filter(a => filteredMatchIds.has(a.matchId));
    return {
      total_matches: filteredMatchIds.size,
      amarelos: filtered.filter(a =>
        a.actionType === "yellow_card" || a.actionType === "red_yellow_card"
      ).length,
      vermelhos: filtered.filter(a =>
        a.actionType === "red_card" || a.actionType === "red_yellow_card"
      ).length,
    };
  }, [cardActions, filteredMatchIds]);

  const hasFilters = Boolean(filterCompetitionId || filterTeamId || filterYear);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className={styles.listPanel} style={{ padding: 20 }}>
        <EntityHubSectionHeader title="FILTROS" subtitle="Refine as estatísticas por competição, equipe ou ano" />
        <div className={styles.fieldStack}>
          {competitions.length > 0 && (
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Competição</span>
              <div className={styles.glassSelect}>
                <LabPicker
                  options={competitions.map((c) => ({
                    id: c.id,
                    label: c.label,
                    searchText: c.searchText,
                  }))}
                  value={filterCompetitionId}
                  onChange={setFilterCompetitionId}
                  placeholder="Todas as competições"
                  searchPlaceholder="Buscar competição…"
                  emptyLabel="Todas"
                  allowEmpty
                  showLogos={false}
                />
              </div>
            </div>
          )}

          {teams.length > 0 && (
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Equipe</span>
              <div className={styles.glassSelect}>
                <LabPicker
                  options={teams.map((t) => ({
                    id: t.id,
                    label: t.label,
                    logo_url: t.logo_url,
                    searchText: t.searchText,
                  }))}
                  value={filterTeamId}
                  onChange={setFilterTeamId}
                  placeholder="Todas as equipes"
                  searchPlaceholder="Buscar equipe…"
                  emptyLabel="Todas"
                  allowEmpty
                  showLogos
                />
              </div>
            </div>
          )}

          {yearOptions.length > 0 && (
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Ano</span>
              <div className={styles.glassSelect}>
                <LabPicker
                  options={yearOptions}
                  value={filterYear}
                  onChange={setFilterYear}
                  placeholder="Todos os anos"
                  searchPlaceholder="Buscar ano…"
                  emptyLabel="Todos"
                  allowEmpty
                  showLogos={false}
                />
              </div>
            </div>
          )}

          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setFilterCompetitionId("");
                setFilterTeamId("");
                setFilterYear("");
              }}
              className={styles.filterClear}
            >
              × Limpar filtros
            </button>
          )}
        </div>
      </div>

      <div>
        <EntityHubSectionHeader title={hasFilters ? "ESTATÍSTICAS (FILTRADAS)" : "ESTATÍSTICAS GERAIS"} />
        <div className={styles.statGrid}>
          <div className={styles.statCard}>
            <span className={styles.statCardValue} style={{ color: "#BFF205" }}>{stats.total_matches}</span>
            <span className={styles.statCardLabel}>Jogos</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statCardValue} style={{ color: "#F2C005" }}>{stats.amarelos}</span>
            <span className={styles.statCardLabel}>Amarelos</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statCardValue} style={{ color: "#FF4444" }}>{stats.vermelhos}</span>
            <span className={styles.statCardLabel}>Vermelhos</span>
          </div>
        </div>
      </div>

      {cardActions.length === 0 && matches.length > 0 && (
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-ghost)", textAlign: "center", padding: "16px 0" }}>
          Nenhuma ação de cartão registrada nos jogos deste árbitro.
        </p>
      )}
    </div>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────────

type Tab = "informacoes" | "jogos" | "estatisticas";

const TAB_LABELS: Record<Tab, string> = {
  informacoes: "INFORMAÇÕES",
  jogos: "JOGOS",
  estatisticas: "ESTATÍSTICAS",
};

export default function ArbitroHub({ referee, matches, refereeRoles, cardActions }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("informacoes");
  const [savingInformacoes, setSavingInformacoes] = useState(false);

  const displayName = referee.full_name;
  const roleLabel = getRoleLabel(referee.referee_role_id, refereeRoles);
  const cardStats = useMemo(() => {
    const amarelos = cardActions.filter(a =>
      a.actionType === "yellow_card" || a.actionType === "red_yellow_card"
    ).length;
    const vermelhos = cardActions.filter(a =>
      a.actionType === "red_card" || a.actionType === "red_yellow_card"
    ).length;
    return { amarelos, vermelhos };
  }, [cardActions]);

  const tabs = useMemo(
    () => ([
      { key: "informacoes", label: TAB_LABELS.informacoes },
      { key: "jogos", label: TAB_LABELS.jogos, badge: matches.length },
      { key: "estatisticas", label: TAB_LABELS.estatisticas },
    ]),
    [matches.length]
  );

  return (
    <EntityHubShell
      breadcrumb={[{ label: "Árbitros", href: "/arbitros" }, { label: displayName }]}
      avatar={
        <div className={styles.avatarSlot}>
          {referee.photo_url
            ? <img src={referee.photo_url} alt="" className={styles.avatarImg} />
            : <PersonAvatarPlaceholder size={34} className={styles.avatarPlaceholderIcon} />
          }
        </div>
      }
      title={displayName.toUpperCase()}
      subtitle={`${roleLabel} · ${matches.length} ${matches.length === 1 ? "jogo" : "jogos"} · ${cardStats.amarelos}🟡 ${cardStats.vermelhos}🔴`}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(key) => {
        if (key === "informacoes" || key === "jogos" || key === "estatisticas") {
          setActiveTab(key);
        }
      }}
      showSave={activeTab === "informacoes"}
      saveFormId="form-arbitro"
      saving={savingInformacoes}
      saveLabel="Salvar alterações"
    >
      {activeTab === "informacoes" && (
        <AbaInformacoes referee={referee} onSavingChange={setSavingInformacoes} />
      )}
      {activeTab === "jogos" && <AbaJogos matches={matches} roles={refereeRoles} />}
      {activeTab === "estatisticas" && <AbaEstatisticas matches={matches} cardActions={cardActions} />}
    </EntityHubShell>
  );
}