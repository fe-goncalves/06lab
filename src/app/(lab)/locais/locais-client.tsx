"use client";

import { memo, useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { MapPinned, Plus, Search } from "lucide-react";
import { LabSelect } from "@/app/(lab)/components/lab-select";
import { NovoLocalModal } from "./novo-local-modal";
import styles from "@/app/(lab)/components/entity-hub.module.css";

type Venue = {
  id: string;
  full_name: string;
  short_name: string | null;
  logo_url: string | null;
  address: string | null;
  display_order: number | null;
};

type SortBy = "name" | "display_order";

const SORT_OPTIONS = [
  { value: "name", label: "Nome (A–Z)" },
  { value: "display_order", label: "Ordem de exibição" },
];

function getShortLabel(venue: Venue): string {
  return (venue.short_name ?? venue.full_name.split(" ")[0] ?? venue.full_name).toUpperCase();
}

const VenueListItem = memo(function VenueListItem({ venue }: { venue: Venue }) {
  const logoLabel = (venue.short_name ?? venue.full_name).slice(0, 2).toUpperCase();

  return (
    <div className={styles.athleteListRow}>
      <div className={styles.athleteListRowInner}>
        <Link href={`/locais/${venue.id}`} className={styles.athleteListRowLink}>
          <div className={styles.hubListTeamLogoMain} title={venue.full_name}>
            {venue.logo_url ? (
              <img src={venue.logo_url} alt="" loading="lazy" decoding="async" />
            ) : (
              <span className={styles.hubListTeamLogoFallback}>{logoLabel}</span>
            )}
          </div>

          <div className={styles.athleteListDetails}>
            <p className={styles.athleteListNickname}>{getShortLabel(venue)}</p>
            <p className={styles.athleteListFullName}>{venue.full_name}</p>
          </div>
        </Link>
      </div>
    </div>
  );
});

export default function LocaisClient({ venues: initialVenues }: { venues: Venue[] }) {
  const [venues] = useState(initialVenues);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [sortBy, setSortBy] = useState<SortBy | "">("");
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    const result = venues.filter((venue) => {
      if (!q) return true;
      const haystack = `${venue.full_name} ${venue.short_name ?? ""} ${venue.address ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });

    const effectiveSort = sortBy || "name";

    result.sort((a, b) => {
      if (effectiveSort === "display_order") {
        const orderA = a.display_order ?? Number.POSITIVE_INFINITY;
        const orderB = b.display_order ?? Number.POSITIVE_INFINITY;
        if (orderA !== orderB) return orderA - orderB;
      }
      return a.full_name.localeCompare(b.full_name);
    });

    return result;
  }, [venues, deferredSearch, sortBy]);

  const hasFilters = search.trim() || sortBy;

  return (
    <div className={`${styles.entityHub} ${styles.page} ${styles.hubListPage} ${styles.personListHub}`}>
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
                placeholder="Buscar por nome ou endereço…"
                className={styles.newsSearchInput}
                aria-label="Buscar locais"
              />
            </div>
            <div className={styles.hubListSearchActions}>
              <button type="button" onClick={() => setModalOpen(true)} className={styles.saveBtn}>
                <Plus size={14} strokeWidth={2.5} />
                Novo local
              </button>
            </div>
          </div>
        </div>

        <div className={`${styles.hubListBare} ${styles.athleteListStack}`}>
          {filtered.length === 0 ? (
            <div className={styles.listPanelEmpty}>
              <MapPinned size={32} strokeWidth={1.5} className={styles.newsEmptyIcon} />
              <p className={styles.listPanelEmptyTitle}>
                {hasFilters ? "Nenhum local encontrado" : "Nenhum local cadastrado"}
              </p>
              <p className={styles.newsEmptyDesc}>
                {hasFilters
                  ? "Ajuste os filtros ou tente outra busca."
                  : "Adicione locais usando o botão acima."}
              </p>
              {!hasFilters && (
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className={`${styles.saveBtn} ${styles.newsEmptyCta}`}
                >
                  <Plus size={14} strokeWidth={2.5} />
                  Novo local
                </button>
              )}
            </div>
          ) : (
            filtered.map((venue) => <VenueListItem key={venue.id} venue={venue} />)
          )}
        </div>
      </div>

      <NovoLocalModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
