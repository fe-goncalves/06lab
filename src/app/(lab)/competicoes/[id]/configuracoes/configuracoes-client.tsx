"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Breadcrumb from "@/app/(lab)/components/breadcrumb";
import { toast } from "@/app/(lab)/components/toast";
import {
  editarCompeticao,
  criarEdicaoNaConfiguracao,
  editarEdicaoNaConfiguracao,
  deletarEdicao,
} from "../../actions";
import { Plus, Trash2, X, Pencil } from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Competition = {
  id: string; full_name: string; short_name: string | null; gender: string;
  logo_url: string | null; primary_color: string | null; pinned_in_sidebar: boolean;
  category_id: string | null; division_above_ids: string | null;
  division_below_ids: string | null; division_same_ids: string | null;
  home_priority: number | null;
};

type OtherCompetition = { id: string; full_name: string; short_name: string | null };
type GlobalCategory = { id: string; label: string; display_order: number };
type Edition = {
  id: string; status: string; season_id: string;
  custom_name: string | null; is_current: boolean;
  season_name: string; year_value: number;
};
type Season = { id: string; name: string; year_value: number };

type Props = {
  competition: Competition;
  allCompetitions: OtherCompetition[];
  globalCategories: GlobalCategory[];
  editions: Edition[];
  seasons: Season[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseIds(raw: string | null): string[] {
  if (!raw) return [];
  return raw.split(",").map(s => s.trim()).filter(Boolean);
}

function idsToString(ids: string[]): string { return ids.join(","); }

async function extractDominantColors(file: File): Promise<string[]> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const size = 80;
        const canvas = document.createElement("canvas");
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) { URL.revokeObjectURL(url); resolve([]); return; }
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);
        const freq: Record<string, number> = {};
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
          if (a < 200) continue;
          const brightness = (r + g + b) / 3;
          if (brightness > 235 || brightness < 20) continue;
          if (Math.max(r, g, b) - Math.min(r, g, b) < 20) continue;
          const qr = Math.round(r / 36) * 36;
          const qg = Math.round(g / 36) * 36;
          const qb = Math.round(b / 36) * 36;
          const key = qr + "|" + qg + "|" + qb;
          freq[key] = (freq[key] ?? 0) + 1;
        }
        URL.revokeObjectURL(url);
        resolve(
          Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([key]) => {
            const [rr, gg, bb] = key.split("|").map(Number);
            return "#" + rr.toString(16).padStart(2, "0") + gg.toString(16).padStart(2, "0") + bb.toString(16).padStart(2, "0");
          })
        );
      } catch { URL.revokeObjectURL(url); resolve([]); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve([]); };
    img.src = url;
  });
}

const EDITION_STATUS_OPTIONS = [
  { value: "planned", label: "Planejada" },
  { value: "ongoing", label: "Em andamento" },
  { value: "closed", label: "Encerrada" },
];

const STATUS_COLOR: Record<string, string> = {
  planned: "#A6A6A6", ongoing: "#BFF205", closed: "#555",
};

// ─── Modal de criação/edição de edição ────────────────────────────────────────

