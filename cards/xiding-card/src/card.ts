// The Xiding business card: geometry, inks, type, and the four layouts (fronts G, H, I and the back).
// Every layout is a list of named elements, so the editor can select, move and scale each one.
// All measures are millimetres on a 90 × 54 mm card.

const W = 90, H = 54, BLEED = 2, SAFE = 4, M = 6, BASE = H - M, INK_TOP = 0.84;
const C = {
  charcoal: "#404041", ivory: "#F3F1E8", sand: "#C3A585", red: "#A14A49", teal: "#559895", mauve: "#8A7E84",
  tealText: "#3D6560", trim: "#E0457B", safe: "#2F8FD8",
};
const SERIF = "'Noto Serif SC', 'Songti SC', SimSun, serif";
const SANS = "'Instrument Sans', 'Noto Sans SC', 'PingFang SC', 'Helvetica Neue', Arial, sans-serif";
const MARK_ASPECT = 844 / 1356;

type Layout = "grid" | "seal2" | "axis";
type FieldKey = "gold" | "red" | "teal" | "mauve" | "goldInk";
type ContactKind = "phone" | "email" | "web" | "address";

interface Person {
  nameZh: string; nameEn: string; company: string; titleEn: string; titleZh: string;
  phone: string; email: string; web: string; address: string;
}
interface Settings {
  fieldW: number; markH: number; zhW: number; logoGap: number; logoY: number;
  name: number; small: number; lead: number; co: number; iconD: number;
  backMark: number; backY: number; brand: number;
  icons: boolean; crop: boolean; align: boolean;
}
/** A move and uniform scale applied to one element on top of its layout, as the editor leaves it. */
/** A move, uniform scale and rotation (degrees, about the element's centre) applied on top of its layout. */
interface Override { dx: number; dy: number; s: number; r?: number; hidden?: boolean }
/** A pasted copy of an element: drawn from its source's artwork, moved and retyped on its own. */
interface Extra { id: string; src: string; label: string }
/** Reference lines a person adds to a sheet, in mm. */
interface RefLines { xs: number[]; ys: number[] }
interface CardState {
  person: number; inks: 2 | 3; logo: Layout; rings: boolean; field: FieldKey; guides: boolean;
  data: Person[]; ov: Record<string, Override>;
  /** per sheet ("seal2:front", "back"…): the groups of element ids that move as one */
  groups: Record<string, string[][]>;
  /** "<sheet>:<element>" → locked against selection and moves */
  locks: Record<string, boolean>;
  /** "<sheet>:<element>#<n>" → the n-th line of type in that element, retyped on the card */
  texts: Record<string, string>;
  /** per sheet: pasted copies */
  extras: Record<string, Extra[]>;
  /** per sheet: reference lines */
  refLines: Record<string, RefLines>;
}

const DEFAULTS: Settings = {
  fieldW: 36, markH: 21, zhW: 26, logoGap: 4.4, logoY: 0, name: 6, small: 2.2, lead: 3.5, co: 2.6, iconD: 2.8,
  backMark: 16, backY: 0, brand: 2.8, icons: false, crop: false, align: false,
};
/**
 * The people on the cards. The build supplies them: private/people.json in the private repository,
 * cards/xiding-card/people.sample.json (fictional) anywhere else. The published card can also read them
 * from its own store when it opens; see loadPeople in store.ts.
 */
const PEOPLE: Person[] = PEOPLE_INIT.map((p) => ({ ...p }));
const BRANDS = ["西顶学院", "西顶艺术"];

interface Field { bg: string; ink: string; accent: string; zh: string; en: string }
/** ink: the logo's colour on the field; accent: 西顶文化 and the icon dots on charcoal (the field colour where it reads at 3:1 or more). */
const FIELDS: Record<FieldKey, Field> = {
  gold: { bg: "#C3A585", ink: "#F3F1E8", accent: "#C3A585", zh: "金", en: "Gold" },
  red: { bg: "#A14A49", ink: "#F3F1E8", accent: "#F3F1E8", zh: "红", en: "Red" },
  teal: { bg: "#559895", ink: "#F3F1E8", accent: "#559895", zh: "青", en: "Teal" },
  mauve: { bg: "#8A7E84", ink: "#F3F1E8", accent: "#F3F1E8", zh: "灰紫", en: "Mauve" },
  goldInk: { bg: "#C3A585", ink: "#404041", accent: "#C3A585", zh: "金·墨", en: "Gold, charcoal logo" },
};
const LAYOUTS: Record<Layout, { zh: string; en: string }> = {
  grid: { zh: "点阵为格", en: "Grid" },
  seal2: { zh: "印", en: "Seal" },
  axis: { zh: "中轴", en: "Axis" },
};

