"use client";

import { memo, useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { FileText, Plus, Search } from "lucide-react";
import { EntityHubSectionHeader } from "@/app/(lab)/components/entity-hub-section-header";
import styles from "@/app/(lab)/components/entity-hub.module.css";

export type NewsArticleRow = {
  id: string;
  title: string;
  subtitle: string | null;
  cover_url: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

const TABS = [
  { key: "all" as const, label: "TODAS" },
  { key: "published" as const, label: "PUBLICADAS" },
  { key: "draft" as const, label: "RASCUNHOS" },
];

type TabKey = (typeof TABS)[number]["key"];

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const NewsArticleListItem = memo(function NewsArticleListItem({ article }: { article: NewsArticleRow }) {
  return (
    <Link
      href={`/noticias/${article.id}`}
      className={`${styles.listRow} ${styles.listRowLink} ${styles.newsListRow}`}
    >
      <div className={styles.newsListCover}>
        {article.cover_url ? (
          <img src={article.cover_url} alt="" className={styles.newsListCoverImg} loading="lazy" decoding="async" />
        ) : (
          <FileText size={18} strokeWidth={1.5} className={styles.newsListCoverIcon} />
        )}
      </div>
      <div className={styles.listRowMain}>
        <p className={styles.newsListTitle}>{article.title}</p>
        {article.subtitle && (
          <p className={styles.newsListSub}>{article.subtitle}</p>
        )}
      </div>
      <div className={styles.newsListMeta}>
        <span
          className={`${styles.statusBadge} ${article.is_published ? styles.statusBadgeApproved : styles.statusBadgeDraft}`}
        >
          {article.is_published ? "Publicado" : "Rascunho"}
        </span>
        <span className={styles.newsListDate}>
          {formatDate(article.published_at ?? article.updated_at ?? article.created_at)}
        </span>
      </div>
    </Link>
  );
});

export default function NoticiasClient({ articles }: { articles: NewsArticleRow[] }) {
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const { counts, filtered } = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    let published = 0;
    let draft = 0;
    const result: NewsArticleRow[] = [];

    for (const article of articles) {
      if (article.is_published) published += 1;
      else draft += 1;

      if (activeTab === "published" && !article.is_published) continue;
      if (activeTab === "draft" && article.is_published) continue;

      if (q) {
        const inTitle = article.title.toLowerCase().includes(q);
        const inSubtitle = (article.subtitle ?? "").toLowerCase().includes(q);
        if (!inTitle && !inSubtitle) continue;
      }

      result.push(article);
    }

    return {
      counts: { all: articles.length, published, draft },
      filtered: result,
    };
  }, [articles, activeTab, deferredSearch]);

  const tabSubtitle =
    activeTab === "published"
      ? `${counts.published} publicadas`
      : activeTab === "draft"
        ? `${counts.draft} rascunhos`
        : `${counts.all} no total`;

  return (
    <div className={`${styles.entityHub} ${styles.page} ${styles.newsHub}`}>
      <div className={`${styles.header} ${styles.orgHubHeaderTabsOnly}`}>
        <div className={styles.headerGlow} />
        <div className={styles.headerSurface} />
        <div className={styles.headerInner}>
          <div className={styles.tabBar}>
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ""}`}
              >
                {tab.label}
                <span className={styles.tabBadge}>{counts[tab.key]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={`${styles.content} ${styles.newsHubContent}`}>
        <EntityHubSectionHeader title="Notícias" subtitle={tabSubtitle} />

        <div className={styles.newsToolbar}>
          <div className={styles.newsSearchWrap}>
            <Search size={15} strokeWidth={2} className={styles.newsSearchIcon} aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título ou subtítulo…"
              className={styles.newsSearchInput}
              aria-label="Buscar notícias"
            />
          </div>
          <Link href="/noticias/novo" className={styles.saveBtn}>
            <Plus size={14} strokeWidth={2.5} />
            Nova notícia
          </Link>
        </div>

        <div className={styles.listPanel}>
          {filtered.length === 0 ? (
            <div className={styles.listPanelEmpty}>
              <FileText size={32} strokeWidth={1.5} className={styles.newsEmptyIcon} />
              <p className={styles.listPanelEmptyTitle}>
                {search.trim()
                  ? "Nenhuma notícia encontrada"
                  : activeTab === "published"
                    ? "Nenhuma notícia publicada"
                    : activeTab === "draft"
                      ? "Nenhum rascunho"
                      : "Nenhuma notícia criada"}
              </p>
              <p className={styles.newsEmptyDesc}>
                {search.trim()
                  ? "Tente outro termo de busca."
                  : "Crie a primeira notícia para publicar no site."}
              </p>
              {!search.trim() && activeTab !== "published" && (
                <Link href="/noticias/novo" className={`${styles.saveBtn} ${styles.newsEmptyCta}`}>
                  <Plus size={14} strokeWidth={2.5} />
                  Criar notícia
                </Link>
              )}
            </div>
          ) : (
            filtered.map((article) => (
              <NewsArticleListItem key={article.id} article={article} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
