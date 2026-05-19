// src/lib/pdf/sumula.ts

import { jsPDF } from "jspdf";
import { createClient } from "@/lib/supabase";

// ─── Tipos internos ──────────────────────────────────────────────────────────

interface SumulaData {
  match: {
    id: string;
    match_date: string | null;
  };
  competition: {
    full_name: string;
    primary_color: string | null;
  };
  season: { name: string };
  phase: { full_name: string; custom_label: string | null };
  round: { name: string; custom_label: string | null } | null;
  matchup: { label: string | null } | null;
  teamA: TeamData;
  teamB: TeamData;
}

interface TeamData {
  full_name: string;
  logo_url: string | null;
  athletes: AthleteRow[];
  staff: string[];
}

interface AthleteRow {
  rg: string;
  surname: string;
}

// ─── Busca de dados ──────────────────────────────────────────────────────────

async function fetchSumulaData(matchId: string): Promise<SumulaData> {
  const supabase = createClient();

  // Query 1: dados básicos da partida
  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select(`
      id, match_date, team_a_id, team_b_id, phase_id, round_id, matchup_id,
      teams_a:teams!matches_team_a_id_fkey(full_name, short_name, logo_url),
      teams_b:teams!matches_team_b_id_fkey(full_name, short_name, logo_url),
      rounds(name, custom_label)
    `)
    .eq("id", matchId)
    .single();

  if (matchError || !match) throw new Error(`match: ${matchError?.message}`);

  // Query 2: fase
  const { data: phase, error: phaseError } = await supabase
    .from("phases")
    .select("id, full_name, custom_label, edition_id")
    .eq("id", match.phase_id)
    .single();

  if (phaseError || !phase) throw new Error(`phase: ${phaseError?.message}`);

  // Query 3: edition → competition + season
  const { data: edition, error: editionError } = await supabase
    .from("competition_editions")
    .select("id, competition_id, season_id, competitions(full_name, primary_color), seasons(name)")
    .eq("id", phase.edition_id)
    .single();

  if (editionError || !edition) throw new Error(`edition: ${editionError?.message}`);

  // Query 4: edition_teams dos dois times
  const { data: editionTeams } = await supabase
    .from("edition_teams")
    .select("id, team_id")
    .eq("edition_id", phase.edition_id)
    .in("team_id", [match.team_a_id, match.team_b_id]);

  const etA = (editionTeams ?? []).find((e: any) => e.team_id === match.team_a_id)?.id ?? "";
  const etB = (editionTeams ?? []).find((e: any) => e.team_id === match.team_b_id)?.id ?? "";

  // Query 5: roster entries aprovados dos dois times
  const { data: roster } = await supabase
    .from("edition_roster_entries")
    .select("edition_team_id, member_type, athletes(rg, surname, full_name), staff_members(surname, full_name)")
    .in("edition_team_id", [etA, etB].filter(Boolean))
    .eq("status", "approved");

  function athletesForTeam(etId: string): AthleteRow[] {
    return (roster ?? [])
      .filter((r: any) => r.edition_team_id === etId && r.member_type === "athlete" && r.athletes)
      .map((r: any) => ({
        rg: r.athletes.rg ?? "",
        surname: (r.athletes.surname ?? r.athletes.full_name ?? "").toUpperCase(),
      }))
      .sort((a, b) => a.surname.localeCompare(b.surname, "pt-BR"));
  }

  function staffForTeam(etId: string): string[] {
    return (roster ?? [])
      .filter((r: any) => r.edition_team_id === etId && r.member_type === "staff" && r.staff_members)
      .map((r: any) => (r.staff_members.surname ?? r.staff_members.full_name ?? "").toUpperCase())
      .sort((a: string, b: string) => a.localeCompare(b, "pt-BR"))
      .slice(0, 3);
  }

  const competition = edition.competitions as any;
  const season = edition.seasons as any;

  return {
    match: { id: match.id, match_date: match.match_date },
    competition: {
      full_name: competition?.full_name ?? "Competição",
      primary_color: competition?.primary_color ?? "#414141",
    },
    season: { name: season?.name ?? "" },
    phase: { full_name: phase.full_name ?? "", custom_label: phase.custom_label ?? null },
    round: match.rounds
      ? { name: (match.rounds as any).name, custom_label: (match.rounds as any).custom_label }
      : null,
    matchup: match.matchup_id ? { label: null } : null,
    teamA: {
      full_name: (match.teams_a as any)?.full_name ?? "",
      logo_url: (match.teams_a as any)?.logo_url ?? null,
      athletes: athletesForTeam(etA),
      staff: staffForTeam(etA),
    },
    teamB: {
      full_name: (match.teams_b as any)?.full_name ?? "",
      logo_url: (match.teams_b as any)?.logo_url ?? null,
      athletes: athletesForTeam(etB),
      staff: staffForTeam(etB),
    },
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return [65, 65, 65];
  return [r, g, b];
}

// ─── Layout principal ─────────────────────────────────────────────────────────

async function drawSumula(doc: jsPDF, data: SumulaData): Promise<void> {
  const PAGE_W = 210;
  const MARGIN_X = 10;
  const MARGIN_X2 = 9.25;
  const TABLE_W = 191.5;

  const [pr, pg, pb] = hexToRgb(data.competition.primary_color ?? "#414141");

  const dateStr = data.match.match_date
    ? new Date(data.match.match_date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
    : "";

  const phaseLabel = (data.phase.custom_label ?? data.phase.full_name).toUpperCase();
  const roundLabel = data.round
    ? (data.round.custom_label ?? data.round.name).toUpperCase()
    : (data.matchup?.label ?? phaseLabel);

  // ── Bloco 1: Cabeçalho ───────────────────────────────────────────────────

  const colWidths = [50, 22.5, 22.5, 22.5, 22.5, 50];
  const colX: number[] = [];
  let cx = MARGIN_X;
  for (const w of colWidths) { colX.push(cx); cx += w; }

  const ROW1_H = 22.5;
  const ROW2_H = 6;
  const startY = 10;

  const [logoABase64, logoBBase64] = await Promise.all([
    data.teamA.logo_url ? loadImageAsBase64(data.teamA.logo_url) : Promise.resolve(null),
    data.teamB.logo_url ? loadImageAsBase64(data.teamB.logo_url) : Promise.resolve(null),
  ]);

  // Linha 1 — borda externa
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.2);
  doc.rect(MARGIN_X, startY, PAGE_W - 2 * MARGIN_X, ROW1_H);

  // Nome time A
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  const nameALines = doc.splitTextToSize(data.teamA.full_name.toUpperCase(), colWidths[0] - 4);
  doc.text(nameALines, colX[0] + 2, startY + ROW1_H / 2 - (nameALines.length - 1) * 2.5, { baseline: "middle" });

  // Logo A
  if (logoABase64) {
    const ls = 16;
    doc.addImage(logoABase64, "PNG", colX[1] + (colWidths[1] - ls) / 2, startY + (ROW1_H - ls) / 2, ls, ls);
  }

  // Logo B
  if (logoBBase64) {
    const ls = 16;
    doc.addImage(logoBBase64, "PNG", colX[4] + (colWidths[4] - ls) / 2, startY + (ROW1_H - ls) / 2, ls, ls);
  }

  // Nome time B
  const nameBLines = doc.splitTextToSize(data.teamB.full_name.toUpperCase(), colWidths[5] - 4);
  doc.text(nameBLines, colX[5] + colWidths[5] - 2, startY + ROW1_H / 2 - (nameBLines.length - 1) * 2.5, { baseline: "middle", align: "right" });

  // Divisórias verticais linha 1
  doc.setDrawColor(180, 180, 180);
  [1, 2, 3, 4, 5].forEach(i => doc.line(colX[i], startY, colX[i], startY + ROW1_H));

  // Linha 2 — faixas coloridas
  const row2Y = startY + ROW1_H;
  const cells2: { text: string; fill: [number, number, number]; x: number; w: number }[] = [
    { text: data.competition.full_name.toUpperCase(), fill: [29, 29, 29], x: colX[0], w: colWidths[0] },
    { text: phaseLabel, fill: [65, 65, 65], x: colX[1], w: colWidths[1] },
    { text: dateStr, fill: [65, 65, 65], x: colX[2], w: colWidths[2] + colWidths[3] },
    { text: roundLabel, fill: [65, 65, 65], x: colX[4], w: colWidths[4] },
    { text: data.season.name.toUpperCase(), fill: [29, 29, 29], x: colX[5], w: colWidths[5] },
  ];

  cells2.forEach(({ text, fill, x, w }) => {
    doc.setFillColor(...fill);
    doc.rect(x, row2Y, w, ROW2_H, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text(text, x + w / 2, row2Y + ROW2_H / 2, { align: "center", baseline: "middle" });
  });

  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.2);
  doc.rect(MARGIN_X, row2Y, PAGE_W - 2 * MARGIN_X, ROW2_H);

  let currentY = row2Y + ROW2_H + 3;

  // ── Blocos 2 e 3: tabelas ────────────────────────────────────────────────

  for (const team of [data.teamA, data.teamB]) {
    currentY = drawTeamTable(doc, team, currentY, MARGIN_X2, TABLE_W, pr, pg, pb);
    currentY += 3;
  }
}

// ─── Tabela de equipe ─────────────────────────────────────────────────────────

function drawTeamTable(
  doc: jsPDF,
  team: TeamData,
  startY: number,
  marginX: number,
  tableW: number,
  pr: number, pg: number, pb: number,
): number {
  const colW = [8, 22, 44.5, 7, 7, 7, 7, 9, 9, 7, 9, 9, 8, 8, 8, 8, 8, 8];
  const TITLE_H = 5.5;
  const HEADER_H = 5;
  const ROW_H = 4.5;
  const ROWS = 20;

  // Posições X de cada coluna
  const colX: number[] = [];
  let cx = marginX;
  for (const w of colW) { colX.push(cx); cx += w; }

  // Seção da direita (cols 12..17)
  const rightX = colX[12];
  const rightW = colW.slice(12).reduce((a, b) => a + b, 0);
  const halfW = rightW / 2;

  // ── Título ──
  doc.setFillColor(0, 0, 0);
  doc.rect(marginX, startY, tableW, TITLE_H, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(team.full_name.toUpperCase(), marginX + 3, startY + TITLE_H / 2, { baseline: "middle" });

  const headerY = startY + TITLE_H;

  // ── Cabeçalho ──
  doc.setFillColor(pr, pg, pb);
  doc.rect(marginX, headerY, tableW, HEADER_H, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(255, 255, 255);

  const headers: { text: string; col: number; span: number }[] = [
    { text: "N°",               col: 0,  span: 1 },
    { text: "RG",               col: 1,  span: 1 },
    { text: "ATLETA",           col: 2,  span: 1 },
    { text: "C. AMA",           col: 3,  span: 2 },
    { text: "CV",               col: 5,  span: 1 },
    { text: "GOLS",             col: 6,  span: 6 },
    { text: "COMISSÃO TÉCNICA", col: 12, span: 6 },
  ];

  headers.forEach(({ text, col, span }) => {
    const x = colX[col];
    const w = colW.slice(col, col + span).reduce((a, b) => a + b, 0);
    doc.text(text, x + w / 2, headerY + HEADER_H / 2, { align: "center", baseline: "middle" });
  });

  doc.setDrawColor(160, 160, 160);
  doc.setLineWidth(0.15);
  doc.rect(marginX, headerY, tableW, HEADER_H);

  const dataStartY = headerY + HEADER_H;

  // ── 20 linhas de dados ──
  for (let row = 0; row < ROWS; row++) {
    const athlete = team.athletes[row] ?? null;
    const isOdd = row % 2 === 0; // linhas 0, 2, 4... têm os slots de gol numerados
    const slotLeft  = isOdd ? row + 1 : null; // slots 1, 3, 5, 7...
    const slotRight = isOdd ? row + 2 : null; // slots 2, 4, 6, 8...
    const rowY = dataStartY + row * ROW_H;

    // Fundo branco
    doc.setFillColor(255, 255, 255);
    doc.rect(marginX, rowY, tableW, ROW_H, "F");

    // ── Atleta ──
    if (athlete) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(0, 0, 0);

      // RG
      if (athlete.rg) {
        doc.setFontSize(5.5);
        const rgClipped = doc.splitTextToSize(athlete.rg, colW[1] - 2)[0];
        doc.text(rgClipped, colX[1] + 1, rowY + ROW_H / 2, { baseline: "middle" });
        doc.setFontSize(6.5);
      }

      // Surname (clipa se longo)
      const surnameClipped = doc.splitTextToSize(athlete.surname, colW[2] - 2)[0];
      doc.text(surnameClipped, colX[2] + 1, rowY + ROW_H / 2, { baseline: "middle" });
    }

    // ── Slots de gol (sempre vazios — para preenchimento manual) ──
    if (isOdd) {
      if (slotLeft != null) {
        doc.setFillColor(29, 29, 29);
        doc.rect(colX[6], rowY, colW[6], ROW_H, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6);
        doc.setTextColor(255, 255, 255);
        doc.text(String(slotLeft), colX[6] + colW[6] / 2, rowY + ROW_H / 2, { align: "center", baseline: "middle" });
      }
      if (slotRight != null) {
        doc.setFillColor(29, 29, 29);
        doc.rect(colX[9], rowY, colW[9], ROW_H, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6);
        doc.setTextColor(255, 255, 255);
        doc.text(String(slotRight), colX[9] + colW[9] / 2, rowY + ROW_H / 2, { align: "center", baseline: "middle" });
      }
    }

    // Reset
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);

    // ── Seção direita: comissão + seções fixas ──
    switch (row) {
      case 0: case 1: case 2:
        if (team.staff[row]) {
          doc.text(team.staff[row], rightX + 2, rowY + ROW_H / 2, { baseline: "middle" });
        }
        break;

      case 3:
        doc.setFillColor(0, 0, 0);
        doc.rect(rightX, rowY, rightW, ROW_H, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(5.5); doc.setTextColor(255, 255, 255);
        doc.text("FALTAS", rightX + rightW / 2, rowY + ROW_H / 2 + 0.3, { align: "center", baseline: "middle" });
        break;

      case 4:
        doc.setFillColor(203, 203, 203);
        doc.rect(rightX, rowY, halfW, ROW_H, "F");
        doc.rect(rightX + halfW, rowY, halfW, ROW_H, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(6); doc.setTextColor(0, 0, 0);
        doc.text("1T", rightX + halfW / 2, rowY + ROW_H / 2, { align: "center", baseline: "middle" });
        doc.text("2T", rightX + halfW + halfW / 2, rowY + ROW_H / 2, { align: "center", baseline: "middle" });
        break;

      case 6:
        doc.setFillColor(0, 0, 0);
        doc.rect(rightX, rowY, rightW, ROW_H, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(6); doc.setTextColor(255, 255, 255);
        const pedidoText = doc.splitTextToSize("PEDIDO DE TEMPO", rightW - 2)[0];
        doc.text(pedidoText, rightX + rightW / 2, rowY + ROW_H / 2 + 0.3, { align: "center", baseline: "middle" });
        break;

      case 7:
        doc.setFillColor(203, 203, 203);
        doc.rect(rightX, rowY, halfW, ROW_H, "F");
        doc.rect(rightX + halfW, rowY, halfW, ROW_H, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(6); doc.setTextColor(0, 0, 0);
        doc.text("1T", rightX + halfW / 2, rowY + ROW_H / 2, { align: "center", baseline: "middle" });
        doc.text("2T", rightX + halfW + halfW / 2, rowY + ROW_H / 2, { align: "center", baseline: "middle" });
        break;

      case 9:
        doc.setFillColor(0, 0, 0);
        doc.rect(rightX, rowY, rightW, ROW_H, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(6); doc.setTextColor(255, 255, 255);
        doc.text("ASSINATURAS", rightX + rightW / 2, rowY + ROW_H / 2 + 0.3, { align: "center", baseline: "middle" });
        break;

      case 13:
        doc.setFillColor(0, 0, 0);
        doc.rect(rightX, rowY, rightW, ROW_H, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(6); doc.setTextColor(255, 255, 255);
        doc.text("OBSERVAÇÕES", rightX + rightW / 2, rowY + ROW_H / 2 + 0.3, { align: "center", baseline: "middle" });
        break;
    }

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);

    // Grade horizontal da linha
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.1);
    doc.rect(marginX, rowY, tableW, ROW_H);
  }

  // Grade vertical
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.1);
  let vx = marginX;
  for (let i = 0; i < colW.length - 1; i++) {
    vx += colW[i];
    doc.line(vx, dataStartY, vx, dataStartY + ROWS * ROW_H);
  }

  return dataStartY + ROWS * ROW_H;
}

// ─── API pública ──────────────────────────────────────────────────────────────

export async function gerarSumulasPDF(matchIds: string[]): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  for (let i = 0; i < matchIds.length; i++) {
    if (i > 0) doc.addPage();
    const data = await fetchSumulaData(matchIds[i]);
    await drawSumula(doc, data);
  }
  return doc;
}

export async function gerarSumulaPDF(matchId: string): Promise<jsPDF> {
  return gerarSumulasPDF([matchId]);
}