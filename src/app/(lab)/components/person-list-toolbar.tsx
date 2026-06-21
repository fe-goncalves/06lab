"use client";

import { Plus } from "lucide-react";
import { LabPicker, type LabPickerOption } from "@/app/(lab)/components/lab-picker";
import { LabSelect, type LabSelectOption } from "@/app/(lab)/components/lab-select";
import { LabSwitch } from "@/app/(lab)/components/lab-switch";

type PersonListToolbarProps = {
  teamOptions: LabPickerOption[];
  teamFilter: string;
  onTeamFilterChange: (value: string) => void;
  teamPlaceholder?: string;
  secondaryOptions: LabSelectOption[];
  secondaryFilter: string;
  onSecondaryFilterChange: (value: string) => void;
  secondaryPlaceholder?: string;
  activeOnly: boolean;
  onActiveOnlyChange: (value: boolean) => void;
  nameSearch: string;
  onNameSearchChange: (value: string) => void;
  namePlaceholder?: string;
  docSearch: string;
  onDocSearchChange: (value: string) => void;
  docPlaceholder?: string;
  sortBy: string;
  onSortByChange: (value: string) => void;
  sortOptions: LabSelectOption[];
  onNew: () => void;
  newLabel: string;
};

const inputStyle: React.CSSProperties = {
  borderColor: "var(--color-border)",
  backgroundColor: "var(--color-background)",
  color: "var(--color-text-primary)",
};

export function PersonListToolbar({
  teamOptions,
  teamFilter,
  onTeamFilterChange,
  teamPlaceholder = "Todas as equipes",
  secondaryOptions,
  secondaryFilter,
  onSecondaryFilterChange,
  secondaryPlaceholder = "Todos",
  activeOnly,
  onActiveOnlyChange,
  nameSearch,
  onNameSearchChange,
  namePlaceholder = "Buscar por nome ou apelido…",
  docSearch,
  onDocSearchChange,
  docPlaceholder = "Buscar por RG ou CPF…",
  sortBy,
  onSortByChange,
  sortOptions,
  onNew,
  newLabel,
}: PersonListToolbarProps) {
  const ic = "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--color-brand)]";

  return (
    <div className="mb-6 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div style={{ minWidth: 180, flex: "1 1 180px", maxWidth: 280 }}>
          <LabPicker
            options={teamOptions}
            value={teamFilter}
            onChange={onTeamFilterChange}
            emptyLabel={teamPlaceholder}
            searchPlaceholder="Buscar equipe…"
            showLogos
          />
        </div>
        <div style={{ minWidth: 160, flex: "1 1 160px", maxWidth: 240 }}>
          <LabSelect
            value={secondaryFilter}
            onChange={onSecondaryFilterChange}
            placeholder={secondaryPlaceholder}
            options={secondaryOptions}
          />
        </div>
        <LabSwitch
          checked={activeOnly}
          onChange={onActiveOnlyChange}
          label={activeOnly ? "ATIVOS" : "APENAS DESATIVADOS"}
        />
      </div>

      <div className="flex flex-wrap items-start gap-3">
        <input
          type="text"
          placeholder={namePlaceholder}
          value={nameSearch}
          onChange={(e) => onNameSearchChange(e.target.value)}
          className={`${ic} min-w-[200px] flex-1`}
          style={inputStyle}
        />
        <input
          type="text"
          placeholder={docPlaceholder}
          value={docSearch}
          onChange={(e) => onDocSearchChange(e.target.value)}
          className={`${ic} min-w-[200px] flex-1`}
          style={inputStyle}
        />
        <div className="ml-auto flex shrink-0 flex-col gap-2" style={{ minWidth: 160 }}>
          <button
            type="button"
            onClick={onNew}
            className="flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80"
            style={{ backgroundColor: "var(--color-brand)", color: "var(--color-on-brand)" }}
          >
            <Plus size={15} strokeWidth={2.5} />
            {newLabel}
          </button>
          <LabSelect value={sortBy} onChange={onSortByChange} options={sortOptions} />
        </div>
      </div>
    </div>
  );
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function matchNameSearch(
  query: string,
  fullName: string,
  surname: string | null,
): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase().trim();
  const nickname = (surname ?? fullName.split(" ")[0] ?? "").toLowerCase();
  const haystack = `${fullName} ${surname ?? ""} ${nickname}`.toLowerCase();
  return haystack.includes(q);
}

export function matchDocSearch(
  query: string,
  rg: string | null,
  cpf: string | null,
): boolean {
  const q = onlyDigits(query);
  if (!q) return true;
  return onlyDigits(rg ?? "").includes(q) || onlyDigits(cpf ?? "").includes(q);
}

export function matchPersonSearch(
  query: string,
  fullName: string,
  surname: string | null,
  rg: string | null,
  cpf: string | null,
): boolean {
  if (!query.trim()) return true;
  return (
    matchNameSearch(query, fullName, surname) ||
    matchDocSearch(query, rg, cpf)
  );
}

export function isPersonActive(isActive: boolean | null | undefined): boolean {
  return isActive !== false;
}

export function matchActiveFilter(
  showActive: boolean,
  isActive: boolean | null | undefined,
): boolean {
  return showActive ? isPersonActive(isActive) : !isPersonActive(isActive);
}