// The live settings and state. The editor and the controls change them, then call render().
const S: Settings = { ...DEFAULTS };
const state: CardState = {
  person: 0, inks: 3, logo: "seal2", rings: false, field: "gold", guides: false,
  data: PEOPLE.map((p) => ({ ...p })), ov: {}, groups: {}, locks: {}, texts: {}, extras: {}, refLines: {},
};

const f2 = (n: number): string => String(Math.round(n * 1000) / 1000);
const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

let measureCtx: CanvasRenderingContext2D | null = null;
/** Width of a line of type in mm, letter-spacing included between characters. */
function textW(t: string, size: number, family: string, weight: number, spacingEm: number): number {
  if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d");
  const chars = Array.from(t);
  let sum = 0;
  if (measureCtx) {
    measureCtx.font = `${weight} ${size * 20}px ${family}`;
    for (const c of chars) sum += measureCtx.measureText(c).width / 20;
  } else {
    for (const c of chars) sum += (c.charCodeAt(0) > 0x2e80 ? 1 : 0.56) * size;
  }
  return sum + spacingEm * size * Math.max(0, chars.length - 1);
}

interface TextOpts { family?: string; weight?: number; spacing?: number; anchor?: "start" | "middle" | "end"; fill?: string }
function text(t: string, x: number, y: number, size: number, o: TextOpts = {}): string {
  return `<text xml:space="preserve" x="${f2(x)}" y="${f2(y)}" font-family="${esc(o.family ?? SANS)}" font-size="${size}" font-weight="${o.weight ?? 400}"` +
    (o.spacing ? ` letter-spacing="${o.spacing}em"` : "") + (o.anchor ? ` text-anchor="${o.anchor}"` : "") +
    ` fill="${o.fill ?? "#000"}">${esc(t)}</text>`;
}

/** 西頂廣仁宮 in the VI's brush lettering, `width` mm wide, its top at y. */
function zh(x: number, y: number, width: number, fill: string): string {
  const k = width / VI.zhW;
  return `<use href="#vi-zh" fill="${fill}" transform="translate(${f2(x - VI.zhX * k)} ${f2(y)}) scale(${f2(k)})"/>`;
}
const zhHeight = (width: number): number => VI.zhH * (width / VI.zhW);

/** The VI's dot mark, from its own outlines: x, y the top-left of its ink, h its height. */
function viMark(x: number, y: number, h: number, fill: string): string {
  const d = VI.dots, k = h / d[3];
  return `<use href="#vi-dots" fill="${fill}" transform="translate(${f2(x - d[0] * k)} ${f2(y - d[1] * k)}) scale(${f2(k)})"/>`;
}

// The full mark from the system's trued geometry, solid or as rings (the system's Circle style).
const ROWS = [62, 318, 428, 594, 772, 940, 1116, 1366];
const OUTER: [number, number][] = [[339, 0], [504, 0], [696, 0], [861, 0]];
const MIDDLE: [number, number][] = [[204, 0], [494, 20], [706, 20], [996, 0]];
function fullMark(x: number, y: number, h: number, fg: string, rings: boolean): string {
  const s = h / 1356, r = 26 * s, sw = Math.max(0.18, 6 * s);
  let out = "";
  ROWS.forEach((row, ri) => {
    for (const [cx0, half] of ri < 2 || ri > 5 ? OUTER : MIDDLE) {
      for (const cx of half ? [cx0 - half, cx0 + half] : [cx0]) {
        const X = f2(x + (cx - 178) * s), Y = f2(y + (row - 36) * s);
        out += rings
          ? `<circle cx="${X}" cy="${Y}" r="${f2(r - sw / 2)}" fill="none" stroke="${fg}" stroke-width="${f2(sw)}"/>`
          : `<circle cx="${X}" cy="${Y}" r="${f2(r)}" fill="${fg}"/>`;
      }
    }
  });
  return out;
}
/** Centre of row `ri` of a full mark drawn from y at height h. */
const rowY = (y: number, h: number, ri: number): number => y + ((ROWS[ri] ?? 0) - 36) * (h / 1356);

