"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import {
  applyPickerOptionHover,
  clearPickerOptionHover,
  logoPlaceholderStyle,
  pickerChevronStyle,
  pickerDropdownStyle,
  pickerEmptyMessageStyle,
  pickerEmptyOptionStyle,
  pickerOptionRowStyle,
  pickerSearchInputStyle,
  pickerSearchRowStyle,
  pickerTriggerStyle,
} from "@/lib/lab-ui-styles";

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
  /** Opções do dropdown em Inter (var(--font-sans)) */
  menuSans?: boolean;
  /** Trigger em Inter (var(--font-sans)) */
  triggerSans?: boolean;
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
  menuSans = false,
  triggerSans = false,
}: LabPickerProps) {
  const menuFont = menuSans ? "var(--font-sans)" : "var(--font-mono)";
  const triggerFont = triggerSans ? "var(--font-sans)" : "var(--font-mono)";
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.id === value);
  const hasValue = Boolean(selected || (value === "" && allowEmpty));

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
    return <div style={logoPlaceholderStyle} />;
  }

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", minWidth: 140 }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        style={{
          ...pickerTriggerStyle(open, hasValue, triggerFont),
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
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
            ...pickerChevronStyle,
            transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)`,
          }}
        />
      </button>

      {open && (
        <div style={pickerDropdownStyle}>
          <div style={pickerSearchRowStyle}>
            <Search size={14} style={{ color: "var(--color-text-faint)", flexShrink: 0 }} />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              style={pickerSearchInputStyle}
            />
          </div>
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {allowEmpty && (
              <button
                type="button"
                onClick={() => pick("")}
                style={{ ...pickerEmptyOptionStyle(value === "", menuFont), display: "flex", alignItems: "center", gap: 10 }}
              >
                {emptyLabel}
              </button>
            )}
            {filtered.length === 0 ? (
              <p style={pickerEmptyMessageStyle}>Nenhum resultado.</p>
            ) : (
              filtered.map((opt) => {
                const isSelected = opt.id === value;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => pick(opt.id)}
                    style={pickerOptionRowStyle(isSelected, menuFont)}
                    onMouseEnter={(e) => applyPickerOptionHover(e, isSelected)}
                    onMouseLeave={(e) => clearPickerOptionHover(e, isSelected)}
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
