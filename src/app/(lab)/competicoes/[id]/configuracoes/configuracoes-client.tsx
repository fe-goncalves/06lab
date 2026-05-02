"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Breadcrumb from "@/app/(lab)/components/breadcrumb";
import { toast } from "@/app/(lab)/components/toast";
import { editarCompeticao, criarCategoria, editarCategoria, deletarCategoria } from "../../actions";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Competition = {
  id: string;
  full_name: string;
  short_name: string | null;
  gender: string;
  logo_url: string | null;
  primary_color: string | null;
  pinned_in_sidebar: boolean;
  division_above_ids: string | null;
  division_below_ids: string | null;
  division_same_ids: string | null;
};

type OtherCompetition = { id: string; full_name: string; short_name: string | null };
type Category = { id: string; label: string; display_order: number };
type Edition = { id: string; status: string; season_name: string; year_value: number };

type Props = {
  competition: Competition;
  allCompetitions: OtherCompetition[];
  categories: Category[];
  editions: Edition[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseIds(raw: string | null): string[] {
  if (!raw) return [];
  return raw.split(",").map(s => s.trim()).filter(Boolean);
}

function idsToString(ids: string[]): string {
  return ids.join(",");
}

function extractDominantColors(file: File): Promise<string[]> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(url); resolve([]); return; }
      ctx.drawImage(img, 0, 0);
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const buckets: Record<string, number> = {};
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
        if (a < 128) continue; // ignora transparente
        // Ignora brancos, pretos e cinzas muito claros/escuros
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        if (max > 230 && min > 200) continue;
        if (max < 30) continue;
        if (max - min < 20) continue; // cinza
        // Quantiza para bucket de 32
        const qr = Math.round(r / 32) * 32;
        const qg = Math.round(g / 32) * 32;
        const qb = Math.round(b / 32) * 32;
        const key = `${qr},${qg},${qb}`;
        buckets[key] = (buckets[key] ?? 0) + 1;
      }
      URL.revokeObjectURL(url);
      const sorted = Object.entries(buckets)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([key]) => {
          const [r, g, b] = key.split(",").map(Number);
          return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
        });
      resolve(sorted);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve([]); };
    img.src = url;
  });
}

const STATUS_LABEL: Record<string, string> = {
  planned: "Planejada",
  ongoing: "Em andamento",
  closed: "Encerrada",
};

