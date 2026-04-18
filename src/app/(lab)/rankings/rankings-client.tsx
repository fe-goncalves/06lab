"use client";

import { createClient } from "@/lib/supabase";
import { useState } from "react";

type RankingEntry = {
  id: string;
  team_id: string;
  total_points: number;
  position: number;
  teams: { full_name: string; abbreviation: string | null; logo_url: string | null; primary_color: string | null } | null;
};

type Year = { id: string; value: number };
type Season = { id: string; name: string; year_id: string };
type Category = { id: string; code: string; label: string; description: string | null };

type Props = {
  ranking: RankingEntry[];
  years: Year[];
  seasons: Season[];
  categories: Category[];
  organizationId: string;
};

export default function RankingsClient({ ranking, years, seasons, categories, organizationId }: Props) {
  const [filtered, setFiltered] = useState(ranking);
  const [yearFilter, setYearFilter] = useState("");
  const [seasonFilter, setSeasonFilter] = useState("");
  const [loading, setLoading] = useState(false);

  const ic = "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]";
  const is = { borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" };

  const filteredSeasons = yearFilter
    ? seasons.filter(s => s.year_id === yearFilter)
    : seasons;

  async function handleFilter() {
    setLoading(true);
    const supabase = createClient();

    if (!yearFilter && !seasonFilter) {
      setFiltered(ranking);
      setLoading(false);
      return;
    }

    let query = supabase
      .from("ranking_point_entries")
      .select("team_id, points_earned, teams(full_name, abbreviation, logo_url, primary_color)")
      .eq("organization_id", organizationId);

    if (yearFilter) query = query.eq("year_id", yearFilter);
    if (seasonFilter) query = query.eq("season_id", seasonFilter);

    const { data } = await query;

    if (!data) { setLoading(false); return; }

    // Agrupa por equipe
    const grouped: Record<string, { team_id: string; total_points: number; team: any }> = {};
    data.forEach((e: any) => {
      if (!grouped[e.team_id]) grouped[e.team_id] = { team_id: e.team_id, total_points: 0, team: e.teams };
      grouped[e.team_id].total_points += e.points_earned ?? 0;
    });

    const sorted = Object.values(grouped)
      .sort((a, b) => b.total_points - a.total_points)
      .map((g, i) => ({
        id: g.team_id,
        team_id: g.team_id,
        total_points: g.total_points,
        position: i + 1,
        teams: g.team,
      }));

    setFiltered(sorted);
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
        <h2 className="mb-4 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>Filtros</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Ano</span>
            <select value={yearFilter} onChange={e => { setYearFilter(e.target.value); setSeasonFilter(""); }} className={ic} style={is}>
              <option value="">Todos os anos</option>
              {years.map(y => <option key={y.id} value={y.id}>{y.value}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Temporada</span>
            <select value={seasonFilter} onChange={e => setSeasonFilter(e.target.value)} className={ic} style={is}
              disabled={!yearFilter}>
              <option value="">Todas as temporadas</option>
              {filteredSeasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <button type="button" onClick={handleFilter} disabled={loading}
            className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
            {loading ? "Filtrando…" : "Aplicar"}
          </button>
          {(yearFilter || seasonFilter) && (
            <button type="button" onClick={() => { setYearFilter(""); setSeasonFilter(""); setFiltered(ranking); }}
              className="rounded-lg border px-4 py-2 text-sm"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Tabela de ranking */}
      <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
        <h2 className="mb-4 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
          Classificação ({filtered.length} equipes)
        </h2>
        {filtered.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Nenhum dado de ranking disponível. Os pontos são calculados automaticamente quando relatórios de partida são aprovados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
                  <th className="pb-3 text-left w-10 font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>#</th>
                  <th className="pb-3 text-left font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>Equipe</th>
                  <th className="pb-3 text-right font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>Pontos</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry, idx) => (
                  <tr key={entry.id} className="border-b last:border-b-0"
                    style={{ borderColor: "var(--color-border)" }}>
                    <td className="py-3 font-mono text-sm" style={{ color: idx < 3 ? "var(--color-brand)" : "var(--color-text-secondary)" }}>
                      {idx + 1}º
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        {entry.teams?.logo_url ? (
                          <img src={entry.teams.logo_url} alt="" className="h-8 w-8 rounded border object-contain shrink-0"
                            style={{ borderColor: "var(--color-border)" }} />
                        ) : (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border text-xs font-bold"
                            style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" }}>
                            {entry.teams?.abbreviation ?? entry.teams?.full_name?.slice(0, 2) ?? "?"}
                          </div>
                        )}
                        <span className="font-medium" style={{ color: "var(--color-text-primary)" }}>
                          {entry.teams?.full_name ?? "—"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 text-right font-display text-lg font-bold"
                      style={{ color: "var(--color-brand)" }}>
                      {entry.total_points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Categorias de pontuação */}
      {categories.length > 0 && (
        <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <h2 className="mb-4 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
            Categorias de pontuação
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map(c => (
              <div key={c.id} className="rounded-lg border p-3"
                style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }}>
                <p className="font-mono text-xs" style={{ color: "var(--color-brand)" }}>{c.code}</p>
                <p className="text-sm font-medium mt-0.5" style={{ color: "var(--color-text-primary)" }}>{c.label}</p>
                {c.description && <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>{c.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}