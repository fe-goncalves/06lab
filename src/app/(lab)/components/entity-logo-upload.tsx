"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from "react-image-crop";
import { compressNewsImage } from "@/lib/images/compress-news-image";
import "react-image-crop/dist/ReactCrop.css";
import { X, Check, Upload } from "lucide-react";
import { PersonAvatarPlaceholder } from "./person-avatar-placeholder";
import styles from "./entity-hub.module.css";

function centerAspectCrop(width: number, height: number, aspect: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 90 }, aspect, width, height),
    width,
    height,
  );
}

type EntityLogoUploadProps = {
  value: File | null;
  onChange: (file: File | null) => void;
  existingUrl?: string | null;
  disabled?: boolean;
  label?: string;
  hint?: string;
  round?: boolean;
};

export function EntityLogoUpload({
  value,
  onChange,
  existingUrl = null,
  disabled = false,
  label = "Logo",
  hint = "PNG, JPG ou WebP · proporção 1:1 recomendada",
  round = false,
}: EntityLogoUploadProps) {
  const [srcImage, setSrcImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();
  const [preview, setPreview] = useState<string | null>(existingUrl);
  const [cropping, setCropping] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [imgDisplay, setImgDisplay] = useState({ width: 0, height: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

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
      setImgDisplay({ width: 0, height: 0 });
      setCropping(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget;
    const maxW = 288;
    const maxH = 160;
    const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);
    const width = Math.max(1, Math.floor(img.naturalWidth * scale));
    const height = Math.max(1, Math.floor(img.naturalHeight * scale));
    setImgDisplay({ width, height });
    setCrop(centerAspectCrop(width, height, 1));
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
        canvas.height,
      );
      const blob = await new Promise<Blob>((res, rej) =>
        canvas.toBlob((b) => (b ? res(b) : rej(new Error("Falha ao exportar recorte"))), "image/png"),
      );
      const croppedFile = new File([blob], "photo.png", { type: "image/png" });
      const compressed = await compressNewsImage(croppedFile, "body");
      onChange(compressed);
      setSrcImage(null);
      setCropping(false);
      setImgDisplay({ width: 0, height: 0 });
    } finally {
      setCompressing(false);
    }
  }

  function cancelCrop() {
    setSrcImage(null);
    setCropping(false);
    setImgDisplay({ width: 0, height: 0 });
  }

  function removeImage() {
    onChange(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const previewClass = round
    ? `${styles.logoUploadPreview} ${styles.photoUploadPreview}`
    : styles.logoUploadPreview;
  const imgClass = round
    ? `${styles.logoUploadImg} ${styles.photoUploadImg}`
    : styles.logoUploadImg;

  const cropModal = cropping && srcImage && mounted
    ? createPortal(
        <div className={styles.cropOverlay} onClick={cancelCrop}>
          <div
            className={styles.cropPanel}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Recortar imagem"
          >
            <div className={styles.cropHeader}>
              <p className={styles.cropTitle}>Recortar — 1:1</p>
              <button type="button" className={styles.cropClose} onClick={cancelCrop} aria-label="Fechar">
                <X size={16} strokeWidth={2} />
              </button>
            </div>
            <div
              className={styles.cropViewport}
              style={imgDisplay.width ? { width: imgDisplay.width, height: imgDisplay.height } : undefined}
            >
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
                minWidth={48}
              >
                <img
                  ref={imgRef}
                  src={srcImage}
                  onLoad={onImageLoad}
                  width={imgDisplay.width || undefined}
                  height={imgDisplay.height || undefined}
                  className={styles.cropImage}
                  alt="Recortar"
                />
              </ReactCrop>
            </div>
            <div className={styles.cropActions}>
              <button type="button" className={styles.cropBtnSecondary} onClick={cancelCrop}>
                Cancelar
              </button>
              <button
                type="button"
                className={styles.cropBtnPrimary}
                onClick={applyCrop}
                disabled={compressing || !completedCrop}
              >
                <Check size={13} strokeWidth={2.5} />
                {compressing ? "Salvando…" : "Aplicar"}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <div className={`${styles.logoUploadPanel} ${disabled ? styles.logoUploadPanelDisabled : ""}`}>
      {cropModal}

      <div className={previewClass}>
        {preview ? (
          <>
            <img src={preview} alt="" className={imgClass} />
            {!disabled && (
              <button type="button" className={styles.logoUploadRemove} onClick={removeImage} aria-label="Remover imagem">
                <X size={12} strokeWidth={2.5} />
              </button>
            )}
          </>
        ) : (
          <div className={styles.logoUploadPlaceholder}>
            {round
              ? <PersonAvatarPlaceholder size={36} className={styles.photoUploadPlaceholderIcon} />
              : <span className={styles.logoInitials}>—</span>
            }
          </div>
        )}
      </div>

      <div className={styles.logoUploadBody}>
        <span className={styles.fieldLabel}>{label}</span>
        <p className={styles.logoUploadHint}>{disabled ? "Somente leitura" : hint}</p>
        {!disabled && (
          <div className={styles.logoUploadActions}>
            <button type="button" className={styles.logoUploadBtn} onClick={() => fileInputRef.current?.click()}>
              <Upload size={14} strokeWidth={2} />
              {preview ? "Trocar imagem" : "Enviar imagem"}
            </button>
          </div>
        )}
      </div>

      {!disabled && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/webp,image/jpeg"
          onChange={onSelectFile}
          className={styles.logoUploadInput}
        />
      )}
    </div>
  );
}
