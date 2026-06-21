"use client";

import { memo, useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { Flag, Plus, Search } from "lucide-react";
import { LabSelect } from "@/app/(lab)/components/lab-select";
import { PersonAvatar } from "@/app/(lab)/components/person-avatar";
import { NovoArbitroModal } from "./novo-arbitro-modal";
import styles from "@/app/(lab)/components/entity-hub.module.css";

type Referee = {
  id: string;
  full_name: string;
  surname: string | null;
  photo_url: string | null;
  profile_public: boolean;
  birth_date: string | null;
  referee_role_id: string | null;
};

type SortBy = "name" | "age_asc" | "age_desc";

const ROLE_TABS = [
  { id: "e9bd3156-58b3-4758-8c6e-5d48e53228e0", label: "ÁRBITRO" },
  { id: "556252c8-8365-466b-9a8e-464364a09902", label: "ASSISTENTE" },
  { id: "4dba8c5a-025f-4487-b4e8-60a16c104b2d", label: "MESÁRIO" },
  { id: "0833c834-6548-4775-affb-48bd095d8cde", label: "STAFF" },
] as const;

const SORT_OPTIONS = [
  { value: "name", label: "Nome (A–Z)" },
  { value: "age_asc", label: "Idade (menor → maior)" },
  { value: "age_desc", label: "Idade (maior → menor)" },
];

function getNickname(fullName: string, surname: string | null): string {
  return (surname ?? fullName.split(" ")[0] ?? fullName).toUpperCase();
}

function getAgeNumber(birth_date: string | null): number | null {
  if (!birth_date) return null;
  const diff = Date.now() - new Date(birth_date).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

const RefereeListItem = memo(function RefereeListItem({ referee }: { referee: Referee }) {
  return (
    <div className={styles.athleteListRow}>
      <div className={styles.athleteListRowInner}>
        <Link href={`/arbitros/${referee.id}`} className={styles.athleteListRowLink}>
          <PersonAvatar
            photoUrl={referee.photo_url}
            size={36}
            className={styles.athleteListAvatar}
          />
          <div className={styles.athleteListDetails}>
            <p className={styles.athleteListNickname}>{getNickname(referee.full_name, referee.surname)}</p>
            <p className={styles.athleteListFullName}>{referee.full_name}</p>
            {referee.profile_public && (
              <span className={`${styles.statusBadge} ${styles.statusBadgeApproved}`}>Público</span>
            )}
          </div>
        </Link>
      </div>
    </div>
  );
});

export default function ArbitrosClient({ referees: initialReferees }: { referees: Referee[] }) {
  const [referees] = useState(initialReferees);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [activeTab, setActiveTab] = useState<string>(ROLE_TABS[0].id);
  const [sortBy, setSortBy] = useState<SortBy | "">("");
  const [modalOpen, setModalOpen] = useState(false);

  const activeTabLabel = ROLE_TABS.find((tab) => tab.id === activeTab)?.label ?? "ÁRBITRO";

  const { counts, filtered } = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    const countsMap: Record<string, number> = {};
    const result: Referee[] = [];

    for (const tab of ROLE_TABS) {
      countsMap[tab.id] = 0;
    }

    for (const referee of referees) {
      const roleId = referee.referee_role_id ?? "";
      if (roleId in countsMap) countsMap[roleId] += 1;

      if (referee.referee_role_id !== activeTab) continue;

      if (q) {
        const haystack = `${referee.full_name} ${referee.surname ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) continue;
      }

      result.push(referee);
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
  }, [referees, activeTab, deferredSearch, sortBy]);

  const hasFilters = search.trim() || sortBy;

  return (
    <div className={`${styles.entityHub} ${styles.page} ${styles.hubListPage} ${styles.personListHub}`}>
      <div className={`${styles.header} ${styles.orgHubHeaderTabsOnly}`}>
        <div className={styles.headerGlow} />
        <div className={styles.headerSurface} />
        <div className={styles.headerInner}>
          <div className={styles.tabBar}>
            {ROLE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ""}`}
              >
                {tab.label}
                <span className={styles.tabBadge}>{counts[tab.id] ?? 0}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={`${styles.content} ${styles.hubListContent}`}>
        <div className={styles.hubListFilters}>
          <div className={styles.hubListFiltersRow}>
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
          </div>

          <div className={styles.hubListSearchRow}>
            <div className={styles.newsSearchWrap}>
              <Search size={15} strokeWidth={2} className={styles.newsSearchIcon} aria-hidden />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome ou apelido…"
                className={styles.newsSearchInput}
                aria-label="Buscar árbitros"
              />
            </div>
            <div className={styles.hubListSearchActions}>
              <button type="button" onClick={() => setModalOpen(true)} className={styles.saveBtn}>
                <Plus size={14} strokeWidth={2.5} />
                Novo árbitro
              </button>
            </div>
          </div>
        </div>

        <div className={`${styles.hubListBare} ${styles.athleteListStack}`}>
          {filtered.length === 0 ? (
            <div className={styles.listPanelEmpty}>
              <Flag size={32} strokeWidth={1.5} className={styles.newsEmptyIcon} />
              <p className={styles.listPanelEmptyTitle}>
                {hasFilters
                  ? "Nenhum árbitro encontrado"
                  : `Nenhum cadastro em ${activeTabLabel.toLowerCase()}`}
              </p>
              <p className={styles.newsEmptyDesc}>
                {hasFilters
                  ? "Ajuste os filtros ou tente outra busca."
                  : "Adicione árbitros usando o botão acima."}
              </p>
              {!hasFilters && (
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className={`${styles.saveBtn} ${styles.newsEmptyCta}`}
                >
                  <Plus size={14} strokeWidth={2.5} />
                  Novo árbitro
                </button>
              )}
            </div>
          ) : (
            filtered.map((referee) => <RefereeListItem key={referee.id} referee={referee} />)
          )}
        </div>
      </div>

      <NovoArbitroModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultRoleId={activeTab}
      />
    </div>
  );
}
