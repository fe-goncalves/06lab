type SeasonSortable = {
  display_order?: number | null;
  name: string;
};

export function compareSeasons(a: SeasonSortable, b: SeasonSortable): number {
  const orderA = a.display_order ?? 0;
  const orderB = b.display_order ?? 0;
  if (orderA !== orderB) return orderA - orderB;
  return a.name.localeCompare(b.name, "pt-BR");
}

export function sortSeasons<T extends SeasonSortable>(seasons: T[]): T[] {
  return [...seasons].sort(compareSeasons);
}
