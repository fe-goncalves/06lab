# 01 — Business Overview

## Objetivo Central
Plataforma SaaS de gestão de competições esportivas. Dois produtos:
- **06.lab** — painel administrativo para organizações esportivas
- **06.score** — site público para consulta de resultados, classificações e estatísticas

## Problema que Resolve
Organizações esportivas amadoras e semi-profissionais gerenciam competições em planilhas, WhatsApp e sistemas genéricos. O 06 centraliza cadastro de times, atletas, árbitros, partidas, resultados, suspensões e estatísticas em uma plataforma especializada.

## Público-Alvo
- **Operador primário:** Organizadores de competições esportivas (ligas, federações, torneios)
- **Piloto atual:** Orange — organização que gerencia Futebol 7 (7-a-side football)
- **Visão futura:** Multi-tenant, multi-esporte, múltiplas organizações licenciadas

## Modelo de Negócio
SaaS licenciado para organizações. Campo `status` na tabela `organizations` controla acesso à licença sem deletar dados. Multi-tenancy via Supabase RLS.

## Regras de Negócio Essenciais

### Competições e Edições
- Uma **Competition** pode ter múltiplas **Editions** (uma por temporada/ano)
- Uma **Edition** tem múltiplas **Phases** (fases)
- Fases têm tipos: `round_robin`, `group_stage`, `knockout`, `conference`
- Fases classificatórias têm **Rounds** (rodadas) com número livre
- Fases de mata-mata têm rounds com labels fixos: Décimas, Oitavas, Quartas, Semifinal, Final, Disputa de Terceiro Lugar

### Partidas
- Partidas são criadas manualmente pelo operador via modal
- Para fases de mata-mata: ao criar uma partida, o sistema busca ou cria automaticamente um **Matchup** (confronto) agrupando as partidas do mesmo par de times na mesma rodada
- A busca de matchup existente usa `phase_id + round_label + par de times` (não `round_id`, pois pode ser null)
- Partidas de mata-mata NÃO têm `round_id` — são linkadas via `matchup_id`
- Partidas classificatórias têm `round_id` e NÃO têm `matchup_id`
- O campo `round_label` no matchup é o identificador estável (string com nome da rodada)

### Rounds em Mata-mata
- Cada round pode ter `legs: boolean` (ida e volta) e `aggregate_score: boolean`
- Quando `legs = true`, duas partidas pertencem ao mesmo matchup
- O toggle "Jogo de volta" no modal de criação aparece apenas quando `legs = true` na rodada selecionada
- `is_second_leg` é salvo na partida para identificar qual é a volta

### Times e Atletas
- Times entram em edições via `edition_teams`
- `edition_teams.is_free_agent_pool = true` identifica o "Sem Clube" — nunca aparece em selects de times
- Atletas são vinculados a times via `athlete_team_stints` (histórico de vínculos)
- Inscrição de atleta em edição via `edition_roster_entries` com status `pending` ou `approved`

### Suspensões
- Modeladas como entidade independente, não embutidas em dados de partida
- Têm controle de saldo de jogos (game balance tracking)

### Aprovações
- Relatórios de partida têm fluxo draft → published (draft/published pattern)
- `match_reports` com status `pending` ou `approved`

### Estatísticas
- Recalculadas via RPCs do Supabase após cada ação relevante:
  - `recalculate_athlete_edition_stats`
  - `recalculate_team_edition_stats`
  - `recalculate_team_career_stats`

### Premiações Semanais (TOTW/MOTW)
- Time da Semana (TOTW) e Momento da Semana (MOTW)
- Vinculados a `edition_id + round_id`
- 7 slots de jogadores + 1 técnico
- Formações disponíveis: 2-3-1, 1-3-2, 2-2-2, 3-3

### Notificações
- Componente de sino existe no UI (não funcional)
- Triggers automáticos no banco NÃO foram implementados
- Criação manual de notificações é o único caminho atual