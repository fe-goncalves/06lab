"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getActiveRepresentative, getRepresentativeTeamIds } from "@/app/(rep)/lib/rep-auth";
import { mapRosterRpcError } from "@/app/(rep)/lib/roster-rpc-errors";
import { toDbRequestType, type AppRequestType } from "@/app/(rep)/lib/roster-request-types";

export type MemberSearchResult = {
  id: string;
  full_name: string;
  surname: string | null;
  photo_url: string | null;
  member_type: "athlete" | "staff";
  current_team_name: string | null;
  current_team_abbr: string | null;
};

export type PendingRosterRequest = {
  id: string;
  request_type: string;
  member_type: string;
  status: string;
  created_at: string;
  requesting_team_id: string;
  source_team_id: string | null;
  edition_id: string | null;
  athlete_id: string | null;
  staff_member_id: string | null;
  counterparty_approved_at: string | null;
  athlete: { full_name: string; surname: string | null; photo_url: string | null } | null;
  staff: { full_name: string; surname: string | null; photo_url: string | null } | null;
  requesting_team: { full_name: string; abbreviation: string | null } | null;
  source_team: { full_name: string; abbreviation: string | null } | null;
};

export type DraftMemberData = {
  full_name: string;
  surname?: string | null;
  nationality?: string | null;
  gender?: string | null;
  birth_date?: string | null;
  position_id?: string | null;
  staff_role_id?: string | null;
};

async function assertRepForTeam(teamId: string) {
  const rep = await getActiveRepresentative();
  if (!rep) return { error: "Não autenticado." as const };

  const teamIds = await getRepresentativeTeamIds(rep.id);
  if (!teamIds.includes(teamId)) {
    return { error: "Você não tem permissão para esta equipe." as const };
  }

  return { rep };
}

function isRequestTypeCheckConstraintError(message: string): boolean {
  return message.includes("roster_requests_request_type_check");
}

async function resolveSourceTeamId(
  memberType: "athlete" | "staff",
  memberId: string | null | undefined,
): Promise<string | null> {
  if (!memberId) return null;

  const admin = createAdminClient();
  const table = memberType === "athlete" ? "athlete_team_stints" : "staff_team_stints";
  const memberColumn = memberType === "athlete" ? "athlete_id" : "staff_member_id";

  const { data } = await admin
    .from(table)
    .select("team_id")
    .eq(memberColumn, memberId)
    .is("ended_at", null)
    .maybeSingle();

  return (data?.team_id as string | null) ?? null;
}

