"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  Loader2,
  Users,
  Shield,
  Trophy,
  CalendarDays,
  UserCog,
  Flag,
} from "lucide-react";
import { useSearch } from "./useSearch";

// ─── Metadados das categorias ───────────────────────────────────────────────

interface CategoryMeta {
  label: string;
  icon: React.ReactNode;
}

const CATEGORY_META: Record<string, CategoryMeta> = {
  athletes:     { label: "Atletas",         icon: <Users       size={12} strokeWidth={2} /> },
  teams:        { label: "Equipes",          icon: <Shield      size={12} strokeWidth={2} /> },
  competitions: { label: "Competições",      icon: <Trophy      size={12} strokeWidth={2} /> },
  matches:      { label: "Partidas",         icon: <CalendarDays size={12} strokeWidth={2} /> },
  staff:        { label: "Comissão Técnica", icon: <UserCog     size={12} strokeWidth={2} /> },
  referees:     { label: "Árbitros",         icon: <Flag        size={12} strokeWidth={2} /> },
};

const CATEGORY_ORDER = [
  "athletes",
  "teams",
  "competitions",
  "matches",
  "staff",
  "referees",
] as const;

// ─── Props ───────────────────────────────────────────────────────────────────

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
}

// ─── Componente ──────────────────────────────────────────────────────────────

export function SearchModal({ isOpen, onClose, organizationId }: SearchModalProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { query, setQuery, results, isLoading, hasResults } = useSearch(organizationId);

  // Foco automático ao abrir; limpar query ao fechar
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    } else {
      setQuery("");
    }
  }, [isOpen, setQuery]);

  // Fechar com ESC (além do handler externo)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Bloquear scroll do body
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleNavigate = useCallback(
    (href: string) => {
      onClose();
      router.push(href);
    },
    [onClose, router]
  );

  if (!isOpen) return null;

  const showHint  = query.length < 2;
  const showEmpty = query.length >= 2 && !isLoading && !hasResults;

  return (
    // Overlay com blur
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center px-4 pt-[14vh]"
      style={{
        backgroundColor: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Modal */}
      <div
        className="w-full max-w-[600px] overflow-hidden rounded-xl shadow-2xl"
        style={{
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border)",
        }}
      >
        {/* ── Input ── */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          {isLoading ? (
            <Loader2
              size={17}
              strokeWidth={2}
              className="animate-spin shrink-0"
              style={{ color: "var(--color-brand)" }}
            />
          ) : (
            <Search
              size={17}
              strokeWidth={2}
              className="shrink-0"
              style={{ color: "#A6A6A6" }}
            />
          )}

          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar atletas, equipes, partidas..."
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: "var(--color-text-primary)" }}
          />

          {query && (
            <button
              onClick={() => setQuery("")}
              className="shrink-0 transition-opacity hover:opacity-100"
              style={{ color: "#A6A6A6", opacity: 0.5 }}
              aria-label="Limpar busca"
            >
              <X size={15} strokeWidth={2} />
            </button>
          )}

          <kbd
            className="hidden shrink-0 items-center rounded px-1.5 py-0.5 font-mono text-[11px] sm:flex"
            style={{
              border: "1px solid var(--color-border)",
              backgroundColor: "var(--color-background)",
              color: "#555",
            }}
          >
            ESC
          </kbd>
        </div>

        {/* ── Corpo com resultados ── */}
        <div className="overflow-y-auto" style={{ maxHeight: "420px" }}>
          {/* Estado inicial */}
          {showHint && (
            <p
              className="px-4 py-10 text-center font-mono text-xs"
              style={{ color: "#555" }}
            >
              Digite ao menos 2 caracteres para buscar
            </p>
          )}

          {/* Sem resultados */}
          {showEmpty && (
            <p
              className="px-4 py-10 text-center font-mono text-sm"
              style={{ color: "#555" }}
            >
              Nenhum resultado para{" "}
              <span style={{ color: "var(--color-text-primary)" }}>
                "{query}"
              </span>
            </p>
          )}

          {/* Resultados agrupados por categoria */}
          {!isLoading &&
            hasResults &&
            CATEGORY_ORDER.map((cat) => {
              const items = results[cat];
              if (!items.length) return null;
              const meta = CATEGORY_META[cat];

              return (
                <div key={cat}>
                  {/* Header da categoria */}
                  <div
                    className="flex items-center gap-2 px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest"
                    style={{
                      backgroundColor: "var(--color-background)",
                      borderBottom: "1px solid var(--color-border)",
                      color: "#555",
                    }}
                  >
                    {meta.icon}
                    {meta.label}
                  </div>

                  {/* Linhas de resultado */}
                  {items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavigate(item.href)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors"
                      style={{ borderBottom: "1px solid var(--color-border)" }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor =
                          "rgba(191,242,5,0.05)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor =
                          "transparent";
                      }}
                    >
                      {/* Avatar / inicial */}
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full font-mono text-xs font-bold"
                        style={{
                          backgroundColor: "var(--color-background)",
                          border: "1px solid var(--color-border)",
                          color: "#A6A6A6",
                        }}
                      >
                        {item.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.avatar_url}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          item.name.charAt(0).toUpperCase()
                        )}
                      </div>

                      {/* Nome + subtítulo */}
                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate text-sm"
                          style={{ color: "var(--color-text-primary)" }}
                        >
                          {item.name}
                        </p>
                        {item.subtitle && (
                          <p
                            className="truncate font-mono text-xs"
                            style={{ color: "#A6A6A6" }}
                          >
                            {item.subtitle}
                          </p>
                        )}
                      </div>

                      {/* Ícone da categoria à direita */}
                      <span className="shrink-0" style={{ color: "#333" }}>
                        {meta.icon}
                      </span>
                    </button>
                  ))}
                </div>
              );
            })}
        </div>

        {/* ── Rodapé ── */}
        <div
          className="flex items-center justify-between px-4 py-2 font-mono text-[11px]"
          style={{
            borderTop: "1px solid var(--color-border)",
            color: "#333",
          }}
        >
          <span>↵ navegar</span>
          <span>
            <kbd
              className="mr-1 rounded px-1 py-0.5"
              style={{
                border: "1px solid var(--color-border)",
                backgroundColor: "var(--color-background)",
              }}
            >
              Ctrl K
            </kbd>
            abrir
          </span>
          <span>ESC fechar</span>
        </div>
      </div>
    </div>
  );
}