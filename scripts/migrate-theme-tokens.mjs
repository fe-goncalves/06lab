import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dirname, "..", "src", "app", "(lab)");

/** Replacements ordered: more specific patterns first. */
const REPLACEMENTS = [
  // Borders (composite)
  ['borderBottom: "1px solid rgba(255,255,255,0.07)"', 'borderBottom: "1px solid var(--color-divider-strong)"'],
  ['borderBottom: "1px solid rgba(255,255,255,0.06)"', 'borderBottom: "1px solid var(--color-divider-strong)"'],
  ['borderBottom: "1px solid rgba(255,255,255,0.04)"', 'borderBottom: "1px solid var(--color-divider)"'],
  ['borderTop: "1px solid rgba(255,255,255,0.06)"', 'borderTop: "1px solid var(--color-divider-strong)"'],
  ['border: "1px solid rgba(255,255,255,0.08)"', 'border: "1px solid var(--color-input-border)"'],
  ['border: "1px solid rgba(255,255,255,0.1)"', 'border: "1px solid var(--color-input-border-strong)"'],
  ['border: "2px dashed rgba(255,255,255,0.12)"', 'border: "2px dashed var(--color-dashed-border)"'],
  ['border: open ? "1px solid rgba(191,242,5,0.35)" : "1px solid rgba(255,255,255,0.08)"', 'border: open ? "1px solid var(--color-brand-border)" : "1px solid var(--color-input-border)"'],

  // Backgrounds
  ['backgroundColor: "rgba(255,255,255,0.02)"', 'backgroundColor: "var(--color-hover-bg-subtle)"'],
  ['backgroundColor: "rgba(255,255,255,0.03)"', 'backgroundColor: "var(--color-hover-bg-subtle)"'],
  ['backgroundColor: "rgba(255,255,255,0.04)"', 'backgroundColor: "var(--color-input-bg)"'],
  ['backgroundColor: "rgba(255,255,255,0.06)"', 'backgroundColor: "var(--color-surface-raised)"'],
  ['backgroundColor: "rgba(255,255,255,0.08)"', 'backgroundColor: "var(--color-hover-bg)"'],
  ['background: "rgba(255,255,255,0.04)"', 'background: "var(--color-input-bg)"'],
  ['backgroundColor: "#0e0e0e"', 'backgroundColor: "var(--color-modal-bg)"'],
  ['backgroundColor: "#0E0E0E"', 'backgroundColor: "var(--color-modal-bg)"'],
  ['backgroundColor: "rgba(0,0,0,0.78)"', 'backgroundColor: "var(--color-modal-scrim)"'],
  ['backgroundColor: "rgba(0,0,0,0.85)"', 'backgroundColor: "var(--color-modal-scrim-heavy)"'],
  ['backgroundColor: "rgba(0,0,0,0.82)"', 'backgroundColor: "var(--color-modal-scrim-heavy)"'],
  ['backgroundColor: "rgba(0,0,0,0.65)"', 'backgroundColor: "var(--color-search-scrim)"'],

  // Brand tints
  ['backgroundColor: "rgba(191,242,5,0.04)"', 'backgroundColor: "var(--color-brand-hover-bg)"'],
  ['backgroundColor: "rgba(191,242,5,0.05)"', 'backgroundColor: "var(--color-brand-hover-bg)"'],
  ['backgroundColor: "rgba(191,242,5,0.08)"', 'backgroundColor: "var(--color-brand-selected-bg)"'],
  ['backgroundColor: "rgba(191,242,5,0.1)"', 'backgroundColor: "var(--color-brand-muted-bg)"'],
  ['backgroundColor: isSelected ? "rgba(191,242,5,0.08)" : "transparent"', 'backgroundColor: isSelected ? "var(--color-brand-selected-bg)" : "transparent"'],
  ['backgroundColor: value === "" ? "rgba(191,242,5,0.08)" : "transparent"', 'backgroundColor: value === "" ? "var(--color-brand-selected-bg)" : "transparent"'],
  ['"rgba(191,242,5,0.08)"', '"var(--color-brand-selected-bg)"'],
  ['"rgba(191,242,5,0.1)"', '"var(--color-brand-muted-bg)"'],
  ['"rgba(191,242,5,0.35)"', '"var(--color-brand-border)"'],
  ['"rgba(191,242,5,0.3)"', '"var(--color-brand-muted-bg)"'],
  ['"rgba(191,242,5,0.05)"', '"var(--color-brand-hover-bg)"'],

  // Danger
  ['backgroundColor: "rgba(255,68,68,0.05)"', 'backgroundColor: "var(--color-danger-muted-bg)"'],
  ['backgroundColor: "rgba(255,68,68,0.35)"', 'backgroundColor: "var(--color-danger-disabled-bg)"'],
  ['border: "1px solid rgba(255,68,68,0.15)"', 'border: "1px solid var(--color-danger-muted-border)"'],
  ['border: "1px solid rgba(255,68,68,0.2)"', 'border: "1px solid var(--color-danger-muted-border)"'],
  ['color: "#FF4444"', 'color: "var(--color-danger)"'],
  ['color: "#FF6B6B"', 'color: "var(--color-danger)"'],
  ['backgroundColor: "#FF4444"', 'backgroundColor: "var(--color-danger)"'],

  // Text colors
  ['color: "#A6A6A6"', 'color: "var(--color-text-secondary)"'],
  ['color: "#a6a6a6"', 'color: "var(--color-text-secondary)"'],
  ['color: "#F2F2F2"', 'color: "var(--color-text-primary)"'],
  ['color: "#fff"', 'color: "var(--color-text-primary)"'],
  ['color: "#ffffff"', 'color: "var(--color-on-danger)"'],
  ['color: "#BFF205"', 'color: "var(--color-brand)"'],
  ['color: "#0D0D0D"', 'color: "var(--color-on-brand)"'],
  ['color: "#0d0d0d"', 'color: "var(--color-on-brand)"'],
  ['color: "#0a0a0a"', 'color: "var(--color-on-brand)"'],
  ['color: "rgba(255,255,255,0.25)"', 'color: "var(--color-text-hint)"'],
  ['color: "rgba(255,255,255,0.28)"', 'color: "var(--color-text-hint)"'],
  ['color: "rgba(255,255,255,0.3)"', 'color: "var(--color-text-faint)"'],
  ['color: "rgba(255,255,255,0.35)"', 'color: "var(--color-text-muted)"'],
  ['color: "rgba(255,255,255,0.4)"', 'color: "var(--color-icon-muted)"'],
  ['color: "rgba(255,255,255,0.45)"', 'color: "var(--color-text-muted)"'],
  ['color: "rgba(255,255,255,0.5)"', 'color: "var(--color-text-subtle)"'],
  ['color: "rgba(255,255,255,0.55)"', 'color: "var(--color-text-subtle)"'],
  ['color: "rgba(255,255,255,0.6)"', 'color: "var(--color-text-label)"'],
  ['color: selected ? "#fff" : "rgba(255,255,255,0.35)"', 'color: selected ? "var(--color-text-primary)" : "var(--color-text-muted)"'],
  ['color: selected || value === "" ? "#fff" : "rgba(255,255,255,0.35)"', 'color: selected || value === "" ? "var(--color-text-primary)" : "var(--color-text-muted)"'],
  ['color: isSelected ? "#BFF205" : "var(--color-text-primary)"', 'color: isSelected ? "var(--color-brand)" : "var(--color-text-primary)"'],
  ['color: value === "" ? "#BFF205" : "rgba(255,255,255,0.5)"', 'color: value === "" ? "var(--color-brand)" : "var(--color-text-subtle)"'],

  // Hover handlers
  ['e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)"', 'e.currentTarget.style.backgroundColor = "var(--color-hover-bg)"'],
  ['e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)"', 'e.currentTarget.style.backgroundColor = "var(--color-hover-bg-subtle)"'],
  ['(e.currentTarget as HTMLElement).style.backgroundColor = "rgba(191,242,5,0.05)"', '(e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-brand-hover-bg)"'],

  // Focus handlers
  ['e.currentTarget.style.borderColor = "#BFF205"', 'e.currentTarget.style.borderColor = "var(--color-brand)"'],
  ['e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"', 'e.currentTarget.style.borderColor = "var(--color-input-border)"'],
  ['onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}', 'onBlur={e => (e.currentTarget.style.borderColor = "var(--color-input-border)")}'],

  // Shadows & gradients
  ['boxShadow: "0 8px 24px rgba(0,0,0,0.45)"', 'boxShadow: "var(--color-dropdown-shadow)"'],
  ['boxShadow: "0 32px 80px rgba(0,0,0,0.8)"', 'boxShadow: "var(--color-modal-shadow)"'],
  ['background: "linear-gradient(to right, rgba(191,242,5,0.3), transparent)"', 'background: "var(--gradient-section-line)"'],

  // colorScheme - remove forced dark (html handles it)
  ['colorScheme: "dark" as any,', ''],
  ['colorScheme: "dark" as const,', ''],
  ['colorScheme: "dark" as const', ''],
  ['colorScheme: "dark" as any', ''],
  ['colorScheme: "dark",', ''],
  ['colorScheme: "dark"', ''],
  [', colorScheme: "dark"', ''],
  ['style={{ ...inputStyle, colorScheme: "dark" }}', 'style={inputStyle}'],
  ['style={{ ...valueBase, colorScheme: "dark" }}', 'style={valueBase}'],
  ['className={inputClass} style={{ ...inputStyle, colorScheme: "dark" }}', 'className={inputClass} style={inputStyle}'],

  // Brand buttons
  ['backgroundColor: "#BFF205"', 'backgroundColor: "var(--color-brand)"'],
  ['background: "#BFF205"', 'background: "var(--color-brand)"'],
];

const SKIP_DIRS = new Set(["components"]);

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (SKIP_DIRS.has(name) && dir === ROOT) continue;
      walk(full, files);
    } else if (name.endsWith(".tsx") || name.endsWith(".ts")) {
      files.push(full);
    }
  }
  return files;
}

let totalFiles = 0;
let totalChanges = 0;

for (const file of walk(ROOT)) {
  let content = readFileSync(file, "utf8");
  const original = content;
  for (const [from, to] of REPLACEMENTS) {
    if (content.includes(from)) {
      content = content.split(from).join(to);
    }
  }
  if (content !== original) {
    writeFileSync(file, content, "utf8");
    totalFiles++;
    totalChanges++;
    console.log("updated:", file.replace(join(import.meta.dirname, "..") + "\\", ""));
  }
}

console.log(`\nDone: ${totalFiles} files updated.`);
