"use client";

import { useState, useRef } from "react";
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from "react-image-crop";
import { compressNewsImage } from "@/lib/images/compress-news-image";
import "react-image-crop/dist/ReactCrop.css";
import { Upload, X, Check } from "lucide-react";
import {
  modalOverlayStyle,
  modalPanelStyle,
  modalHeaderDividerStyle,
  modalCloseButtonStyle,
  secondaryButtonStyle,
} from "@/lib/lab-ui-styles";
import styles from "@/app/(lab)/components/entity-hub.module.css";

type Props = {
  existingUrl: string | null;
  onFileReady: (file: File | null) => void;
  onExistingUrl: (url: string | null) => void;
};

function centerAspectCrop(width: number, height: number, aspect: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 90 }, aspect, width, height),
    width,
    height,
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
      canvas.height,
    );

    const blob = await new Promise<Blob>((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error("Falha ao exportar recorte"))), "image/png"),
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
      {cropping && srcImage && (
        <div style={modalOverlayStyle} onClick={cancelCrop}>
          <div
            style={{ ...modalPanelStyle, maxWidth: 720, width: "100%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: "16px 20px",
              ...modalHeaderDividerStyle,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <p className={styles.sectionTitle}>Recortar capa — 16:9</p>
              <button type="button" onClick={cancelCrop} style={modalCloseButtonStyle}>×</button>
            </div>
            <div style={{ padding: "20px" }}>
              <div className="flex items-center justify-center overflow-hidden rounded-xl" style={{ maxHeight: 400 }}>
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
                    style={{ maxHeight: 400, maxWidth: "100%", display: "block" }}
                    alt="Recortar"
                  />
                </ReactCrop>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
                <button type="button" onClick={cancelCrop} style={secondaryButtonStyle}>
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={applyCrop}
                  disabled={compressing || !completedCrop}
                  className={styles.saveBtn}
                >
                  <Check size={14} strokeWidth={2.5} />
                  {compressing ? "Comprimindo…" : "Aplicar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {preview ? (
        <div className={styles.newsCoverPreviewWrap}>
          <img src={preview} alt="Capa" className={styles.newsCoverPreviewImg} />
          <div className={styles.newsCoverPreviewActions}>
            <button type="button" onClick={removeCover} className={styles.newsCoverPreviewBtn}>
              <X size={12} strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={styles.newsCoverPreviewBtn}
            >
              Trocar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={styles.newsCoverUploadBtn}
        >
          <Upload size={22} strokeWidth={1.5} style={{ color: "var(--hub-body-subtle)" }} />
          <span className={styles.newsCoverUploadHint}>Clique para enviar</span>
          <span className={styles.newsCoverUploadHint} style={{ opacity: 0.65 }}>
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