/** Names joined by one small dot, centred on cx. */
function nameRow(parts: string[], cx: number, y: number, size: number, fill: string): string {
  const gap = size * 1.25, sp = 0.3, ws = parts.map((p) => textW(p, size, SERIF, 600, sp));
  let x = cx - (ws.reduce((a, b) => a + b, 0) + gap * 2 * (parts.length - 1)) / 2, out = "";
  parts.forEach((p, i) => {
    out += text(p, x, y, size, { family: SERIF, weight: 600, spacing: sp, fill });
    x += ws[i] ?? 0;
    if (i < parts.length - 1) {
      out += `<circle cx="${f2(x + gap)}" cy="${f2(y - size * 0.36)}" r="${f2(size * 0.1)}" fill="${fill}"/>`;
      x += gap * 2;
    }
  });
  return out;
}

/** Break a line into two balanced lines when it is too wide, preferring a break after 区, 道, 路 and the like. */
function wrap(t: string, size: number, maxW: number): string[] {
  if (textW(t, size, SANS, 400, 0) <= maxW) return [t];
  const ch = Array.from(t);
  let best = [t], score = Infinity;
  for (let i = 1; i < ch.length; i++) {
    const a = ch.slice(0, i).join("").trim(), b = ch.slice(i).join("").trim();
    if (!a || !b) continue;
    const wa = textW(a, size, SANS, 400, 0), wb = textW(b, size, SANS, 400, 0);
    if (wa > maxW || wb > maxW) continue;
    const sc = Math.abs(wa - wb) + (/[区道路侧号市县镇 ,，]/.test(ch[i - 1] ?? "") ? 0 : maxW * 0.25);
    if (sc < score) { score = sc; best = [a, b]; }
  }
  return best;
}

// Contact icons: a glyph knocked out of one dot. Glyphs are drawn on a 24-unit grid with a 2-unit stroke.
const ICONS: Record<ContactKind, string> = {
  phone: '<path d="M8.5 3h7a1.5 1.5 0 0 1 1.5 1.5v15a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 19.5v-15A1.5 1.5 0 0 1 8.5 3zM11 17.5h2"/>',
  email: '<path d="M4 6.5h16v11H4zM4.5 7l7.5 6 7.5-6"/>',
  web: '<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c2.4 2.2 3.6 4.9 3.6 8s-1.2 5.8-3.6 8M12 4c-2.4 2.2-3.6 4.9-3.6 8s1.2 5.8 3.6 8"/>',
  address: '<path d="M12 20.5s-5.8-5.4-5.8-10.2a5.8 5.8 0 0 1 11.6 0c0 4.8-5.8 10.2-5.8 10.2z"/><circle cx="12" cy="10.3" r="2"/>',
};
function icon(kind: ContactKind, cx: number, cy: number, d: number, dot: string): string {
  const g = d * 0.62, k = g / 24;
  return `<circle cx="${f2(cx)}" cy="${f2(cy)}" r="${f2(d / 2)}" fill="${dot}"/>` +
    `<g transform="translate(${f2(cx - g / 2)} ${f2(cy - g / 2)}) scale(${f2(k)})" fill="none" stroke="${C.charcoal}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[kind]}</g>`;
}

