"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { LabPicker } from "@/app/(lab)/components/lab-picker";
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

// ─── Configuração de categorias ───────────────────────────────────────────────

type CategoryItem = {
  key: string;
  label: string;
  dataKey: keyof HallDaFamaData;
  suffix: string;
  gkOnly?: boolean;
  disabled?: boolean;
};

const CATEGORIES: Record<"atletas" | "equipes" | "comissao", { label: string; items: CategoryItem[] }> = {
  atletas: {
    label: "ATLETAS",
    items: [
      { key: "goals", label: "Artilharia", dataKey: "artilharia", suffix: "gols" },
      { key: "assists", label: "Assistências", dataKey: "assistencias", suffix: "assist." },
      { key: "matches", label: "Jogos", dataKey: "partidas", suffix: "jogos" },
      { key: "yellow_cards", label: "Cartões Amarelos", dataKey: "cartoes_amarelos", suffix: "amarelos" },
      { key: "red_cards", label: "Cartões Vermelhos", dataKey: "red_cards", suffix: "vermelhos" },
      { key: "motm", label: "Atleta da Partida", dataKey: "motm", suffix: "MOTM" },
      { key: "tots", label: "TOTS", dataKey: "tots", suffix: "TOTS" },
      { key: "titles", label: "Títulos", dataKey: "titles", suffix: "títulos" },
      { key: "awards", label: "Premiações", dataKey: "awards", suffix: "prêmios" },
      { key: "goal_assist", label: "Participações em Gol", dataKey: "goal_assist", suffix: "G+A" },
      { key: "penalty_goals", label: "Gols de Pênalti", dataKey: "penalty_goals", suffix: "gols" },
      { key: "shootout_goals", label: "Gols de Shoot-out", dataKey: "shootout_goals", suffix: "gols" },
      { key: "penalty_conversion", label: "Aproveitamento Pênaltis", dataKey: "penalty_conversion", suffix: "%" },
      { key: "shootout_conversion", label: "Aproveitamento Shoot-outs", dataKey: "shootout_conversion", suffix: "%" },
      { key: "hat_tricks", label: "Hat-tricks", dataKey: "hat_tricks", suffix: "hat-tricks" },
      { key: "best_match_goals", label: "Mais Gols num Jogo", dataKey: "best_match_goals", suffix: "gols" },
      { key: "clean_sheets", label: "Clean Sheets", dataKey: "clean_sheets", suffix: "CS", gkOnly: true },
      { key: "penalty_saves", label: "Defesas de Pênalti", dataKey: "penalty_saves", suffix: "defesas", gkOnly: true },
      { key: "shootout_saves", label: "Defesas de Shoot-out", dataKey: "shootout_saves", suffix: "defesas", gkOnly: true },
    ],
  },
  equipes: {
    label: "EQUIPES",
    items: [
      { key: "team_titles", label: "Mais Títulos", dataKey: "titulos", suffix: "títulos" },
      { key: "team_wins", label: "Mais Vitórias", dataKey: "vitorias", suffix: "vitórias" },
      { key: "team_matches", label: "Mais Jogos", dataKey: "team_matches", suffix: "jogos" },
      { key: "team_goals", label: "Mais Gols", dataKey: "gols_marcados", suffix: "gols" },
      { key: "team_points", label: "Mais Pontos", dataKey: "team_points", suffix: "pts" },
      { key: "win_streak", label: "Maior Sequência", dataKey: "sequencia_vitorias", suffix: "vitórias" },
    ],
  },
  comissao: {
    label: "COMISSÃO TÉCNICA",
    items: [
      { key: "staff_titles", label: "Mais Títulos", dataKey: "tecnicos_titulos", suffix: "títulos" },
      { key: "staff_wins", label: "Mais Vitórias", dataKey: "staff_wins", suffix: "vitórias" },
      { key: "staff_matches", label: "Mais Jogos", dataKey: "staff_partidas", suffix: "jogos" },
    ],
  },
};

const PAGE_SIZE = 20;

