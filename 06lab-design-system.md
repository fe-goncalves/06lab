# 06lab — Design System

> Documento vivo. Reflete os padrões aplicados em `competicao-hub`, `equipes/[id]`, `atletas/[id]` e seus modais. Qualquer nova tela deve seguir este guia antes de escrever uma linha de código.

---

## 1. Filosofia

O 06lab usa um estilo **dark, técnico e esportivo**. Pensa numa dashboard de data center com a energia visual de um placar de estádio.

- **Fundo quase preto.** Nunca branco, nunca cinza claro.
- **Cor de acento única por contexto.** Cada hub (competição, equipe, atleta) tem um acento derivado do objeto — `primary_color` da competição, do time, ou do time atual do atleta. Quando ausente, cai para `#BFF205`.
- **Mono em tudo técnico.** Labels, placares, stats, filtros, tags — sempre `var(--font-mono)`.
- **Interatividade visual, não textual.** Preferir grid de logos clicáveis a dropdowns. Preferir pill buttons a selects. Reservar inputs de texto para dados livres.
- **Sem libs de componentes.** Tudo é inline style + Tailwind utilitário. Zero dependência de shadcn, Radix, etc.

---

## 2. Tokens de Design (CSS Variables)

```
Fundo principal:    var(--color-background)   #0D0D0D
Surface (cards):    var(--color-surface)       #141414
Borda:              var(--color-border)        rgba(255,255,255,0.08)
Texto principal:    var(--color-text-primary)  #F0F0F0
Texto secundário:   var(--color-text-secondary) #A6A6A6
Brand (acento):     var(--color-brand)         #BFF205
Danger:             var(--color-danger)        #FF4444

Amarelo (avisos):   #F2C005
Fundo de modal:     #0e0e0e  (mais escuro que surface)
```

**Hex hardcoded permitidos** (semânticos, não mudam):
```
#BFF205   brand/acento padrão
#FF4444   danger / cartão vermelho / saída
#F2C005   amarelo / aviso / 3° lugar
#A6A6A6   texto secundário / status neutro
#0e0e0e   fundo de modal
#0a0a0a   cor de texto sobre brand (botões primários)
```

---

## 3. Tipografia

```
var(--font-mono)     → Labels ALL CAPS, stats, filtros, tags, pills, placares, inputs técnicos
var(--font-display)  → Placares grandes, H1 de hubs, números de destaque
var(--font-sans)     → Texto corrido, descrições (raro no 06lab)
```

**Hierarquia de tamanhos (font-mono):**
```
8px   — subtítulos de card, metadados de suporte
9px   — labels de campo (ALL CAPS, tracking 0.12em)
10px  — botões, tabs, badges
11px  — SectionHeader (ALL CAPS, tracking 0.16em, weight 800)
12px  — texto de lista, valores de input, nomes secundários
13px  — nomes principais em listas
14px  — valores numéricos em tabelas de stats
18px  — placeholder de placar
22–24px — H1 de hub (weight 900)
```

---

## 4. Estrutura de Hub (Página Principal de Entidade)

Todo hub de entidade (competição, equipe, atleta) segue a mesma estrutura:

```
┌──────────────────────────────────────────────┐
│  HEADER com degradê + logo + nome + pills    │
│  Abas:  ABA1 | ABA2 | ABA3                  │
│  Faixa colorida 1px na borda inferior        │
└──────────────────────────────────────────────┘
┌──────────────────────────────────────────────┐
│  Conteúdo da aba ativa                       │
│  px-8 py-6 (32px 24px)                      │
└──────────────────────────────────────────────┘
```

### 4.1 Header

