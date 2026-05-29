"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Bold, Italic, Heading2, Heading3, List, ListOrdered, ImageIcon, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { compressNewsImage, newsImageContentType } from "@/lib/images/compress-news-image";
import { createClient } from "@/lib/supabase";

type Props = {
  initialContent?: object;
  onChange: (json: object) => void;
};

export default function EditorTipTap({ initialContent, onChange }: Props) {
  const [imageUrl, setImageUrl] = useState("");
  const [showImageInput, setShowImageInput] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageFileRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false, allowBase64: false }),
    ],
    content: initialContent ?? {},
    onUpdate({ editor }) {
      onChange(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: "prose-editor min-h-[300px] outline-none",
      },
    },
  });

  useEffect(() => {
    return () => editor?.destroy();
  }, [editor]);

  function insertImage() {
    const url = imageUrl.trim();
    if (!url || !editor) return;
    editor.chain().focus().setImage({ src: url }).run();
    setImageUrl("");
    setShowImageInput(false);
  }

  async function handleImageFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    setUploadingImage(true);
    try {
      const compressed = await compressNewsImage(file, "body");
      const supabase = createClient();
      const safeName = compressed.name.replace(/[^\w.\-]/g, "_");
      const path = `body/${Date.now()}-${safeName}`;
      const contentType = newsImageContentType(compressed);
      const { error } = await supabase.storage
        .from("news")
        .upload(path, compressed, { contentType, cacheControl: "3600" });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("news").getPublicUrl(path);
      editor.chain().focus().setImage({ src: pub.publicUrl }).run();
    } catch (err) {
      console.error("Erro ao fazer upload da imagem:", err);
    } finally {
      setUploadingImage(false);
      if (imageFileRef.current) imageFileRef.current.value = "";
    }
  }

  const btnBase: React.CSSProperties = {
    padding: "4px 8px",
    borderRadius: "4px",
    border: "1px solid var(--color-border)",
    backgroundColor: "transparent",
    cursor: "pointer",
    color: "var(--color-text-secondary)",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "12px",
    fontFamily: "var(--font-mono)",
  };

  const btnActive: React.CSSProperties = {
    ...btnBase,
    backgroundColor: "rgba(191,242,5,0.15)",
    color: "var(--color-brand)",
    borderColor: "var(--color-brand)",
  };

  if (!editor) return null;

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: "1px solid var(--color-border)" }}
    >
      {/* Toolbar */}
      <div
        className="flex flex-wrap items-center gap-1 p-2"
        style={{ borderBottom: "1px solid var(--color-border)", backgroundColor: "var(--color-surface)" }}
      >
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          style={editor.isActive("bold") ? btnActive : btnBase}
        >
          <Bold size={13} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          style={editor.isActive("italic") ? btnActive : btnBase}
        >
          <Italic size={13} strokeWidth={2.5} />
        </button>
        <div style={{ width: "1px", height: "20px", backgroundColor: "var(--color-border)", margin: "0 4px" }} />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          style={editor.isActive("heading", { level: 2 }) ? btnActive : btnBase}
        >
          <Heading2 size={13} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          style={editor.isActive("heading", { level: 3 }) ? btnActive : btnBase}
        >
          <Heading3 size={13} strokeWidth={2.5} />
        </button>
        <div style={{ width: "1px", height: "20px", backgroundColor: "var(--color-border)", margin: "0 4px" }} />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          style={editor.isActive("bulletList") ? btnActive : btnBase}
        >
          <List size={13} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          style={editor.isActive("orderedList") ? btnActive : btnBase}
        >
          <ListOrdered size={13} strokeWidth={2.5} />
        </button>
        <div style={{ width: "1px", height: "20px", backgroundColor: "var(--color-border)", margin: "0 4px" }} />
        <button
          type="button"
          onClick={() => setShowImageInput((v) => !v)}
          style={showImageInput ? btnActive : btnBase}
        >
          <ImageIcon size={13} strokeWidth={2.5} />
          URL
        </button>

        <button
          type="button"
          onClick={() => imageFileRef.current?.click()}
          disabled={uploadingImage}
          style={btnBase}
        >
          <Upload size={13} strokeWidth={2.5} />
          {uploadingImage ? "Enviando..." : "Upload"}
        </button>

        <input
          ref={imageFileRef}
          type="file"
          accept="image/*"
          onChange={handleImageFileUpload}
          className="hidden"
        />

        {showImageInput && (
          <div className="flex items-center gap-2 ml-1">
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); insertImage(); } }}
              style={{
                backgroundColor: "var(--color-background)",
                border: "1px solid var(--color-border)",
                borderRadius: "4px",
                padding: "4px 8px",
                color: "var(--color-text-primary)",
                fontSize: "12px",
                fontFamily: "var(--font-mono)",
                width: "220px",
                outline: "none",
              }}
            />
            <button type="button" onClick={insertImage} style={{ ...btnBase, color: "var(--color-brand)" }}>
              Inserir
            </button>
          </div>
        )}
      </div>

      {/* Editor area */}
      <div
        className="p-4"
        style={{ backgroundColor: "var(--color-background)", minHeight: "300px" }}
      >
        <style>{`
          .prose-editor { color: var(--color-text-primary); font-family: var(--font-sans); font-size: 15px; line-height: 1.7; }
          .prose-editor h2 { font-size: 20px; font-weight: 700; margin: 20px 0 10px; color: var(--color-text-primary); }
          .prose-editor h3 { font-size: 17px; font-weight: 600; margin: 16px 0 8px; color: var(--color-text-primary); }
          .prose-editor p { margin: 0 0 12px; }
          .prose-editor strong { font-weight: 700; color: var(--color-text-accent); }
          .prose-editor em { font-style: italic; }
          .prose-editor ul, .prose-editor ol { padding-left: 20px; margin-bottom: 12px; }
          .prose-editor li { margin-bottom: 4px; }
          .prose-editor img { max-width: 100%; border-radius: 6px; margin: 12px 0; }
          .prose-editor p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: var(--color-text-secondary); pointer-events: none; float: left; height: 0; }
        `}</style>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}