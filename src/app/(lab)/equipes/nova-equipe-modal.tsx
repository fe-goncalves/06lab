"use client";

import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { criarEquipe } from "./actions";

type NovaEquipeModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

function rgbToHex(r: number, g: number, b: number): string {
  const to = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function NovaEquipeModal({ isOpen, onClose }: NovaEquipeModalProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [hexColors, setHexColors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) return;

    setFullName("");
    setGender("");
    setFile(null);
    setHexColors([]);
    setLoading(false);
    setError(null);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!previewUrl) {
      setHexColors([]);
      return;
    }
  
    if (file?.type === "image/svg+xml") {
      setHexColors([]);
      return;
    }
  
    const img = document.createElement("img");
    img.src = previewUrl;
  
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const size = 100;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
  
        ctx.drawImage(img, 0, 0, size, size);
        const imageData = ctx.getImageData(0, 0, size, size).data;
  
        // Conta frequência de cores agrupadas em blocos de 24 (reduz variações sutis)
        const colorMap: Record<string, number> = {};
  
        for (let i = 0; i < imageData.length; i += 4) {
          const a = imageData[i + 3];
          if (a < 128) continue; // ignora transparente
  
          const r = Math.round(imageData[i] / 24) * 24;
          const g = Math.round(imageData[i + 1] / 24) * 24;
          const b = Math.round(imageData[i + 2] / 24) * 24;
  
          // Ignora preto, branco e cinzas
          const isNeutral = Math.abs(r - g) < 20 && Math.abs(g - b) < 20 && Math.abs(r - b) < 20;
          if (isNeutral && r > 220) continue; // branco
          if (isNeutral && r < 30) continue;  // preto
  
          const key = `${r},${g},${b}`;
          colorMap[key] = (colorMap[key] ?? 0) + 1;
        }
  
        // Ordena por frequência e pega as 3 mais dominantes
        const sorted = Object.entries(colorMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([key]) => {
            const [r, g, b] = key.split(",").map(Number);
            return rgbToHex(r, g, b);
          });
  
        // Se não encontrou cores suficientes, completa com o que tem
        setHexColors(sorted);
      } catch {
        setHexColors([]);
      }
    };
  
    img.onerror = () => {
      setHexColors([]);
    };
  
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [previewUrl, file]);

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const next = e.target.files?.[0] ?? null;

      setPreviewUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return next ? URL.createObjectURL(next) : null;
      });

      setFile(next);

      if (next?.type === "image/svg+xml") {
        setHexColors([]);
      }
    },
    [],
  );

  async function handleSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setError(null);
    setLoading(true);
  
    try {
      const formData = new FormData();
      formData.append("full_name", fullName.trim());
      formData.append("gender", gender);
      if (file) formData.append("logo", file);
      if (hexColors[0]) formData.append("primary_color", hexColors[0]);
      if (hexColors[1]) formData.append("secondary_color", hexColors[1]);
      if (hexColors[2]) formData.append("tertiary_color", hexColors[2]);
  
      const result = await criarEquipe(formData);
      console.log("result:", result);
  
      if (result.error) {
        setError(result.error);
        return;
      }
  
      if (!result.id) {
        setError("Não foi possível obter o ID da equipe criada.");
        return;
      }
  
      router.push(`/equipes/${result.id}`);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="nova-equipe-title"
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border p-6 shadow-lg"
        style={{
          backgroundColor: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <h2
            id="nova-equipe-title"
            className="text-lg font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            Nova equipe
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-2 py-1 text-sm leading-none transition-colors hover:bg-[color-mix(in_oklab,var(--color-brand)_12%,transparent)]"
            style={{
              borderColor: "var(--color-border)",
              color: "var(--color-text-secondary)",
            }}
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="nova-equipe-nome"
              className="text-sm font-medium"
              style={{ color: "var(--color-text-primary)" }}
            >
              Nome completo
            </label>
            <input
              id="nova-equipe-nome"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
              style={{
                borderColor: "var(--color-border)",
                backgroundColor: "var(--color-background)",
                color: "var(--color-text-primary)",
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="nova-equipe-genero"
              className="text-sm font-medium"
              style={{ color: "var(--color-text-primary)" }}
            >
              Gênero
            </label>
            <select
              id="nova-equipe-genero"
              required
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
              style={{
                borderColor: "var(--color-border)",
                backgroundColor: "var(--color-background)",
                color: "var(--color-text-primary)",
              }}
            >
              <option value="">Selecione…</option>
              <option value="male">Masculino</option>
              <option value="female">Feminino</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="nova-equipe-logo"
              className="text-sm font-medium"
              style={{ color: "var(--color-text-primary)" }}
            >
              Logo
            </label>
            <input
              id="nova-equipe-logo"
              type="file"
              accept="image/png,image/webp,image/svg+xml"
              onChange={handleFileChange}
              className="text-sm file:mr-3 file:rounded-md file:border-0 file:px-3 file:py-1.5 file:text-sm"
              style={{ color: "var(--color-text-secondary)" }}
            />

            {previewUrl ? (
              <div className="mt-2 flex flex-col gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Pré-visualização da logo"
                  className="mx-auto max-h-40 max-w-full rounded-lg border object-contain"
                  style={{ borderColor: "var(--color-border)" }}
                />
                <div className="flex flex-wrap items-end justify-center gap-4">
                  {hexColors.map((hex, i) => (
                    <div
                      key={`${hex}-${i}`}
                      className="flex flex-col items-center gap-1"
                    >
                      <span
                        className="h-8 w-8 rounded-full border-2"
                        style={{
                          backgroundColor: hex,
                          borderColor: "var(--color-border)",
                        }}
                        aria-hidden
                      />
                      <span
                        className="font-mono text-xs"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        {hex}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {error ? (
            <p
              className="rounded-lg border px-3 py-2 text-sm"
              style={{
                borderColor: "var(--color-border)",
                backgroundColor: "var(--color-background)",
                color: "var(--color-text-primary)",
              }}
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              backgroundColor: "var(--color-brand)",
              color: "var(--color-background)",
            }}
          >
            {loading ? "Salvando…" : "Criar equipe"}
          </button>
        </form>
      </div>
    </div>
  );
}

function nextSafeFilename(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "logo";
  return trimmed.replace(/[^\w.\-]/g, "_");
}