```tsx
// Camadas do header (ordem de baixo para cima):
// 1. Degradê com a cor do objeto (competição/time/time do atleta)
// 2. Overlay surface com 85% opacidade
// 3. Conteúdo

<div style={{ borderBottom: "1px solid var(--color-border)", position: "relative", overflow: "hidden" }}>
  {/* Camada 1 — degradê */}
  <div style={{
    position: "absolute", inset: 0, pointerEvents: "none",
    background: accentColor
      ? `linear-gradient(135deg, ${accentColor}22 0%, transparent 55%)`
      : `linear-gradient(135deg, rgba(191,242,5,0.06) 0%, transparent 55%)`,
  }} />
  {/* Camada 2 — overlay */}
  <div style={{ position: "absolute", inset: 0, backgroundColor: "var(--color-surface)", opacity: 0.85, pointerEvents: "none" }} />
  
  {/* Conteúdo (zIndex: 1) */}
  <div style={{ padding: "20px 32px 0", position: "relative", zIndex: 1 }}>
    <Breadcrumb ... />
    
    {/* Logo + nome + pills */}
    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
      {/* Logo — 56–60px, borderRadius 12–14px para equipe, 50% para atleta */}
      {/* Pills de metadados */}
      {/* H1 — font-mono, 22–24px, weight 900 */}
      {/* Botão de ação primária (Salvar etc.) */}
    </div>
    
    {/* Faixa colorida 1px */}
    {accentColor && (
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, ${accentColor}80 0%, transparent 60%)`,
        pointerEvents: "none" }} />
    )}
    
    {/* Abas */}
    <div style={{ display: "flex", gap: 0 }}>
      {tabs.map(tab => (
        <button style={{
          padding: "11px 18px", border: "none",
          borderBottom: `2px solid ${active ? accentColor : "transparent"}`,
          backgroundColor: "transparent",
          fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600,
          letterSpacing: "0.1em", color: active ? accentColor : "#666",
        }} />
      ))}
    </div>
  </div>
</div>
```

**Regra da cor de acento:**
- Competição → `competition.primary_color`
- Equipe → `primaryColor` do time (campo do formulário)
- Atleta → `currentTeam.primary_color` (herdado do time atual)
- Fallback sempre → `#BFF205`

### 4.2 Pills de Metadados (no header)

```tsx
// Pill genérico
<span style={{
  fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700,
  letterSpacing: "0.1em", padding: "2px 8px", borderRadius: 20,
  border: "1px solid rgba(255,255,255,0.1)",
  color: "rgba(255,255,255,0.4)",
  backgroundColor: "rgba(255,255,255,0.04)",
}}>
  Masculino
</span>

// Pill com cor de acento (posição, status ativo, equipe atual)
<span style={{
  padding: "2px 8px", borderRadius: 20,
  border: `1px solid ${accentColor}44`,
  color: accentColor,
  backgroundColor: `${accentColor}11`,
}}>
  GK
</span>
```

---

## 5. SectionHeader (dentro de cards)

Usado para nomear seções dentro de cards. Sempre BFF205 + gradiente à direita.

```tsx
function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
      <div>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800,
          letterSpacing: "0.16em", textTransform: "uppercase",
          color: "#BFF205",  // sempre brand, não acento dinâmico
        }}>
          {title}
        </span>
        {subtitle && (
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.25)", marginTop: 1 }}>
            {subtitle}
          </p>
        )}
      </div>
      {/* Linha degradê */}
      <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, rgba(191,242,5,0.3), transparent)" }} />
    </div>
  );
}
```

**Variante dinâmica** (quando usa acento do objeto):
```tsx
// Substitui rgba(191,242,5,...) pelo acento:
background: `linear-gradient(to right, ${accentColor}44, transparent)`
color: accentColor
```

---

## 6. Cards

```tsx
// Card padrão
<div style={{
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.08)",
  backgroundColor: "var(--color-surface)",
  padding: "20px 20px 24px",
}}>

// Card com estado selecionado/ativo
backgroundColor: "rgba(191,242,5,0.03)"  // leve tint brand
border: "1px solid rgba(191,242,5,0.25)"

// Card com borda colorida (acento dinâmico)
border: `1px solid ${accentColor}33`
backgroundColor: `${accentColor}08`
```

---

## 7. Inputs

```tsx
// Input base (todos os campos de texto)
const inputBaseStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  backgroundColor: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 9,
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: "var(--color-text-primary)",
  outline: "none",
  transition: "border-color 0.15s",
  colorScheme: "dark",
};

// Focus — inline, não CSS class
onFocus={e => e.target.style.borderColor = "rgba(191,242,5,0.4)"}
onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}

// Label de campo (acima do input)
<span style={{
  fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800,
  letterSpacing: "0.12em", textTransform: "uppercase",
  color: "rgba(255,255,255,0.3)",
  display: "block", marginBottom: 5,
}}>
  Nome completo *
</span>

// Select — mesmo estilo + cursor pointer + colorScheme dark
<select style={{ ...inputBaseStyle, cursor: "pointer", colorScheme: "dark" }} />

// Date/time
<input type="date" style={{ ...inputBaseStyle, colorScheme: "dark" }} />
```

