/* 西顶 XIDING — brand bundle source. Compiled to components/bundle.js with tsc.
   Mark geometry, lockups and the business-card layout are ported from the Xiding mark studio:
   same point data, same constants, same formulas. Functions return SVG or HTML strings, so they
   work in any page, slide or canvas without a framework. */

type Colorway = "teal" | "ink" | "night" | "tealInk";
type MarkStyle = "dot" | "ring" | "point";
type Geometry = "extracted" | "trued";
type Lockup = "mark" | "stacked" | "horizontal";
type Family = "serif" | "sans";

interface MarkOptions {
  colorway?: Colorway;
  style?: MarkStyle;
  lockup?: Lockup;
  geometry?: Geometry;
  size?: number;
  ring?: number;
  transparent?: boolean;
  ink?: string;
  ground?: string;
  sized?: boolean;
  title?: string;
}
interface SubBrandOptions extends MarkOptions {
  layout?: "stacked" | "wide";
  latin?: string;
  brands?: string[];
}
interface BrandRowOptions { size?: string; color?: string }
interface Person {
  nameZh: string; nameEn: string; titleZh: string; titleEn: string;
  phone: string; email: string; web: string; address: string;
}
interface CardOptions {
  side?: "front" | "back";
  person?: Partial<Person>;
  front?: Colorway;
  back?: "paper" | "ink" | "teal";
  orientation?: "landscape" | "portrait";
  frontLayout?: "mark" | "lockup";
  backLayout?: "left" | "center";
  brands?: string;
  guides?: boolean;
  bleed?: boolean;
  style?: MarkStyle;
  geometry?: Geometry;
  size?: number;
  ring?: number;
}
type Prim =
  | { t: "rect"; x: number; y: number; w: number; h: number; fill: string }
  | { t: "circle"; cx: number; cy: number; r: number; fill?: string; stroke?: string; sw?: number }
  | { t: "text"; text: string; x: number; y: number; size: number; family: Family; weight: number; spacing: number; anchor: "start" | "middle"; opacity: number; fill: string };

