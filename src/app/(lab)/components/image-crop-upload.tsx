"use client";

import { useEffect, useRef, useState } from "react";
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from "react-image-crop";
import { compressNewsImage } from "@/lib/images/compress-news-image";
import "react-image-crop/dist/ReactCrop.css";
import { X, Check, ImagePlus } from "lucide-react";

type ImageCropUploadProps = {
  value: File | null;
  onChange: (file: File | null) => void;
  existingUrl?: string | null;
  aspect?: number;
  label?: string;
  placeholder?: string;
  accept?: string;
};

function centerAspectCrop(width: number, height: number, aspect: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 90 }, aspect, width, height),
    width,
    height
  );
}

function aspectLabel(aspect: number): string {
  if (aspect === 1) return "1:1";
  const w = Math.round(aspect * 100);
  const h = 100;
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const g = gcd(w, h);
  return `${w / g}:${h / g}`;
}

export function ImageCropUpload({
  value,
  onChange,
  existingUrl = null,
  aspect = 1,
  label,
  placeholder = "Clique para enviar logo",
  accept = "image/png,image/webp,image/jpeg",
}: ImageCropUploadProps) {
  const [srcImage, setSrcImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();
  const [preview, setPreview] = useState<string | null>(existingUrl);
  const [cropping, setCropping] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value) {
      const url = URL.createObjectURL(value);
      setPreview((prev) => {
        if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
        return url;
      });
      return () => URL.revokeObjectURL(url);
    }
    if (!value && existingUrl) {
      setPreview(existingUrl);
    } else if (!value && !existingUrl) {
      setPreview((prev) => {
        if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
        return null;
      });
    }
  }, [value, existingUrl]);

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
    setCrop(centerAspectCrop(width, height, aspect));
  }

  async function applyCrop() {
    if (!completedCrop || !imgRef.current) return;
    setCompressing(true);

    try {
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

      const croppedFile = new File([blob], "logo.png", { type: "image/png" });
      const compressed = await compressNewsImage(croppedFile, "body");
      onChange(compressed);
      setSrcImage(null);
      setCropping(false);
    } finally {
      setCompressing(false);
    }
  }

  function cancelCrop() {
    setSrcImage(null);
    setCropping(false);
  }

  function removeImage() {
    onChange(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const ratioLabel = aspectLabel(aspect);

  return (
    <div>
      {label && (
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.3)",
            display: "block",
            marginBottom: 8,
          }}
        >
          {label}
        </span>
      )}

      {cropping && srcImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-6"
          style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
        >
          <div
            className="flex w-full max-w-lg flex-col gap-4 rounded-xl p-6"
            style={{ backgroundColor: "#0e0e0e", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="flex items-center justify-between">
              <p
                className="font-mono text-sm font-bold uppercase"
                style={{ color: "var(--color-text-primary)" }}
              >
                Recortar — {ratioLabel}
              </p>
              <button type="button" onClick={cancelCrop} style={{ color: "var(--color-text-secondary)" }}>
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            <div className="flex items-center justify-center overflow-hidden rounded" style={{ maxHeight: "360px" }}>
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={aspect}
                minWidth={48}
              >
                <img
                  ref={imgRef}
                  src={srcImage}
                  onLoad={onImageLoad}
                  style={{ maxHeight: "360px", maxWidth: "100%", display: "block" }}
                  alt="Recortar"
                />
              </ReactCrop>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={cancelCrop}
                className="rounded px-4 py-2 font-mono text-sm transition-opacity hover:opacity-70"
                style={{ border: "1px solid rgba(255,255,255,0.08)", color: "var(--color-text-secondary)" }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={applyCrop}
                disabled={compressing || !completedCrop}
                className="flex items-center gap-2 rounded px-4 py-2 font-mono text-sm font-bold uppercase transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ backgroundColor: "#BFF205", color: "#0D0D0D" }}
              >
                <Check size={14} strokeWidth={2.5} />
                {compressing ? "Comprimindo…" : "Aplicar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {preview ? (
        <div style={{ position: "relative", width: 100, height: 100 }}>
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: aspect === 1 ? 14 : 8,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.08)",
              backgroundColor: "rgba(255,255,255,0.03)",
            }}
          >
            <img
              src={preview}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>
          <button
            type="button"
            onClick={removeImage}
            style={{
              position: "absolute",
              top: -6,
              right: -6,
              width: 22,
              height: 22,
              borderRadius: "50%",
              border: "none",
              backgroundColor: "rgba(0,0,0,0.8)",
              color: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={12} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              position: "absolute",
              bottom: -6,
              right: -6,
              padding: "2px 6px",
              borderRadius: 4,
              border: "none",
              backgroundColor: "rgba(0,0,0,0.8)",
              color: "#fff",
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
              fontSize: 9,
            }}
          >
            Trocar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: 100,
            height: 100,
            borderRadius: aspect === 1 ? 14 : 8,
            border: "2px dashed rgba(255,255,255,0.12)",
            backgroundColor: "rgba(255,255,255,0.03)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            cursor: "pointer",
            transition: "border-color 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(191,242,5,0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
          }}
        >
          <ImagePlus size={20} strokeWidth={1.5} style={{ color: "rgba(255,255,255,0.25)" }} />
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 8,
              color: "rgba(255,255,255,0.25)",
              textAlign: "center",
              padding: "0 6px",
              lineHeight: 1.3,
            }}
          >
            {placeholder}
          </span>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={onSelectFile}
        style={{ display: "none" }}
      />
    </div>
  );
}
