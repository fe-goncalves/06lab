"use client";



import { useEffect, useRef, useState } from "react";

import { ChevronDown } from "lucide-react";

import {

  applyPickerOptionHover,

  clearPickerOptionHover,

  pickerChevronStyle,

  pickerDropdownStyle,

  pickerEmptyOptionStyle,

  pickerOptionStyle,

  pickerTriggerStyle,

} from "@/lib/lab-ui-styles";



type LabSelectOption = {

  value: string;

  label: string;

  disabled?: boolean;

};



type LabSelectProps = {

  value: string;

  onChange: (value: string) => void;

  options: LabSelectOption[];

  placeholder?: string;

  disabled?: boolean;

  id?: string;

  name?: string;

  style?: React.CSSProperties;

  className?: string;

  autoFocus?: boolean;

  menuZIndex?: number;

  /** Opções do dropdown em Inter (var(--font-sans)) */
  menuSans?: boolean;

  /** Trigger em Inter (var(--font-sans)) */
  triggerSans?: boolean;

};



export function LabSelect({

  value,

  onChange,

  options,

  placeholder,

  disabled = false,

  id,

  name,

  style,

  className,

  menuZIndex = 50,

  menuSans = false,

  triggerSans = false,

}: LabSelectProps) {

  const menuFont = menuSans ? "var(--font-sans)" : "var(--font-mono)";
  const triggerFont = triggerSans ? "var(--font-sans)" : "var(--font-mono)";

  const [open, setOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);



  const selected = options.find((opt) => opt.value === value);

  const hasValue = Boolean(selected || value === "");



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



  function pick(next: string) {

    onChange(next);

    setOpen(false);

  }



  return (

    <div

      ref={containerRef}

      id={id}

      className={className}

      style={{ position: "relative", width: "100%", ...style }}

    >

      {name && <input type="hidden" name={name} value={value} readOnly />}



      <button

        type="button"

        disabled={disabled}

        onClick={() => !disabled && setOpen((v) => !v)}

        style={{

          ...pickerTriggerStyle(open, hasValue, triggerFont),

          padding: "10px 36px 10px 12px",

          cursor: disabled ? "not-allowed" : "pointer",

          opacity: disabled ? 0.5 : 1,

        }}

      >

        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>

          {selected ? selected.label : placeholder ?? "Selecione…"}

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

          <div style={{ maxHeight: 240, overflowY: "auto" }}>

            {placeholder && (

              <button

                type="button"

                onClick={() => pick("")}

                style={pickerEmptyOptionStyle(value === "", menuFont)}

              >

                {placeholder}

              </button>

            )}

            {options.map((opt) => {

              const isSelected = opt.value === value;

              return (

                <button

                  key={opt.value}

                  type="button"

                  disabled={opt.disabled}

                  onClick={() => !opt.disabled && pick(opt.value)}

                  style={{

                    ...pickerOptionStyle(isSelected, 12, menuFont),

                    cursor: opt.disabled ? "not-allowed" : "pointer",

                    opacity: opt.disabled ? 0.4 : 1,

                  }}

                  onMouseEnter={(e) => applyPickerOptionHover(e, isSelected)}

                  onMouseLeave={(e) => clearPickerOptionHover(e, isSelected)}

                >

                  {opt.label}

                </button>

              );

            })}

          </div>

        </div>

      )}

    </div>

  );

}



export type { LabSelectOption, LabSelectProps };


