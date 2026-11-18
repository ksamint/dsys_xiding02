// The VI's own outlines for the business card, from brand/xiding-guangren-vi/brand-assets/logo-lockup-teal.svg:
// the dots of the square symbol and the brush lettering 西頂廣仁宮, as compact paths with their geometry.
// The lockup draws 43 paths: the square with its dots knocked out, 20 for the English line, 22 for 西頂廣仁宮.

export interface CardGeometry {
  sq: number;
  dots: [number, number, number, number];
  uw: number; uh: number; base: number;
  zhW: number; zhH: number; zhX: number;
  dotR: number;
  chars: [number, number][];
}
export interface CardOutlines { geometry: CardGeometry; dotsPath: string; zhPath: string }

const NUM = /-?\d*\.?\d+(?:e-?\d+)?/g;
const TOKEN = /[A-Za-z]|-?\d*\.?\d+(?:e-?\d+)?/g;

function must(cond: unknown, what: string): asserts cond {
  if (!cond) throw new Error(`card-geometry: ${what}`);
}
const r3 = (n: number): number => Math.round(n * 1000) / 1000;
const r2 = (n: number): number => Math.round(n * 100) / 100;

/** Every coordinate pair of a path with absolute commands only (the lockup's are). */
function points(d: string): { xs: number[]; ys: number[] } {
  const n = (d.match(NUM) ?? []).map(Number), xs: number[] = [], ys: number[] = [];
  n.forEach((v, i) => (i % 2 ? ys : xs).push(v));
  return { xs, ys };
}
const min = (a: number[]): number => a.reduce((m, v) => (v < m ? v : m), Infinity);
const max = (a: number[]): number => a.reduce((m, v) => (v > m ? v : m), -Infinity);

/** Re-express a path relative to (ox, oy), two decimals, without spaces next to commands. */
function shift(d: string, ox: number, oy: number): string {
  const out: string[] = [];
  let idx = 0;
  for (const t of d.match(TOKEN) ?? []) {
    if (/[A-Za-z]/.test(t)) { out.push(t); idx = 0; continue; }
    const v = Number(t) - (idx % 2 === 0 ? ox : oy);
    idx++;
    out.push(String(r2(v)));
  }
  return out.join(" ").replace(/ (?=[A-Za-z])/g, "").replace(/(?<=[A-Za-z]) /g, "").replace(/ -/g, "-");
}

export function cardOutlines(lockupSvg: string): CardOutlines {
  const paths = [...lockupSvg.matchAll(/<path[^>]*?d="([^"]*)"[^>]*\/>/g)].map((m) => m[1] ?? "");
  must(paths.length === 43, `expected 43 paths in the lockup, found ${paths.length}`);
  const square = paths[0] ?? "", english = paths.slice(1, 21), chinese = paths.slice(21, 43);

  // the square, then its dots: every subpath after the outline that is not a degenerate closing move
  const sub = square.split(/\s(?=M\s)/);
  const outer = points(sub[0] ?? "");
  const sx0 = min(outer.xs), sy0 = min(outer.ys), side = max(outer.xs) - sx0;
  const dotSubs = sub.slice(1).filter((t) => new Set(t.match(NUM) ?? []).size > 4);
  must(dotSubs.length === 32, `expected 32 dot shapes, found ${dotSubs.length}`);
  const dp = points(dotSubs.join(" "));
  const dotsPath = dotSubs.map((t) => shift(t, sx0, sy0)).join("");

  // the word unit: 西頂廣仁宮 over the English line, measured as the VI places them
  const zp = points(chinese.join(" ")), ep = points(english.join(" "));
  const ux0 = min([...zp.xs, ...ep.xs]), uy0 = min(zp.ys), ux1 = max([...zp.xs, ...ep.xs]), uy1 = max(ep.ys);
  const baseline = max(points(english[0] ?? "").ys); // "X" sits on the baseline
  const zhPath = chinese.map((p) => shift(p, ux0, uy0)).join("");

  // each character's size, for stacking them vertically
  const groups: string[][] = [[], [], [], [], []];
  for (const p of chinese) {
    const { xs } = points(p), c = (min(xs) + max(xs)) / 2;
    groups[c < 202 ? 0 : c < 275 ? 1 : c < 336 ? 2 : c < 405 ? 3 : 4]?.push(p);
  }
  const chars = groups.map((g): [number, number] => { const q = points(g.join(" ")); return [r2(max(q.xs) - min(q.xs)), r2(max(q.ys) - min(q.ys))]; });

  return {
    geometry: {
      sq: r3(side),
      dots: [r3(min(dp.xs) - sx0), r3(min(dp.ys) - sy0), r3(max(dp.xs) - min(dp.xs)), r3(max(dp.ys) - min(dp.ys))],
      uw: r3(ux1 - ux0), uh: r3(uy1 - uy0), base: r3(baseline - uy0),
      zhW: r3(max(zp.xs) - min(zp.xs)), zhH: r3(max(zp.ys) - min(zp.ys)), zhX: r3(min(zp.xs) - ux0),
      dotR: 1.979,
      chars,
    },
    dotsPath, zhPath,
  };
}
