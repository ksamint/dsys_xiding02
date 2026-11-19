/* The mark's measurements, worked out from the design system's own geometry (window.Xiding: the 32 marks, the 40
   circles, the radius, the bounds and the clear space) and the mark-* tokens. Nothing here restates a number: every
   value below is read from those two sources or computed from them, so the simulator cannot drift from the system. */

export type Style = "dot" | "ring" | "point";
export type Geometry = "extracted" | "trued";
export type Unit = "mm" | "px" | "pt";

export interface Bounds { left: number; right: number; top: number; bottom: number }
export interface MarkPoint { id: string; row: number; col: number; x: number; y: number; half: number }
export interface Circle { id: string; cx: number; cy: number }

/** What the simulator reads: the bundle's geometry for one variant, and the mark-* tokens. */
export interface MarkData {
  /** Dot radius in the Dot style, the outer radius in the Circle style (Xiding.R). */
  R: number;
  /** Clear space on every side (Xiding.PAD). */
  PAD: number;
  /** The ink box the frame is built on (Xiding.BOUNDS). */
  BOUNDS: Bounds;
  points: MarkPoint[];
  circles: Circle[];
  /** tokens.json, family "mark": mark-width, mark-height, mark-dot, mark-point, mark-ring, mark-pair, mark-clear. */
  tokens: Record<string, number>;
}

export interface Look { style: Style; size: number; ring: number }

/** The radius a circle is drawn at, as the bundle draws it (Point is mark-point × size, the others R × size). */
export function radius(d: MarkData, look: Look): number {
  return (look.style === "point" ? tok(d, "mark-point") : d.R) * look.size;
}

export function tok(d: MarkData, name: string): number {
  const v = d.tokens[name];
  if (v === undefined || !Number.isFinite(v)) throw new Error(`tokens.json has no number for ${name}`);
  return v;
}

const ROWS = "ABCDEFGH";

export interface Row { label: string; y: number; marks: number; circles: number; pitch: number | null }

/** The eight dot rows, top to bottom, with the distance to the next row's centre line. */
export function rows(d: MarkData): Row[] {
  const ys = [...new Set(d.points.map((p) => p.y))].sort((a, b) => a - b);
  return ys.map((y, i) => {
    const ps = d.points.filter((p) => p.y === y);
    const next = ys[i + 1];
    return {
      label: ROWS[ps[0]?.row ?? i] ?? String(i + 1),
      y,
      marks: ps.length,
      circles: ps.reduce((n, p) => n + (p.half ? 2 : 1), 0),
      pitch: next === undefined ? null : next - y,
    };
  });
}

export interface ColumnSet { rows: string; xs: number[]; halves: number[]; pitches: number[] }

/** The column positions, grouped by the rows that share them (the outer rows and the middle rows differ). */
export function columns(d: MarkData): ColumnSet[] {
  const byKey = new Map<string, { rows: string[]; xs: number[]; halves: number[] }>();
  for (const r of rows(d)) {
    const ps = d.points.filter((p) => p.y === r.y).sort((a, b) => a.x - b.x);
    const xs = ps.map((p) => p.x), halves = ps.map((p) => p.half);
    const key = xs.join(",") + "|" + halves.join(",");
    const got = byKey.get(key);
    if (got) got.rows.push(r.label);
    else byKey.set(key, { rows: [r.label], xs, halves });
  }
  return [...byKey.values()].map((g) => ({ rows: g.rows.join(""), xs: g.xs, halves: g.halves, pitches: g.xs.slice(1).map((x, i) => x - (g.xs[i] ?? x)) }));
}

/** Where ink actually lands for a look: the circles' extent, each grown by the drawn radius. */
export function inkExtent(d: MarkData, look: Look): Bounds {
  const r = radius(d, look);
  const xs = d.circles.map((c) => c.cx), ys = d.circles.map((c) => c.cy);
  return { left: Math.min(...xs) - r, right: Math.max(...xs) + r, top: Math.min(...ys) - r, bottom: Math.max(...ys) + r };
}

