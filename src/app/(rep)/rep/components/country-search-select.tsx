"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { createClient } from "@/lib/supabase";
import {
  applyPickerOptionHover,
  clearPickerOptionHover,
  pickerChevronStyle,
  pickerDropdownStyle,
  pickerEmptyMessageStyle,
  pickerOptionRowStyle,
  pickerSearchInputStyle,
  pickerSearchRowStyle,
  pickerTriggerStyle,
} from "@/lib/lab-ui-styles";
import { transitionFast } from "./rep-ui";

type Country = {
  id: string;
  name: string;
  iso_code: string;
  flag_emoji: string | null;
};

export default function CountrySearchSelect({
  value,
  onChange,
  menuZIndex = 200,
}: {
  value: string;
  onChange: (name: string) => void;
  menuZIndex?: number;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("countries")
      .select("id, name, iso_code, flag_emoji")
      .order("display_order")
      .then(({ data }) => {
        setCountries((data ?? []) as Country[]);
        setLoading(false);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => searchRef.current?.focus(), 0);
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const selected = countries.find(c => c.name === value);
  const q = query.trim().toLowerCase();
  const filtered = q
    ? countries.filter(c =>
        c.name.toLowerCase().includes(q) || c.iso_code.toLowerCase().includes(q),
      )
    : countries;

  function pick(name: string) {
    onChange(name);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          ...pickerTriggerStyle(open, Boolean(value)),
          padding: "10px 36px 10px 12px",
          cursor: "pointer",
          transition: transitionFast,
        }}
      >
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selected ? (
            <>
              {selected.flag_emoji ? `${selected.flag_emoji} ` : ""}
              {selected.name}
            </>
          ) : value || "Selecione…"}
        </span>
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
        <div style={{ ...pickerDropdownStyle, zIndex: menuZIndex }}>
          <div style={pickerSearchRowStyle}>
            <Search size={14} color="var(--color-text-muted)" />
            <input
              ref={searchRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar país…"
              style={pickerSearchInputStyle}
            />
          </div>
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {loading && <p style={pickerEmptyMessageStyle}>Carregando…</p>}
            {!loading && filtered.length === 0 && (
              <p style={pickerEmptyMessageStyle}>Nenhum país encontrado.</p>
            )}
            {filtered.map(c => {
              const isSelected = c.name === value;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => pick(c.name)}
                  style={pickerOptionRowStyle(isSelected)}
                  onMouseEnter={e => applyPickerOptionHover(e, isSelected)}
                  onMouseLeave={e => clearPickerOptionHover(e, isSelected)}
                >
                  <span style={{ fontSize: 16, lineHeight: 1 }}>{c.flag_emoji ?? "🏳️"}</span>
                  <span>{c.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
