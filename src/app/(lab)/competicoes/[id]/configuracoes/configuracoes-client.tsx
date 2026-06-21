"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "@/app/(lab)/components/toast";
import {
  editarCompeticao,
  criarEdicaoNaConfiguracao,
  editarEdicaoNaConfiguracao,
  deletarEdicao,
  atualizarOrdemEdicoesAction,
  desativarCompeticao,
  reativarCompeticao,
  excluirCompeticao,
} from "../../actions";
import { Plus, Trash2, X, Pencil, GripVertical } from "lucide-react";
import { LabSelect } from "@/app/(lab)/components/lab-select";
import { LabSwitch } from "@/app/(lab)/components/lab-switch";
import { GenderSwitch, normalizePersonGender } from "@/app/(lab)/components/gender-switch";
import { ImageCropUpload } from "@/app/(lab)/components/image-crop-upload";
import { EntityHubShell } from "@/app/(lab)/components/entity-hub-shell";
import {
  modalCloseButtonStyle,
  modalHeaderDividerStyle,
  modalOverlayStyle,
  modalPanelStyle,
  secondaryButtonStyle,
} from "@/lib/lab-ui-styles";
import styles from "@/app/(lab)/components/entity-hub.module.css";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Competition = {
  id: string; full_name: string; short_name: string | null; gender: string;
  logo_url: string | null; primary_color: string | null; pinned_in_sidebar: boolean;
  category_id: string | null; division_above_ids: string | null;
  division_below_ids: string | null; division_same_ids: string | null;
  home_priority: number | null;
  is_active?: boolean | null;
};

type OtherCompetition = { id: string; full_name: string; short_name: string | null; logo_url: string | null };
type GlobalCategory = { id: string; label: string; display_order: number };
type Edition = {
  id: string; status: string; season_id: string;
  custom_name: string | null; is_current: boolean;
  season_name: string; year_value: number;
  start_date: string | null; end_date: string | null;
  display_order: number;
  is_hidden: boolean;
};
type Season = { id: string; name: string; year_value: number };

type DeleteCheck = { canDelete: boolean; reasons: string[] };

type Props = {
  competition: Competition;
  allCompetitions: OtherCompetition[];
  globalCategories: GlobalCategory[];
  editions: Edition[];
  seasons: Season[];
  deleteCheck: DeleteCheck;
  genderLocked: boolean;
  supportsLifecycle: boolean;
};

type EditionFormData = {
  seasonId: string;
  customName: string;
  status: string;
  isCurrent: boolean;
  startDate: string;
  endDate: string;
  isHidden: boolean;
};

// ─── Estilos compartilhados ───────────────────────────────────────────────────

const fieldLabel: React.CSSProperties = {
  fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800,
  letterSpacing: "0.12em", textTransform: "uppercase",
  color: "var(--color-icon-muted)", display: "block", marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 9,
  border: "1px solid var(--color-input-border)",
  backgroundColor: "var(--color-input-bg)",
  color: "var(--color-text-primary)",
  fontFamily: "var(--font-mono)", fontSize: 12,
  outline: "none", boxSizing: "border-box",
  transition: "border-color 0.12s",
};

const cardStyle: React.CSSProperties = {
  borderRadius: 16,
  border: "1px solid var(--color-divider-strong)",
  backgroundColor: "var(--color-hover-bg-subtle)",
  padding: 20,
};

function focusBrand(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = "var(--color-brand)";
}

function blurBrand(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = "var(--color-input-border)";
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--color-brand)" }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, rgba(191,242,5,0.25), transparent)" }} />
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((id): id is string => typeof id === "string" && id.length > 0);
  } catch {
    // legado: UUIDs separados por vírgula
  }
  return raw.split(",").map(s => s.trim()).filter(Boolean);
}

function idsToJson(ids: string[]): string {
  return JSON.stringify(ids);
}

function toDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  return value.includes("T") ? value.slice(0, 10) : value;
}

type DivLinkType = "above" | "below" | "same";

const DIV_LEVEL_LABEL: Record<DivLinkType, string> = {
  above: "Acima",
  same: "Mesmo nível",
  below: "Abaixo",
};

function CompetitionAvatar({ comp }: { comp: OtherCompetition }) {
  const label = comp.short_name ?? comp.full_name;
  return (
    <div style={{
      width: 32, height: 32, borderRadius: 8, overflow: "hidden", flexShrink: 0,
      border: "1px solid var(--color-input-border)",
      backgroundColor: "var(--color-input-bg)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {comp.logo_url ? (
        <img src={comp.logo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      ) : (
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: "var(--color-text-muted)" }}>
          {label.slice(0, 2).toUpperCase()}
        </span>
      )}
    </div>
  );
}

