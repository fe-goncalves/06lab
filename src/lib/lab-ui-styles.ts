import type { CSSProperties, FocusEvent, MouseEvent } from "react";

/** Estilos base reutilizáveis — sempre via tokens CSS (dark/light). */

export const inputBaseStyle: CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  backgroundColor: "var(--color-input-bg)",
  border: "1px solid var(--color-input-border)",
  borderRadius: 9,
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: "var(--color-text-primary)",
  outline: "none",
  transition: "border-color 0.15s",
};

export const inputCompactStyle: CSSProperties = {
  padding: "7px 10px",
  backgroundColor: "var(--color-input-bg)",
  border: "1px solid var(--color-input-border-strong)",
  borderRadius: 7,
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--color-text-primary)",
  outline: "none",
};

export const selectBaseStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--color-text-primary)",
  background: "var(--color-input-bg)",
  border: "1px solid var(--color-input-border)",
  borderRadius: 8,
  outline: "none",
  width: "100%",
  padding: "8px 12px",
  cursor: "pointer",
};

export function pickerTriggerStyle(
  open: boolean,
  hasValue: boolean,
  fontFamily: string = "var(--font-mono)",
): CSSProperties {
  return {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "9px 36px 9px 12px",
    borderRadius: 9,
    border: open
      ? "1px solid var(--color-brand-border)"
      : "1px solid var(--color-input-border)",
    backgroundColor: "var(--color-surface)",
    color: hasValue ? "var(--color-text-primary)" : "var(--color-text-muted)",
    fontFamily,
    fontSize: 12,
    fontWeight: fontFamily === "var(--font-sans)" ? 500 : 600,
    textAlign: "left",
  };
}

export const pickerChevronStyle: CSSProperties = {
  position: "absolute",
  right: 12,
  top: "50%",
  transition: "transform 0.15s",
  color: "var(--color-text-muted)",
  pointerEvents: "none",
};

export const pickerDropdownStyle: CSSProperties = {
  position: "absolute",
  top: "calc(100% + 4px)",
  left: 0,
  right: 0,
  zIndex: 50,
  borderRadius: 9,
  border: "1px solid var(--color-dropdown-border)",
  backgroundColor: "var(--color-surface)",
  boxShadow: "var(--color-dropdown-shadow)",
  overflow: "hidden",
};

export const pickerSearchRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 10px",
  borderBottom: "1px solid var(--color-divider-strong)",
};

export const pickerSearchInputStyle: CSSProperties = {
  flex: 1,
  border: "none",
  background: "transparent",
  outline: "none",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--color-text-primary)",
};

export function pickerOptionStyle(
  isSelected: boolean,
  fontSize = 12,
  fontFamily: string = "var(--font-mono)",
): CSSProperties {
  return {
    width: "100%",
    padding: "9px 12px",
    border: "none",
    borderBottom: "1px solid var(--color-divider)",
    backgroundColor: isSelected ? "var(--color-brand-selected-bg)" : "transparent",
    color: isSelected ? "var(--color-brand)" : "var(--color-text-primary)",
    fontFamily,
    fontSize,
    fontWeight: isSelected ? 700 : fontFamily === "var(--font-sans)" ? 500 : 600,
    cursor: "pointer",
    textAlign: "left",
  };
}

export function pickerEmptyOptionStyle(isSelected: boolean, fontFamily: string = "var(--font-mono)"): CSSProperties {
  return {
    ...pickerOptionStyle(isSelected, 11, fontFamily),
    color: isSelected ? "var(--color-brand)" : "var(--color-text-subtle)",
  };
}

export function pickerOptionRowStyle(isSelected: boolean, fontFamily: string = "var(--font-mono)"): CSSProperties {
  return {
    ...pickerOptionStyle(isSelected, 12, fontFamily),
    display: "flex",
    alignItems: "center",
    gap: 10,
  };
}

export const pickerEmptyMessageStyle: CSSProperties = {
  padding: "12px 14px",
  margin: 0,
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--color-text-faint)",
};

export const logoPlaceholderStyle: CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: 5,
  backgroundColor: "var(--color-surface-raised)",
  flexShrink: 0,
};

export const modalOverlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 50,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "var(--color-modal-scrim)",
  padding: 16,
};

export const modalPanelStyle: CSSProperties = {
  width: "100%",
  borderRadius: 16,
  border: "1px solid var(--color-dropdown-border)",
  backgroundColor: "var(--color-modal-bg)",
  overflow: "hidden",
  boxShadow: "var(--color-modal-shadow)",
};

export const modalHeaderDividerStyle: CSSProperties = {
  borderBottom: "1px solid var(--color-divider-strong)",
};

export const modalCloseButtonStyle: CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 7,
  flexShrink: 0,
  border: "1px solid var(--color-input-border-strong)",
  background: "none",
  color: "var(--color-icon-muted)",
  fontSize: 16,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

export const secondaryButtonStyle: CSSProperties = {
  padding: "9px 18px",
  borderRadius: 8,
  border: "1px solid var(--color-input-border-strong)",
  background: "none",
  color: "var(--color-text-subtle)",
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

export const primaryBrandButtonStyle: CSSProperties = {
  backgroundColor: "var(--color-brand)",
  color: "var(--color-on-brand)",
};

export const primaryDangerButtonStyle: CSSProperties = {
  padding: "9px 18px",
  borderRadius: 8,
  border: "none",
  backgroundColor: "var(--color-danger)",
  color: "var(--color-on-danger)",
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

export const fieldLabelStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  fontWeight: 800,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--color-text-faint)",
};

export function applyPickerOptionHover(
  e: MouseEvent<HTMLButtonElement>,
  isSelected: boolean,
) {
  if (!isSelected) {
    e.currentTarget.style.backgroundColor = "var(--color-hover-bg)";
  }
}

export function clearPickerOptionHover(
  e: MouseEvent<HTMLButtonElement>,
  isSelected: boolean,
) {
  if (!isSelected) {
    e.currentTarget.style.backgroundColor = "transparent";
  }
}

export function focusBrandBorder(e: FocusEvent<HTMLElement>) {
  e.currentTarget.style.borderColor = "var(--color-brand)";
}

export function blurInputBorder(e: FocusEvent<HTMLElement>) {
  e.currentTarget.style.borderColor = "var(--color-input-border)";
}
