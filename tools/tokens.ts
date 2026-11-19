/* Reads design-system/tokens.json and compiles it to CSS custom properties, the way the
   design-system page does: colour and shadow per theme, the other families on :root,
   one class per type style. Also validates the shape rules the page enforces. */
import { readFileSync } from "node:fs";

export interface Token { name: string; value: string | Record<string, string>; usage?: string }
export interface Family { note?: string; tokens: Token[] }
export interface TypeStyle {
  name: string; family?: string; fontSize: string; lineHeight?: number | string;
  fontWeight?: number | string; letterSpacing?: string; sample?: string; usage?: string;
}
export interface Tokens {
  name: string; version: number;
  color: { themes: { id: string; name: string }[]; note?: string; tokens: Token[] };
  type: {
    fonts: { family: string; file: string; weight: string }[];
    families: Record<string, string>;
    groups: { name: string; family: string; note?: string; styles: TypeStyle[] }[];
  };
  [family: string]: unknown;
}

const NAME = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/;
const HEX = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const FN = /^(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\([0-9a-z.,%\s/+-]*\)$/i;
const ALIAS = /^\{([A-Za-z0-9][A-Za-z0-9_.-]{0,63})\}$/;
const LENGTH = /^(?:-?\d*\.?\d+(?:px|rem|em|%|mm)?|0)$/;
/** A value the stylesheet takes as written: no way to end a declaration, a rule, a comment or the <style> it sits in. */
const PLAIN = /^[^<>{};\\\r\n]*$/;
const plain = (v: unknown): boolean => (typeof v === "number" && Number.isFinite(v)) || (typeof v === "string" && PLAIN.test(v) && !v.includes("*/"));

export function loadTokens(path: string): Tokens {
  return JSON.parse(readFileSync(path, "utf8")) as Tokens;
}

function otherFamilies(t: Tokens): [string, Family][] {
  return Object.entries(t)
    .filter(([k, v]) => k !== "color" && k !== "type" && typeof v === "object" && v !== null && Array.isArray((v as Family).tokens))
    .map(([k, v]) => [k, v as Family]);
}

/** Every rule a value can break; an empty list means the page reads the file whole. */
export function validate(t: Tokens): string[] {
  const errs: string[] = [];
  const seen = new Set<string>();
  if (!plain(t.name)) errs.push(`name "${t.name}" cannot sit in a CSS comment`);
  const colorNames = new Set(t.color.tokens.map((x) => x.name));
  const themes = t.color.themes.map((x) => x.id);
  const claim = (fam: string, name: string) => {
    if (!NAME.test(name)) errs.push(`${fam}: bad name "${name}"`);
    if (seen.has(name)) errs.push(`${fam}: duplicate name "${name}"`);
    seen.add(name);
  };
  for (const tok of t.color.tokens) {
    claim("color", tok.name);
    if (!tok.usage) errs.push(`color: ${tok.name} has no usage note`);
    const vals: Record<string, string> = typeof tok.value === "string" ? { [themes[0] ?? "light"]: tok.value } : tok.value;
    for (const [theme, v] of Object.entries(vals)) {
      if (!themes.includes(theme)) errs.push(`color: ${tok.name} names unknown theme "${theme}"`);
      const a = ALIAS.exec(v)?.[1];
      if (a !== undefined) {
        if (a === tok.name) errs.push(`color: ${tok.name} aliases itself`);
        else if (!colorNames.has(a)) errs.push(`color: ${tok.name} aliases missing "${a}"`);
      } else if (!HEX.test(v) && !FN.test(v)) errs.push(`color: ${tok.name} has unreadable value "${v}"`);
    }
  }
  for (const [fam, f] of otherFamilies(t)) {
    for (const tok of f.tokens) {
      claim(fam, tok.name);
      if (!tok.usage) errs.push(`${fam}: ${tok.name} has no usage note`);
      if ((fam === "spacing" || fam === "radius") && typeof tok.value === "string" && !LENGTH.test(tok.value))
        errs.push(`${fam}: ${tok.name} is not a length "${tok.value}"`);
      const values = typeof tok.value === "string" ? [tok.value] : Object.values(tok.value ?? {});
      for (const v of values) if (!ALIAS.test(v) && !plain(v)) errs.push(`${fam}: ${tok.name} has a value CSS cannot take as written "${v}"`);
    }
  }
  for (const [k, v] of Object.entries(t.type.families)) {
    if (!NAME.test(k)) errs.push(`type: bad family name "${k}"`);
    if (!plain(v)) errs.push(`type: family ${k} has a value CSS cannot take as written "${v}"`);
  }
  const styleNames = new Set<string>();
  for (const g of t.type.groups) {
    if (!(g.family in t.type.families)) errs.push(`type: group ${g.name} uses unknown family "${g.family}"`);
    for (const s of g.styles) {
      if (!NAME.test(s.name) || styleNames.has(s.name)) errs.push(`type: bad or duplicate style "${s.name}"`);
      styleNames.add(s.name);
      if (!LENGTH.test(s.fontSize)) errs.push(`type: ${s.name} fontSize "${s.fontSize}"`);
      if (s.family && !(s.family in t.type.families)) errs.push(`type: ${s.name} uses unknown family "${s.family}"`);
      for (const [k, v] of [["lineHeight", s.lineHeight], ["fontWeight", s.fontWeight], ["letterSpacing", s.letterSpacing]] as const)
        if (v !== undefined && !plain(v)) errs.push(`type: ${s.name} ${k} "${String(v)}"`);
    }
  }
  return errs;
}

const cssValue = (v: string): string => {
  const a = ALIAS.exec(v);
  return a ? `var(--${a[1]})` : v;
};
const px = (v: number | string): string => (typeof v === "number" ? `${v}px` : v);

/** tokens.css: first theme on :root and [data-theme=first], one block per further theme.
    With `page`, a theme named "dark" also applies under prefers-color-scheme: dark unless the page
    is explicitly light, so a page follows the viewer's system setting and an explicit choice both ways. */
export function toCSS(t: Tokens, page = false): string {
  const ids = t.color.themes.map((x) => x.id);
  const first = ids[0] ?? "light", rest = ids.slice(1);
  const shadow = (t["shadow"] as Family | undefined)?.tokens ?? [];
  const perTheme = [...t.color.tokens, ...shadow];
  const at = (tok: Token, theme: string): string | undefined =>
    typeof tok.value === "string" ? (theme === first ? tok.value : undefined) : tok.value[theme];
  const lines: string[] = [`/* ${t.name} — generated from tokens.json */`];
  lines.push(`:root, [data-theme="${first}"] {`);
  for (const tok of perTheme) {
    const v = at(tok, first) ?? (typeof tok.value === "string" ? tok.value : Object.values(tok.value)[0] ?? "");
    lines.push(`  --${tok.name}: ${cssValue(v)};`);
  }
  lines.push("}");
  for (const theme of rest) {
    const decl: string[] = [];
    for (const tok of perTheme) {
      const v = at(tok, theme);
      // aliases are re-declared so they resolve against this theme's values
      const orig = at(tok, first) ?? "";
      if (v !== undefined) decl.push(`  --${tok.name}: ${cssValue(v)};`);
      else if (ALIAS.test(orig)) decl.push(`  --${tok.name}: ${cssValue(orig)};`);
    }
    if (page && theme === "dark") {
      decl.push("  color-scheme: dark;");
      lines.push(`@media (prefers-color-scheme: dark) {\n:root:not([data-theme="${first}"]) {`, ...decl, "}\n}");
      lines.push(`:root[data-theme="dark"] {`, ...decl, "}");
    } else lines.push(`[data-theme="${theme}"] {`, ...decl, "}");
  }
  lines.push(":root {");
  for (const [fam, f] of otherFamilies(t)) {
    if (fam === "shadow") continue;
    for (const tok of f.tokens) lines.push(`  --${tok.name}: ${typeof tok.value === "string" ? tok.value : Object.values(tok.value)[0]};`);
  }
  for (const [k, v] of Object.entries(t.type.families)) lines.push(`  --font-${k}: ${v};`);
  lines.push("}");
  for (const g of t.type.groups) {
    for (const s of g.styles) {
      const fam = s.family ?? g.family;
      const decl = [`font-family: var(--font-${fam})`, `font-size: ${px(s.fontSize)}`];
      if (s.lineHeight !== undefined) decl.push(`line-height: ${s.lineHeight}`);
      if (s.fontWeight !== undefined) decl.push(`font-weight: ${s.fontWeight}`);
      if (s.letterSpacing) decl.push(`letter-spacing: ${s.letterSpacing}`);
      lines.push(`.${s.name} { ${decl.join("; ")}; }`);
    }
  }
  return lines.join("\n") + "\n";
}

// ---------- duplicates: the same value twice ----------

/** One colour value written literally (not as an alias) by more than one token, in one theme. */
export interface SameValue { theme: string; value: string; names: string[] }

/** Colour tokens that carry the same literal value in the same theme. Aliases ({name}) are references, not copies. */
export function sameValues(t: Tokens): SameValue[] {
  const themes = t.color.themes.map((x) => x.id);
  const out: SameValue[] = [];
  for (const theme of themes) {
    const by = new Map<string, string[]>();
    for (const tok of t.color.tokens) {
      const v = typeof tok.value === "string" ? (theme === themes[0] ? tok.value : undefined) : tok.value[theme];
      if (!v || ALIAS.test(v)) continue;
      const k = v.toUpperCase();
      by.set(k, [...(by.get(k) ?? []), tok.name]);
    }
    for (const [value, names] of by) if (names.length > 1) out.push({ theme, value, names });
  }
  return out;
}

/** A custom property another file declares again: its value there against the value in tokens.json. */
export interface Copy { name: string; theme: string; here: string; tokens: string | null; same: boolean }

const declarations = (css: string): Map<string, string> =>
  new Map([...css.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/gi)].map((m) => [m[1] ?? "", (m[2] ?? "").trim()]));