---

## 8. Botões

### 8.1 Primário (ação principal)
```tsx
<button style={{
  padding: "10px 28px", borderRadius: 9, border: "none",
  backgroundColor: "#BFF205", color: "#0a0a0a",
  fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800,
  letterSpacing: "0.08em", textTransform: "uppercase",
  cursor: "pointer", transition: "all 0.12s",
}}>
  Salvar
</button>

// Disabled
backgroundColor: "rgba(191,242,5,0.3)"
cursor: "not-allowed"
```

### 8.2 Pill Button (seleção entre opções)

**Regra:** substituir `<select>` sempre que as opções couberem em linha (gênero, status, tipo). Máximo recomendado: 4 opções.

```tsx
// Ativo
{
  border: "1px solid rgba(191,242,5,0.4)",
  backgroundColor: "rgba(191,242,5,0.08)",
  color: "#BFF205",
}

// Inativo
{
  border: "1px solid rgba(255,255,255,0.08)",
  backgroundColor: "transparent",
  color: "rgba(255,255,255,0.4)",
}

// Estrutura
<div style={{ display: "flex", gap: 8 }}>
  {options.map(opt => (
    <button type="button" onClick={() => setValue(opt.v)}
      style={{
        flex: 1, padding: "8px 0", borderRadius: 9,
        border: `1px solid ${value === opt.v ? "rgba(191,242,5,0.4)" : "rgba(255,255,255,0.08)"}`,
        backgroundColor: value === opt.v ? "rgba(191,242,5,0.08)" : "transparent",
        color: value === opt.v ? "#BFF205" : "rgba(255,255,255,0.4)",
        fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
        cursor: "pointer", transition: "all 0.12s",
      }}>
      {opt.l}
    </button>
  ))}
</div>
```

### 8.3 Botão fantasma com acento

```tsx
<button
  style={{
    padding: "6px 14px", borderRadius: 8,
    border: `1px solid ${accentColor}33`,
    backgroundColor: "transparent",
    color: accentColor,
    fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800,
    letterSpacing: "0.06em", textTransform: "uppercase",
    cursor: "pointer", transition: "all 0.12s",
  }}
  onMouseEnter={e => { e.currentTarget.style.backgroundColor = `${accentColor}10`; e.currentTarget.style.borderColor = `${accentColor}66`; }}
  onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.borderColor = `${accentColor}33`; }}
>
  + Adicionar
</button>
```

### 8.4 Botão de fechar modal (×)

```tsx
<button
  style={{
    width: 28, height: 28, borderRadius: 6,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "none", color: "rgba(255,255,255,0.4)",
    cursor: "pointer", fontSize: 16,
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "all 0.12s",
  }}
  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(191,242,5,0.4)"; e.currentTarget.style.color = "#BFF205"; }}
  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
>
  <X size={14} />
</button>
```

---

## 9. Modais

```tsx
// Overlay
<div style={{
  position: "fixed", inset: 0, zIndex: 50,
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: 16,
  backgroundColor: "rgba(0,0,0,0.78)",  // mais opaco que o antigo 0.55
}}
onClick={e => { if (e.target === e.currentTarget) onClose(); }}>

  // Container
  <div style={{
    width: "100%", maxWidth: 440,  // 420 confronto, 440–460 formulários
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.1)",
    backgroundColor: "#0e0e0e",
    overflow: "hidden",
    boxShadow: "0 32px 80px rgba(0,0,0,0.8)",
    maxHeight: "92vh",
    display: "flex", flexDirection: "column",
  }}>

    {/* Header do modal */}
    <div style={{
      padding: "14px 18px",
      borderBottom: "1px solid rgba(255,255,255,0.07)",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      backgroundColor: "rgba(191,242,5,0.03)",
      flexShrink: 0,
    }}>
      <div>
        <p style={{
          fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800,
          letterSpacing: "0.16em", textTransform: "uppercase",
          color: "#BFF205", margin: 0,
        }}>
          Título do modal
        </p>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.3)", margin: 0, marginTop: 2 }}>
          Subtítulo / contexto
        </p>
      </div>
      {/* Botão × */}
    </div>

    {/* Corpo (scrollável) */}
    <div style={{ overflowY: "auto", flex: 1, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 16 }}>
      ...
    </div>

    {/* Footer */}
    <div style={{
      display: "flex", gap: 8,
      padding: "14px 18px",
      borderTop: "1px solid rgba(255,255,255,0.07)",
      flexShrink: 0,
    }}>
      <button /* Cancelar — flex 1, estilo secundário */ />
      <button /* Confirmar — flex 2, estilo primário */ />
    </div>
  </div>
</div>
```

