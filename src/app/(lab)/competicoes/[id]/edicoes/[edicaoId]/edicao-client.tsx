"use client";

import {
  editarEdicao,
  criarJanelaInscricao,
  adicionarEquipeEdicao,
  removerEquipeEdicao,
} from "../actions";
import Breadcrumb from "@/app/(lab)/components/breadcrumb";
import { toast } from "@/app/(lab)/components/toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  edition: any;
  settings: any;
  windows: any[];
  editionTeams: any[];
  allTeams: any[];
  phases: any[];
  competitionId: string;
  competitionName: string;
  seasonName: string;
};

export default function EdicaoClient({
  edition,
  settings,
  windows: initialWindows,
  editionTeams: initialEditionTeams,
  allTeams,
  phases: initialPhases,
  competitionId,
  competitionName: breadcrumbCompetitionName,
  seasonName: breadcrumbSeasonName,
}: Props) {
  const router = useRouter();

  // Estados de configuração
  const [status, setStatus] = useState(edition.status ?? "planned");
  const [isPublic, setIsPublic] = useState(settings?.is_public ?? true);
  const [minAthletes, setMinAthletes] = useState(String(settings?.min_athletes ?? ""));
  const [maxAthletes, setMaxAthletes] = useState(String(settings?.max_athletes ?? ""));
  const [minAge, setMinAge] = useState(String(settings?.min_age ?? ""));
  const [maxAge, setMaxAge] = useState(String(settings?.max_age ?? ""));
  const [yellowThreshold, setYellowThreshold] = useState(String(settings?.yellow_card_suspension_threshold ?? ""));
  const [savingConfig, setSavingConfig] = useState(false);
  const [configFeedback, setConfigFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Estados de janelas
  const [windows, setWindows] = useState(initialWindows);
  const [showWindowForm, setShowWindowForm] = useState(false);
  const [windowOpensAt, setWindowOpensAt] = useState("");
  const [windowClosesAt, setWindowClosesAt] = useState("");
  const [savingWindow, setSavingWindow] = useState(false);
  const [windowError, setWindowError] = useState<string | null>(null);

  // Estados de equipes
  const [editionTeams, setEditionTeams] = useState(initialEditionTeams);
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [arrivalOrigin, setArrivalOrigin] = useState("");
  const [addingTeam, setAddingTeam] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);

  const inputClass = "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]";
  const inputStyle = { borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" };

  const competitionName = edition.competitions?.full_name ?? "Competição";
  const seasonName = edition.seasons?.name ?? "—";
  const yearValue = edition.seasons?.years?.value ?? "";
  const logoUrl = edition.competitions?.logo_url ?? null;

  const statusLabel: Record<string, string> = {
    planned: "Planejada",
    ongoing: "Em andamento",
    closed: "Encerrada",
  };

  const phaseTypeLabel: Record<string, string> = {
    knockout: "Mata-mata",
    round_robin: "Pontos Corridos",
    group_stage: "Fase de Grupos",
    conference: "Conferência",
  };

  // IDs das equipes já inscritas
  const enrolledTeamIds = new Set(editionTeams.map((et: any) => et.team_id));
  const availableTeams = allTeams.filter((t: any) => !enrolledTeamIds.has(t.id));

  async function handleSaveConfig() {
    setSavingConfig(true);
    setConfigFeedback(null);
    const fd = new FormData();
    fd.append("status", status);
    fd.append("is_public", String(isPublic));
    fd.append("min_athletes", minAthletes);
    fd.append("max_athletes", maxAthletes);
    fd.append("min_age", minAge);
    fd.append("max_age", maxAge);
    fd.append("yellow_card_threshold", yellowThreshold);
    const result = await editarEdicao(edition.id, fd);
    setSavingConfig(false);
    if ("error" in result) { setConfigFeedback({ type: "error", text: result.error }); return; }
    setConfigFeedback({ type: "success", text: "Configurações salvas." });
  }

  async function handleAddWindow() {
    setWindowError(null);
    setSavingWindow(true);
    const fd = new FormData();
    fd.append("opens_at", windowOpensAt);
    fd.append("closes_at", windowClosesAt);
    const result = await criarJanelaInscricao(edition.id, fd);
    setSavingWindow(false);
    if ("error" in result) { setWindowError(result.error); return; }
    setWindows(prev => [...prev, { id: Date.now().toString(), opens_at: windowOpensAt, closes_at: windowClosesAt, is_active: true }]);
    setShowWindowForm(false);
    setWindowOpensAt(""); setWindowClosesAt("");
    router.refresh();
  }

  async function handleAddTeam() {
    if (!selectedTeamId) return;
    setTeamError(null);
    setAddingTeam(true);
    const result = await adicionarEquipeEdicao(edition.id, selectedTeamId, arrivalOrigin);
    setAddingTeam(false);
    if ("error" in result) { setTeamError(result.error); return; }
    const team = allTeams.find((t: any) => t.id === selectedTeamId);
    setEditionTeams(prev => [...prev, { id: Date.now().toString(), team_id: selectedTeamId, arrival_origin: arrivalOrigin || null, display_order: 0, teams: team }]);
    setShowAddTeam(false);
    setSelectedTeamId(""); setArrivalOrigin("");
    router.refresh();
  }

  async function handleRemoveTeam(editionTeamId: string) {
    if (!confirm("Remover esta equipe da edição?")) return;
    const result = await removerEquipeEdicao(editionTeamId);
    if ("error" in result) { toast("error", result.error); return; }
    if ("deactivated" in result && result.deactivated) {
      toast("success", "Equipe desativada. Ela possui atletas ou partidas vinculadas e não pôde ser removida completamente.");
      setEditionTeams(prev =>
        prev.map((et: any) =>
          et.id === editionTeamId ? { ...et, is_active: false } : et
        )
      );
      return;
    }
    setEditionTeams(prev => prev.filter((et: any) => et.id !== editionTeamId));
  }

  return (
    <div className="p-6 md:p-8">
      {/* Cabeçalho */}
      <header className="mb-8 flex items-center gap-4">
        <Link href={`/competicoes/${competitionId}`}
          className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          ← {competitionName}
        </Link>
      </header>

      <Breadcrumb
        items={[
          { label: "Competições", href: "/competicoes" },
          {
            label: breadcrumbCompetitionName || "Competição",
            href: `/competicoes/${competitionId}`,
          },
          { label: breadcrumbSeasonName || seasonName || "Temporada" },
        ]}
      />

      <div className="mb-6 flex items-center gap-4">
        {logoUrl && <img src={logoUrl} alt="" className="h-12 w-12 rounded-xl border object-contain" style={{ borderColor: "var(--color-border)" }} />}
        <div>
          <h1 className="font-display text-2xl" style={{ color: "var(--color-text-primary)" }}>
            {competitionName}
          </h1>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            {yearValue} — {seasonName}
          </p>
        </div>
        <span className="ml-auto rounded px-2 py-1 text-xs font-mono"
          style={{ backgroundColor: status === "ongoing" ? "var(--color-brand)" : "var(--color-border)", color: status === "ongoing" ? "var(--color-background)" : "var(--color-text-secondary)" }}>
          {statusLabel[status] ?? status}
        </span>
      </div>

      {/* Configurações */}
      <div className="mb-6 rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
        <h2 className="mb-4 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>Configurações</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Status</span>
            <select value={status} onChange={e => setStatus(e.target.value)} className={inputClass} style={inputStyle}>
              <option value="planned">Planejada</option>
              <option value="ongoing">Em andamento</option>
              <option value="closed">Encerrada</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Mín. atletas por elenco</span>
            <input type="number" value={minAthletes} onChange={e => setMinAthletes(e.target.value)} className={inputClass} style={inputStyle} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Máx. atletas por elenco</span>
            <input type="number" value={maxAthletes} onChange={e => setMaxAthletes(e.target.value)} className={inputClass} style={inputStyle} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Idade mínima (aviso)</span>
            <input type="number" value={minAge} onChange={e => setMinAge(e.target.value)} className={inputClass} style={inputStyle} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Idade máxima (aviso)</span>
            <input type="number" value={maxAge} onChange={e => setMaxAge(e.target.value)} className={inputClass} style={inputStyle} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Amarelos para suspensão (aviso)</span>
            <input type="number" value={yellowThreshold} onChange={e => setYellowThreshold(e.target.value)} className={inputClass} style={inputStyle} />
          </label>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} className="h-4 w-4" />
            <span className="text-sm" style={{ color: "var(--color-text-primary)" }}>Edição pública no 06.score</span>
          </label>
          <button type="button" onClick={handleSaveConfig} disabled={savingConfig}
            className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
            {savingConfig ? "Salvando…" : "Salvar configurações"}
          </button>
        </div>
        {configFeedback && (
          <p className="mt-3 text-sm" style={{ color: configFeedback.type === "error" ? "var(--color-danger)" : "var(--color-success)" }}>
            {configFeedback.text}
          </p>
        )}
      </div>

      {/* Janelas de inscrição */}
      <div className="mb-6 rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>Janelas de inscrição</h2>
          <button type="button" onClick={() => setShowWindowForm(v => !v)}
            className="rounded-lg border px-3 py-1.5 text-xs"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
            {showWindowForm ? "Cancelar" : "Adicionar janela"}
          </button>
        </div>
        {showWindowForm && (
          <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border p-4"
            style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }}>
            <label className="flex flex-col gap-1">
              <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Abertura</span>
              <input type="datetime-local" value={windowOpensAt} onChange={e => setWindowOpensAt(e.target.value)} className={inputClass} style={inputStyle} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Fechamento</span>
              <input type="datetime-local" value={windowClosesAt} onChange={e => setWindowClosesAt(e.target.value)} className={inputClass} style={inputStyle} />
            </label>
            <button type="button" onClick={handleAddWindow} disabled={savingWindow}
              className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
              style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
              {savingWindow ? "Salvando…" : "Adicionar"}
            </button>
            {windowError && <p className="w-full text-sm" style={{ color: "var(--color-danger)" }}>{windowError}</p>}
          </div>
        )}
        {windows.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Nenhuma janela de inscrição cadastrada.</p>
        ) : (
          <ul className="space-y-2">
            {windows.map((w: any) => (
              <li key={w.id} className="flex items-center justify-between rounded-lg border px-4 py-3"
                style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }}>
                <div>
                  <p className="text-sm" style={{ color: "var(--color-text-primary)" }}>
                    {new Date(w.opens_at).toLocaleString("pt-BR")} → {new Date(w.closes_at).toLocaleString("pt-BR")}
                  </p>
                </div>
                <span className="rounded px-2 py-0.5 text-xs"
                  style={{ backgroundColor: w.is_active ? "var(--color-brand)" : "var(--color-border)", color: w.is_active ? "var(--color-background)" : "var(--color-text-secondary)" }}>
                  {w.is_active ? "Ativa" : "Inativa"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Equipes */}
      <div className="mb-6 rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
            Equipes ({editionTeams.length})
          </h2>
          <button type="button" onClick={() => setShowAddTeam(v => !v)}
            className="rounded-lg border px-3 py-1.5 text-xs"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
            {showAddTeam ? "Cancelar" : "Adicionar equipe"}
          </button>
        </div>
        {showAddTeam && (
          <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border p-4"
            style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }}>
            <label className="flex flex-col gap-1">
              <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Equipe</span>
              <select value={selectedTeamId} onChange={e => setSelectedTeamId(e.target.value)} className={inputClass} style={inputStyle}>
                <option value="">Selecione…</option>
                {availableTeams.map((t: any) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Origem</span>
              <select value={arrivalOrigin} onChange={e => setArrivalOrigin(e.target.value)} className={inputClass} style={inputStyle}>
                <option value="">—</option>
                <option value="promoted">Promovida</option>
                <option value="relegated">Rebaixada</option>
                <option value="invited">Convidada</option>
                <option value="qualifier">Classificatória</option>
              </select>
            </label>
            <button type="button" onClick={handleAddTeam} disabled={addingTeam || !selectedTeamId}
              className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
              style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
              {addingTeam ? "Adicionando…" : "Adicionar"}
            </button>
            {teamError && <p className="w-full text-sm" style={{ color: "var(--color-danger)" }}>{teamError}</p>}
          </div>
        )}
        {editionTeams.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Nenhuma equipe inscrita ainda.</p>
        ) : (
          <ul className="space-y-2">
            {[...editionTeams]
              .sort((a, b) => {
                if (a.is_free_agent_pool && !b.is_free_agent_pool) return 1;
                if (!a.is_free_agent_pool && b.is_free_agent_pool) return -1;
                return (a.display_order ?? 0) - (b.display_order ?? 0);
              })
              .map((et: any) => (
              <li key={et.id} className="flex items-center gap-3 rounded-lg border px-4 py-3"
                style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }}>
                {et.teams?.logo_url ? (
                  <img src={et.teams.logo_url} alt="" className="h-8 w-8 rounded border object-contain" style={{ borderColor: "var(--color-border)" }} />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded border text-xs font-bold"
                    style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)", color: "var(--color-text-primary)" }}>
                    {et.teams?.abbreviation ?? et.teams?.full_name?.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <p className="flex-1 text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{et.teams?.full_name}</p>
                {et.arrival_origin && (
                  <span className="rounded px-1.5 py-0.5 text-xs"
                    style={{ backgroundColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                    {et.arrival_origin}
                  </span>
                )}
                <button type="button" onClick={() => handleRemoveTeam(et.id)}
                  className="rounded border px-2 py-1 text-xs"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-danger)" }}>
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Fases */}
      <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
            Fases ({initialPhases.length})
          </h2>
          <Link href={`/competicoes/${competitionId}/edicoes/${edition.id}/fases/nova`}
            className="rounded-lg border px-3 py-1.5 text-xs"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
            Nova fase
          </Link>
        </div>
        {initialPhases.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Nenhuma fase cadastrada ainda.</p>
        ) : (
          <ul className="space-y-2">
            {initialPhases.map((phase: any) => (
              <li key={phase.id}>
                <Link href={`/competicoes/${competitionId}/edicoes/${edition.id}/fases/${phase.id}`}
                  className="flex items-center justify-between rounded-lg border px-4 py-3 transition-colors"
                  style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }}>
                  <div>
                    <p className="font-medium text-sm" style={{ color: "var(--color-text-primary)" }}>
                      {phase.custom_label ?? phase.full_name}
                    </p>
                    <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                      {phaseTypeLabel[phase.phase_type] ?? phase.phase_type}
                    </p>
                  </div>
                  {phase.is_current && (
                    <span className="rounded px-2 py-0.5 text-xs font-mono"
                      style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
                      atual
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}