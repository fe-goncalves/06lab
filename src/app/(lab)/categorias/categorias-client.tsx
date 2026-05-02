"use client";

import { useState } from "react";
import { criarCategoriaGlobal, editarCategoriaGlobal, deletarCategoriaGlobal } from "./actions";
import { toast } from "@/app/(lab)/components/toast";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";

type Category = { id: string; label: string; display_order: number };
type Props = { categories: Category[] };

export default function CategoriasClient({ categories: initialCategories }: Props) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const ic = "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]";
  const is = { borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" };

  async function handleAdd() {
    if (!newLabel.trim()) return;
    setAdding(true);
    const result = await criarCategoriaGlobal(newLabel);
    setAdding(false);
    if ("error" in result) { toast("error", result.error); return; }
    setCategories(prev => [...prev, { id: result.id, label: newLabel.trim(), display_order: prev.length + 1 }]);
    setNewLabel("");
    toast("success", "Categoria criada.");
  }

  async function handleEdit(id: string) {
    if (!editingLabel.trim()) return;
    const result = await editarCategoriaGlobal(id, editingLabel);
    if ("error" in result) { toast("error", result.error); return; }
    setCategories(prev => prev.map(c => c.id === id ? { ...c, label: editingLabel.trim() } : c));
    setEditingId(null);
    toast("success", "Categoria atualizada.");
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover esta categoria? As competições vinculadas ficarão sem categoria.")) return;
    setDeletingId(id);
    const result = await deletarCategoriaGlobal(id);
    setDeletingId(null);
    if ("error" in result) { toast("error", result.error); return; }
    setCategories(prev => prev.filter(c => c.id !== id));
    toast("success", "Categoria removida.");
  }

  return (
    <div className="max-w-lg">
      {/* Lista */}
      <div className="rounded-xl border overflow-hidden mb-4" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
        {categories.length === 0 && (
          <div className="px-5 py-10 text-center">
            <p className="font-display text-base mb-1" style={{ color: "var(--color-text-primary)" }}>Nenhuma categoria ainda</p>
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              Adicione categorias como Sub-11, Sub-13, Adulto, etc.
            </p>
          </div>
        )}
        {categories.map((cat, idx) => (
          <div key={cat.id}
            className="group flex items-center gap-3 px-5 py-3"
            style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none" }}>

            {editingId === cat.id ? (
              <>
                <input
                  type="text"
                  value={editingLabel}
                  onChange={e => setEditingLabel(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") handleEdit(cat.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className={ic + " flex-1"}
                  style={is}
                  autoFocus
                />
                <button type="button" onClick={() => handleEdit(cat.id)}
                  className="rounded border p-1.5"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-brand)" }}>
                  <Check size={13} />
                </button>
                <button type="button" onClick={() => setEditingId(null)}
                  className="rounded border p-1.5"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                  <X size={13} />
                </button>
              </>
            ) : (
              <>
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded font-mono text-xs font-bold"
                  style={{ backgroundColor: "rgba(255,255,255,0.05)", color: "var(--color-text-secondary)" }}>
                  {cat.display_order}
                </div>
                <span className="flex-1 text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                  {cat.label}
                </span>
                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button type="button"
                    onClick={() => { setEditingId(cat.id); setEditingLabel(cat.label); }}
                    className="rounded border p-1.5"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                    <Pencil size={13} />
                  </button>
                  <button type="button"
                    onClick={() => handleDelete(cat.id)}
                    disabled={deletingId === cat.id}
                    className="rounded border p-1.5 disabled:opacity-40"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-danger)" }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Adicionar */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") handleAdd(); }}
          placeholder="Nova categoria (ex: Sub-17, Adulto)"
          className={ic + " flex-1"}
          style={is}
        />
        <button type="button" onClick={handleAdd}
          disabled={adding || !newLabel.trim()}
          className="flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-40"
          style={{ borderColor: "var(--color-brand)", color: "var(--color-brand)" }}>
          <Plus size={14} />
          {adding ? "…" : "Adicionar"}
        </button>
      </div>
    </div>
  );
}