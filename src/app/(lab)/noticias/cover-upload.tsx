"use client";

import { useState, useRef, useCallback } from "react";
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from "react-image-crop";
import { compressNewsImage } from "@/lib/images/compress-news-image";
import "react-image-crop/dist/ReactCrop.css";
import { Upload, X, Check } from "lucide-react";

type Props = {
  existingUrl: string | null;
  onFileReady: (file: File | null) => void;
  onExistingUrl: (url: string | null) => void;
};

function centerAspectCrop(width: number, height: number, aspect: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 90 }, aspect, width, height),
    width,
    height
  );
}

export default function CoverUpload({ existingUrl, onFileReady, onExistingUrl }: Props) {
  const [srcImage, setSrcImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();
  const [preview, setPreview] = useState<string | null>(existingUrl);
  const [cropping, setCropping] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ASPECT = 16 / 9;

  function onSelectFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSrcImage(reader.result as string);
      setCropping(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, ASPECT));
  }

  async function applyCrop() {
    if (!completedCrop || !imgRef.current) return;
    setCompressing(true);

    const image = imgRef.current;
    const canvas = document.createElement("canvas");
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = Math.floor(completedCrop.width * scaleX);
    canvas.height = Math.floor(completedCrop.height * scaleY);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const blob = await new Promise<Blob>((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error("Falha ao exportar recorte"))), "image/png")
    );

    const croppedFile = new File([blob], "cover.png", { type: "image/png" });
    const compressed = await compressNewsImage(croppedFile, "cover");

    const previewUrl = URL.createObjectURL(compressed);
    setPreview(previewUrl);
    onExistingUrl(null);
    onFileReady(compressed);
    setSrcImage(null);
    setCropping(false);
    setCompressing(false);
  }

  function cancelCrop() {
    setSrcImage(null);
    setCropping(false);
  }

  function removeCover() {
    setPreview(null);
    onFileReady(null);
    onExistingUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div>
      {/* Modal de crop */}
      {cropping && srcImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
        >
          <div
            className="flex w-full max-w-2xl flex-col gap-4 rounded-xl p-6"
            style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
          >
            <div className="flex items-center justify-between">
              <p className="font-mono text-sm font-bold uppercase" style={{ color: "var(--color-text-primary)" }}>
                Recortar capa — 16:9
              </p>
              <button type="button" onClick={cancelCrop} style={{ color: "var(--color-text-secondary)" }}>
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            <div className="flex items-center justify-center overflow-hidden rounded" style={{ maxHeight: "400px" }}>
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={ASPECT}
                minWidth={100}
              >
                <img
                  ref={imgRef}
                  src={srcImage}
                  onLoad={onImageLoad}
                  style={{ maxHeight: "400px", maxWidth: "100%", display: "block" }}
                  alt="Recortar"
                />
              </ReactCrop>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={cancelCrop}
                className="rounded px-4 py-2 font-mono text-sm transition-opacity hover:opacity-70"
                style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={applyCrop}
                disabled={compressing || !completedCrop}
                className="flex items-center gap-2 rounded px-4 py-2 font-mono text-sm font-bold uppercase transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ backgroundColor: "var(--color-brand)", color: "#0D0D0D" }}
              >
                <Check size={14} strokeWidth={2.5} />
                {compressing ? "Comprimindo..." : "Aplicar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview ou área de upload */}
      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt="Capa"
            className="w-full rounded object-cover"
            style={{ aspectRatio: "16/9" }}
          />
          <button
            type="button"
            onClick={removeCover}
            className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full"
            style={{ backgroundColor: "rgba(0,0,0,0.7)", color: "#fff" }}
          >
            <X size={12} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-2 right-2 rounded px-2 py-1 font-mono text-xs transition-opacity hover:opacity-80"
            style={{ backgroundColor: "rgba(0,0,0,0.7)", color: "#fff" }}
          >
            Trocar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded py-8 transition-colors hover:bg-white/5"
          style={{ border: "1px dashed var(--color-border)", aspectRatio: "16/9" }}
        >
          <Upload size={20} strokeWidth={1.5} style={{ color: "var(--color-text-secondary)" }} />
          <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
            Clique para enviar
          </span>
          <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)", opacity: 0.6 }}>
            Será recortado em 16:9
          </span>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onSelectFile}
        className="hidden"
      />
    </div>
  );
}