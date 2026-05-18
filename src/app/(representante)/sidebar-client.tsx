"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Users, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase";

type Props = {
  repName: string;
  orgName: string;
  orgLogo: string | null;
};

export default function RepresentanteSidebarClient({ repName, orgName, orgLogo }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <aside
      className="relative flex h-screen w-56 shrink-0 flex-col overflow-y-auto overflow-x-hidden"
      style={{ backgroundColor: "var(--color-surface)" }}
    >
      {/* Faixa verde lateral direita */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-[3px]"
        style={{ background: "linear-gradient(180deg, #D7F205 0%, #BFF205 100%)" }}
        aria-hidden
      />

      {/* SEÇÃO 1 — Org */}
      <Link
        href="/representante/equipes"
        className="flex items-center gap-3 px-5 pt-7 pb-6 transition-opacity hover:opacity-80"
      >
        {orgLogo ? (
          <img src={orgLogo} alt="" className="h-8 w-8 shrink-0 rounded object-contain" />
        ) : (
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded"
            style={{ backgroundColor: "rgba(191,242,5,0.1)" }}
          >
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 800, color: "#BFF205" }}>
              {orgName.slice(0, 2).toUpperCase()}
            </span>
          </div>
        )}
        <span
          style={{
            fontFamily: "var(--font-mono)", fontWeight: 700, color: "#F2F2F2",
            fontSize: orgName.length > 12 ? 13 : orgName.length > 8 ? 15 : 18,
            wordBreak: "break-word", maxWidth: 120, lineHeight: 1.2,
          }}
        >
          {orgName.toUpperCase()}
        </span>
      </Link>

      {/* Separador */}
      <div className="mx-5 mb-5 h-px" style={{ backgroundColor: "var(--color-border)" }} />

      {/* SEÇÃO 2 — Navegação */}
      <div className="flex flex-col gap-3 px-5 pb-6">
        <NavItem
          href="/representante/equipes"
          icon={<Users size={16} strokeWidth={2.5} />}
          label="MINHAS EQUIPES"
          active={isActive("/representante/equipes")}
        />
      </div>

      {/* Separador */}
      <div className="mx-5 mb-5 h-px" style={{ backgroundColor: "var(--color-border)" }} />

      {/* SEÇÃO 3 — Perfil + Sair (empurrado para baixo) */}
      <div className="mt-auto flex flex-col gap-4 px-5 pb-7">
        {/* Nome do representante */}
        <div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 3 }}>
            Conectado como
          </p>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: "#F2F2F2" }}>
            {repName}
          </p>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="flex items-center gap-3 font-mono font-normal transition-opacity hover:opacity-70"
          style={{ color: "#FF4444", fontSize: "15px" }}
        >
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded"
            style={{ backgroundColor: "rgba(255,68,68,0.15)" }}
          >
            <LogOut size={14} strokeWidth={2.5} style={{ color: "#FF4444" }} />
          </span>
          SAIR
        </button>
      </div>
    </aside>
  );
}

function NavItem({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 font-mono font-normal transition-opacity hover:opacity-100"
      style={{ color: active ? "#BFF205" : "#F2F2F2", fontSize: "15px", opacity: active ? 1 : 0.7 }}
    >
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded"
        style={{
          backgroundColor: active ? "rgba(191,242,5,0.15)" : "rgba(215,242,5,0.07)",
          color: active ? "#BFF205" : "rgba(215,242,5,0.6)",
        }}
      >
        {icon}
      </span>
      <span>{label}</span>
    </Link>
  );
}