(function (root: any) {
  // ---------- the mark: 32 marks, 40 circles, 8 rows, in source pixels ----------
  const R = 26;
  const ROWS = "ABCDEFGH";
  const CENTER = { x: 600, y: 714 };
  const BOUNDS = { left: 178, right: 1022, top: 36, bottom: 1392 };
  const PAD = 140;
  const COLORWAYS: Record<Colorway, { name: string; bg: string; fg: string }> = {
    teal: { name: "Temple teal", bg: "#628F8A", fg: "#FFFFFF" },
    ink: { name: "Black on white", bg: "#FFFFFF", fg: "#000000" },
    night: { name: "White on black", bg: "#000000", fg: "#FFFFFF" },
    tealInk: { name: "Teal on white", bg: "#FFFFFF", fg: "#628F8A" },
  };
  const STYLE_NAMES: Record<MarkStyle, string> = { dot: "Dot", ring: "Circle", point: "Point" };
  const PRESETS: [Colorway, MarkStyle][] = [
    ["teal", "dot"], ["ink", "dot"], ["night", "dot"], ["ink", "ring"],
    ["ink", "point"], ["night", "ring"], ["tealInk", "ring"], ["night", "point"],
  ];
  const SERIF = "'Noto Serif SC', 'Songti SC', 'SimSun', serif";
  const SANS = "'Instrument Sans', 'Helvetica Neue', Arial, sans-serif";
  const familyOf = (f: Family) => (f === "serif" ? SERIF : SANS);
  const fam = (f: Family) => familyOf(f).replace(/'/g, "&apos;");

  type Row = { y: number; xs: number[][] };
  const outerX = (third: number) => [[339.5, 0], [503.5, 0], [third, 0], [861, 0]];
  const midX = [[204.5, 0], [492.5, 20], [705, 20.5], [996, 0]];
  const EXTRACTED: Row[] = [
    { y: 61.5, xs: outerX(695) }, { y: 317.5, xs: outerX(695) },
    { y: 427.5, xs: midX }, { y: 594, xs: midX }, { y: 772, xs: midX }, { y: 940, xs: midX },
    { y: 1115.5, xs: outerX(694.5) }, { y: 1365.5, xs: outerX(695) },
  ];
  const tOuter = [[339, 0], [504, 0], [696, 0], [861, 0]];
  const tMid = [[204, 0], [494, 20], [706, 20], [996, 0]];
  const TRUED: Row[] = [
    { y: 62, xs: tOuter }, { y: 318, xs: tOuter },
    { y: 428, xs: tMid }, { y: 594, xs: tMid }, { y: 772, xs: tMid }, { y: 940, xs: tMid },
    { y: 1116, xs: tOuter }, { y: 1366, xs: tOuter },
  ];
  type MarkPoint = { id: string; row: number; col: number; x: number; y: number; half: number };
  type Circle = { mark: MarkPoint; cx: number; cy: number };
  function marksFor(g?: Geometry): MarkPoint[] {
    const out: MarkPoint[] = [];
    (g === "trued" ? TRUED : EXTRACTED).forEach((r, ri) =>
      r.xs.forEach(([x, half], ci) => out.push({ id: ROWS[ri] + (ci + 1), row: ri, col: ci, x, y: r.y, half })));
    return out;
  }
  function circlesFor(ms: MarkPoint[]): Circle[] {
    const out: Circle[] = [];
    ms.forEach((m) => {
      if (m.half) { out.push({ mark: m, cx: m.x - m.half, cy: m.y }, { mark: m, cx: m.x + m.half, cy: m.y }); }
      else { out.push({ mark: m, cx: m.x, cy: m.y }); }
    });
    return out;
  }

  const fmt = (n: number) => (Math.round(n * 100) / 100).toString();
  const fmt3 = (n: number) => (Math.round(n * 1000) / 1000).toString();
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  type State = { colorway: Colorway; style: MarkStyle; lockup: Lockup; geometry: Geometry; size: number; ring: number; transparent: boolean };
  function stateOf(o: MarkOptions): State {
    return {
      colorway: o.colorway || "teal", style: o.style || "dot", lockup: o.lockup || "mark",
      geometry: o.geometry || "extracted", size: o.size == null ? 1 : o.size, ring: o.ring == null ? 6 : o.ring,
      transparent: !!o.transparent,
    };
  }
  const radius = (s: State) => (s.style === "point" ? 4 * s.size : R * s.size);
  function circleMarkup(s: State, c: { cx: number; cy: number }, fg: string): string {
    const r = radius(s);
    if (s.style === "ring") {
      const rr = Math.max(0.5, r - s.ring / 2);
      return `<circle cx="${fmt(c.cx)}" cy="${fmt(c.cy)}" r="${fmt(rr)}" fill="none" stroke="${fg}" stroke-width="${fmt(s.ring)}"/>`;
    }
    return `<circle cx="${fmt(c.cx)}" cy="${fmt(c.cy)}" r="${fmt(r)}" fill="${fg}"/>`;
  }
  type LockText = { text: string; x: number; y: number; size: number; anchor: "start" | "middle"; family: Family; weight: number; spacing: number; fit?: number };
  type Frame = { x: number; y: number; w: number; h: number; texts: LockText[] };
  function frame(s: State): Frame {
    const L = BOUNDS.left, Rt = BOUNDS.right, T = BOUNDS.top, B = BOUNDS.bottom, pad = PAD;
    if (s.lockup === "stacked") {
      return {
        x: L - pad, y: T - pad, w: Rt - L + 2 * pad, h: B + 520 + pad - (T - pad),
        texts: [
          { text: "西顶", x: 600, y: B + 340, size: 280, anchor: "middle", family: "serif", weight: 700, spacing: 0.06 },
          { text: "XIDING", x: 600, y: B + 505, size: 84, anchor: "middle", family: "sans", weight: 500, spacing: 0.42 },
        ],
      };
    }
    if (s.lockup === "horizontal") {
      const tx = Rt + 170;
      return {
        x: L - pad, y: T - pad, w: tx + 880 + pad - (L - pad), h: B - T + 2 * pad,
        texts: [
          { text: "西顶", x: tx, y: 800, size: 430, anchor: "start", family: "serif", weight: 700, spacing: 0.04 },
          { text: "XIDING", x: tx + 12, y: 1010, size: 100, anchor: "start", family: "sans", weight: 500, spacing: 0.42 },
        ],
      };
    }
    return { x: L - pad, y: T - pad, w: Rt - L + 2 * pad, h: B - T + 2 * pad, texts: [] };
  }
  function textMarkup(t: LockText, fg: string): string {
    const tx = t.anchor === "middle" && !t.fit ? t.x + (t.spacing * t.size) / 2 : t.x;
    const fit = t.fit ? ` textLength="${fmt(t.fit)}" lengthAdjust="spacing"` : ` letter-spacing="${t.spacing}em"`;
    return `<text x="${fmt(tx)}" y="${fmt(t.y)}" font-family="${fam(t.family)}" font-size="${fmt(t.size)}" font-weight="${t.weight}"${fit} text-anchor="${t.anchor}" fill="${fg}">${esc(t.text)}</text>`;
  }
  function svgOf(s: State, f: Frame, o: MarkOptions, extra: string): string {
    const cw = COLORWAYS[s.colorway];
    const fg = o.ink || cw.fg;
    const ground = o.ground || cw.bg;
    const cs = circlesFor(marksFor(s.geometry));
    const bg = s.transparent || ground === "none" ? "" : `<rect x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" fill="${ground}"/>`;
    const dims = o.sized ? ` width="${f.w}" height="${f.h}"` : "";
    const label = esc(o.title || "Xiding mark");
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f.x} ${f.y} ${f.w} ${f.h}"${dims} role="img" aria-label="${label}">\n<title>${label}</title>\n${bg}\n<g>\n${cs.map((c) => circleMarkup(s, c, fg)).join("\n")}\n</g>\n${f.texts.map((t) => textMarkup(t, fg)).join("\n")}\n${extra}</svg>\n`;
  }

  /** The mark, alone or in the stacked or wide lockup, exactly as the mark studio exports it. */
  function mark(o: MarkOptions = {}): string {
    const s = stateOf(o);
    return svgOf(s, frame(s), o, "");
  }

  // Two overlapping dots, the mark's own pair, used as a separator between names.
  function pairCircles(cx: number, cy: number, size: number, fill: string): string {
    const r = size * 0.19, d = r * 1.54;
    return `<circle cx="${fmt(cx - d / 2)}" cy="${fmt(cy)}" r="${fmt(r)}" fill="${fill}"/><circle cx="${fmt(cx + d / 2)}" cy="${fmt(cy)}" r="${fmt(r)}" fill="${fill}"/>`;
  }
  // Width of a run of full-width CJK characters: one em each, plus tracking between them.
  const cjkW = (text: string, size: number, spacing: number) => {
    const n = Array.from(text).length;
    return n * size + Math.max(0, n - 1) * spacing * size;
  };
  function brandRowSVG(parts: string[], x: number, y: number, size: number, anchor: "start" | "middle", fill: string): string {
    const spacing = 0.28, gap = size * 1.5;
    const widths = parts.map((p) => cjkW(p, size, spacing));
    const total = widths.reduce((a, b) => a + b, 0) + gap * 2 * Math.max(0, parts.length - 1);
    let cx = anchor === "middle" ? x - total / 2 : x;
    let out = "";
    parts.forEach((p, i) => {
      out += `<text x="${fmt(cx)}" y="${fmt(y)}" font-family="${fam("serif")}" font-size="${fmt(size)}" font-weight="600" letter-spacing="${spacing}em" text-anchor="start" fill="${fill}">${esc(p)}</text>\n`;
      cx += widths[i];
      if (i < parts.length - 1) { out += pairCircles(cx + gap, y - size * 0.34, size, fill) + "\n"; cx += gap * 2; }
    });
    return out;
  }

  /** A sub-brand lockup: the master lockup with the sub-brand named in the brand row, on the mark's own dot rows. */
  type RowSpec = { parts: string[]; x: number; y: number; size: number; anchor: "start" | "middle" } | null;
  function subBrandLayout(o: SubBrandOptions = {}): { s: State; f: Frame; row: RowSpec; title: string; fg: string } {
    const layout = o.layout || "wide";
    const latin = o.latin || "XIDING";
    const brands = o.brands || [];
    const s = stateOf(o);
    const cw = COLORWAYS[s.colorway], fg = o.ink || cw.fg;
    const L = BOUNDS.left, Rt = BOUNDS.right, T = BOUNDS.top, B = BOUNDS.bottom, pad = PAD;
    const title = o.title || [latin].concat(brands).join(" ");
    if (layout === "stacked") {
      // The studio's stacked lockup, then the brand row one step below the Latin line.
      const zhW = cjkW("西顶", 280, 0.06);
      const latinT: LockText = latin === "XIDING"
        ? { text: latin, x: 600, y: B + 505, size: 84, anchor: "middle", family: "sans", weight: 500, spacing: 0.42 }
        : { text: latin, x: 600, y: B + 480, size: 46, anchor: "middle", family: "sans", weight: 500, spacing: 0.42, fit: zhW };
      const rowY = latinT.y + 150;
      const f: Frame = {
        x: L - pad, y: T - pad, w: Rt - L + 2 * pad, h: (brands.length ? rowY + 155 : latinT.y + 155) - (T - pad),
        texts: [{ text: "西顶", x: 600, y: B + 340, size: 280, anchor: "middle", family: "serif", weight: 700, spacing: 0.06 }, latinT],
      };
      const row: RowSpec = brands.length ? { parts: brands, x: 600, y: rowY, size: 80, anchor: "middle" } : null;
      return { s, f, row, title, fg };
    }
    // Wide: the card's "With 西顶" front. The wordmark's ink spans dot rows B–E; the Latin line sits on row G, the brand row on row H.
    const r = R * s.size;
    const INK_TOP = 0.84, INK_BOTTOM = 0.06;
    const topInk = 317.5 - r, botInk = 772 + r;
    const size = (botInk - topInk) / (INK_TOP + INK_BOTTOM);
    const gap = 6.5 * (1356 / 30), tx = Rt + gap;
    const zhW = cjkW("西顶", size, 0.04);
    const latinT: LockText = latin === "XIDING"
      ? { text: latin, x: tx + 9, y: 1115.5 + r, size: 104, anchor: "start", family: "sans", weight: 500, spacing: 0.46 }
      : { text: latin, x: tx + 9, y: 1115.5 + r, size: 82, anchor: "start", family: "sans", weight: 500, spacing: 0.46, fit: zhW - 18 };
    const f: Frame = {
      x: L - pad, y: T - pad, w: tx + zhW + pad - (L - pad), h: B - T + 2 * pad,
      texts: [{ text: "西顶", x: tx, y: botInk - INK_BOTTOM * size, size, anchor: "start", family: "serif", weight: 700, spacing: 0.04 }, latinT],
    };
    // The brand row never runs past the wordmark: two long names are set a little smaller to fit its width.
    const natural = brands.reduce((a, b) => a + cjkW(b, 95, 0.28), 0) + 95 * 3 * Math.max(0, brands.length - 1);
    const rowSize = 95 * Math.min(1, (zhW - 4.5) / Math.max(1, natural));
    const row: RowSpec = brands.length ? { parts: brands, x: tx + 4.5, y: 1365.5 + r, size: rowSize, anchor: "start" } : null;
    return { s, f, row, title, fg };
  }
  function subBrand(o: SubBrandOptions = {}): string {
    const l = subBrandLayout(o);
    const row = l.row ? brandRowSVG(l.row.parts, l.row.x, l.row.y, l.row.size, l.row.anchor, l.fg) : "";
    return svgOf(l.s, l.f, { ...o, title: l.title }, row);
  }

  /** Names joined by the pair dot, as inline HTML that takes the surrounding text colour. */
  function brandRow(parts: string[], o: BrandRowOptions = {}): string {
    const style = (o.size ? `font-size:${o.size};` : "") + (o.color ? `color:${o.color};` : "");
    const pair = `<svg class="xd-pair" viewBox="0 0 67.26 38" aria-hidden="true"><circle cx="19" cy="19" r="19"/><circle cx="48.26" cy="19" r="19"/></svg>`;
    return `<span class="xd-brandrow"${style ? ` style="${style}"` : ""}>${parts.map((p) => `<span>${esc(p)}</span>`).join(pair)}</span>`;
  }

  // ---------- business card: 90 × 54 mm, 2 mm bleed, 4 mm safe area ----------
  const BLEED = 2, SAFE = 4;
  const MARGIN = 6;   // mm from trim
  const SMALL = 2.1;  // ≈ 6 pt: every secondary line
  const LEAD = 3.4;   // mm between secondary lines
  const NAME = 4.8;   // ≈ 13.6 pt
  const INK_TOP = 0.84, INK_BOTTOM = 0.06;
  const MARK_ASPECT = 844 / 1356;
  const ACCENT_TEXT = "#3D6560";
  const BACKS = {
    paper: { bg: "#FFFFFF", fg: "#000000", mark: "#628F8A", name: "White" },
    ink: { bg: "#000000", fg: "#FFFFFF", mark: "#FFFFFF", name: "Black" },
    teal: { bg: "#628F8A", fg: "#FFFFFF", mark: "#FFFFFF", name: "Teal" },
  };
  const ADDRESS = "北京市海淀区曙光街道西顶路北侧西顶庙";
  // The three cards, as the mark studio holds them.
  // The fictional samples of cards/xiding-card/people.sample.json. The real people live only in
  // private/people.json; a private build passes them to Xiding.setPeople() (see tools/showcase.ts --people).
  const PEOPLE: Person[] = [
    { nameZh: "张三", nameEn: "Zhang San", titleZh: "首席执行官", titleEn: "CEO", phone: "+86 100 0000 0001", email: "zhangsan@example.com", web: "example.com", address: ADDRESS },
    { nameZh: "李四", nameEn: "Li Si", titleZh: "院长", titleEn: "Dean", phone: "+86 100 0000 0002", email: "lisi@example.com", web: "example.com", address: ADDRESS },
    { nameZh: "王小五", nameEn: "Wang Xiaowu", titleZh: "董事", titleEn: "Director", phone: "+86 100 0000 0003", email: "wangxiaowu@example.com", web: "example.com", address: ADDRESS },
  ];
  let mctx: CanvasRenderingContext2D | null = null;
  function measure(text: string, font: string): number | null {
    if (typeof document === "undefined") { return null; }
    if (!mctx) { mctx = document.createElement("canvas").getContext("2d"); }
    if (!mctx) { return null; }
    mctx.font = font;
    return mctx.measureText(text).width;
  }
  function textW(text: string, size: number, family: Family, weight: number, spacing: number): number {
    const chars = Array.from(text);
    let sum = 0;
    for (const c of chars) {
      const m = measure(c, `${weight} ${size * 10}px ${familyOf(family)}`);
      sum += m == null ? (c.charCodeAt(0) > 0x2e80 ? 1 : 0.56) * size * 10 : m;
    }
    return (sum + spacing * size * 10 * (chars.length - 1)) / 10;
  }
  // Chinese convention: a two-character name is opened up to the width of three.
  const nameSpacing = (name: string) => (Array.from(name.trim()).length === 2 ? 1 : 0.16);
  type CardState = Required<Pick<CardOptions, "front" | "back" | "orientation" | "frontLayout" | "backLayout" | "brands">> & { mark: State };
  const cardSize = (c: CardState) => (c.orientation === "landscape" ? { w: 90, h: 54 } : { w: 54, h: 90 });
  function markPrims(c: CardState, cx: number, cy: number, height: number, fg: string): Prim[] {
    const s = c.mark, k = height / 1356;
    const r = s.style === "point" ? Math.max(0.14, 4 * k * s.size) : R * k * s.size;
    return circlesFor(marksFor(s.geometry)).map((p): Prim => {
      const x = cx + (p.cx - 600) * k, y = cy + (p.cy - 714) * k;
      if (s.style === "ring") {
        const sw = Math.max(0.08, s.ring * k);
        return { t: "circle", cx: x, cy: y, r: Math.max(0.05, r - sw / 2), stroke: fg, sw };
      }
      return { t: "circle", cx: x, cy: y, r, fill: fg };
    });
  }
  function txt(text: string, x: number, y: number, size: number, o: Partial<Prim & { t: "text" }>): Prim {
    return { t: "text", text, x, y, size, family: "sans", weight: 400, spacing: 0, anchor: "start", opacity: 1, fill: "#000000", ...(o as object) } as Prim;
  }
  function pairDot(cx: number, cy: number, size: number, fill: string): Prim[] {
    const r = size * 0.19, d = r * 1.54;
    return [{ t: "circle", cx: cx - d / 2, cy, r, fill }, { t: "circle", cx: cx + d / 2, cy, r, fill }];
  }
  function pairRow(parts: string[], x: number, y: number, size: number, anchor: "start" | "middle", fill: string, opts: { family?: Family; weight?: number; spacing?: number } = {}): Prim[] {
    const family = opts.family || "sans", weight = opts.weight || 400, spacing = opts.spacing || 0;
    const gap = size * 1.5;
    const widths = parts.map((p) => textW(p, size, family, weight, spacing));
    const total = widths.reduce((s, v) => s + v, 0) + gap * 2 * Math.max(0, parts.length - 1);
    let cx = anchor === "middle" ? x - total / 2 : x;
    const out: Prim[] = [];
    parts.forEach((p, i) => {
      out.push(txt(p, cx, y, size, { family, weight, spacing, fill }));
      cx += widths[i];
      if (i < parts.length - 1) { out.push(...pairDot(cx + gap, y - size * 0.34, size, fill)); cx += gap * 2; }
    });
    return out;
  }
  const brandParts = (c: CardState) => c.brands.split(/[\s\u3000·,，、]+/).map((s) => s.trim()).filter(Boolean);
  function frontPrims(c: CardState): Prim[] {
    const { w, h } = cardSize(c), cw = COLORWAYS[c.front];
    const ps: Prim[] = [{ t: "rect", x: -BLEED, y: -BLEED, w: w + 2 * BLEED, h: h + 2 * BLEED, fill: cw.bg }];
    const land = c.orientation === "landscape", parts = brandParts(c);
    const brandOpts = { family: "serif" as Family, weight: 600, spacing: 0.28 };
    if (c.frontLayout === "mark") {
      // Mark sits a touch above centre; the brand row anchors the lower margin.
      const mh = land ? 26 : 36, cy = parts.length ? (land ? 23.5 : 40) : h / 2;
      ps.push(...markPrims(c, w / 2, cy, mh, cw.fg));
      if (parts.length) { ps.push(...pairRow(parts, w / 2, h - MARGIN - (land ? 2 : 4), 2.2, "middle", cw.fg, brandOpts)); }
      return ps;
    }
    if (land) {
      // Wordmark ink spans dot rows B–E; XIDING and the brand row sit on rows G and H.
      const mh = 30, k = mh / 1356, r = R * k * c.mark.size, cy = h / 2;
      const row = (src: number) => cy + (src - 714) * k;
      const topInk = row(317.5) - r, botInk = row(772) + r;
      const size = (botInk - topInk) / (INK_TOP + INK_BOTTOM);
      const wmW = textW("西顶", size, "serif", 700, 0.04), gap = 6.5, mw = mh * MARK_ASPECT;
      const start = (w - (mw + gap + wmW)) / 2, mcx = start + mw / 2, tx = start + mw + gap;
      ps.push(...markPrims(c, mcx, cy, mh, cw.fg));
      ps.push(txt("西顶", tx, botInk - INK_BOTTOM * size, size, { family: "serif", weight: 700, spacing: 0.04, fill: cw.fg }));
      ps.push(txt("XIDING", tx + 0.2, row(1115.5) + r, 2.3, { weight: 500, spacing: 0.46, fill: cw.fg }));
      if (parts.length) { ps.push(...pairRow(parts, tx + 0.1, row(1365.5) + r, 2.1, "start", cw.fg, brandOpts)); }
      return ps;
    }
    ps.push(...markPrims(c, w / 2, 31, 30, cw.fg));
    ps.push(txt("西顶", w / 2, 62, 9, { family: "serif", weight: 700, spacing: 0.06, anchor: "middle", fill: cw.fg }));
    ps.push(txt("XIDING", w / 2, 67.6, 2.2, { weight: 500, spacing: 0.46, anchor: "middle", fill: cw.fg }));
    if (parts.length) { ps.push(...pairRow(parts, w / 2, h - MARGIN - 4, 2.1, "middle", cw.fg, brandOpts)); }
    return ps;
  }
  // Split a line that runs past maxW (mm) into two balanced lines, preferring natural breaks
  // such as 区, 街道 or 路, so no line is left with a stray character or two.
  function wrapLine(text: string, size: number, maxW: number): string[] {
    const wOf = (str: string) => textW(str, size, "sans", 400, 0);
    if (wOf(text) <= maxW) { return [text]; }
    const chars = Array.from(text);
    let best = [text], bestScore = Infinity;
    for (let i = 1; i < chars.length; i++) {
      const a = chars.slice(0, i).join("").trim(), b = chars.slice(i).join("").trim();
      if (!a || !b) { continue; }
      const wa = wOf(a), wb = wOf(b);
      if (wa > maxW || wb > maxW) { continue; }
      const natural = /[区道路侧号市县镇 ,，]/.test(chars[i - 1]) ? 0 : 1;
      const score = Math.abs(wa - wb) + natural * maxW * 0.25;
      if (score < bestScore) { bestScore = score; best = [a, b]; }
    }
    return best;
  }
  function backPrims(c: CardState, f: Person): Prim[] {
    const { w, h } = cardSize(c), b = BACKS[c.back];
    const ps: Prim[] = [{ t: "rect", x: -BLEED, y: -BLEED, w: w + 2 * BLEED, h: h + 2 * BLEED, fill: b.bg }];
    const land = c.orientation === "landscape", center = c.backLayout === "center";
    const label = c.back === "paper" ? ACCENT_TEXT : b.fg, labelOp = c.back === "paper" ? 1 : 0.55;
    const nameZh = f.nameZh.trim(), nameEn = f.nameEn.trim();
    const titleLine = [f.titleZh.trim(), f.titleEn.trim()].filter(Boolean).join("  ");
    const rows = ([["M", f.phone], ["E", f.email], ["W", f.web], ["A", f.address]] as [string, string][])
      .map(([l, v]): [string, string] => [l, v.trim()]).filter(([, v]) => v);
    const bottom = h - MARGIN;
    if (!center) {
      const x = MARGIN;
      // Name block: Chinese name, then English name and title on the small size.
      const capTop = land ? 10.5 : 30;
      const nb = capTop + INK_TOP * NAME;
      if (nameZh) { ps.push(txt(nameZh, x, nb, NAME, { family: "serif", weight: 700, spacing: nameSpacing(nameZh), fill: b.fg })); }
      if (nameEn) { ps.push(txt(nameEn, x, nb + 4.6, SMALL, { weight: 600, spacing: 0.06, fill: b.fg })); }
      const tb = nb + 4.6 + LEAD;
      if (titleLine) { ps.push(txt(titleLine, x, tb, SMALL, { fill: b.fg, opacity: 0.62 })); }
      // Mark: landscape, its height is exactly the name block (name ink top to title baseline), set on the right margin.
      if (land) {
        const mh = tb - capTop;
        ps.push(...markPrims(c, w - MARGIN - (mh * MARK_ASPECT) / 2, capTop + mh / 2, mh, b.mark));
      } else {
        const mh = 15;
        ps.push(...markPrims(c, x + (mh * MARK_ASPECT) / 2, MARGIN + mh / 2, mh, b.mark));
      }
      // Contact block: one-letter labels in a hanging column, values aligned, set from the bottom margin up.
      const vx = x + 3.8, vw = w - MARGIN - vx;
      const lines: [string, string][] = [];
      rows.forEach(([l, v]) => wrapLine(v, SMALL, vw).forEach((piece, k) => lines.push([k === 0 ? l : "", piece])));
      lines.slice().reverse().forEach(([l, v], k) => {
        const y = bottom - k * LEAD;
        if (l) { ps.push(txt(l, x, y, SMALL * 0.86, { weight: 600, spacing: 0.04, fill: label, opacity: labelOp })); }
        ps.push(txt(v, vx, y, SMALL, { fill: b.fg }));
      });
      return ps;
    }
    // Centered: mark, name, then contacts in a calm column; phone and email share a line joined by a pair dot.
    const cx = w / 2, inner = w - 2 * MARGIN;
    const mh = land ? 9.5 : 15, mtop = land ? MARGIN : MARGIN + 4;
    ps.push(...markPrims(c, cx, mtop + mh / 2, mh, b.mark));
    const nb = (land ? 19.5 : 34) + INK_TOP * NAME;
    if (nameZh) { ps.push(txt(nameZh, cx, nb, NAME, { family: "serif", weight: 700, spacing: nameSpacing(nameZh), anchor: "middle", fill: b.fg })); }
    if (nameEn) { ps.push(txt(nameEn, cx, nb + 4.6, SMALL, { weight: 600, spacing: 0.06, anchor: "middle", fill: b.fg })); }
    if (titleLine) { ps.push(txt(titleLine, cx, nb + 4.6 + LEAD, SMALL, { anchor: "middle", fill: b.fg, opacity: 0.62 })); }
    const get = (l: string) => { const hit = rows.filter(([k]) => k === l)[0]; return hit ? hit[1] : ""; };
    const stack: string[][] = [];
    const pm = [get("M"), get("E")].filter(Boolean);
    if (land && pm.length === 2 && textW(pm.join("     "), SMALL, "sans", 400, 0) < inner) { stack.push(pm); }
    else { pm.forEach((v) => stack.push([v])); }
    if (get("W")) { stack.push([get("W")]); }
    if (get("A")) { wrapLine(get("A"), SMALL, inner).forEach((piece) => stack.push([piece])); }
    stack.slice().reverse().forEach((parts, k) => {
      const y = bottom - k * LEAD;
      if (parts.length > 1) { ps.push(...pairRow(parts, cx, y, SMALL, "middle", b.fg)); }
      else { ps.push(txt(parts[0], cx, y, SMALL, { anchor: "middle", fill: b.fg })); }
    });
    return ps;
  }
  function primsSVG(c: CardState, ps: Prim[], opts: { bleed: boolean; guides: boolean; label: string }): string {
    const { w, h } = cardSize(c);
    const vb = opts.bleed ? `${-BLEED} ${-BLEED} ${w + 2 * BLEED} ${h + 2 * BLEED}` : `0 0 ${w} ${h}`;
    const size = opts.bleed ? ` width="${w + 2 * BLEED}mm" height="${h + 2 * BLEED}mm"` : "";
    const body = ps.map((p) => {
      if (p.t === "rect") { return `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="${p.fill}"/>`; }
      if (p.t === "circle") {
        return p.stroke
          ? `<circle cx="${fmt3(p.cx)}" cy="${fmt3(p.cy)}" r="${fmt3(p.r)}" fill="none" stroke="${p.stroke}" stroke-width="${fmt3(p.sw == null ? 0.1 : p.sw)}"/>`
          : `<circle cx="${fmt3(p.cx)}" cy="${fmt3(p.cy)}" r="${fmt3(p.r)}" fill="${p.fill}"/>`;
      }
      const x = p.anchor === "middle" ? p.x + (p.spacing * p.size) / 2 : p.x;
      return `<text x="${fmt3(x)}" y="${fmt3(p.y)}" font-family="${fam(p.family)}" font-size="${p.size}" font-weight="${p.weight}" letter-spacing="${p.spacing}em" text-anchor="${p.anchor}" fill="${p.fill}"${p.opacity < 1 ? ` fill-opacity="${p.opacity}"` : ""}>${esc(p.text)}</text>`;
    }).join("\n");
    let guides = "";
    if (opts.guides) {
      guides = `<g fill="none" stroke="#E0457B" stroke-width="0.15"><rect x="0" y="0" width="${w}" height="${h}" stroke-dasharray="1 0.6"/><rect x="${SAFE}" y="${SAFE}" width="${w - 2 * SAFE}" height="${h - 2 * SAFE}" stroke="#2F8FD8" stroke-dasharray="0.4 0.6"/></g>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"${size} role="img" aria-label="${esc(opts.label)}">\n${body}\n${guides}</svg>\n`;
  }

  /** One side of the business card, as the mark studio lays it out. */
  function card(o: CardOptions = {}): string {
    const c: CardState = {
      front: o.front || "teal", back: o.back || "paper", orientation: o.orientation || "landscape",
      frontLayout: o.frontLayout || "mark", backLayout: o.backLayout || "left",
      brands: o.brands == null ? "西顶学院　西顶艺术" : o.brands,
      mark: stateOf({ style: o.style, geometry: o.geometry, size: o.size, ring: o.ring }),
    };
    const person: Person = { ...PEOPLE[0], ...(o.person || {}) };
    const side = o.side || "front";
    const ps = side === "front" ? frontPrims(c) : backPrims(c, person);
    return primsSVG(c, ps, { bleed: !!o.bleed, guides: !!o.guides, label: side === "front" ? "Xiding business card, front" : `Xiding business card, back, ${person.nameEn}` });
  }

  // 一底三柱: the three pillars, one word and one sentence each, standing on the value line.
  const PILLARS = [
    { id: "mei", zh: "大美", word: "眼光", sentence: "AI 交来十个方案，你看得出哪一个对。", en: "Taste", line: "美成", motto: "以美成人" },
    { id: "zhi", zh: "大智", word: "章法", sentence: "十件事同时在跑，你排得出先后，知道哪一环会断。", en: "Structure", line: "智行", motto: "以智行事" },
    { id: "li", zh: "大礼", word: "分寸", sentence: "你待人有分寸，关键的人肯为你引荐、担保。", en: "Trust", line: "礼遇", motto: "以礼相遇" },
  ];
  const LINE = "以美成人，以智行事，以礼相遇。";
  const ROOT = { zh: "广仁宫", en: "Guangren Palace" };

  const BRANDS = [
    { zh: "西顶文化", en: "Xiding", level: "整体", settled: true },
    { zh: "西顶艺术", en: "Xiding Arts", level: "牌子", settled: true },
    { zh: "西顶学院", en: "Xiding Academy", level: "牌子", settled: true },
    { zh: "西顶时光", en: "Xiding Lifestyle", level: "会员", settled: true },
    { zh: "西顶智行", en: "Xiding Praxis", level: "板块", settled: false },
    { zh: "西顶美成", en: "", level: "板块", settled: false },
    { zh: "西顶礼遇", en: "", level: "板块", settled: false },
  ];
  const SCENES = [
    { pillar: "大美", id: "mei", scenes: ["古琴", "艺术鉴赏", "策展"], use: "养品味" },
    { pillar: "大智", id: "zhi", scenes: ["咨询", "培训", "落地陪跑对接"], use: "解决问题" },
    { pillar: "大礼", id: "li", scenes: ["生日", "下午茶", "私宴"], use: "经营关系" },
    { pillar: "担当", id: "root", scenes: ["心理辅导", "教练"], use: "养心力" },
  ];

  // ---------- art: one drawing model behind every generated asset ----------
  // An Art is a box and a list of primitives. The same list becomes an SVG string, a PNG (in a browser, with the web fonts)
  // or an outlined file (in the build), so every asset comes from one source and changes when that source changes.
  type AText = { t: "text"; text: string; x: number; y: number; size: number; family: Family; weight: number; spacing: number; anchor: "start" | "middle"; fill: string; opacity?: number; fit?: number };
  type ARect = { t: "rect"; x: number; y: number; w: number; h: number; fill?: string; stroke?: string; sw?: number; rx?: number };
  type ACircle = { t: "circle"; cx: number; cy: number; r: number; fill?: string; stroke?: string; sw?: number };
  type APrim = AText | ARect | ACircle;
  type Art = { name: string; label: string; group: string; fonts: "none" | "serif" | "mixed"; x: number; y: number; w: number; h: number; px: number; prims: APrim[] };

  function rowPrims(parts: string[], x: number, y: number, size: number, anchor: "start" | "middle", fill: string): APrim[] {
    const spacing = 0.28, gap = size * 1.5;
    const widths = parts.map((p) => cjkW(p, size, spacing));
    const total = widths.reduce((a, b) => a + b, 0) + gap * 2 * Math.max(0, parts.length - 1);
    let cx = anchor === "middle" ? x - total / 2 : x;
    const out: APrim[] = [];
    parts.forEach((p, i) => {
      out.push({ t: "text", text: p, x: cx, y, size, family: "serif", weight: 600, spacing, anchor: "start", fill });
      cx += widths[i];
      if (i < parts.length - 1) {
        const r = size * 0.19, d = r * 1.54, px = cx + gap, py = y - size * 0.34;
        out.push({ t: "circle", cx: px - d / 2, cy: py, r, fill }, { t: "circle", cx: px + d / 2, cy: py, r, fill });
        cx += gap * 2;
      }
    });
    return out;
  }
  function frameArt(name: string, label: string, group: string, s: State, f: Frame, o: MarkOptions, extra: APrim[]): Art {
    const cw = COLORWAYS[s.colorway], fg = o.ink || cw.fg, ground = o.ground || cw.bg;
    const prims: APrim[] = [];
    if (!(s.transparent || ground === "none")) { prims.push({ t: "rect", x: f.x, y: f.y, w: f.w, h: f.h, fill: ground }); }
    const r = radius(s);
    circlesFor(marksFor(s.geometry)).forEach((c) => {
      if (s.style === "ring") { prims.push({ t: "circle", cx: c.cx, cy: c.cy, r: Math.max(0.5, r - s.ring / 2), stroke: fg, sw: s.ring }); }
      else { prims.push({ t: "circle", cx: c.cx, cy: c.cy, r, fill: fg }); }
    });
    f.texts.forEach((t) => prims.push({ t: "text", text: t.text, x: t.x, y: t.y, size: t.size, family: t.family, weight: t.weight, spacing: t.spacing, anchor: t.anchor, fill: fg, fit: t.fit }));
    const hasSans = f.texts.some((t) => t.family === "sans");
    return { name, label, group, fonts: f.texts.length || extra.length ? (hasSans ? "mixed" : "serif") : "none", x: f.x, y: f.y, w: f.w, h: f.h, px: Math.round(f.w), prims: prims.concat(extra) };
  }
  function artMark(o: MarkOptions = {}): Art {
    const s = stateOf(o), cw = COLORWAYS[s.colorway];
    const lock = s.lockup === "mark" ? "mark" : s.lockup === "stacked" ? "lockup-stacked" : "lockup-wide";
    const what = s.lockup === "mark" ? "Mark" : s.lockup === "stacked" ? "Stacked lockup" : "Wide lockup";
    return frameArt(`xiding-${lock}-${s.colorway}-${s.style}`, `${what}, ${cw.name.toLowerCase()}`, s.lockup === "mark" ? "Marks" : "Lockups", s, frame(s), o, []);
  }
  function artSubBrand(o: SubBrandOptions = {}, slug = "subbrand"): Art {
    const l = subBrandLayout(o), cw = COLORWAYS[l.s.colorway];
    const extra = l.row ? rowPrims(l.row.parts, l.row.x, l.row.y, l.row.size, l.row.anchor, l.fg) : [];
    const who = slug === "academy" ? "Academy" : slug === "arts" ? "Arts" : slug === "both" ? "Both brands" : (o.brands || []).join(" ");
    const a = frameArt(`xiding-${slug}-${o.layout || "wide"}-${l.s.colorway}`, `${who}, ${o.layout === "stacked" ? "stacked" : "wide"}, ${cw.name.toLowerCase()}`, "Sub-brands", l.s, l.f, o, extra);
    a.fonts = "mixed";
    return a;
  }
  function artCard(o: CardOptions = {}, slug = "card"): Art {
    const c: CardState = {
      front: o.front || "teal", back: o.back || "paper", orientation: o.orientation || "landscape",
      frontLayout: o.frontLayout || "mark", backLayout: o.backLayout || "left",
      brands: o.brands == null ? "西顶学院　西顶艺术" : o.brands,
      mark: stateOf({ style: o.style, geometry: o.geometry, size: o.size, ring: o.ring }),
    };
    const person: Person = { ...PEOPLE[0], ...(o.person || {}) };
    const side = o.side || "front";
    const ps = (side === "front" ? frontPrims(c) : backPrims(c, person)) as APrim[];
    const { w, h } = cardSize(c);
    return { name: `xiding-${slug}`, label: side === "front" ? "Business card, front" : `Business card, back, ${person.nameZh}`, group: "Business cards", fonts: "mixed", x: -BLEED, y: -BLEED, w: w + 2 * BLEED, h: h + 2 * BLEED, px: Math.round((w + 2 * BLEED) * 300 / 25.4), prims: ps };
  }
  const INKS: Record<string, string> = { black: "#000000", white: "#FFFFFF", teal: "#628F8A" };
  /** A name set alone: 西顶 as the wordmark, or a sub-brand name as a brand row. */
  function artWordmark(text: string, kind: "wordmark" | "row", ink: "black" | "white" | "teal", slug: string): Art {
    const size = kind === "wordmark" ? 280 : 120, spacing = kind === "wordmark" ? 0.04 : 0.28, weight = kind === "wordmark" ? 700 : 600;
    const pad = size * 0.5, tw = cjkW(text, size, spacing);
    return {
      name: `xiding-${slug}-${ink}`, label: ink === "white" ? `${text}, white on temple teal` : `${text}, ${ink}`, group: "Wordmarks", fonts: "serif",
      x: 0, y: 0, w: tw + 2 * pad, h: size * 0.9 + 2 * pad, px: Math.round((tw + 2 * pad) * (kind === "wordmark" ? 2 : 3)),
      prims: (ink === "white" ? [{ t: "rect", x: 0, y: 0, w: tw + 2 * pad, h: size * 0.9 + 2 * pad, fill: "#628F8A" } as APrim] : []).concat(
        [{ t: "text", text, x: pad, y: pad + size * 0.84, size, family: "serif", weight, spacing, anchor: "start", fill: INKS[ink] }]),
    };
  }
  type PillarId = "mei" | "zhi" | "li";
  function pillarInks(id: PillarId, dark: boolean): { fill: string; on: string; stroke?: string } {
    if (id === "mei") { return { fill: "#628F8A", on: "#FFFFFF" }; }
    if (id === "zhi") { return dark ? { fill: "#FFFFFF", on: "#141B1A" } : { fill: "#000000", on: "#FFFFFF" }; }
    return dark ? { fill: "#141B1A", on: "#FFFFFF", stroke: "#FFFFFF" } : { fill: "#FFFFFF", on: "#000000", stroke: "#000000" };
  }
  /** 一底三柱 with fixed inks, for files: three pillars with name and word, the 2px base, the value line under it. */
  function artPillars(theme: "light" | "dark" = "light"): Art {
    const dark = theme === "dark", ink = dark ? "#FFFFFF" : "#000000";
    const W = 960, M = 24, G = 24, cw = (W - 2 * M - 2 * G) / 3, top = 56, ph = 200, base = top + ph;
    const prims: APrim[] = [];
    PILLARS.forEach((p, i) => {
      const x = M + i * (cw + G), k = pillarInks(p.id as PillarId, dark);
      prims.push({ t: "text", text: p.line, x, y: 36, size: 14, family: "serif", weight: 600, spacing: 0.28, anchor: "start", fill: ink });
      prims.push({ t: "rect", x, y: top, w: cw, h: ph, fill: k.fill, rx: 4 });
      prims.push({ t: "rect", x, y: base - 6, w: cw, h: 6, fill: k.fill });
      if (k.stroke) { prims.push({ t: "rect", x: x + 0.5, y: top + 0.5, w: cw - 1, h: ph - 0.5, stroke: k.stroke, sw: 1, rx: 4 }); }
      prims.push({ t: "text", text: p.word, x: x + 20, y: top + 20 + 24 * 0.84, size: 24, family: "serif", weight: 600, spacing: 0.12, anchor: "start", fill: k.on });
      prims.push({ t: "text", text: p.zh, x: x + 20, y: base - 20 - 56 * 0.06, size: 56, family: "serif", weight: 700, spacing: 0.04, anchor: "start", fill: k.on });
      prims.push({ t: "text", text: p.motto, x, y: base + 2 + 12 + 22 * 0.84, size: 22, family: "serif", weight: 700, spacing: 0.12, anchor: "start", fill: ink });
    });
    prims.push({ t: "rect", x: M, y: base, w: W - 2 * M, h: 2, fill: ink });
    return { name: `xiding-pillars-${theme}`, label: `一底三柱, for a ${theme} ground`, group: "Pillars", fonts: "serif", x: 0, y: 0, w: W, h: base + 2 + 12 + 22 + 24, px: 1920, prims };
  }
  /** A square plate for one pillar: its ink, its word, its name. */
  function artPillarPlate(id: PillarId): Art {
    const p = PILLARS.filter((q) => q.id === id)[0], k = pillarInks(id, false), S = 512;
    const prims: APrim[] = [{ t: "rect", x: 0, y: 0, w: S, h: S, fill: k.fill }];
    if (k.stroke) { prims.push({ t: "rect", x: 2, y: 2, w: S - 4, h: S - 4, stroke: k.stroke, sw: 4 }); }
    prims.push({ t: "text", text: p.word, x: 48, y: 48 + 64 * 0.84, size: 64, family: "serif", weight: 600, spacing: 0.12, anchor: "start", fill: k.on });
    prims.push({ t: "text", text: p.zh, x: 48, y: S - 48 - 160 * 0.06, size: 160, family: "serif", weight: 700, spacing: 0.04, anchor: "start", fill: k.on });
    return { name: `xiding-pillar-${id}`, label: `${p.zh}，${p.word}`, group: "Pillars", fonts: "serif", x: 0, y: 0, w: S, h: S, px: 1024, prims };
  }

  type Theme = "light" | "dark";
  const themeInks = (theme: Theme) => theme === "dark"
    ? { ink: "#FFFFFF", muted: "#A9B6B3", accent: "#9CC2BC" }
    : { ink: "#000000", muted: "#4E5A58", accent: "#3D6560" };
  const SITE = "xidingmiao.com";
  const STEPS = [
    ["人和内容带来", "艺术家和行业专家。"],
    ["三个板块把专家的能力", "交付给会员和合作伙伴。"],
    ["智能体之间完成", "匹配、预约与分账，", "收益回到出力的人手里。"],
  ];
  /** The introduction in one picture: one team, two brands, three lines of work. */
  function artArchitecture(theme: Theme = "light"): Art {
    const k = themeInks(theme), dark = theme === "dark", W = 960;
    const prims: APrim[] = [];
    const label = (text: string, y: number) => prims.push({ t: "text", text, x: 0, y, size: 14, family: "serif", weight: 600, spacing: 0.28, anchor: "start", fill: k.muted });
    label("一套班子", 14);
    prims.push({ t: "rect", x: 0.5, y: 24.5, w: W - 1, h: 63, stroke: k.ink, sw: 1, rx: 4 });
    prims.push({ t: "text", text: "西顶文化", x: W / 2, y: 65.5, size: 26, family: "serif", weight: 700, spacing: 0.12, anchor: "middle", fill: k.ink });
    label("两个牌子", 124);
    const w2 = (W - 24) / 2;
    ["西顶艺术", "西顶学院"].forEach((name, i) => {
      const x = i * (w2 + 24);
      prims.push({ t: "rect", x: x + 0.5, y: 134.5, w: w2 - 1, h: 79, stroke: k.ink, sw: 1, rx: 4 });
      prims.push({ t: "text", text: name, x: x + 20, y: 183, size: 26, family: "serif", weight: 700, spacing: 0.12, anchor: "start", fill: k.ink });
    });
    label("三个板块", 250);
    const w3 = (W - 48) / 3;
    PILLARS.forEach((p, i) => {
      const x = i * (w3 + 24), c = pillarInks(p.id as PillarId, dark);
      prims.push({ t: "rect", x, y: 260, w: w3, h: 80, fill: c.fill, rx: 4 });
      if (c.stroke) { prims.push({ t: "rect", x: x + 0.5, y: 260.5, w: w3 - 1, h: 79, stroke: c.stroke, sw: 1, rx: 4 }); }
      prims.push({ t: "text", text: p.line, x: x + 20, y: 310, size: 28, family: "serif", weight: 700, spacing: 0.12, anchor: "start", fill: c.on });
      prims.push({ t: "text", text: p.zh, x: x + w3 - 20 - cjkW(p.zh, 20, 0.04), y: 307, size: 20, family: "serif", weight: 700, spacing: 0.04, anchor: "start", fill: c.on });
      prims.push({ t: "text", text: p.motto, x, y: 368, size: 18, family: "serif", weight: 600, spacing: 0.12, anchor: "start", fill: k.ink });
    });
    return { name: `xiding-intro-architecture-${theme}`, label: `一套班子，两个牌子，三个板块, for a ${theme} ground`, group: "Intro", fonts: "serif", x: 0, y: 0, w: W, h: 380, px: 1920, prims };
  }
  /** The steps, numbered. */
  function artSteps(theme: Theme = "light"): Art {
    const k = themeInks(theme), W = 960, n = STEPS.length, w = (W - 24 * (n - 1)) / n;
    const prims: APrim[] = [];
    STEPS.forEach((lines, i) => {
      const x = i * (w + 24);
      prims.push({ t: "text", text: String(i + 1), x, y: 60, size: 72, family: "serif", weight: 700, spacing: 0, anchor: "start", fill: k.accent });
      prims.push({ t: "rect", x, y: 76, w, h: 2, fill: k.ink });
      lines.forEach((line, j) => prims.push({ t: "text", text: line, x, y: 108 + j * 28, size: 18, family: "serif", weight: 600, spacing: 0.02, anchor: "start", fill: k.ink }));
    });
    return { name: `xiding-intro-steps-${theme}`, label: `${"一二三四五六"[n - 1]}步, for a ${theme} ground`, group: "Intro", fonts: "serif", x: 0, y: 0, w: W, h: 180, px: 1920, prims };
  }
  /** The mark on a square field, for avatars and app icons. */
  function artAvatar(colorway: Colorway = "teal"): Art {
    const s = stateOf({ colorway }), cw = COLORWAYS[colorway], side = BOUNDS.bottom - BOUNDS.top + 2 * PAD;
    const prims: APrim[] = [{ t: "rect", x: CENTER.x - side / 2, y: BOUNDS.top - PAD, w: side, h: side, fill: cw.bg }];
    circlesFor(marksFor(s.geometry)).forEach((c) => prims.push({ t: "circle", cx: c.cx, cy: c.cy, r: R, fill: cw.fg }));
    return { name: `xiding-avatar-${colorway}`, label: `Avatar, ${cw.name.toLowerCase()}`, group: "Avatars", fonts: "none", x: CENTER.x - side / 2, y: BOUNDS.top - PAD, w: side, h: side, px: 1024, prims };
  }

  const f2 = (n: number) => (Math.round(n * 1000) / 1000).toString();
  /** An Art as an SVG string with live text (the page must have the two web fonts). */
  function toSVG(a: Art): string {
    const body = a.prims.map((p) => {
      if (p.t === "rect") {
        return `<rect x="${f2(p.x)}" y="${f2(p.y)}" width="${f2(p.w)}" height="${f2(p.h)}"${p.rx ? ` rx="${f2(p.rx)}"` : ""} fill="${p.fill || "none"}"${p.stroke ? ` stroke="${p.stroke}" stroke-width="${f2(p.sw || 1)}"` : ""}/>`;
      }
      if (p.t === "circle") {
        return p.stroke
          ? `<circle cx="${f2(p.cx)}" cy="${f2(p.cy)}" r="${f2(p.r)}" fill="none" stroke="${p.stroke}" stroke-width="${f2(p.sw == null ? 0.1 : p.sw)}"/>`
          : `<circle cx="${f2(p.cx)}" cy="${f2(p.cy)}" r="${f2(p.r)}" fill="${p.fill}"/>`;
      }
      const x = p.anchor === "middle" && !p.fit ? p.x + (p.spacing * p.size) / 2 : p.x;
      const sp = p.fit ? ` textLength="${f2(p.fit)}" lengthAdjust="spacing"` : ` letter-spacing="${p.spacing}em"`;
      return `<text x="${f2(x)}" y="${f2(p.y)}" font-family="${fam(p.family)}" font-size="${f2(p.size)}" font-weight="${p.weight}"${sp} text-anchor="${p.anchor}" fill="${p.fill}"${p.opacity != null && p.opacity < 1 ? ` fill-opacity="${p.opacity}"` : ""}>${esc(p.text)}</text>`;
    }).join("\n");
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f2(a.x)} ${f2(a.y)} ${f2(a.w)} ${f2(a.h)}" role="img" aria-label="${esc(a.label)}">\n<title>${esc(a.label)}</title>\n${body}\n</svg>\n`;
  }
  /** An Art as a PNG, drawn on a canvas with the page's own fonts. Browser only. */
  async function toPNG(a: Art, widthPx?: number): Promise<Blob> {
    const k = (widthPx || a.px) / a.w;
    const cv = document.createElement("canvas");
    cv.width = Math.round(a.w * k); cv.height = Math.round(a.h * k);
    const ctx = cv.getContext("2d") as CanvasRenderingContext2D;
    ctx.setTransform(k, 0, 0, k, -a.x * k, -a.y * k);
    for (const p of a.prims) {
      if (p.t === "rect") {
        ctx.beginPath();
        const rx = p.rx || 0;
        if (rx && (ctx as any).roundRect) { (ctx as any).roundRect(p.x, p.y, p.w, p.h, rx); } else { ctx.rect(p.x, p.y, p.w, p.h); }
        if (p.fill) { ctx.fillStyle = p.fill; ctx.fill(); }
        if (p.stroke) { ctx.strokeStyle = p.stroke; ctx.lineWidth = p.sw || 1; ctx.stroke(); }
        continue;
      }
      if (p.t === "circle") {
        ctx.beginPath(); ctx.arc(p.cx, p.cy, p.r, 0, Math.PI * 2);
        if (p.stroke) { ctx.strokeStyle = p.stroke; ctx.lineWidth = p.sw == null ? 0.1 : p.sw; ctx.stroke(); }
        else { ctx.fillStyle = p.fill || "#000000"; ctx.fill(); }
        continue;
      }
      // Fonts are measured at 100px and scaled, so sub-pixel sizes (millimetre cards) stay exact.
      const font = `${p.weight} 100px ${familyOf(p.family)}`;
      try { await (document as any).fonts.load(font, p.text); } catch (e) { /* fall back to the system font */ }
      const u = p.size / 100, chars = Array.from(p.text);
      ctx.font = font;
      const ws = chars.map((ch) => ctx.measureText(ch).width * u);
      const natural = ws.reduce((s, v) => s + v, 0);
      const gap = p.fit && chars.length > 1 ? (p.fit - natural) / (chars.length - 1) : p.spacing * p.size;
      const total = natural + gap * (chars.length - 1);
      let x = p.anchor === "middle" ? p.x - total / 2 : p.x;
      ctx.save();
      ctx.globalAlpha = p.opacity == null ? 1 : p.opacity;
      ctx.fillStyle = p.fill; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      chars.forEach((ch, i) => {
        ctx.save(); ctx.translate(x, p.y); ctx.scale(u, u); ctx.fillText(ch, 0, 0); ctx.restore();
        x += ws[i] + gap;
      });
      ctx.restore();
    }
    return new Promise<Blob>((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error("PNG encoding failed"))), "image/png"));
  }
  /** The whole kit: every asset this system generates, in display order. */
  function kit(): Art[] {
    const out: Art[] = [];
    (["teal", "ink", "night", "tealInk"] as Colorway[]).forEach((c) => {
      out.push(artMark({ lockup: "stacked", colorway: c }));
      out.push(artMark({ lockup: "horizontal", colorway: c }));
    });
    (["teal", "ink", "night"] as Colorway[]).forEach((c) => out.push(artSubBrand({ layout: "wide", latin: "XIDING ACADEMY", brands: ["西顶学院"], colorway: c }, "academy")));
    out.push(artSubBrand({ layout: "stacked", latin: "XIDING ACADEMY", brands: ["西顶学院"], colorway: "teal" }, "academy"));
    out.push(artSubBrand({ layout: "wide", latin: "XIDING ARTS", brands: ["西顶艺术"], colorway: "ink" }, "arts"));
    out.push(artSubBrand({ layout: "wide", latin: "XIDING LIFESTYLE", brands: ["西顶时光"], colorway: "ink" }, "shiguang"));
    out.push(artSubBrand({ layout: "wide", brands: ["西顶学院", "西顶艺术"], colorway: "ink" }, "both"));
    (["black", "white", "teal"] as ("black" | "white" | "teal")[]).forEach((k) => out.push(artWordmark("西顶", "wordmark", k, "wordmark-zh")));
    const slugs = ["wenhua", "yishu", "xueyuan", "shiguang", "zhixing", "meicheng", "liyu"];
    BRANDS.forEach((b, i) => out.push(artWordmark(b.zh, "row", "black", "name-" + slugs[i])));
    out.push(artPillars("light"), artPillars("dark"));
    (["mei", "zhi", "li"] as PillarId[]).forEach((id) => out.push(artPillarPlate(id)));
    out.push(artArchitecture("light"), artArchitecture("dark"), artSteps("light"), artSteps("dark"));
    (["teal", "night", "ink"] as Colorway[]).forEach((c) => out.push(artAvatar(c)));
    out.push(artCard({ side: "front" }, "card-front"));
    PEOPLE.forEach((p, i) => out.push(artCard({ side: "back", person: p }, "card-back-" + (i + 1))));
    // What each asset needs to be drawn exactly: no type, the serif alone, or both faces.
    out.forEach((a) => {
      const texts = a.prims.filter((p) => p.t === "text") as AText[];
      a.fonts = !texts.length ? "none" : texts.some((p) => p.family === "sans") ? "mixed" : "serif";
    });
    return out;
  }


  // ---------- 散点 scatter: the mark's own 40 dots, let loose ----------
  interface Rect { x: number; y: number; w: number; h: number }
  interface ScatterOptions {
    width: number; height: number;
    /** Where the mark would stand, and how tall, in px of the drawing. */
    x: number; y: number; size: number;
    /** 0 keeps the mark; 1 lets the far dots travel about one mark-height. */
    spread?: number;
    /** Share of the mark, from the trailing side, that stays exactly in place. Default 0.5. */
    hold?: number;
    /** Direction of the drift in degrees: 0 to the right, 90 down. */
    angle?: number;
    /** Extra dots further along the drift, smaller than the mark's own. */
    strays?: number;
    seed?: number;
    /** A flat field: dots inside it take fieldInk, outside it take ink. */
    field?: Rect; fieldFill?: string;
    ink?: string; fieldInk?: string;
    /** Each dot drifts slowly back and forth (CSS class xd-breathe). */
    breathe?: boolean;
    /** Boxes the drifting dots must not land in: the words of the composition. */
    avoid?: Rect[];
    title?: string;
  }
  function rng(seed: number): () => number {
    let a = seed >>> 0;
    return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  /** The mark's dots, carried off by a wind: the leading side travels furthest, a few strays go on ahead.
      Returns SVG. Dots that land inside `field` are drawn in fieldInk, the rest in ink, so a dot that
      leaves the field changes colour at its edge. */
  function scatter(o: ScatterOptions): string {
    const rand = rng(o.seed ?? 7);
    const hold = Math.min(0.9, Math.max(0, o.hold ?? 0.5));
    const spread = o.spread ?? 0.5, ang = ((o.angle ?? -20) * Math.PI) / 180;
    const ux = Math.cos(ang), uy = Math.sin(ang);
    const k = o.size / (BOUNDS.bottom - BOUNDS.top);
    const r = R * k;
    const cs = circlesFor(marksFor("extracted"));
    const proj = cs.map((c) => (c.cx - CENTER.x) * ux + (c.cy - CENTER.y) * uy);
    const pmin = Math.min(...proj), pmax = Math.max(...proj);
    type Dot = { x: number; y: number; r: number; fx: number; fy: number; t: number; free: boolean };
    const dots: Dot[] = cs.map((c, i) => {
      // The trailing part of the mark holds; past the hold line the dots are carried off, further the further ahead they sit.
      const lead = spread > 0 ? Math.max(0, ((proj[i] - pmin) / (pmax - pmin || 1) - hold) / (1 - hold)) : 0;
      const d = spread * o.size * Math.pow(lead, 1.8) * (0.6 + 0.8 * rand());
      const side = (rand() - 0.5) * spread * o.size * 0.22 * lead;
      return {
        x: o.x + (c.cx - BOUNDS.left) * k + ux * d - uy * side,
        y: o.y + (c.cy - BOUNDS.top) * k + uy * d + ux * side,
        r, fx: lead > 0 ? (rand() - 0.5) * r * 2.4 * Math.min(1, lead * 3) : 0, fy: lead > 0 ? (rand() - 0.5) * r * 2.4 * Math.min(1, lead * 3) : 0, t: 5 + rand() * 5, free: lead > 0,
      };
    });
    const cx0 = o.x + (CENTER.x - BOUNDS.left) * k, cy0 = o.y + (CENTER.y - BOUNDS.top) * k;
    for (let i = 0; i < (o.strays ?? 0); i++) {
      const d = o.size * (0.55 + spread * (0.4 + rand() * 1.1));
      const side = (rand() - 0.5) * o.size * 0.9;
      dots.push({ x: cx0 + ux * d - uy * side, y: cy0 + uy * d + ux * side, r: r * (0.35 + rand() * 0.6),
        fx: (rand() - 0.5) * r * 3, fy: (rand() - 0.5) * r * 3, t: 6 + rand() * 6, free: true });
    }
    // A dot that has drifted never settles on a word: those whose breathing reach touches an avoided box are left out.
    const clear = (d: Dot) => !(o.avoid ?? []).some((b) => {
      const m = d.r + Math.max(Math.abs(d.fx), Math.abs(d.fy)) + 4;
      return d.x > b.x - m && d.x < b.x + b.w + m && d.y > b.y - m && d.y < b.y + b.h + m;
    });
    const kept = dots.filter((d) => !d.free || clear(d));
    dots.length = 0; dots.push(...kept);
    const ink = o.ink ?? "currentColor", fieldInk = o.fieldInk ?? "#FFFFFF";
    const id = "xds" + (o.seed ?? 7) + "-" + Math.round(o.width) + "-" + Math.round(o.height);
    const circles = (fill: string) => dots.map((d, i) =>
      `<circle cx="${fmt(d.x)}" cy="${fmt(d.y)}" r="${fmt(d.r)}" fill="${fill}" style="--fx:${fmt(d.fx)}px;--fy:${fmt(d.fy)}px;--t:${fmt(d.t)}s;--d:${i * 18}ms"/>`).join("");
    const f = o.field;
    let body: string;
    if (f) {
      body = `<defs><clipPath id="${id}-in"><rect x="${fmt(f.x)}" y="${fmt(f.y)}" width="${fmt(f.w)}" height="${fmt(f.h)}"/></clipPath>` +
        `<clipPath id="${id}-out"><path clip-rule="evenodd" d="M-9999 -9999H9999V9999H-9999Z M${fmt(f.x)} ${fmt(f.y)}h${fmt(f.w)}v${fmt(f.h)}h${fmt(-f.w)}Z"/></clipPath></defs>` +
        `<rect x="${fmt(f.x)}" y="${fmt(f.y)}" width="${fmt(f.w)}" height="${fmt(f.h)}" fill="${o.fieldFill ?? COLORWAYS.teal.bg}"/>` +
        `<g clip-path="url(#${id}-out)">${circles(ink)}</g><g clip-path="url(#${id}-in)">${circles(fieldInk)}</g>`;
    } else body = `<g>${circles(ink)}</g>`;
    const label = o.title ? ` role="img" aria-label="${esc(o.title)}"` : ` aria-hidden="true"`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fmt(o.width)} ${fmt(o.height)}" width="${fmt(o.width)}" height="${fmt(o.height)}" class="xd-scatter${o.breathe ? " xd-breathe" : ""}"${label}>${body}</svg>`;
  }

  /** Replaces the people on the cards (Xiding.PEOPLE keeps its identity, so kit() and card() follow). */
  function setPeople(list: Partial<Person>[]): void {
    const base = PEOPLE[0] ?? { nameZh: "", nameEn: "", titleZh: "", titleEn: "", phone: "", email: "", web: "", address: ADDRESS };
    PEOPLE.splice(0, PEOPLE.length, ...list.map((p) => ({ ...base, ...p })));
  }

  /** Lets every mark under `scope` assemble once, dot by dot, top row first. Sets --d (its delay) on each
      circle for bundle.css; with reduced motion the CSS shows the dots in place. */
  function assemble(scope: ParentNode, stagger = 22): void {
    scope.querySelectorAll("svg").forEach((svg) => {
      const cs = Array.from(svg.querySelectorAll("circle"));
      cs.map((c, i) => ({ c, i, y: Number(c.getAttribute("cy")), x: Number(c.getAttribute("cx")) }))
        .sort((a, b) => a.y - b.y || a.x - b.x)
        .forEach((o, n) => o.c.style.setProperty("--d", `${n * stagger}ms`));
      svg.classList.add("xd-assemble");
    });
  }

  root.Xiding = {
    version: "1.8.0",
    PILLARS, LINE, ROOT, BRANDS, SCENES, STEPS, SITE,
    kit, toSVG, toPNG,
    art: { mark: artMark, subBrand: artSubBrand, card: artCard, wordmark: artWordmark, pillars: artPillars, pillarPlate: artPillarPlate, architecture: artArchitecture, steps: artSteps, avatar: artAvatar },
    R, CENTER, BOUNDS, PAD, COLORWAYS, STYLE_NAMES, PRESETS, PEOPLE, ADDRESS,
    points: (g?: Geometry) => marksFor(g),
    circles: (g?: Geometry) => circlesFor(marksFor(g)).map((c) => ({ id: c.mark.id, cx: c.cx, cy: c.cy })),
    mark, subBrand, brandRow, card, assemble, scatter, setPeople,
  };
})(typeof window !== "undefined" ? window : globalThis);
