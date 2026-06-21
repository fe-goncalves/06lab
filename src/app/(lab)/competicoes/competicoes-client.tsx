"use client";

import Link from "next/link";
import { memo, useDeferredValue, useMemo, useState } from "react";
import { Crown, Eye, GripVertical, Pin, Plus, Search, Settings } from "lucide-react";
import { NovaCompeticaoModal } from "./nova-competicao-modal";
import { reordenarCompeticoes } from "./actions";
import { toast } from "@/app/(lab)/components/toast";
import styles from "@/app/(lab)/components/entity-hub.module.css";

type Competition = {
  id: string;
  full_name: string;
  short_name: string | null;
  gender: string | null;
  logo_url: string | null;
  pinned_in_sidebar: boolean;
  home_priority: number;
  current_edition_name: string | null;
  current_edition_status: string | null;
};

type GenderTab = "male" | "female";

const GENDER_TABS = [
  { id: "male" as const, label: "MASCULINO" },
  { id: "female" as const, label: "FEMININO" },
];

const EDITION_STATUS_LABEL: Record<string, string> = {
  planned: "Planejada",
  ongoing: "Em andamento",
  closed: "Encerrada",
};

const EDITION_STATUS_CHIP: Record<string, string> = {
  planned: styles.hubChip,
  ongoing: `${styles.hubChip} ${styles.hubChipBrand}`,
  closed: styles.hubChip,
};

function normalizeGender(gender: string | null): "male" | "female" | "other" {
  const g = (gender ?? "").toLowerCase();
  if (g === "male" || g === "m" || g === "masculino") return "male";
  if (g === "female" || g === "f" || g === "feminino") return "female";
  return "other";
}

function sortByPriority(a: Competition, b: Competition) {
  if (a.home_priority !== b.home_priority) return b.home_priority - a.home_priority;
  return a.full_name.localeCompare(b.full_name, "pt-BR");
}

const CompetitionListItem = memo(function CompetitionListItem({
  competition,
  draggable,
  isDragging,
  onDragStart,
  onDragEnd,
  onDrop,
}: {
  competition: Competition;
  draggable: boolean;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDrop: () => void;
}) {
  const shortLabel = (competition.short_name ?? competition.full_name).toUpperCase();
  const logoFallback = shortLabel.slice(0, 2);
  const status = competition.current_edition_status;
  const statusLabel = status ? (EDITION_STATUS_LABEL[status] ?? status) : null;
  const statusChipClass = status ? (EDITION_STATUS_CHIP[status] ?? styles.hubChip) : styles.hubChip;

  return (
    <div
      className={`${styles.athleteListRow} ${styles.competitionListRow} ${isDragging ? styles.hubListRowSelected : ""}`}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
    >
      <div className={styles.athleteListRowInner}>
        {draggable && (
          <span className={styles.hubDragHandle} title="Arrastar para reordenar">
            <GripVertical size={16} strokeWidth={2} />
          </span>
        )}
        <Link href={`/competicoes/${competition.id}`} className={styles.athleteListRowLink}>
          <div className={styles.hubListTeamLogoMain} title={competition.full_name}>
            {competition.logo_url ? (
              <img src={competition.logo_url} alt="" loading="lazy" decoding="async" />
            ) : (
              <span className={styles.hubListTeamLogoFallback}>{logoFallback}</span>
            )}
          </div>
          <div className={styles.athleteListDetails}>
            <p className={styles.athleteListNickname}>{shortLabel}</p>
            {(competition.current_edition_name || statusLabel) && (
              <div className={styles.hubChipRow} style={{ marginTop: 6 }}>
                {competition.current_edition_name && (
                  <span className={styles.hubChip}>{competition.current_edition_name}</span>
                )}
                {statusLabel && (
                  <span className={statusChipClass}>{statusLabel}</span>
                )}
              </div>
            )}
          </div>
        </Link>
        <div className={styles.hubRowActionsHover}>
          {competition.pinned_in_sidebar && (
            <span className={styles.competitionPinIcon} title="Fixada na sidebar">
              <Pin size={14} strokeWidth={2.2} />
            </span>
          )}
          <Link
            href={`/competicoes/${competition.id}/configuracoes`}
            className={styles.hubIconActionBtn}
            aria-label="Configurações da competição"
            title="Configurações"
          >
            <Settings size={14} strokeWidth={2} />
          </Link>
          <a
            href="#"
            className={styles.hubIconActionBtn}
            aria-label="Ver no 06.score"
            title="Ver no 06.score"
            onClick={(e) => e.preventDefault()}
          >
            <Eye size={14} strokeWidth={2} />
          </a>
        </div>
      </div>
    </div>
  );
});