**Regras de modal:**
- Overlay sempre `rgba(0,0,0,0.78)` — mais forte que o antigo padrão
- Container `#0e0e0e` — distinto do surface `#141414`
- Header com `rgba(191,242,5,0.03)` — tint mínimo de acento
- Title em BFF205 ALL CAPS 9px, subtítulo em 11px cinza
- Footer sempre com dois botões: cancelar (flex 1) + ação (flex 2)
- Fechar ao clicar no overlay

---

## 10. Listas e Linhas

### 10.1 MatchRow (linha de partida)

```tsx
// Padrão com hover interativo
<Link
  style={{
    display: "flex", alignItems: "center", padding: "0 16px", height: 54,
    textDecoration: "none",
    opacity: hovered ? 1 : 0.82,
    transition: "opacity 0.12s",
    position: "relative",
  }}
  onMouseEnter={() => setHovered(true)}
  onMouseLeave={() => setHovered(false)}>

  {/* Faixa colorida no hover (no rodapé da linha) */}
  <div style={{
    position: "absolute", bottom: 0, left: 0, right: 0, height: 1,
    background: `linear-gradient(90deg, ${colorA}80 50%, ${colorB}80 50%)`,
    opacity: hovered ? 1 : 0,
    transition: "opacity 0.2s", pointerEvents: "none",
  }} />

  {/* Logos sem fundo — 32px, objectFit contain */}
  {/* Placar central — font-mono 18px, cor BFF205 quando finalizado */}
  {/* Botão delete — aparece no hover (opacity 0.25 → 1) */}
</Link>
```

### 10.2 Lista genérica de entidades

```tsx
// Container
<div style={{
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.08)",
  backgroundColor: "var(--color-surface)",
  overflow: "hidden",
}}>
  {items.map((item, idx) => (
    <div
      style={{
        borderTop: idx > 0 ? "1px solid rgba(255,255,255,0.06)" : "none",
        opacity: 0.85, transition: "opacity 0.1s",
      }}
      onMouseEnter={e => e.currentTarget.style.opacity = "1"}
      onMouseLeave={e => e.currentTarget.style.opacity = "0.85"}>
      ...
    </div>
  ))}
</div>
```

### 10.3 Seleção de time por logo (grid)

**Regra:** nunca usar `<select>` para escolher times. Sempre mostrar logos clicáveis.

```tsx
<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(52px, 1fr))", gap: 5 }}>
  {teams.map(t => (
    <div
      onClick={() => setSelected(t.id)}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
        padding: "7px 4px", borderRadius: 8,
        border: `1px solid ${selected === t.id ? "rgba(191,242,5,0.5)" : "rgba(255,255,255,0.06)"}`,
        backgroundColor: selected === t.id ? "rgba(191,242,5,0.07)" : "rgba(255,255,255,0.02)",
        cursor: "pointer", transition: "all 0.1s",
        opacity: disabled ? 0.3 : 1,
      }}>
      <img src={t.logo_url} style={{ width: 26, height: 26, objectFit: "contain" }} />
      <span style={{
        fontFamily: "var(--font-mono)", fontSize: 7, fontWeight: 700,
        color: selected === t.id ? "#BFF205" : "rgba(255,255,255,0.3)",
        textAlign: "center",
      }}>
        {t.abbreviation}
      </span>
    </div>
  ))}
</div>
```

---

## 11. Separadores de Seção em Listas

Para separar grupos (posições no elenco, rodadas em jogos):

```tsx
<div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
  <span style={{
    fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800,
    letterSpacing: "0.16em", textTransform: "uppercase",
    color: accentColor ?? "#BFF205",
  }}>
    {label}
  </span>
  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.2)" }}>
    {count}
  </span>
  <div style={{
    flex: 1, height: 1,
    background: `linear-gradient(to right, ${accentColor ?? "rgba(191,242,5,0.3)"}, transparent)`,
  }} />
</div>
```