/** Contact items, in card order, skipping the empty ones. */
function contacts(p: Person, kinds: ContactKind[] = ["phone", "email", "web", "address"]): [ContactKind, string][] {
  return kinds.map((k): [ContactKind, string] => [k, (p[k] || "").trim()]).filter(([, v]) => v);
}
/** One line of contact items side by side, each with its icon when icons are on. Returns markup and width. */
function inlineItems(items: [ContactKind, string][], x: number, y: number, size: number, fg: string, dot: string, anchor: "start" | "middle"): { svg: string; width: number } {
  const d = S.iconD * (size / S.small), gap = size * 1.8, iconW = S.icons ? d + 1.2 : 0;
  const widths = items.map(([, t]) => iconW + textW(t, size, SANS, 400, 0));
  const width = widths.reduce((a, b) => a + b, 0) + gap * Math.max(0, items.length - 1);
  let cx = anchor === "middle" ? x - width / 2 : x, svg = "";
  items.forEach(([k, t], i) => {
    if (S.icons) svg += icon(k, cx + d / 2, y - size * 0.36, d, dot);
    svg += text(t, cx + iconW, y, size, { fill: fg });
    cx += (widths[i] ?? 0) + gap;
  });
  return { svg, width };
}
/** A column of contacts ending on the shared baseline, an icon on the first line of each item. */
function contactColumn(p: Person, x: number, fg: string, dot: string): { svg: string; lines: number } {
  const d = S.iconD, tx = S.icons ? x + d + 1.4 : x, lines: [ContactKind | null, string][] = [];
  for (const [k, v] of contacts(p)) wrap(v, S.small, W - M - tx).forEach((piece, i) => lines.push([i ? null : k, piece]));
  let svg = "";
  lines.reverse().forEach(([k, t], i) => {
    const y = BASE - i * S.lead;
    if (S.icons && k) svg += icon(k, x + d / 2, y - S.small * 0.36, d, dot);
    svg += text(t, tx, y, S.small, { fill: fg });
  });
  return { svg, lines: lines.length };
}

/** One element: the editor finds it by data-el and moves its outer group; the inner group keeps the layout's own position. */
function el(id: string, label: string, svg: string, locked = false): string {
  if (!svg) return "";
  return `<g data-el="${id}" data-label="${esc(label)}"${locked ? ' data-locked="1"' : ""}><g data-inner="1">${svg}</g></g>`;
}
const groundRect = (fill: string): string =>
  `<rect x="${-BLEED}" y="${-BLEED}" width="${W + 2 * BLEED}" height="${H + 2 * BLEED}" fill="${fill}"/>`;
const role = (p: Person): string => [p.titleEn.trim(), p.titleZh.trim()].filter(Boolean).join(" ");

// ---- the back: the whole mark and the two brands ----
function back(inks: 2 | 3): string {
  const h = S.backMark, w = h * MARK_ASPECT, top = 23.5 + S.backY - h / 2;
  return el("ground", "底色 Ground", groundRect(C.charcoal), true) +
    el("backMark", "标志 Logo", viMark(W / 2 - w / 2, top, h, C.ivory)) +
    el("brands", "西顶学院 · 西顶艺术", nameRow(BRANDS, W / 2, BASE, S.brand, inks === 3 ? C.sand : C.ivory));
}

// ---- H 印 Seal: a field in a VI colour holding the full mark and 西頂廣仁宮; the person on charcoal ----
function layoutH(): { mh: number; zw: number; zhH: number; top: number; cx: number; textX: number } {
  const zw = S.zhW, zhH = zhHeight(zw), total = S.markH + S.logoGap + zhH;
  return { mh: S.markH, zw, zhH, top: (H - total) / 2 + S.logoY, cx: S.fieldW / 2, textX: S.fieldW + 6 };
}
function frontSeal(p: Person, inks: 2 | 3, rings: boolean, fieldKey: FieldKey): string {
  const F = FIELDS[fieldKey], L = layoutH(), fg = C.ivory, mw = L.mh * MARK_ASPECT, nb = M + INK_TOP * S.name;
  const eb = nb + Math.max(4.6, S.name * 0.9) + (S.co - S.small) * INK_TOP;
  const co = p.company.trim();
  return el("ground", "底色 Ground", groundRect(C.charcoal), true) +
    el("field", "色块 Field", `<rect x="${-BLEED}" y="${-BLEED}" width="${S.fieldW + BLEED}" height="${H + 2 * BLEED}" fill="${F.bg}"/>`, true) +
    el("mark", "标志 Logo", fullMark(L.cx - mw / 2, L.top, L.mh, F.ink, rings)) +
    el("lettering", "西頂廣仁宮", zh(L.cx - L.zw / 2, L.top + L.mh + S.logoGap, L.zw, F.ink)) +
    el("name", "姓名 Name", p.nameZh.trim() ? text(p.nameZh.trim(), L.textX, nb, S.name, { family: SERIF, weight: 600, spacing: 0.1, fill: fg }) : "") +
    // 西顶文化 takes the line under the name, where the romanisation stood; H carries no English name
    (co ? el("company", "西顶文化", text(co, L.textX, eb, S.co, { family: SERIF, weight: 600, spacing: 0.3, fill: F.accent })) : "") +
    el("role", "职务 Title", role(p) ? text(role(p), L.textX, eb + S.lead, S.small, { fill: fg }) : "") +
    el("contacts", "联系方式 Contacts", contactColumn(p, L.textX, fg, F.accent).svg);
}

