export const RANKING_CATEGORY_LABELS: Record<string, string> = {
  participation: "Participação na edição",
  participation_knockout: "Participação no mata-mata",
  advance_knockout: "Classificação no mata-mata",
  win_in_classification: "Vitória (classificatória)",
  draw_in_classification: "Empate (classificatória)",
  loss_in_classification: "Derrota (classificatória)",
  win_in_knockout: "Vitória (mata-mata)",
  draw_in_knockout: "Empate (mata-mata)",
  loss_in_knockout: "Derrota (mata-mata)",
  first_place: "1º lugar (Campeão)",
  second_place: "2º lugar (Vice)",
  third_place: "3º lugar",
  fourth_place: "4º lugar",
  fifth_to_eighth: "5º ao 8º lugar",
  ninth_plus: "9º lugar ou mais",
};

export function rankingCategoryLabel(code: string): string {
  return RANKING_CATEGORY_LABELS[code] ?? code.replaceAll("_", " ");
}