---

## 12. Badges e Tags

```tsx
// Badge de status (movimento, aprovação, etc.)
<span style={{
  fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800,
  letterSpacing: "0.06em",
  padding: "3px 8px", borderRadius: 20,
  backgroundColor: `${color}18`,
  color: color,
  border: `1px solid ${color}33`,
}}>
  Aprovado
</span>

// Badge "atual" (vínculo ativo)
<span style={{
  fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700,
  padding: "2px 8px", borderRadius: 20,
  backgroundColor: `${accentColor}18`,
  color: accentColor,
  border: `1px solid ${accentColor}33`,
}}>
  atual
</span>
```

**Cores semânticas de movimento:**
```
arrival:   #BFF205  (verde — chegada)
transfer:  #A6A6A6  (neutro — transferência)
loan:      #F2C005  (amarelo — empréstimo)
departure: #FF4444  (vermelho — saída)
```

---

## 13. Avatares / Logos

```tsx
// Avatar de atleta (circular)
<div style={{
  width: 38, height: 38, borderRadius: "50%", overflow: "hidden",
  border: `2px solid ${accentColor ?? "#BFF205"}44`,
}}>
  {photo
    ? <img src={photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    : <div style={{
        width: "100%", height: "100%",
        backgroundColor: "rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700,
        color: "rgba(255,255,255,0.4)",
      }}>
        {initials}
      </div>
  }
</div>

// Logo de equipe (quadrado arredondado)
<div style={{
  width: 56, height: 56, borderRadius: 12,
  border: `2px solid ${accentColor ? accentColor + "55" : "rgba(255,255,255,0.1)"}`,
  backgroundColor: "rgba(255,255,255,0.04)",
  display: "flex", alignItems: "center", justifyContent: "center",
}}>
  <img src={logo} style={{ width: 48, height: 48, objectFit: "contain" }} />
</div>

// Logo pequena em lista (sem fundo, sem borda)
<img src={logo} style={{ width: 28, height: 28, objectFit: "contain" }} />

// Botão câmera sobreposto (trocar foto)
<button style={{
  position: "absolute", bottom: -4, right: -4,
  width: 22, height: 22, borderRadius: "50%",
  backgroundColor: "#BFF205",
  border: "2px solid var(--color-background)",
  display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer",
}}>
  <Camera size={10} strokeWidth={2.5} color="#0a0a0a" />
</button>
```

---

## 14. Tabelas de Estatísticas

```tsx
<table style={{ width: "100%", borderCollapse: "collapse" }}>
  <thead>
    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
      {headers.map(h => (
        <th style={{
          padding: "10px 14px", textAlign: "left",
          fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800,
          letterSpacing: "0.1em", textTransform: "uppercase",
          color: "rgba(255,255,255,0.3)", whiteSpace: "nowrap",
        }}>
          {h}
        </th>
      ))}
    </tr>
  </thead>
  <tbody>
    {rows.map((row, idx) => (
      <tr style={{ borderTop: idx > 0 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
        {/* Valor de destaque (ex: gols) */}
        <td style={{
          fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 800,
          color: accentColor ?? "#BFF205",
        }} />
        {/* Valor neutro */}
        <td style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "rgba(255,255,255,0.4)" }} />
      </tr>
    ))}
  </tbody>
</table>
```

---

## 15. Campos de cor (Color Pickers)

```tsx
// Circular, sem borda visível, clicável
<label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer" }}>
  <div style={{ position: "relative", width: 44, height: 44, borderRadius: "50%", overflow: "hidden" }}>
    <input type="color" value={val} onChange={e => setVal(e.target.value)}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", cursor: "pointer", opacity: 0 }} />
    <span style={{ display: "block", width: "100%", height: "100%", backgroundColor: val, pointerEvents: "none" }} />
  </div>
  <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
    Primária
  </span>
  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: val !== "#000000" ? val : "rgba(255,255,255,0.2)" }}>
    {val}
  </span>
</label>
```

---

## 16. Estados de Erro e Sucesso