const STATUS_COLOR: Record<string, string> = {
  planned: "#A6A6A6",
  ongoing: "#BFF205",
  closed: "#444",
};

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ConfiguracoesCompeticaoClient({
  competition,
  allCompetitions,
  categories: initialCategories,
  editions,
}: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<"geral" | "categorias" | "temporadas">("geral");

  // ── Aba Geral ──
  const [fullName, setFullName] = useState(competition.full_name ?? "");
  const [shortName, setShortName] = useState(competition.short_name ?? "");
  const [gender, setGender] = useState(competition.gender ?? "male");
  const [pinned, setPinned] = useState(competition.pinned_in_sidebar ?? false);
  const [primaryColor, setPrimaryColor] = useState(competition.primary_color ?? "");
  const [suggestedColors, setSuggestedColors] = useState<string[]>([]);
  const [logoUrl, setLogoUrl] = useState(competition.logo_url ?? null);
  const [pendingLogo, setPendingLogo] = useState<File | null>(null);
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Divisões — arrays de IDs
  const [divAbove, setDivAbove] = useState<string[]>(parseIds(competition.division_above_ids));
  const [divBelow, setDivBelow] = useState<string[]>(parseIds(competition.division_below_ids));
  const [divSame, setDivSame] = useState<string[]>(parseIds(competition.division_same_ids));

  // ── Aba Categorias ──
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [newCategoryLabel, setNewCategoryLabel] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryLabel, setEditingCategoryLabel] = useState("");

  const inputClass = "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]";
  const inputStyle = { borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" };

  // ── Logo + extração de cor ──
  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPendingLogo(f);
    setPreviewLogo(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(f); });
    const colors = await extractDominantColors(f);
    setSuggestedColors(colors);
  }

  // ── Toggle divisão ──
  function toggleDivision(
    list: string[],
    setList: (v: string[]) => void,
    id: string,
  ) {
    setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
  }

  // ── Salvar aba Geral ──
  async function handleSave() {
    setSaving(true);
    const fd = new FormData();
    fd.append("full_name", fullName.trim());
    fd.append("short_name", shortName.trim());
    fd.append("gender", gender);
    fd.append("pinned_in_sidebar", String(pinned));
    fd.append("primary_color", primaryColor.trim());
    fd.append("division_above_ids", idsToString(divAbove));
    fd.append("division_below_ids", idsToString(divBelow));
    fd.append("division_same_ids", idsToString(divSame));
    if (pendingLogo) fd.append("logo", pendingLogo);
    const result = await editarCompeticao(competition.id, fd);
    setSaving(false);
    if ("error" in result) { toast("error", result.error); return; }
    toast("success", "Competição salva com sucesso.");
    router.refresh();
  }

  // ── Categorias ──
  async function handleAddCategory() {
    if (!newCategoryLabel.trim()) return;
    setAddingCategory(true);
    const result = await criarCategoria(competition.id, newCategoryLabel);
    setAddingCategory(false);
    if ("error" in result) { toast("error", result.error); return; }
    setCategories(prev => [...prev, { id: result.id, label: newCategoryLabel.trim(), display_order: prev.length + 1 }]);
    setNewCategoryLabel("");
  }

  async function handleEditCategory(id: string) {
    if (!editingCategoryLabel.trim()) return;
    const result = await editarCategoria(id, editingCategoryLabel, competition.id);
    if ("error" in result) { toast("error", result.error); return; }
    setCategories(prev => prev.map(c => c.id === id ? { ...c, label: editingCategoryLabel.trim() } : c));
    setEditingCategoryId(null);
  }

  async function handleDeleteCategory(id: string) {
    if (!confirm("Remover esta categoria?")) return;
    const result = await deletarCategoria(id, competition.id);
    if ("error" in result) { toast("error", result.error); return; }
    setCategories(prev => prev.filter(c => c.id !== id));
  }

  const displayLogo = previewLogo ?? logoUrl;

  // ── Multi-select de divisão ──
  function DivisionPicker({
    label,
    selected,
    onToggle,
  }: {
    label: string;
    selected: string[];
    onToggle: (id: string) => void;
  }) {
    return (
      <div>
        <p className="mb-2 text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{label}</p>
        {allCompetitions.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Nenhuma outra competição cadastrada.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {allCompetitions.map(c => {
              const active = selected.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onToggle(c.id)}
                  className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-mono transition-colors"
                  style={{
                    borderColor: active ? "var(--color-brand)" : "var(--color-border)",
                    backgroundColor: active ? "rgba(191,242,5,0.1)" : "transparent",
                    color: active ? "var(--color-brand)" : "var(--color-text-secondary)",
                  }}
                >
                  {active && <Check size={11} strokeWidth={2.5} />}
                  {c.short_name ?? c.full_name}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "var(--color-background)" }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
        <div className="px-8 pt-6 pb-0">
          <Breadcrumb items={[
            { label: "Competições", href: "/competicoes" },
            { label: competition.full_name ?? "Competição", href: `/competicoes/${competition.id}` },
            { label: "Configurações" },
          ]} />

          {/* Identidade da competição no header */}
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {displayLogo ? (
                <img src={displayLogo} alt="" className="h-10 w-10 rounded-lg object-contain border"
                  style={{ borderColor: "var(--color-border)" }} />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-bold"
                  style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)", color: "var(--color-text-primary)" }}>
                  {fullName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="font-display text-xl font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  {fullName || "Competição"}
                </h1>
                <p className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  {gender === "male" ? "Masculino" : "Feminino"}
                </p>
              </div>
            </div>

            {activeTab === "geral" && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}
              >
                {saving ? "Salvando…" : "Salvar alterações"}
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-6">
            {([
              { key: "geral", label: "GERAL" },
              { key: "categorias", label: "CATEGORIAS" },
              { key: "temporadas", label: "TEMPORADAS" },
            ] as const).map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className="border-b-2 pb-3 font-mono text-xs transition-colors"
                style={{
                  borderColor: activeTab === tab.key ? "var(--color-brand)" : "transparent",
                  color: activeTab === tab.key ? "var(--color-brand)" : "#A6A6A6",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 px-8 py-8">

        {/* ── ABA GERAL ── */}
        {activeTab === "geral" && (
          <div className="grid gap-6 lg:grid-cols-2 max-w-4xl">

            {/* Bloco: Logo e Cor */}
            <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              <h2 className="mb-4 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
                Identidade Visual
              </h2>

              {/* Logo */}
              <div className="mb-4 flex justify-center">
                {displayLogo ? (
                  <img src={displayLogo} alt="" className="h-28 w-28 rounded-xl border object-contain"
                    style={{ borderColor: "var(--color-border)" }} />
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center rounded-xl border text-2xl font-bold"
                    style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" }}>
                    {fullName.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/png,image/webp,image/svg+xml" className="hidden" onChange={handleLogoChange} />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full rounded-lg border px-3 py-2 text-sm font-medium mb-5"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
              >
                Trocar logo
              </button>

              {/* Cor primária */}
              <div>
                <p className="mb-2 text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Cor principal</p>
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="h-9 w-9 rounded-lg border shrink-0"
                    style={{
                      borderColor: "var(--color-border)",
                      backgroundColor: primaryColor || "var(--color-background)",
                    }}
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={e => setPrimaryColor(e.target.value)}
                    placeholder="#000000"
                    maxLength={7}
                    className={inputClass + " flex-1 font-mono"}
                    style={inputStyle}
                  />
                  <input
                    type="color"
                    value={primaryColor || "#000000"}
                    onChange={e => setPrimaryColor(e.target.value)}
                    className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border p-0.5"
                    style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }}
                  />
                </div>
                {suggestedColors.length > 0 && (
                  <div>
                    <p className="mb-2 font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                      Cores extraídas da logo:
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {suggestedColors.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setPrimaryColor(c)}
                          title={c}
                          className="h-7 w-7 rounded-md border-2 transition-transform hover:scale-110"
                          style={{
                            backgroundColor: c,
                            borderColor: primaryColor === c ? "var(--color-brand)" : "transparent",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bloco: Dados */}
            <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              <h2 className="mb-4 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
                Dados
              </h2>
              <div className="flex flex-col gap-4">
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Nome completo</span>
                  <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} className={inputClass} style={inputStyle} />
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
                <label className="flex items-center gap-3 cursor-pointer pt-1">
                  <div
                    onClick={() => setPinned(v => !v)}
                    className="relative h-5 w-9 rounded-full transition-colors cursor-pointer shrink-0"
                    style={{ backgroundColor: pinned ? "var(--color-brand)" : "var(--color-border)" }}
                  >
                    <div
                      className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform"
                      style={{ transform: pinned ? "translateX(16px)" : "translateX(2px)" }}
                    />
                  </div>
                  <span className="text-sm" style={{ color: "var(--color-text-primary)" }}>Fixar na sidebar</span>
                </label>
              </div>
            </div>

            {/* Bloco: Divisões */}
            <div className="rounded-xl border p-5 lg:col-span-2" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              <h2 className="mb-5 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
                Divisões Relacionadas
              </h2>
              <div className="flex flex-col gap-6">
                <DivisionPicker
                  label="Divisão superior"
                  selected={divAbove}
                  onToggle={id => toggleDivision(divAbove, setDivAbove, id)}
                />
                <div className="border-t" style={{ borderColor: "var(--color-border)" }} />
                <DivisionPicker
                  label="Mesma divisão"
                  selected={divSame}
                  onToggle={id => toggleDivision(divSame, setDivSame, id)}
                />
                <div className="border-t" style={{ borderColor: "var(--color-border)" }} />
                <DivisionPicker
                  label="Divisão inferior"
                  selected={divBelow}
                  onToggle={id => toggleDivision(divBelow, setDivBelow, id)}
                />
              </div>
            </div>

          </div>
        )}

        {/* ── ABA CATEGORIAS ── */}
        {activeTab === "categorias" && (
          <div className="max-w-xl">
            <p className="mb-6 text-sm" style={{ color: "var(--color-text-secondary)" }}>
              Categorias organizam os atletas inscritos nesta competição (ex: Sub-11, Sub-13, Adulto).
            </p>

            {/* Lista de categorias */}
            <div className="rounded-xl border overflow-hidden mb-4" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
              {categories.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  Nenhuma categoria cadastrada.
                </p>
              ) : (
                <div>
                  {categories.map((cat, idx) => (
                    <div
                      key={cat.id}
                      className="group flex items-center gap-3 px-5 py-3"
                      style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none" }}
                    >
                      {editingCategoryId === cat.id ? (
                        <>
                          <input
                            type="text"
                            value={editingCategoryLabel}
                            onChange={e => setEditingCategoryLabel(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") handleEditCategory(cat.id); if (e.key === "Escape") setEditingCategoryId(null); }}
                            className={inputClass + " flex-1 text-sm"}
                            style={inputStyle}
                            autoFocus
                          />
                          <button type="button" onClick={() => handleEditCategory(cat.id)}
                            className="rounded border p-1.5" style={{ borderColor: "var(--color-border)", color: "var(--color-brand)" }}>
                            <Check size={13} />
                          </button>
                          <button type="button" onClick={() => setEditingCategoryId(null)}
                            className="rounded border p-1.5" style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                            <X size={13} />
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                            {cat.label}
                          </span>
                          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => { setEditingCategoryId(cat.id); setEditingCategoryLabel(cat.label); }}
                              className="rounded border p-1.5"
                              style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(cat.id)}
                              className="rounded border p-1.5"
                              style={{ borderColor: "var(--color-border)", color: "var(--color-danger)" }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Adicionar categoria */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategoryLabel}
                onChange={e => setNewCategoryLabel(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleAddCategory(); }}
                placeholder="Nova categoria (ex: Sub-17)"
                className={inputClass + " flex-1"}
                style={inputStyle}
              />
              <button
                type="button"
                onClick={handleAddCategory}
                disabled={addingCategory || !newCategoryLabel.trim()}
                className="flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-40"
                style={{ borderColor: "var(--color-brand)", color: "var(--color-brand)" }}
              >
                <Plus size={14} />
                {addingCategory ? "Adicionando…" : "Adicionar"}
              </button>
            </div>
          </div>
        )}

        {/* ── ABA TEMPORADAS ── */}
        {activeTab === "temporadas" && (
          <div className="max-w-xl">
            <p className="mb-6 text-sm" style={{ color: "var(--color-text-secondary)" }}>
              Cada temporada é uma edição desta competição. Gerencie o status de cada uma aqui.
            </p>

            <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
              {editions.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  Nenhuma edição cadastrada para esta competição.
                </p>
              ) : (
                <div>
                  {editions.map((ed, idx) => (
                    <div
                      key={ed.id}
                      className="flex items-center justify-between gap-4 px-5 py-4"
                      style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none" }}
                    >
                      <div>
                        <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                          {ed.season_name} {ed.year_value ? `— ${ed.year_value}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className="font-mono text-xs rounded px-2 py-0.5"
                          style={{
                            backgroundColor: ed.status === "ongoing"
                              ? "rgba(191,242,5,0.15)"
                              : "rgba(255,255,255,0.06)",
                            color: STATUS_COLOR[ed.status] ?? "#A6A6A6",
                          }}
                        >
                          {STATUS_LABEL[ed.status] ?? ed.status}
                        </span>
                        
                          href={`/competicoes/${competition.id}?edicao=${ed.id}`}
                          className="font-mono text-xs rounded border px-2 py-1 transition-colors hover:border-[var(--color-brand)]"
                          style={{ borderColor: "var(--color-border)", color: "var(--color-brand)" }}
                        >
                          Abrir →
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}