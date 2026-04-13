"use client";

import { criarPartida } from "@/app/(lab)/partidas/[matchId]/actions";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  round: any;
  matches: any[];
  editionTeams: any[];
  venues: any[];
  competitionId: string;
  edicaoId: string;
  faseId: string;
};

export default function RodadaClient({
  round,
  matches: initialMatches,
  editionTeams,
  venues,
  competitionId,
  edicaoId,
  faseId,
}: Props) {
  const router = useRouter();
  const [matches, setMatches] = useState(initialMatches);
  const [showForm, setShowForm] = useState(false);
  const [teamAId, setTeamAId] = useState("");
  const [teamBId, setTeamBId] = useState("");
  const [teamAIsHome, setTeamAIsHome] = useState(true);
  const [matchDate, setMatchDate] = useState("");
  const [matchTime, setMatchTime] = useState("");
  const [venueId, setVenueId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputClass = "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]";
  const inputStyle = { borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" };

  const teams = editionTeams.map((et: any) => et.teams).filter(Boolean);

  const statusLabel: Record<string, string> = {
    scheduled: "Agendada",
    ongoing: "Em andamento",
    finished: "Finalizada",
    postponed: "Adiada",
  };

  async function handleCreate() {
    setError(null);
    setLoading(true);
    const fd = new FormData();
    fd.append("round_id", round.id);
    fd.append("team_a_id", teamAId);
    fd.append("team_b_id", teamBId);
    fd.append("team_a_is_home", String(teamAIsHome));
    fd.append("match_date", matchDate);
    fd.append("match_time", matchTime);
    fd.append("venue_id", venueId);
    const result = await criarPartida(faseId, fd);
    setLoading(false);
    if ("error" in result) { setError(result.error); return; }
    router.push(`/partidas/${result.id}`);
  }

  return (
    <div className="p-6 md:p-8">
      <header className="mb-8 flex items-center gap-4">
        <Link href={`/competicoes/${competitionId}/edicoes/${edicaoId}/fases/${faseId}`}
          className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          ← Fase
        </Link>
        <h1 className="font-display text-2xl" style={{ color: "var(--color-text-primary)" }}>
          {round.custom_label ?? round.name}
        </h1>
      </header>

      {/* Nova partida */}
      <div className="mb-6 rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>Nova partida</h2>
          <button type="button" onClick={() => setShowForm(v => !v)}
            className="rounded-lg border px-3 py-1.5 text-xs"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
            {showForm ? "Cancelar" : "Adicionar"}
          </button>
        </div>
        {showForm && (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Equipe A (mandante)</span>
              <select value={teamAId} onChange={e => setTeamAId(e.target.value)} className={inputClass} style={inputStyle}>
                <option value="">A definir</option>
                {teams.map((t: any) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Equipe B (visitante)</span>
              <select value={teamBId} onChange={e => setTeamBId(e.target.value)} className={inputClass} style={inputStyle}>
                <option value="">A definir</option>
                {teams.map((t: any) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Data</span>
              <input type="date" value={matchDate} onChange={e => setMatchDate(e.target.value)} className={inputClass} style={inputStyle} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Horário</span>
              <input type="time" value={matchTime} onChange={e => setMatchTime(e.target.value)} className={inputClass} style={inputStyle} />
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Local</span>
              <select value={venueId} onChange={e => setVenueId(e.target.value)} className={inputClass} style={inputStyle}>
                <option value="">Não definido</option>
                {venues.map((v: any) => <option key={v.id} value={v.id}>{v.full_name}</option>)}
              </select>
            </label>
            {error && <p className="sm:col-span-2 text-sm" style={{ color: "var(--color-danger)" }}>{error}</p>}
            <div className="sm:col-span-2">
              <button type="button" onClick={handleCreate} disabled={loading}
                className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
                {loading ? "Criando…" : "Criar partida"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lista de partidas */}
      <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
        <h2 className="mb-4 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
          Partidas ({matches.length})
        </h2>
        {matches.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Nenhuma partida cadastrada.</p>
        ) : (
          <ul className="space-y-2">
            {matches.map((m: any) => (
              <li key={m.id}>
                <Link href={`/partidas/${m.id}`}
                  className="flex items-center justify-between rounded-lg border px-4 py-3 transition-colors"
                  style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }}>
                  <div className="flex items-center gap-4">
                    <div className="text-center min-w-[120px]">
                      <p className="font-medium text-sm" style={{ color: "var(--color-text-primary)" }}>
                        {m.teams_a?.abbreviation ?? m.teams_a?.full_name ?? "?"}
                        {" "}
                        <span className="font-display" style={{ color: "var(--color-brand)" }}>
                          {m.score_a} × {m.score_b}
                        </span>
                        {" "}
                        {m.teams_b?.abbreviation ?? m.teams_b?.full_name ?? "?"}
                      </p>
                    </div>
                    {m.match_date && (
                      <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                        {new Date(m.match_date + "T00:00:00").toLocaleDateString("pt-BR")}
                        {m.match_time ? ` ${m.match_time.slice(0, 5)}` : ""}
                      </p>
                    )}
                  </div>
                  <span className="rounded px-2 py-0.5 text-xs font-mono"
                    style={{
                      backgroundColor: m.status === "finished" ? "var(--color-border)" : "var(--color-brand)",
                      color: m.status === "finished" ? "var(--color-text-secondary)" : "var(--color-background)",
                    }}>
                    {statusLabel[m.status] ?? m.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}