export function gcd(a: number, b: number): number {
  a = Math.abs(Math.round(a)); b = Math.abs(Math.round(b));
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

export interface Ratio { w: number; h: number; reduced: [number, number]; hOverW: number; wOverH: number }

export function ratio(b: Bounds): Ratio {
  const w = b.right - b.left, h = b.bottom - b.top, g = gcd(w, h);
  return { w, h, reduced: [Math.round(w / g), Math.round(h / g)], hOverW: h / w, wOverH: w / h };
}

export interface Pair { id: string; x: number; y: number; half: number; distance: number; overlap: number; gap: number }

/** The paired marks: two circles whose centres sit `2 × half` apart. Overlap is how far the two discs run into each
    other at the drawn radius (negative: they do not touch); gap is the clear distance between them. */
export function pairs(d: MarkData, look: Look): Pair[] {
  const r = radius(d, look);
  return d.points.filter((p) => p.half > 0).map((p) => {
    const distance = 2 * p.half;
    return { id: p.id, x: p.x, y: p.y, half: p.half, distance, overlap: 2 * r - distance, gap: distance - 2 * r };
  });
}

/** The smallest clear distance between two neighbouring circles that are not a pair, at the drawn radius. */
export function nearestGap(d: MarkData, look: Look): { a: string; b: string; centres: number; gap: number } {
  const r = radius(d, look);
  let best = { a: "", b: "", centres: Infinity, gap: Infinity };
  for (let i = 0; i < d.circles.length; i++) {
    for (let j = i + 1; j < d.circles.length; j++) {
      const p = d.circles[i]!, q = d.circles[j]!;
      if (p.id === q.id) continue;
      const c = Math.hypot(p.cx - q.cx, p.cy - q.cy);
      if (c < best.centres) best = { a: p.id, b: q.id, centres: c, gap: c - 2 * r };
    }
  }
  return best;
}

/** How a source unit (u) becomes a physical or screen length, from the mark's height on the page. */
export interface Scale { height: number; unit: Unit; dpi: number }

export function perUnit(d: MarkData, sc: Scale): { mm: number; px: number; pt: number } {
  const h = tok(d, "mark-height");
  const toMm = sc.unit === "mm" ? sc.height : sc.unit === "pt" ? sc.height * 25.4 / 72 : sc.height / sc.dpi * 25.4;
  const mm = toMm / h;
  return { mm, px: mm / 25.4 * sc.dpi, pt: mm / 25.4 * 72 };
}

export interface Measure { key: string; zh: string; en: string; u: number; note: string; source: string }

/** Every measure the simulator shows, in source units; the page converts them with perUnit. */
export function measures(d: MarkData, look: Look): Measure[] {
  const b = d.BOUNDS, w = b.right - b.left, h = b.bottom - b.top, R = d.R, pad = d.PAD;
  const r = radius(d, look);
  const ps = pairs(d, look), first = ps[0], near = nearestGap(d, look);
  const out: Measure[] = [
    { key: "width", zh: "标识宽", en: "Mark width", u: w, note: `x ${b.left} → ${b.right}`, source: "Xiding.BOUNDS · mark-width" },
    { key: "height", zh: "标识高", en: "Mark height", u: h, note: `y ${b.top} → ${b.bottom}`, source: "Xiding.BOUNDS · mark-height" },
    { key: "clear", zh: "留白（每边）", en: "Clear space, each side", u: pad, note: `${fix(pad / R, 2)} × 点半径，${pct(pad / h)} 标识高`, source: "Xiding.PAD · mark-clear" },
    { key: "artW", zh: "画板宽（含留白）", en: "Artboard width", u: w + 2 * pad, note: "标识宽 + 2 × 留白", source: "computed" },
    { key: "artH", zh: "画板高（含留白）", en: "Artboard height", u: h + 2 * pad, note: "标识高 + 2 × 留白", source: "computed" },
    { key: "dotD", zh: "实点直径", en: "Dot diameter", u: 2 * R, note: `半径 ${R}，${pct(2 * R / h)} 标识高`, source: "Xiding.R · mark-dot" },
    { key: "pointD", zh: "细点直径", en: "Point diameter", u: 2 * tok(d, "mark-point"), note: `半径 ${tok(d, "mark-point")}`, source: "mark-point" },
    { key: "ring", zh: "圆圈线宽", en: "Circle line weight", u: look.ring, note: look.ring === tok(d, "mark-ring") ? "规范值 1–16" : `规范 ${tok(d, "mark-ring")}，当前 ${look.ring}`, source: "mark-ring" },
    { key: "drawn", zh: "当前点径", en: "Drawn diameter", u: 2 * r, note: look.size === 1 ? "规范大小" : `规范的 ${fix(look.size, 2)} 倍`, source: "computed" },
  ];
  if (first) {
    out.push({ key: "pair", zh: "双点圆心距", en: "Pair centre distance", u: first.distance, note: `半距 ${tok(d, "mark-pair")}（${ps.map((p) => p.id).join(" ")}）`, source: "Xiding.points().half · mark-pair" });
    out.push({ key: "overlap", zh: "双点重叠", en: "Pair overlap", u: first.overlap, note: first.overlap > 0 ? "两点相叠" : "两点分开", source: "computed" });
  }
  out.push({ key: "gap", zh: "最小点距", en: "Smallest gap", u: near.gap, note: `${near.a} 与 ${near.b}，圆心距 ${fix(near.centres, 1)}`, source: "computed" });
  return out;
}

/** same: the bundle states exactly the token's number. near: within half a unit (a measured point, kept as measured). */
export interface Agreement { token: string; value: number; bundle: number[]; what: string; level: "same" | "near" | "differs" }

/** The mark-* tokens against the bundle's own constants: the same number stated twice must agree. */
export function agreement(d: MarkData): Agreement[] {
  const b = d.BOUNDS, halves = [...new Set(d.points.filter((p) => p.half > 0).map((p) => p.half))].sort((x, y) => x - y);
  const row = (token: string, bundle: number[], what: string): Agreement => {
    const v = tok(d, token), off = Math.max(...bundle.map((x) => Math.abs(x - v)));
    return { token, value: v, bundle, what, level: off === 0 ? "same" : off <= 0.5 ? "near" : "differs" };
  };
  return [
    row("mark-width", [b.right - b.left], "Xiding.BOUNDS.right − left"),
    row("mark-height", [b.bottom - b.top], "Xiding.BOUNDS.bottom − top"),
    row("mark-dot", [d.R], "Xiding.R"),
    row("mark-clear", [d.PAD], "Xiding.PAD"),
    row("mark-pair", halves, "Xiding.points() half"),
  ];
}

export function fix(n: number, digits: number): string {
  return String(Math.round(n * 10 ** digits) / 10 ** digits);
}
function pct(x: number): string {
  return `${fix(x * 100, 2)}%`;
}
