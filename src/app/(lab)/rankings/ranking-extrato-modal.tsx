"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import styles from "@/app/(lab)/components/entity-hub.module.css";
import type { RankingExtrato } from "./actions";

type Props = {
  extrato: RankingExtrato | null;
  loading: boolean;
  onClose: () => void;
};

export function RankingExtratoModal({ extrato, loading, onClose }: Props) {
  if (!extrato && !loading) return null;

  const displayLabel = extrato
    ? (extrato.short_name ?? extrato.team_name).toUpperCase()
    : "—";

  return (
    <div className={styles.rankingExtratoOverlay} onClick={onClose}>
      <div
        className={styles.rankingExtratoPanel}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ranking-extrato-title"
      >
        <div className={styles.rankingExtratoHeader}>
          <div className={styles.rankingExtratoHeaderMain}>
            {extrato && (
              <div className={styles.hubListTeamLogoMain} title={extrato.team_name}>
                {extrato.logo_url ? (
                  <img src={extrato.logo_url} alt="" loading="lazy" decoding="async" />
                ) : (
                  <span className={styles.hubListTeamLogoFallback}>{displayLabel.slice(0, 2)}</span>
                )}
              </div>
            )}
            <div>
              <p id="ranking-extrato-title" className={styles.rankingExtratoTitle}>
                Extrato de pontuação
              </p>
              {extrato && (
                <p className={styles.rankingExtratoTeamName}>{displayLabel}</p>
              )}
            </div>
          </div>
          <div className={styles.rankingExtratoHeaderActions}>
            {extrato && (
              <Link href={`/equipes/${extrato.team_id}`} className={styles.rankingExtratoTeamLink}>
                Ver equipe
                <ArrowUpRight size={13} strokeWidth={2.2} />
              </Link>
            )}
            <button type="button" onClick={onClose} className={styles.rankingExtratoClose}>
              ×
            </button>
          </div>
        </div>

        <div className={styles.rankingExtratoBody}>
          {loading ? (
            <p className={styles.rankingExtratoLoading}>Carregando extrato…</p>
          ) : extrato && extrato.editions.length === 0 && extrato.manual_adjustments.length === 0 ? (
            <p className={styles.rankingExtratoEmpty}>Nenhuma pontuação registrada para este filtro.</p>
          ) : extrato ? (
            <>
              {extrato.editions.map((edition) => (
                <section key={edition.edition_id} className={styles.rankingExtratoEdition}>
                  <div className={styles.rankingExtratoEditionHead}>
                    <div>
                      <p className={styles.rankingExtratoEditionTitle}>{edition.competition_label}</p>
                      <p className={styles.rankingExtratoEditionMeta}>
                        {edition.season_name}
                        {edition.year_value != null ? ` · ${edition.year_value}` : ""}
                      </p>
                    </div>
                    <span className={styles.rankingExtratoEditionTotal}>{edition.subtotal} pts</span>
                  </div>
                  <div className={styles.rankingExtratoLines}>
                    {edition.lines.map((line) => (
                      <div key={`${edition.edition_id}-${line.category_code}`} className={styles.rankingExtratoLine}>
                        <span>{line.category_label}</span>
                        <span>{line.points} pts</span>
                      </div>
                    ))}
                  </div>
                </section>
              ))}

              {extrato.manual_adjustments.length > 0 && (
                <section className={styles.rankingExtratoEdition}>
                  <div className={styles.rankingExtratoEditionHead}>
                    <div>
                      <p className={styles.rankingExtratoEditionTitle}>Ajustes manuais</p>
                      <p className={styles.rankingExtratoEditionMeta}>Fora do recorte de edição</p>
                    </div>
                  </div>
                  <div className={styles.rankingExtratoLines}>
                    {extrato.manual_adjustments.map((item, idx) => (
                      <div key={`manual-${idx}`} className={styles.rankingExtratoLine}>
                        <span>{item.label}</span>
                        <span>{item.points > 0 ? "+" : ""}{item.points} pts</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <div className={styles.rankingExtratoFooter}>
                <span>Total</span>
                <span className={styles.rankingExtratoFooterValue}>{extrato.total} pts</span>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
