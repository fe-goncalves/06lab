import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, FileText } from "lucide-react";

export const metadata = { title: "Notícias — 06.LAB" };

function formatDate(dateStr: string | null | undefined) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

export default async function NoticiasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile?.organization_id) redirect("/login");

  const { data: articles } = await supabase
    .from("news_articles")
    .select("id, title, subtitle, cover_url, is_published, published_at, created_at, updated_at")
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false });

  const list = articles ?? [];

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: "var(--color-background)" }}>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1
            className="font-display text-2xl font-bold uppercase tracking-wide"
            style={{ color: "var(--color-text-primary)" }}
          >
            Notícias
          </h1>
          <p className="mt-1 font-mono text-sm" style={{ color: "var(--color-text-secondary)" }}>
            {list.length} {list.length === 1 ? "artigo" : "artigos"} no total
          </p>
        </div>
        <Link
          href="/noticias/novo"
          className="flex items-center gap-2 rounded px-4 py-2 font-mono text-sm font-bold uppercase transition-opacity hover:opacity-80"
          style={{ backgroundColor: "var(--color-brand)", color: "#0D0D0D" }}
        >
          <Plus size={15} strokeWidth={2.5} />
          Nova Notícia
        </Link>
      </div>

      {/* Lista */}
      {list.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-lg py-20"
          style={{ border: "1px solid var(--color-border)" }}
        >
          <FileText size={40} strokeWidth={1.5} style={{ color: "var(--color-text-secondary)" }} />
          <p className="mt-4 font-mono text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Nenhuma notícia criada ainda.
          </p>
          <Link
            href="/noticias/novo"
            className="mt-4 rounded px-4 py-2 font-mono text-sm font-bold uppercase transition-opacity hover:opacity-80"
            style={{ backgroundColor: "var(--color-brand)", color: "#0D0D0D" }}
          >
            Criar primeira notícia
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {list.map((article) => (
            <Link
              key={article.id}
              href={`/noticias/${article.id}`}
              className="flex items-center gap-4 rounded-lg p-4 transition-colors hover:bg-white/5"
              style={{ border: "1px solid var(--color-border)", backgroundColor: "var(--color-surface)" }}
            >
              {/* Miniatura da capa */}
              <div
                className="h-16 w-24 shrink-0 overflow-hidden rounded"
                style={{ backgroundColor: "var(--color-border)" }}
              >
                {article.cover_url ? (
                  <img
                    src={article.cover_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <FileText size={20} strokeWidth={1.5} style={{ color: "var(--color-text-secondary)" }} />
                  </div>
                )}
              </div>

              {/* Texto */}
              <div className="min-w-0 flex-1">
                <p
                  className="truncate font-mono font-bold"
                  style={{ color: "var(--color-text-primary)", fontSize: "15px" }}
                >
                  {article.title}
                </p>
                {article.subtitle && (
                  <p
                    className="mt-0.5 truncate font-mono text-sm"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {article.subtitle}
                  </p>
                )}
              </div>

              {/* Status + Data */}
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span
                  className="rounded px-2 py-0.5 font-mono text-xs font-bold uppercase"
                  style={
                    article.is_published
                      ? { backgroundColor: "rgba(191,242,5,0.15)", color: "var(--color-brand)" }
                      : { backgroundColor: "rgba(166,166,166,0.1)", color: "var(--color-text-secondary)" }
                  }
                >
                  {article.is_published ? "Publicado" : "Rascunho"}
                </span>
                <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  {formatDate(article.published_at ?? article.updated_at ?? article.created_at)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}