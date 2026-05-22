// src/lib/security/uploads.ts
// Utilitários de segurança para uploads de imagem

// Tamanho máximo permitido: 5 MB
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

/**
 * Valida o tipo real do arquivo inspecionando os primeiros bytes (magic bytes).
 * Não confia na extensão nem no Content-Type declarado pelo cliente.
 * Aceita: PNG, JPEG e WebP.
 */
export async function validarTipoImagem(file: File): Promise<boolean> {
  // Lê apenas os primeiros 12 bytes — suficiente para todos os formatos suportados
  const slice = file.slice(0, 12);
  const buffer = await slice.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return true;
  }

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return true;
  }

  // WebP: RIFF????WEBP (bytes 0-3 = "RIFF", bytes 8-11 = "WEBP")
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return true;
  }

  return false;
}

/**
 * Gera um nome de arquivo seguro e imprevisível usando UUID v4.
 * Nunca usa o nome original do arquivo — elimina qualquer vetor de path traversal.
 * @param extensao — a extensão desejada, sem ponto (ex: "jpg", "png")
 */
export function gerarNomeSeguro(extensao: string): string {
  return `${crypto.randomUUID()}.${extensao}`;
}

/**
 * Retorna a extensão correta com base nos magic bytes já validados.
 * Usar após validarTipoImagem retornar true.
 */
export async function extensaoSegura(file: File): Promise<string> {
  const slice = file.slice(0, 12);
  const buffer = await slice.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (bytes[0] === 0x89 && bytes[1] === 0x50) return "png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "jpg";
  if (bytes[8] === 0x57 && bytes[9] === 0x45) return "webp";
  return "bin";
}
