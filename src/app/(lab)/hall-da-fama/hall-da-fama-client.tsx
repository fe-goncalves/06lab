"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { RefreshCw, Star } from "lucide-react";
import { LabPicker } from "@/app/(lab)/components/lab-picker";
import { PersonAvatar } from "@/app/(lab)/components/person-avatar";
import { toast } from "@/app/(lab)/components/toast";
import styles from "@/app/(lab)/components/entity-hub.module.css";
import {
  buscarCategoria,
  recalcularEstatisticas,
  type HallFiltros,
  type HallDaFamaData,
  type AthleteEntry,
  type TeamEntry,
  type StaffEntry,
  type FiltroOpcoes,
} from "./actions";

type SectionKey = "atletas" | "equipes" | "comissao";

type CategoryItem = {
  key: string;
  label: string;
  dataKey: keyof HallDaFamaData;
  suffix: string;
  gkOnly?: boolean;
  disabled?: boolean;
};

const SECTION_TABS: { id: SectionKey; label: string }[] = [
  { id: "atletas", label: "ATLETAS" },
  { id: "equipes", label: "EQUIPES" },
  { id: "comissao", label: "COMISSÃO" },
];

const CATEGORIES: Record<SectionKey, { label: string; items: CategoryItem[] }> = {
  atletas: {
    label: "Atletas",
    items: [
      { key: "goals", label: "Artilharia", dataKey: "artilharia", suffix: "gols" },
      { key: "assists", label: "Assistências", dataKey: "assistencias", suffix: "assist." },
      { key: "matches", label: "Jogos", dataKey: "partidas", suffix: "jogos" },
      { key: "yellow_cards", label: "Cartões amarelos", dataKey: "cartoes_amarelos", suffix: "amarelos" },
      { key: "red_cards", label: "Cartões vermelhos", dataKey: "red_cards", suffix: "vermelhos" },
      { key: "motm", label: "Atleta da partida", dataKey: "motm", suffix: "MOTM" },
      { key: "tots", label: "TOTS", dataKey: "tots", suffix: "TOTS" },
      { key: "titles", label: "Títulos", dataKey: "titles", suffix: "títulos" },
      { key: "awards", label: "Premiações", dataKey: "awards", suffix: "prêmios" },
      { key: "goal_assist", label: "Participações em gol", dataKey: "goal_assist", suffix: "G+A" },
      { key: "penalty_goals", label: "Gols de pênalti", dataKey: "penalty_goals", suffix: "gols" },
      { key: "shootout_goals", label: "Gols de shoot-out", dataKey: "shootout_goals", suffix: "gols" },
      { key: "penalty_conversion", label: "Aproveitamento pênaltis", dataKey: "penalty_conversion", suffix: "%" },
      { key: "shootout_conversion", label: "Aproveitamento shoot-outs", dataKey: "shootout_conversion", suffix: "%" },
      { key: "hat_tricks", label: "Hat-tricks", dataKey: "hat_tricks", suffix: "hat-tricks" },
      { key: "best_match_goals", label: "Mais gols num jogo", dataKey: "best_match_goals", suffix: "gols" },
      { key: "clean_sheets", label: "Clean sheets", dataKey: "clean_sheets", suffix: "CS", gkOnly: true },
      { key: "penalty_saves", label: "Defesas de pênalti", dataKey: "penalty_saves", suffix: "defesas", gkOnly: true },
      { key: "shootout_saves", label: "Defesas de shoot-out", dataKey: "shootout_saves", suffix: "defesas", gkOnly: true },
    ],
  },
  equipes: {
    label: "Equipes",
    items: [
      { key: "team_titles", label: "Mais títulos", dataKey: "titulos", suffix: "títulos" },
      { key: "team_wins", label: "Mais vitórias", dataKey: "vitorias", suffix: "vitórias" },
      { key: "team_matches", label: "Mais jogos", dataKey: "team_matches", suffix: "jogos" },
      { key: "team_goals", label: "Mais gols", dataKey: "gols_marcados", suffix: "gols" },
      { key: "team_points", label: "Mais pontos", dataKey: "team_points", suffix: "pts" },
      { key: "win_streak", label: "Maior sequência", dataKey: "sequencia_vitorias", suffix: "vitórias" },
    ],
  },
  comissao: {
    label: "Comissão técnica",
    items: [
      { key: "staff_titles", label: "Mais títulos", dataKey: "tecnicos_titulos", suffix: "títulos" },
      { key: "staff_wins", label: "Mais vitórias", dataKey: "staff_wins", suffix: "vitórias" },
      { key: "staff_matches", label: "Mais jogos", dataKey: "staff_partidas", suffix: "jogos" },
    ],
  },
};