// ---- G 点阵为格 Grid: the full mark the height of the type area; each line of type sits on one of its rows ----
function frontGrid(p: Person, inks: 2 | 3, rings: boolean): string {
  const fg = C.ivory, org = inks === 3 ? C.sand : C.ivory, h = (BASE - M) * Math.min(1, S.markH / DEFAULTS.markH);
  const y0 = M + S.logoY, R = (i: number): number => rowY(y0, h, i), x = M + h * MARK_ASPECT + 6;
  const zhH = (R(1) - R(0)) * (S.zhW / DEFAULTS.zhW), co = p.company.trim();
  const nm = ((R(4) - R(3)) / INK_TOP) * (S.name / DEFAULTS.name), mid = (y: number, size: number): number => y + size * 0.36;
  let s = el("ground", "底色 Ground", groundRect(C.charcoal), true) +
    el("mark", "标志 Logo", fullMark(M, y0, h, fg, rings)) +
    el("lettering", "西頂廣仁宮", zh(x, R(0), (zhH / VI.zhH) * VI.zhW, fg)) +
    (co ? el("company", "西顶文化", text(co, x, mid(R(2), S.co), S.co, { family: SERIF, weight: 600, spacing: 0.3, fill: org })) : "") +
    el("name", "姓名 Name", p.nameZh.trim() ? text(p.nameZh.trim(), x, R(4), nm, { family: SERIF, weight: 600, spacing: 0.1, fill: fg }) : "");
  const line5 = [p.nameEn.trim(), role(p)].filter(Boolean);
  let xx = x, l5 = "";
  line5.forEach((t, i) => { l5 += text(t, xx, mid(R(5), S.small), S.small, { weight: i === 0 ? 500 : 400, fill: fg }); xx += textW(t, S.small, SANS, 400, 0) + S.small * 1.6; });
  s += el("role", "英文名与职务 Romanisation and title", l5);
  const row7 = contacts(p, ["phone", "email"]), row8 = contacts(p, ["address"]);
  s += el("contacts", "联系方式 Contacts",
    inlineItems(row7, x, mid(R(6), S.small), S.small, fg, org, "start").svg + inlineItems(row8, x, mid(R(7), S.small), S.small, fg, org, "start").svg);
  return s;
}

// ---- I 中轴 Axis: everything on the card's vertical centre line, the organisation first, then the person ----
function frontAxis(p: Person, inks: 2 | 3, rings: boolean): string {
  const fg = C.ivory, org = inks === 3 ? C.sand : C.ivory, cx = W / 2;
  const mh = 11 * (S.markH / DEFAULTS.markH), mw = mh * MARK_ASPECT, top = M + S.logoY;
  const zw = 24 * (S.zhW / DEFAULTS.zhW), zy = top + mh + 2.4 * (S.logoGap / DEFAULTS.logoGap), zH = zhHeight(zw);
  const coSize = S.co * (2.2 / DEFAULTS.co), cb = zy + zH + 1.8 + INK_TOP * coSize, co = p.company.trim();
  const ns = S.name * 0.9, nb = cb + 3.6 + INK_TOP * ns, small = S.small * 0.95, tiny = S.small * 0.91;
  const subLine = [p.nameEn.trim(), role(p)].filter(Boolean).join("  ·  ");
  return el("ground", "底色 Ground", groundRect(C.charcoal), true) +
    el("mark", "标志 Logo", fullMark(cx - mw / 2, top, mh, fg, rings)) +
    el("lettering", "西頂廣仁宮", zh(cx - zw / 2, zy, zw, fg)) +
    (co ? el("company", "西顶文化", text(co, cx + 0.15 * coSize, cb, coSize, { family: SERIF, weight: 600, spacing: 0.3, anchor: "middle", fill: org })) : "") +
    el("name", "姓名 Name", p.nameZh.trim() ? text(p.nameZh.trim(), cx + 0.05 * ns, nb, ns, { family: SERIF, weight: 600, spacing: 0.1, anchor: "middle", fill: fg }) : "") +
    el("role", "英文名与职务 Romanisation and title", subLine ? text(subLine, cx, nb + 3.9, small, { anchor: "middle", fill: fg }) : "") +
    el("contacts", "联系方式 Contacts",
      inlineItems(contacts(p, ["phone", "email", "web"]), cx, BASE - S.lead * 0.91, tiny, fg, org, "middle").svg +
      inlineItems(contacts(p, ["address"]), cx, BASE, tiny, fg, org, "middle").svg);
}

