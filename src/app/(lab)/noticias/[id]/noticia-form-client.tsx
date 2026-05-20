"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2, Upload, X, Check } from "lucide-react";
import dynamic from "next/dynamic";
import { salvarNoticia, excluirNoticia } from "../actions";

const EditorTipTap = dynamic(() => import("../editor-tiptap"), { ssr: false });

type Team = { id: string; full_name: string; abbreviation: string | null; logo_url: string | null };
type Competition = { id: string; full_name: string; short_name: string | null; logo_url: string | null };

type Article = {
  id: string;
  title: string;
  subtitle: string | null;
  cover_url: string | null;
  body: object;
  is_published: boolean;
} | null;

type Props = {
  article: Article;
  teams: Team[];
  competitions: Competition[];
  initialTeamIds: string[];
  initialCompetitionIds: string[];
};

export default function NoticiaFormClient({
  article,
  teams,
  competitions,
  initialTeamIds,
  initialCompetitionIds,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState(article?.title ?? "");
  const [subtitle, setSubtitle] = useState(article?.subtitle ?? "");
  const [isPublished, setIsPublished] = useState(article?.is_published ?? false);
  const [bodyJson, setBodyJson] = useState<object>(article?.body ?? {});
  const [selectedTeams, setSelectedTeams] = useState<string[]>(initialTeamIds);
  const [selectedComps, setSelectedComps] = useState<string[]>(initialCompetitionIds);
  const [coverPreview, setCoverPreview] = useState<string | null>(article?.cover_url ?? null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  }

  function removeCover() {
    setCoverFile(null);
    setCoverPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function toggleTeam(id: string) {
    setSelectedTeams((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]);
  }

  function toggleComp(id: string) {
    setSelectedComps((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);
  }

  async function handleSave() {
    setError(null);
    setSuccess(false);

    const fd = new FormData();
    if (article?.id) fd.append("id", article.id);
    fd.append("title", title);
    fd.append("subtitle", subtitle);
    fd.append("body", JSON.stringify(bodyJson));
    fd.append("is_published", String(isPublished));
    if (coverFile) fd.append("cover", coverFile);
    if (!coverFile && coverPreview) fd.append("cover_url_existing", coverPreview);
    selectedTeams.forEach((id) => fd.append("team_ids", id));
    selectedComps.forEach((id) => fd.append("competition_ids", id));

    startTransition(async () => {
      const result = await salvarNoticia(fd);
      if ("error" in result) {
        setError(result.error);
      } else {
        setSuccess(true);
        if (!article?.id) {
          router.replace(`/noticias/${result.id}`);
        }
        setTimeout(() => setSuccess(false), 3000);
      }
    });
  }

  async function handleDelete() {
    if (!article?.id) return;
    if (!confirm("Tem certeza que deseja excluir esta notícia? Esta ação não pode ser desfeita.")) return;
    const result = await excluirNoticia(article.id);
    if ("error" in result) {
      setError(result.error);
    } else {
      router.push("/noticias");
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    backgroundColor: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "6px",
    padding: "10px 12px",
    color: "var(--color-text-primary)",
    fontFamily: "var(--font-mono)",
    fontSize: "14px",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontFamily: "var(--font-mono)",
    fontSize: "11px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "var(--color-text-secondary)",
    marginBottom: "6px",
  };

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: "var(--color-background)" }}>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/noticias"
            className="flex items-center gap-1 font-mono text-sm transition-opacity hover:opacity-70"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <ArrowLeft size={14} strokeWidth={2.5} />
            Notícias
          </Link>
          <span style={{ color: "var(--color-border)" }}>/</span>
          <span className="font-mono text-sm" style={{ color: "var(--color-text-primary)" }}>
            {article?.id ? "Editar notícia" : "Nova notícia"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {article?.id && (
            <button
              type="button"
              onClick={handleDelete}
              className="flex items-center gap-2 rounded px-3 py-2 font-mono text-sm transition-opacity hover:opacity-70"
              style={{ color: "var(--color-danger)", border: "1px solid rgba(255,68,68,0.3)" }}
            >
              <Trash2 size={14} strokeWidth={2.5} />
              Excluir
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="flex items-center gap-2 rounded px-4 py-2 font-mono text-sm font-bold uppercase transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ backgroundColor: "var(--color-brand)", color: "#0D0D0D" }}
          >
            {success ? <Check size={14} strokeWidth={2.5} /> : null}
            {isPending ? "Salvando..." : success ? "Salvo!" : "Salvar"}
          </button>
        </div>
      </div>

      {/* Erro */}
      {error && (
        <div
          className="mb-6 rounded p-3 font-mono text-sm"
          style={{ backgroundColor: "rgba(255,68,68,0.1)", border: "1px solid rgba(255,68,68,0.3)", color: "var(--color-danger)" }}
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Coluna principal */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Título */}
          <div>
            <label style={labelStyle}>Título *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Digite o título da notícia"
              style={inputStyle}
            />
          </div>

          {/* Subtítulo */}
          <div>
            <label style={labelStyle}>Subtítulo</label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Opcional — aparece abaixo do título"
              style={inputStyle}
            />
          </div>

          {/* Corpo */}
          <div>
            <label style={labelStyle}>Corpo da notícia</label>
            <EditorTipTap
              initialContent={article?.body && Object.keys(article.body).length > 0 ? article.body : undefined}
              onChange={setBodyJson}
            />
          </div>
        </div>

        {/* Coluna lateral */}
        <div className="flex flex-col gap-6">
          {/* Status */}
          <div
            className="rounded-lg p-4"
            style={{ border: "1px solid var(--color-border)", backgroundColor: "var(--color-surface)" }}
          >
            <label style={labelStyle}>Status</label>
            <button
              type="button"
              onClick={() => setIsPublished((v) => !v)}
              className="flex w-full items-center justify-between rounded p-3 transition-colors"
              style={{
                border: isPublished
                  ? "1px solid rgba(191,242,5,0.4)"
                  : "1px solid var(--color-border)",
                backgroundColor: isPublished
                  ? "rgba(191,242,5,0.08)"
                  : "var(--color-background)",
              }}
            >
              <span
                className="font-mono text-sm font-bold uppercase"
                style={{ color: isPublished ? "var(--color-brand)" : "var(--color-text-secondary)" }}
              >
                {isPublished ? "Publicado" : "Rascunho"}
              </span>
              <div
                className="relative h-5 w-9 rounded-full transition-colors"
                style={{ backgroundColor: isPublished ? "var(--color-brand)" : "var(--color-border)" }}
              >
                <div
                  className="absolute top-0.5 h-4 w-4 rounded-full transition-transform"
                  style={{
                    backgroundColor: isPublished ? "#0D0D0D" : "var(--color-text-secondary)",
                    transform: isPublished ? "translateX(20px)" : "translateX(2px)",
                  }}
                />
              </div>
            </button>
          </div>

          {/* Capa */}
          <div
            className="rounded-lg p-4"
            style={{ border: "1px solid var(--color-border)", backgroundColor: "var(--color-surface)" }}
          >
            <label style={labelStyle}>Imagem de capa</label>
            {coverPreview ? (
              <div className="relative">
                <img
                  src={coverPreview}
                  alt="Capa"
                  className="w-full rounded object-cover"
                  style={{ maxHeight: "180px" }}
                />
                <button
                  type="button"
                  onClick={removeCover}
                  className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full"
                  style={{ backgroundColor: "rgba(0,0,0,0.7)", color: "#fff" }}
                >
                  <X size={12} strokeWidth={2.5} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded py-8 transition-colors hover:bg-white/5"
                style={{ border: "1px dashed var(--color-border)" }}
              >
                <Upload size={20} strokeWidth={1.5} style={{ color: "var(--color-text-secondary)" }} />
                <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  Clique para enviar
                </span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoverChange}
              className="hidden"
            />
          </div>

          {/* Tags — Equipes */}
          {teams.length > 0 && (
            <div
              className="rounded-lg p-4"
              style={{ border: "1px solid var(--color-border)", backgroundColor: "var(--color-surface)" }}
            >
              <label style={labelStyle}>Equipes relacionadas</label>
              <div className="flex flex-col gap-1">
                {teams.map((team) => {
                  const active = selectedTeams.includes(team.id);
                  return (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => toggleTeam(team.id)}
                      className="flex items-center gap-2 rounded p-2 text-left transition-colors hover:bg-white/5"
                      style={{
                        border: active ? "1px solid rgba(191,242,5,0.3)" : "1px solid transparent",
                        backgroundColor: active ? "rgba(191,242,5,0.06)" : "transparent",
                      }}
                    >
                      <div
                        className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded"
                        style={{ backgroundColor: "var(--color-border)" }}
                      >
                        {team.logo_url ? (
                          <img src={team.logo_url} alt="" className="h-full w-full object-contain" />
                        ) : (
                          <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                            {(team.abbreviation ?? team.full_name).slice(0, 2)}
                          </span>
                        )}
                      </div>
                      <span
                        className="font-mono text-sm"
                        style={{ color: active ? "var(--color-brand)" : "var(--color-text-primary)" }}
                      >
                        {team.full_name}
                      </span>
                      {active && (
                        <Check size={12} strokeWidth={2.5} className="ml-auto" style={{ color: "var(--color-brand)" }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tags — Competições */}
          {competitions.length > 0 && (
            <div
              className="rounded-lg p-4"
              style={{ border: "1px solid var(--color-border)", backgroundColor: "var(--color-surface)" }}
            >
              <label style={labelStyle}>Competições relacionadas</label>
              <div className="flex flex-col gap-1">
                {competitions.map((comp) => {
                  const active = selectedComps.includes(comp.id);
                  return (
                    <button
                      key={comp.id}
                      type="button"
                      onClick={() => toggleComp(comp.id)}
                      className="flex items-center gap-2 rounded p-2 text-left transition-colors hover:bg-white/5"
                      style={{
                        border: active ? "1px solid rgba(191,242,5,0.3)" : "1px solid transparent",
                        backgroundColor: active ? "rgba(191,242,5,0.06)" : "transparent",
                      }}
                    >
                      <div
                        className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded"
                        style={{ backgroundColor: "var(--color-border)" }}
                      >
                        {comp.logo_url ? (
                          <img src={comp.logo_url} alt="" className="h-full w-full object-contain" />
                        ) : (
                          <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                            {(comp.short_name ?? comp.full_name).slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span
                        className="font-mono text-sm"
                        style={{ color: active ? "var(--color-brand)" : "var(--color-text-primary)" }}
                      >
                        {comp.short_name ?? comp.full_name}
                      </span>
                      {active && (
                        <Check size={12} strokeWidth={2.5} className="ml-auto" style={{ color: "var(--color-brand)" }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}