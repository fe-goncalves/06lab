"use client";

import { useState } from "react";

type Edition = { id: string; name: string; competition_name: string };
type Suspension = {
  id: string;
  athlete_id: string;
  athlete_name: string;
  scope_type: string;
  scope_edition_id: string;
  edition_label: string | null;
  starts_at: string;
  games_total: number;
  games_remaining: number;
  is_active: boolean;
  reason: string;
};

export default function SuspensoesClient({ suspensions, editions }: {
  suspensions: Suspension[];
  editions: Edition[];
}) {
  const [activeFilter, setActiveFilter] = useState<"active" | "all">("active");
  const [editionFilter, setEditionFilter] = useState<string>("all");

  const filtered = suspensions
    .filter(s => activeFilter === "all" || s.is_active)
    .filter(s => editionFilter === "all" || s.scope_edition_id === editionFilter);

  const activeCount = suspensions.filter(s => s.is_active).length;

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "var(--color-background)" }}>
      {/* Header bar */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b px-8"
        style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => setActiveFilter("active")}
            className="flex items-center gap-2 font-mono text-sm transition-opacity"
            style={{ color: activeFilter === "active" ? "var(--color-brand)" : "#A6A6A6" }}>
            ATIVAS
            <span className="font-mono text-xs rounded px-1.5 py-0.5"
              style={{
                backgroundColor: activeFilter === "active" ? "rgba(191,242,5,0.15)" : "rgba(255,255,255,0.06)",
                color: activeFilter === "active" ? "var(--color-brand)" : "#555",
              }}>
              {activeCount}
            </span>
          </button>
          <button type="button" onClick={() => setActiveFilter("all")}
            className="flex items-center gap-2 font-mono text-sm transition-opacity"
            style={{ color: activeFilter === "all" ? "var(--color-brand)" : "#A6A6A6" }}>
            TODAS
            <span className="font-mono text-xs rounded px-1.5 py-0.5"
              style={{
                backgroundColor: activeFilter === "all" ? "rgba(191,242,5,0.15)" : "rgba(255,255,255,0.06)",
                color: activeFilter === "all" ? "var(--color-brand)" : "#555",
              }}>
              {suspensions.length}
            </span>
          </button>
        </div>

        {/* Filtro por edição */}
        {editions.length > 0 && (
          <select
            value={editionFilter}
            onChange={e => setEditionFilter(e.target.value)}
            className="rounded-lg border px-3 py-1.5 font-mono text-xs outline-none"
            style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-secondary)" }}>
            <option value="all">Todas as competições</option>
            {editions.map(e => (
              <option key={e.id} value={e.id}>{e.competition_name} — {e.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Lista */}
      <div className="flex-1 px-8 py-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border py-16 gap-2"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            <p className="font-mono text-sm" style={{ color: "var(--color-text-secondary)" }}>
              {activeFilter === "active" ? "Nenhuma suspensão ativa." : "Nenhuma suspensão registrada."}
            </p>
            <p className="font-mono text-xs" style={{ color: "var(--color-text-secondary)", opacity: 0.6 }}>
              Para criar uma suspensão, acesse o hub da competição.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
            {filtered.map((s, idx) => {
              const cumpridos = s.games_total - s.games_remaining;
              const completa = s.games_remaining === 0;
              const pct = s.games_total > 0 ? (cumpridos / s.games_total) * 100 : 0;

              return (
                <div key={s.id} className="flex items-center gap-6 px-5 py-4"
                  style={{
                    borderTop: idx > 0 ? "1px solid var(--color-border)" : "none",
                    opacity: s.is_active ? 1 : 0.45,
                  }}>
                  {/* Atleta + metadados */}
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm font-bold truncate" style={{ color: "var(--color-text-primary)" }}>
                      {s.athlete_name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {s.edition_label ? (
                        <span className="font-mono text-xs px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "var(--color-text-secondary)" }}>
                          {s.edition_label}
                        </span>
                      ) : (
                        <span className="font-mono text-xs px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: "rgba(255,100,100,0.1)", color: "rgba(255,100,100,0.7)" }}>
                          Global
                        </span>
                      )}
                      <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>·</span>
                      <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                        {new Date(s.starts_at + "T00:00:00").toLocaleDateString("pt-BR")}
                      </span>
                      {s.reason && (
                        <>
                          <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>·</span>
                          <span className="font-mono text-xs truncate" style={{ color: "var(--color-text-secondary)" }}>{s.reason}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Progresso */}
                  <div className="shrink-0 w-32">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                        {cumpridos}/{s.games_total} jogos
                      </span>
                      {completa && (
                        <span className="font-mono text-xs" style={{ color: "var(--color-success)" }}>completa</span>
                      )}
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-border)" }}>
                      <div className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: completa ? "var(--color-success)" : "var(--color-brand)",
                        }} />
                    </div>
                  </div>

                  {/* Restantes */}
                  <div className="shrink-0 w-12 text-center">
                    <p className="font-display text-xl font-bold"
                      style={{ color: s.games_remaining === 0 ? "var(--color-success)" : "var(--color-danger)" }}>
                      {s.games_remaining}
                    </p>
                    <p className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>rest.</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}