function front(p: Person, inks: 2 | 3, layout: Layout, rings: boolean, fieldKey: FieldKey): string {
  if (layout === "grid") return frontGrid(p, inks, rings);
  if (layout === "axis") return frontAxis(p, inks, rings);
  return frontSeal(p, inks, rings, fieldKey);
}

// ---- guides drawn over the large sheets ----
function line(x1: number, y1: number, x2: number, y2: number, col: string, dash = ""): string {
  return `<line x1="${f2(x1)}" y1="${f2(y1)}" x2="${f2(x2)}" y2="${f2(y2)}" stroke="${col}" stroke-width=".14"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`;
}
/** The fixed lines a layout is built on: card edges, margins, centre lines, and for H the field's edge and axis. */
function layoutLines(key: string): { xs: number[]; ys: number[] } {
  const xs = [0, M, W / 2, W - M, W], ys = [0, M, H / 2, BASE, H];
  if (key === "seal2:front") { xs.push(S.fieldW, S.fieldW / 2, S.fieldW + 6); }
  return { xs, ys };
}
function alignmentLines(key: string): string {
  const { xs, ys } = layoutLines(key);
  let o = "";
  for (const x of xs) if (x > 0 && x < W) o += line(x, -BLEED, x, H + BLEED, x === W / 2 || x === S.fieldW / 2 ? C.trim : C.safe, x === W / 2 || x === S.fieldW / 2 ? "1 .6" : "");
  for (const y of ys) if (y > 0 && y < H) o += line(-BLEED, y, W + BLEED, y, y === H / 2 ? C.trim : C.safe, y === H / 2 ? "1 .6" : "");
  if (key === "seal2:front") {
    const n = contactColumn(state.data[state.person] ?? PEOPLE[0]!, S.fieldW + 6, "#000", "#000").lines;
    for (let i = 1; i < n; i++) o += line(S.fieldW + 6, BASE - i * S.lead, W - M, BASE - i * S.lead, C.safe, ".4 .4");
  }
  return o;
}
/** Crop marks: 4 mm long, 3 mm outside the trim, at each corner, in the page's ink. */
function cropMarks(): string {
  let o = "";
  for (const [cx, cy] of [[0, 0], [W, 0], [0, H], [W, H]] as const) {
    const sx = cx === 0 ? -1 : 1, sy = cy === 0 ? -1 : 1;
    o += line(cx + sx * 3, cy, cx + sx * 7, cy, "currentColor") + line(cx, cy + sy * 3, cx, cy + sy * 7, "currentColor");
  }
  return o;
}

/** A card as an SVG document. Large sheets can carry bleed guides, crop marks and alignment lines. */
function sheet(inner: string, label: string, key: string, big: boolean): string {
  const wide = big && (state.guides || S.crop), pad = big && S.crop ? 8 : BLEED + 1.5;
  const vb = wide ? [-pad, -pad, W + 2 * pad, H + 2 * pad] : [0, 0, W, H];
  let g = "";
  if (big && state.guides) {
    g += `<rect x="${-BLEED}" y="${-BLEED}" width="${W + 2 * BLEED}" height="${H + 2 * BLEED}" fill="none" stroke="#9AA5A3" stroke-width=".12"/>` +
      `<rect x="0" y="0" width="${W}" height="${H}" fill="none" stroke="${C.trim}" stroke-width=".2"/>` +
      `<rect x="${SAFE}" y="${SAFE}" width="${W - 2 * SAFE}" height="${H - 2 * SAFE}" fill="none" stroke="${C.safe}" stroke-width=".18" stroke-dasharray=".8 .6"/>`;
  }
  if (big && S.crop) g += cropMarks();
  if (big && S.align) g += `<g opacity=".9" pointer-events="none">${alignmentLines(key)}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(" ")}" role="img" aria-label="${esc(label)}" data-key="${key}">` +
    `<g data-card="1">${inner}</g><g pointer-events="none">${g}</g></svg>`;
}

