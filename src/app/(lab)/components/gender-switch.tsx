"use client";

import styles from "./entity-hub.module.css";

type GenderSwitchProps = {
  value: "male" | "female";
  onChange: (value: "male" | "female") => void;
  disabled?: boolean;
  hint?: string;
};

export function GenderSwitch({ value, onChange, disabled = false, hint }: GenderSwitchProps) {
  function select(next: "male" | "female") {
    if (disabled || next === value) return;
    onChange(next);
  }

  return (
    <div className={styles.genderSwitchWrap}>
      <div
        className={`${styles.genderSwitch} ${disabled ? styles.genderSwitchDisabled : ""}`}
        role="group"
        aria-label="Gênero"
      >
        <span
          className={styles.genderSwitchIndicator}
          style={{ transform: value === "female" ? "translateX(100%)" : "translateX(0)" }}
          aria-hidden
        />
        <button
          type="button"
          disabled={disabled}
          className={`${styles.genderSwitchOption} ${value === "male" ? styles.genderSwitchOptionActive : ""}`}
          onClick={() => select("male")}
        >
          Masculino
        </button>
        <button
          type="button"
          disabled={disabled}
          className={`${styles.genderSwitchOption} ${value === "female" ? styles.genderSwitchOptionActive : ""}`}
          onClick={() => select("female")}
        >
          Feminino
        </button>
      </div>
      {disabled && hint && (
        <p className={styles.genderSwitchHint}>{hint}</p>
      )}
    </div>
  );
}

export function normalizePersonGender(gender: string | null | undefined): "male" | "female" {
  const g = String(gender ?? "").toLowerCase();
  if (g === "female" || g === "f" || g === "feminino") return "female";
  return "male";
}
