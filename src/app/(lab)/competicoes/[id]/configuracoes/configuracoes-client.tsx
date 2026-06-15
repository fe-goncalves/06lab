"use client";

import { useState, useEffect } from "react";
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
import { LabSelect } from "@/app/(lab)/components/lab-select";
import { ImageCropUpload } from "@/app/(lab)/components/image-crop-upload";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Competition = {
  id: string; full_name: string; short_name: string | null; gender: string;
  logo_url: string | null; primary_color: string | null; pinned_in_sidebar: boolean;
  category_id: string | null; division_above_ids: string | null;
  division_below_ids: string | null; division_same_ids: string | null;
  home_priority: number | null;
};

type OtherCompetition = { id: string; full_name: string; short_name: string | null; logo_url: string | null };
type GlobalCategory = { id: string; label: string; display_order: number };
type Edition = {
  id: string; status: string; season_id: string;
  custom_name: string | null; is_current: boolean;
  season_name: string; year_value: number;
  start_date: string | null; end_date: string | null;
};
type Season = { id: string; name: string; year_value: number };

type Props = {
  competition: Competition;
  allCompetitions: OtherCompetition[];
  globalCategories: GlobalCategory[];
  editions: Edition[];
  seasons: Season[];
};

// ─── Estilos compartilhados ───────────────────────────────────────────────────

const fieldLabel: React.CSSProperties = {
  fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800,
  letterSpacing: "0.12em", textTransform: "uppercase",
  color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 9,
  border: "1px solid rgba(255,255,255,0.08)",
  backgroundColor: "rgba(255,255,255,0.04)",
  color: "var(--color-text-primary)",
  fontFamily: "var(--font-mono)", fontSize: 12,
  outline: "none", boxSizing: "border-box",
  transition: "border-color 0.12s",
};

const cardStyle: React.CSSProperties = {
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.06)",
  backgroundColor: "rgba(255,255,255,0.03)",
  padding: 20,
};

function focusBrand(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = "#BFF205";
}

