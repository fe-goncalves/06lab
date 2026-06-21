"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

type Props = {
  collapsed?: boolean;
};

export function ThemeToggle({ collapsed = false }: Props) {
  const { theme, toggleTheme, mounted } = useTheme();
  const isLight = theme === "light";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={[
        "flex items-center gap-3 font-mono font-normal transition-opacity hover:opacity-70",
        collapsed ? "justify-center" : "w-full",
      ].join(" ")}
      style={{ color: "var(--color-text-secondary)", fontSize: "15px" }}
      title={collapsed ? (isLight ? "Modo escuro" : "Modo claro") : undefined}
      aria-label={isLight ? "Ativar modo escuro" : "Ativar modo claro"}
    >
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded"
        style={{
          backgroundColor: "var(--color-brand-muted-bg)",
          color: "var(--color-brand-alt)",
        }}
      >
        {!mounted ? (
          <Moon size={14} strokeWidth={2.5} />
        ) : isLight ? (
          <Moon size={14} strokeWidth={2.5} />
        ) : (
          <Sun size={14} strokeWidth={2.5} />
        )}
      </span>
      {!collapsed && (
        <span style={{ color: "var(--color-text-secondary)" }}>
          {isLight ? "MODO ESCURO" : "MODO CLARO"}
        </span>
      )}
    </button>
  );
}
