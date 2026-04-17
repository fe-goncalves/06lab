"use client";

import { aprovarInscricao, rejeitarInscricao, aprovarRelatorio, rejeitarRelatorio } from "./actions";
import Link from "next/link";
import { useState } from "react";

type RosterEntry = {
  id: string;
  type: "roster";
  member_type: string;
  member_name: string;
  team_name: string;
  competition_name: string;
  season_name: string;
  submitted_at: string;
};

type ReportEntry = {
  id: string;
  type: "report";
  match_id: string;
  team_a: string;
  team_b: string;
  score_a: number;
  score_b: number;
  match_date: string | null;
  competition_name: string;
  season_name: string;
  submitter_type: string;
  submitted_at: string;
};

type Props = {
  rosterEntries: RosterEntry[];
  reports: ReportEntry[];
};

export default function AprovacoesClient({ rosterEntries: initialRoster, reports: initialReports }: Props) {
  const [roster, setRoster] = useState(initialRoster);
  const [reports, setReports] = useState(initialReports);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState<{ id: string; note: string } | null>(null);

  const inputStyle = { borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" };

  async function handleRoster(id: string, action: "approve" | "reject") {
    setProcessing(id);
    const result = action === "approve" ? await aprovarInscricao(id) : await rejeitarInscricao(id);
    setProcessing(null);
    if ("error" in result) { alert(result.error); return; }
    setRoster(prev => prev.filter(r => r.id !== id));
  }

  async function handleReport(id: string, action: "approve" | "reject") {
    if (action === "reject" && !rejectNote) {
      setRejectNote({ id, note: "" });
      return;
    }
    setProcessing(id);
    const result = action === "approve"
      ? await aprovarRelatorio(id)
      : await rejeitarRelatorio(id, rejectNote?.note ?? "");
    setProcessing(null);
    if ("error" in result) { alert(result.error); return; }
    setReports(prev => prev.filter(r => r.id !== id));
    setRejectNote(null);
  }

  const total = roster.length + reports.length;

  if (total === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl border px-6 py-16 text-center"
        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
        <div>
          <p className="font-display text-xl" style={{ color: "var(--color-text-primary)" }}>Tudo em dia</p>
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>Nenhum item aguardando aprovação.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Inscrições de elenco */}
      {roster.length > 0 && (
        <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <h2 className="mb-4 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
            Inscrições de elenco ({roster.length})
          </h2>
          <ul className="space-y-2">
            {roster.map(r => (
              <li key={r.id} className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3"
                style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }}>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate" style={{ color: "var(--color-text-primary)" }}>
                    {r.member_name}
                    <span className="ml-2 text-xs font-mono" style={{ color: "var(--color-text-secondary)" }}>
                      {r.member_type === "athlete" ? "atleta" : "comissão"}
                    </span>
                  </p>
                  <p className="text-xs truncate" style={{ color: "var(--color-text-secondary)" }}>
                    {r.team_name} · {r.competition_name} {r.season_name}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button type="button" onClick={() => handleRoster(r.id, "approve")}
                    disabled={processing === r.id}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                    style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
                    Aprovar
                  </button>
                  <button type="button" onClick={() => handleRoster(r.id, "reject")}
                    disabled={processing === r.id}
                    className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-50"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-danger)" }}>
                    Rejeitar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Relatórios de partida */}
      {reports.length > 0 && (
        <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <h2 className="mb-4 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
            Relatórios de partida ({reports.length})
          </h2>
          <ul className="space-y-2">
            {reports.map(r => (
              <li key={r.id} className="rounded-lg border p-4"
                style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }}>
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-sm" style={{ color: "var(--color-text-primary)" }}>
                      {r.team_a} <span style={{ color: "var(--color-brand)" }}>{r.score_a} × {r.score_b}</span> {r.team_b}
                    </p>
                    <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                      {r.competition_name} {r.season_name}
                      {r.match_date ? ` · ${new Date(r.match_date + "T00:00:00").toLocaleDateString("pt-BR")}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {r.match_id && (
                      <Link href={`/partidas/${r.match_id}`}
                        className="rounded-lg border px-3 py-1.5 text-xs"
                        style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                        Ver
                      </Link>
                    )}
                    <button type="button" onClick={() => handleReport(r.id, "approve")}
                      disabled={processing === r.id}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                      style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
                      Aprovar
                    </button>
                    <button type="button" onClick={() => handleReport(r.id, "reject")}
                      disabled={processing === r.id}
                      className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-50"
                      style={{ borderColor: "var(--color-border)", color: "var(--color-danger)" }}>
                      Rejeitar
                    </button>
                  </div>
                </div>
                {rejectNote?.id === r.id && (
                  <div className="mt-3 flex gap-2">
                    <input type="text" placeholder="Motivo da rejeição (opcional)"
                      value={rejectNote.note}
                      onChange={e => setRejectNote({ id: r.id, note: e.target.value })}
                      className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none"
                      style={inputStyle} />
                    <button type="button" onClick={() => handleReport(r.id, "reject")}
                      className="rounded-lg px-3 py-2 text-sm font-medium"
                      style={{ backgroundColor: "var(--color-danger)", color: "#fff" }}>
                      Confirmar
                    </button>
                    <button type="button" onClick={() => setRejectNote(null)}
                      className="rounded-lg border px-3 py-2 text-sm"
                      style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                      Cancelar
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}