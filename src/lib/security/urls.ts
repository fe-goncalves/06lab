// src/lib/security/urls.ts
// Utilitários de segurança para validação de URLs externas

/** Domínios permitidos para links de highlights / vídeos de partidas */
export const DOMINIOS_VIDEO = [
  "youtube.com",
  "youtu.be",
  "vimeo.com",
  "instagram.com",
];

/** Domínios permitidos para redes sociais da organização */
export const DOMINIOS_REDES_SOCIAIS = [
  "instagram.com",
  "youtube.com",
  "tiktok.com",
  "twitter.com",
  "x.com",
];

/**
 * Valida que uma URL:
 * 1. É uma URL válida (parseável)
 * 2. Usa protocolo HTTPS (nunca HTTP, javascript:, data:, etc.)
 * 3. Se `dominiosPermitidos` for fornecido, o hostname deve estar na lista
 *    (aceita subdomínios: "www.youtube.com" bate em "youtube.com")
 *
 * Retorna true se válida, false caso contrário.
 */
export function validarURL(url: string, dominiosPermitidos?: string[]): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  // Apenas HTTPS
  if (parsed.protocol !== "https:") return false;

  // Se lista de domínios fornecida, valida o hostname
  if (dominiosPermitidos && dominiosPermitidos.length > 0) {
    const hostname = parsed.hostname.toLowerCase();
    const permitido = dominiosPermitidos.some((dominio) => {
      return hostname === dominio || hostname.endsWith(`.${dominio}`);
    });
    if (!permitido) return false;
  }

  return true;
}
