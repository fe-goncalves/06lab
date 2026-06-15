"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

export interface LabPickerOption {
  id: string;
  label: string;
  logo_url?: string | null;
  /** Texto extra para busca (ex.: full_name quando label é short_name) */
  searchText?: string;
}

interface LabPickerProps {
  options: LabPickerOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  allowEmpty?: boolean;
  disabled?: boolean;
  showLogos?: boolean;
}

export function LabPicker({
  options,
  value,
  onChange,
  placeholder = "Selecione…",
  searchPlaceholder = "Buscar…",
  emptyLabel = "Todos",
  allowEmpty = true,
  disabled = false,
  showLogos = true,
}: LabPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.id === value);

  const filtered = options.filter((o) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      o.label.toLowerCase().includes(q) ||
      (o.searchText?.toLowerCase().includes(q) ?? false)
    );
  });

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => searchRef.current?.focus());
    } else {
      setSearch("");
    }
  }, [open]);

  function pick(id: string) {
    onChange(id);
    setOpen(false);
  }

  function LogoSlot({ url }: { url?: string | null }) {
    if (!showLogos) return null;
    if (url) {
      return (
        <img
          src={url}
          alt=""
          style={{ width: 24, height: 24, objectFit: "contain", flexShrink: 0 }}
        />
      );
    }
    return (
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: 5,
          backgroundColor: "rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", minWidth: 140 }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "9px 36px 9px 12px",
          borderRadius: 9,
          border: open ? "1px solid rgba(191,242,5,0.35)" : "1px solid rgba(255,255,255,0.08)",
          backgroundColor: "var(--color-surface)",
          color: selected || value === "" ? "#fff" : "rgba(255,255,255,0.35)",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          fontWeight: 600,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
          textAlign: "left",
        }}
      >
        {selected ? (
          <>
            <LogoSlot url={selected.logo_url} />
            <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {selected.label}
            </span>
          </>
        ) : (
          <span style={{ flex: 1 }}>{value === "" && allowEmpty ? emptyLabel : placeholder}</span>
        )}
        <ChevronDown
          size={14}
          strokeWidth={2}
          style={{
            position: "absolute",
            right: 12,
            top: "50%",
            transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)`,
            transition: "transform 0.15s",
            color: "rgba(255,255,255,0.35)",
            pointerEvents: "none",
          }}
        />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 50,
            borderRadius: 9,
            border: "1px solid rgba(255,255,255,0.1)",
            backgroundColor: "var(--color-surface)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 10px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <Search size={14} style={{ color: "rgba(255,255,255,0.3)", flexShrink: 0 }} />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              style={{
                flex: 1,
                border: "none",
                background: "transparent",
                outline: "none",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--color-text-primary)",
              }}
            />
          </div>
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {allowEmpty && (
              <button
                type="button"
                onClick={() => pick("")}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 12px",
                  border: "none",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  backgroundColor: value === "" ? "rgba(191,242,5,0.08)" : "transparent",
                  color: value === "" ? "#BFF205" : "rgba(255,255,255,0.5)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  fontWeight: value === "" ? 700 : 600,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                {emptyLabel}
              </button>
            )}
            {filtered.length === 0 ? (
              <p
                style={{
                  padding: "12px 14px",
                  margin: 0,
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "rgba(255,255,255,0.3)",
                }}
              >
                Nenhum resultado.
              </p>
            ) : (
              filtered.map((opt) => {
                const isSelected = opt.id === value;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => pick(opt.id)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 12px",
                      border: "none",
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      backgroundColor: isSelected ? "rgba(191,242,5,0.08)" : "transparent",
                      color: isSelected ? "#BFF205" : "var(--color-text-primary)",
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      fontWeight: isSelected ? 700 : 600,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <LogoSlot url={opt.logo_url} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {opt.label}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
