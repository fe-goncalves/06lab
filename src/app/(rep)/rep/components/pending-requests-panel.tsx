"use client";

import { useState } from "react";
import { confirmarLiberacaoCounterparty, type PendingRosterRequest } from "../actions";
import { REQUEST_TYPE_LABELS } from "@/app/(rep)/lib/roster-rpc-errors";
import { MemberAvatar, glassRosterCardStyle } from "./rep-roster-ui";
import { rosterDisplayName, applyButtonHover, clearButtonHover, transitionFast } from "./rep-ui";

function memberName(req: PendingRosterRequest): string {
  if (req.athlete) return rosterDisplayName(req.athlete.full_name, req.athlete.surname);
  if (req.staff) return rosterDisplayName(req.staff.full_name, req.staff.surname);
  return "Membro";
}

function memberPhoto(req: PendingRosterRequest): string | null {
  if (req.athlete) return req.athlete.photo_url;
  if (req.staff) return req.staff.photo_url;
  return null;
}

export default function PendingRequestsPanel({
  outgoing,
  counterparty,
  onRefresh,
}: {
  outgoing: PendingRosterRequest[];
  counterparty: PendingRosterRequest[];
  onRefresh: () => void;
}) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  if (outgoing.length === 0 && counterparty.length === 0) return null;

  async function handleConfirm(requestId: string) {
    if (!confirm("Confirmar a liberação deste membro para transferência?")) return;
    setConfirmingId(requestId);
    const result = await confirmarLiberacaoCounterparty(requestId);
    setConfirmingId(null);
    if ("error" in result) {
      alert(result.error);
      return;
    }
    onRefresh();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {counterparty.length > 0 && (
        <div style={{ ...glassRosterCardStyle, borderColor: "rgba(242,192,5,0.35)" }}>
          <p style={{
            fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800,
            letterSpacing: "0.12em", textTransform: "uppercase",
            color: "#F2C005", margin: "0 0 12px",
          }}>
            Aguardando sua confirmação de liberação
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {counterparty.map(req => (
              <div
                key={req.id}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 12px", borderRadius: 10,
                  backgroundColor: "rgba(242,192,5,0.06)",
                  border: "1px solid rgba(242,192,5,0.2)",
                }}
              >
                <MemberAvatar name={memberName(req)} photoUrl={memberPhoto(req)} size={34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>
                    {memberName(req)}
                  </p>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-text-muted)", margin: "2px 0 0" }}>
                    {REQUEST_TYPE_LABELS[req.request_type] ?? req.request_type}
                    {req.requesting_team ? ` · solicitado por ${req.requesting_team.full_name}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={confirmingId === req.id}
                  onClick={() => handleConfirm(req.id)}
                  style={{
                    padding: "7px 14px", borderRadius: 8, border: "none",
                    backgroundColor: "var(--color-brand)", color: "#0a0a0a",
                    fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800,
                    letterSpacing: "0.08em", textTransform: "uppercase",
                    cursor: "pointer", flexShrink: 0, transition: transitionFast,
                  }}
                  onMouseEnter={e => applyButtonHover(e, confirmingId === req.id)}
                  onMouseLeave={e => clearButtonHover(e, confirmingId === req.id)}
                >
                  {confirmingId === req.id ? "…" : "Confirmar liberação"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {outgoing.length > 0 && (
        <div style={glassRosterCardStyle}>
          <p style={{
            fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800,
            letterSpacing: "0.12em", textTransform: "uppercase",
            color: "var(--color-brand)", margin: "0 0 12px",
          }}>
            Suas solicitações pendentes
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {outgoing.map((req, i) => (
              <div
                key={req.id}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 0",
                  borderBottom: i < outgoing.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                }}
              >
                <MemberAvatar name={memberName(req)} photoUrl={memberPhoto(req)} size={34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>
                    {memberName(req)}
                  </p>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-text-muted)", margin: "2px 0 0" }}>
                    {REQUEST_TYPE_LABELS[req.request_type] ?? req.request_type}
                    {" · "}
                    {req.member_type === "athlete" ? "Atleta" : "Comissão"}
                  </p>
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--color-text-ghost)", flexShrink: 0 }}>
                  {new Date(req.created_at).toLocaleDateString("pt-BR")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