const norm = (v: string): string => v.replace(/\s+/g, " ").trim().toUpperCase();

/** Every token a page stylesheet (src/shared/base.css) declares again, in its light :root and its dark block. */
export function copiesIn(css: string, t: Tokens): Copy[] {
  const first = t.color.themes[0]?.id ?? "light";
  const light = css.slice(css.indexOf(":root {"), css.indexOf("}", css.indexOf(":root {")));
  const darkAt = css.indexOf(':root[data-theme="dark"]');
  const dark = darkAt < 0 ? "" : css.slice(darkAt, css.indexOf("}", darkAt));
  const known = new Map<string, Record<string, string>>();
  const put = (name: string, theme: string, v: string) => known.set(name, { ...(known.get(name) ?? {}), [theme]: v });
  for (const tok of t.color.tokens) {
    if (typeof tok.value === "string") put(tok.name, first, tok.value);
    else for (const [th, v] of Object.entries(tok.value)) put(tok.name, th, v);
  }
  for (const [k, v] of Object.entries(t.type.families)) put(`font-${k}`, first, v);
  for (const [fam, f] of Object.entries(t)) {
    if (fam === "color" || fam === "type" || typeof f !== "object" || f === null || !Array.isArray((f as Family).tokens)) continue;
    for (const tok of (f as Family).tokens) put(tok.name, first, typeof tok.value === "string" ? tok.value : Object.values(tok.value)[0] ?? "");
  }
  const out: Copy[] = [];
  for (const [theme, block] of [[first, light], ["dark", dark]] as const) {
    for (const [name, here] of declarations(block)) {
      const all = known.get(name);
      const want = all ? (all[theme] ?? (theme === "dark" ? all[first] : undefined)) : undefined;
      const resolved = want && ALIAS.test(want) ? null : want ?? null;
      out.push({ name, theme, here, tokens: all ? (resolved ?? want ?? null) : null, same: !!want && norm(want) === norm(here) });
    }
  }
  return out;
}
