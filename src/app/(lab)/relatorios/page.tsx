"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileBarChart, FileText, BarChart2, Trophy,
  ShieldAlert, UserCheck, Download, Loader2,
} from "lucide-react";
import {
  carregarCompeticoes, carregarEdicoes, carregarFases, carregarEquipesDaEdicao,
  relatorioAtletasInscritos, relatorioEstatisticasAtletas, relatorioResultadosPartidas,
  relatorioSuspensoes, relatorioArbitrosPorPartida, relatorioPremiacoes,
  type CompetitionOption, type EditionOption, type PhaseOption, type TeamOption,
} from "./actions";
import { exportarCSV, exportarPDF } from "@/lib/exportacao";
import { LabSelect } from "@/app/(lab)/components/lab-select";

type ReportId = "r1" | "r2" | "r3" | "r4" | "r5" | "r6";

type ReportState = {
  competitionId: string;
  editionId: string;   // "" = todas as edições
  phaseId: string;
  teamId: string;
  loading: boolean;
  editions: EditionOption[];
  phases: PhaseOption[];
  teams: TeamOption[];
};

const init: ReportState = {
  competitionId: "", editionId: "", phaseId: "", teamId: "",
  loading: false, editions: [], phases: [], teams: [],
};

// ─── Estilos ──────────────────────────────────────────────────────────────────

const selectClass = "w-full rounded-lg border px-3 py-2 text-xs font-mono outline-none transition-colors focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)] disabled:opacity-40 cursor-pointer";
const selectStyle = { borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" };

function btnBase(disabled: boolean) {
  return {
    display: "flex", alignItems: "center", gap: 6,
    padding: "7px 14px", borderRadius: 8,
    fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 600,
    letterSpacing: "0.08em",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1,
    border: "1px solid var(--color-border)",
    backgroundColor: "var(--color-surface)",
    color: "var(--color-text-primary)",
    transition: "opacity 0.15s",
  } as React.CSSProperties;
}

function btnPrimary(disabled: boolean) {
  return {
    ...btnBase(disabled),
    backgroundColor: disabled ? "var(--color-surface)" : "var(--color-brand)",
    color: disabled ? "var(--color-text-primary)" : "#0a0a0a",
    border: "none",
  } as React.CSSProperties;
}

// ─── Label de filtro ──────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{
      display: "block", fontSize: 9, fontFamily: "var(--font-mono)",
      fontWeight: 700, letterSpacing: "0.12em",
      color: "var(--color-text-secondary)", marginBottom: 4,
    }}>
      {children}
    </label>
  );
}

// ─── Bloco de filtros encadeados ──────────────────────────────────────────────

function Filters({
  state, competitions, showPhase, showTeam, onChange,
}: {
  state: ReportState;
  competitions: CompetitionOption[];
  showPhase?: boolean;
  showTeam?: boolean;
  onChange: (patch: Partial<ReportState>) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

      {/* Competição */}
      <div>
        <Label>COMPETIÇÃO</Label>
        <LabSelect
          value={state.competitionId}
          onChange={(v) => onChange({
            competitionId: v,
            editionId: "", phaseId: "", teamId: "",
            editions: [], phases: [], teams: [],
          })}
          placeholder="Selecione..."
          options={competitions.map((c) => ({ value: c.id, label: c.nome }))}
        />
      </div>

      {state.competitionId && (
        <div>
          <Label>EDIÇÃO <span style={{ fontWeight: 400 }}>(opcional)</span></Label>
          <LabSelect
            value={state.editionId}
            onChange={(v) => onChange({
              editionId: v,
              phaseId: "", teamId: "", phases: [], teams: [],
            })}
            disabled={state.editions.length === 0}
            placeholder={state.editions.length === 0 ? "Carregando..." : "Todas as edições"}
            options={state.editions.map((e) => ({ value: e.id, label: e.nome }))}
          />
        </div>
      )}

      {showPhase && state.editionId && (
        <div>
          <Label>FASE <span style={{ fontWeight: 400 }}>(opcional)</span></Label>
          <LabSelect
            value={state.phaseId}
            onChange={(v) => onChange({ phaseId: v })}
            placeholder="Todas as fases"
            options={state.phases.map((p) => ({ value: p.id, label: p.nome }))}
          />
        </div>
      )}

      {showTeam && state.editionId && (
        <div>
          <Label>EQUIPE <span style={{ fontWeight: 400 }}>(opcional)</span></Label>
          <LabSelect
            value={state.teamId}
            onChange={(v) => onChange({ teamId: v })}
            placeholder="Todas as equipes"
            options={state.teams.map((t) => ({ value: t.id, label: t.nome }))}
          />
        </div>
      )}
    </div>
  );
}

// ─── Card de relatório ────────────────────────────────────────────────────────

