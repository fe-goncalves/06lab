export type StintRecord = {
  id: string;
  team_id: string;
  started_at: string;
  ended_at: string | null;
  is_current: boolean;
  is_active: boolean;
  hide_free_after?: boolean;
  teams: {
    id: string;
    full_name: string;
    short_name?: string | null;
    abbreviation?: string | null;
    logo_url: string | null;
  } | null;
};

export type StintTeam = {
  id: string;
  full_name: string;
  short_name: string | null;
  logo_url: string | null;
};

export function formatDateToBR(iso: string | null): string {
  if (!iso) return "";
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function applyDateMask(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function parseDateToISO(br: string): string | null {
  const clean = br.replace(/\D/g, "");
  if (clean.length !== 8) return null;
  return `${clean.slice(4, 8)}-${clean.slice(2, 4)}-${clean.slice(0, 2)}`;
}

export function teamShortLabel(stint: StintRecord): string {
  const t = stint.teams;
  return (t?.short_name ?? t?.abbreviation ?? t?.full_name ?? "—").toUpperCase();
}

export function formatStintRange(stint: StintRecord): string {
  const start = formatDateToBR(stint.started_at);
  const end = stint.ended_at ? formatDateToBR(stint.ended_at) : "atual";
  return `${start} – ${end}`;
}

export function isCurrentStint(stint: StintRecord): boolean {
  return stint.ended_at === null || stint.is_current;
}

/** Atual primeiro; demais por data de início (mais recente primeiro). */
export function sortStintsForDisplay(stints: StintRecord[]): StintRecord[] {
  return [...stints].sort((a, b) => {
    const aCur = isCurrentStint(a);
    const bCur = isCurrentStint(b);
    if (aCur && !bCur) return -1;
    if (!aCur && bCur) return 1;
    return b.started_at.localeCompare(a.started_at);
  });
}

export function hasCurrentStint(stints: StintRecord[]): boolean {
  return stints.some(isCurrentStint);
}

/** Data desde a qual está sem clube (fim do último vínculo). */
export function getFreeSinceDate(stints: StintRecord[]): string | null {
  if (hasCurrentStint(stints)) return null;
  const ended = stints
    .filter((s) => s.ended_at)
    .sort((a, b) => (b.ended_at ?? "").localeCompare(a.ended_at ?? ""));
  return ended[0]?.ended_at ?? null;
}

function openEnded(end: string | null): string {
  return end ?? "9999-12-31";
}

export function rangesOverlap(
  aStart: string,
  aEnd: string | null,
  bStart: string,
  bEnd: string | null,
): boolean {
  return aStart <= openEnded(bEnd) && bStart <= openEnded(aEnd);
}

export function validateStintPeriod(
  stints: StintRecord[],
  stintId: string,
  startedAt: string,
  endedAt: string | null,
  isCurrent: boolean,
): string | null {
  if (endedAt && startedAt > endedAt) return "A data de fim não pode ser anterior ao início.";
  const effectiveEnd = isCurrent ? null : endedAt;
  for (const other of stints) {
    if (other.id === stintId) continue;
    if (rangesOverlap(startedAt, effectiveEnd, other.started_at, other.ended_at)) {
      return "O período conflita com outro vínculo.";
    }
  }
  if (isCurrent) {
    const others = stints.filter((s) => s.id !== stintId);
    const latestOther = others.reduce((max, s) => (s.started_at > max ? s.started_at : max), "");
    if (latestOther && startedAt < latestOther) {
      return "Só pode ser atual se a data de início for a mais recente.";
    }
  }
  return null;
}

export function validateTransferDate(
  stints: StintRecord[],
  startedAt: string,
  leaveFree: boolean,
): string | null {
  const current = stints.find(isCurrentStint);
  if (!current) {
    if (leaveFree) return "Já está sem clube.";
    for (const s of stints) {
      if (rangesOverlap(startedAt, null, s.started_at, s.ended_at)) {
        return "A data conflita com um vínculo existente.";
      }
    }
    return null;
  }
  if (startedAt <= current.started_at) {
    return "A data deve ser posterior ao início do vínculo atual.";
  }
  for (const s of stints) {
    if (s.id === current.id) continue;
    if (rangesOverlap(startedAt, null, s.started_at, s.ended_at)) {
      return "A data conflita com um vínculo anterior.";
    }
  }
  return null;
}

export function validateStintDeletion(stints: StintRecord[], stintId: string): string | null {
  const stint = stints.find((s) => s.id === stintId);
  if (!stint) return "Vínculo não encontrado.";

  if (isCurrentStint(stint)) {
    return "Não é possível excluir o vínculo atual. Transfira ou encerre antes.";
  }

  const chron = [...stints]
    .filter((s) => s.id !== stintId)
    .sort((a, b) => a.started_at.localeCompare(b.started_at));

  for (let i = 1; i < chron.length; i++) {
    const prev = chron[i - 1];
    const next = chron[i];
    if (rangesOverlap(prev.started_at, prev.ended_at, next.started_at, next.ended_at)) {
      return "Excluir este vínculo deixaria períodos sobrepostos no histórico.";
    }
  }

  return null;
}

export function subtractDay(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function addDay(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function parsePastFreePeriodId(id: string): { prevId: string; nextId: string } | null {
  if (id === "free:current") return null;
  const parts = id.split(":");
  if (parts.length !== 3 || parts[0] !== "free") return null;
  const prevId = parts[1];
  const nextId = parts[2];
  if (!prevId || !nextId) return null;
  return { prevId, nextId };
}

export type FreePeriodRecord = {
  id: string;
  started_at: string;
  ended_at: string | null;
  isCurrent: boolean;
  isHidden: boolean;
  prevStintId: string;
  nextStintId: string | null;
};

export function getPrevStintForFreePeriod(
  free: FreePeriodRecord,
  stints: StintRecord[],
): StintRecord | null {
  return stints.find((s) => s.id === free.prevStintId) ?? null;
}

export function getNextStintForFreePeriod(
  free: FreePeriodRecord,
  stints: StintRecord[],
): StintRecord | null {
  if (!free.nextStintId) return null;
  return stints.find((s) => s.id === free.nextStintId) ?? null;
}

export function validateFreePeriodRemoval(
  stints: StintRecord[],
  free: FreePeriodRecord,
): string | null {
  if (free.isCurrent) {
    return "O período sem clube atual não pode ser excluído. Transfira para uma equipe.";
  }
  const prev = getPrevStintForFreePeriod(free, stints);
  const next = getNextStintForFreePeriod(free, stints);
  if (!prev || !next) return "Vínculos adjacentes não encontrados.";
  return validateStintPeriod(stints, next.id, prev.ended_at!, next.ended_at, isCurrentStint(next));
}

export type TimelineItem =
  | { kind: "stint"; stint: StintRecord }
  | { kind: "free"; free: FreePeriodRecord };

/** Períodos sem clube entre vínculos (e o atual, se não houver time). */
export function computeFreePeriods(stints: StintRecord[]): FreePeriodRecord[] {
  const periods: FreePeriodRecord[] = [];
  const chron = [...stints].sort((a, b) => a.started_at.localeCompare(b.started_at));

  for (let i = 1; i < chron.length; i++) {
    const prev = chron[i - 1];
    const next = chron[i];
    if (!prev.ended_at) continue;

    const freeStart = prev.ended_at;
    const freeEnd = subtractDay(next.started_at);
    if (freeStart <= freeEnd) {
      periods.push({
        id: `free:${prev.id}:${next.id}`,
        started_at: freeStart,
        ended_at: freeEnd,
        isCurrent: false,
        isHidden: prev.hide_free_after === true,
        prevStintId: prev.id,
        nextStintId: next.id,
      });
    }
  }

  if (!hasCurrentStint(stints)) {
    const since = getFreeSinceDate(stints);
    if (since) {
      const prev = stints.find((s) => s.ended_at === since) ?? null;
      periods.push({
        id: "free:current",
        started_at: since,
        ended_at: null,
        isCurrent: true,
        isHidden: prev?.hide_free_after === true,
        prevStintId: prev?.id ?? "",
        nextStintId: null,
      });
    }
  }

  return periods;
}

export function formatFreeRange(free: FreePeriodRecord): string {
  const start = formatDateToBR(free.started_at);
  const end = free.ended_at ? formatDateToBR(free.ended_at) : "atual";
  return `${start} – ${end}`;
}

/** Atual primeiro; demais por data de início (mais recente primeiro). */
export function buildTimelineItems(stints: StintRecord[]): TimelineItem[] {
  const freePeriods = computeFreePeriods(stints);
  const items: TimelineItem[] = [
    ...stints.map((stint) => ({ kind: "stint" as const, stint })),
    ...freePeriods.map((free) => ({ kind: "free" as const, free })),
  ];

  return items.sort((a, b) => {
    const aCur = a.kind === "stint" ? isCurrentStint(a.stint) : a.free.isCurrent;
    const bCur = b.kind === "stint" ? isCurrentStint(b.stint) : b.free.isCurrent;
    if (aCur && !bCur) return -1;
    if (!aCur && bCur) return 1;

    const aStart = a.kind === "stint" ? a.stint.started_at : a.free.started_at;
    const bStart = b.kind === "stint" ? b.stint.started_at : b.free.started_at;
    return bStart.localeCompare(aStart);
  });
}
