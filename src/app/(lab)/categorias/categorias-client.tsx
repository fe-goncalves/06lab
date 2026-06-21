"use client";

import { useState } from "react";
import { Check, GripVertical, Pencil, Plus, Tag, Trash2, X } from "lucide-react";
import {
  criarCategoriaGlobal,
  editarCategoriaGlobal,
  deletarCategoriaGlobal,
  reordenarCategoriasGlobal,
} from "./actions";
import { toast } from "@/app/(lab)/components/toast";
import styles from "@/app/(lab)/components/entity-hub.module.css";

type Category = { id: string; label: string; display_order: number };
type Props = { categories: Category[] };

export default function CategoriasClient({ categories: initialCategories }: Props) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  async function handleAdd() {
    if (!newLabel.trim()) return;
    setAdding(true);
    const result = await criarCategoriaGlobal(newLabel);
    setAdding(false);
    if ("error" in result) {
      toast("error", result.error);
      return;
    }
    setCategories((prev) => [...prev, { id: result.id, label: newLabel.trim(), display_order: prev.length + 1 }]);
    setNewLabel("");
    toast("success", "Categoria criada.");
  }

  async function handleEdit(id: string) {
    if (!editingLabel.trim()) return;
    const result = await editarCategoriaGlobal(id, editingLabel);
    if ("error" in result) {
      toast("error", result.error);
      return;
    }
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, label: editingLabel.trim() } : c)));
    setEditingId(null);
    toast("success", "Categoria atualizada.");
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover esta categoria? As competições vinculadas ficarão sem categoria.")) return;
    setDeletingId(id);
    const result = await deletarCategoriaGlobal(id);
    setDeletingId(null);
    if ("error" in result) {
      toast("error", result.error);
      return;
    }
    setCategories((prev) => prev.filter((c) => c.id !== id).map((c, i) => ({ ...c, display_order: i + 1 })));
    toast("success", "Categoria removida.");
  }

  function reorderCategories(sourceId: string, targetId: string) {
    if (sourceId === targetId) return;
    const from = categories.findIndex((c) => c.id === sourceId);
    const to = categories.findIndex((c) => c.id === targetId);
    if (from < 0 || to < 0) return;

    const next = [...categories];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    const withOrder = next.map((c, i) => ({ ...c, display_order: i + 1 }));
    setCategories(withOrder);

    setReordering(true);
    void (async () => {
      const result = await reordenarCategoriasGlobal(withOrder.map((c) => c.id));
      setReordering(false);
      if ("error" in result) {
        toast("error", result.error);
        setCategories(categories);
      }
    })();
  }

  return (
    <div className={`${styles.entityHub} ${styles.page} ${styles.hubListPage} ${styles.personListHub} ${styles.adminHub}`}>
      <div className={`${styles.content} ${styles.hubListContent}`}>
        <main className={styles.hallMain}>
          <div className={styles.rankingsTitleRow}>
            <div>
              <h2 className={styles.hallCategoryTitle}>Categorias</h2>
              <p className={styles.sectionSubtitle}>
                Categorias globais da organização · arraste para reordenar
                {reordering ? " · salvando ordem…" : ""}
              </p>
            </div>
          </div>

          <div className={styles.adminToolbarBlock}>
            <div className={styles.hubListSearchRow}>
              <div className={styles.newsSearchWrap}>
                <Tag size={15} strokeWidth={2} className={styles.newsSearchIcon} aria-hidden />
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleAdd();
                  }}
                  placeholder="Nova categoria…"
                  className={styles.newsSearchInput}
                  aria-label="Nova categoria"
                />
              </div>
              <div className={styles.hubListSearchActions}>
                <button
                  type="button"
                  onClick={() => void handleAdd()}
                  disabled={adding || !newLabel.trim()}
                  className={styles.saveBtn}
                >
                  <Plus size={14} strokeWidth={2.5} />
                  {adding ? "Adicionando…" : "Adicionar"}
                </button>
              </div>
            </div>
          </div>

          <div className={`${styles.hubListBare} ${styles.athleteListStack} ${styles.adminListSection}`}>
            {categories.length === 0 ? (
              <div className={styles.listPanelEmpty}>
                <Tag size={32} strokeWidth={1.5} className={styles.newsEmptyIcon} />
                <p className={styles.listPanelEmptyTitle}>Nenhuma categoria</p>
                <p className={styles.newsEmptyDesc}>
                  Adicione categorias para classificar as competições da organização.
                </p>
              </div>
            ) : (
              categories.map((cat) => {
                const isDragging = draggingId === cat.id;
                return (
                  <div
                    key={cat.id}
                    draggable={editingId !== cat.id}
                    onDragStart={() => setDraggingId(cat.id)}
                    onDragEnd={() => setDraggingId(null)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggingId) reorderCategories(draggingId, cat.id);
                      setDraggingId(null);
                    }}
                    className={`${styles.athleteListRow} ${isDragging ? styles.hubListRowSelected : ""}`}
                  >
                    <div className={styles.athleteListRowInner}>
                      {editingId === cat.id ? (
                        <div className={styles.hubEditInline}>
                          <input
                            type="text"
                            value={editingLabel}
                            onChange={(e) => setEditingLabel(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void handleEdit(cat.id);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            className={styles.hubEditInlineInput}
                            autoFocus
                          />
                          <button type="button" onClick={() => void handleEdit(cat.id)} className={styles.hubIconActionBtn}>
                            <Check size={14} strokeWidth={2.5} />
                          </button>
                          <button type="button" onClick={() => setEditingId(null)} className={styles.hubIconActionBtn}>
                            <X size={14} strokeWidth={2.5} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className={styles.athleteListRowLink}>
                            <span className={styles.hubDragHandle} title="Arrastar para reordenar">
                              <GripVertical size={16} strokeWidth={2} />
                            </span>
                            <span className={styles.hubOrderBadge}>{cat.display_order}</span>
                            <div className={styles.athleteListDetails}>
                              <p className={styles.athleteListNickname}>{cat.label.toUpperCase()}</p>
                            </div>
                          </div>
                          <div className={styles.hubRowActionsHover}>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(cat.id);
                                setEditingLabel(cat.label);
                              }}
                              className={styles.hubIconActionBtn}
                              aria-label="Editar categoria"
                            >
                              <Pencil size={14} strokeWidth={2} />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDelete(cat.id)}
                              disabled={deletingId === cat.id}
                              className={`${styles.hubIconActionBtn} ${styles.hubIconActionBtnDanger}`}
                              aria-label="Remover categoria"
                            >
                              <Trash2 size={14} strokeWidth={2} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