```tsx
// Erro inline
<p style={{
  fontFamily: "var(--font-mono)", fontSize: 11,
  color: "#FF4444",
  backgroundColor: "rgba(255,68,68,0.07)",
  border: "1px solid rgba(255,68,68,0.2)",
  borderRadius: 8, padding: "8px 12px", margin: 0,
}}>
  {error}
</p>

// Aviso (amarelo)
<p style={{
  fontFamily: "var(--font-mono)", fontSize: 11,
  color: "#F2C005",
  backgroundColor: "rgba(242,192,5,0.06)",
  border: "1px solid rgba(242,192,5,0.2)",
  borderRadius: 8, padding: "8px 12px",
}}>
  {warning}
</p>

// Toast de sucesso/erro → usar função toast() do @/app/(lab)/components/toast
toast("success", "Mensagem de sucesso.");
toast("error", "Mensagem de erro.");
```

---

## 17. Empty States

```tsx
<div style={{
  display: "flex", flexDirection: "column", alignItems: "center",
  justifyContent: "center", padding: "80px 0", textAlign: "center",
}}>
  {/* Opcional: ícone em container */}
  <div style={{
    width: 56, height: 56, borderRadius: 14,
    border: "1px dashed rgba(255,255,255,0.1)",
    display: "flex", alignItems: "center", justifyContent: "center",
    marginBottom: 16, fontSize: 22,
  }}>
    👥
  </div>
  <p style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>
    Título do estado vazio
  </p>
  <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 6 }}>
    Mensagem de suporte.
  </p>
  {/* Link opcional */}
  <Link style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#BFF205", marginTop: 16, textDecoration: "none" }}>
    Ir para X →
  </Link>
</div>
```

---

## 18. Diretrizes de Comportamento

### O que SEMPRE fazer
- Toda lista de itens: `opacity: 0.82` no idle, `1.0` no hover
- Toda ação destrutiva: `confirm()` antes de executar
- Toast de sucesso/erro após toda mutation
- Botão primário desabilitado durante loading com `"rgba(191,242,5,0.3)"` e `cursor: not-allowed`
- Abas e filtros refletem a cor de acento do objeto atual
- Logos de times: sempre `objectFit: contain`, nunca recortadas

### O que NUNCA fazer
- Usar `<select>` para escolher times — usar grid de logos
- Usar `<select>` para opções binárias/ternárias — usar pill buttons
- Usar bordas mais espessas que `1px`
- Usar `border-radius` maior que `16px` em containers, `9–12px` em inputs/botões, `20px` em pills
- Cores fora da paleta definida (exceto acentos dinâmicos do objeto)
- Font-size menor que `7px` ou maior que `24px` em UI (exceto placares especiais)
- Classes Tailwind para lógica dinâmica — usar inline styles
- `<form>` tags dentro de artifacts/React — usar event handlers

### Mixing Tailwind + inline styles
- **Tailwind:** layout estático, flex, grid, overflow, padding/margin padrões
- **Inline styles:** qualquer valor dinâmico, cores, borders condicionais, opacity, hover via `onMouseEnter/Leave`

---

## 19. Hierarquia de Arquivo por Módulo

```
/módulo/
  page.tsx          → Server Component (fetch de dados, auth)
  módulo-client.tsx → Client Component (lista, filtros, state)
  [id]/page.tsx     → Hub da entidade (Client Component direto)
  novo-módulo-modal.tsx → Modal de criação
  actions.ts        → Server Actions (mutations)
```

---

## 20. Checklist para Nova Tela

Antes de entregar qualquer tela nova:

- [ ] Header com degradê de acento + faixa 1px na borda inferior?
- [ ] Abas com borda inferior na cor de acento?
- [ ] SectionHeaders dentro dos cards?
- [ ] Pill buttons para opções binárias/ternárias (gênero, status)?
- [ ] Grid de logos para seleção de times?
- [ ] Logos sem fundo em listas (apenas `objectFit: contain`)?
- [ ] Opacity 0.82 idle → 1.0 hover em listas?
- [ ] Faixa colorida de teams no hover de MatchRow?
- [ ] Modal com estrutura header/corpo scrollável/footer?
- [ ] Overlay `rgba(0,0,0,0.78)` + fechar ao clicar fora?
- [ ] Empty states com ícone + título + mensagem de suporte?
- [ ] Toast em toda mutation?
- [ ] `confirm()` antes de toda ação destrutiva?
- [ ] Font-mono em todos os labels, badges, stats?
