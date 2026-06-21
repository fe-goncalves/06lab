"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  applyDateMask,
  formatDateToBR,
  parseDateToISO,
} from "@/app/(lab)/components/stint-timeline-utils";
import styles from "./entity-hub.module.css";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

type BirthDatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
  placeholder?: string;
};

function brToDate(br: string): Date | null {
  const iso = parseDateToISO(br);
  if (!iso) return null;
  return new Date(`${iso}T12:00:00`);
}

function dateToBR(date: Date): string {
  return formatDateToBR(
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
  );
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

export function BirthDatePicker({
  value,
  onChange,
  id,
  disabled = false,
  placeholder = "DD/MM/AAAA",
}: BirthDatePickerProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => {
    const parsed = brToDate(value);
    return parsed ?? new Date();
  });

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    const parsed = brToDate(value);
    setViewMonth(parsed ?? new Date());
  }, [open, value]);

  const selectedDate = useMemo(() => brToDate(value), [value]);
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    return d;
  }, []);

  const calendarDays = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const first = new Date(year, month, 1);
    const startOffset = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<{ date: Date; inMonth: boolean } | null> = [];

    for (let i = 0; i < startOffset; i++) cells.push(null);

    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({ date: new Date(year, month, day, 12, 0, 0, 0), inMonth: true });
    }

    return cells;
  }, [viewMonth]);

  function pickDate(date: Date) {
    onChange(dateToBR(date));
    setOpen(false);
  }

  function shiftMonth(delta: number) {
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1, 12, 0, 0, 0));
  }

  const modal = open && mounted && !disabled
    ? createPortal(
        <div className={styles.cropOverlay} onClick={() => setOpen(false)}>
          <div
            className={styles.dateModalPanel}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Selecionar data de nascimento"
          >
            <div className={styles.cropHeader}>
              <p className={styles.cropTitle}>Data de nascimento</p>
              <button type="button" className={styles.cropClose} onClick={() => setOpen(false)} aria-label="Fechar">
                <X size={16} strokeWidth={2} />
              </button>
            </div>

            <div className={styles.dateModalNav}>
              <button type="button" className={styles.dateModalNavBtn} onClick={() => shiftMonth(-1)} aria-label="Mês anterior">
                <ChevronLeft size={16} strokeWidth={2} />
              </button>
              <span className={styles.dateModalMonth}>
                {MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
              </span>
              <button type="button" className={styles.dateModalNavBtn} onClick={() => shiftMonth(1)} aria-label="Próximo mês">
                <ChevronRight size={16} strokeWidth={2} />
              </button>
            </div>

            <div className={styles.dateModalWeekdays}>
              {WEEKDAYS.map((day) => (
                <span key={day} className={styles.dateModalWeekday}>{day}</span>
              ))}
            </div>

            <div className={styles.dateModalGrid}>
              {calendarDays.map((cell, idx) => {
                if (!cell) return <span key={`empty-${idx}`} className={styles.dateModalEmpty} />;
                const isSelected = selectedDate ? sameDay(cell.date, selectedDate) : false;
                const isToday = sameDay(cell.date, today);
                return (
                  <button
                    key={cell.date.toISOString()}
                    type="button"
                    className={[
                      styles.dateModalDay,
                      isSelected ? styles.dateModalDaySelected : "",
                      isToday ? styles.dateModalDayToday : "",
                    ].filter(Boolean).join(" ")}
                    onClick={() => pickDate(cell.date)}
                  >
                    {cell.date.getDate()}
                  </button>
                );
              })}
            </div>

            <div className={styles.cropActions}>
              <button
                type="button"
                className={styles.cropBtnSecondary}
                onClick={() => { onChange(""); setOpen(false); }}
              >
                Limpar
              </button>
              <button type="button" className={styles.cropBtnPrimary} onClick={() => setOpen(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      {modal}
      <div className={`${styles.datePicker} ${disabled ? styles.datePickerDisabled : ""}`}>
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(applyDateMask(e.target.value))}
          onPaste={(e) => {
            e.preventDefault();
            onChange(applyDateMask(e.clipboardData.getData("text")));
          }}
          placeholder={placeholder}
          maxLength={10}
          className={`${styles.input} ${styles.datePickerInput}`}
          disabled={disabled}
        />
        <button
          type="button"
          className={styles.datePickerBtn}
          onClick={() => { if (!disabled) setOpen(true); }}
          disabled={disabled}
          aria-label="Abrir calendário"
        >
          <Calendar size={15} strokeWidth={2} />
        </button>
      </div>
    </>
  );
}