function DivisionLinkSection({
  label,
  desc,
  linkedIds,
  allCompetitions,
  onEdit,
  onRemove,
}: {
  label: string;
  desc: string;
  linkedIds: string[];
  allCompetitions: OtherCompetition[];
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const compById = new Map(allCompetitions.map(c => [c.id, c]));

  return (
    <div style={cardStyle}>
      <SectionHeader label={label} />
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-text-faint)", marginBottom: 14, marginTop: -8 }}>{desc}</p>

      {linkedIds.length === 0 ? (
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-text-hint)", margin: 0 }}>
          Nenhuma competição vinculada.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {linkedIds.map(id => {
            const comp = compById.get(id);
            const displayName = comp?.short_name ?? comp?.full_name ?? id.slice(0, 8);
            return (
              <div key={id} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 10px", borderRadius: 10,
                border: "1px solid var(--color-divider-strong)",
                backgroundColor: "var(--color-hover-bg-subtle)",
              }}>
                {comp ? <CompetitionAvatar comp={comp} /> : (
                  <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "var(--color-input-bg)", flexShrink: 0 }} />
                )}
                <span style={{ flex: 1, minWidth: 0, fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {displayName}
                </span>
                <button type="button" onClick={() => onEdit(id)} title="Alterar nível" style={{
                  padding: 6, borderRadius: 8, cursor: "pointer", flexShrink: 0,
                  border: "1px solid var(--color-input-border)", backgroundColor: "transparent",
                  color: "var(--color-text-muted)",
                }}>
                  <Pencil size={13} />
                </button>
                <button type="button" onClick={() => onRemove(id)} title="Remover vínculo" style={{
                  padding: 6, borderRadius: 8, cursor: "pointer", flexShrink: 0,
                  border: "1px solid var(--color-input-border)", backgroundColor: "transparent",
                  color: "var(--color-text-muted)",
                }}>
                  <X size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DivisionLinkModal({
  open,
  mode,
  allCompetitions,
  allLinkedIds,
  editFromType,
  initialSelectedId,
  onClose,
  onConfirm,
}: {
  open: boolean;
  mode: "add" | "edit";
  allCompetitions: OtherCompetition[];
  allLinkedIds: Set<string>;
  editFromType: DivLinkType | null;
  initialSelectedId: string | null;
  onClose: () => void;
  onConfirm: (compId: string, level: DivLinkType) => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [level, setLevel] = useState<DivLinkType | null>(editFromType);

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setSelectedId(initialSelectedId);
    setLevel(editFromType);
  }, [open, initialSelectedId, editFromType]);

  if (!open) return null;

  const q = search.toLowerCase();
  const available = allCompetitions.filter(c => {
    const matchesSearch = !q || c.full_name.toLowerCase().includes(q) || (c.short_name ?? "").toLowerCase().includes(q);
    if (!matchesSearch) return false;
    if (mode === "edit" && c.id === initialSelectedId) return true;
    return !allLinkedIds.has(c.id);
  });

  const selectedComp = allCompetitions.find(c => c.id === selectedId);

  function handleConfirm() {
    if (!selectedId || !level) return;
    onConfirm(selectedId, level);
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        backgroundColor: "rgba(0,0,0,0.75)",
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          width: "100%", maxWidth: 480, borderRadius: 16,
          border: "1px solid var(--color-input-border)",
          backgroundColor: "var(--color-modal-bg)", overflow: "hidden",
          boxShadow: "var(--color-modal-shadow)",
          maxHeight: "85vh", display: "flex", flexDirection: "column",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          padding: "14px 18px", borderBottom: "1px solid var(--color-divider-strong)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          backgroundColor: "rgba(191,242,5,0.03)", flexShrink: 0,
        }}>
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--color-brand)", margin: 0 }}>
              {mode === "add" ? "Vincular competição" : "Alterar nível"}
            </p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-faint)", margin: 0, marginTop: 2 }}>
              Busque e selecione o nível hierárquico
            </p>
          </div>
          <button type="button" onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 8,
            border: "1px solid var(--color-input-border-strong)", backgroundColor: "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "var(--color-icon-muted)",
          }}>
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12, overflow: "hidden", flex: 1 }}>
          {mode === "add" && (
            <>
              <div>
                <span style={fieldLabel}>Buscar</span>
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Nome da competição…"
                  style={inputStyle}
                  onFocus={focusBrand}
                  onBlur={blurBrand}
                  autoFocus
                />
              </div>
              <div style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 4, minHeight: 120, maxHeight: 240 }}>
                {available.length === 0 ? (
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-text-faint)", margin: 0, padding: "12px 0" }}>
                    Nenhuma competição disponível.
                  </p>
                ) : available.map(c => (
                  <button key={c.id} type="button" onClick={() => setSelectedId(c.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, width: "100%",
                      padding: "9px 10px", borderRadius: 10, cursor: "pointer", textAlign: "left",
                      border: `1px solid ${selectedId === c.id ? "var(--color-brand-border)" : "var(--color-divider-strong)"}`,
                      backgroundColor: selectedId === c.id ? "var(--color-brand-selected-bg)" : "transparent",
                    }}
                    onMouseEnter={e => { if (selectedId !== c.id) e.currentTarget.style.backgroundColor = "var(--color-hover-bg)"; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = selectedId === c.id ? "var(--color-brand-selected-bg)" : "transparent"; }}
                  >
                    <CompetitionAvatar comp={c} />
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: "var(--color-text-primary)" }}>
                      {c.short_name ?? c.full_name}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}

          {mode === "edit" && selectedComp && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10,
              border: "1px solid var(--color-divider-strong)", backgroundColor: "var(--color-hover-bg-subtle)",
            }}>
              <CompetitionAvatar comp={selectedComp} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: "var(--color-text-primary)" }}>
                {selectedComp.short_name ?? selectedComp.full_name}
              </span>
            </div>
          )}

          {(selectedId || mode === "edit") && (
            <div>
              <span style={fieldLabel}>Nível hierárquico</span>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(["above", "same", "below"] as DivLinkType[]).map(lvl => (
                  <button key={lvl} type="button" onClick={() => setLevel(lvl)}
                    style={{
                      padding: "8px 14px", borderRadius: 9, cursor: "pointer",
                      border: `1px solid ${level === lvl ? "var(--color-brand-border)" : "var(--color-input-border)"}`,
                      backgroundColor: level === lvl ? "rgba(191,242,5,0.12)" : "transparent",
                      color: level === lvl ? "var(--color-brand)" : "var(--color-icon-muted)",
                      fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: level === lvl ? 800 : 500,
                      letterSpacing: "0.06em", textTransform: "uppercase",
                    }}>
                    {DIV_LEVEL_LABEL[lvl]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, padding: "12px 18px", borderTop: "1px solid var(--color-hover-bg)", flexShrink: 0 }}>
          <button type="button" onClick={onClose} style={{
            flex: 1, padding: 10, borderRadius: 9,
            border: "1px solid var(--color-input-border-strong)", backgroundColor: "transparent",
            color: "var(--color-icon-muted)",
            fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
            letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer",
          }}>
            Cancelar
          </button>
          <button type="button" onClick={handleConfirm} disabled={!selectedId || !level} style={{
            flex: 2, padding: 10, borderRadius: 9, border: "none",
            backgroundColor: !selectedId || !level ? "var(--color-brand-muted-bg)" : "var(--color-brand)",
            color: "var(--color-on-brand)", cursor: !selectedId || !level ? "not-allowed" : "pointer",
            fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800,
            letterSpacing: "0.08em", textTransform: "uppercase",
          }}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

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
  planned: "var(--color-text-secondary)", ongoing: "var(--color-brand)", closed: "#555",
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
  onSave: (data: EditionFormData) => Promise<void>;
}) {
  const availableSeasons = mode === "create"
    ? seasons.filter((s) => !usedSeasonIds.has(s.id))
    : seasons;

  const [seasonId, setSeasonId] = useState(
    mode === "edit" ? (initial?.season_id ?? "") : (availableSeasons[0]?.id ?? ""),
  );
  const [customName, setCustomName] = useState(initial?.custom_name ?? "");
  const [status, setStatus] = useState(initial?.status ?? "planned");
  const [isCurrent, setIsCurrent] = useState(initial?.is_current ?? false);
  const [isHidden, setIsHidden] = useState(initial?.is_hidden ?? false);
  const [startDate, setStartDate] = useState(toDateInputValue(initial?.start_date));
  const [endDate, setEndDate] = useState(toDateInputValue(initial?.end_date));
  const [saving, setSaving] = useState(false);

  const selectedSeason = seasons.find((s) => s.id === seasonId);
  const displayName = customName.trim()
    || (selectedSeason ? `${selectedSeason.name}${selectedSeason.year_value ? ` ${selectedSeason.year_value}` : ""}` : "");

  async function handleSubmit() {
    setSaving(true);
    await onSave({ seasonId, customName, status, isCurrent, startDate, endDate, isHidden });
    setSaving(false);
  }

  const canSubmit = !(mode === "create" && availableSeasons.length === 0);

  return (
    <div style={{ ...modalOverlayStyle, zIndex: 200 }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        role="dialog"
        aria-modal="true"
        style={{ ...modalPanelStyle, maxWidth: 480, maxHeight: "92vh", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          padding: "16px 20px",
          ...modalHeaderDividerStyle,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div>
            <p style={{
              fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 800,
              letterSpacing: "0.1em", textTransform: "uppercase",
              color: "var(--color-text-primary)", margin: 0,
            }}>
              {mode === "create" ? "Nova edição" : "Editar edição"}
            </p>
            <p className={styles.hubRowMetaPrimary} style={{ margin: "4px 0 0" }}>
              {mode === "create" ? "Vincule uma temporada a esta competição" : "Atualize os dados da edição"}
            </p>
          </div>
          <button type="button" onClick={onClose} style={{ ...modalCloseButtonStyle, cursor: "pointer" }}>
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1 }}>
          <div className={styles.fieldStack}>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Temporada</span>
              {mode === "create" && availableSeasons.length === 0 ? (
                <p className={styles.fieldHint} style={{ margin: 0 }}>
                  Todas as temporadas já têm edição criada.
                </p>
              ) : (
                <LabSelect
                  value={seasonId}
                  onChange={setSeasonId}
                  disabled={mode === "edit"}
                  menuSans
                  triggerSans
                  options={(mode === "create" ? availableSeasons : seasons).map((s) => ({
                    value: s.id,
                    label: `${s.name}${s.year_value ? ` — ${String(s.year_value)}` : ""}`,
                  }))}
                />
              )}
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="edicao-custom-name">
                Nome da edição
                <span style={{ fontWeight: 400, letterSpacing: "0.04em", color: "var(--hub-body-subtle)", marginLeft: 6 }}>
                  (opcional)
                </span>
              </label>
              <input
                id="edicao-custom-name"
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder={selectedSeason ? `${selectedSeason.name}${selectedSeason.year_value ? ` ${selectedSeason.year_value}` : ""}` : "Ex: 2026 I"}
                className={styles.input}
              />
              {displayName && (
                <p className={styles.fieldHint} style={{ margin: "6px 0 0" }}>
                  Será exibido como: <strong>{displayName.toUpperCase()}</strong>
                </p>
              )}
            </div>

            <div className={styles.field}>
              <span className={styles.fieldLabel}>Status</span>
              <LabSelect
                value={status}
                onChange={setStatus}
                menuSans
                triggerSans
                options={EDITION_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              />
            </div>

            <div className={styles.fieldRow2}>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="edicao-start">Data de início</label>
                <input id="edicao-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={styles.input} />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="edicao-end">Data de fim</label>
                <input id="edicao-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={styles.input} />
              </div>
            </div>

            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleTitle}>Edição atual</span>
                <span className={styles.toggleDesc}>
                  Marca esta como a edição em vigor. Apenas uma pode ser a atual por vez.
                </span>
              </div>
              <LabSwitch checked={isCurrent} onChange={setIsCurrent} variant="glass" />
            </div>

            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleTitle}>Visível</span>
                <span className={styles.toggleDesc}>
                  Edições ocultas não aparecem no hub nem no 06.score.
                </span>
              </div>
              <LabSwitch checked={!isHidden} onChange={(v) => setIsHidden(!v)} variant="glass" />
            </div>
          </div>
        </div>

        <div style={{
          display: "flex",
          gap: 8,
          padding: "12px 20px",
          borderTop: "1px solid var(--hub-row-divider)",
          flexShrink: 0,
        }}>
          <button type="button" onClick={onClose} style={{ ...secondaryButtonStyle, flex: 1, cursor: "pointer" }}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving || !canSubmit}
            className={styles.modalPrimaryBtn}
            style={{ flex: 2 }}
          >
            {saving ? (mode === "create" ? "Criando…" : "Salvando…") : (mode === "create" ? "Criar edição" : "Salvar")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ConfiguracoesCompeticaoClient({
  competition, allCompetitions, globalCategories, editions: initialEditions, seasons, deleteCheck,
  genderLocked, supportsLifecycle,
}: Props) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"geral" | "divisoes" | "temporadas">("geral");

  // Geral
  const [fullName, setFullName] = useState(competition.full_name ?? "");
  const [shortName, setShortName] = useState(competition.short_name ?? "");
  const [gender, setGender] = useState<"male" | "female">(() => normalizePersonGender(competition.gender));
  const [pinned, setPinned] = useState(competition.pinned_in_sidebar ?? false);
  const [primaryColor, setPrimaryColor] = useState(competition.primary_color ?? "");
  const [suggestedColors, setSuggestedColors] = useState<string[]>([]);
  const [extractingColors, setExtractingColors] = useState(false);
  const [logoUrl] = useState(competition.logo_url ?? null);
  const [pendingLogo, setPendingLogo] = useState<File | null>(null);
  const [headerLogoUrl, setHeaderLogoUrl] = useState<string | null>(competition.logo_url ?? null);
  const [categoryId, setCategoryId] = useState(competition.category_id ?? "");
  const [homePriority] = useState(competition.home_priority ?? 0);
  const [saving, setSaving] = useState(false);
  const [isActive, setIsActive] = useState(competition.is_active !== false);
  const [togglingActive, setTogglingActive] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [canDelete, setCanDelete] = useState(deleteCheck.canDelete);
  const [deleteReasons, setDeleteReasons] = useState(deleteCheck.reasons);

  useEffect(() => {
    setCanDelete(deleteCheck.canDelete);
    setDeleteReasons(deleteCheck.reasons);
  }, [deleteCheck]);

  // Divisões
  const [aboveIds, setAboveIds] = useState<string[]>(() => parseIds(competition.division_above_ids));
  const [belowIds, setBelowIds] = useState<string[]>(() => parseIds(competition.division_below_ids));
  const [sameIds, setSameIds] = useState<string[]>(() => parseIds(competition.division_same_ids));

  // Edições
  const [editions, setEditions] = useState<Edition[]>(initialEditions);
  const [draggingEditionId, setDraggingEditionId] = useState<string | null>(null);
  const [savingEditionOrder, setSavingEditionOrder] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEdition, setEditingEdition] = useState<Edition | null>(null);
  const [deletingEditionId, setDeletingEditionId] = useState<string | null>(null);

  // Divisões — modal de vínculo
  const [divModalOpen, setDivModalOpen] = useState(false);
  const [divModalMode, setDivModalMode] = useState<"add" | "edit">("add");
  const [divEditFrom, setDivEditFrom] = useState<DivLinkType | null>(null);
  const [divEditId, setDivEditId] = useState<string | null>(null);

  const displayLogo = headerLogoUrl;
  const usedSeasonIds = new Set(editions.map(e => e.season_id));

  useEffect(() => {
    if (!pendingLogo) {
      setHeaderLogoUrl(logoUrl);
      return;
    }
    const url = URL.createObjectURL(pendingLogo);
    setHeaderLogoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingLogo, logoUrl]);

  const sortedEditions = [...editions].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

  async function persistEditionsState(nextEditions: Edition[]) {
    setSavingEditionOrder(true);
    const ordered = [...nextEditions].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
    const updates = ordered.map((ed, idx) => ({
      id: ed.id,
      display_order: idx + 1,
      is_hidden: ed.is_hidden ?? false,
    }));
    const result = await atualizarOrdemEdicoesAction(updates);
    setSavingEditionOrder(false);
    if ("error" in result) {
      toast("error", result.error);
      return false;
    }
    return true;
  }

  function reorderEditions(fromId: string, toId: string) {
    if (fromId === toId) return;
    setEditions(prev => {
      const list = [...prev].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
      const fromIdx = list.findIndex(e => e.id === fromId);
      const toIdx = list.findIndex(e => e.id === toId);
      if (fromIdx < 0 || toIdx < 0) return prev;
      const [moved] = list.splice(fromIdx, 1);
      list.splice(toIdx, 0, moved);
      const updated = list.map((ed, idx) => ({ ...ed, display_order: idx + 1 }));
      void persistEditionsState(updated);
      return updated;
    });
  }

  async function handlePendingLogoChange(file: File | null) {
    setPendingLogo(file);
    if (!file) {
      setSuggestedColors([]);
      return;
    }
    setExtractingColors(true);
    setSuggestedColors([]);
    const colors = await extractDominantColors(file);
    setSuggestedColors(colors);
    setExtractingColors(false);
    if (colors.length > 0 && !primaryColor) setPrimaryColor(colors[0]);
  }

  const allLinkedIds = new Set([...aboveIds, ...belowIds, ...sameIds]);

  function removeLink(type: DivLinkType, id: string) {
    if (type === "above") setAboveIds(prev => prev.filter(i => i !== id));
    if (type === "below") setBelowIds(prev => prev.filter(i => i !== id));
    if (type === "same") setSameIds(prev => prev.filter(i => i !== id));
  }

  function getLinkType(id: string): DivLinkType | null {
    if (aboveIds.includes(id)) return "above";
    if (sameIds.includes(id)) return "same";
    if (belowIds.includes(id)) return "below";
    return null;
  }

  function openDivAddModal() {
    setDivModalMode("add");
    setDivEditFrom(null);
    setDivEditId(null);
    setDivModalOpen(true);
  }

  function openDivEditModal(id: string) {
    const from = getLinkType(id);
    if (!from) return;
    setDivModalMode("edit");
    setDivEditFrom(from);
    setDivEditId(id);
    setDivModalOpen(true);
  }

  function setLinkLevel(level: DivLinkType, id: string) {
    setAboveIds(prev => prev.filter(i => i !== id));
    setSameIds(prev => prev.filter(i => i !== id));
    setBelowIds(prev => prev.filter(i => i !== id));
    if (level === "above") setAboveIds(prev => [...prev, id]);
    if (level === "same") setSameIds(prev => [...prev, id]);
    if (level === "below") setBelowIds(prev => [...prev, id]);
  }

  function confirmDivLink(compId: string, level: DivLinkType) {
    setLinkLevel(level, compId);
    setDivModalOpen(false);
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
    fd.append("division_above_ids", idsToJson(aboveIds));
    fd.append("division_below_ids", idsToJson(belowIds));
    fd.append("division_same_ids", idsToJson(sameIds));
    fd.append("home_priority", String(homePriority));
    if (pendingLogo) fd.append("logo", pendingLogo);
    const result = await editarCompeticao(competition.id, fd);
    setSaving(false);
    if ("error" in result) { toast("error", result.error); return; }
    toast("success", "Competição salva.");
    setPendingLogo(null);
    router.refresh();
  }

  async function handleCreateEdition(data: EditionFormData) {
    const result = await criarEdicaoNaConfiguracao(
      competition.id, data.seasonId, data.customName, data.isCurrent, data.startDate, data.endDate, data.isHidden,
    );
    if ("error" in result) { toast("error", result.error); return; }
    const season = seasons.find(s => s.id === data.seasonId);
    const newEd: Edition = {
      id: result.id, status: data.status, season_id: data.seasonId,
      custom_name: data.customName.trim() || null, is_current: data.isCurrent,
      start_date: data.startDate.trim() || null, end_date: data.endDate.trim() || null,
      season_name: season?.name ?? "—", year_value: season?.year_value ?? 0,
      display_order: editions.length + 1,
      is_hidden: data.isHidden,
    };
    setEditions(prev => {
      const updated = data.isCurrent ? prev.map(e => ({ ...e, is_current: false })) : prev;
      return [...updated, newEd];
    });
    setShowCreateModal(false);
    toast("success", "Edição criada.");
  }

  async function handleEditEdition(data: EditionFormData) {
    if (!editingEdition) return;
    const result = await editarEdicaoNaConfiguracao(
      editingEdition.id, competition.id, data.status, data.customName, data.isCurrent, data.startDate, data.endDate, data.isHidden,
    );
    if ("error" in result) { toast("error", result.error); return; }
    setEditions(prev => prev.map(e => {
      if (e.id === editingEdition.id) return {
        ...e, status: data.status, custom_name: data.customName.trim() || null, is_current: data.isCurrent,
        start_date: data.startDate.trim() || null, end_date: data.endDate.trim() || null,
        is_hidden: data.isHidden,
      };
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
    router.refresh();
  }

  async function handleToggleActive(next: boolean) {
    setTogglingActive(true);
    const result = next
      ? await reativarCompeticao(competition.id)
      : await desativarCompeticao(competition.id);
    setTogglingActive(false);
    if ("error" in result) {
      toast("error", result.error);
      return;
    }
    setIsActive(next);
    if (!next) {
      setPinned(false);
      setCanDelete(false);
      setDeleteReasons((prev) => {
        if (prev.some((r) => r.includes("desative"))) return prev;
        return ["desative a competição antes de excluir", ...prev];
      });
    } else {
      const nextReasons = deleteReasons.filter((r) => !r.includes("desative"));
      setDeleteReasons(nextReasons);
      setCanDelete(nextReasons.length === 0);
    }
    toast("success", next ? "Competição reativada." : "Competição desativada.");
    router.refresh();
  }

  async function handleDeleteCompetition() {
    if (!confirm("Tem certeza? Esta ação é irreversível e remove a competição permanentemente.")) return;
    setDeleting(true);
    const result = await excluirCompeticao(competition.id);
    setDeleting(false);
    if ("error" in result) {
      toast("error", result.error);
      return;
    }
    toast("success", "Competição excluída.");
    router.push("/competicoes");
  }

  const tabs = [
    { key: "geral" as const, label: "GERAL" },
    { key: "temporadas" as const, label: "EDIÇÕES" },
    { key: "divisoes" as const, label: "DIVISÕES" },
  ];

  const genderLabel = gender === "female" ? "Feminino" : "Masculino";
  const titleLabel = (shortName || fullName || "Competição").toUpperCase();
  const logoFallback = titleLabel.slice(0, 2);

  return (
    <>
      <EntityHubShell
        hubClassName={`${styles.adminHub} ${styles.hubListPage} ${styles.competicaoConfigHub}`}
        contentClassName={styles.hallMain}
        breadcrumb={[
          { label: "Competições", href: "/competicoes" },
          { label: competition.full_name ?? "Competição", href: `/competicoes/${competition.id}` },
          { label: "Configurações" },
        ]}
        avatar={(
          <div className={styles.logoSlot}>
            {displayLogo ? (
              <img src={displayLogo} alt="" className={styles.logoImg} />
            ) : (
              <span className={styles.logoInitials}>{logoFallback}</span>
            )}
          </div>
        )}
        title={titleLabel}
        subtitle={`${genderLabel} · Configurações`}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(key) => setActiveTab(key as "geral" | "divisoes" | "temporadas")}
        showSave={activeTab === "geral" || activeTab === "divisoes"}
        saveFormId="comp-config-form"
        saving={saving}
        saveLabel="Salvar alterações"
      >
        <form
          id="comp-config-form"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSave();
          }}
          style={{ display: "none" }}
          aria-hidden
        />

        {activeTab === "geral" && (
          <div className={styles.contentWide}>
            <div className={styles.listPanel}>
              <div className={styles.listPanelHeader}>
                <div className={styles.listPanelTitle}>
                  <span className={styles.listPanelName}>Competição</span>
                </div>
              </div>
              <div className={`${styles.hubPanelBody} ${styles.fieldStack}`}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
                  <ImageCropUpload
                    value={pendingLogo}
                    onChange={handlePendingLogoChange}
                    existingUrl={logoUrl}
                    label=""
                    placeholder="Enviar logo"
                    aspect={1}
                    accept="image/png,image/webp,image/jpeg"
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="comp-primary-color">Cor principal</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                      border: `2px solid ${primaryColor || "var(--hub-glass-border)"}`,
                      backgroundColor: primaryColor || "var(--hub-input-bg)",
                    }} />
                    <input
                      id="comp-primary-color"
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      onBlur={(e) => {
                        let v = e.target.value.trim();
                        if (v && !v.startsWith("#")) v = `#${v}`;
                        setPrimaryColor(v);
                      }}
                      placeholder="#RRGGBB"
                      maxLength={7}
                      className={styles.input}
                    />
                    <input
                      type="color"
                      value={primaryColor && /^#[0-9a-fA-F]{6}$/.test(primaryColor) ? primaryColor : "#000000"}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      style={{ width: 36, height: 36, flexShrink: 0, cursor: "pointer", borderRadius: 9, border: "1px solid var(--hub-glass-border)", padding: 2, background: "transparent" }}
                      aria-label="Seletor de cor"
                    />
                    {primaryColor && (
                      <button
                        type="button"
                        onClick={() => { setPrimaryColor(""); setSuggestedColors([]); }}
                        className={styles.hubIconActionBtn}
                        aria-label="Limpar cor"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {extractingColors && (
                  <p className={styles.fieldHint}>Analisando cores da logo…</p>
                )}
                {suggestedColors.length > 0 && (
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Cores detectadas</span>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {suggestedColors.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setPrimaryColor(c)}
                          title={c}
                          style={{
                            width: 32, height: 32, borderRadius: 8, border: "none", cursor: "pointer",
                            backgroundColor: c,
                            boxShadow: primaryColor === c
                              ? "0 0 0 2px var(--color-brand), 0 0 0 4px var(--color-modal-bg)"
                              : "0 0 0 1px var(--hub-glass-border)",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="comp-full-name">Nome completo</label>
                  <input
                    id="comp-full-name"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={styles.input}
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="comp-short-name">Nome curto</label>
                  <input
                    id="comp-short-name"
                    type="text"
                    value={shortName}
                    onChange={(e) => setShortName(e.target.value)}
                    className={styles.input}
                  />
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Gênero</span>
                  <GenderSwitch
                    value={gender}
                    onChange={setGender}
                    disabled={genderLocked}
                    hint={genderLocked ? "Não é possível alterar após criar edições nesta competição." : undefined}
                  />
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Categoria</span>
                  <LabSelect
                    value={categoryId}
                    onChange={setCategoryId}
                    placeholder="Sem categoria"
                    menuSans
                    triggerSans
                    options={globalCategories.map((cat) => ({ value: cat.id, label: cat.label }))}
                  />
                </div>
                {globalCategories.length === 0 && (
                  <p className={styles.fieldHint}>Nenhuma categoria cadastrada. Crie em Organização › Gestão.</p>
                )}

                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleTitle}>Fixar na sidebar</span>
                    <span className={styles.toggleDesc}>Exibe atalho fixo no menu lateral</span>
                  </div>
                  <LabSwitch
                    checked={pinned}
                    onChange={setPinned}
                    disabled={!isActive}
                    variant="glass"
                  />
                </div>

                {supportsLifecycle && (
                  <div className={styles.toggleRow}>
                    <div>
                      <span className={styles.toggleTitle}>Competição ativa</span>
                      <span className={styles.toggleDesc}>
                        Competições inativas somem da listagem e não aparecem no hub público
                      </span>
                    </div>
                    <LabSwitch
                      checked={isActive}
                      onChange={(v) => void handleToggleActive(v)}
                      disabled={togglingActive}
                      variant="glass"
                    />
                  </div>
                )}
              </div>
            </div>

            {supportsLifecycle && (
              <div className={styles.dangerZone}>
                <p className={styles.dangerTitle}>Zona de perigo</p>
                {canDelete ? (
                  <button
                    type="button"
                    onClick={() => void handleDeleteCompetition()}
                    disabled={deleting}
                    className={styles.dangerBtn}
                  >
                    {deleting ? "Excluindo…" : "Excluir competição"}
                  </button>
                ) : (
                  <p className={styles.dangerDesc}>
                    Exclusão indisponível{deleteReasons.length > 0 ? `: ${deleteReasons.join(", ")}.` : "."}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "divisoes" && (
          <div className={styles.contentWide}>
            <div className={styles.listPanel}>
              <div className={styles.listPanelHeader}>
                <div className={styles.listPanelTitle}>
                  <span className={styles.listPanelName}>Vínculos de divisão</span>
                </div>
                <button type="button" onClick={openDivAddModal} className={styles.saveBtn}>
                  <Plus size={14} />
                  Adicionar
                </button>
              </div>
              <div className={`${styles.hubPanelBody} ${styles.fieldStack}`}>
                <DivisionLinkSection
                  label="Acima"
                  desc="Competições de nível superior"
                  linkedIds={aboveIds}
                  allCompetitions={allCompetitions}
                  onEdit={openDivEditModal}
                  onRemove={(id) => removeLink("above", id)}
                />
                <DivisionLinkSection
                  label="Mesmo nível"
                  desc="Competições paralelas"
                  linkedIds={sameIds}
                  allCompetitions={allCompetitions}
                  onEdit={openDivEditModal}
                  onRemove={(id) => removeLink("same", id)}
                />
                <DivisionLinkSection
                  label="Abaixo"
                  desc="Competições de nível inferior"
                  linkedIds={belowIds}
                  allCompetitions={allCompetitions}
                  onEdit={openDivEditModal}
                  onRemove={(id) => removeLink("below", id)}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === "temporadas" && (
          <div className={`${styles.contentWide} ${styles.personListHub}`}>
            <div className={styles.editionConfigToolbar}>
              <h3 className={styles.editionConfigToolbarTitle}>
                Edições
                <span className={styles.editionConfigCount}>{sortedEditions.length}</span>
              </h3>
              <button type="button" onClick={() => setShowCreateModal(true)} className={styles.saveBtn}>
                <Plus size={14} />
                Nova edição
              </button>
            </div>

            <p className={styles.fieldHint} style={{ margin: "0 0 16px" }}>
              Arraste para reordenar. Edições ocultas não aparecem no hub nem no 06.score.
              {savingEditionOrder && <span style={{ marginLeft: 8, color: "var(--color-brand)" }}>Salvando…</span>}
            </p>

            <div className={styles.hubListBare}>
              {sortedEditions.length === 0 && (
                <div className={styles.listPanelEmpty}>
                  <p className={styles.listPanelEmptyTitle}>Nenhuma edição</p>
                  <p className={styles.listPanelEmptyDesc}>Crie a primeira edição desta competição.</p>
                </div>
              )}
              {sortedEditions.map((ed) => {
                const edDisplayName = (ed.custom_name ?? (`${ed.season_name}${ed.year_value ? ` ${ed.year_value}` : ""}`)).toUpperCase();
                const isDragging = draggingEditionId === ed.id;
                const statusLabel = EDITION_STATUS_OPTIONS.find((o) => o.value === ed.status)?.label ?? ed.status;
                return (
                  <div
                    key={ed.id}
                    className={`${styles.athleteListRow} ${isDragging ? styles.hubListRowSelected : ""}`}
                    style={{ opacity: ed.is_hidden ? 0.55 : 1 }}
                    draggable
                    onDragStart={() => setDraggingEditionId(ed.id)}
                    onDragEnd={() => setDraggingEditionId(null)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggingEditionId) reorderEditions(draggingEditionId, ed.id);
                      setDraggingEditionId(null);
                    }}
                  >
                    <div className={styles.athleteListRowInner}>
                      <span className={styles.hubDragHandle} title="Arrastar para reordenar">
                        <GripVertical size={16} strokeWidth={2} />
                      </span>
                      <Link
                        href={`/competicoes/${competition.id}?edicao=${ed.id}`}
                        className={styles.athleteListRowLink}
                      >
                        <div className={styles.athleteListDetails}>
                          <p className={styles.editionConfigRowTitle}>{edDisplayName}</p>
                          <div className={styles.hubChipRow} style={{ marginTop: 6 }}>
                            {ed.is_current && (
                              <span className={`${styles.hubChip} ${styles.hubChipBrand}`}>ATUAL</span>
                            )}
                            {ed.is_hidden && <span className={styles.hubChip}>OCULTA</span>}
                            <span className={ed.status === "ongoing" ? `${styles.hubChip} ${styles.hubChipBrand}` : styles.hubChip}>
                              {statusLabel}
                            </span>
                            {ed.year_value > 0 && <span className={styles.hubChip}>{ed.year_value}</span>}
                          </div>
                        </div>
                      </Link>
                      <div className={styles.hubRowActionsHover}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setEditingEdition(ed);
                          }}
                          className={styles.hubIconActionBtn}
                          aria-label="Editar edição"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            void handleDeleteEdition(ed.id);
                          }}
                          disabled={deletingEditionId === ed.id}
                          className={`${styles.rowActionBtn} ${styles.rowActionBtnDanger}`}
                          aria-label="Excluir edição"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </EntityHubShell>

      {divModalOpen && (
        <DivisionLinkModal
          open={divModalOpen}
          mode={divModalMode}
          allCompetitions={allCompetitions}
          allLinkedIds={allLinkedIds}
          editFromType={divEditFrom}
          initialSelectedId={divEditId}
          onClose={() => setDivModalOpen(false)}
          onConfirm={confirmDivLink}
        />
      )}

      {showCreateModal && (
        <EdicaoModal
          mode="create"
          seasons={seasons}
          usedSeasonIds={usedSeasonIds}
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreateEdition}
        />
      )}

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

    </>
  );
}
