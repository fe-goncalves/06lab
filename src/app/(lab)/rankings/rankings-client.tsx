"use client";

import { memo, useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { RefreshCw, Trophy } from "lucide-react";
import { GenderSwitch } from "@/app/(lab)/components/gender-switch";
import { LabPicker } from "@/app/(lab)/components/lab-picker";
import { toast } from "@/app/(lab)/components/toast";
import styles from "@/app/(lab)/components/entity-hub.module.css";
import {
  loadRanking,
  loadRankingExtrato,
  recalcularRanking,
  type RankingExtrato,
  type RankingFiltroOpcoes,
  type RankingFiltros,
} from "./actions";
import type { RankingRow } from "@/lib/ranking-calculate";
import { RankingExtratoModal } from "./ranking-extrato-modal";

function rankClass(rank: number): string {
  if (rank === 1) return styles.hallRankNumTop1;
  if (rank === 2) return styles.hallRankNumTop2;
  if (rank === 3) return styles.hallRankNumTop3;
  return "";
}

function competitionGenderMatches(filterGender: string, competitionGender: string | null | undefined): boolean {
  const g = (competitionGender ?? "").toLowerCase();
  if (filterGender === "male") return g === "male" || g === "m" || g === "masculino";
  return g === "female" || g === "f" || g === "feminino";
}

const TeamRankingRow = memo(function TeamRankingRow({
  rank,
  row,
  onOpenExtrato,
}: {
  rank: number;
  row: RankingRow;
  onOpenExtrato: (row: RankingRow) => void;
}) {
  const displayLabel = (row.short_name ?? row.team_name).toUpperCase();
  const logoFallback = displayLabel.slice(0, 2);

  return (
    <button type="button" onClick={() => onOpenExtrato(row)} className={styles.hallRankRowButton}>
      <div className={styles.athleteListRowInner}>
        <span className={`${styles.hallRankNum} ${rankClass(rank)}`}>{rank}º</span>

        <div className={styles.athleteListRowLink}>
          <div className={styles.hubListTeamLogoMain} title={row.short_name ?? row.team_name}>
            {row.logo_url ? (
              <img src={row.logo_url} alt="" loading="lazy" decoding="async" />
            ) : (
              <span className={styles.hubListTeamLogoFallback}>{logoFallback}</span>
            )}
          </div>

          <div className={styles.athleteListDetails}>
            <p className={styles.athleteListNickname}>{displayLabel}</p>
          </div>
        </div>

        <div className={styles.hallRankStat}>
          <span className={styles.hallRankStatValue}>{row.total_points}</span>
          <span className={styles.hallRankStatSuffix}>pts</span>
        </div>
      </div>
    </button>
  );
});

interface Props {
  opcoesFiltro: RankingFiltroOpcoes;
}

export default function RankingsClient({ opcoesFiltro }: Props) {
  const [gender, setGender] = useState<"male" | "female">("male");
  const [competitionId, setCompetitionId] = useState("");
  const [seasonId, setSeasonId] = useState("");
  const [yearId, setYearId] = useState("");
  const [rows, setRows] = useState<RankingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalcPending, startRecalc] = useTransition();
  const [extrato, setExtrato] = useState<RankingExtrato | null>(null);
  const [extratoLoading, setExtratoLoading] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  const filtros = useMemo<RankingFiltros>(
    () => ({
      gender,
      competitionId: competitionId || undefined,
      seasonId: seasonId || undefined,
      yearId: yearId || undefined,
    }),
    [gender, competitionId, seasonId, yearId],
  );

  const competitionOptions = useMemo(
    () =>
      opcoesFiltro.competitions
        .filter((competition) => competitionGenderMatches(gender, competition.gender))
        .map((competition) => ({
          id: competition.id,
          label: competition.short_name ?? competition.full_name,
          logo_url: competition.logo_url,
          searchText: competition.full_name,
        })),
    [opcoesFiltro.competitions, gender],
  );

  const temFiltroAtivo = !!(competitionId || seasonId || yearId);

  const fetchRanking = useCallback(async (nextFiltros: RankingFiltros) => {
    setLoading(true);
    const result = await loadRanking(nextFiltros);
    setLoading(false);

    if ("error" in result) {
      toast("error", result.error);
      setRows([]);
      return;
    }

    setRows(result.data);
  }, []);

  useEffect(() => {
    void fetchRanking(filtros);
  }, [filtros, fetchRanking]);

  useEffect(() => {
    setExtrato(null);
    setSelectedTeamId(null);
    setExtratoLoading(false);
  }, [gender, competitionId, seasonId, yearId]);

  useEffect(() => {
    if (!competitionId) return;
    const stillValid = competitionOptions.some((option) => option.id === competitionId);
    if (!stillValid) setCompetitionId("");
  }, [competitionId, competitionOptions]);

  const handleRecalcular = () => {
    startRecalc(async () => {
      const result = await recalcularRanking(gender);
      if ("error" in result) {
        toast("error", result.error);
        return;
      }
      toast("success", "Ranking atualizado.");
      await fetchRanking(filtros);
      if (selectedTeamId) {
        setExtratoLoading(true);
        const extratoResult = await loadRankingExtrato(selectedTeamId, filtros);
        setExtratoLoading(false);
        if ("error" in extratoResult) {
          toast("error", extratoResult.error);
          setExtrato(null);
          setSelectedTeamId(null);
          return;
        }
        setExtrato(extratoResult.data);
      }
    });
  };

  const handleOpenExtrato = async (row: RankingRow) => {
    setSelectedTeamId(row.team_id);
    setExtrato(null);
    setExtratoLoading(true);

    const result = await loadRankingExtrato(row.team_id, filtros);
    setExtratoLoading(false);

    if ("error" in result) {
      toast("error", result.error);
      setSelectedTeamId(null);
      return;
    }

    setExtrato(result.data);
  };

  const handleCloseExtrato = () => {
    setExtrato(null);
    setSelectedTeamId(null);
    setExtratoLoading(false);
  };

  return (
    <div className={`${styles.entityHub} ${styles.page} ${styles.hubListPage} ${styles.personListHub} ${styles.rankingsHub}`}>
      <div className={`${styles.content} ${styles.hubListContent}`}>
        <main className={`${styles.hallMain} ${loading ? styles.hallMainLoading : ""}`}>
          <div className={styles.rankingsTitleRow}>
            <h2 className={styles.hallCategoryTitle}>Ranking histórico</h2>
            <button
              type="button"
              onClick={handleRecalcular}
              disabled={recalcPending || loading}
              className={styles.hallRecalcBtn}
            >
              <RefreshCw size={14} className={recalcPending ? styles.hallRecalcBtnSpin : undefined} />
              {recalcPending ? "RECALCULANDO…" : "RECALCULAR RANKING"}
            </button>
          </div>
          <p className={styles.sectionSubtitle}>Pontuação acumulada por equipe</p>

          <div className={styles.rankingsFiltersBlock}>
            <GenderSwitch value={gender} onChange={setGender} />

            <div className={styles.hallFiltersRow}>
              <div className={styles.hallFilterField}>
                <LabPicker
                  value={competitionId}
                  onChange={setCompetitionId}
                  emptyLabel="Competição"
                  searchPlaceholder="Buscar competição…"
                  menuSans
                  triggerSans
                  options={competitionOptions}
                />
              </div>
              <div className={styles.hallFilterField}>
                <LabPicker
                  showLogos={false}
                  value={seasonId}
                  onChange={setSeasonId}
                  emptyLabel="Temporada"
                  searchPlaceholder="Buscar temporada…"
                  menuSans
                  triggerSans
                  options={opcoesFiltro.seasons.map((season) => ({ id: season.id, label: season.name }))}
                />
              </div>
              <div className={styles.hallFilterField}>
                <LabPicker
                  showLogos={false}
                  value={yearId}
                  onChange={setYearId}
                  emptyLabel="Ano"
                  searchPlaceholder="Buscar ano…"
                  menuSans
                  triggerSans
                  options={opcoesFiltro.years.map((year) => ({ id: year.id, label: String(year.value) }))}
                />
              </div>
              {temFiltroAtivo && (
                <button
                  type="button"
                  onClick={() => {
                    setCompetitionId("");
                    setSeasonId("");
                    setYearId("");
                  }}
                  className={styles.hallClearBtn}
                >
                  Limpar filtros
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className={`${styles.hubListBare} ${styles.athleteListStack}`}>
              <div className={styles.listPanelEmpty}>
                <p className={styles.listPanelEmptyTitle}>Carregando ranking…</p>
              </div>
            </div>
          ) : rows.length === 0 ? (
            <div className={`${styles.hubListBare} ${styles.athleteListStack}`}>
              <div className={styles.listPanelEmpty}>
                <Trophy size={32} strokeWidth={1.5} className={styles.newsEmptyIcon} />
                <p className={styles.listPanelEmptyTitle}>Sem equipes neste ranking</p>
                <p className={styles.newsEmptyDesc}>
                  {temFiltroAtivo
                    ? "Tente ajustar os filtros."
                    : "O ranking aparecerá quando houver pontuação registrada."}
                </p>
              </div>
            </div>
          ) : (
            <div className={`${styles.hubListBare} ${styles.athleteListStack}`}>
              {rows.map((row, idx) => (
                <TeamRankingRow
                  key={row.team_id}
                  rank={idx + 1}
                  row={row}
                  onOpenExtrato={handleOpenExtrato}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {(extrato || extratoLoading) && (
        <RankingExtratoModal
          extrato={extrato}
          loading={extratoLoading}
          onClose={handleCloseExtrato}
        />
      )}
    </div>
  );
}