const PAGE_SIZE = 20;

type AnyEntry = AthleteEntry | TeamEntry | StaffEntry;

function isAthleteEntry(e: AnyEntry): e is AthleteEntry {
  return "athlete_id" in e;
}

function isTeamEntry(e: AnyEntry): e is TeamEntry {
  return "team_id" in e;
}

function filtrosKey(f: HallFiltros): string {
  return JSON.stringify({
    competitionId: f.competitionId ?? "",
    seasonId: f.seasonId ?? "",
    yearId: f.yearId ?? "",
    teamId: f.teamId ?? "",
    gender: f.gender ?? "",
  });
}

function getEntryId(entry: AnyEntry): string {
  if (isAthleteEntry(entry)) return entry.athlete_id;
  if (isTeamEntry(entry)) return entry.team_id;
  return entry.staff_member_id;
}

function getEntryHref(entry: AnyEntry): string {
  if (isAthleteEntry(entry)) return `/atletas/${entry.athlete_id}`;
  if (isTeamEntry(entry)) return `/equipes/${entry.team_id}`;
  return `/comissao/${entry.staff_member_id}`;
}

function rankClass(rank: number): string {
  if (rank === 1) return styles.hallRankNumTop1;
  if (rank === 2) return styles.hallRankNumTop2;
  if (rank === 3) return styles.hallRankNumTop3;
  return "";
}

const RankingRow = memo(function RankingRow({
  rank,
  entry,
  suffix,
}: {
  rank: number;
  entry: AnyEntry;
  suffix: string;
}) {
  const isAthlete = isAthleteEntry(entry);
  const isTeam = isTeamEntry(entry);

  const displayLabel = isTeam
    ? (entry.short_name ?? entry.full_name).toUpperCase()
    : (entry.surname ?? entry.full_name.split(" ")[0] ?? entry.full_name).toUpperCase();

  const photoUrl = isAthlete ? entry.photo_url : isTeam ? entry.logo_url : entry.photo_url;
  const teamLogo = isAthlete ? entry.team_logo : null;
  const teamLabel = isAthlete
    ? (entry.team_abbreviation ?? entry.team_name ?? "").slice(0, 2).toUpperCase()
    : null;

  const statValue = suffix === "%" ? entry.value.toFixed(1) : String(entry.value);

  return (
    <div className={styles.hallRankRow}>
      <div className={styles.athleteListRowInner}>
        <span className={`${styles.hallRankNum} ${rankClass(rank)}`}>{rank}º</span>

        <Link href={getEntryHref(entry)} className={styles.athleteListRowLink}>
          {isTeam ? (
            <div className={styles.hubListTeamLogoMain} title={entry.short_name ?? entry.full_name}>
              {entry.logo_url ? (
                <img src={entry.logo_url} alt="" loading="lazy" decoding="async" />
              ) : (
                <span className={styles.hubListTeamLogoFallback}>{displayLabel.slice(0, 2)}</span>
              )}
            </div>
          ) : (
            <>
              <PersonAvatar photoUrl={photoUrl} size={36} className={styles.athleteListAvatar} />
              {teamLogo && (
                <div className={styles.hubListTeamLogoMain} title={entry.team_name ?? undefined}>
                  <img src={teamLogo} alt="" loading="lazy" decoding="async" />
                </div>
              )}
              {!teamLogo && isAthlete && teamLabel && teamLabel !== "—" && (
                <div className={styles.hubListTeamLogoMain} title={entry.team_name ?? undefined}>
                  <span className={styles.hubListTeamLogoFallback}>{teamLabel}</span>
                </div>
              )}
            </>
          )}

          <div className={styles.athleteListDetails}>
            <p className={styles.athleteListNickname}>{displayLabel}</p>
          </div>
        </Link>

        <div className={styles.hallRankStat}>
          <span className={styles.hallRankStatValue}>
            {statValue}
            {suffix === "%" ? "%" : ""}
          </span>
          {suffix !== "%" && <span className={styles.hallRankStatSuffix}>{suffix}</span>}
        </div>
      </div>
    </div>
  );
});

interface Props {
  initialData: HallDaFamaData;
  opcoesFiltro: FiltroOpcoes;
}

