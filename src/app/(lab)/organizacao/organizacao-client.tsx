"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  Ban,
  BarChart2,
  CalendarDays,
  ClipboardCheck,
  Crown,
  FileText,
  MapPin,
  Shield,
  Star,
  Tag,
  Trophy,
  UserCheck,
  UserCog,
  UserRound,
  Users,
} from "lucide-react";
import { EntityHubSectionHeader } from "@/app/(lab)/components/entity-hub-section-header";
import styles from "@/app/(lab)/components/entity-hub.module.css";

type Item = {
  href: string;
  icon: React.ElementType;
  label: string;
  description: string;
  placeholder?: boolean;
};

type Section = {
  group: string;
  subtitle: string;
  tab: "cadastros" | "gestao" | "relatorios";
  items: Item[];
};

const sections: Section[] = [
  {
    group: "Cadastros",
    subtitle: "Entidades base da organização",
    tab: "cadastros",
    items: [
      { href: "/competicoes", icon: Crown, label: "Competições", description: "Gerencie as competições e edições" },
      { href: "/equipes", icon: Shield, label: "Equipes", description: "Clubes e equipes da organização" },
      { href: "/atletas", icon: UserRound, label: "Atletas", description: "Cadastro e histórico de atletas" },
      { href: "/comissao", icon: UserCheck, label: "Comissão Técnica", description: "Técnicos, auxiliares e demais membros" },
      { href: "/locais", icon: MapPin, label: "Locais", description: "Estádios e campos utilizados" },
      { href: "/arbitros", icon: Users, label: "Árbitros", description: "Árbitros e assistentes cadastrados" },
    ],
  },
  {
    group: "Gestão",
    subtitle: "Operação e controle do dia a dia",
    tab: "gestao",
    items: [
      { href: "/aprovacoes", icon: ClipboardCheck, label: "Aprovações", description: "Inscrições e relatórios pendentes" },
      { href: "/suspensoes", icon: Ban, label: "Suspensões", description: "Suspensões ativas e históricas" },
      { href: "/representantes", icon: UserCog, label: "Representantes", description: "Acesso e gestão de representantes" },
      { href: "/temporadas", icon: CalendarDays, label: "Temporadas", description: "Anos e temporadas da organização" },
      { href: "/categorias", icon: Tag, label: "Categorias", description: "Categorias globais da organização" },
    ],
  },
  {
    group: "Relatórios",
    subtitle: "Dados, rankings e documentos",
    tab: "relatorios",
    items: [
      { href: "/relatorios", icon: BarChart2, label: "Relatórios", description: "Exportar dados em CSV e PDF" },
      { href: "/rankings", icon: Trophy, label: "Ranking", description: "Classificações históricas" },
      { href: "/hall-da-fama", icon: Star, label: "Hall da Fama", description: "Maiores destaques da organização" },
      { href: "/relatorios", icon: FileText, label: "Súmulas", description: "Gerar e exportar súmulas oficiais" },
    ],
  },
];

const TABS = [
  { key: "cadastros" as const, label: "CADASTROS" },
  { key: "gestao" as const, label: "GESTÃO" },
  { key: "relatorios" as const, label: "RELATÓRIOS" },
];

type TabKey = (typeof TABS)[number]["key"];

const VALID_TABS = new Set<TabKey>(["cadastros", "gestao", "relatorios"]);

function parseTab(param: string | null): TabKey {
  if (param && VALID_TABS.has(param as TabKey)) return param as TabKey;
  return "cadastros";
}

export default function OrganizacaoClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tabFromUrl = parseTab(searchParams.get("tab"));
  const [activeTab, setActiveTab] = useState<TabKey>(tabFromUrl);

  useEffect(() => {
    setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  const setTab = useCallback((tab: TabKey) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "cadastros") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const activeSection = sections.find((section) => section.tab === activeTab);

  return (
    <div className={`${styles.entityHub} ${styles.page}`}>
      <div className={`${styles.header} ${styles.orgHubHeaderTabsOnly}`}>
        <div className={styles.headerGlow} />
        <div className={styles.headerSurface} />
        <div className={styles.headerInner}>
          <div className={styles.tabBar}>
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setTab(tab.key)}
                className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ""}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={`${styles.content} ${styles.orgHubContent}`}>
        {activeSection && (
          <div key={activeTab} className={styles.orgTabPanel}>
            <EntityHubSectionHeader
              title={activeSection.group}
              subtitle={activeSection.subtitle}
            />
            <div className={styles.orgNavGrid}>
              {activeSection.items.map((item) => (
                <OrgNavCard key={`${activeSection.tab}-${item.href}-${item.label}`} item={item} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function OrgNavCard({ item }: { item: Item }) {
  const Icon = item.icon;

  if (item.placeholder) {
    return (
      <div className={`${styles.orgNavCard} ${styles.orgNavCardDisabled}`} aria-disabled>
        <div className={styles.orgNavCardIcon}>
          <Icon size={26} strokeWidth={1.65} />
        </div>
        <div className={styles.orgNavCardBody}>
          <div className={styles.orgNavCardTitleRow}>
            <p className={styles.orgNavCardTitle}>{item.label}</p>
            <span className={styles.orgNavBadge}>em breve</span>
          </div>
          <p className={styles.orgNavCardDesc}>{item.description}</p>
        </div>
      </div>
    );
  }

  return (
    <Link href={item.href} className={styles.orgNavCard}>
      <div className={styles.orgNavCardIcon}>
        <Icon size={26} strokeWidth={1.65} />
      </div>
      <div className={styles.orgNavCardBody}>
        <div className={styles.orgNavCardTitleRow}>
          <p className={styles.orgNavCardTitle}>{item.label}</p>
          <ArrowUpRight size={14} strokeWidth={2} className={styles.orgNavCardArrow} aria-hidden />
        </div>
        <p className={styles.orgNavCardDesc}>{item.description}</p>
      </div>
    </Link>
  );
}
