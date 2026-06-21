/** Identidade visual fixa do 06.lab — sempre usar para chrome/UI, nunca cores de equipe/org. */
export const LAB_ACCENT = "var(--color-brand)";
export const LAB_ACCENT_HEX = "#BFF205";
const LAB_RGB = "191,242,5";

/** Opacidade em sufixo hex (ex: labAccentHexAlpha("22") → #BFF20522). */
export function labAccentHexAlpha(suffix: string) {
  return `${LAB_ACCENT_HEX}${suffix}`;
}

export function labAccentRgba(alpha: number) {
  return `rgba(${LAB_RGB},${alpha})`;
}

export const LAB_HEADER_GRADIENT =
  "linear-gradient(135deg, rgba(191,242,5,0.06) 0%, transparent 55%)";

export const LAB_STRIPE_GRADIENT =
  "linear-gradient(90deg, rgba(191,242,5,0.5) 0%, transparent 60%)";

/** Cor de equipe/org com fallback para o brand do lab (listas, hovers contextuais). */
export function entityColorHex(color: string | null | undefined) {
  return color && color.startsWith("#") ? color : LAB_ACCENT_HEX;
}

export function entityColorHexAlpha(color: string | null | undefined, suffix: string) {
  return `${entityColorHex(color)}${suffix}`;
}
