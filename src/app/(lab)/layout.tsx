import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

function NavGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-5">
      <p
        className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {label}
      </p>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

function NavItem({
  href,
  icon,
  label,
}: {
  href: string;
  icon: ReactNode;
  label: string;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-[color-mix(in_oklab,var(--color-brand)_12%,transparent)]"
      style={{ color: "var(--color-text-primary)" }}
    >
      <span
        className="flex h-4 w-4 shrink-0 items-center justify-center [&>svg]:h-4 [&>svg]:w-4"
        style={{ color: "var(--color-brand)" }}
      >
        {icon}
      </span>
      <span>{label}</span>
    </a>
  );
}

export default async function LabLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, full_name, organization_id, organizations(name, slug)")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const footerName = profile?.full_name?.trim() || user.email || "—";
  const footerRole = profile?.role ?? "—";

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ backgroundColor: "var(--color-background)" }}
    >
      <aside
        className="flex w-60 shrink-0 flex-col border-r"
        style={{
          backgroundColor: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        <div
          className="flex flex-col gap-1 border-b px-4 py-5"
          style={{ borderColor: "var(--color-border)" }}
        >
          <a href="/" className="block">
            <img
              src="/brand/logo.svg"
              alt=""
              className="h-8 w-auto max-w-full"
            />
          </a>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-4">
          <NavGroup label="Competições">
            <NavItem
              href="/"
              label="Visão geral"
              icon={
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              }
            />
            <NavItem
              href="/competicoes"
              label="Competições"
              icon={
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                  <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                  <path d="M4 22h16" />
                  <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                  <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                  <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                </svg>
              }
            />
            <NavItem
              href="/temporadas"
              label="Temporadas"
              icon={
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4" />
                  <path d="M8 2v4" />
                  <path d="M3 10h18" />
                </svg>
              }
            />
          </NavGroup>

          <NavGroup label="Cadastros">
            <NavItem
              href="/equipes"
              label="Equipes"
              icon={
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              }
            />
            <NavItem
              href="/atletas"
              label="Atletas"
              icon={
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              }
            />
            <NavItem
              href="/arbitros"
              label="Árbitros"
              icon={
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <path d="M12 2v4" />
                  <path d="M8.5 6.5 12 2l3.5 4.5" />
                  <path d="M6 10h12l-1 8H7L6 10Z" />
                  <path d="M9 18v4" />
                  <path d="M15 18v4" />
                </svg>
              }
            />
            <NavItem
              href="/locais"
              label="Locais"
              icon={
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              }
            />
          </NavGroup>

          <NavGroup label="Sistema">
            <NavItem
              href="/usuarios"
              label="Usuários"
              icon={
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              }
            />
            <NavItem
              href="/representantes"
              label="Representantes"
              icon={
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <rect x="2" y="7" width="20" height="14" rx="2" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
              }
            />
          </NavGroup>
        </nav>

        <div
          className="mt-auto border-t px-4 py-3"
          style={{ borderColor: "var(--color-border)" }}
        >
          <p
            className="truncate text-sm font-medium"
            style={{ color: "var(--color-text-primary)" }}
          >
            {footerName}
          </p>
          <p
            className="truncate text-xs"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {footerRole}
          </p>
        </div>
      </aside>

      <main
        className="min-w-0 flex-1 overflow-y-auto"
        style={{ backgroundColor: "var(--color-background)" }}
      >
        {children}
      </main>
    </div>
  );
}
