"use client";

import { criarEdicao } from "./edicoes/actions";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Season = { id: string; name: string; year_value: number };
type Edition = { id: string; season_id: string; status: string; season_name: string; year_value: number };

type Props = {
  competitionId: string;
  seasons: Season[];
  editions: Edition[];
};

export default function EdicoesSection({ competitionId, seasons, editions: initialEditions }: Props) {
  const router = useRouter();
  const [editions, setEditions] = useState(initialEditions);
  const [showForm, setShowForm] = useState(false);
  const [seasonId, setSeasonId] = useState(seasons[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputClass = "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]";
  const inputStyle = { borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" };

  const statusLabel: Record<string, string> = {
    planned: "Planejada",
    ongoing: "Em andamento",
    closed: "Encerrada",
  };

  async function handleCreate() {
    setError(null);
    setLoading(true);
    const fd = new FormData();
    fd.append("season_id", seasonId);
    const result = await criarEdicao(competitionId, fd);
    setLoading(false);
    if ("error" in result) { setError(result.error); return; }
    router.push(`/competicoes/${competitionId}/edicoes/${result.id}`);
  }

  return (
    <div className="mt-6 rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>Edições</h2>
        <button type="button" onClick={() => setShowForm(v => !v)}
          className="rounded-lg border px-3 py-1.5 text-xs font-medium"
          style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
          {showForm ? "Cancelar" : "Nova edição"}
        </button>
      </div>

      {showForm && (
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border p-4"
          style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }}>
          <label className="flex flex-col gap-1">
            <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Temporada</span>
            <select value={seasonId} onChange={e => setSeasonId(e.target.value)} className={inputClass} style={inputStyle}>
              {seasons.map(s => (
                <option key={s.id} value={s.id}>{s.year_value} — {s.name}</option>
              ))}
            </select>
          </label>
          <button type="button" onClick={handleCreate} disabled={loading || !seasonId}
            className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
            {loading ? "Criando…" : "Criar edição"}
          </button>
          {error && <p className="w-full text-sm" style={{ color: "var(--color-danger)" }}>{error}</p>}
        </div>
      )}

      {editions.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Nenhuma edição cadastrada ainda.</p>
      ) : (
        <ul className="space-y-2">
          {editions.map(ed => (
            <li key={ed.id}>
              <Link href={`/competicoes/${competitionId}/edicoes/${ed.id}`}
                className="flex items-center justify-between rounded-lg border px-4 py-3 transition-colors"
                style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }}>
                <div>
                  <p className="font-medium text-sm" style={{ color: "var(--color-text-primary)" }}>
                    {ed.year_value} — {ed.season_name}
                  </p>
                </div>
                <span className="rounded px-2 py-0.5 text-xs font-mono"
                  style={{
                    backgroundColor: ed.status === "ongoing" ? "var(--color-brand)" : "var(--color-border)",
                    color: ed.status === "ongoing" ? "var(--color-background)" : "var(--color-text-secondary)",
                  }}>
                  {statusLabel[ed.status] ?? ed.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}