async function inserirSolicitacaoRosterViaAdmin(input: {
  rep: { id: string; organization_id: string };
  teamId: string;
  requestType: AppRequestType;
  memberType: "athlete" | "staff";
  athleteId?: string | null;
  staffMemberId?: string | null;
  editionId?: string | null;
  draftData?: DraftMemberData | null;
}): Promise<{ success: true } | { error: string }> {
  const memberId = input.memberType === "athlete" ? input.athleteId : input.staffMemberId;
  const sourceTeamId =
    input.requestType === "add_existing"
      ? await resolveSourceTeamId(input.memberType, memberId)
      : null;

  const admin = createAdminClient();
  const { error } = await admin.from("roster_requests").insert({
    organization_id: input.rep.organization_id,
    requested_by_representative_id: input.rep.id,
    requesting_team_id: input.teamId,
    request_type: toDbRequestType(input.requestType),
    member_type: input.memberType,
    athlete_id: input.memberType === "athlete" ? (input.athleteId ?? null) : null,
    staff_member_id: input.memberType === "staff" ? (input.staffMemberId ?? null) : null,
    edition_id: input.editionId ?? null,
    draft_data: input.requestType === "new_member" ? (input.draftData ?? null) : null,
    source_team_id: sourceTeamId,
    requires_counterparty_approval: !!sourceTeamId && sourceTeamId !== input.teamId,
    status: "pending",
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function buscarMembrosOrganizacao(
  query: string,
  memberType: "athlete" | "staff",
): Promise<{ results: MemberSearchResult[] } | { error: string }> {
  const rep = await getActiveRepresentative();
  if (!rep) return { error: "Não autenticado." };

  const q = query.trim();
  if (q.length < 2) return { results: [] };

  const supabase = await createClient();

  if (memberType === "athlete") {
    const { data, error } = await supabase
      .from("athletes")
      .select(`
        id, full_name, surname, photo_url,
        athlete_team_stints(ended_at, teams(full_name, abbreviation))
      `)
      .eq("organization_id", rep.organization_id)
      .or(`full_name.ilike.%${q}%,surname.ilike.%${q}%`)
      .limit(12);

    if (error) return { error: error.message };

    const results: MemberSearchResult[] = (data ?? []).map(row => {
      const stints = (row.athlete_team_stints ?? []) as Array<{
        ended_at: string | null;
        teams: { full_name: string; abbreviation: string | null } | null;
      }>;
      const current = stints.find(s => !s.ended_at);
      return {
        id: row.id,
        full_name: row.full_name,
        surname: row.surname,
        photo_url: row.photo_url,
        member_type: "athlete",
        current_team_name: current?.teams?.full_name ?? null,
        current_team_abbr: current?.teams?.abbreviation ?? null,
      };
    });

    return { results };
  }

  const { data, error } = await supabase
    .from("staff_members")
    .select(`
      id, full_name, surname, photo_url,
      staff_team_stints(ended_at, teams(full_name, abbreviation))
    `)
    .eq("organization_id", rep.organization_id)
    .or(`full_name.ilike.%${q}%,surname.ilike.%${q}%`)
    .limit(12);

  if (error) return { error: error.message };

  const results: MemberSearchResult[] = (data ?? []).map(row => {
    const stints = (row.staff_team_stints ?? []) as Array<{
      ended_at: string | null;
      teams: { full_name: string; abbreviation: string | null } | null;
    }>;
    const current = stints.find(s => !s.ended_at);
    return {
      id: row.id,
      full_name: row.full_name,
      surname: row.surname,
      photo_url: row.photo_url,
      member_type: "staff",
      current_team_name: current?.teams?.full_name ?? null,
      current_team_abbr: current?.teams?.abbreviation ?? null,
    };
  });

  return { results };
}

export async function criarSolicitacaoRoster(input: {
  teamId: string;
  requestType: AppRequestType;
  memberType: "athlete" | "staff";
  athleteId?: string | null;
  staffMemberId?: string | null;
  editionId?: string | null;
  draftData?: DraftMemberData | null;
}): Promise<{ success: true } | { error: string }> {
  const auth = await assertRepForTeam(input.teamId);
  if ("error" in auth) return auth;

  if (input.requestType === "removal" && !input.editionId) {
    return { error: "Remoção só é permitida dentro de uma competição." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("rep_create_roster_request", {
    p_requesting_team_id: input.teamId,
    p_request_type: input.requestType,
    p_member_type: input.memberType,
    p_athlete_id: input.memberType === "athlete" ? (input.athleteId ?? null) : null,
    p_staff_member_id: input.memberType === "staff" ? (input.staffMemberId ?? null) : null,
    p_edition_id: input.editionId ?? null,
    p_draft_data: input.requestType === "new_member" ? (input.draftData ?? null) : null,
  });

  if (error) {
    const message = error.message ?? "";
    const canFallback =
      (input.requestType === "new_member" || input.requestType === "add_existing") &&
      isRequestTypeCheckConstraintError(message);

    if (canFallback) {
      const fallback = await inserirSolicitacaoRosterViaAdmin({
        rep: auth.rep,
        teamId: input.teamId,
        requestType: input.requestType,
        memberType: input.memberType,
        athleteId: input.athleteId,
        staffMemberId: input.staffMemberId,
        editionId: input.editionId,
        draftData: input.draftData,
      });
      if ("error" in fallback) return fallback;
    } else {
      return { error: mapRosterRpcError(error) };
    }
  }

  revalidatePath("/rep");
  revalidatePath(`/rep/equipes/${input.teamId}`);
  if (input.editionId) {
    revalidatePath(`/rep/equipes/${input.teamId}/edicoes/${input.editionId}`);
  }

  return { success: true };
}

export async function confirmarLiberacaoCounterparty(
  requestId: string,
): Promise<{ success: true } | { error: string }> {
  const rep = await getActiveRepresentative();
  if (!rep) return { error: "Não autenticado." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("rep_confirm_counterparty_release", {
    p_request_id: requestId,
  });

  if (error) return { error: mapRosterRpcError(error) };

  revalidatePath("/rep");
  return { success: true };
}

export async function listarSolicitacoesPendentes(): Promise<
  { outgoing: PendingRosterRequest[]; counterparty: PendingRosterRequest[] } | { error: string }
> {
  const rep = await getActiveRepresentative();
  if (!rep) return { error: "Não autenticado." };

  const teamIds = await getRepresentativeTeamIds(rep.id);
  const supabase = await createClient();

  const baseSelect = `
    id, request_type, member_type, status, created_at,
    requesting_team_id, source_team_id, edition_id,
    athlete_id, staff_member_id, counterparty_approved_at,
    athletes(full_name, surname, photo_url),
    staff_members(full_name, surname, photo_url)
  `;

  const { data: outgoingRows, error: outError } = await supabase
    .from("roster_requests")
    .select(baseSelect)
    .eq("requested_by_representative_id", rep.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (outError) return { error: outError.message };

  let counterpartyRows: Array<Record<string, unknown>> = [];
  if (teamIds.length > 0) {
    const { data, error: cpError } = await supabase
      .from("roster_requests")
      .select(baseSelect)
      .in("source_team_id", teamIds)
      .eq("status", "pending")
      .is("counterparty_approved_at", null)
      .order("created_at", { ascending: false });

    if (cpError) return { error: cpError.message };
    counterpartyRows = (data ?? []) as Array<Record<string, unknown>>;
  }

  const outgoing = (outgoingRows ?? []).map(normalizeRequest);
  const counterparty = counterpartyRows
    .map(normalizeRequest)
    .filter(r => r.source_team_id && teamIds.includes(r.source_team_id));

  return { outgoing, counterparty };
}

function normalizeRequest(row: Record<string, unknown>): PendingRosterRequest {
  return {
    id: row.id as string,
    request_type: row.request_type as string,
    member_type: row.member_type as string,
    status: row.status as string,
    created_at: row.created_at as string,
    requesting_team_id: row.requesting_team_id as string,
    source_team_id: (row.source_team_id as string | null) ?? null,
    edition_id: (row.edition_id as string | null) ?? null,
    athlete_id: (row.athlete_id as string | null) ?? null,
    staff_member_id: (row.staff_member_id as string | null) ?? null,
    counterparty_approved_at: (row.counterparty_approved_at as string | null) ?? null,
    athlete: (row.athletes as { full_name: string; surname: string | null; photo_url: string | null } | null) ?? null,
    staff: (row.staff_members as { full_name: string; surname: string | null; photo_url: string | null } | null) ?? null,
    requesting_team: null,
    source_team: null,
  };
}
