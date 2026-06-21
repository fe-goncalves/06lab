"use client";

import { memo, useDeferredValue, useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import { Calendar, Copy, IdCard, Plus, Search, Users } from "lucide-react";
import { LabPicker } from "@/app/(lab)/components/lab-picker";
import { LabSelect } from "@/app/(lab)/components/lab-select";
import { LabSwitch } from "@/app/(lab)/components/lab-switch";
import { PersonAvatar } from "@/app/(lab)/components/person-avatar";
import { toast } from "@/app/(lab)/components/toast";
import {
  isPersonActive,
  matchActiveFilter,
  matchPersonSearch,
} from "@/app/(lab)/components/person-list-toolbar";
import { NovoMembroModal } from "./novo-membro-modal";
import styles from "@/app/(lab)/components/entity-hub.module.css";

type TeamInfo = {
  full_name: string;
  abbreviation: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
} | null;

type TeamOption = {
  id: string;
  full_name: string;
  short_name: string | null;
  abbreviation: string | null;
  logo_url: string | null;
};

type Member = {
  id: string;
  full_name: string;
  surname: string | null;
  photo_url: string | null;
  staff_role_id: string | null;
  gender: string | null;
  birth_date: string | null;
  rg: string | null;
  cpf: string | null;
  is_active: boolean | null;
  staff_team_stints: { team_id: string; is_current: boolean; teams: TeamInfo }[];
};

type Role = { id: string; full_name: string };

type GenderTab = "male" | "female";
type SortBy = "name" | "age_asc" | "age_desc";

const GENDER_TABS = [
  { id: "male" as const, label: "MASCULINO" },
  { id: "female" as const, label: "FEMININO" },
];

const SORT_OPTIONS = [
  { value: "name", label: "Nome (A–Z)" },
  { value: "age_asc", label: "Idade (menor → maior)" },
  { value: "age_desc", label: "Idade (maior → menor)" },
];

function normalizeGender(gender: string | null): "male" | "female" | "other" {
  const g = (gender ?? "").toLowerCase();
  if (g === "male" || g === "m" || g === "masculino") return "male";
  if (g === "female" || g === "f" || g === "feminino") return "female";
  return "other";
}

function getAgeNumber(birth_date: string | null): number | null {
  if (!birth_date) return null;
  const diff = Date.now() - new Date(birth_date).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

function getNickname(fullName: string, surname: string | null): string {
  return (surname ?? fullName.split(" ")[0] ?? fullName).toUpperCase();
}

function getCurrentStint(member: Member) {
  return member.staff_team_stints?.find((stint) => stint.is_current);
}

function formatBirthDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

async function copyToClipboard(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast("success", `${label} copiado`);
  } catch {
    toast("error", `Não foi possível copiar ${label.toLowerCase()}`);
  }
}

function CopyChip({
  label,
  copyValue,
  icon: Icon,
}: {
  label: string;
  copyValue: string | null;
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
}) {
  const canCopy = Boolean(copyValue?.trim());

  return (
    <button
      type="button"
      disabled={!canCopy}
      className={styles.athleteCopyChip}
      title={canCopy ? `Copiar ${label}` : `${label} não cadastrado`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (copyValue) void copyToClipboard(copyValue, label);
      }}
    >
      <Icon size={11} strokeWidth={2} aria-hidden />
      <span className={styles.athleteCopyChipLabel}>{label}</span>
      {canCopy && <Copy size={10} strokeWidth={2.2} className={styles.athleteCopyChipIcon} aria-hidden />}
    </button>
  );
}

const MemberListItem = memo(function MemberListItem({ member }: { member: Member }) {
  const currentTeam = getCurrentStint(member)?.teams;
  const inactive = !isPersonActive(member.is_active);
  const teamLabel = (currentTeam?.abbreviation ?? currentTeam?.full_name ?? "—").slice(0, 2).toUpperCase();
  const birthDisplay = formatBirthDate(member.birth_date);

  return (
    <div className={`${styles.athleteListRow} ${inactive ? styles.athleteListRowInactive : ""}`}>
      <div className={styles.athleteListRowInner}>
        <Link href={`/comissao/${member.id}`} className={styles.athleteListRowLink}>
          <PersonAvatar
            photoUrl={member.photo_url}
            size={36}
            className={styles.athleteListAvatar}
          />

          <div className={styles.hubListTeamLogoMain} title={currentTeam?.full_name ?? undefined}>
            {currentTeam?.logo_url ? (
              <img src={currentTeam.logo_url} alt="" loading="lazy" decoding="async" />
            ) : (
              <span className={styles.hubListTeamLogoFallback}>{teamLabel}</span>
            )}
          </div>

          <div className={styles.athleteListDetails}>
            <p className={styles.athleteListNickname}>{getNickname(member.full_name, member.surname)}</p>
            <p className={styles.athleteListFullName}>{member.full_name}</p>
            {inactive && (
              <span className={`${styles.statusBadge} ${styles.statusBadgeDraft}`}>Inativo</span>
            )}
          </div>
        </Link>

        <div className={styles.athleteListCopyCol}>
          <CopyChip label="RG" copyValue={member.rg} icon={IdCard} />
          <CopyChip
            label="Nasc."
            copyValue={member.birth_date ? birthDisplay : null}
            icon={Calendar}
          />
        </div>
      </div>
    </div>
  );
});

