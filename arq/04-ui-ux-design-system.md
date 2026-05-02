# 04 — UI/UX Design System

## Variáveis CSS (Design Tokens)
Todas as cores são variáveis CSS. Nunca usar hex hardcoded exceto para casos específicos de status.

```css
/* Cores principais */
--color-brand: #BFF205          /* Verde lima — ações primárias, destaques */
--color-background: #0D0D0D     /* Fundo principal */
--color-surface: #141414        /* Cards, modais, painéis */
--color-border: rgba(255,255,255,0.08)  /* Bordas sutis */
--color-text-primary: #F0F0F0   /* Texto principal */
--color-text-secondary: #A6A6A6 /* Texto secundário */
--color-danger: #FF4444         /* Erros, delete */

/* Cores semânticas de status */
scheduled: #A6A6A6
ongoing: #BFF205 (brand)
finished: #A6A6A6
postponed: #FF4444

/* Outras cores usadas */
#F2C005  /* Amarelo — avisos, Disputa de Terceiro Lugar */
rgba(191,242,5,0.1)   /* Brand com 10% opacidade — backgrounds de seleção */
rgba(191,242,5,0.04)  /* Brand com 4% opacidade — highlight de vencedor no bracket */
```

## Tipografia
```css
--font-display: /* fonte de display — usada em placares, títulos grandes */
--font-mono: /* fonte monoespaçada — labels, stats, códigos, UI técnica */
--font-sans: /* fonte base — texto corrido */
```

Padrão de uso:
- `font-mono` para labels ALL CAPS, placares, filtros, tags de status
- `font-display` para números grandes (placar no modal, pontos na tabela)
- `font-sans` para texto de entrada, descrições

## Padrões de Componentes

### Botões
```tsx
// Primário (ação principal)
style={{ backgroundColor: "var(--color-brand)", color: "var(--color-background)" }}

// Secundário (borda)
className="rounded-lg border px-4 py-2 text-sm"
style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}

// Filtro/tab ativo
style={{ 
  borderColor: "var(--color-brand)",
  backgroundColor: "rgba(191,242,5,0.1)",
  color: "var(--color-brand)"
}}

// Filtro/tab inativo
style={{ borderColor: "var(--color-border)", color: "#A6A6A6" }}
```

### Inputs
```tsx
className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
style={{ 
  borderColor: "var(--color-border)", 
  backgroundColor: "var(--color-background)", 
  color: "var(--color-text-primary)" 
}}
```

### Cards / Panels
```tsx
className="rounded-xl border overflow-hidden"
style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}
```

### Modais
- Overlay: `backgroundColor: "rgba(0,0,0,0.6)"` ou `bg-black/55`
- Modal: `maxWidth: 400-500px`, `borderRadius: 14px`, `border: 1px solid var(--color-border)`
- Fechar ao clicar no overlay: `onClick={e => { if (e.target === e.currentTarget) onClose(); }}`

### Tabelas de Classificação
- Colunas: #, Equipe, J, V, E, D, GP, GC, SG, PTS
- Top N posições destacadas em `var(--color-brand)`
- Hover: `rgba(255,255,255,0.02)`

### Labels de Status de Partida
```
AG = Agendado (#A6A6A6)
AO VIVO = Em andamento (#BFF205)
FT = Finalizado (#A6A6A6)
AD = Adiado (#FF4444)
```

## Estrutura de Navegação (06.lab)

### Header do Hub de Competição
Tabs principais: JOGOS | CLASSIFICAÇÃO | ESTATÍSTICAS | COMPETIÇÃO | CONFIGURAÇÕES

Sub-tabs por seção:
- ESTATÍSTICAS: GERAL | SEMANAL
- COMPETIÇÃO: FASES | EQUIPES
- CONFIGURAÇÕES: GERAIS | PREMIAÇÕES | INSCRIÇÕES | RANKING

### Sidebar
- Colapsável com persistência em localStorage
- Suporte a competições fixadas (pinned)

## Bracket Visual (BracketView)

### Layout
- Colunas por rodada, ordenadas por `KNOCKOUT_ORDER`
- `Disputa de Terceiro Lugar` sempre vai para o final
- Cards de confronto com logo + abreviação + placar agregado
- Vencedor destacado em `var(--color-brand)`, perdedor em `rgba(166,166,166,0.4)`
- Conector horizontal entre colunas: linha de 12px em `var(--color-border)`

### Cards Clicáveis
- Qualquer confronto com partidas finalizadas é clicável
- Abre `BracketSeriesModal`

### Modal de Série
- Header: label da rodada + indicador de tipo (Agregado/Vitórias)
- Placar agregado grande quando há resultado
- Lista de jogos individuais com label (Ida/Volta/Jogo único)
- Pênaltis exibidos como `2 (4) × (3) 1`
- Botão "Ver partida →" navega para `/partidas/[id]`

## Diretrizes Gerais
- Sem biblioteca de componentes externa — tudo custom
- Inline styles para lógica dinâmica, Tailwind para layout estático
- Opacidade 0.75 em itens de lista, 1.0 no hover (padrão em MatchRow, listas de equipes)
- Textos de rótulos sempre em UPPERCASE com `letterSpacing`
- `font-mono` para qualquer dado técnico/numérico na UI
- Bordas sempre `1px solid var(--color-border)` — nunca mais espessas