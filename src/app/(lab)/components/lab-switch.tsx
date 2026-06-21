"use client";

import styles from "./entity-hub.module.css";

type LabSwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  variant?: "default" | "glass";
  className?: string;
};

export function LabSwitch({
  checked,
  onChange,
  label,
  disabled = false,
  variant = "default",
  className,
}: LabSwitchProps) {
  if (variant === "glass") {
    return (
      <label
        className={`${styles.hubGlassSwitch} ${className ?? ""}`}
        style={{
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {label && (
          <span className={`${styles.hubGlassSwitchLabel} ${checked ? styles.hubGlassSwitchLabelOn : ""}`}>
            {label}
          </span>
        )}
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => !disabled && onChange(!checked)}
          className={`${styles.hubGlassSwitchTrack} ${checked ? styles.hubGlassSwitchTrackOn : ""}`}
        >
          <span className={`${styles.hubGlassSwitchThumb} ${checked ? styles.hubGlassSwitchThumbOn : ""}`} />
        </button>
      </label>
    );
  }

  return (
    <label
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        userSelect: "none",
        flexShrink: 0,
      }}
    >
      {label && (
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fontWeight: 600,
            color: checked ? "var(--color-brand)" : "var(--color-switch-label-off)",
            letterSpacing: "0.04em",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        style={{
          width: 44,
          height: 24,
          borderRadius: 999,
          border: "none",
          padding: 2,
          cursor: disabled ? "not-allowed" : "pointer",
          backgroundColor: checked ? "var(--color-brand)" : "var(--color-switch-track)",
          transition: "background-color 0.15s",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            display: "block",
            width: 20,
            height: 20,
            borderRadius: "50%",
            backgroundColor: checked ? "var(--color-on-brand)" : "var(--color-switch-thumb-off)",
            transform: checked ? "translateX(20px)" : "translateX(0)",
            transition: "transform 0.15s, background-color 0.15s",
          }}
        />
      </button>
    </label>
  );
}
