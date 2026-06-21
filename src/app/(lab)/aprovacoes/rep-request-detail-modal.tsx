"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { LabSelect } from "@/app/(lab)/components/lab-select";
import { decidirSolicitacaoRepresentante } from "./actions";
import { toast } from "@/app/(lab)/components/toast";
import type { DraftMemberData } from "./admin-roster-rpc-errors";
import { isNewMemberRequestType } from "@/app/(rep)/lib/roster-request-types";
import type { RepRosterRequest } from "./admin-roster-rpc-errors";

function applyDateMask(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function parseDateToISO(br: string): string | null {
  const clean = br.replace(/\D/g, "");
  if (clean.length !== 8) return null;
  return `${clean.slice(4, 8)}-${clean.slice(2, 4)}-${clean.slice(0, 2)}`;
}

function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return "";
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  backgroundColor: "var(--color-input-bg)",
  border: "1px solid var(--color-input-border)",
  borderRadius: 9,
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: "var(--color-text-primary)",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  fontWeight: 800,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--color-text-faint)",
  display: "block",
  marginBottom: 5,
};

export default function RepRequestDetailModal({
  request,
  onClose,
  onDecided,
}: {
  request: RepRosterRequest;
  onClose: () => void;
  onDecided: (requestId: string) => void;
}) {
  const isNewMember = isNewMemberRequestType(request.requestType);
  const draft = request.draftData;

  const [fullName, setFullName] = useState(draft?.full_name ?? "");
  const [surname, setSurname] = useState(draft?.surname ?? "");
  const [nationality, setNationality] = useState(draft?.nationality ?? "Brasil");
  const [gender, setGender] = useState(draft?.gender ?? "");
  const [birthDate, setBirthDate] = useState(formatDateBR(draft?.birth_date ?? null));
  const [positionId, setPositionId] = useState(draft?.position_id ?? "");
  const [staffRoleId, setStaffRoleId] = useState(draft?.staff_role_id ?? "");
  const [decisionNote, setDecisionNote] = useState("");
  const [positions, setPositions] = useState<Array<{ id: string; full_name: string }>>([]);
  const [staffRoles, setStaffRoles] = useState<Array<{ id: string; full_name: string }>>([]);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!isNewMember) return;
    const supabase = createClient();
    supabase.from("player_positions").select("id, full_name")
      .eq("sport_slug", "football7").order("display_order")
      .then(({ data }) => setPositions((data ?? []) as Array<{ id: string; full_name: string }>));
    supabase.from("staff_roles").select("id, full_name")
      .order("display_order")
      .then(({ data }) => setStaffRoles((data ?? []) as Array<{ id: string; full_name: string }>));
  }, [isNewMember]);

  async function handleDecision(decision: "approved" | "rejected") {
    let overrideDraftData: DraftMemberData | null = null;

    if (decision === "approved" && isNewMember) {
      if (!fullName.trim()) {
        toast("error", "Nome completo é obrigatório.");
        return;
      }
      const isoDate = birthDate ? parseDateToISO(birthDate) : null;
      if (birthDate && !isoDate) {
        toast("error", "Data de nascimento inválida.");
        return;
      }
      if (request.memberType === "athlete" && !positionId) {
        toast("error", "Selecione a posição.");
        return;
      }
      if (request.memberType === "staff" && !staffRoleId) {
        toast("error", "Selecione a função.");
        return;
      }
      overrideDraftData = {
        full_name: fullName.trim(),
        surname: surname.trim() || null,
        nationality: nationality.trim() || null,
        gender: gender || null,
        birth_date: isoDate,
        position_id: request.memberType === "athlete" ? positionId : null,
        staff_role_id: request.memberType === "staff" ? staffRoleId : null,
      };
    }

    setProcessing(true);
    const result = await decidirSolicitacaoRepresentante({
      requestId: request.id,
      decision,
      decisionNote: decisionNote.trim() || null,
      overrideDraftData,
    });
    setProcessing(false);

    if ("error" in result) {
      toast("error", result.error);
      return;
    }

    toast("success", decision === "approved" ? "Solicitação aprovada." : "Solicitação rejeitada.");
    onDecided(request.id);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
      <div
        className="w-full max-w-lg rounded-xl border shadow-xl max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        <div className="flex items-center justify-between border-b px-5 py-4 sticky top-0 z-10"
          style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
          <h2 className="font-display text-base" style={{ color: "var(--color-text-primary)" }}>
            Detalhes da solicitação
          </h2>
          <button type="button" onClick={onClose} style={{ color: "var(--color-text-secondary)" }}>
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span style={labelStyle}>Representante</span>
              <p className="font-mono text-xs" style={{ color: "var(--color-text-primary)", margin: 0 }}>
                {request.repName}
              </p>
            </div>
            <div>
              <span style={labelStyle}>Equipe solicitante</span>
              <p className="font-mono text-xs" style={{ color: "var(--color-text-primary)", margin: 0 }}>
                {request.requestingTeamName}
              </p>
            </div>
            <div>
              <span style={labelStyle}>Tipo</span>
              <p className="font-mono text-xs" style={{ color: "var(--color-brand)", margin: 0 }}>
                {request.typeLabel}
              </p>
            </div>
            <div>
              <span style={labelStyle}>Contexto</span>
              <p className="font-mono text-xs" style={{ color: "var(--color-text-primary)", margin: 0 }}>
                {request.contextLabel}
              </p>
            </div>
          </div>

          {request.sourceTeamName && (
            <div>
              <span style={labelStyle}>Equipe de origem</span>
              <p className="font-mono text-xs" style={{ color: "var(--color-text-primary)", margin: 0 }}>
                {request.sourceTeamName}
              </p>
            </div>
          )}

          {request.requiresCounterparty && (
            <div
              className="rounded-lg border px-3 py-2"
              style={{
                borderColor: request.counterpartyApproved ? "rgba(191,242,5,0.3)" : "rgba(242,192,5,0.35)",
                backgroundColor: request.counterpartyApproved ? "rgba(191,242,5,0.06)" : "rgba(242,192,5,0.08)",
              }}
            >
              <p className="font-mono text-xs font-bold" style={{
                color: request.counterpartyApproved ? "var(--color-brand)" : "#F2C005",
                margin: 0,
              }}>
                {request.counterpartyApproved
                  ? "Contraparte confirmou a liberação"
                  : "Aguardando confirmação da contraparte"}
              </p>
            </div>
          )}

          {!isNewMember && (
            <div>
              <span style={labelStyle}>Pessoa envolvida</span>
              <p className="font-mono text-sm font-bold" style={{ color: "var(--color-text-primary)", margin: "0 0 2px" }}>
                {request.personName}
              </p>
              {request.personSubtitle && (
                <p className="font-mono text-xs" style={{ color: "var(--color-text-secondary)", margin: 0 }}>
                  {request.personSubtitle}
                </p>
              )}
            </div>
          )}

          {isNewMember && (
            <div className="space-y-3 rounded-lg border p-4"
              style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }}>
              <p className="font-mono text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-brand)", margin: 0 }}>
                Dados do novo membro (editável)
              </p>
              <div>
                <span style={labelStyle}>Nome completo *</span>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <span style={labelStyle}>Apelido</span>
                <input type="text" value={surname} onChange={e => setSurname(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <span style={labelStyle}>Nacionalidade</span>
                <input type="text" value={nationality} onChange={e => setNationality(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <span style={labelStyle}>Gênero</span>
                <LabSelect
                  value={gender}
                  onChange={setGender}
                  placeholder="Selecione…"
                  options={[
                    { value: "male", label: "Masculino" },
                    { value: "female", label: "Feminino" },
                  ]}
                />
              </div>
              <div>
                <span style={labelStyle}>Data de nascimento</span>
                <input
                  type="text"
                  value={birthDate}
                  onChange={e => setBirthDate(applyDateMask(e.target.value))}
                  placeholder="DD/MM/AAAA"
                  style={inputStyle}
                />
              </div>
              {request.memberType === "athlete" ? (
                <div>
                  <span style={labelStyle}>Posição *</span>
                  <LabSelect
                    value={positionId}
                    onChange={setPositionId}
                    placeholder="Selecione…"
                    options={positions.map(p => ({ value: p.id, label: p.full_name }))}
                  />
                </div>
              ) : (
                <div>
                  <span style={labelStyle}>Função *</span>
                  <LabSelect
                    value={staffRoleId}
                    onChange={setStaffRoleId}
                    placeholder="Selecione…"
                    options={staffRoles.map(r => ({ value: r.id, label: r.full_name }))}
                  />
                </div>
              )}
            </div>
          )}

          <div>
            <span style={labelStyle}>Observação (opcional)</span>
            <input
              type="text"
              value={decisionNote}
              onChange={e => setDecisionNote(e.target.value)}
              placeholder="Nota da decisão…"
              style={inputStyle}
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end border-t px-5 py-4 sticky bottom-0"
          style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
          <button type="button" onClick={onClose} disabled={processing}
            className="rounded-lg border px-4 py-2 font-mono text-xs"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
            Cancelar
          </button>
          <button type="button" onClick={() => handleDecision("rejected")} disabled={processing}
            className="rounded-lg border px-4 py-2 font-mono text-xs disabled:opacity-50"
            style={{ borderColor: "var(--color-danger)", color: "var(--color-danger)" }}>
            Rejeitar
          </button>
          <button type="button" onClick={() => handleDecision("approved")} disabled={processing}
            className="rounded-lg px-4 py-2 font-mono text-xs font-medium disabled:opacity-50"
            style={{ backgroundColor: "var(--color-brand)", color: "var(--color-on-brand)" }}>
            {processing ? "Processando…" : "Aprovar"}
          </button>
        </div>
      </div>
    </div>
  );
}