function blurBrand(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#BFF205" }}>
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
      border: "1px solid rgba(255,255,255,0.08)",
      backgroundColor: "rgba(255,255,255,0.04)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {comp.logo_url ? (
        <img src={comp.logo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      ) : (
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)" }}>
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
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 14, marginTop: -8 }}>{desc}</p>

      {linkedIds.length === 0 ? (
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.25)", margin: 0 }}>
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
                border: "1px solid rgba(255,255,255,0.06)",
                backgroundColor: "rgba(255,255,255,0.02)",
              }}>
                {comp ? <CompetitionAvatar comp={comp} /> : (
                  <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.04)", flexShrink: 0 }} />
                )}
                <span style={{ flex: 1, minWidth: 0, fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {displayName}
                </span>
                <button type="button" onClick={() => onEdit(id)} title="Alterar nível" style={{
                  padding: 6, borderRadius: 8, cursor: "pointer", flexShrink: 0,
                  border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "transparent",
                  color: "rgba(255,255,255,0.35)",
                }}>
                  <Pencil size={13} />
                </button>
                <button type="button" onClick={() => onRemove(id)} title="Remover vínculo" style={{
                  padding: 6, borderRadius: 8, cursor: "pointer", flexShrink: 0,
                  border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "transparent",
                  color: "rgba(255,255,255,0.35)",
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
        position: "fixed", inset: 0, zIndex: 60,
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
          border: "1px solid rgba(255,255,255,0.08)",
          backgroundColor: "#0e0e0e", overflow: "hidden",
          boxShadow: "0 32px 80px rgba(0,0,0,0.8)",
          maxHeight: "85vh", display: "flex", flexDirection: "column",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.07)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          backgroundColor: "rgba(191,242,5,0.03)", flexShrink: 0,
        }}>
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#BFF205", margin: 0 }}>
              {mode === "add" ? "Vincular competição" : "Alterar nível"}
            </p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.3)", margin: 0, marginTop: 2 }}>
              Busque e selecione o nível hierárquico
            </p>
          </div>
          <button type="button" onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "rgba(255,255,255,0.4)",
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
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.3)", margin: 0, padding: "12px 0" }}>
                    Nenhuma competição disponível.
                  </p>
                ) : available.map(c => (
                  <button key={c.id} type="button" onClick={() => setSelectedId(c.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, width: "100%",
                      padding: "9px 10px", borderRadius: 10, cursor: "pointer", textAlign: "left",
                      border: `1px solid ${selectedId === c.id ? "rgba(191,242,5,0.35)" : "rgba(255,255,255,0.06)"}`,
                      backgroundColor: selectedId === c.id ? "rgba(191,242,5,0.08)" : "transparent",
                    }}
                    onMouseEnter={e => { if (selectedId !== c.id) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)"; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = selectedId === c.id ? "rgba(191,242,5,0.08)" : "transparent"; }}
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
              border: "1px solid rgba(255,255,255,0.06)", backgroundColor: "rgba(255,255,255,0.02)",
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
                      border: `1px solid ${level === lvl ? "rgba(191,242,5,0.4)" : "rgba(255,255,255,0.08)"}`,
                      backgroundColor: level === lvl ? "rgba(191,242,5,0.12)" : "transparent",
                      color: level === lvl ? "#BFF205" : "rgba(255,255,255,0.4)",
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

        <div style={{ display: "flex", gap: 8, padding: "12px 18px", borderTop: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
          <button type="button" onClick={onClose} style={{
            flex: 1, padding: 10, borderRadius: 9,
            border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "transparent",
            color: "rgba(255,255,255,0.4)",
            fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
            letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer",
          }}>
            Cancelar
          </button>
          <button type="button" onClick={handleConfirm} disabled={!selectedId || !level} style={{
            flex: 2, padding: 10, borderRadius: 9, border: "none",
            backgroundColor: !selectedId || !level ? "rgba(191,242,5,0.3)" : "#BFF205",
            color: "#0a0a0a", cursor: !selectedId || !level ? "not-allowed" : "pointer",
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
  onSave: (data: { seasonId: string; customName: string; status: string; isCurrent: boolean; startDate: string; endDate: string }) => Promise<void>;
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
  const [startDate, setStartDate] = useState(toDateInputValue(initial?.start_date));
  const [endDate, setEndDate] = useState(toDateInputValue(initial?.end_date));
  const [saving, setSaving] = useState(false);

  const selectedSeason = seasons.find(s => s.id === seasonId);
  const displayName = customName.trim() || (selectedSeason ? selectedSeason.name + (selectedSeason.year_value ? " " + selectedSeason.year_value : "") : "");

  async function handleSubmit() {
    setSaving(true);
    await onSave({ seasonId, customName, status, isCurrent, startDate, endDate });
    setSaving(false);
  }

  const canSubmit = !(mode === "create" && availableSeasons.length === 0);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        backgroundColor: "rgba(0,0,0,0.75)",
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          width: "100%", maxWidth: 440, borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.08)",
          backgroundColor: "#0e0e0e", overflow: "hidden",
          boxShadow: "0 32px 80px rgba(0,0,0,0.8)",
          maxHeight: "92vh", display: "flex", flexDirection: "column",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.07)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          backgroundColor: "rgba(191,242,5,0.03)", flexShrink: 0,
        }}>
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#BFF205", margin: 0 }}>
              {mode === "create" ? "Nova edição" : "Editar edição"}
            </p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.3)", margin: 0, marginTop: 2 }}>
              {mode === "create" ? "Vincule uma temporada a esta competição" : "Atualize os dados da edição"}
            </p>
          </div>
          <button type="button" onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "rgba(255,255,255,0.4)",
          }}>
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        <div style={{ overflowY: "auto", flex: 1, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <span style={fieldLabel}>Temporada</span>
            {mode === "create" && availableSeasons.length === 0 ? (
              <p style={{ ...inputStyle, color: "#A6A6A6", margin: 0 }}>
                Todas as temporadas já têm edição criada.
              </p>
            ) : (
              <LabSelect
                value={seasonId}
                onChange={setSeasonId}
                disabled={mode === "edit"}
                style={{ opacity: mode === "edit" ? 0.6 : 1 }}
                options={(mode === "create" ? availableSeasons : seasons).map((s) => ({
                  value: s.id,
                  label: `${s.name}${s.year_value ? ` — ${String(s.year_value)}` : ""}`,
                }))}
              />
            )}
          </div>

          <div>
            <span style={fieldLabel}>
              Nome da edição
              <span style={{ fontWeight: 400, letterSpacing: "0.06em", color: "rgba(255,255,255,0.25)", marginLeft: 6 }}>(opcional)</span>
            </span>
            <input
              type="text"
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              placeholder={selectedSeason ? selectedSeason.name + (selectedSeason.year_value ? " " + selectedSeason.year_value : "") : "Ex: 2026 I"}
              style={inputStyle}
              onFocus={focusBrand}
              onBlur={blurBrand}
            />
            {displayName && (
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 6, marginBottom: 0 }}>
                Será exibido como: <strong style={{ color: "var(--color-text-primary)" }}>{displayName}</strong>
              </p>
            )}
          </div>

          <div>
            <span style={fieldLabel}>Status</span>
            <LabSelect value={status} onChange={setStatus}
              options={EDITION_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <span style={fieldLabel}>Data de início</span>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                style={{ ...inputStyle, colorScheme: "dark" as const }}
                onFocus={focusBrand}
                onBlur={blurBrand}
              />
            </div>
            <div>
              <span style={fieldLabel}>Data de fim</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                style={{ ...inputStyle, colorScheme: "dark" as const }}
                onFocus={focusBrand}
                onBlur={blurBrand}
              />
            </div>
          </div>

          <div
            style={{
              display: "flex", alignItems: "flex-start", gap: 12, padding: 12, borderRadius: 10, cursor: "pointer",
              border: `1px solid ${isCurrent ? "rgba(191,242,5,0.4)" : "rgba(255,255,255,0.08)"}`,
              backgroundColor: isCurrent ? "rgba(191,242,5,0.05)" : "transparent",
            }}
            onClick={() => setIsCurrent(v => !v)}
          >
            <div style={{
              marginTop: 2, width: 16, height: 16, flexShrink: 0, borderRadius: 4,
              border: `2px solid ${isCurrent ? "#BFF205" : "rgba(255,255,255,0.15)"}`,
              backgroundColor: isCurrent ? "#BFF205" : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {isCurrent && <span style={{ fontSize: 10, color: "#0a0a0a", fontWeight: 900 }}>✓</span>}
            </div>
            <div>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>Edição atual</p>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 4, marginBottom: 0 }}>
                Marca esta como a edição em vigor desta competição. Apenas uma pode ser a atual por vez.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, padding: "12px 18px", borderTop: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
          <button type="button" onClick={onClose} style={{
            flex: 1, padding: 10, borderRadius: 9,
            border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "transparent",
            color: "rgba(255,255,255,0.4)",
            fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
            letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer",
          }}>
            Cancelar
          </button>
          <button type="button" onClick={handleSubmit} disabled={saving || !canSubmit} style={{
            flex: 2, padding: 10, borderRadius: 9, border: "none",
            backgroundColor: saving || !canSubmit ? "rgba(191,242,5,0.3)" : "#BFF205",
            color: "#0a0a0a",
            fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800,
            letterSpacing: "0.08em", textTransform: "uppercase",
            cursor: saving || !canSubmit ? "not-allowed" : "pointer",
          }}>
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

  const [activeTab, setActiveTab] = useState<"geral" | "temporadas">("geral");

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
  const [headerLogoUrl, setHeaderLogoUrl] = useState<string | null>(competition.logo_url ?? null);
  const [categoryId, setCategoryId] = useState(competition.category_id ?? "");
  const [homePriority, setHomePriority] = useState(competition.home_priority ?? 0);
  const [saving, setSaving] = useState(false);

  // Divisões
  const [aboveIds, setAboveIds] = useState<string[]>(() => parseIds(competition.division_above_ids));
  const [belowIds, setBelowIds] = useState<string[]>(() => parseIds(competition.division_below_ids));
  const [sameIds, setSameIds] = useState<string[]>(() => parseIds(competition.division_same_ids));

  // Edições
  const [editions, setEditions] = useState<Edition[]>(initialEditions);
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

  const sortedEditions = [...editions].sort((a, b) => {
    if (b.year_value !== a.year_value) return b.year_value - a.year_value;
    const nameA = a.custom_name ?? a.season_name;
    const nameB = b.custom_name ?? b.season_name;
    return nameB.localeCompare(nameA);
  });

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

  async function handleCreateEdition(data: { seasonId: string; customName: string; status: string; isCurrent: boolean; startDate: string; endDate: string }) {
    const result = await criarEdicaoNaConfiguracao(competition.id, data.seasonId, data.customName, data.isCurrent, data.startDate, data.endDate);
    if ("error" in result) { toast("error", result.error); return; }
    const season = seasons.find(s => s.id === data.seasonId);
    const newEd: Edition = {
      id: result.id, status: data.status, season_id: data.seasonId,
      custom_name: data.customName.trim() || null, is_current: data.isCurrent,
      start_date: data.startDate.trim() || null, end_date: data.endDate.trim() || null,
      season_name: season?.name ?? "—", year_value: season?.year_value ?? 0,
    };
    setEditions(prev => {
      const updated = data.isCurrent ? prev.map(e => ({ ...e, is_current: false })) : prev;
      return [newEd, ...updated];
    });
    setShowCreateModal(false);
    toast("success", "Edição criada.");
  }

  async function handleEditEdition(data: { seasonId: string; customName: string; status: string; isCurrent: boolean; startDate: string; endDate: string }) {
    if (!editingEdition) return;
    const result = await editarEdicaoNaConfiguracao(editingEdition.id, competition.id, data.status, data.customName, data.isCurrent, data.startDate, data.endDate);
    if ("error" in result) { toast("error", result.error); return; }
    setEditions(prev => prev.map(e => {
      if (e.id === editingEdition.id) return {
        ...e, status: data.status, custom_name: data.customName.trim() || null, is_current: data.isCurrent,
        start_date: data.startDate.trim() || null, end_date: data.endDate.trim() || null,
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
  }

  const tabs = [
    { key: "geral" as const, label: "GERAL" },
    { key: "temporadas" as const, label: "EDIÇÕES" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "#0e0e0e" }}>

      {/* Header */}
      <div style={{ backgroundColor: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ padding: "20px 32px 0" }}>
          <Breadcrumb items={[
            { label: "Competições", href: "/competicoes" },
            { label: competition.full_name ?? "Competição", href: "/competicoes/" + competition.id },
            { label: "Configurações" },
          ]} />

          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 16, marginBottom: 16 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 12, overflow: "hidden",
              border: "2px solid rgba(191,242,5,0.3)",
              backgroundColor: "rgba(255,255,255,0.04)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              {displayLogo ? (
                <img src={displayLogo} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              ) : (
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.3)" }}>
                  {(shortName || fullName).slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 900, color: "var(--color-text-primary)", margin: 0, lineHeight: 1.1 }}>
                {(fullName || "Competição").toUpperCase()}
              </h1>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 3, display: "block" }}>
                {gender === "male" ? "MASCULINO" : "FEMININO"} · CONFIGURAÇÕES
              </span>
            </div>

            {activeTab === "geral" && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !fullName.trim()}
                style={{
                  padding: "9px 18px", borderRadius: 9, border: "none", flexShrink: 0,
                  backgroundColor: saving || !fullName.trim() ? "rgba(191,242,5,0.3)" : "#BFF205",
                  color: "#0a0a0a",
                  fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  cursor: saving || !fullName.trim() ? "not-allowed" : "pointer",
                  transition: "all 0.12s",
                }}
              >
                {saving ? "Salvando…" : "Salvar alterações"}
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: 24 }}>
            {tabs.map(tab => (
              <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: "0 0 12px", border: "none", background: "none", cursor: "pointer",
                  borderBottom: `2px solid ${activeTab === tab.key ? "#BFF205" : "transparent"}`,
                  fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800,
                  letterSpacing: "0.12em", textTransform: "uppercase",
                  color: activeTab === tab.key ? "#BFF205" : "rgba(255,255,255,0.3)",
                  transition: "color 0.12s",
                }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: "24px 32px" }}>

        {/* ══ GERAL ══ */}
        {activeTab === "geral" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16, alignItems: "start", maxWidth: 960 }}>

            {/* Identidade Visual */}
            <div style={cardStyle}>
              <SectionHeader label="Logo" />
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, marginBottom: 20 }}>
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

              <SectionHeader label="Cor principal" />
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                  border: `2px solid ${primaryColor || "rgba(255,255,255,0.08)"}`,
                  backgroundColor: primaryColor || "rgba(255,255,255,0.04)",
                }} />
                <input type="text" value={primaryColor}
                  onChange={e => setPrimaryColor(e.target.value)}
                  onFocus={focusBrand}
                  onBlur={e => {
                    blurBrand(e);
                    let v = e.target.value.trim();
                    if (v && !v.startsWith("#")) v = "#" + v;
                    setPrimaryColor(v);
                  }}
                  placeholder="#RRGGBB" maxLength={7}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <input type="color"
                  value={primaryColor && /^#[0-9a-fA-F]{6}$/.test(primaryColor) ? primaryColor : "#000000"}
                  onChange={e => setPrimaryColor(e.target.value)}
                  style={{ width: 36, height: 36, flexShrink: 0, cursor: "pointer", borderRadius: 9, border: "1px solid rgba(255,255,255,0.08)", padding: 2, backgroundColor: "rgba(255,255,255,0.04)" }}
                />
                {primaryColor && (
                  <button type="button" onClick={() => { setPrimaryColor(""); setSuggestedColors([]); }}
                    style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 9, border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "transparent", color: "rgba(255,255,255,0.4)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <X size={14} />
                  </button>
                )}
              </div>
              {extractingColors && (
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>Analisando cores da logo…</p>
              )}
              {suggestedColors.length > 0 && (
                <div>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>
                    Cores detectadas
                  </p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {suggestedColors.map(c => (
                      <button key={c} type="button" onClick={() => setPrimaryColor(c)} title={c}
                        style={{
                          position: "relative", width: 32, height: 32, borderRadius: 8, border: "none", cursor: "pointer",
                          backgroundColor: c,
                          boxShadow: primaryColor === c ? "0 0 0 2px #BFF205, 0 0 0 4px #0e0e0e" : "0 0 0 1px rgba(255,255,255,0.15)",
                        }}>
                        {primaryColor === c && (
                          <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Dados */}
            <div style={cardStyle}>
              <SectionHeader label="Dados" />
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <span style={fieldLabel}>Nome completo</span>
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} style={inputStyle} onFocus={focusBrand} onBlur={blurBrand} />
                </div>
                <div>
                  <span style={fieldLabel}>Nome curto</span>
                  <input type="text" value={shortName} onChange={e => setShortName(e.target.value)} style={inputStyle} onFocus={focusBrand} onBlur={blurBrand} />
                </div>
                <div>
                  <span style={fieldLabel}>Gênero</span>
                  <LabSelect value={gender} onChange={setGender} options={[
                    { value: "male", label: "Masculino" },
                    { value: "female", label: "Feminino" },
                  ]} />
                </div>
                <div>
                  <span style={fieldLabel}>Categoria</span>
                  <LabSelect value={categoryId} onChange={setCategoryId} placeholder="Sem categoria"
                    options={globalCategories.map((cat) => ({ value: cat.id, label: cat.label }))} />
                  {globalCategories.length === 0 && (
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 6 }}>
                      Nenhuma categoria cadastrada. Crie em Configurações do sistema.
                    </p>
                  )}
                </div>
                <div
                  style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", paddingTop: 4 }}
                  onClick={() => setPinned(v => !v)}
                >
                  <div style={{
                    position: "relative", width: 36, height: 20, borderRadius: 10, flexShrink: 0,
                    backgroundColor: pinned ? "#BFF205" : "rgba(255,255,255,0.1)",
                    transition: "background-color 0.12s",
                  }}>
                    <div style={{
                      position: "absolute", top: 2, width: 16, height: 16, borderRadius: "50%", backgroundColor: "#fff",
                      transition: "transform 0.12s",
                      transform: pinned ? "translateX(18px)" : "translateX(2px)",
                    }} />
                  </div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-primary)" }}>Fixar na sidebar</span>
                </div>
                <div style={{ maxWidth: 160 }}>
                  <span style={fieldLabel}>Prioridade na home</span>
                  <input
                    type="number"
                    min={0}
                    value={homePriority}
                    onChange={e => setHomePriority(Number(e.target.value))}
                    placeholder="0"
                    style={inputStyle}
                    onFocus={focusBrand}
                    onBlur={blurBrand}
                  />
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>Maior = primeiro</p>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ══ EDIÇÕES ══ */}
        {activeTab === "temporadas" && (
          <div style={{ maxWidth: 560 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 20 }}>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.35)", margin: 0 }}>
                Cada edição representa esta competição em uma temporada específica.
              </p>
              <button type="button" onClick={() => setShowCreateModal(true)}
                style={{
                  display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
                  padding: "8px 14px", borderRadius: 9, cursor: "pointer",
                  border: "1px solid rgba(191,242,5,0.4)", backgroundColor: "rgba(191,242,5,0.08)",
                  color: "#BFF205",
                  fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                }}>
                <Plus size={13} />
                Nova edição
              </button>
            </div>

            <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)", backgroundColor: "rgba(255,255,255,0.03)", overflow: "hidden" }}>
              {sortedEditions.length === 0 && (
                <p style={{ padding: "32px 20px", textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.3)", margin: 0 }}>
                  Nenhuma edição cadastrada para esta competição.
                </p>
              )}
              {sortedEditions.map((ed, idx) => {
                const edDisplayName = ed.custom_name ?? (ed.season_name + (ed.year_value ? " " + ed.year_value : ""));
                return (
                  <Link
                    key={ed.id}
                    href={"/competicoes/" + competition.id + "?edicao=" + ed.id}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
                      padding: "16px 20px", textDecoration: "none",
                      borderTop: idx > 0 ? "1px solid rgba(255,255,255,0.06)" : "none",
                      transition: "background-color 0.12s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)")}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>
                          {edDisplayName}
                        </p>
                        {ed.is_current && (
                          <span style={{
                            fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.08em",
                            padding: "2px 8px", borderRadius: 20,
                            backgroundColor: "rgba(191,242,5,0.12)", color: "#BFF205",
                            border: "1px solid rgba(191,242,5,0.2)",
                          }}>
                            ATUAL
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                        <span style={{
                          fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.06em",
                          padding: "2px 8px", borderRadius: 6,
                          backgroundColor: ed.status === "ongoing" ? "rgba(191,242,5,0.12)" : "rgba(255,255,255,0.06)",
                          color: STATUS_COLOR[ed.status] ?? "#A6A6A6",
                        }}>
                          {EDITION_STATUS_OPTIONS.find(o => o.value === ed.status)?.label ?? ed.status}
                        </span>
                        {ed.year_value > 0 && (
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{ed.year_value}</span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}
                      onClick={e => e.preventDefault()}>
                      <button type="button"
                        onClick={e => { e.preventDefault(); e.stopPropagation(); setEditingEdition(ed); }}
                        style={{
                          padding: 6, borderRadius: 8, cursor: "pointer",
                          border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "transparent",
                          color: "rgba(255,255,255,0.4)",
                        }}>
                        <Pencil size={13} />
                      </button>
                      <button type="button"
                        onClick={e => { e.preventDefault(); e.stopPropagation(); handleDeleteEdition(ed.id); }}
                        disabled={deletingEditionId === ed.id}
                        style={{
                          padding: 6, borderRadius: 8, cursor: deletingEditionId === ed.id ? "not-allowed" : "pointer",
                          border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "transparent",
                          color: "#FF4444", opacity: deletingEditionId === ed.id ? 0.4 : 1,
                        }}>
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

    </div>
  );
}
