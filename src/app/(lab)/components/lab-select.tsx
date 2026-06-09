"use client";

import { ChevronDown } from "lucide-react";

type LabSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type LabSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: LabSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  style?: React.CSSProperties;
  className?: string;
};

export function LabSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  id,
  name,
  style,
  className,
}: LabSelectProps) {
  return (
    <div className={className} style={{ position: "relative", width: "100%", ...style }}>
      <select
        id={id}
        name={name}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          appearance: "none",
          WebkitAppearance: "none",
          MozAppearance: "none",
          padding: "10px 36px 10px 12px",
          borderRadius: 9,
          border: "1px solid rgba(255,255,255,0.08)",
          backgroundColor: "var(--color-surface)",
          color: value ? "#fff" : "rgba(255,255,255,0.35)",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          fontWeight: 600,
          outline: "none",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
          colorScheme: "dark",
        }}
      >
        {placeholder && (
          <option value="" disabled={value !== ""}>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        strokeWidth={2}
        style={{
          position: "absolute",
          right: 12,
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
          color: "rgba(255,255,255,0.35)",
        }}
      />
    </div>
  );
}

export type { LabSelectOption, LabSelectProps };
