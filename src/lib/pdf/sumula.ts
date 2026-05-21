import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { createClient } from '@/lib/supabase';

// ─── Tipos internos ────────────────────────────────────────────────────────────

interface AthleteRow {
  rg: string;
  surname: string;
}

interface CommitteeRow {
  surname: string;
}

interface TeamData {
  full_name: string;
  logo_url: string;
  athletes: AthleteRow[];
  committee: CommitteeRow[];
}

interface MatchData {
  competition_name: string;
  phase_name: string;
  round_name: string;
  season_name: string;
  match_date: string;
  tournament_main_color: string;
  team_a: TeamData;
  team_b: TeamData;
}

// ─── Gerador de PDF (código de referência intacto) ─────────────────────────────

const drawMatchScoreSheet = (doc: jsPDF, match: MatchData) => {
  let headerColor: [number, number, number] = [200, 200, 200];
  if (match.tournament_main_color) {
    const hex = match.tournament_main_color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    headerColor = [r, g, b];
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  };

  const teamAName = match.team_a?.full_name || 'Time A';
  const teamBName = match.team_b?.full_name || 'Time B';

  const table1Body = [
    [
      { content: teamAName, styles: { halign: 'left', valign: 'middle', fontSize: 14, fontStyle: 'bold', minCellHeight: 22.5 } as any },
      { content: '', styles: { minCellHeight: 22.5 } },
      { content: '', styles: { minCellHeight: 22.5 } },
      { content: '', styles: { minCellHeight: 22.5 } },
      { content: '', styles: { minCellHeight: 22.5 } },
      { content: teamBName, styles: { halign: 'right', valign: 'middle', fontSize: 14, fontStyle: 'bold', minCellHeight: 22.5 } as any },
    ],
    [
      { content: match.competition_name || '', styles: { halign: 'left', minCellHeight: 6.0, fillColor: [29, 29, 29], textColor: [255, 255, 255] } as any },
      { content: match.phase_name || '', styles: { halign: 'center', minCellHeight: 6.0, fillColor: [65, 65, 65], textColor: [255, 255, 255] } as any },
      { content: formatDate(match.match_date), colSpan: 2, styles: { halign: 'center', minCellHeight: 6.0, fillColor: [65, 65, 65], textColor: [255, 255, 255] } as any },
      { content: match.round_name || '', styles: { halign: 'center', minCellHeight: 6.0, fillColor: [65, 65, 65], textColor: [255, 255, 255] } as any },
      { content: match.season_name || '', styles: { halign: 'center', minCellHeight: 6.0, fillColor: [29, 29, 29], textColor: [255, 255, 255] } as any },
    ],
  ];

  autoTable(doc, {
    body: table1Body,
    theme: 'grid',
    styles: { lineColor: [0, 0, 0], lineWidth: 0.25, textColor: [0, 0, 0], halign: 'center', valign: 'middle', fontSize: 8, cellPadding: 1, minCellHeight: 7.5 },
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0] },
    columnStyles: {
      0: { cellWidth: 50.0 }, 1: { cellWidth: 22.5 }, 2: { cellWidth: 22.5 },
      3: { cellWidth: 22.5 }, 4: { cellWidth: 22.5 }, 5: { cellWidth: 50.0 },
    },
    margin: { top: 10, left: 10, right: 10 },
    tableWidth: 190,
    startY: 10,
    didDrawCell: (data) => {
      if (data.section === 'body') {
        if (data.row.index === 0 && data.column.index === 1 && match.team_a?.logo_url) {
          try {
            const s = 18;
            const x = data.cell.x + (data.cell.width - s) / 2;
            const y = data.cell.y + (data.cell.height - s) / 2;
            doc.addImage(match.team_a.logo_url, 'PNG', x, y, s, s, undefined, 'FAST');
          } catch (e) { /* logo opcional */ }
        }
        if (data.row.index === 0 && data.column.index === 4 && match.team_b?.logo_url) {
          try {
            const s = 18;
            const x = data.cell.x + (data.cell.width - s) / 2;
            const y = data.cell.y + (data.cell.height - s) / 2;
            doc.addImage(match.team_b.logo_url, 'PNG', x, y, s, s, undefined, 'FAST');
          } catch (e) { /* logo opcional */ }
        }
      }
    },
  });

  const generateTeamTable = (team: TeamData, startY: number) => {
    if (!team) return;
    const rows: any[] = [];

    rows.push([{ content: (team.full_name || '').toUpperCase(), colSpan: 18, styles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontSize: 10, fontStyle: 'bold', halign: 'left', minCellHeight: 6.5 } as any }]);

    const row2Style = { fillColor: headerColor, textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold', minCellHeight: 5.5 } as any;
    rows.push([
      { content: 'N°', styles: row2Style }, { content: 'RG', styles: row2Style }, { content: 'ATLETA', styles: row2Style },
      { content: 'C. AMA', colSpan: 2, styles: row2Style }, { content: 'CV', styles: row2Style },
      { content: 'GOLS', colSpan: 6, styles: row2Style }, { content: 'COMISSÃO TÉCNICA', colSpan: 6, styles: row2Style },
    ]);

    const getAth = (i: number) => (team.athletes || [])[i] || { rg: '', surname: '' };
    const getCom = (i: number) => (team.committee || [])[i] || { surname: '' };

    const goalIdStyle = { fillColor: [29, 29, 29], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold', minCellHeight: 5.3 } as any;
    const rgStyle = { halign: 'left', fontSize: 9, minCellHeight: 5.3 } as any;
    const athleteStyle = { halign: 'left', fontSize: 9, fontStyle: 'bold', minCellHeight: 5.3 } as any;
    const committeeStyle = { halign: 'left', fontSize: 8, minCellHeight: 5.3 } as any;
    const headerCategoryStyle = { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold', minCellHeight: 5.3 } as any;
    const timePeriodStyle = { fillColor: [203, 203, 203], textColor: [0, 0, 0], minCellHeight: 5.3 } as any;

    rows.push(['', { content: getAth(0).rg || '', styles: rgStyle }, { content: getAth(0).surname || '', styles: athleteStyle }, '', '', '', { content: '1', styles: goalIdStyle }, '', '', { content: '2', styles: goalIdStyle }, '', '', { content: getCom(0).surname || '', colSpan: 4, styles: committeeStyle }, { content: '', colSpan: 2 }]);
    rows.push(['', { content: getAth(1).rg || '', styles: rgStyle }, { content: getAth(1).surname || '', styles: athleteStyle }, '', '', '', { colSpan: 3, content: '' }, { colSpan: 3, content: '' }, { content: getCom(1).surname || '', colSpan: 4, styles: committeeStyle }, { content: '', colSpan: 2 }]);
    rows.push(['', { content: getAth(2).rg || '', styles: rgStyle }, { content: getAth(2).surname || '', styles: athleteStyle }, '', '', '', { content: '3', styles: goalIdStyle }, '', '', { content: '4', styles: goalIdStyle }, '', '', { content: getCom(2).surname || '', colSpan: 4, styles: committeeStyle }, { content: '', colSpan: 2 }]);
    rows.push(['', { content: getAth(3).rg || '', styles: rgStyle }, { content: getAth(3).surname || '', styles: athleteStyle }, '', '', '', { colSpan: 3, content: '' }, { colSpan: 3, content: '' }, { content: 'FALTAS', colSpan: 6, styles: headerCategoryStyle }]);
    rows.push(['', { content: getAth(4).rg || '', styles: rgStyle }, { content: getAth(4).surname || '', styles: athleteStyle }, '', '', '', { content: '5', styles: goalIdStyle }, '', '', { content: '6', styles: goalIdStyle }, '', '', { content: '1T', styles: timePeriodStyle }, '', '', '', '', '']);
    rows.push(['', { content: getAth(5).rg || '', styles: rgStyle }, { content: getAth(5).surname || '', styles: athleteStyle }, '', '', '', { colSpan: 3, content: '' }, { colSpan: 3, content: '' }, { content: '2T', styles: timePeriodStyle }, '', '', '', '', '']);
    rows.push(['', { content: getAth(6).rg || '', styles: rgStyle }, { content: getAth(6).surname || '', styles: athleteStyle }, '', '', '', { content: '7', styles: goalIdStyle }, '', '', { content: '8', styles: goalIdStyle }, '', '', { content: 'PEDIDO DE TEMPO', colSpan: 6, styles: headerCategoryStyle }]);
    rows.push(['', { content: getAth(7).rg || '', styles: rgStyle }, { content: getAth(7).surname || '', styles: athleteStyle }, '', '', '', { colSpan: 3, content: '' }, { colSpan: 3, content: '' }, { content: '1T', colSpan: 3, styles: timePeriodStyle }, { content: '2T', colSpan: 3, styles: timePeriodStyle }]);
    rows.push(['', { content: getAth(8).rg || '', styles: rgStyle }, { content: getAth(8).surname || '', styles: athleteStyle }, '', '', '', { content: '9', styles: goalIdStyle }, '', '', { content: '10', styles: goalIdStyle }, '', '', { content: '', colSpan: 3 }, { content: '', colSpan: 3 }]);
    rows.push(['', { content: getAth(9).rg || '', styles: rgStyle }, { content: getAth(9).surname || '', styles: athleteStyle }, '', '', '', { colSpan: 3, content: '' }, { colSpan: 3, content: '' }, { content: 'ASSINATURAS', colSpan: 6, styles: headerCategoryStyle }]);
    rows.push(['', { content: getAth(10).rg || '', styles: rgStyle }, { content: getAth(10).surname || '', styles: athleteStyle }, '', '', '', { content: '11', styles: goalIdStyle }, '', '', { content: '12', styles: goalIdStyle }, '', '', { content: '', colSpan: 6, rowSpan: 3 }]);
    rows.push(['', { content: getAth(11).rg || '', styles: rgStyle }, { content: getAth(11).surname || '', styles: athleteStyle }, '', '', '', { colSpan: 3, content: '' }, { colSpan: 3, content: '' }]);
    rows.push(['', { content: getAth(12).rg || '', styles: rgStyle }, { content: getAth(12).surname || '', styles: athleteStyle }, '', '', '', { content: '13', styles: goalIdStyle }, '', '', { content: '14', styles: goalIdStyle }, '', '']);
    rows.push(['', { content: getAth(13).rg || '', styles: rgStyle }, { content: getAth(13).surname || '', styles: athleteStyle }, '', '', '', { colSpan: 3, content: '' }, { colSpan: 3, content: '' }, { content: 'OBSERVAÇÕES', colSpan: 6, styles: headerCategoryStyle }]);
    rows.push(['', { content: getAth(14).rg || '', styles: rgStyle }, { content: getAth(14).surname || '', styles: athleteStyle }, '', '', '', { content: '15', styles: goalIdStyle }, '', '', { content: '16', styles: goalIdStyle }, '', '', { content: '', colSpan: 6, rowSpan: 6 }]);
    rows.push(['', { content: getAth(15).rg || '', styles: rgStyle }, { content: getAth(15).surname || '', styles: athleteStyle }, '', '', '', { colSpan: 3, content: '' }, { colSpan: 3, content: '' }]);
    rows.push(['', { content: getAth(16).rg || '', styles: rgStyle }, { content: getAth(16).surname || '', styles: athleteStyle }, '', '', '', { content: '17', styles: goalIdStyle }, '', '', { content: '18', styles: goalIdStyle }, '', '']);
    rows.push(['', { content: getAth(17).rg || '', styles: rgStyle }, { content: getAth(17).surname || '', styles: athleteStyle }, '', '', '', { colSpan: 3, content: '' }, { colSpan: 3, content: '' }]);
    rows.push(['', { content: getAth(18).rg || '', styles: rgStyle }, { content: getAth(18).surname || '', styles: athleteStyle }, '', '', '', { content: '19', styles: goalIdStyle }, '', '', { content: '20', styles: goalIdStyle }, '', '']);
    rows.push(['', { content: getAth(19).rg || '', styles: rgStyle }, { content: getAth(19).surname || '', styles: athleteStyle }, '', '', '', { colSpan: 3, content: '' }, { colSpan: 3, content: '' }]);

    autoTable(doc, {
      startY,
      body: rows,
      theme: 'grid',
      styles: { lineColor: [0, 0, 0], lineWidth: 0.19, textColor: [0, 0, 0], halign: 'center', valign: 'middle', fontSize: 6, cellPadding: 0.5, minCellHeight: 5.0 },
      columnStyles: {
        0: { cellWidth: 8.0 }, 1: { cellWidth: 22.0 }, 2: { cellWidth: 48.5 },
        3: { cellWidth: 7.0 }, 4: { cellWidth: 7.0 }, 5: { cellWidth: 7.0 },
        6: { cellWidth: 7.0 }, 7: { cellWidth: 9.0 }, 8: { cellWidth: 9.0 },
        9: { cellWidth: 7.0 }, 10: { cellWidth: 9.0 }, 11: { cellWidth: 9.0 },
        12: { cellWidth: 7.0 }, 13: { cellWidth: 7.0 }, 14: { cellWidth: 7.0 },
        15: { cellWidth: 7.0 }, 16: { cellWidth: 7.0 }, 17: { cellWidth: 7.0 },
      },
      margin: { top: 10, bottom: 5, left: 9.25, right: 9.25 },
      tableWidth: 191.5,
    });
  };

  generateTeamTable(match.team_a, (doc as any).lastAutoTable.finalY + 3);
  generateTeamTable(match.team_b, (doc as any).lastAutoTable.finalY + 3);
};

// ─── Busca de dados no Supabase ────────────────────────────────────────────────

export async function gerarSumulaPDF(matchId: string): Promise<jsPDF> {
  const supabase = createClient();

  // 1. Busca a partida — sem join em competition_editions para evitar ambiguidade de FK
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select(`
      id,
      match_date,
      team_a_id,
      team_b_id,
      phases ( id, full_name, custom_label, edition_id ),
      rounds ( name, custom_label ),
      teams_a:teams!matches_team_a_id_fkey ( id, full_name, logo_url ),
      teams_b:teams!matches_team_b_id_fkey ( id, full_name, logo_url )
    `)
    .eq('id', matchId)
    .maybeSingle();

  if (matchError || !match) {
    throw new Error(matchError?.message ?? 'Partida não encontrada.');
  }

  const phase = match.phases as any;
  const editionId = phase?.edition_id as string | null;

  // 2. Busca dados da edição separadamente (evita o conflito de FK dupla)
  let competitionName = '';
  let primaryColor = '';
  let seasonName = '';

  if (editionId) {
    const { data: edition } = await supabase
      .from('competition_editions')
      .select(`
        competitions ( full_name, primary_color ),
        seasons ( name )
      `)
      .eq('id', editionId)
      .maybeSingle();

    if (edition) {
      competitionName = (edition.competitions as any)?.full_name ?? '';
      primaryColor = (edition.competitions as any)?.primary_color ?? '';
      seasonName = (edition.seasons as any)?.name ?? '';
    }
  }

  const teamAId = match.team_a_id as string | null;
  const teamBId = match.team_b_id as string | null;

  // 3. Busca atletas e comissão das duas equipes na edição
  const buildRoster = async (teamId: string | null): Promise<{ athletes: AthleteRow[]; committee: CommitteeRow[] }> => {
    if (!teamId || !editionId) return { athletes: [], committee: [] };

    const { data: et } = await supabase
      .from('edition_teams')
      .select('id')
      .eq('edition_id', editionId)
      .eq('team_id', teamId)
      .maybeSingle();

    if (!et) return { athletes: [], committee: [] };

    const [{ data: athleteEntries }, { data: staffEntries }] = await Promise.all([
      supabase
        .from('edition_roster_entries')
        .select('athletes ( full_name, surname, rg )')
        .eq('edition_team_id', et.id)
        .eq('status', 'approved')
        .eq('member_type', 'athlete')
        .limit(20),
      supabase
        .from('edition_roster_entries')
        .select('staff_members ( full_name, surname )')
        .eq('edition_team_id', et.id)
        .eq('status', 'approved')
        .eq('member_type', 'staff')
        .limit(3),
    ]);

    const athletes: AthleteRow[] = (athleteEntries ?? []).map((e: any) => ({
      rg: e.athletes?.rg ?? '',
      surname: e.athletes?.surname ?? e.athletes?.full_name ?? '',
    }));

    const committee: CommitteeRow[] = (staffEntries ?? []).map((e: any) => ({
      surname: e.staff_members?.surname ?? e.staff_members?.full_name ?? '',
    }));

    return { athletes, committee };
  };

  const [rosterA, rosterB] = await Promise.all([
    buildRoster(teamAId),
    buildRoster(teamBId),
  ]);

  const teamA = match.teams_a as any;
  const teamB = match.teams_b as any;

  // 4. Monta o objeto no formato esperado pelo drawMatchScoreSheet
  const matchData: MatchData = {
    competition_name: competitionName,
    phase_name: phase?.custom_label ?? phase?.full_name ?? '',
    round_name: (match.rounds as any)?.custom_label ?? (match.rounds as any)?.name ?? '',
    season_name: seasonName,
    match_date: (match.match_date as string) ?? '',
    tournament_main_color: primaryColor,
    team_a: {
      full_name: teamA?.full_name ?? '',
      logo_url: teamA?.logo_url ?? '',
      athletes: rosterA.athletes,
      committee: rosterA.committee,
    },
    team_b: {
      full_name: teamB?.full_name ?? '',
      logo_url: teamB?.logo_url ?? '',
      athletes: rosterB.athletes,
      committee: rosterB.committee,
    },
  };

  // 5. Gera e retorna o PDF
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  drawMatchScoreSheet(doc, matchData);
  return doc;
}

// ─── Exports compatíveis com o código existente ────────────────────────────────

export const generateMatchPDF = (match: MatchData): jsPDF => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  drawMatchScoreSheet(doc, match);
  return doc;
};

export const generateMatchesPDF = (_matchIds: string[]): jsPDF => {
  // implementação existente — não alterar
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  return doc;
};