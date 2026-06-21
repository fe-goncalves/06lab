import type { CSSProperties, MouseEvent, ReactNode } from "react";
import { Clock } from "lucide-react";
import { inputBaseStyle } from "@/lib/lab-ui-styles";

export const transitionFast = "all 0.2s ease";

export function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
      <span style={{
        fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800,
        letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--color-brand)",
      }}>
        {title}
      </span>
      <div style={{ flex: 1, height: 1, background: "var(--gradient-section-line)" }} />
    </div>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span style={{
      fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800,
      letterSpacing: "0.12em", textTransform: "uppercase",
      color: "var(--color-text-faint)", display: "block", marginBottom: 5,
    }}>
      {children}
    </span>
  );
}

export function FeedbackMessage({ type, text }: { type: "success" | "error"; text: string }) {
  const isError = type === "error";
  return (
    <p style={{
      fontFamily: "var(--font-mono)", fontSize: 11,
      color: isError ? "#FF4444" : "var(--color-brand)",
      backgroundColor: isError ? "rgba(255,68,68,0.07)" : "var(--color-brand-hover-bg)",
      border: `1px solid ${isError ? "rgba(255,68,68,0.2)" : "rgba(191,242,5,0.2)"}`,
      borderRadius: 8, padding: "8px 12px", margin: 0, marginTop: 16,
    }}>
      {text}
    </p>
  );
}

export function StyledInput({
  value, onChange, placeholder, type = "text",
}: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ ...inputBaseStyle, transition: transitionFast }}
      onFocus={e => (e.target.style.borderColor = "var(--color-brand-border)")}
      onBlur={e => (e.target.style.borderColor = "var(--color-input-border)")}
    />
  );
}

export const cardStyle: CSSProperties = {
  borderRadius: 14,
  border: "1px solid var(--color-input-border)",
  backgroundColor: "var(--color-surface)",
  padding: "20px 20px 24px",
  transition: transitionFast,
};

export const glassCardStyle: CSSProperties = {
  ...cardStyle,
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  background: "rgba(255,255,255,0.04)",
};

export function applyCardHover(e: MouseEvent<HTMLElement>, active = false) {
  if (active) return;
  e.currentTarget.style.transform = "translateY(-2px)";
  e.currentTarget.style.borderColor = "rgba(191,242,5,0.35)";
  e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.25), 0 0 0 1px rgba(191,242,5,0.12)";
}

export function clearCardHover(e: MouseEvent<HTMLElement>, active = false) {
  if (active) return;
  e.currentTarget.style.transform = "translateY(0)";
  e.currentTarget.style.borderColor = "var(--color-input-border)";
  e.currentTarget.style.boxShadow = "none";
}

export function applyButtonHover(e: MouseEvent<HTMLButtonElement>, disabled = false) {
  if (disabled) return;
  e.currentTarget.style.filter = "brightness(1.08)";
  e.currentTarget.style.opacity = "0.95";
}

export function clearButtonHover(e: MouseEvent<HTMLButtonElement>, disabled = false) {
  if (disabled) return;
  e.currentTarget.style.filter = "none";
  e.currentTarget.style.opacity = "1";
}

export function applyListRowHover(e: MouseEvent<HTMLElement>) {
  e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)";
}

export function clearListRowHover(e: MouseEvent<HTMLElement>) {
  e.currentTarget.style.backgroundColor = "transparent";
}

export const primaryButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 16px",
  borderRadius: 8,
  border: "none",
  backgroundColor: "var(--color-brand)",
  color: "#0a0a0a",
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  cursor: "pointer",
  transition: transitionFast,
};

/** Nome de exibição no elenco: surname primeiro, full_name como fallback. */
export function rosterDisplayName(fullName: string, surname: string | null): string {
  return surname?.trim() || fullName;
}

/** Busca/modal: nome completo + apelido quando existir. */
export function memberDisplayName(fullName: string, surname: string | null): string {
  return surname?.trim() ? `${fullName} ${surname}` : fullName;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "?";
}

export function teamShortLabel(team: {
  abbreviation?: string | null;
  short_name?: string | null;
  full_name: string;
}): string {
  return (
    team.short_name?.trim()
    ?? team.abbreviation?.toUpperCase()
    ?? team.full_name.slice(0, 3).toUpperCase()
  );
}

export function teamCardTitle(team: {
  short_name?: string | null;
  abbreviation?: string | null;
  full_name: string;
}): string {
  return team.short_name?.trim() || team.abbreviation?.toUpperCase() || team.full_name;
}

export function formatRequestDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function SubmittedRequestCard({ createdAt, compact = false }: { createdAt: string; compact?: boolean }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: compact ? 8 : 10,
      padding: compact ? "6px 10px" : "10px 12px",
      borderRadius: 10,
      border: "1px solid rgba(242,192,5,0.28)",
      backgroundColor: "rgba(242,192,5,0.08)",
      flexShrink: 0,
    }}>
      <Clock size={compact ? 14 : 16} color="#F2C005" strokeWidth={2.25} />
      <div style={{ minWidth: 0 }}>
        <p style={{
          fontFamily: "var(--font-mono)", fontSize: compact ? 10 : 11, fontWeight: 700,
          color: "#F2C005", margin: 0,
        }}>
          Solicitação enviada em {formatRequestDate(createdAt)}
        </p>
        {!compact && (
          <p style={{
            fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(242,192,5,0.75)",
            margin: "2px 0 0",
          }}>
            Aguardando aprovação
          </p>
        )}
      </div>
    </div>
  );
}
