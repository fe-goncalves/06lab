"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Ban } from "lucide-react";
import { LabPicker } from "@/app/(lab)/components/lab-picker";
import { PersonAvatar } from "@/app/(lab)/components/person-avatar";
import styles from "@/app/(lab)/components/entity-hub.module.css";

type Edition = { id: string; name: string; competition_name: string };
type Suspension = {
  id: string;
  athlete_id: string;
  athlete_name: string;
  athlete_surname: string | null;
  scope_type: string;
  scope_edition_id: string;
  edition_label: string | null;
  starts_at: string;
  games_total: number;
  games_remaining: number;
  is_active: boolean;
  reason: string;
};

const STATUS_TABS = [
  { id: "active" as const, label: "ATIVAS" },
  { id: "all" as const, label: "TODAS" },
];

export default function SuspensoesClient({
  suspensions,
  editions,
}: {
  suspensions: Suspension[];
  editions: Edition[];
}) {
  const [activeFilter, setActiveFilter] = useState<"active" | "all">("active");
  const [editionFilter, setEditionFilter] = useState("");

  const filtered = useMemo(
    () =>
      suspensions
        .filter((s) => activeFilter === "all" || s.is_active)
        .filter((s) => !editionFilter || s.scope_edition_id === editionFilter),
    [suspensions, activeFilter, editionFilter],
  );

  const counts = useMemo(
    () => ({
      active: suspensions.filter((s) => s.is_active).length,
      all: suspensions.length,
    }),
    [suspensions],
  );

  const temFiltroAtivo = !!editionFilter;

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
                <span className={styles.tabBadge}>{counts[tab.id]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={`${styles.content} ${styles.hubListContent}`}>
        <main className={styles.hallMain}>
          <h2 className={styles.hallCategoryTitle}>Suspensões</h2>
          <p className={styles.sectionSubtitle}>
            {activeFilter === "active"
              ? "Suspensões em vigor. Para criar ou editar, acesse o hub da competição."
              : "Histórico completo de suspensões da organização."}
          </p>

          <div className={styles.adminFiltersBlock}>
            <div className={styles.hallFiltersRow}>
              {editions.length > 0 && (
                <div className={styles.hallFilterField}>
                  <LabPicker
                    value={editionFilter}
                    onChange={setEditionFilter}
                    emptyLabel="Competição"
                    searchPlaceholder="Buscar edição…"
                    menuSans
                    triggerSans
                    options={editions.map((edition) => ({
                      id: edition.id,
                      label: `${edition.competition_name} · ${edition.name}`,
                      searchText: `${edition.competition_name} ${edition.name}`,
                    }))}
                  />
                </div>
              )}
              {temFiltroAtivo && (
                <button type="button" onClick={() => setEditionFilter("")} className={styles.hallClearBtn}>
                  Limpar filtros
                </button>
              )}
            </div>
          </div>

          <div className={`${styles.hubListBare} ${styles.athleteListStack} ${styles.adminListSection}`}>
          {filtered.length === 0 ? (
            <div className={styles.listPanelEmpty}>
              <Ban size={32} strokeWidth={1.5} className={styles.newsEmptyIcon} />
              <p className={styles.listPanelEmptyTitle}>
                {activeFilter === "active" ? "Nenhuma suspensão ativa" : "Nenhuma suspensão registrada"}
              </p>
              <p className={styles.newsEmptyDesc}>
                {temFiltroAtivo
                  ? "Tente ajustar os filtros."
                  : "As suspensões aparecerão aqui quando forem registradas."}
              </p>
            </div>
          ) : (
            filtered.map((s) => {
              const cumpridos = s.games_total - s.games_remaining;
              const completa = s.games_remaining === 0;
              const pct = s.games_total > 0 ? (cumpridos / s.games_total) * 100 : 0;
              const displayLabel = (s.athlete_surname ?? s.athlete_name.split(" ")[0] ?? s.athlete_name).toUpperCase();

              return (
                <div
                  key={s.id}
                  className={`${styles.athleteListRow} ${!s.is_active ? styles.athleteListRowInactive : ""}`}
                >
                  <div className={styles.athleteListRowInner}>
                    <Link href={`/atletas/${s.athlete_id}`} className={styles.athleteListRowLink}>
                      <PersonAvatar size={36} className={styles.athleteListAvatar} />
                      <div className={styles.athleteListDetails}>
                        <p className={styles.athleteListNickname}>{displayLabel}</p>
                        <div className={styles.hubChipRow}>
                          {s.edition_label ? (
                            <span className={styles.hubChip}>{s.edition_label}</span>
                          ) : (
                            <span className={`${styles.hubChip} ${styles.hubChipWarning}`}>Global</span>
                          )}
                          <span className={styles.hubChip}>
                            {new Date(`${s.starts_at}T00:00:00`).toLocaleDateString("pt-BR")}
                          </span>
                          {s.reason && <span className={styles.hubChip}>{s.reason}</span>}
                        </div>
                      </div>
                    </Link>

                    <div className={styles.hubProgressWrap}>
                      <div className={styles.hubProgressLabel}>
                        <span>{cumpridos}/{s.games_total} jogos</span>
                        {completa && <span style={{ color: "var(--color-success)" }}>completa</span>}
                      </div>
                      <div className={styles.hubProgressTrack}>
                        <div
                          className={`${styles.hubProgressFill} ${completa ? styles.hubProgressFillDone : ""}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className={styles.hallRankStat}>
                      <span className={`${styles.hubStatDanger} ${completa ? styles.hubStatSuccess : ""}`}>
                        {s.games_remaining}
                      </span>
                      <span className={styles.hubStatSuffix}>rest.</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        </main>
      </div>
    </div>
  );
}
