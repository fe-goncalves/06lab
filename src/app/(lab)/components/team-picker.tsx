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
  pickerOptionRowStyle,
  pickerSearchInputStyle,
  pickerSearchRowStyle,
  pickerTriggerStyle,
} from "@/lib/lab-ui-styles";

export interface TeamPickerTeam {
  id: string;
  full_name: string;
  short_name: string | null;
  logo_url: string | null;
}

interface TeamPickerProps {
  teams: TeamPickerTeam[];
  value: string;
  onChange: (teamId: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

function teamLabel(team: TeamPickerTeam): string {
  return team.short_name ?? team.full_name;
}

export function TeamPicker({
  teams,
  value,
  onChange,
  placeholder = "Selecione…",
  disabled = false,
}: TeamPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = teams.find((t) => t.id === value);

  const filtered = teams.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t.full_name.toLowerCase().includes(q) ||
      (t.short_name?.toLowerCase().includes(q) ?? false)
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

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        style={{
          ...pickerTriggerStyle(open, Boolean(selected)),
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {selected ? (
          <>
            {selected.logo_url ? (
              <img
                src={selected.logo_url}
                alt=""
                style={{ width: 24, height: 24, objectFit: "contain", flexShrink: 0 }}
              />
            ) : (
              <div style={logoPlaceholderStyle} />
            )}
            <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {teamLabel(selected)}
            </span>
          </>
        ) : (
          <span style={{ flex: 1 }}>{placeholder}</span>
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
              placeholder="Buscar equipe…"
              style={pickerSearchInputStyle}
            />
          </div>
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <p style={pickerEmptyMessageStyle}>Nenhuma equipe encontrada.</p>
            ) : (
              filtered.map((team) => {
                const isSelected = team.id === value;
                return (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => {
                      onChange(team.id);
                      setOpen(false);
                    }}
                    style={pickerOptionRowStyle(isSelected)}
                    onMouseEnter={(e) => applyPickerOptionHover(e, isSelected)}
                    onMouseLeave={(e) => clearPickerOptionHover(e, isSelected)}
                  >
                    {team.logo_url ? (
                      <img
                        src={team.logo_url}
                        alt=""
                        style={{ width: 24, height: 24, objectFit: "contain", flexShrink: 0 }}
                      />
                    ) : (
                      <div style={logoPlaceholderStyle} />
                    )}
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {teamLabel(team)}
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
