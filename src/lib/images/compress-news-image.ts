import imageCompression from "browser-image-compression";

export type NewsImagePreset = "cover" | "body";

const PRESETS = {
  cover: {
    maxSizeMB: 1.25,
    maxWidthOrHeight: 1920,
    initialQuality: 0.92,
  },
  body: {
    maxSizeMB: 0.9,
    maxWidthOrHeight: 1600,
    initialQuality: 0.9,
  },
} as const;

const WEBP = "image/webp";

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler as dimensões da imagem."));
    };
    img.src = url;
  });
}

function needsCompression(
  file: File,
  maxBytes: number,
  maxWidthOrHeight: number,
  dimensions: { width: number; height: number },
): boolean {
  if (file.size > maxBytes) return true;
  const longest = Math.max(dimensions.width, dimensions.height);
  return longest > maxWidthOrHeight;
}

/**
 * Reduz peso para publicação em notícias (capa ou corpo), priorizando qualidade visual.
 * Usa WebP e só reencoda quando o arquivo ainda excede tamanho ou resolução alvo.
 */
export async function compressNewsImage(file: File, preset: NewsImagePreset): Promise<File> {
  const { maxSizeMB, maxWidthOrHeight, initialQuality } = PRESETS[preset];
  const maxBytes = maxSizeMB * 1024 * 1024;

  let dimensions: { width: number; height: number };
  try {
    dimensions = await readImageDimensions(file);
  } catch {
    dimensions = { width: maxWidthOrHeight + 1, height: maxWidthOrHeight + 1 };
  }

  if (!needsCompression(file, maxBytes, maxWidthOrHeight, dimensions)) {
    return file;
  }

  const compressed = await imageCompression(file, {
    maxSizeMB,
    maxWidthOrHeight,
    useWebWorker: true,
    fileType: WEBP,
    initialQuality,
    maxIteration: 8,
  });

  const baseName = file.name.replace(/\.[^.]+$/, "") || preset;
  return new File([compressed], `${baseName}.webp`, {
    type: WEBP,
    lastModified: Date.now(),
  });
}

export function newsImageContentType(file: File): string {
  return file.type || WEBP;
}