export default function CompeticoesClient({ competitions: initialCompetitions }: { competitions: Competition[] }) {
  const [competitions, setCompetitions] = useState(initialCompetitions);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [activeTab, setActiveTab] = useState<GenderTab>("male");
  const [modalOpen, setModalOpen] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  const { counts, filtered } = useMemo(() => {
    const countsMap = { male: 0, female: 0 };
    const q = deferredSearch.trim().toLowerCase();

    const genderFiltered = competitions.filter((c) => {
      const gender = normalizeGender(c.gender);
      if (gender === "male") countsMap.male += 1;
      if (gender === "female") countsMap.female += 1;
      return gender === activeTab;
    });

    const result = genderFiltered
      .filter((c) => !q
        || c.full_name.toLowerCase().includes(q)
        || (c.short_name ?? "").toLowerCase().includes(q)
        || (c.current_edition_name ?? "").toLowerCase().includes(q))
      .sort(sortByPriority);

    return { counts: countsMap, filtered: result };
  }, [competitions, activeTab, deferredSearch]);

  const activeTabLabel = activeTab === "male" ? "masculina" : "feminina";
  const hasSearch = !!search.trim();
  const canDrag = !hasSearch && !reordering;

  function reorderCompetitions(sourceId: string, targetId: string) {
    if (sourceId === targetId) return;

    const genderItems = competitions
      .filter((c) => normalizeGender(c.gender) === activeTab)
      .sort(sortByPriority);

    const from = genderItems.findIndex((c) => c.id === sourceId);
    const to = genderItems.findIndex((c) => c.id === targetId);
    if (from < 0 || to < 0) return;

    const next = [...genderItems];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);

    const base = activeTab === "male" ? 200_000 : 100_000;
    const withPriority = next.map((c, i) => ({
      ...c,
      home_priority: base + (next.length - i),
    }));

    const other = competitions.filter((c) => normalizeGender(c.gender) !== activeTab);
    const previous = competitions;
    setCompetitions([...other, ...withPriority].sort((a, b) => {
      const ga = normalizeGender(a.gender);
      const gb = normalizeGender(b.gender);
      if (ga !== gb) return ga === "male" ? -1 : 1;
      return sortByPriority(a, b);
    }));

    setReordering(true);
    void (async () => {
      const result = await reordenarCompeticoes(activeTab, withPriority.map((c) => c.id));
      setReordering(false);
      if ("error" in result) {
        toast("error", result.error);
        setCompetitions(previous);
      }
    })();
  }

  return (
    <div className={`${styles.entityHub} ${styles.page} ${styles.hubListPage} ${styles.personListHub} ${styles.adminHub} ${styles.adminHubTabs} ${styles.competicoesHub}`}>
      <div className={`${styles.header} ${styles.orgHubHeaderTabsOnly}`}>
        <div className={styles.headerGlow} />
        <div className={styles.headerSurface} />
        <div className={styles.headerInner}>
          <div className={styles.hubHeaderStack}>
            <div className={styles.hubHeaderIntro}>
              <h2 className={styles.hubHeaderMonoTitle}>Competições</h2>
              <p className={styles.sectionSubtitle}>
                Gerencie competições, edições e temporadas por modalidade.
                {reordering ? " · salvando ordem…" : canDrag ? " · arraste para reordenar" : ""}
              </p>
            </div>
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
      </div>

      <div className={`${styles.content} ${styles.hubListContent}`}>
        <main className={styles.hallMain}>
          <div className={styles.adminToolbarBlock}>
            <div className={`${styles.hubListSearchRow} ${styles.hubTabPanelTools}`}>
              <div className={styles.newsSearchWrap}>
                <Search size={15} strokeWidth={2} className={styles.newsSearchIcon} aria-hidden />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nome ou sigla…"
                  className={styles.newsSearchInput}
                  aria-label="Buscar competição"
                />
              </div>
              <div className={styles.hubListSearchActions}>
                <button type="button" onClick={() => setModalOpen(true)} className={styles.saveBtn}>
                  <Plus size={14} strokeWidth={2.5} />
                  Nova competição
                </button>
              </div>
            </div>
          </div>

          <div className={`${styles.hubListBare} ${styles.athleteListStack} ${styles.adminListSection}`}>
          {filtered.length === 0 ? (
            <div className={styles.listPanelEmpty}>
              <Crown size={32} strokeWidth={1.5} className={styles.newsEmptyIcon} />
              <p className={styles.listPanelEmptyTitle}>
                {hasSearch
                  ? "Nenhuma competição encontrada"
                  : `Nenhuma competição ${activeTabLabel} cadastrada`}
              </p>
              <p className={styles.newsEmptyDesc}>
                {hasSearch
                  ? "Tente outro termo de busca."
                  : "Crie uma competição para começar a organizar edições e partidas."}
              </p>
              {!hasSearch && (
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className={`${styles.saveBtn} ${styles.newsEmptyCta}`}
                >
                  <Plus size={14} strokeWidth={2.5} />
                  Nova competição
                </button>
              )}
            </div>
          ) : (
            filtered.map((competition) => (
              <CompetitionListItem
                key={competition.id}
                competition={competition}
                draggable={canDrag}
                isDragging={draggingId === competition.id}
                onDragStart={() => setDraggingId(competition.id)}
                onDragEnd={() => setDraggingId(null)}
                onDrop={() => {
                  if (draggingId) reorderCompetitions(draggingId, competition.id);
                  setDraggingId(null);
                }}
              />
            ))
          )}
          </div>
        </main>
      </div>

      <NovaCompeticaoModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultGender={activeTab}
      />
    </div>
  );
}
