"use client";



import { LAB_ACCENT_HEX } from "@/lib/lab-theme";

import {

  modalCloseButtonStyle,

  modalHeaderDividerStyle,

  modalOverlayStyle,

  modalPanelStyle,

  primaryDangerButtonStyle,

  secondaryButtonStyle,

} from "@/lib/lab-ui-styles";



type Props = {

  open: boolean;

  saving: boolean;

  /** Ex.: "atleta" ou "membro da comissão" */

  entityLabel: string;

  teamName: string | null;

  accentColor?: string;

  onClose: () => void;

  onConfirm: () => void;

};



export function EncerrarVinculoModal({

  open,

  saving,

  entityLabel,

  teamName,

  accentColor = LAB_ACCENT_HEX,

  onClose,

  onConfirm,

}: Props) {

  if (!open) return null;



  const team = teamName ?? "equipe atual";



  return (

    <div

      style={modalOverlayStyle}

      onClick={saving ? undefined : onClose}

    >

      <div

        style={{ ...modalPanelStyle, maxWidth: 420 }}

        onClick={(e) => e.stopPropagation()}

      >

        <div style={{

          padding: "18px 20px",

          ...modalHeaderDividerStyle,

          background: `linear-gradient(135deg, ${accentColor}14 0%, transparent 60%)`,

        }}>

          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>

            <div>

              <p style={{

                fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800,

                letterSpacing: "0.14em", textTransform: "uppercase",

                color: accentColor, margin: 0, marginBottom: 6,

              }}>

                Encerrar vínculo

              </p>

              <p style={{

                fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700,

                color: "var(--color-text-primary)", margin: 0, lineHeight: 1.35,

              }}>

                Desvincular {entityLabel} de {team}?

              </p>

            </div>

            <button

              type="button"

              onClick={onClose}

              disabled={saving}

              style={{

                ...modalCloseButtonStyle,

                cursor: saving ? "not-allowed" : "pointer",

              }}

            >

              ×

            </button>

          </div>

        </div>



        <div style={{ padding: "16px 20px 20px" }}>

          <p style={{

            fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800,

            letterSpacing: "0.1em", textTransform: "uppercase",

            color: "var(--color-text-muted)", margin: "0 0 10px",

          }}>

            O que acontece

          </p>

          <ul style={{

            margin: 0, padding: "12px 14px 12px 28px",

            borderRadius: 10,

            border: "1px solid var(--color-danger-muted-border)",

            backgroundColor: "var(--color-danger-muted-bg)",

            fontFamily: "var(--font-mono)", fontSize: 11,

            color: "var(--color-text-subtle)", lineHeight: 1.65,

          }}>

            <li>O vínculo com <strong style={{ color: "var(--color-text-primary)", fontWeight: 700 }}>{team}</strong> será encerrado com a data de hoje.</li>

            <li>O {entityLabel} ficará <strong style={{ color: "var(--color-text-primary)", fontWeight: 700 }}>sem clube</strong> até um novo vínculo ser criado ou transferido.</li>

            <li>O histórico na linha do tempo é preservado — apenas a passagem atual é fechada.</li>

            <li>Inscrições e estatísticas de competições anteriores <strong style={{ color: "var(--color-text-primary)", fontWeight: 700 }}>não são removidas</strong>.</li>

          </ul>

          <p style={{

            fontFamily: "var(--font-mono)", fontSize: 10,

            color: "var(--color-text-hint)", margin: "12px 0 0", lineHeight: 1.5,

          }}>

            Use esta opção quando o {entityLabel} sair do clube sem transferência imediata para outra equipe.

          </p>

        </div>



        <div style={{

          display: "flex", gap: 8, padding: "0 20px 18px",

          justifyContent: "flex-end",

        }}>

          <button

            type="button"

            onClick={onClose}

            disabled={saving}

            style={{

              ...secondaryButtonStyle,

              cursor: saving ? "not-allowed" : "pointer",

            }}

          >

            Cancelar

          </button>

          <button

            type="button"

            onClick={onConfirm}

            disabled={saving}

            style={{

              ...primaryDangerButtonStyle,

              backgroundColor: saving ? "var(--color-danger-disabled-bg)" : "var(--color-danger)",

              cursor: saving ? "not-allowed" : "pointer",

            }}

          >

            {saving ? "Encerrando…" : "Encerrar vínculo"}

          </button>

        </div>

      </div>

    </div>

  );

}


