import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, UserMinus } from "lucide-react";
import { PersonAvatar } from "@/app/(lab)/components/person-avatar";
import { glassCardStyle, teamShortLabel, transitionFast } from "./rep-ui";

export const glassRosterCardStyle: CSSProperties = {
  ...glassCardStyle,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.04)",
};

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

export function avatarColorsFromName(name: string, useBrandAccent = false): {
  background: string;
  color: string;
} {
  if (useBrandAccent) {
    return {
      background: "rgba(191,242,5,0.18)",
      color: "var(--color-brand)",
    };
  }
  const hue = hashString(name) % 360;
  return {
    background: `hsla(${hue}, 48%, 42%, 0.28)`,
    color: `hsl(${hue}, 70%, 72%)`,
  };
}

export function MemberAvatar({
  name,
  photoUrl,
  size = 40,
  teamAccent,
}: {
  name: string;
  photoUrl: string | null;
  size?: number;
  teamAccent?: boolean;
}) {
  return (
    <PersonAvatar
      photoUrl={photoUrl}
      alt={name}
      size={size}
      style={{
        border: "1px solid rgba(255,255,255,0.08)",
        backgroundColor: photoUrl
          ? undefined
          : teamAccent
            ? "rgba(191,242,5,0.08)"
            : "var(--color-input-bg)",
      }}
    />
  );
}

export function TeamLogoBadge({
  logoUrl,
  label,
  size = 32,
}: {
  logoUrl: string | null;
  label: string;
  size?: number;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        flexShrink: 0,
        border: "1px solid rgba(255,255,255,0.1)",
        backgroundColor: "rgba(255,255,255,0.04)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {logoUrl ? (
        <img src={logoUrl} alt="" style={{ width: size - 6, height: size - 6, objectFit: "contain" }} />
      ) : (
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800,
          color: "var(--color-brand)",
        }}>
          {label.slice(0, 2).toUpperCase()}
        </span>
      )}
    </div>
  );
}

export function RepBackLink({
  href,
  label,
  logoUrl,
  teamLabel,
  showLogo = false,
}: {
  href: string;
  label: string;
  logoUrl?: string | null;
  teamLabel?: string;
  showLogo?: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 20,
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        color: "var(--color-text-muted)",
        textDecoration: "none",
        transition: transitionFast,
      }}
    >
      <ChevronLeft size={14} />
      {showLogo && (
        <TeamLogoBadge logoUrl={logoUrl ?? null} label={teamLabel ?? label} size={22} />
      )}
      {label}
    </Link>
  );
}

export function RepPageHeading({
  title,
  subtitle,
  logoUrl,
  logoFallback,
  showLogo = true,
}: {
  title: string;
  subtitle?: string;
  logoUrl?: string | null;
  logoFallback?: string;
  showLogo?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, minWidth: 0, flex: 1 }}>
      {showLogo && (
        <TeamLogoBadge logoUrl={logoUrl ?? null} label={logoFallback ?? title} size={44} />
      )}
      <div style={{ minWidth: 0 }}>
        <h1 style={{
          fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 900,
          color: "var(--color-text-primary)", margin: 0,
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{
            fontFamily: "var(--font-mono)", fontSize: 11,
            color: "var(--color-text-muted)", margin: "4px 0 0",
          }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

export function MemberRoleHint({ memberType }: { memberType: "athlete" | "staff" }) {
  return (
    <span style={{
      fontFamily: "var(--font-mono)",
      fontSize: 9,
      color: "var(--color-text-faint)",
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      flexShrink: 0,
    }}>
      {memberType === "athlete" ? "Atleta" : "Comissão"}
    </span>
  );
}

export function RosterRemoveButton({
  onClick,
  active = false,
}: {
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Solicitar remoção"
      style={{
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 32,
        height: 32,
        borderRadius: 8,
        border: `1px solid ${active ? "rgba(255,68,68,0.35)" : "rgba(255,255,255,0.08)"}`,
        backgroundColor: active ? "rgba(255,68,68,0.1)" : "rgba(255,255,255,0.03)",
        color: active ? "rgba(255,100,100,0.9)" : "rgba(255,255,255,0.4)",
        cursor: "pointer",
        transition: transitionFast,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.color = "rgba(255,100,100,0.9)";
        e.currentTarget.style.borderColor = "rgba(255,68,68,0.35)";
        e.currentTarget.style.backgroundColor = "rgba(255,68,68,0.1)";
      }}
      onMouseLeave={e => {
        if (active) return;
        e.currentTarget.style.color = "rgba(255,255,255,0.4)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
        e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)";
      }}
    >
      <UserMinus size={14} strokeWidth={2} />
    </button>
  );
}

export function RosterCardHeader({
  team,
  title,
  countLabel,
  progress,
}: {
  team: { full_name: string; short_name?: string | null; abbreviation?: string | null; logo_url: string | null };
  title: string;
  countLabel: string;
  progress?: { current: number; max: number | null };
}) {
  const label = teamShortLabel(team);
  const ratio = progress?.max ? Math.min(progress.current / progress.max, 1) : null;
  const nearLimit = ratio != null && ratio >= 0.85;
  const atLimit = ratio != null && ratio >= 1;

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <TeamLogoBadge logoUrl={team.logo_url} label={label} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800,
            letterSpacing: "0.14em", textTransform: "uppercase",
            color: "var(--color-brand)", margin: 0,
          }}>
            {title}
          </p>
          <p style={{
            fontFamily: "var(--font-mono)", fontSize: 10,
            color: "var(--color-text-muted)", margin: "2px 0 0",
          }}>
            {team.full_name}
          </p>
        </div>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
          color: atLimit ? "#F2C005" : "var(--color-text-secondary)",
          flexShrink: 0,
        }}>
          {countLabel}
        </span>
      </div>
      {ratio != null && progress?.max != null && (
        <div style={{
          height: 4,
          borderRadius: 4,
          backgroundColor: "rgba(255,255,255,0.06)",
          overflow: "hidden",
        }}>
          <div style={{
            height: "100%",
            width: `${ratio * 100}%`,
            borderRadius: 4,
            backgroundColor: atLimit ? "#F2C005" : nearLimit ? "rgba(242,192,5,0.75)" : "var(--color-brand)",
            opacity: 0.85,
            transition: transitionFast,
          }} />
        </div>
      )}
    </div>
  );
}

export function RosterMemberRow({
  children,
  isLast,
}: {
  children: ReactNode;
  isLast: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 8px",
        margin: "0 -8px",
        borderRadius: 8,
        borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.06)",
        transition: transitionFast,
      }}
      onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)"; }}
      onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; }}
    >
      {children}
    </div>
  );
}