/** Each element's layout box (before any override), measured once the SVG is in the page. */
const baseBoxes = new WeakMap<SVGGElement, DOMRect>();
function baseBox(g: SVGGElement): DOMRect {
  let b = baseBoxes.get(g);
  if (!b) {
    const inner = g.firstElementChild as SVGGraphicsElement | null;
    b = inner ? inner.getBBox() : new DOMRect(0, 0, 0, 0);
    baseBoxes.set(g, b);
  }
  return b;
}
const ovKey = (key: string, id: string): string => `${key}:${id}`;
function overrideOf(key: string, id: string): Override {
  return state.ov[ovKey(key, id)] ?? { dx: 0, dy: 0, s: 1 };
}
function transformFor(b: DOMRect, o: Override): string {
  const rot = o.r ? ` rotate(${f2(o.r)} ${f2((b.width * o.s) / 2)} ${f2((b.height * o.s) / 2)})` : "";
  return `translate(${f2(b.x + o.dx)} ${f2(b.y + o.dy)})${rot} scale(${f2(o.s)}) translate(${f2(-b.x)} ${f2(-b.y)})`;
}
const moved = (o: Override): boolean => !!(o.dx || o.dy || o.s !== 1 || o.r);
/** Draw a sheet's pasted copies, each from its source's own artwork, on top of the card, as Canva pastes. */
function materializeExtras(svg: SVGSVGElement, key: string): void {
  for (const x of state.extras[key] ?? []) {
    if (svg.querySelector(`g[data-el="${CSS.escape(x.id)}"]`)) continue;
    const src = svg.querySelector<SVGGElement>(`g[data-el="${CSS.escape(x.src)}"]`);
    const inner = src?.firstElementChild;
    if (!src || !inner) continue;
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("data-el", x.id);
    g.setAttribute("data-label", x.label);
    g.setAttribute("data-extra", "1");
    g.appendChild(inner.cloneNode(true));
    (svg.querySelector("g[data-card]") ?? src.parentNode)?.appendChild(g);
  }
}
/** Apply the editor's moves and scales to every element of a rendered card. */
function applyOverrides(svg: SVGSVGElement, key: string): void {
  materializeExtras(svg, key);
  svg.querySelectorAll<SVGGElement>("g[data-el]").forEach((g) => {
    const id = g.dataset.el ?? "";
    g.querySelectorAll("text").forEach((t, i) => {
      const v = state.texts[`${ovKey(key, id)}#${i}`];
      if (v !== undefined) t.textContent = v;
    });
    const o = overrideOf(key, id);
    g.style.display = o.hidden ? "none" : "";
    if (moved(o)) g.setAttribute("transform", transformFor(baseBox(g), o));
    else g.removeAttribute("transform");
  });
}
/** An element's box as it now stands on the card, override included. */
function currentBox(g: SVGGElement, key: string): DOMRect {
  const b = baseBox(g), o = overrideOf(key, g.dataset.el ?? "");
  const w = b.width * o.s, h = b.height * o.s, x = b.x + o.dx, y = b.y + o.dy;
  if (!o.r) return new DOMRect(x, y, w, h);
  // a rotated element's box is the upright box around its four turned corners
  const pts = cornersOf(x, y, w, h, o.r);
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs), y0 = Math.min(...ys);
  return new DOMRect(x0, y0, Math.max(...xs) - x0, Math.max(...ys) - y0);
}
/** The four corners of a w × h box at x, y turned r degrees about its centre. */
function cornersOf(x: number, y: number, w: number, h: number, r: number): [number, number][] {
  const cx = x + w / 2, cy = y + h / 2, a = (r * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return ([[x, y], [x + w, y], [x + w, y + h], [x, y + h]] as [number, number][]).map(([px, py]) =>
    [cx + (px - cx) * c - (py - cy) * s, cy + (px - cx) * s + (py - cy) * c]);
}
/** An element's turned outline, for the selection overlay. */
function outlineOf(g: SVGGElement, key: string): [number, number][] {
  const b = baseBox(g), o = overrideOf(key, g.dataset.el ?? "");
  return cornersOf(b.x + o.dx, b.y + o.dy, b.width * o.s, b.height * o.s, o.r ?? 0);
}
