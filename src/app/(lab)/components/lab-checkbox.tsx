"use client";



import { LAB_ACCENT_HEX } from "@/lib/lab-theme";



type Props = {

  checked: boolean;

  onChange: (checked: boolean) => void;

  disabled?: boolean;

  accentColor?: string;

  label?: React.ReactNode;

  align?: "center" | "start";

};



export function LabCheckbox({

  checked,

  onChange,

  disabled = false,

  accentColor = LAB_ACCENT_HEX,

  label,

  align = "center",

}: Props) {

  return (

    <button

      type="button"

      role="checkbox"

      aria-checked={checked}

      disabled={disabled}

      onClick={() => !disabled && onChange(!checked)}

      style={{

        display: "flex",

        alignItems: align === "start" ? "flex-start" : "center",

        gap: 10,

        border: "none",

        background: "none",

        padding: 0,

        cursor: disabled ? "not-allowed" : "pointer",

        opacity: disabled ? 0.45 : 1,

        textAlign: "left",

        width: label ? "100%" : "auto",

      }}

    >

      <span

        style={{

          width: 18,

          height: 18,

          borderRadius: 5,

          flexShrink: 0,

          marginTop: align === "start" ? 2 : 0,

          border: `1.5px solid ${checked ? accentColor : "var(--color-checkbox-border)"}`,

          backgroundColor: checked ? `${accentColor}20` : "var(--color-input-bg)",

          boxShadow: checked ? `0 0 0 1px ${accentColor}18` : "none",

          display: "flex",

          alignItems: "center",

          justifyContent: "center",

          transition: "border-color 0.12s, background-color 0.12s, box-shadow 0.12s",

        }}

      >

        {checked && (

          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>

            <path

              d="M2 5.2L4.2 7.4L8 2.8"

              stroke={accentColor}

              strokeWidth="1.8"

              strokeLinecap="round"

              strokeLinejoin="round"

            />

          </svg>

        )}

      </span>

      {label != null && (

        <span

          style={{

            fontFamily: "var(--font-mono)",

            fontSize: 11,

            color: "var(--color-text-label)",

            lineHeight: align === "start" ? 1.5 : 1.2,

          }}

        >

          {label}

        </span>

      )}

    </button>

  );

}