const RANK_STYLES: Record<1 | 2 | 3 | "default", { color: string; fontSize: number; fontWeight: number }> = {
  1: { color: "#F2C005", fontSize: 20, fontWeight: 900 },
  2: { color: "#A6A6A6", fontSize: 17, fontWeight: 800 },
  3: { color: "#CD7F32", fontSize: 17, fontWeight: 800 },
  default: { color: "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: 700 },
};

type AnyEntry = AthleteEntry | TeamEntry | StaffEntry;

function isAthleteEntry(e: AnyEntry): e is AthleteEntry {
  return "athlete_id" in e;
}
function isTeamEntry(e: AnyEntry): e is TeamEntry {
  return "team_id" in e;
}

function rankStyle(rank: number) {
  if (rank === 1) return RANK_STYLES[1];
  if (rank === 2) return RANK_STYLES[2];
  if (rank === 3) return RANK_STYLES[3];
  return RANK_STYLES.default;
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

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  initialData: HallDaFamaData;
  opcoesFiltro: FiltroOpcoes;
}

export default function HallDaFamaClient({ initialData, opcoesFiltro }: Props) {
  const defaultCategory = CATEGORIES.atletas.items[0];
  const [entries, setEntries] = useState<AnyEntry[]>(initialData.artilharia);
  const [filtros, setFiltros] = useState<HallFiltros>({});
  const [loading, setLoading] = useState(false);
  const [recalcPending, startRecalc] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [categorySearch, setCategorySearch] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    atletas: true,
    equipes: true,
    comissao: true,
  });
  const [activeCategory, setActiveCategory] = useState<CategoryItem>(defaultCategory);
  const [page, setPage] = useState(0);
  const cacheRef = useRef<Map<string, AnyEntry[]>>(new Map());

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

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
      showToast(`Erro: ${result.error}`);
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

  const handleFiltroChange = (campo: keyof HallFiltros, valor: string) => {
    const next = { ...filtros, [campo]: valor || undefined };
    setFiltros(next);
  };

  const handleCategorySelect = (item: CategoryItem) => {
    setActiveCategory(item);
  };

  const handleRecalcular = () => {
    startRecalc(async () => {
      const result = await recalcularEstatisticas();
      if ("error" in result) {
        showToast(`Erro: ${result.error}`);
        return;
      }
      showToast("Estatísticas atualizadas.");
      cacheRef.current.clear();
      await carregarCategoria(filtros, activeCategory, true);
    });
  };

  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const pageItems = entries.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const filteredSections = useMemo(() => {
    const q = categorySearch.trim().toLowerCase();
    return (Object.entries(CATEGORIES) as [keyof typeof CATEGORIES, typeof CATEGORIES.atletas][]).map(([sectionKey, section]) => ({
      sectionKey,
      ...section,
      items: section.items.filter((item) => !q || item.label.toLowerCase().includes(q)),
    })).filter((s) => s.items.length > 0);
  }, [categorySearch]);

  const temFiltroAtivo = !!(filtros.competitionId || filtros.seasonId || filtros.yearId || filtros.teamId || filtros.gender);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "var(--color-background)" }}>
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          backgroundColor: "#141414", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 10, padding: "12px 18px",
          fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-text-primary)",
        }}>
          {toast}
        </div>
      )}

      <div style={{ padding: "24px 28px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 900, color: "var(--color-text-primary)", margin: 0 }}>
              HALL DA FAMA
            </h1>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.35)", margin: "6px 0 0" }}>
              Recordes e líderes históricos da organização
            </p>
          </div>
          <button
            type="button"
            onClick={handleRecalcular}
            disabled={recalcPending}
            style={{
              display: "flex", alignItems: "center", gap: 8, padding: "9px 16px",
              backgroundColor: "rgba(191,242,5,0.08)",
              border: "1px solid rgba(191,242,5,0.25)", borderRadius: 8,
              fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
              color: recalcPending ? "rgba(255,255,255,0.3)" : "#BFF205",
              cursor: recalcPending ? "not-allowed" : "pointer",
            }}
          >
            <RefreshCw size={13} style={{ animation: recalcPending ? "spin 1s linear infinite" : "none" }} />
            {recalcPending ? "Recalculando…" : "Recalcular estatísticas"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <aside style={{
          width: 280, flexShrink: 0,
          borderRight: "1px solid rgba(255,255,255,0.06)",
          backgroundColor: "rgba(255,255,255,0.02)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
          <div style={{ padding: "14px 14px 10px" }}>
            <input
              type="text"
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              placeholder="Buscar categoria…"
              style={{
                width: "100%", padding: "9px 12px", borderRadius: 9,
                border: "1px solid rgba(255,255,255,0.08)",
                backgroundColor: "rgba(255,255,255,0.03)",
                fontFamily: "var(--font-mono)", fontSize: 11,
                color: "var(--color-text-primary)", outline: "none",
              }}
            />
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "0 8px 16px" }}>
            {filteredSections.map(({ sectionKey, label, items }) => (
              <div key={sectionKey} style={{ marginBottom: 8 }}>
                <button
                  type="button"
                  onClick={() => setExpanded((p) => ({ ...p, [sectionKey]: !p[sectionKey] }))}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 8px", border: "none", background: "transparent",
                    cursor: "pointer", textAlign: "left",
                  }}
                >
                  {expanded[sectionKey] ? <ChevronDown size={14} color="#BFF205" /> : <ChevronRight size={14} color="rgba(255,255,255,0.35)" />}
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", color: "#BFF205" }}>
                    {label}
                  </span>
                </button>
                {expanded[sectionKey] && items.map((item) => {
                  const isActive = activeCategory.key === item.key;
                  const isDisabled = item.disabled === true;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => { if (!isDisabled) handleCategorySelect(item); }}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "9px 10px 9px 28px", marginBottom: 2, borderRadius: 8,
                        border: "none",
                        borderLeft: isActive ? "2px solid #BFF205" : "2px solid transparent",
                        backgroundColor: isActive ? "rgba(191,242,5,0.06)" : "transparent",
                        color: isDisabled ? "rgba(255,255,255,0.25)" : isActive ? "#BFF205" : "rgba(255,255,255,0.7)",
                        fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: isActive ? 700 : 500,
                        cursor: isDisabled ? "not-allowed" : "pointer", textAlign: "left",
                        opacity: isDisabled ? 0.6 : 1,
                      }}
                    >
                      <span>{item.label}</span>
                      {isDisabled && (
                        <span style={{
                          fontSize: 8, fontWeight: 800, letterSpacing: "0.08em",
                          padding: "2px 6px", borderRadius: 20,
                          border: "1px solid rgba(255,255,255,0.12)",
                          color: "rgba(255,255,255,0.35)",
                        }}>
                          EM BREVE
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </aside>

        <main style={{ flex: 1, minWidth: 0, padding: "20px 24px 32px", opacity: loading ? 0.55 : 1, transition: "opacity 0.2s" }}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 800, color: "var(--color-text-primary)", margin: "0 0 14px" }}>
              {activeCategory.label}
            </h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
              <FilterField label="Gênero">
                <LabPicker
                  showLogos={false}
                  value={filtros.gender ?? ""}
                  onChange={(v) => handleFiltroChange("gender", v)}
                  emptyLabel="Todos"
                  searchPlaceholder="Buscar…"
                  options={[
                    { id: "male", label: "Masculino" },
                    { id: "female", label: "Feminino" },
                  ]}
                />
              </FilterField>
              <FilterField label="Competição">
                <LabPicker
                  value={filtros.competitionId ?? ""}
                  onChange={(v) => handleFiltroChange("competitionId", v)}
                  emptyLabel="Todas"
                  searchPlaceholder="Buscar competição…"
                  options={opcoesFiltro.competitions.map((c) => ({
                    id: c.id,
                    label: c.short_name ?? c.full_name,
                    logo_url: c.logo_url,
                    searchText: c.full_name,
                  }))}
                />
              </FilterField>
              <FilterField label="Temporada">
                <LabPicker
                  showLogos={false}
                  value={filtros.seasonId ?? ""}
                  onChange={(v) => handleFiltroChange("seasonId", v)}
                  emptyLabel="Todas"
                  searchPlaceholder="Buscar temporada…"
                  options={opcoesFiltro.seasons.map((s) => ({ id: s.id, label: s.name }))}
                />
              </FilterField>
              <FilterField label="Ano">
                <LabPicker
                  showLogos={false}
                  value={filtros.yearId ?? ""}
                  onChange={(v) => handleFiltroChange("yearId", v)}
                  emptyLabel="Todos"
                  searchPlaceholder="Buscar ano…"
                  options={opcoesFiltro.years.map((y) => ({ id: y.id, label: String(y.value) }))}
                />
              </FilterField>
              <FilterField label="Equipe">
                <LabPicker
                  value={filtros.teamId ?? ""}
                  onChange={(v) => handleFiltroChange("teamId", v)}
                  emptyLabel="Todas"
                  searchPlaceholder="Buscar equipe…"
                  options={opcoesFiltro.teams.map((t) => ({
                    id: t.id,
                    label: t.short_name ?? t.abbreviation ?? t.full_name,
                    logo_url: t.logo_url,
                    searchText: t.full_name,
                  }))}
                />
              </FilterField>
              {temFiltroAtivo && (
                <button
                  type="button"
                  onClick={() => setFiltros({})}
                  style={{
                    padding: "9px 14px", borderRadius: 8,
                    border: "1px solid rgba(255,68,68,0.3)",
                    backgroundColor: "transparent", color: "#FF6666",
                    fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Limpar filtros
                </button>
              )}
            </div>
          </div>

          {entries.length === 0 ? (
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "rgba(255,255,255,0.3)", padding: "40px 0", textAlign: "center" }}>
              Sem dados para esta categoria.
            </p>
          ) : (
            <>
              <div style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
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
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 20 }}>
                  <button
                    type="button"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    style={paginationBtnStyle(page === 0)}
                  >
                    Anterior
                  </button>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    style={paginationBtnStyle(page >= totalPages - 1)}
                  >
                    Próximo
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function paginationBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: "8px 18px", borderRadius: 8,
    border: `1px solid ${disabled ? "rgba(255,255,255,0.06)" : "rgba(191,242,5,0.35)"}`,
    backgroundColor: "transparent",
    color: disabled ? "rgba(255,255,255,0.2)" : "#BFF205",
    fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ minWidth: 150, flex: "1 1 150px", maxWidth: 220 }}>
      <span style={{
        fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800,
        letterSpacing: "0.1em", textTransform: "uppercase",
        color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 5,
      }}>
        {label}
      </span>
      {children}
    </div>
  );
}