export default function HallDaFamaClient({ initialData, opcoesFiltro }: Props) {
  const defaultCategory = CATEGORIES.atletas.items[0];
  const [activeSection, setActiveSection] = useState<SectionKey>("atletas");
  const [entries, setEntries] = useState<AnyEntry[]>(initialData.artilharia);
  const [filtros, setFiltros] = useState<HallFiltros>({});
  const [loading, setLoading] = useState(false);
  const [recalcPending, startRecalc] = useTransition();
  const [categorySearch, setCategorySearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryItem>(defaultCategory);
  const [page, setPage] = useState(0);
  const cacheRef = useRef<Map<string, AnyEntry[]>>(new Map());

  const sectionCategories = CATEGORIES[activeSection].items;

  const filteredCategories = useMemo(() => {
    const q = categorySearch.trim().toLowerCase();
    if (!q) return sectionCategories;
    return sectionCategories.filter((item) => item.label.toLowerCase().includes(q));
  }, [categorySearch, sectionCategories]);

  const carregarCategoria = useCallback(async (novosFiltros: HallFiltros, category: CategoryItem, skipCache = false) => {
    const cacheKey = `${category.key}:${filtrosKey(novosFiltros)}`;
    if (!skipCache) {
      const cached = cacheRef.current.get(cacheKey);
      if (cached) {
        setEntries(cached);
        setPage(0);
        return;
      }
    }

    setLoading(true);
    const result = await buscarCategoria(novosFiltros, category.key);
    setLoading(false);

    if ("error" in result) {
      toast("error", result.error);
      return;
    }

    const list = result as AnyEntry[];
    cacheRef.current.set(cacheKey, list);
    setEntries(list);
    setPage(0);
  }, []);

  useEffect(() => {
    const isDefault = activeCategory.key === "goals" && filtrosKey(filtros) === filtrosKey({});
    if (isDefault) {
      setEntries(initialData.artilharia);
      setPage(0);
      return;
    }
    carregarCategoria(filtros, activeCategory);
  }, [activeCategory, filtros, carregarCategoria, initialData.artilharia]);

  const handleSectionChange = (section: SectionKey) => {
    setActiveSection(section);
    setActiveCategory(CATEGORIES[section].items[0]);
    setCategorySearch("");
  };

  const handleFiltroChange = (campo: keyof HallFiltros, valor: string) => {
    setFiltros({ ...filtros, [campo]: valor || undefined });
  };

  const handleRecalcular = () => {
    startRecalc(async () => {
      const result = await recalcularEstatisticas();
      if ("error" in result) {
        toast("error", result.error);
        return;
      }
      toast("success", "Estatísticas atualizadas.");
      cacheRef.current.clear();
      await carregarCategoria(filtros, activeCategory, true);
    });
  };

  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const pageItems = entries.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const temFiltroAtivo = !!(filtros.competitionId || filtros.seasonId || filtros.yearId || filtros.teamId || filtros.gender);

  const sectionCounts = useMemo(
    () => ({
      atletas: CATEGORIES.atletas.items.length,
      equipes: CATEGORIES.equipes.items.length,
      comissao: CATEGORIES.comissao.items.length,
    }),
    [],
  );

  return (
    <div className={`${styles.entityHub} ${styles.page} ${styles.hubListPage} ${styles.personListHub} ${styles.hallHub}`}>
      <div className={`${styles.header} ${styles.orgHubHeaderTabsOnly}`}>
        <div className={styles.headerGlow} />
        <div className={styles.headerSurface} />
        <div className={styles.headerInner}>
          <div className={styles.hallHeaderRow}>
            <div className={styles.tabBar}>
              {SECTION_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleSectionChange(tab.id)}
                  className={`${styles.tab} ${activeSection === tab.id ? styles.tabActive : ""}`}
                >
                  {tab.label}
                  <span className={styles.tabBadge}>{sectionCounts[tab.id]}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleRecalcular}
              disabled={recalcPending}
              className={styles.hallRecalcBtn}
            >
              <RefreshCw size={14} className={recalcPending ? styles.hallRecalcBtnSpin : undefined} />
              {recalcPending ? "RECALCULANDO…" : "RECALCULAR ESTATÍSTICAS"}
            </button>
          </div>
        </div>
      </div>

      <div className={`${styles.content} ${styles.hubListContent}`}>
        <div className={styles.hallLayout}>
          <aside className={styles.hallSidebar}>
            <input
              type="search"
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              placeholder="Buscar categoria…"
              className={styles.hallSidebarSearch}
              aria-label="Buscar categoria"
            />
            <div className={styles.hallCategoryGroup}>
              <span className={styles.hallCategoryGroupLabel}>{CATEGORIES[activeSection].label}</span>
              {filteredCategories.map((item) => {
                const isActive = activeCategory.key === item.key;
                const isDisabled = item.disabled === true;
                return (
                  <button
                    key={item.key}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => !isDisabled && setActiveCategory(item)}
                    className={`${styles.hallCategoryBtn} ${isActive ? styles.hallCategoryBtnActive : ""}`}
                  >
                    <span>{item.label}</span>
                    {isDisabled && <span className={styles.hallCategorySoon}>Em breve</span>}
                  </button>
                );
              })}
            </div>
          </aside>

          <main className={`${styles.hallMain} ${loading ? styles.hallMainLoading : ""}`}>
            <h2 className={styles.hallCategoryTitle}>{activeCategory.label}</h2>

            <div className={styles.hallFiltersRow}>
              <div className={styles.hallFilterField}>
                <LabPicker
                  showLogos={false}
                  value={filtros.gender ?? ""}
                  onChange={(v) => handleFiltroChange("gender", v)}
                  emptyLabel="Gênero"
                  searchPlaceholder="Buscar…"
                  menuSans
                  triggerSans
                  options={[
                    { id: "male", label: "Masculino" },
                    { id: "female", label: "Feminino" },
                  ]}
                />
              </div>
              <div className={styles.hallFilterField}>
                <LabPicker
                  value={filtros.competitionId ?? ""}
                  onChange={(v) => handleFiltroChange("competitionId", v)}
                  emptyLabel="Competição"
                  searchPlaceholder="Buscar competição…"
                  menuSans
                  triggerSans
                  options={opcoesFiltro.competitions.map((c) => ({
                    id: c.id,
                    label: c.short_name ?? c.full_name,
                    logo_url: c.logo_url,
                    searchText: c.full_name,
                  }))}
                />
              </div>
              <div className={styles.hallFilterField}>
                <LabPicker
                  showLogos={false}
                  value={filtros.seasonId ?? ""}
                  onChange={(v) => handleFiltroChange("seasonId", v)}
                  emptyLabel="Temporada"
                  searchPlaceholder="Buscar temporada…"
                  menuSans
                  triggerSans
                  options={opcoesFiltro.seasons.map((s) => ({ id: s.id, label: s.name }))}
                />
              </div>
              <div className={styles.hallFilterField}>
                <LabPicker
                  showLogos={false}
                  value={filtros.yearId ?? ""}
                  onChange={(v) => handleFiltroChange("yearId", v)}
                  emptyLabel="Busque por ano"
                  searchPlaceholder="Buscar ano…"
                  menuSans
                  triggerSans
                  options={opcoesFiltro.years.map((y) => ({ id: y.id, label: String(y.value) }))}
                />
              </div>
              <div className={styles.hallFilterField}>
                <LabPicker
                  value={filtros.teamId ?? ""}
                  onChange={(v) => handleFiltroChange("teamId", v)}
                  emptyLabel="Busque por equipe"
                  searchPlaceholder="Buscar equipe…"
                  menuSans
                  triggerSans
                  options={opcoesFiltro.teams.map((t) => ({
                    id: t.id,
                    label: t.short_name ?? t.abbreviation ?? t.full_name,
                    logo_url: t.logo_url,
                    searchText: t.full_name,
                  }))}
                />
              </div>
            </div>

            {temFiltroAtivo && (
              <div className={styles.hallActionsRow}>
                <button type="button" onClick={() => setFiltros({})} className={styles.hallClearBtn}>
                  Limpar filtros
                </button>
              </div>
            )}

            {entries.length === 0 ? (
              <div className={`${styles.hubListBare} ${styles.athleteListStack}`}>
                <div className={styles.listPanelEmpty}>
                  <Star size={32} strokeWidth={1.5} className={styles.newsEmptyIcon} />
                  <p className={styles.listPanelEmptyTitle}>Sem dados para esta categoria</p>
                  <p className={styles.newsEmptyDesc}>
                    {temFiltroAtivo
                      ? "Tente ajustar os filtros."
                      : "Os recordes aparecerão quando houver estatísticas registradas."}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className={`${styles.hubListBare} ${styles.athleteListStack}`}>
                  {pageItems.map((entry, idx) => (
                    <RankingRow
                      key={getEntryId(entry)}
                      rank={page * PAGE_SIZE + idx + 1}
                      entry={entry}
                      suffix={activeCategory.suffix}
                    />
                  ))}
                </div>

                {entries.length > PAGE_SIZE && (
                  <div className={styles.hallPagination}>
                    <button
                      type="button"
                      disabled={page === 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      className={styles.hallPaginationBtn}
                    >
                      Anterior
                    </button>
                    <span className={styles.hallPaginationLabel}>
                      {page + 1} / {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      className={styles.hallPaginationBtn}
                    >
                      Próximo
                    </button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
