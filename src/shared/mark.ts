/* The Xiding mark: 32 marks in 8 rows, 40 circles. Geometry is the design system's measured point data
   (project/components/src/xiding.ts in the 西顶 XIDING design system), in source pixels. Draw from it; leave the mark as it is. */

type Row = { y: number; xs: readonly (readonly [number, number])[] };

const R = 26;
const BOUNDS = { left: 178, right: 1022, top: 36, bottom: 1392 } as const;
const PAD = 140;

const outer = (third: number): Row["xs"] => [[339.5, 0], [503.5, 0], [third, 0], [861, 0]];
const mid: Row["xs"] = [[204.5, 0], [492.5, 20], [705, 20.5], [996, 0]];
const ROWS: readonly Row[] = [
  { y: 61.5, xs: outer(695) },
  { y: 317.5, xs: outer(695) },
  { y: 427.5, xs: mid },
  { y: 594, xs: mid },
  { y: 772, xs: mid },
  { y: 940, xs: mid },
  { y: 1115.5, xs: outer(694.5) },
  { y: 1365.5, xs: outer(695) },
];

export interface Circle { cx: number; cy: number }

export function circles(): Circle[] {
  const out: Circle[] = [];
  for (const row of ROWS) {
    for (const [x, half] of row.xs) {
      if (half) out.push({ cx: x - half, cy: row.y }, { cx: x + half, cy: row.y });
      else out.push({ cx: x, cy: row.y });
    }
  }
  return out;
}

export interface MarkOptions {
  /** dot is the logo. point and ring are for large, quiet uses. */
  style?: "dot" | "ring" | "point";
  title?: string;
  /** Leave out the clear space, for places that supply their own. */
  tight?: boolean;
}

const n = (v: number): string => (Math.round(v * 100) / 100).toString();

/** The mark as inline SVG in the surrounding text colour, with its clear space. */
export function markSvg(o: MarkOptions = {}): string {
  const style = o.style ?? "dot";
  const pad = o.tight ? R + 4 : PAD;
  const x = BOUNDS.left - pad;
  const y = BOUNDS.top - pad;
  const w = BOUNDS.right - BOUNDS.left + 2 * pad;
  const h = BOUNDS.bottom - BOUNDS.top + 2 * pad;
  const body = circles()
    .map((c) =>
      style === "ring"
        ? `<circle cx="${n(c.cx)}" cy="${n(c.cy)}" r="23" fill="none" stroke="currentColor" stroke-width="6"/>`
        : `<circle cx="${n(c.cx)}" cy="${n(c.cy)}" r="${style === "point" ? 4 : R}" fill="currentColor"/>`,
    )
    .join("");
  const label = o.title ? ` role="img" aria-label="${o.title}"` : ` aria-hidden="true"`;
  return `<svg class="xd-mark" xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}"${label}>${body}</svg>`;
}

/** The pair dot: the mark's own two overlapping dots, used between two names or two facts on one line. */
export const PAIR = `<svg class="xd-pair" viewBox="0 0 67.26 38" aria-hidden="true"><circle cx="19" cy="19" r="19"/><circle cx="48.26" cy="19" r="19"/></svg>`;

export function brandRow(parts: readonly string[]): string {
  return `<span class="xd-brandrow">${parts.map((p) => `<span>${p}</span>`).join(PAIR)}</span>`;
}

/* The master lockup, ported from the 西顶 XIDING design system's wide layout (the card's "With 西顶" front):
   the mark on the left; 西顶 whose ink spans dot rows B to E; XIDING resting on row G; and, when given, the
   sub-brands on row H, joined by the pair dot. Every line of type sits on a row of dots. Source pixels throughout. */
const SERIF = "'Noto Serif SC', 'Songti SC', SimSun, serif";
const SANS = "'Instrument Sans', 'Helvetica Neue', Arial, sans-serif";
const cjkW = (text: string, size: number, spacing: number): number => {
  const k = Array.from(text).length;
  return k * size + Math.max(0, k - 1) * spacing * size;
};

export interface LockupOptions {
  /** Add XIDING on row G. Default: the mark and 西顶 only. */
  latin?: boolean;
  /** Sub-brands on the brand row, in Chinese. */
  brands?: readonly string[];
  title?: string;
  /** Let the dots assemble one by one when the lockup first appears. */
  assemble?: boolean;
}

export function lockupSvg(o: LockupOptions = {}): string {
  const topInk = 317.5 - R;
  const botInk = 772 + R;
  const size = (botInk - topInk) / (0.84 + 0.06);
  const tx = BOUNDS.right + 6.5 * (1356 / 30);
  const zhW = cjkW("西顶", size, 0.04);
  const x = BOUNDS.left - PAD;
  const y = BOUNDS.top - PAD;
  const w = tx + zhW + PAD - x;
  const h = BOUNDS.bottom - BOUNDS.top + 2 * PAD;
  const dots = circles()
    .map((c, i) => `<circle cx="${n(c.cx)}" cy="${n(c.cy)}" r="${R}"${o.assemble ? ` style="--i:${i}"` : ""}/>`)
    .join("");
  let row = "";
  const brands = o.brands ?? [];
  if (brands.length) {
    const natural = brands.reduce((a, b) => a + cjkW(b, 95, 0.28), 0) + 95 * 3 * Math.max(0, brands.length - 1);
    const rs = 95 * Math.min(1, (zhW - 4.5) / Math.max(1, natural));
    const gap = rs * 1.5;
    const ry = 1365.5 + R;
    let cx = tx + 4.5;
    brands.forEach((b, i) => {
      row += `<text x="${n(cx)}" y="${n(ry)}" font-family="${SERIF}" font-size="${n(rs)}" font-weight="600" letter-spacing="0.28em">${b}</text>`;
      cx += cjkW(b, rs, 0.28);
      if (i < brands.length - 1) {
        const pr = rs * 0.19;
        const d = pr * 1.54;
        const pc = cx + gap;
        row += `<circle cx="${n(pc - d / 2)}" cy="${n(ry - rs * 0.34)}" r="${n(pr)}"/><circle cx="${n(pc + d / 2)}" cy="${n(ry - rs * 0.34)}" r="${n(pr)}"/>`;
        cx += gap * 2;
      }
    });
  }
  const label = o.title ? ` role="img" aria-label="${o.title}"` : ` aria-hidden="true"`;
  const words = `<text x="${n(tx)}" y="${n(botInk - 0.06 * size)}" font-family="${SERIF}" font-size="${n(size)}" font-weight="700" letter-spacing="0.04em">西顶</text>${o.latin ? `<text x="${n(tx + 9)}" y="${n(1115.5 + R)}" font-family="${SANS}" font-size="104" font-weight="500" letter-spacing="0.46em">XIDING</text>` : ""}${row}`;
  return `<svg class="xd-lockup${o.assemble ? " xd-lockup--assemble" : ""}" xmlns="http://www.w3.org/2000/svg" viewBox="${n(x)} ${n(y)} ${n(w)} ${n(h)}" fill="currentColor"${label}><g class="xd-lockup__dots">${dots}</g><g class="xd-lockup__words">${words}</g></svg>`;
}
