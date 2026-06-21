"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Bold, Italic, Heading2, Heading3, List, ListOrdered, ImageIcon, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { compressNewsImage, newsImageContentType } from "@/lib/images/compress-news-image";
import { createClient } from "@/lib/supabase";
import styles from "@/app/(lab)/components/entity-hub.module.css";

type Props = {
  initialContent?: object;
  onChange: (json: object) => void;
};

function toolBtnClass(active: boolean) {
  return `${styles.newsEditorToolBtn} ${active ? styles.newsEditorToolBtnActive : ""}`;
}

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
    onUpdate({ editor: ed }) {
      onChange(ed.getJSON());
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

  if (!editor) return null;

  return (
    <div className={styles.newsEditorWrap}>
      <div className={styles.newsEditorToolbar}>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={toolBtnClass(editor.isActive("bold"))}
        >
          <Bold size={13} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={toolBtnClass(editor.isActive("italic"))}
        >
          <Italic size={13} strokeWidth={2.5} />
        </button>
        <div className={styles.newsEditorToolDivider} />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={toolBtnClass(editor.isActive("heading", { level: 2 }))}
        >
          <Heading2 size={13} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={toolBtnClass(editor.isActive("heading", { level: 3 }))}
        >
          <Heading3 size={13} strokeWidth={2.5} />
        </button>
        <div className={styles.newsEditorToolDivider} />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={toolBtnClass(editor.isActive("bulletList"))}
        >
          <List size={13} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={toolBtnClass(editor.isActive("orderedList"))}
        >
          <ListOrdered size={13} strokeWidth={2.5} />
        </button>
        <div className={styles.newsEditorToolDivider} />
        <button
          type="button"
          onClick={() => setShowImageInput((v) => !v)}
          className={toolBtnClass(showImageInput)}
        >
          <ImageIcon size={13} strokeWidth={2.5} />
          URL
        </button>
        <button
          type="button"
          onClick={() => imageFileRef.current?.click()}
          disabled={uploadingImage}
          className={styles.newsEditorToolBtn}
        >
          <Upload size={13} strokeWidth={2.5} />
          {uploadingImage ? "Enviando…" : "Upload"}
        </button>
        <input
          ref={imageFileRef}
          type="file"
          accept="image/*"
          onChange={handleImageFileUpload}
          className="hidden"
        />
      </div>

      {showImageInput && (
        <div className={styles.newsEditorImageBar}>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://…"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); insertImage(); } }}
            className={styles.input}
            style={{ flex: 1, fontSize: 12 }}
          />
          <button type="button" onClick={insertImage} className={styles.newsEditorToolBtn}>
            Inserir
          </button>
        </div>
      )}

      <div className={styles.newsEditorBody}>
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