function EdicaoModal({
  mode,
  seasons,
  usedSeasonIds,
  initial,
  onClose,
  onSave,
}: {
  mode: "create" | "edit";
  seasons: Season[];
  usedSeasonIds: Set<string>;
  initial?: Edition;
  onClose: () => void;
  onSave: (data: { seasonId: string; customName: string; status: string; isCurrent: boolean }) => Promise<void>;
}) {
  const availableSeasons = mode === "create"
    ? seasons.filter(s => !usedSeasonIds.has(s.id))
    : seasons;

  const [seasonId, setSeasonId] = useState(
    mode === "edit" ? (initial?.season_id ?? "") : (availableSeasons[0]?.id ?? "")
  );
  const [customName, setCustomName] = useState(initial?.custom_name ?? "");
  const [status, setStatus] = useState(initial?.status ?? "planned");
  const [isCurrent, setIsCurrent] = useState(initial?.is_current ?? false);
  const [saving, setSaving] = useState(false);

  const inputClass = "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]";
  const inputStyle = { borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" };

  const selectedSeason = seasons.find(s => s.id === seasonId);
  const displayName = customName.trim() || (selectedSeason ? selectedSeason.name + (selectedSeason.year_value ? " " + selectedSeason.year_value : "") : "");

  async function handleSubmit() {
    setSaving(true);
    await onSave({ seasonId, customName, status, isCurrent });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-xl border shadow-xl"
        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>

        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "var(--color-border)" }}>
          <h2 className="font-display text-base font-semibold" style={{ color: "var(--color-text-primary)" }}>
            {mode === "create" ? "Nova edição" : "Editar edição"}
          </h2>
          <button type="button" onClick={onClose} style={{ color: "var(--color-text-secondary)" }}>
            <X size={18} />
          </button>
        </div>

        {/* Corpo */}
        <div className="px-5 py-5 flex flex-col gap-4">

          {/* Temporada */}
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Temporada</span>
            {mode === "create" && availableSeasons.length === 0 ? (
              <p className="text-sm rounded-lg border px-3 py-2" style={{ borderColor: "var(--color-border)", color: "#A6A6A6" }}>
                Todas as temporadas já têm edição criada.
              </p>
            ) : (
              <select
                value={seasonId}
                onChange={e => setSeasonId(e.target.value)}
                disabled={mode === "edit"}
                className={inputClass}
                style={{ ...inputStyle, opacity: mode === "edit" ? 0.6 : 1 }}>
                {(mode === "create" ? availableSeasons : seasons).map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}{s.year_value ? " \u2014 " + String(s.year_value) : ""}
                  </option>
                ))}
              </select>
            )}
          </label>

          {/* Nome customizado */}
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
              Nome da edição
              <span className="ml-1 font-normal text-xs" style={{ color: "#666" }}>(opcional)</span>
            </span>
            <input
              type="text"
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              placeholder={selectedSeason ? selectedSeason.name + (selectedSeason.year_value ? " " + selectedSeason.year_value : "") : "Ex: 2026 I"}
              className={inputClass}
              style={inputStyle}
            />
            {displayName && (
              <p className="text-xs mt-0.5" style={{ color: "#666" }}>
                Será exibido como: <strong style={{ color: "var(--color-text-primary)" }}>{displayName}</strong>
              </p>
            )}
          </label>

          {/* Status */}
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Status</span>
            <select value={status} onChange={e => setStatus(e.target.value)} className={inputClass} style={inputStyle}>
              {EDITION_STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>

          {/* É atual */}
          <div className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer"
            style={{ borderColor: isCurrent ? "var(--color-brand)" : "var(--color-border)", backgroundColor: isCurrent ? "rgba(191,242,5,0.05)" : "transparent" }}
            onClick={() => setIsCurrent(v => !v)}>
            <div className="mt-0.5 h-4 w-4 shrink-0 rounded border-2 flex items-center justify-center"
              style={{ borderColor: isCurrent ? "var(--color-brand)" : "var(--color-border)", backgroundColor: isCurrent ? "var(--color-brand)" : "transparent" }}>
              {isCurrent && <span style={{ fontSize: 10, color: "var(--color-background)", fontWeight: 900 }}>✓</span>}
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Edição atual</p>
              <p className="text-xs mt-0.5" style={{ color: "#666" }}>
                Marca esta como a edição em vigor desta competição. Apenas uma pode ser a atual por vez.
              </p>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t px-5 py-4" style={{ borderColor: "var(--color-border)" }}>
          <button type="button" onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
            Cancelar
          </button>
          <button type="button" onClick={handleSubmit}
            disabled={saving || (mode === "create" && availableSeasons.length === 0)}
            className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
            {saving ? (mode === "create" ? "Criando…" : "Salvando…") : (mode === "create" ? "Criar edição" : "Salvar")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ConfiguracoesCompeticaoClient({
  competition, allCompetitions, globalCategories, editions: initialEditions, seasons,
}: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<"geral" | "divisoes" | "temporadas">("geral");

  // Geral
  const [fullName, setFullName] = useState(competition.full_name ?? "");
  const [shortName, setShortName] = useState(competition.short_name ?? "");
  const [gender, setGender] = useState(competition.gender ?? "male");
  const [pinned, setPinned] = useState(competition.pinned_in_sidebar ?? false);
  const [primaryColor, setPrimaryColor] = useState(competition.primary_color ?? "");
  const [suggestedColors, setSuggestedColors] = useState<string[]>([]);
  const [extractingColors, setExtractingColors] = useState(false);
  const [logoUrl] = useState(competition.logo_url ?? null);
  const [pendingLogo, setPendingLogo] = useState<File | null>(null);
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState(competition.category_id ?? "");
  const [homePriority, setHomePriority] = useState(competition.home_priority ?? 0);
  const [saving, setSaving] = useState(false);

  // Divisões
  const [divAbove, setDivAbove] = useState<string[]>(parseIds(competition.division_above_ids));
  const [divBelow, setDivBelow] = useState<string[]>(parseIds(competition.division_below_ids));
  const [divSame, setDivSame] = useState<string[]>(parseIds(competition.division_same_ids));

  // Edições
  const [editions, setEditions] = useState<Edition[]>(initialEditions);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEdition, setEditingEdition] = useState<Edition | null>(null);
  const [deletingEditionId, setDeletingEditionId] = useState<string | null>(null);

  const inputClass = "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]";
  const inputStyle = { borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" };
  const displayLogo = previewLogo ?? logoUrl;
  const usedSeasonIds = new Set(editions.map(e => e.season_id));
  const availableSeasons = seasons.filter(s => !usedSeasonIds.has(s.id));

  // Ordenação: ano desc, depois nome desc
  const sortedEditions = [...editions].sort((a, b) => {
    if (b.year_value !== a.year_value) return b.year_value - a.year_value;
    const nameA = a.custom_name ?? a.season_name;
    const nameB = b.custom_name ?? b.season_name;
    return nameB.localeCompare(nameA);
  });

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPendingLogo(f);
    setPreviewLogo(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(f); });
    setExtractingColors(true);
    setSuggestedColors([]);
    const colors = await extractDominantColors(f);
    setSuggestedColors(colors);
    setExtractingColors(false);
    if (colors.length > 0 && !primaryColor) setPrimaryColor(colors[0]);
  }

  function toggleDiv(_list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, id: string) {
    setList(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function handleSave() {
    setSaving(true);
    const fd = new FormData();
    fd.append("full_name", fullName.trim());
    fd.append("short_name", shortName.trim());
    fd.append("gender", gender);
    fd.append("pinned_in_sidebar", String(pinned));
    fd.append("primary_color", primaryColor.trim());
    fd.append("category_id", categoryId);
    fd.append("division_above_ids", idsToString(divAbove));
    fd.append("division_below_ids", idsToString(divBelow));
    fd.append("division_same_ids", idsToString(divSame));
    fd.append("home_priority", String(homePriority));
    if (pendingLogo) fd.append("logo", pendingLogo);
    const result = await editarCompeticao(competition.id, fd);
    setSaving(false);
    if ("error" in result) { toast("error", result.error); return; }
    toast("success", "Competição salva.");
    router.refresh();
  }

  async function handleCreateEdition(data: { seasonId: string; customName: string; status: string; isCurrent: boolean }) {
    const result = await criarEdicaoNaConfiguracao(competition.id, data.seasonId, data.customName, data.isCurrent);
    if ("error" in result) { toast("error", result.error); return; }
    const season = seasons.find(s => s.id === data.seasonId);
    const newEd: Edition = {
      id: result.id, status: data.status, season_id: data.seasonId,
      custom_name: data.customName.trim() || null, is_current: data.isCurrent,
      season_name: season?.name ?? "—", year_value: season?.year_value ?? 0,
    };
    setEditions(prev => {
      const updated = data.isCurrent ? prev.map(e => ({ ...e, is_current: false })) : prev;
      return [newEd, ...updated];
    });
    setShowCreateModal(false);
    toast("success", "Edição criada.");
  }

  async function handleEditEdition(data: { seasonId: string; customName: string; status: string; isCurrent: boolean }) {
    if (!editingEdition) return;
    const result = await editarEdicaoNaConfiguracao(editingEdition.id, competition.id, data.status, data.customName, data.isCurrent);
    if ("error" in result) { toast("error", result.error); return; }
    setEditions(prev => prev.map(e => {
      if (e.id === editingEdition.id) return { ...e, status: data.status, custom_name: data.customName.trim() || null, is_current: data.isCurrent };
      if (data.isCurrent) return { ...e, is_current: false };
      return e;
    }));
    setEditingEdition(null);
    toast("success", "Edição atualizada.");
  }

  async function handleDeleteEdition(id: string) {
    if (!confirm("Tem certeza? Isso remove a edição e todos os dados vinculados (fases, partidas, inscrições).")) return;
    setDeletingEditionId(id);
    const result = await deletarEdicao(id, competition.id);
    setDeletingEditionId(null);
    if ("error" in result) { toast("error", result.error); return; }
    setEditions(prev => prev.filter(e => e.id !== id));
    toast("success", "Edição removida.");
  }

  const tabs = [
    { key: "geral" as const, label: "GERAL" },
    { key: "divisoes" as const, label: "DIVISÕES" },
    { key: "temporadas" as const, label: "EDIÇÕES" },
  ];

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "var(--color-background)" }}>

      {/* Header */}
      <div className="border-b" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
        <div className="px-8 pt-6 pb-0">
          <Breadcrumb items={[
            { label: "Competições", href: "/competicoes" },
            { label: competition.full_name ?? "Competição", href: "/competicoes/" + competition.id },
            { label: "Configurações" },
          ]} />
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {displayLogo ? (
                <img src={displayLogo} alt="" className="h-10 w-10 rounded-lg object-contain border" style={{ borderColor: "var(--color-border)" }} />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-bold"
                  style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)", color: "var(--color-text-primary)" }}>
                  {fullName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="font-display text-xl font-semibold" style={{ color: "var(--color-text-primary)" }}>{fullName || "Competição"}</h1>
                <p className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>{gender === "male" ? "Masculino" : "Feminino"}</p>
              </div>
            </div>
            {(activeTab === "geral" || activeTab === "divisoes") && (
              <button type="button" onClick={handleSave} disabled={saving}
                className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}>
                {saving ? "Salvando…" : "Salvar alterações"}
              </button>
            )}
          </div>
          <div className="flex gap-6">
            {tabs.map(tab => (
              <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
                className="border-b-2 pb-3 font-mono text-xs transition-colors"
                style={{ borderColor: activeTab === tab.key ? "var(--color-brand)" : "transparent", color: activeTab === tab.key ? "var(--color-brand)" : "#A6A6A6" }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 px-8 py-8">

        {/* ══ GERAL ══ */}
        {activeTab === "geral" && (
          <div className="grid gap-6 lg:grid-cols-2 max-w-4xl">

            {/* Identidade Visual */}
            <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              <h2 className="mb-4 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>Identidade Visual</h2>
              <div className="mb-4 flex justify-center">
                {displayLogo ? (
                  <img src={displayLogo} alt="" className="h-28 w-28 rounded-xl border object-contain" style={{ borderColor: "var(--color-border)" }} />
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center rounded-xl border text-2xl font-bold"
                    style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" }}>
                    {fullName.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/png,image/webp,image/svg+xml,image/jpeg" className="hidden" onChange={handleLogoChange} />
              <button type="button" onClick={() => fileRef.current?.click()}
                className="w-full rounded-lg border px-3 py-2 text-sm font-medium mb-5"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}>
                Trocar logo
              </button>

              <p className="mb-2 text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Cor principal</p>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-9 w-9 rounded-lg border-2 shrink-0 transition-colors"
                  style={{ borderColor: primaryColor || "var(--color-border)", backgroundColor: primaryColor || "var(--color-background)" }} />
                <input type="text" value={primaryColor}
                  onChange={e => setPrimaryColor(e.target.value)}
                  onBlur={e => { let v = e.target.value.trim(); if (v && !v.startsWith("#")) v = "#" + v; setPrimaryColor(v); }}
                  placeholder="#RRGGBB" maxLength={7}
                  className={inputClass + " flex-1 font-mono text-sm"} style={inputStyle} />
                <input type="color"
                  value={primaryColor && /^#[0-9a-fA-F]{6}$/.test(primaryColor) ? primaryColor : "#000000"}
                  onChange={e => setPrimaryColor(e.target.value)}
                  className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border p-0.5"
                  style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }} />
                {primaryColor && (
                  <button type="button" onClick={() => { setPrimaryColor(""); setSuggestedColors([]); }}
                    className="shrink-0 rounded-lg border p-2"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                    <X size={14} />
                  </button>
                )}
              </div>
              {extractingColors && <p className="font-mono text-xs mb-2" style={{ color: "#666" }}>Analisando cores da logo…</p>}
              {suggestedColors.length > 0 && (
                <div>
                  <p className="mb-2 font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>Cores detectadas — clique para selecionar:</p>
                  <div className="flex gap-2 flex-wrap">
                    {suggestedColors.map(c => (
                      <button key={c} type="button" onClick={() => setPrimaryColor(c)} title={c}
                        className="relative h-8 w-8 rounded-lg transition-transform hover:scale-110"
                        style={{ backgroundColor: c, boxShadow: primaryColor === c ? "0 0 0 2px var(--color-brand), 0 0 0 4px var(--color-background)" : "0 0 0 1px rgba(255,255,255,0.15)" }}>
                        {primaryColor === c && (
                          <span className="absolute inset-0 flex items-center justify-center font-bold"
                            style={{ fontSize: 12, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Dados */}
            <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              <h2 className="mb-4 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>Dados</h2>
              <div className="flex flex-col gap-4">
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Nome completo</span>
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className={inputClass} style={inputStyle} />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Nome curto</span>
                  <input type="text" value={shortName} onChange={e => setShortName(e.target.value)} className={inputClass} style={inputStyle} />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Gênero</span>
                  <select value={gender} onChange={e => setGender(e.target.value)} className={inputClass} style={inputStyle}>
                    <option value="male">Masculino</option>
                    <option value="female">Feminino</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Categoria</span>
                  <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className={inputClass} style={inputStyle}>
                    <option value="">Sem categoria</option>
                    {globalCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                  {globalCategories.length === 0 && (
                    <p className="text-xs mt-1" style={{ color: "#666" }}>Nenhuma categoria cadastrada. Crie em Configurações do sistema.</p>
                  )}
                </label>
                <div className="flex items-center gap-3 cursor-pointer pt-1" onClick={() => setPinned(v => !v)}>
                  <div className="relative h-5 w-9 rounded-full transition-colors shrink-0"
                    style={{ backgroundColor: pinned ? "var(--color-brand)" : "var(--color-border)" }}>
                    <div className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform"
                      style={{ transform: pinned ? "translateX(16px)" : "translateX(2px)" }} />
                  </div>
                  <span className="text-sm" style={{ color: "var(--color-text-primary)" }}>Fixar na sidebar</span>
                </div>
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Prioridade na home (maior = primeiro)</span>
                  <input
                    type="number"
                    min={0}
                    value={homePriority}
                    onChange={e => setHomePriority(Number(e.target.value))}
                    placeholder="0"
                    className={inputClass}
                    style={inputStyle}
                  />
                </label>
              </div>
            </div>

          </div>
        )}

        {/* ══ DIVISÕES ══ */}
        {activeTab === "divisoes" && (
          <div className="max-w-2xl">
            <p className="mb-6 text-sm" style={{ color: "var(--color-text-secondary)" }}>
              Defina quais outras competições se relacionam com esta por divisão.
            </p>
            {allCompetitions.length === 0 ? (
              <div className="rounded-xl border p-8 text-center" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
                <p className="text-sm font-medium mb-1" style={{ color: "var(--color-text-primary)" }}>Nenhuma outra competição disponível</p>
                <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Para vincular divisões, cadastre pelo menos uma outra competição nesta organização.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {[
                  { label: "DIVISÃO SUPERIOR", desc: "Competições de nível acima desta.", list: divAbove, setList: setDivAbove },
                  { label: "MESMA DIVISÃO", desc: "Competições no mesmo nível.", list: divSame, setList: setDivSame },
                  { label: "DIVISÃO INFERIOR", desc: "Competições de nível abaixo desta.", list: divBelow, setList: setDivBelow },
                ].map(div => (
                  <div key={div.label} className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
                    <p className="font-mono text-xs uppercase tracking-widest mb-1" style={{ color: "var(--color-text-secondary)" }}>{div.label}</p>
                    <p className="text-xs mb-4" style={{ color: "#666" }}>{div.desc}</p>
                    <div className="flex flex-wrap gap-2">
                      {allCompetitions.map(c => {
                        const active = div.list.includes(c.id);
                        return (
                          <button key={c.id} type="button"
                            onClick={() => toggleDiv(div.list, div.setList, c.id)}
                            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-mono transition-all"
                            style={{
                              borderColor: active ? "var(--color-brand)" : "var(--color-border)",
                              backgroundColor: active ? "rgba(191,242,5,0.12)" : "transparent",
                              color: active ? "var(--color-brand)" : "var(--color-text-secondary)",
                              fontWeight: active ? 700 : 400,
                            }}>
                            {active && <span style={{ fontSize: 10 }}>✓</span>}
                            {c.short_name ?? c.full_name}
                          </button>
                        );
                      })}
                    </div>
                    {div.list.length > 0 && (
                      <p className="mt-3 text-xs" style={{ color: "var(--color-brand)" }}>
                        {div.list.length} selecionada{div.list.length > 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ EDIÇÕES ══ */}
        {activeTab === "temporadas" && (
          <div className="max-w-xl">
            <div className="mb-6 flex items-center justify-between gap-4">
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                Cada edição representa esta competição em uma temporada específica.
              </p>
              <button type="button" onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-mono shrink-0"
                style={{ borderColor: "var(--color-brand)", color: "var(--color-brand)" }}>
                <Plus size={13} />
                Nova edição
              </button>
            </div>

            <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
              {sortedEditions.length === 0 && (
                <p className="px-5 py-8 text-center text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  Nenhuma edição cadastrada para esta competição.
                </p>
              )}
              {sortedEditions.map((ed, idx) => {
                const displayName = ed.custom_name ?? (ed.season_name + (ed.year_value ? " " + ed.year_value : ""));
                return (
                  <Link
                    key={ed.id}
                    href={"/competicoes/" + competition.id + "?edicao=" + ed.id}
                    className="group flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-[rgba(255,255,255,0.03)]"
                    style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none", textDecoration: "none" }}>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                          {displayName}
                        </p>
                        {ed.is_current && (
                          <span className="font-mono text-xs rounded px-1.5 py-0.5"
                            style={{ backgroundColor: "rgba(191,242,5,0.15)", color: "var(--color-brand)" }}>
                            atual
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-xs rounded px-2 py-0.5"
                          style={{
                            backgroundColor: ed.status === "ongoing" ? "rgba(191,242,5,0.15)" : "rgba(255,255,255,0.06)",
                            color: STATUS_COLOR[ed.status] ?? "#A6A6A6",
                          }}>
                          {EDITION_STATUS_OPTIONS.find(o => o.value === ed.status)?.label ?? ed.status}
                        </span>
                        {ed.year_value > 0 && (
                          <span className="font-mono text-xs" style={{ color: "#555" }}>{ed.year_value}</span>
                        )}
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={e => e.preventDefault()}>
                      <button type="button"
                        onClick={e => { e.preventDefault(); e.stopPropagation(); setEditingEdition(ed); }}
                        className="rounded border p-1.5"
                        style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                        <Pencil size={13} />
                      </button>
                      <button type="button"
                        onClick={e => { e.preventDefault(); e.stopPropagation(); handleDeleteEdition(ed.id); }}
                        disabled={deletingEditionId === ed.id}
                        className="rounded border p-1.5 disabled:opacity-40"
                        style={{ borderColor: "var(--color-border)", color: "var(--color-danger)" }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* Modal — Criar edição */}
      {showCreateModal && (
        <EdicaoModal
          mode="create"
          seasons={seasons}
          usedSeasonIds={usedSeasonIds}
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreateEdition}
        />
      )}

      {/* Modal — Editar edição */}
      {editingEdition && (
        <EdicaoModal
          mode="edit"
          seasons={seasons}
          usedSeasonIds={usedSeasonIds}
          initial={editingEdition}
          onClose={() => setEditingEdition(null)}
          onSave={handleEditEdition}
        />
      )}

    </div>
  );
}