function getEntryId(entry: AnyEntry): string {
  if (isAthleteEntry(entry)) return entry.athlete_id;
  if (isTeamEntry(entry)) return entry.team_id;
  return entry.staff_member_id;
}

function RankingRow({ rank, entry, suffix }: { rank: number; entry: AnyEntry; suffix: string }) {
  const isAthlete = isAthleteEntry(entry);
  const isTeam = isTeamEntry(entry);
  const displayName = isAthlete
    ? (entry.surname ?? entry.full_name)
    : isTeam
      ? (entry.abbreviation ?? entry.full_name)
      : ((entry as StaffEntry).surname ?? (entry as StaffEntry).full_name);
  const photo = isAthlete ? entry.photo_url : isTeam ? entry.logo_url : (entry as StaffEntry).photo_url;
  const teamLabel = isAthlete ? entry.team_name : isTeam ? entry.full_name : null;
  const teamLogo = isAthlete ? entry.team_logo : null;
  const rs = rankStyle(rank);

  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "12px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        transition: "background-color 0.12s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
    >
      <span style={{
        fontFamily: "var(--font-mono)",
        fontSize: rs.fontSize,
        fontWeight: rs.fontWeight,
        color: rs.color,
        width: 32,
        flexShrink: 0,
        textAlign: "right",
      }}>
        {rank}º
      </span>
      <div style={{ position: "relative", flexShrink: 0 }}>
        <Avatar url={photo} round size={40} />
        {teamLogo && (
          <img
            src={teamLogo}
            alt=""
            style={{
              position: "absolute", bottom: -2, right: -4,
              width: 20, height: 20, objectFit: "contain",
              borderRadius: 4, border: "2px solid var(--color-background)",
              backgroundColor: "var(--color-surface)",
            }}
          />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700,
          color: "var(--color-text-primary)", margin: 0,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {displayName}
        </p>
        {teamLabel && (
          <p style={{
            fontFamily: "var(--font-mono)", fontSize: 10,
            color: "rgba(255,255,255,0.35)", margin: "3px 0 0",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {teamLabel}
          </p>
        )}
        {isTeam && entry.subtitle && (
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.25)", margin: "2px 0 0" }}>
            {entry.subtitle}
          </p>
        )}
      </div>
      <div style={{ flexShrink: 0, textAlign: "right" }}>
        {suffix === "%" ? (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 800, color: "#BFF205" }}>
            {entry.value.toFixed(1)}%
          </span>
        ) : (
          <>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 800, color: "#BFF205" }}>
              {entry.value}
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.4)", marginLeft: 5 }}>
              {suffix}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function Avatar({ url, round = true, size = 40 }: { url: string | null; round?: boolean; size?: number }) {
  return (
    <div style={{
      width: size, height: size, flexShrink: 0,
      borderRadius: round ? "50%" : 8,
      overflow: "hidden",
      backgroundColor: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {url
        ? <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: round ? "cover" : "contain" }} />
        : <span style={{ fontSize: size * 0.35, color: "rgba(255,255,255,0.25)" }}>—</span>
      }
    </div>
  );
}
