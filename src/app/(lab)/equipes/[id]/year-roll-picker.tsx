"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import styles from "./equipe-hub.module.css";

const MIN_YEAR = 1850;

function buildYears(): number[] {
  const current = new Date().getFullYear();
  const years: number[] = [];
  for (let y = current; y >= MIN_YEAR; y--) years.push(y);
  return years;
}

const YEARS = buildYears();

type YearRollPickerProps = {
  value: string;
  onChange: (year: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

export function YearRollPicker({ value, onChange, placeholder = "—", disabled = false }: YearRollPickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const display = value.trim() || placeholder;

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const selected = value ? Number(value) : new Date().getFullYear();
    const el = listRef.current.querySelector(`[data-year="${selected}"]`);
    if (el) el.scrollIntoView({ block: "center" });
  }, [open, value]);

  function pick(year: string) {
    onChange(year);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className={styles.yearPicker}>
      <button
        type="button"
        onClick={() => { if (!disabled) setOpen((v) => !v); }}
        className={`${styles.input} ${styles.yearPickerTrigger} ${disabled ? styles.yearPickerTriggerDisabled : ""}`}
        aria-expanded={open}
        disabled={disabled}
      >
        <span className={value.trim() ? styles.yearPickerValue : styles.yearPickerPlaceholder}>
          {display}
        </span>
        <ChevronDown
          size={14}
          strokeWidth={2}
          className={styles.yearPickerChevron}
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {open && (
        <div className={styles.yearPickerMenu}>
          <button type="button" className={styles.yearPickerClear} onClick={() => pick("")}>
            Limpar
          </button>
          <div ref={listRef} className={styles.yearPickerList}>
            {YEARS.map((year) => {
              const str = String(year);
              const isSelected = value === str;
              return (
                <button
                  key={year}
                  type="button"
                  data-year={year}
                  className={`${styles.yearPickerItem} ${isSelected ? styles.yearPickerItemActive : ""}`}
                  onClick={() => pick(str)}
                >
                  {year}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
