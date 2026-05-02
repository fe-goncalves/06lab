# 05 — Current State & Roadmap

## Último Trabalho em Andamento

### BracketView — Redesign Visual (INCOMPLETO)
Estávamos redesenhando o `BracketView` em `competicao-hub.tsx` para um visual estilo UEFA Champions League.

**Status:** O novo código foi inserido corretamente no arquivo e está compilando (confirmado via teste com texto vermelho "BRACKET V2"). Porém, visualmente o resultado não corresponde ao esperado. A causa não foi identificada antes do encerramento da sessão.

**Hipótese não investigada:** As variáveis CSS `--color-*` podem estar retornando valores diferentes do esperado no tema atual, fazendo o novo design parecer similar ao anterior. Verificar os valores reais das vars no DevTools do browser.

**Componentes do novo bracket (todos presentes no arquivo):**
- `BracketView` — container principal com colunas por rodada
- `BracketMatchupCard` — card de confronto individual
- `BracketTeamRow` — linha de time dentro do card
- `BracketSeriesModal` — modal com detalhes dos jogos da série

## Bugs Conhecidos Pendentes

### 1. `<a> cannot contain nested <a>` — competicoes-client.tsx linha 149
`CompetitionRow` tem `<Link>` dentro de `<Link>`. Nunca foi corrigido.
Arquivo: `src/app/(lab)/competicoes/competicoes-client.tsx`

### 2. Componentes órfãos removidos mas código morto confirmado
`MatchupCard`, `TeamRow`, `SeriesModal` foram removidos do arquivo.
Verificar se há alguma referência restante que cause warning.

### 3. FKs ausentes em matchups
```sql
-- Executar no Supabase:
ALTER TABLE matchups
  ADD CONSTRAINT matchups_team_a_id_fkey
    FOREIGN KEY (team_a_id) REFERENCES teams(id) ON DELETE SET NULL,
  ADD CONSTRAINT matchups_team_b_id_fkey
    FOREIGN KEY (team_b_id) REFERENCES teams(id) ON DELETE SET NULL;
```
Até isso ser feito, o lookup de times em matchups é feito manualmente no `loadEditionData`.

## Lógicas Complexas Recém-Resolvidas

### Busca de Matchup em criarPartida
A busca de matchup existente usa `round_label` (string) em vez de `round_id` (pode ser null):
```typescript
// Em src/app/(lab)/partidas/[matchId]/actions.ts
const { data: round } = await supabase
  .from("rounds").select("name, custom_label, display_order").eq("id", round_id).maybeSingle();
const roundLabel = round?.name ?? "";

const { data: existingMatchup } = await supabase
  .from("matchups")
  .select("id")
  .eq("phase_id", faseId)
  .eq("round_label", roundLabel)
  .or(`and(team_a_id.eq.${team_a_id},team_b_id.eq.${team_b_id}),and(team_a_id.eq.${team_b_id},team_b_id.eq.${team_a_id})`)
  .maybeSingle();
```

### Enriquecimento de Matchups sem FK
Como `matchups` não tem FK declarada para `teams`, o join falha via Supabase. Solução no `loadEditionData`:
```typescript
const rawMatchups = (matchupsData as any[]) ?? [];
const allTeamIds = [...new Set(rawMatchups.flatMap((m: any) => [m.team_a_id, m.team_b_id].filter(Boolean)))];
let teamsMap: Record<string, any> = {};
if (allTeamIds.length > 0) {
  const { data: teamsData2 } = await supabase.from("teams")
    .select("id, full_name, abbreviation, logo_url").in("id", allTeamIds);
  (teamsData2 ?? []).forEach((t: any) => { teamsMap[t.id] = t; });
}
const enrichedMatchups = rawMatchups.map((m: any) => ({
  ...m,
  teams_a: m.team_a_id ? teamsMap[m.team_a_id] ?? null : null,
  teams_b: m.team_b_id ? teamsMap[m.team_b_id] ?? null : null,
}));
```

### Agrupamento de Partidas na Aba JOGOS
Partidas de mata-mata não têm `round_id` — agrupamento via `matchup.round_label`:
```typescript
const filteredMatchesByRound: Record<string, { label: string; matches: Match[]; order: number }> = {};
filteredMatches.forEach(m => {
  let key: string;
  let order = 0;
  if (m.rounds?.custom_label ?? m.rounds?.name) {
    key = m.rounds?.custom_label ?? m.rounds?.name ?? "Sem rodada";
  } else if (m.matchup_id) {
    const mu = matchups.find(mu => mu.id === m.matchup_id);
    key = mu?.round_label ?? m.phases?.custom_label ?? m.phases?.full_name ?? "Sem rodada";
    order = mu?.display_order ?? 0;
  } else {
    key = m.phases?.custom_label ?? m.phases?.full_name ?? "Sem rodada";
  }
  if (!filteredMatchesByRound[key]) filteredMatchesByRound[key] = { label: key, matches: [], order };
  filteredMatchesByRound[key].matches.push(m);
});
```

### Filtro de Equipes por Fase no Modal
Ao selecionar fase no modal de nova partida, busca `phase_teams` e filtra:
```typescript
async function loadPhaseTeams(phaseId: string) {
  const { data } = await supabase.from("phase_teams")
    .select("edition_team_id").eq("phase_id", phaseId);
  const etIds = (data ?? []).map((r: any) => r.edition_team_id);
  const teamIds = editionTeams
    .filter(et => etIds.includes(et.id))
    .map(et => et.team_id);
  setPhaseTeamIds(teamIds);
}

const teamsForSelectedPhase = newMatchPhaseId && phaseTeamIds.length > 0
  ? editionTeams
      .filter(et => !et.is_free_agent_pool && et.teams != null && phaseTeamIds.includes(et.team_id))
      .map(et => et.teams) as Team[]
  : teamsForEdition;
```

### useEffect Estável no BracketView
Dependência do useEffect usa string de IDs para evitar re-render infinito:
```typescript
const matchupIdsKey = matchups.map(m => m.id).join(",");
useEffect(() => {
  // ... load
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [phaseId, matchupIdsKey]);
```

## Próximos Passos Imediatos

1. **Resolver visual do BracketView** — Inspecionar DevTools para ver valores reais das CSS vars e confirmar se o novo código está de fato renderizando diferente do anterior

2. **Adicionar FKs em matchups** — SQL acima, executar no Supabase

3. **Corrigir nested `<a>`** — `competicoes-client.tsx` linha ~149, trocar `<Link>` interno por `<div>` com `onClick` e `router.push`

4. **Conectores inteligentes no bracket** — Usar `pending_team_a_from_matchup_id` para desenhar conectores que seguem o vencedor real entre rodadas (próxima iteração do bracket)

5. **Layout de conferência estilo NBA** — Duas conferências espelhadas com final no centro (requer dados de `conference_id` em matchups)

6. **Módulo de Usuários e Representantes** — Não iniciado

7. **Triggers automáticos de notificação no banco** — Não iniciado

8. **06.score** — Zero construído

## Arquivos Mais Críticos para Próxima Sessão

| Arquivo | Descrição |
|---------|-----------|
| `src/app/(lab)/competicoes/[id]/competicao-hub.tsx` | Hub principal — ~2500 linhas, contém BracketView, SemanasTab, todas as abas |
| `src/app/(lab)/partidas/[matchId]/actions.ts` | criarPartida com lógica de matchup |
| `middleware.ts` | Cookie handler — NUNCA adicionar segundo parâmetro em `setAll()` |

## Variáveis de Ambiente Necessárias
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```