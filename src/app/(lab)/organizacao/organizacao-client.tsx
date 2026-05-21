"use client";

import Link from "next/link";
import {
  Crown, Users, UserRound, Shield, MapPin, UserCheck,
  ClipboardCheck, Ban, UserCog, CalendarDays, BarChart2, Trophy, Star,
} from "lucide-react";

type Item = {
  href: string;
  icon: React.ElementType;
  label: string;
  description: string;
  placeholder?: boolean;
};

type Section = {
  group: string;
  items: Item[];
};

const sections: Section[] = [
  {
    group: "CADASTROS",
    items: [
      { href: "/competicoes",   icon: Crown,          label: "Competições",      description: "Gerencie as competições e edições" },
      { href: "/equipes",       icon: Shield,         label: "Equipes",          description: "Clubes e equipes da organização" },
      { href: "/atletas",       icon: UserRound,      label: "Atletas",          description: "Cadastro e histórico de atletas" },
      { href: "/arbitros",      icon: Users,          label: "Árbitros",         description: "Árbitros e assistentes cadastrados" },
      { href: "/comissao",      icon: UserCheck,      label: "Comissão Técnica", description: "Técnicos, auxiliares e demais membros" },
      { href: "/locais",        icon: MapPin,         label: "Locais",           description: "Estádios e campos utilizados" },
    ],
  },
  {
    group: "GESTÃO",
    items: [
      { href: "/aprovacoes",     icon: ClipboardCheck, label: "Aprovações",     description: "Inscrições e relatórios pendentes" },
      { href: "/suspensoes",     icon: Ban,            label: "Suspensões",     description: "Suspensões ativas e históricas" },
      { href: "/representantes", icon: UserCog,        label: "Representantes", description: "Acesso e gestão de representantes" },
      { href: "/temporadas",     icon: CalendarDays,   label: "Temporadas",     description: "Anos e temporadas da organização" },
    ],
  },
  {
    group: "RELATÓRIOS & HISTÓRICO",
    items: [
      { href: "/relatorios",    icon: BarChart2, label: "Relatórios",   description: "Exportar dados em CSV e PDF" },
      { href: "/rankings",      icon: Trophy,    label: "Ranking",      description: "Classificações históricas",         placeholder: true },
      { href: "/hall-da-fama",  icon: Star,      label: "Hall da Fama", description: "Maiores destaques da organização" },
    ],
  },
];

export default function OrganizacaoClient() {
  return (
    <div style={{ padding: "32px 32px 64px" }}>

      <div style={{ marginBottom: 40 }}>
        <h1 style={{
          fontFamily: "var(--font-display)",
          fontSize: 22,
          fontWeight: 900,
          color: "var(--color-text-primary)",
          margin: 0,
          letterSpacing: "0.01em",
        }}>
          ORGANIZAÇÃO
        </h1>
        <p style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--color-text-secondary)",
          marginTop: 6,
        }}>
          Gerencie todas as entidades e configurações da organização
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
        {sections.map((section) => (
          <div key={section.group}>

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <span style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#BFF205",
              }}>
                {section.group}
              </span>
              <div style={{
                flex: 1,
                height: 1,
                background: "linear-gradient(to right, rgba(191,242,5,0.3), transparent)",
              }} />
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 12,
            }}>
              {section.items.map((item) => (
                <ItemCard key={item.href} item={item} />
              ))}
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}

function ItemCard({ item }: { item: Item }) {
  const Icon = item.icon;

  if (item.placeholder) {
    return (
      <div style={{
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.08)",
        backgroundColor: "var(--color-surface)",
        padding: "16px 18px",
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
        opacity: 0.4,
        cursor: "not-allowed",
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.08)",
          backgroundColor: "rgba(255,255,255,0.03)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <Icon size={16} strokeWidth={1.8} color="rgba(255,255,255,0.3)" />
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <p style={{
              fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600,
              color: "var(--color-text-primary)", margin: 0,
            }}>
              {item.label}
            </p>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700,
              letterSpacing: "0.1em", padding: "2px 8px", borderRadius: 20,
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.4)",
              backgroundColor: "rgba(255,255,255,0.04)",
              textTransform: "uppercase",
            }}>
              em breve
            </span>
          </div>
          <p style={{
            fontFamily: "var(--font-mono)", fontSize: 11,
            color: "var(--color-text-secondary)", marginTop: 4,
          }}>
            {item.description}
          </p>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      style={{
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.08)",
        backgroundColor: "var(--color-surface)",
        padding: "16px 18px",
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
        textDecoration: "none",
        opacity: 0.82,
        transition: "opacity 0.15s, border-color 0.15s, background-color 0.15s",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.opacity = "1";
        el.style.borderColor = "rgba(191,242,5,0.25)";
        el.style.backgroundColor = "rgba(191,242,5,0.03)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.opacity = "0.82";
        el.style.borderColor = "rgba(255,255,255,0.08)";
        el.style.backgroundColor = "var(--color-surface)";
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.08)",
        backgroundColor: "rgba(255,255,255,0.03)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <Icon size={16} strokeWidth={1.8} color="#A6A6A6" />
      </div>
      <div>
        <p style={{
          fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600,
          color: "var(--color-text-primary)", margin: 0,
        }}>
          {item.label}
        </p>
        <p style={{
          fontFamily: "var(--font-mono)", fontSize: 11,
          color: "var(--color-text-secondary)", marginTop: 4,
        }}>
          {item.description}
        </p>
      </div>
    </Link>
  );
}