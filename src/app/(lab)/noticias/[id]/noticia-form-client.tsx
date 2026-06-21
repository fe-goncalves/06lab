"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import { EntityHubShell } from "@/app/(lab)/components/entity-hub-shell";
import { EntityHubSectionHeader } from "@/app/(lab)/components/entity-hub-section-header";
import { LabSwitch } from "@/app/(lab)/components/lab-switch";
import { LabCheckbox } from "@/app/(lab)/components/lab-checkbox";
import { salvarNoticia, excluirNoticia } from "../actions";
import CoverUpload from "../cover-upload";
import styles from "@/app/(lab)/components/entity-hub.module.css";

const EditorTipTap = dynamic(() => import("../editor-tiptap"), {
  ssr: false,
  loading: () => (
    <div className={styles.newsEditorSkeleton} aria-hidden>
      Carregando editor…
    </div>
  ),
});

type Team = { id: string; full_name: string; abbreviation: string | null; logo_url: string | null };
type Competition = { id: string; full_name: string; short_name: string | null; logo_url: string | null };

type Article = {
  id: string;
  title: string;
  subtitle: string | null;
  cover_url: string | null;
  body: object;
  is_published: boolean;
  published_at: string | null;
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
  const [publishedAt, setPublishedAt] = useState<string>(
    article?.published_at
      ? new Date(article.published_at).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16),
  );
  const [bodyJson, setBodyJson] = useState<object>(article?.body ?? {});
  const [selectedTeams, setSelectedTeams] = useState<string[]>(initialTeamIds);
  const [selectedComps, setSelectedComps] = useState<string[]>(initialCompetitionIds);
  const [coverPreview, setCoverPreview] = useState<string | null>(article?.cover_url ?? null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [editorReady, setEditorReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setEditorReady(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  function toggleTeam(id: string) {
    setSelectedTeams((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  }

  function toggleComp(id: string) {
    setSelectedComps((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const fd = new FormData();
    if (article?.id) fd.append("id", article.id);
    fd.append("title", title);
    fd.append("subtitle", subtitle);
    fd.append("body", JSON.stringify(bodyJson));
    fd.append("is_published", String(isPublished));
    fd.append("published_at", publishedAt);
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
          router.push(`/noticias/${result.id}`);
        } else {
          setTimeout(() => setSuccess(false), 3000);
        }
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

  const headerTitle = article?.id ? "EDITAR NOTÍCIA" : "NOVA NOTÍCIA";
  const headerDetail = isPublished ? "Publicado" : "Rascunho";

  return (
    <EntityHubShell
      breadcrumb={[
        { label: "Notícias", href: "/noticias" },
        { label: article?.id ? "Editar" : "Nova" },
      ]}
      avatar={
        <div className={styles.newsFormCoverThumb}>
          {coverPreview ? (
            <img src={coverPreview} alt="" className={styles.newsFormCoverThumbImg} />
          ) : (
            <span className={styles.newsFormCoverPlaceholder}>16:9</span>
          )}
        </div>
      }
      title={headerTitle}
      subtitle={headerDetail}
      showSave
      saveFormId="form-noticia"
      saving={isPending}
      saveLabel={success ? "Salvo!" : isPending ? "Salvando…" : "Salvar"}
      hubClassName={styles.newsHub}
      contentClassName={styles.newsHubContent}
    >
      {error && (
        <p className={styles.formError} role="alert" style={{ marginBottom: 20 }}>
          {error}
        </p>
      )}

      <form id="form-noticia" onSubmit={handleSubmit} className={styles.newsFormGrid}>
        <div className={styles.newsFormMain}>
          <EntityHubSectionHeader title="Conteúdo" subtitle="Título, subtítulo e corpo da matéria" />

          <div className={styles.fieldStack}>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="news-title">Título *</label>
              <input
                id="news-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Digite o título da notícia"
                className={styles.input}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="news-subtitle">Subtítulo</label>
              <input
                id="news-subtitle"
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Opcional — aparece abaixo do título"
                className={styles.input}
              />
            </div>

            <div className={styles.field}>
              <span className={styles.fieldLabel}>Corpo da notícia</span>
              {editorReady ? (
                <EditorTipTap
                  initialContent={article?.body && Object.keys(article.body).length > 0 ? article.body : undefined}
                  onChange={setBodyJson}
                />
              ) : (
                <div className={styles.newsEditorSkeleton} aria-hidden>
                  Carregando editor…
                </div>
              )}
            </div>
          </div>
        </div>

        <aside className={styles.newsFormSide}>
          <div className={styles.listPanel}>
            <div className={styles.listPanelHeader}>
              <span className={styles.listPanelName}>Publicação</span>
            </div>
            <div className={styles.hubPanelBody}>
              <LabSwitch
                checked={isPublished}
                onChange={setIsPublished}
                label={isPublished ? "Publicado" : "Rascunho"}
              />
              <div className={styles.field} style={{ marginTop: 16 }}>
                <label className={styles.fieldLabel} htmlFor="news-published-at">Data de publicação</label>
                <input
                  id="news-published-at"
                  type="datetime-local"
                  value={publishedAt}
                  onChange={(e) => setPublishedAt(e.target.value)}
                  className={styles.input}
                />
              </div>
            </div>
          </div>

          <div className={styles.listPanel}>
            <div className={styles.listPanelHeader}>
              <span className={styles.listPanelName}>Capa</span>
            </div>
            <div className={styles.hubPanelBody}>
              <CoverUpload
                existingUrl={coverPreview}
                onFileReady={(file) => setCoverFile(file)}
                onExistingUrl={(url) => setCoverPreview(url)}
              />
            </div>
          </div>

          {teams.length > 0 && (
            <div className={styles.listPanel}>
              <div className={styles.listPanelHeader}>
                <span className={styles.listPanelName}>Equipes</span>
                <span className={styles.listPanelCount}>{selectedTeams.length}</span>
              </div>
              <div className={styles.teamCheckList}>
                {teams.map((team) => {
                  const active = selectedTeams.includes(team.id);
                  return (
                    <div
                      key={team.id}
                      className={`${styles.teamCheckRow} ${active ? styles.teamCheckRowSelected : ""}`}
                    >
                      <LabCheckbox
                        checked={active}
                        onChange={() => toggleTeam(team.id)}
                        label={
                          <span className={styles.newsTagRowLabel}>
                            <span className={styles.newsTagLogo}>
                              {team.logo_url ? (
                                <img src={team.logo_url} alt="" />
                              ) : (
                                <span>{(team.abbreviation ?? team.full_name).slice(0, 2).toUpperCase()}</span>
                              )}
                            </span>
                            <span className={styles.teamCheckName}>{team.full_name}</span>
                          </span>
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {competitions.length > 0 && (
            <div className={styles.listPanel}>
              <div className={styles.listPanelHeader}>
                <span className={styles.listPanelName}>Competições</span>
                <span className={styles.listPanelCount}>{selectedComps.length}</span>
              </div>
              <div className={styles.teamCheckList}>
                {competitions.map((comp) => {
                  const active = selectedComps.includes(comp.id);
                  return (
                    <div
                      key={comp.id}
                      className={`${styles.teamCheckRow} ${active ? styles.teamCheckRowSelected : ""}`}
                    >
                      <LabCheckbox
                        checked={active}
                        onChange={() => toggleComp(comp.id)}
                        label={
                          <span className={styles.newsTagRowLabel}>
                            <span className={styles.newsTagLogo}>
                              {comp.logo_url ? (
                                <img src={comp.logo_url} alt="" />
                              ) : (
                                <span>{(comp.short_name ?? comp.full_name).slice(0, 2).toUpperCase()}</span>
                              )}
                            </span>
                            <span className={styles.teamCheckName}>{comp.short_name ?? comp.full_name}</span>
                          </span>
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {article?.id && (
            <div className={styles.listPanel}>
              <div className={styles.listPanelHeader}>
                <span className={styles.listPanelName}>Zona de perigo</span>
              </div>
              <div className={styles.hubPanelBody}>
                <p className={styles.dangerDesc}>Excluir permanentemente esta notícia e suas associações.</p>
                <button type="button" onClick={handleDelete} className={`${styles.dangerBtn} ${styles.dangerBtnRow}`}>
                  <Trash2 size={13} strokeWidth={2} />
                  Excluir notícia
                </button>
              </div>
            </div>
          )}
        </aside>
      </form>
    </EntityHubShell>
  );
}
