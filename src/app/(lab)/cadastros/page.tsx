import Link from "next/link";
import {
  Users, UserCheck, MapPin, Shield,
} from "lucide-react";

const items = [
  {
    href: "/equipes",
    icon: Shield,
    label: "Equipes",
    description: "Gerencie os clubes e equipes da organização",
  },
  {
    href: "/atletas",
    icon: Users,
    label: "Atletas",
    description: "Cadastro e histórico de atletas",
  },
  {
    href: "/comissao",
    icon: UserCheck,
    label: "Comissão Técnica",
    description: "Técnicos, auxiliares e demais membros",
  },
  {
    href: "/arbitros",
    icon: Shield,
    label: "Árbitros",
    description: "Árbitros e assistentes cadastrados",
  },
  {
    href: "/locais",
    icon: MapPin,
    label: "Locais",
    description: "Estádios e campos utilizados",
  },
];

export default function CadastrosPage() {
  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold" style={{ color: "var(--color-text-primary)" }}>
          CADASTROS
        </h1>
        <p className="mt-1 font-mono text-sm" style={{ color: "var(--color-text-secondary)" }}>
          Gerencie todas as entidades da organização
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex items-start gap-4 rounded-xl border p-5 transition-all duration-150 hover:border-[var(--color-brand)] hover:bg-[rgba(191,242,5,0.04)]"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-colors group-hover:border-[var(--color-brand)]"
              style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }}
            >
              <item.icon size={18} strokeWidth={1.8} style={{ color: "var(--color-text-secondary)" }} />
            </div>
            <div className="min-w-0">
              <p className="font-mono text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                {item.label}
              </p>
              <p className="mt-0.5 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                {item.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}