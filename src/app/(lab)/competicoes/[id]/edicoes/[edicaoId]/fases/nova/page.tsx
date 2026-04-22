"use client";

import { criarFase, criarFaseDoTemplate, deletarTemplate } from "../actions";
import { createClient } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "@/app/(lab)/components/toast";
import { Trash2 } from "lucide-react";

type Template = {
  id: string;
  name: string;
  custom_label: string | null;
  phase_type: string;
  half_duration_minutes: number | null;
  points_win: number | null;
  points_draw: number | null;
  points_loss: number | null;
  legs: boolean;
  third_place_match: boolean;
};

const PHASE_TYPE_LABEL: Record<string, string> = {
  round_robin: "Pontos Corridos",
  group_stage: "Fase de Grupos",
  knockout: "Mata-mata",
  conference: "Conferência",
};

export default function NovaFasePage() {
  const params = useParams();
  const router = useRouter();
  const competitionId = typeof params.id === "string" ? params.id : "";
  const edicaoId = typeof params.edicaoId === "string" ? params.edicaoId : "";

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  const [fullName, setFullName] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [phaseType, setPhaseType] = useState("round_robin");
  const [displayOrder, setDisplayOrder] = useState("0");
  const [halfDuration, setHalfDuration] = useState("25");
  const [legs, setLegs] = useState(false);
  const [aggregateScore, setAggregateScore] = useState(false);
  const [thirdPlace, setThirdPlace] = useState(false);
  const [tiebreakerType, setTiebreakerType] = useState("penalties");
  const [pointsWin, setPointsWin] = useState("3");
  const [pointsDraw, setPointsDraw] = useState("1");
  const [pointsLoss, setPointsLoss] = useState("0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isKnockout = phaseType === "knockout" || phaseType === "conference";
  const isClassificatory = phaseType === "round_robin" || phaseType === "group_stage";

  useEffect(() => {
    async function loadTemplates() {
      if (!competitionId) return;
      const supabase = createClient();
      const { data } = await supabase
        .from("phase_templates")
        .select("*")
        .eq("competition_id", competitionId)
        .order("display_order");
      setTemplates((data ?? []) as Template[]);
      setLoadingTemplates(false);
    }
    void loadTemplates();
  }, [competitionId]);

  function applyTemplate(template: Template) {
    setFullName(template.name);
    setCustomLabel(template.custom_label ?? "");
    setPhaseType(template.phase_type);
    setHalfDuration(String(template.half_duration_minutes ?? 25));
    setLegs(template.legs ?? false);
    setThirdPlace(template.third_place_match ?? false);
    setPointsWin(String(template.points_win ?? 3));
    setPointsDraw(String(template.points_draw ?? 1));
    setPointsLoss(String(template.points_loss ?? 0));
    toast("success", `Template "${template.name}" aplicado.`);
  }

  async function handleUseTemplate(template: Template) {
    if (!confirm(`Criar fase "${template.name}" a partir do template?`)) return;
    setLoading(true);
    const result = await criarFaseDoTemplate(template.id, edicaoId);
    setLoading(false);
    if ("error" in result) { toast("error", result.error); return; }
    router.push(`/competicoes/${competitionId}/edicoes/${edicaoId}/fases/${result.id}`);
  }

  async function handleDeleteTemplate(templateId: string, name: string) {
    if (!confirm(`Excluir template "${name}"?`)) return;
    const result = await deletarTemplate(templateId);
    if ("error" in result) { toast("error", result.error); return; }
    setTemplates(prev => prev.filter(t => t.id !== templateId));
    toast("success", "Template excluído.");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("full_name", fullName.trim());
      fd.append("custom_label", customLabel.trim());
      fd.append("phase_type", phaseType);
      fd.append("display_order", displayOrder);
      fd.append("half_duration_minutes", halfDuration);
      if (isKnockout) {
        fd.append("legs", String(legs));
        fd.append("aggregate_score", String(aggregateScore));
        fd.append("third_place_match", String(thirdPlace));
        fd.append("penalty_tiebreaker_type", tiebreakerType);
      }
      if (isClassificatory) {
        fd.append("points_win", pointsWin);
        fd.append("points_draw", pointsDraw);
        fd.append("points_loss", pointsLoss);
      }
      const result = await criarFase(edicaoId, fd);
      if ("error" in result) { setError(result.error); return; }
      router.push(`/competicoes/${competitionId}/edicoes/${edicaoId}/fases/${result.id}`);
    } finally { setLoading(false); }
  }

  const inputClass = "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]";
  const inputStyle = { borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" };

  return (
    <div className="p-6 md:p-8">
      <header className="mb-8 flex items-center gap-4">
        <button type="button" onClick={() => router.back()}
          className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          ← Voltar
        </button>
        <h1 className="font-display text-2xl" style={{ color: "var(--color-text-primary)" }}>Nova fase</h1>
      </header>

      {/* Templates salvos */}
      {!loadingTemplates && templates.length > 0 && (
        <div className="mb-8 rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-brand)", boxShadow: "0 0 12px rgba(191,242,5,0.06)" }}>
          <h2 className="mb-1 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-brand)" }}>
            Templates salvos
          </h2>
          <p className="mb-4 text-xs" style={{ color: "var(--color-text-secondary)" }}>
            Clique em "Usar" para criar a fase diretamente, ou em "Preencher" para carregar as configurações no formulário.
          </p>
          <div className="space-y-2">
            {templates.map(t => (
              <div key={t.id}
                className="flex items-center justify-between rounded-lg border px-4 py-3"
                style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }}>
                <div>
                  <p className="font-medium text-sm" style={{ color: "var(--color-text-primary)" }}>
                    {t.custom_label ?? t.name}
                  </p>
                  <p className="text-xs font-mono" style={{ color: "var(--color-text-secondary)" }}>
                    {PHASE_TYPE_LABEL[t.phase_type] ?? t.phase_type}
                    {t.half_duration_minutes ? ` · ${t.half_duration_minutes}min` : ""}
                    {t.phase_type === "round_robin" || t.phase_type === "group_stage"
                      ? ` · V${t.points_win} E${t.points_draw} D${t.points_loss}`
                      : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button type="button" onClick={() => applyTemplate(t)}
                    className="rounded-lg border px-3 py-1.5 text-xs"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                    Preencher
                  </button>
                  <button type="button" onClick={() => handleUseTemplate(t)} disabled={loading}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                    style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
                    Usar
                  </button>
                  <button type="button" onClick={() => handleDeleteTemplate(t.id, t.name)}
                    className="rounded-lg border p-1.5 transition-colors hover:border-[var(--color-danger)]"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-danger)" }}>
                    <Trash2 size={13} strokeWidth={2} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <h2 className="mb-4 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>Dados básicos</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Nome da fase *</span>
              <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Ex: Fase de Grupos" className={inputClass} style={inputStyle} />
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Apelido (opcional)</span>
              <input type="text" value={customLabel} onChange={e => setCustomLabel(e.target.value)} placeholder="Ex: Split Orange" className={inputClass} style={inputStyle} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Tipo de fase</span>
              <select value={phaseType} onChange={e => setPhaseType(e.target.value)} className={inputClass} style={inputStyle}>
                <option value="round_robin">Pontos Corridos</option>
                <option value="group_stage">Fase de Grupos</option>
                <option value="knockout">Mata-mata</option>
                <option value="conference">Conferência</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Ordem de exibição</span>
              <input type="number" value={displayOrder} onChange={e => setDisplayOrder(e.target.value)} className={inputClass} style={inputStyle} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Duração de cada tempo (min)</span>
              <input type="number" value={halfDuration} onChange={e => setHalfDuration(e.target.value)} className={inputClass} style={inputStyle} />
            </label>
          </div>
        </div>

        {isKnockout && (
          <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            <h2 className="mb-4 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>Configurações eliminatórias</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={legs} onChange={e => setLegs(e.target.checked)} className="h-4 w-4" />
                <span className="text-sm" style={{ color: "var(--color-text-primary)" }}>Jogos de ida e volta</span>
              </label>
              {legs && (
                <label className="flex items-center gap-3 cursor-pointer ml-7">
                  <input type="checkbox" checked={aggregateScore} onChange={e => setAggregateScore(e.target.checked)} className="h-4 w-4" />
                  <span className="text-sm" style={{ color: "var(--color-text-primary)" }}>Placar agregado</span>
                </label>
              )}
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={thirdPlace} onChange={e => setThirdPlace(e.target.checked)} className="h-4 w-4" />
                <span className="text-sm" style={{ color: "var(--color-text-primary)" }}>Disputa de terceiro lugar</span>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Tipo de desempate</span>
                <select value={tiebreakerType} onChange={e => setTiebreakerType(e.target.value)} className={inputClass} style={inputStyle}>
                  <option value="penalties">Pênaltis</option>
                  <option value="shootouts">Shoot-outs</option>
                </select>
              </label>
            </div>
          </div>
        )}

        {isClassificatory && (
          <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            <h2 className="mb-4 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>Pontuação</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Pontos por vitória</span>
                <input type="number" value={pointsWin} onChange={e => setPointsWin(e.target.value)} className={inputClass} style={inputStyle} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Pontos por empate</span>
                <input type="number" value={pointsDraw} onChange={e => setPointsDraw(e.target.value)} className={inputClass} style={inputStyle} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Pontos por derrota</span>
                <input type="number" value={pointsLoss} onChange={e => setPointsLoss(e.target.value)} className={inputClass} style={inputStyle} />
              </label>
            </div>
          </div>
        )}

        {error && <p className="text-sm" style={{ color: "var(--color-danger)" }}>{error}</p>}

        <button type="submit" disabled={loading}
          className="rounded-lg px-6 py-2.5 text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
          {loading ? "Criando…" : "Criar fase"}
        </button>
      </form>
    </div>
  );
}