"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { LabSelect } from "@/app/(lab)/components/lab-select";
import { findPendingRequestForMember } from "@/app/(rep)/lib/roster-pending";
import CountrySearchSelect from "./country-search-select";
import { MemberAvatar } from "./rep-roster-ui";
import {
  buscarMembrosOrganizacao,
  criarSolicitacaoRoster,
  type MemberSearchResult,
  type PendingRosterRequest,
} from "../actions";
import {
  FieldLabel,
  FeedbackMessage,
  StyledInput,
  SubmittedRequestCard,
  rosterDisplayName,
  transitionFast,
} from "./rep-ui";
import { modalOverlayStyle, modalPanelStyle, secondaryButtonStyle } from "@/lib/lab-ui-styles";

type ModalMode = "include" | "remove";

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

export default function RosterRequestModal({
  open,
  mode,
  teamId,
  editionId,
  memberType: initialMemberType,
  pendingRequests = [],
  removeTarget,
  onClose,
  onSuccess,
}: {
  open: boolean;
  mode: ModalMode;
  teamId: string;
  editionId?: string | null;
  memberType?: "athlete" | "staff";
  pendingRequests?: PendingRosterRequest[];
  removeTarget?: {
    memberType: "athlete" | "staff";
    athleteId?: string | null;
    staffMemberId?: string | null;
    displayName: string;
  } | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [memberType, setMemberType] = useState<"athlete" | "staff">(initialMemberType ?? "athlete");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MemberSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberSearchResult | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);

  const [fullName, setFullName] = useState("");
  const [surname, setSurname] = useState("");
  const [nationality, setNationality] = useState("Brasil");
  const [gender, setGender] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [positionId, setPositionId] = useState("");
  const [staffRoleId, setStaffRoleId] = useState("");

  const [positions, setPositions] = useState<Array<{ id: string; full_name: string }>>([]);
  const [staffRoles, setStaffRoles] = useState<Array<{ id: string; full_name: string }>>([]);

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setMemberType(initialMemberType ?? "athlete");
    setSearchQuery("");
    setSearchResults([]);
    setSelectedMember(null);
    setShowNewForm(false);
    setFullName("");
    setSurname("");
    setNationality("Brasil");
    setGender("");
    setBirthDate("");
    setPositionId("");
    setStaffRoleId("");
    setFeedback(null);

    const supabase = createClient();
    supabase.from("player_positions").select("id, full_name")
      .eq("sport_slug", "football7").order("display_order")
      .then(({ data }) => setPositions((data ?? []) as Array<{ id: string; full_name: string }>));
    supabase.from("staff_roles").select("id, full_name")
      .order("display_order")
      .then(({ data }) => setStaffRoles((data ?? []) as Array<{ id: string; full_name: string }>));
  }, [open, initialMemberType]);

  useEffect(() => {
    if (!open || mode !== "include") return;
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      const result = await buscarMembrosOrganizacao(searchQuery, memberType);
      setSearching(false);
      if ("error" in result) {
        setFeedback({ type: "error", text: result.error });
        return;
      }
      setSearchResults(result.results);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, memberType, open, mode]);

  if (!open) return null;

  async function handleSubmitIncludeExisting() {
    if (!selectedMember) return;
    setSaving(true);
    setFeedback(null);
    const result = await criarSolicitacaoRoster({
      teamId,
      requestType: "add_existing",
      memberType: selectedMember.member_type,
      athleteId: selectedMember.member_type === "athlete" ? selectedMember.id : null,
      staffMemberId: selectedMember.member_type === "staff" ? selectedMember.id : null,
      editionId: editionId ?? null,
    });
    setSaving(false);
    if ("error" in result) {
      setFeedback({ type: "error", text: result.error });
      return;
    }
    onSuccess();
    onClose();
  }

  async function handleSubmitNewMember() {
    if (!fullName.trim()) {
      setFeedback({ type: "error", text: "Nome completo é obrigatório." });
      return;
    }
    const isoDate = birthDate ? parseDateToISO(birthDate) : null;
    if (birthDate && !isoDate) {
      setFeedback({ type: "error", text: "Data de nascimento inválida." });
      return;
    }
    if (memberType === "athlete" && !positionId) {
      setFeedback({ type: "error", text: "Selecione a posição." });
      return;
    }
    if (memberType === "staff" && !staffRoleId) {
      setFeedback({ type: "error", text: "Selecione a função." });
      return;
    }

    setSaving(true);
    setFeedback(null);
    const result = await criarSolicitacaoRoster({
      teamId,
      requestType: "new_member",
      memberType,
      editionId: editionId ?? null,
      draftData: {
        full_name: fullName.trim(),
        surname: surname.trim() || null,
        nationality: nationality.trim() || null,
        gender: gender || null,
        birth_date: isoDate,
        position_id: memberType === "athlete" ? positionId : null,
        staff_role_id: memberType === "staff" ? staffRoleId : null,
      },
    });
    setSaving(false);
    if ("error" in result) {
      setFeedback({ type: "error", text: result.error });
      return;
    }
    onSuccess();
    onClose();
  }

  async function handleSubmitRemove() {
    if (!removeTarget || !editionId) return;
    setSaving(true);
    setFeedback(null);
    const result = await criarSolicitacaoRoster({
      teamId,
      requestType: "removal",
      memberType: removeTarget.memberType,
      athleteId: removeTarget.athleteId ?? null,
      staffMemberId: removeTarget.staffMemberId ?? null,
      editionId,
    });
    setSaving(false);
    if ("error" in result) {
      setFeedback({ type: "error", text: result.error });
      return;
    }
    onSuccess();
    onClose();
  }

  const title = mode === "remove" ? "Solicitar remoção" : "Solicitar inclusão";

  const selectedPending = selectedMember
    ? findPendingRequestForMember(pendingRequests, {
        teamId,
        editionId: editionId ?? null,
        memberType: selectedMember.member_type,
        memberId: selectedMember.id,
      })
    : null;

  const removePending = removeTarget
    ? findPendingRequestForMember(pendingRequests, {
        teamId,
        editionId: editionId ?? null,
        memberType: removeTarget.memberType,
        memberId: (removeTarget.memberType === "athlete"
          ? removeTarget.athleteId
          : removeTarget.staffMemberId) ?? "",
      })
    : null;

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div
        style={{
          ...modalPanelStyle,
          maxWidth: 480,
          maxHeight: "90vh",
          overflowY: "auto",
          overflowX: "visible",
          padding: 24,
        }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{
          fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 800,
          letterSpacing: "0.12em", textTransform: "uppercase",
          color: "var(--color-text-primary)", margin: "0 0 20px",
        }}>
          {title}
        </h3>

        {mode === "remove" && removeTarget && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-text-secondary)", margin: 0, lineHeight: 1.5 }}>
              Isso será enviado para aprovação do administrador. Você está solicitando a remoção de{" "}
              <strong style={{ color: "var(--color-text-primary)" }}>{removeTarget.displayName}</strong>{" "}
              desta competição.
            </p>
            {removePending && <SubmittedRequestCard createdAt={removePending.created_at} />}
            {feedback && <FeedbackMessage type={feedback.type} text={feedback.text} />}
            {!removePending && (
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSubmitRemove}
                  style={{
                    padding: "10px 20px", borderRadius: 9, border: "none",
                    backgroundColor: saving ? "var(--color-brand-muted-bg)" : "var(--color-brand)",
                    color: "var(--color-on-brand)", fontFamily: "var(--font-mono)", fontSize: 11,
                    fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase",
                    cursor: saving ? "not-allowed" : "pointer", transition: transitionFast,
                  }}
                >
                  {saving ? "Enviando…" : "Confirmar solicitação"}
                </button>
                <button type="button" onClick={onClose} disabled={saving} style={{ ...secondaryButtonStyle, transition: transitionFast }}>
                  Cancelar
                </button>
              </div>
            )}
          </div>
        )}

        {mode === "include" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <FieldLabel>Tipo de membro</FieldLabel>
              <div style={{ display: "flex", gap: 8 }}>
                {(["athlete", "staff"] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setMemberType(t);
                      setSelectedMember(null);
                      setShowNewForm(false);
                      setSearchResults([]);
                    }}
                    style={{
                      padding: "7px 18px", borderRadius: 8,
                      border: `1px solid ${memberType === t ? "var(--color-brand-border)" : "var(--color-input-border)"}`,
                      backgroundColor: memberType === t ? "var(--color-brand-muted-bg)" : "transparent",
                      color: memberType === t ? "var(--color-brand)" : "var(--color-icon-muted)",
                      fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
                      letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer",
                    }}
                  >
                    {t === "athlete" ? "Atleta" : "Comissão"}
                  </button>
                ))}
              </div>
            </div>

            {!showNewForm && (
              <>
                <div>
                  <FieldLabel>Buscar membro existente</FieldLabel>
                  <StyledInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Digite nome ou apelido…"
                  />
                </div>

                {searching && (
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-faint)", margin: 0 }}>
                    Buscando…
                  </p>
                )}

                {searchResults.length > 0 && (
                  <div style={{
                    maxHeight: 180, overflowY: "auto", borderRadius: 10,
                    border: "1px solid var(--color-input-border)",
                  }}>
                    {searchResults.map((r, i) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setSelectedMember(r)}
                        style={{
                          width: "100%", display: "flex", alignItems: "center", gap: 10,
                          padding: "10px 12px", border: "none", textAlign: "left", cursor: "pointer",
                          borderBottom: i < searchResults.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                          backgroundColor: selectedMember?.id === r.id ? "rgba(191,242,5,0.08)" : "transparent",
                          transition: transitionFast,
                        }}
                        onMouseEnter={e => { if (selectedMember?.id !== r.id) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)"; }}
                        onMouseLeave={e => { if (selectedMember?.id !== r.id) e.currentTarget.style.backgroundColor = "transparent"; }}
                      >
                        <MemberAvatar
                          name={rosterDisplayName(r.full_name, r.surname)}
                          photoUrl={r.photo_url}
                          size={36}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>
                            {rosterDisplayName(r.full_name, r.surname)}
                          </p>
                          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-text-muted)", margin: "2px 0 0" }}>
                            {r.current_team_name
                              ? `Equipe atual: ${r.current_team_abbr ?? r.current_team_name}`
                              : "Sem clube"}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {searchQuery.trim().length >= 2 && !searching && searchResults.length === 0 && (
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-faint)", margin: 0 }}>
                    Nenhum membro encontrado.{" "}
                    <button
                      type="button"
                      onClick={() => setShowNewForm(true)}
                      style={{
                        background: "none", border: "none", padding: 0, cursor: "pointer",
                        color: "var(--color-brand)", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
                      }}
                    >
                      Cadastrar novo
                    </button>
                  </p>
                )}

                {selectedMember && (
                  selectedPending ? (
                    <SubmittedRequestCard createdAt={selectedPending.created_at} />
                  ) : (
                  <div style={{
                    padding: "12px 14px", borderRadius: 10,
                    border: "1px solid rgba(191,242,5,0.25)",
                    backgroundColor: "rgba(191,242,5,0.06)",
                  }}>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-muted)", margin: "0 0 10px" }}>
                      Membro selecionado — os dados originais não serão editados.
                    </p>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={handleSubmitIncludeExisting}
                      style={{
                        padding: "9px 18px", borderRadius: 8, border: "none",
                        backgroundColor: "var(--color-brand)", color: "#0a0a0a",
                        fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800,
                        letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer",
                        transition: transitionFast,
                      }}
                    >
                      {saving ? "Enviando…" : "Solicitar inscrição"}
                    </button>
                  </div>
                  )
                )}
              </>
            )}

            {showNewForm && (
              <>
                <div>
                  <FieldLabel>Nome completo *</FieldLabel>
                  <StyledInput value={fullName} onChange={setFullName} placeholder="Nome completo" />
                </div>
                <div>
                  <FieldLabel>Apelido</FieldLabel>
                  <StyledInput value={surname} onChange={setSurname} placeholder="Apelido" />
                </div>
                <div>
                  <FieldLabel>Nacionalidade</FieldLabel>
                  <CountrySearchSelect value={nationality} onChange={setNationality} menuZIndex={200} />
                </div>
                <div>
                  <FieldLabel>Gênero</FieldLabel>
                    <LabSelect
                      value={gender}
                      onChange={setGender}
                      placeholder="Selecione…"
                      menuZIndex={200}
                      options={[
                      { value: "male", label: "Masculino" },
                      { value: "female", label: "Feminino" },
                    ]}
                  />
                </div>
                <div>
                  <FieldLabel>Data de nascimento</FieldLabel>
                  <StyledInput
                    value={birthDate}
                    onChange={v => setBirthDate(applyDateMask(v))}
                    placeholder="DD/MM/AAAA"
                  />
                </div>
                {memberType === "athlete" ? (
                  <div>
                    <FieldLabel>Posição *</FieldLabel>
                    <LabSelect
                      value={positionId}
                      onChange={setPositionId}
                      placeholder="Selecione a posição…"
                      menuZIndex={200}
                      options={positions.map(p => ({ value: p.id, label: p.full_name }))}
                    />
                  </div>
                ) : (
                  <div>
                    <FieldLabel>Função *</FieldLabel>
                    <LabSelect
                      value={staffRoleId}
                      onChange={setStaffRoleId}
                      placeholder="Selecione a função…"
                      menuZIndex={200}
                      options={staffRoles.map(r => ({ value: r.id, label: r.full_name }))}
                    />
                  </div>
                )}
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSubmitNewMember}
                  style={{
                    padding: "10px 20px", borderRadius: 9, border: "none",
                    backgroundColor: "var(--color-brand)", color: "#0a0a0a",
                    fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800,
                    letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer",
                    alignSelf: "flex-start",
                  }}
                >
                  {saving ? "Enviando…" : "Solicitar cadastro"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewForm(false)}
                  style={{
                    background: "none", border: "none", padding: 0, cursor: "pointer",
                    color: "var(--color-text-muted)", fontFamily: "var(--font-mono)", fontSize: 11,
                    textAlign: "left",
                  }}
                >
                  ← Voltar para busca
                </button>
              </>
            )}

            {feedback && <FeedbackMessage type={feedback.type} text={feedback.text} />}

            {!showNewForm && (
              <button type="button" onClick={onClose} disabled={saving} style={{ ...secondaryButtonStyle, alignSelf: "flex-start", transition: transitionFast }}>
                Cancelar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
