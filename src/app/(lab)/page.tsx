import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles").select("organization_id, role, full_name")
    .eq("auth_user_id", user.id).maybeSingle();

  const orgId = profile?.organization_id ?? "";

  const [
    { count: teamsCount },
    { count: athletesCount },
    { count: refereesCount },
    { count: staffCount },
    { count: venuesCount },
    { count: competitionsCount },
    { count: matchesCount },
    { count: pendingCount },
    { count: suspensionsCount },
    { count: usersCount },
    { count: repsCount },
    { data: recentMatches },
    { data: currentSeason },
  ] = await Promise.all([
    supabase.from("teams").select("*", { count: "exact", head: true }).eq("organization_id", orgId),
    supabase.from("athletes").select("*", { count: "exact", head: true }).eq("organization_id", orgId),
    supabase.from("referees").select("*", { count: "exact", head: true }).eq("organization_id", orgId),
    supabase.from("staff_members").select("*", { count: "exact", head: true }).eq("organization_id", orgId),
    supabase.from("venues").select("*", { count: "exact", head: true }).eq("organization_id", orgId),
    supabase.from("competitions").select("*", { count: "exact", head: true }).eq("organization_id", orgId),
    supabase.from("matches").select("*", { count: "exact", head: true }),
    supabase.from("edition_roster_entries").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("suspensions").select("*", { count: "exact", head: true }).eq("organization_id", orgId).eq("is_active", true),
    supabase.from("user_profiles").select("*", { count: "exact", head: true }).eq("organization_id", orgId),
    supabase.from("representatives").select("*", { count: "exact", head: true }).eq("organization_id", orgId),
    supabase.from("matches")
      .select("id, match_date, match_time, status, score_a, score_b, teams_a:teams!matches_team_a_id_fkey(full_name, abbreviation), teams_b:teams!matches_team_b_id_fkey(full_name, abbreviation), phases(competition_editions(competitions(full_name)))")
      .order("match_date", { ascending: false })
      .limit(5),
    supabase.from("seasons").select("name, years(value)").eq("organization_id", orgId).eq("is_current", true).maybeSingle(),
  ]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const firstName = profile?.full_name?.split(" ")[0] ?? "Admin";

  const statusLabel: Record<string, string> = {
    scheduled: "Agendada", ongoing: "Em andamento", finished: "Finalizada", postponed: "Adiada",
  };

  const cardStyle = { backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" };
  const labelStyle = { color: "var(--color-text-secondary)" };
  const valueStyle = { color: "var(--color-text-primary)" };
  const accentStyle = { color: "var(--color-brand)" };

  return (
    <div className="p-6 md:p-8">
      {/* Saudação */}
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold" style={{ color: "var(--color-text-primary)" }}>
          {greeting}, {firstName}.
        </h1>
        {currentSeason && (
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Temporada atual: <span style={{ color: "var(--color-brand)" }}>
              {(currentSeason as any).years?.value} — {(currentSeason as any).name}
            </span>
          </p>
        )}
      </div>

      {/* Cards de atenção */}
      {(pendingCount ?? 0) > 0 && (
        <Link href="/aprovacoes" className="mb-6 flex items-center gap-3 rounded-xl border p-4 transition-colors"
          style={{ borderColor: "var(--color-brand)", backgroundColor: "rgba(191,242,5,0.05)" }}>
          <span className="text-lg">⏳</span>
          <div>
            <p className="font-medium text-sm" style={{ color: "var(--color-text-primary)" }}>
              {pendingCount} item{pendingCount !== 1 ? "s" : ""} aguardando aprovação
            </p>
            <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Clique para revisar</p>
          </div>
        </Link>
      )}

      {/* Estatísticas — Cadastros */}
      <div className="mb-4">
        <h2 className="font-mono text-xs uppercase tracking-widest mb-3" style={{ color: "var(--color-text-secondary)" }}>
          Cadastros
        </h2>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { label: "Equipes", value: teamsCount ?? 0, href: "/equipes" },
            { label: "Atletas", value: athletesCount ?? 0, href: "/atletas" },
            { label: "Árbitros", value: refereesCount ?? 0, href: "/arbitros" },
            { label: "Comissão", value: staffCount ?? 0, href: "/comissao" },
            { label: "Locais", value: venuesCount ?? 0, href: "/locais" },
          ].map(item => (
            <Link key={item.href} href={item.href}
              className="rounded-xl border p-4 transition-colors hover:border-[color-mix(in_oklab,var(--color-brand)_30%,var(--color-border))]"
              style={cardStyle}>
              <p className="font-display text-2xl font-bold" style={accentStyle}>{item.value}</p>
              <p className="text-xs mt-1" style={labelStyle}>{item.label}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Estatísticas — Competições */}
      <div className="mb-4">
        <h2 className="font-mono text-xs uppercase tracking-widest mb-3" style={{ color: "var(--color-text-secondary)" }}>
          Competições & Partidas
        </h2>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
          {[
            { label: "Competições", value: competitionsCount ?? 0, href: "/competicoes" },
            { label: "Partidas", value: matchesCount ?? 0, href: "/competicoes" },
            { label: "Suspensões ativas", value: suspensionsCount ?? 0, href: "/suspensoes" },
          ].map(item => (
            <Link key={item.href + item.label} href={item.href}
              className="rounded-xl border p-4 transition-colors hover:border-[color-mix(in_oklab,var(--color-brand)_30%,var(--color-border))]"
              style={cardStyle}>
              <p className="font-display text-2xl font-bold" style={accentStyle}>{item.value}</p>
              <p className="text-xs mt-1" style={labelStyle}>{item.label}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Estatísticas — Organização */}
      <div className="mb-8">
        <h2 className="font-mono text-xs uppercase tracking-widest mb-3" style={{ color: "var(--color-text-secondary)" }}>
          Organização
        </h2>
        <div className="grid gap-3 grid-cols-2">
          {[
            { label: "Usuários do painel", value: usersCount ?? 0, href: "/usuarios" },
            { label: "Representantes", value: repsCount ?? 0, href: "/representantes" },
          ].map(item => (
            <Link key={item.href} href={item.href}
              className="rounded-xl border p-4 transition-colors hover:border-[color-mix(in_oklab,var(--color-brand)_30%,var(--color-border))]"
              style={cardStyle}>
              <p className="font-display text-2xl font-bold" style={accentStyle}>{item.value}</p>
              <p className="text-xs mt-1" style={labelStyle}>{item.label}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Partidas recentes */}
      {recentMatches && recentMatches.length > 0 && (
        <div>
          <h2 className="font-mono text-xs uppercase tracking-widest mb-3" style={{ color: "var(--color-text-secondary)" }}>
            Partidas recentes
          </h2>
          <div className="rounded-xl border p-5" style={cardStyle}>
            <ul className="space-y-2">
              {recentMatches.map((m: any) => (
                <li key={m.id} className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3"
                  style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }}>
                  <div className="min-w-0">
                    <p className="font-medium text-sm" style={valueStyle}>
                      {m.teams_a?.abbreviation ?? "?"}{" "}
                      <span style={accentStyle}>{m.score_a} × {m.score_b}</span>{" "}
                      {m.teams_b?.abbreviation ?? "?"}
                    </p>
                    <p className="text-xs truncate" style={labelStyle}>
                      {(m.phases as any)?.competition_editions?.competitions?.full_name ?? "—"}
                      {m.match_date ? ` · ${new Date(m.match_date + "T00:00:00").toLocaleDateString("pt-BR")}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="rounded px-2 py-0.5 text-xs font-mono"
                      style={{
                        backgroundColor: m.status === "finished" ? "var(--color-border)" : "var(--color-brand)",
                        color: m.status === "finished" ? "var(--color-text-secondary)" : "var(--color-background)",
                      }}>
                      {statusLabel[m.status] ?? m.status}
                    </span>
                    <Link href={`/partidas/${m.id}`}
                      className="rounded border px-2 py-1 text-xs"
                      style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                      Ver
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}