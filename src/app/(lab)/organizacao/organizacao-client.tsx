"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Crown, Users, UserRound, Shield, MapPin, UserCheck,
  ClipboardCheck, Ban, UserCog, CalendarDays, BarChart2, Trophy, Star,
  Tag, FileText,
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
  tab: "cadastros" | "gestao" | "relatorios";
  items: Item[];
};

const sections: Section[] = [
  {
    group: "CADASTROS",
    tab: "cadastros",
    items: [
      { href: "/competicoes",   icon: Crown,          label: "Competições",      description: "Gerencie as competições e edições" },
      { href: "/equipes",       icon: Shield,         label: "Equipes",          description: "Clubes e equipes da organização" },
      { href: "/atletas",       icon: UserRound,      label: "Atletas",          description: "Cadastro e histórico de atletas" },
      { href: "/comissao",      icon: UserCheck,      label: "Comissão Técnica", description: "Técnicos, auxiliares e demais membros" },
      { href: "/locais",        icon: MapPin,         label: "Locais",           description: "Estádios e campos utilizados" },
      { href: "/arbitros",      icon: Users,          label: "Árbitros",         description: "Árbitros e assistentes cadastrados" },
    ],
  },
  {
    group: "GESTÃO",
    tab: "gestao",
    items: [
      { href: "/aprovacoes",     icon: ClipboardCheck, label: "Aprovações",     description: "Inscrições e relatórios pendentes" },
      { href: "/suspensoes",     icon: Ban,            label: "Suspensões",     description: "Suspensões ativas e históricas" },
      { href: "/representantes", icon: UserCog,        label: "Representantes", description: "Acesso e gestão de representantes" },
      { href: "/temporadas",     icon: CalendarDays,   label: "Temporadas",     description: "Anos e temporadas da organização" },
      { href: "/categorias",     icon: Tag,            label: "Categorias",     description: "Categorias globais da organização" },
    ],
  },
  {
    group: "RELATÓRIOS",
    tab: "relatorios",
    items: [
      { href: "/relatorios",    icon: BarChart2, label: "Relatórios",   description: "Exportar dados em CSV e PDF" },
      { href: "/rankings",      icon: Trophy,    label: "Ranking",      description: "Classificações históricas" },
      { href: "/hall-da-fama",  icon: Star,      label: "Hall da Fama", description: "Maiores destaques da organização" },
      { href: "/relatorios",    icon: FileText,  label: "Súmulas",      description: "Gerar e exportar súmulas oficiais" },
    ],
  },
];

const TABS = [
  { key: "cadastros" as const, label: "CADASTROS" },
  { key: "gestao" as const, label: "GESTÃO" },
  { key: "relatorios" as const, label: "RELATÓRIOS" },
];

export default function OrganizacaoClient() {
  const [activeTab, setActiveTab] = useState<"cadastros" | "gestao" | "relatorios">("cadastros");
  const activeSection = sections.find(s => s.tab === activeTab);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "var(--color-background)" }}>

      <div style={{ backgroundColor: "var(--color-surface)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ padding: "20px 32px 0" }}>
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
            marginBottom: 20,
          }}>
            Gerencie todas as entidades e configurações da organização
          </p>

          <div style={{ display: "flex", gap: 0 }}>
            {TABS.map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: "11px 18px",
                  border: "none",
                  borderBottom: `2px solid ${activeTab === tab.key ? "#BFF205" : "transparent"}`,
                  backgroundColor: "transparent",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  color: activeTab === tab.key ? "#BFF205" : "#666",
                  cursor: "pointer",
                  transition: "color 0.12s",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: "32px 32px 64px" }}>
        {activeSection && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 12,
          }}>
            {activeSection.items.map((item) => (
              <ItemCard key={`${activeSection.tab}-${item.href}-${item.label}`} item={item} />
            ))}
          </div>
        )}
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