export default function ComissaoClient({
  members: initialMembers,
  roles,
  teams,
}: {
  members: Member[];
  roles: Role[];
  teams: TeamOption[];
}) {
  const [members] = useState(initialMembers);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [activeTab, setActiveTab] = useState<GenderTab>("male");
  const [teamFilter, setTeamFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);
  const [sortBy, setSortBy] = useState<SortBy | "">("");
  const [modalOpen, setModalOpen] = useState(false);

  const teamPickerOptions = useMemo(
    () =>
      teams.map((team) => ({
        id: team.id,
        label: team.short_name ?? team.full_name,
        logo_url: team.logo_url,
        searchText: `${team.full_name} ${team.short_name ?? ""} ${team.abbreviation ?? ""}`,
      })),
    [teams],
  );

  const { counts, filtered } = useMemo(() => {
    const countsMap = { male: 0, female: 0 };
    const result: Member[] = [];

    for (const member of members) {
      const gender = normalizeGender(member.gender);
      if (isPersonActive(member.is_active)) {
        if (gender === "male") countsMap.male += 1;
        else if (gender === "female") countsMap.female += 1;
      }

      if (gender !== activeTab) continue;
      if (!matchPersonSearch(deferredSearch, member.full_name, member.surname, member.rg, member.cpf)) continue;

      const current = getCurrentStint(member);
      if (teamFilter && current?.team_id !== teamFilter) continue;
      if (roleFilter && member.staff_role_id !== roleFilter) continue;
      if (!matchActiveFilter(activeOnly, member.is_active)) continue;

      result.push(member);
    }

    const effectiveSort = sortBy || "name";

    result.sort((a, b) => {
      if (effectiveSort === "age_asc" || effectiveSort === "age_desc") {
        const ageA = getAgeNumber(a.birth_date);
        const ageB = getAgeNumber(b.birth_date);
        const fallbackA = ageA ?? (effectiveSort === "age_asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);
        const fallbackB = ageB ?? (effectiveSort === "age_asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);
        return effectiveSort === "age_asc" ? fallbackA - fallbackB : fallbackB - fallbackA;
      }
      return a.full_name.localeCompare(b.full_name);
    });

    return { counts: countsMap, filtered: result };
  }, [
    members,
    activeTab,
    activeOnly,
    deferredSearch,
    roleFilter,
    sortBy,
    teamFilter,
  ]);

  const activeTabLabel = activeTab === "male" ? "masculino" : "feminino";
  const hasFilters = search.trim() || teamFilter || roleFilter || !activeOnly || sortBy;

  return (
    <div className={`${styles.entityHub} ${styles.page} ${styles.hubListPage} ${styles.personListHub}`}>
      <div className={`${styles.header} ${styles.orgHubHeaderTabsOnly}`}>
        <div className={styles.headerGlow} />
        <div className={styles.headerSurface} />
        <div className={styles.headerInner}>
          <div className={styles.tabBar}>
            {GENDER_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ""}`}
              >
                {tab.label}
                <span className={styles.tabBadge}>{counts[tab.id]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={`${styles.content} ${styles.hubListContent}`}>
        <div className={styles.hubListFilters}>
          <div className={styles.hubListFiltersRow}>
            <div className={styles.hubListFilterField}>
              <LabPicker
                options={teamPickerOptions}
                value={teamFilter}
                onChange={setTeamFilter}
                emptyLabel="Busque por equipe"
                searchPlaceholder="Buscar equipe…"
                showLogos
                menuSans
                triggerSans
              />
            </div>
            <div className={styles.hubListFilterField}>
              <LabSelect
                value={roleFilter}
                onChange={setRoleFilter}
                placeholder="Busque por função"
                menuSans
                triggerSans
                options={roles.map((role) => ({
                  value: role.id,
                  label: role.full_name,
                }))}
              />
            </div>
            <div className={styles.hubListFilterField}>
              <LabSelect
                value={sortBy}
                onChange={(v) => setSortBy(v as SortBy | "")}
                placeholder="Ordenar por"
                menuSans
                triggerSans
                options={SORT_OPTIONS}
              />
            </div>
            <LabSwitch
              variant="glass"
              checked={activeOnly}
              onChange={setActiveOnly}
              label={activeOnly ? "Ativos" : "Desativados"}
            />
          </div>

          <div className={styles.hubListSearchRow}>
            <div className={styles.newsSearchWrap}>
              <Search size={15} strokeWidth={2} className={styles.newsSearchIcon} aria-hidden />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, apelido, RG ou CPF…"
                className={styles.newsSearchInput}
                aria-label="Buscar comissão técnica"
              />
            </div>
            <div className={styles.hubListSearchActions}>
              <button type="button" onClick={() => setModalOpen(true)} className={styles.saveBtn}>
                <Plus size={14} strokeWidth={2.5} />
                Novo membro
              </button>
            </div>
          </div>
        </div>

        <div className={`${styles.hubListBare} ${styles.athleteListStack}`}>
          {filtered.length === 0 ? (
            <div className={styles.listPanelEmpty}>
              <Users size={32} strokeWidth={1.5} className={styles.newsEmptyIcon} />
              <p className={styles.listPanelEmptyTitle}>
                {hasFilters
                  ? "Nenhum membro encontrado"
                  : `Nenhum membro ${activeTabLabel} cadastrado`}
              </p>
              <p className={styles.newsEmptyDesc}>
                {hasFilters
                  ? "Ajuste os filtros ou tente outra busca."
                  : "Adicione membros usando o botão acima."}
              </p>
              {!hasFilters && (
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className={`${styles.saveBtn} ${styles.newsEmptyCta}`}
                >
                  <Plus size={14} strokeWidth={2.5} />
                  Novo membro
                </button>
              )}
            </div>
          ) : (
            filtered.map((member) => <MemberListItem key={member.id} member={member} />)
          )}
        </div>
      </div>

      <NovoMembroModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultGender={activeTab}
      />
    </div>
  );
}