function Card({ icon, title, description, children }: {
  icon: React.ReactNode; title: string; description: string; children: React.ReactNode;
}) {
  return (
    <div style={{
      backgroundColor: "var(--color-surface)",
      border: "1px solid var(--color-border)",
      borderRadius: 14, padding: "22px 22px 20px",
      display: "flex", flexDirection: "column", gap: 16,
    }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          backgroundColor: "var(--color-brand-selected-bg)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, color: "var(--color-brand)",
        }}>
          {icon}
        </div>
        <div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", lineHeight: 1.3 }}>
            {title}
          </p>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-text-secondary)", marginTop: 3, lineHeight: 1.4 }}>
            {description}
          </p>
        </div>
      </div>
      <div style={{ height: 1, backgroundColor: "var(--color-border)" }} />
      {children}
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function RelatoriosPage() {
  const [competitions, setCompetitions] = useState<CompetitionOption[]>([]);
  const [loadingComps, setLoadingComps] = useState(true);
  const [msgs, setMsgs] = useState<Record<ReportId, string>>({ r1: "", r2: "", r3: "", r4: "", r5: "", r6: "" });

  const [r1, setR1] = useState<ReportState>(init);
  const [r2, setR2] = useState<ReportState>(init);
  const [r3, setR3] = useState<ReportState>(init);
  const [r4, setR4] = useState<ReportState>(init);
  const [r5, setR5] = useState<ReportState>(init);
  const [r6, setR6] = useState<ReportState>(init);

  const getS = (id: ReportId) => ({ r1, r2, r3, r4, r5, r6 }[id]);
  const setS = (id: ReportId, p: Partial<ReportState>) =>
    ({ r1: setR1, r2: setR2, r3: setR3, r4: setR4, r5: setR5, r6: setR6 }[id])((prev) => ({ ...prev, ...p }));
  const setMsg = (id: ReportId, msg: string) => setMsgs((prev) => ({ ...prev, [id]: msg }));

  useEffect(() => {
    carregarCompeticoes().then((res) => {
      if (!("error" in res)) setCompetitions(res);
      setLoadingComps(false);
    });
  }, []);

  // Handler central de mudança de filtro
  const makeOnChange = (id: ReportId, needsPhase: boolean, needsTeam: boolean) =>
    async (patch: Partial<ReportState>) => {
      setS(id, patch);

      // Competição mudou → carrega edições
      if ("competitionId" in patch && patch.competitionId) {
        const editions = await carregarEdicoes(patch.competitionId);
        setS(id, { editions: "error" in editions ? [] : editions });
      }

      // Edição mudou → carrega fases e/ou equipes
      if ("editionId" in patch && patch.editionId) {
        const toLoad: Promise<any>[] = [];
        if (needsPhase) toLoad.push(carregarFases(patch.editionId));
        if (needsTeam)  toLoad.push(carregarEquipesDaEdicao(patch.editionId));
        const results = await Promise.all(toLoad);
        const extra: Partial<ReportState> = {};
        if (needsPhase) extra.phases = "error" in results[0] ? [] : results[0];
        if (needsTeam)  extra.teams  = "error" in results[needsPhase ? 1 : 0] ? [] : results[needsPhase ? 1 : 0];
        setS(id, extra);
      }

      // Edição limpa → limpa fases e equipes
      if ("editionId" in patch && !patch.editionId) {
        setS(id, { phases: [], teams: [], phaseId: "", teamId: "" });
      }
    };

  // ─── Exportações ────────────────────────────────────────────────────────────

  async function exportR1(fmt: "csv" | "pdf") {
    const s = r1;
    if (!s.competitionId) { setMsg("r1", "Selecione a competição."); return; }
    setS("r1", { loading: true }); setMsg("r1", "");
    const res = await relatorioAtletasInscritos({
      competition_id: s.competitionId,
      edition_id: s.editionId || undefined,
      team_id: s.teamId || undefined,
    });
    setS("r1", { loading: false });
    if ("error" in res) { setMsg("r1", res.error); return; }
    if (!res.length) { setMsg("r1", "Nenhum dado encontrado."); return; }
    const nome = `atletas-inscritos-${Date.now()}`;
    if (fmt === "csv") exportarCSV(res, nome);
    else exportarPDF(Object.keys(res[0]), res.map((r) => Object.values(r).map(String)), "Lista de Atletas Inscritos", nome);
  }

  async function exportR2() {
    const s = r2;
    if (!s.competitionId) { setMsg("r2", "Selecione a competição."); return; }
    setS("r2", { loading: true }); setMsg("r2", "");
    const res = await relatorioEstatisticasAtletas({ competition_id: s.competitionId, edition_id: s.editionId || undefined });
    setS("r2", { loading: false });
    if ("error" in res) { setMsg("r2", res.error); return; }
    if (!res.length) { setMsg("r2", "Nenhum dado encontrado."); return; }
    exportarCSV(res, `estatisticas-atletas-${Date.now()}`);
  }

  async function exportR3() {
    const s = r3;
    if (!s.competitionId) { setMsg("r3", "Selecione a competição."); return; }
    setS("r3", { loading: true }); setMsg("r3", "");
    const res = await relatorioResultadosPartidas({
      competition_id: s.competitionId,
      edition_id: s.editionId || undefined,
      phase_id: s.phaseId || undefined,
    });
    setS("r3", { loading: false });
    if ("error" in res) { setMsg("r3", res.error); return; }
    if (!res.length) { setMsg("r3", "Nenhum dado encontrado."); return; }
    exportarCSV(res, `resultados-partidas-${Date.now()}`);
  }

  async function exportR4() {
    const s = r4;
    if (!s.competitionId) { setMsg("r4", "Selecione a competição."); return; }
    setS("r4", { loading: true }); setMsg("r4", "");
    const res = await relatorioSuspensoes({ competition_id: s.competitionId, edition_id: s.editionId || undefined });
    setS("r4", { loading: false });
    if ("error" in res) { setMsg("r4", res.error); return; }
    if (!res.length) { setMsg("r4", "Nenhum dado encontrado."); return; }
    exportarCSV(res, `suspensoes-${Date.now()}`);
  }

  async function exportR5() {
    const s = r5;
    if (!s.competitionId) { setMsg("r5", "Selecione a competição."); return; }
    setS("r5", { loading: true }); setMsg("r5", "");
    const res = await relatorioArbitrosPorPartida({
      competition_id: s.competitionId,
      edition_id: s.editionId || undefined,
      phase_id: s.phaseId || undefined,
    });
    setS("r5", { loading: false });
    if ("error" in res) { setMsg("r5", res.error); return; }
    if (!res.length) { setMsg("r5", "Nenhum dado encontrado."); return; }
    exportarCSV(res, `arbitros-partidas-${Date.now()}`);
  }

  async function exportR2Pdf() {
    const s = r2;
    if (!s.competitionId) { setMsg("r2", "Selecione a competição."); return; }
    setS("r2", { loading: true }); setMsg("r2", "");
    const res = await relatorioEstatisticasAtletas({ competition_id: s.competitionId, edition_id: s.editionId || undefined });
    setS("r2", { loading: false });
    if ("error" in res) { setMsg("r2", res.error); return; }
    if (!res.length) { setMsg("r2", "Nenhum dado encontrado."); return; }
    await exportarPDF(Object.keys(res[0]), res.map((r) => Object.values(r).map(String)), "Estatísticas de Atletas", `estatisticas-atletas-${Date.now()}`);
  }

  async function exportR3Pdf() {
    const s = r3;
    if (!s.competitionId) { setMsg("r3", "Selecione a competição."); return; }
    setS("r3", { loading: true }); setMsg("r3", "");
    const res = await relatorioResultadosPartidas({ competition_id: s.competitionId, edition_id: s.editionId || undefined, phase_id: s.phaseId || undefined });
    setS("r3", { loading: false });
    if ("error" in res) { setMsg("r3", res.error); return; }
    if (!res.length) { setMsg("r3", "Nenhum dado encontrado."); return; }
    await exportarPDF(Object.keys(res[0]), res.map((r) => Object.values(r).map(String)), "Resultados de Partidas", `resultados-partidas-${Date.now()}`);
  }

  async function exportR4Pdf() {
    const s = r4;
    if (!s.competitionId) { setMsg("r4", "Selecione a competição."); return; }
    setS("r4", { loading: true }); setMsg("r4", "");
    const res = await relatorioSuspensoes({ competition_id: s.competitionId, edition_id: s.editionId || undefined });
    setS("r4", { loading: false });
    if ("error" in res) { setMsg("r4", res.error); return; }
    if (!res.length) { setMsg("r4", "Nenhum dado encontrado."); return; }
    await exportarPDF(Object.keys(res[0]), res.map((r) => Object.values(r).map(String)), "Histórico de Suspensões", `suspensoes-${Date.now()}`);
  }

  async function exportR5Pdf() {
    const s = r5;
    if (!s.competitionId) { setMsg("r5", "Selecione a competição."); return; }
    setS("r5", { loading: true }); setMsg("r5", "");
    const res = await relatorioArbitrosPorPartida({ competition_id: s.competitionId, edition_id: s.editionId || undefined, phase_id: s.phaseId || undefined });
    setS("r5", { loading: false });
    if ("error" in res) { setMsg("r5", res.error); return; }
    if (!res.length) { setMsg("r5", "Nenhum dado encontrado."); return; }
    await exportarPDF(Object.keys(res[0]), res.map((r) => Object.values(r).map(String)), "Árbitros por Partida", `arbitros-partidas-${Date.now()}`);
  }

  async function exportR6() {
    const s = r6;
    if (!s.competitionId) { setMsg("r6", "Selecione a competição."); return; }
    setS("r6", { loading: true }); setMsg("r6", "");
    const res = await relatorioPremiacoes({ competition_id: s.competitionId, edition_id: s.editionId || undefined });
    setS("r6", { loading: false });
    if ("error" in res) { setMsg("r6", res.error); return; }
    if (!res.length) { setMsg("r6", "Nenhum dado encontrado."); return; }
    exportarPDF(Object.keys(res[0]), res.map((r) => Object.values(r).map(String)), "Premiações por Edição", `premiacoes-${Date.now()}`);
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  function BtnRow({ id, onCsv, onPdf }: { id: ReportId; onCsv?: () => void; onPdf?: () => void }) {
    const s = getS(id);
    const dis = !s.competitionId || s.loading;
    return (
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {onCsv && (
          <button style={btnBase(dis)} disabled={dis} onClick={onCsv}>
            {s.loading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
            CSV
          </button>
        )}
        {onPdf && (
          <button style={btnPrimary(dis)} disabled={dis} onClick={onPdf}>
            {s.loading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
            PDF
          </button>
        )}
      </div>
    );
  }

  function Msg({ id }: { id: ReportId }) {
    const m = msgs[id];
    if (!m) return null;
    return <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-danger)", marginTop: -4 }}>{m}</p>;
  }

  if (loadingComps) return (
    <div className="p-8" style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
      <Loader2 size={14} className="animate-spin" /> Carregando...
    </div>
  );

  return (
    <div className="p-6 md:p-8">
      <header className="mb-8">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <FileBarChart size={22} strokeWidth={2} style={{ color: "var(--color-brand)" }} />
          <h1 className="font-display text-2xl font-semibold" style={{ color: "var(--color-text-primary)" }}>
            Relatórios
          </h1>
        </div>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-text-secondary)" }}>
          Selecione a competição para habilitar cada relatório. A edição é opcional — sem ela, o relatório abrange todas as edições.
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>

        {/* R1 */}
        <Card icon={<FileText size={17} strokeWidth={2} />} title="Lista de Atletas Inscritos" description="Nome, RG, CPF, data de nascimento, equipe e status da inscrição">
          <Filters state={r1} competitions={competitions} showTeam onChange={makeOnChange("r1", false, true)} />
          <Msg id="r1" />
          <BtnRow id="r1" onCsv={() => exportR1("csv")} onPdf={() => exportR1("pdf")} />
        </Card>

        {/* R2 */}
        <Card icon={<BarChart2 size={17} strokeWidth={2} />} title="Estatísticas de Atletas" description="Partidas jogadas, gols, assistências e cartões por edição">
          <Filters state={r2} competitions={competitions} onChange={makeOnChange("r2", false, false)} />
          <Msg id="r2" />
          <BtnRow id="r2" onCsv={exportR2} onPdf={exportR2Pdf} />
        </Card>

        {/* R3 */}
        <Card icon={<FileText size={17} strokeWidth={2} />} title="Resultados de Partidas" description="Data, local, equipes, placar, fase, rodada e status">
          <Filters state={r3} competitions={competitions} showPhase onChange={makeOnChange("r3", true, false)} />
          <Msg id="r3" />
          <BtnRow id="r3" onCsv={exportR3} onPdf={exportR3Pdf} />
        </Card>

        {/* R4 */}
        <Card icon={<ShieldAlert size={17} strokeWidth={2} />} title="Histórico de Suspensões" description="Atleta, motivo, partidas totais e restantes, status">
          <Filters state={r4} competitions={competitions} onChange={makeOnChange("r4", false, false)} />
          <Msg id="r4" />
          <BtnRow id="r4" onCsv={exportR4} onPdf={exportR4Pdf} />
        </Card>

        {/* R5 */}
        <Card icon={<UserCheck size={17} strokeWidth={2} />} title="Árbitros por Partida" description="Data, equipes, nome do árbitro e função em cada partida">
          <Filters state={r5} competitions={competitions} showPhase onChange={makeOnChange("r5", true, false)} />
          <Msg id="r5" />
          <BtnRow id="r5" onCsv={exportR5} onPdf={exportR5Pdf} />
        </Card>

        {/* R6 */}
        <Card icon={<Trophy size={17} strokeWidth={2} />} title="Premiações por Edição" description="Tipo de premiação e premiado (atleta, equipe ou comissão)">
          <Filters state={r6} competitions={competitions} onChange={makeOnChange("r6", false, false)} />
          <Msg id="r6" />
          <BtnRow id="r6" onPdf={exportR6} />
        </Card>

      </div>
    </div>
  );
}