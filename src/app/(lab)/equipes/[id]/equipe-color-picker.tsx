"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, X } from "lucide-react";
import styles from "./equipe-hub.module.css";

function normalizeHex(input: string): string | null {
  let h = input.trim();
  if (!h) return null;
  if (!h.startsWith("#")) h = `#${h}`;
  if (!/^#[0-9A-Fa-f]{6}$/.test(h)) return null;
  return h.toLowerCase();
}

type EquipeColorPickerProps = {
  value: string;
  onChange: (hex: string) => void;
  ariaLabel: string;
  disabled?: boolean;
};

export function EquipeColorPicker({ value, onChange, ariaLabel, disabled = false }: EquipeColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (!open) setDraft(value); }, [open, value]);

  const validDraft = normalizeHex(draft);
  const pickerValue = validDraft ?? value;
  const fieldId = `hex-${ariaLabel.replace(/\s+/g, "-").toLowerCase()}`;

  function close() {
    setOpen(false);
    setDraft(value);
  }

  function apply() {
    const next = normalizeHex(draft);
    if (!next) return;
    onChange(next);
    setOpen(false);
  }

  function onHexChange(raw: string) {
    const cleaned = raw.replace(/[^#0-9A-Fa-f]/g, "").slice(0, 7);
    setDraft(cleaned.startsWith("#") ? cleaned : cleaned ? `#${cleaned.replace(/^#/, "")}` : "");
  }

  function onNativeColorChange(hex: string) {
    setDraft(hex.toLowerCase());
  }

  const modal = open && mounted
    ? createPortal(
        <div className={styles.cropOverlay} onClick={close}>
          <div
            className={styles.colorModalPanel}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
          >
            <div className={styles.cropHeader}>
              <p className={styles.cropTitle}>Escolher cor</p>
              <button type="button" className={styles.cropClose} onClick={close} aria-label="Fechar">
                <X size={16} strokeWidth={2} />
              </button>
            </div>

            <div className={styles.colorModalRow}>
              <label className={styles.colorNativeWrap} aria-label="Seletor visual de cor">
                <span className={styles.colorNativeSwatch} style={{ backgroundColor: pickerValue }} />
                <input
                  type="color"
                  value={pickerValue}
                  onChange={(e) => onNativeColorChange(e.target.value)}
                  className={styles.colorNativePicker}
                />
              </label>

              <div className={styles.colorModalHex}>
                <label className={styles.fieldLabel} htmlFor={fieldId}>Hex</label>
                <input
                  id={fieldId}
                  type="text"
                  value={draft}
                  onChange={(e) => onHexChange(e.target.value)}
                  className={`${styles.input} ${styles.inputAbbr}`}
                  placeholder="#000000"
                  spellCheck={false}
                  autoComplete="off"
                  onKeyDown={(e) => { if (e.key === "Enter") apply(); }}
                />
              </div>
            </div>

            <div className={styles.cropActions}>
              <button type="button" className={styles.cropBtnSecondary} onClick={close}>
                Cancelar
              </button>
              <button
                type="button"
                className={styles.cropBtnPrimary}
                onClick={apply}
                disabled={!validDraft}
              >
                <Check size={13} strokeWidth={2.5} />
                Aplicar
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      {modal}
      <button
        type="button"
        className={`${styles.colorTile} ${disabled ? styles.colorTileDisabled : ""}`}
        style={{ backgroundColor: value }}
        onClick={() => { if (!disabled) setOpen(true); }}
        aria-label={ariaLabel}
        disabled={disabled}
      />
    </>
  );
}
