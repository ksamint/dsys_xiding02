// Snapping: the Rust engine (engine/src/lib.rs, compiled to WebAssembly) with a TypeScript twin.
// Both follow one rule, so the twin can stand in wherever WebAssembly is refused and the benchmark
// can check that every answer matches: the nearest of an element's start, centre and end to any
// target line, within the threshold; ties go to the earlier candidate, then the earlier target.

interface SnapAnswer { dx: number; dy: number; gx: number | null; gy: number | null }
type SnapFn = (box: [number, number, number, number], xs: number[], ys: number[], threshold: number) => SnapAnswer;

function snapAxisTS(c0: number, c1: number, c2: number, targets: number[], th: number): [number, number] | null {
  let best: [number, number] | null = null;
  for (const c of [c0, c1, c2]) {
    for (const t of targets) {
      const d = t - c;
      if (Math.abs(d) > th) continue;
      if (!best || Math.abs(d) < Math.abs(best[0])) best = [d, t];
    }
  }
  return best;
}
const snapTS: SnapFn = (b, xs, ys, th) => {
  const sx = snapAxisTS(b[0], (b[0] + b[2]) / 2, b[2], xs, th), sy = snapAxisTS(b[1], (b[1] + b[3]) / 2, b[3], ys, th);
  return { dx: sx ? sx[0] : 0, dy: sy ? sy[0] : 0, gx: sx ? sx[1] : null, gy: sy ? sy[1] : null };
};

interface SnapExports {
  memory: WebAssembly.Memory;
  input_ptr(): number;
  output_ptr(): number;
  input_capacity(): number;
  snap(nx: number, ny: number, threshold: number): number;
}
let wasmSnap: SnapFn | null = null;
let engineName = "TypeScript";

/** Load the Rust engine. Resolves false where the page's sandbox refuses WebAssembly; the twin then runs. */
async function loadSnapEngine(): Promise<boolean> {
  if (!SNAP_WASM_B64 || typeof WebAssembly === "undefined") return false;
  try {
    const bin = atob(SNAP_WASM_B64), bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const { instance } = await WebAssembly.instantiate(bytes, {});
    const ex = instance.exports as unknown as SnapExports;
    const cap = ex.input_capacity();
    let input = new Float64Array(ex.memory.buffer, ex.input_ptr(), cap);
    let output = new Float64Array(ex.memory.buffer, ex.output_ptr(), 6);
    wasmSnap = (b, xs, ys, th) => {
      if (input.buffer !== ex.memory.buffer) {
        input = new Float64Array(ex.memory.buffer, ex.input_ptr(), cap);
        output = new Float64Array(ex.memory.buffer, ex.output_ptr(), 6);
      }
      if (4 + xs.length + ys.length > cap) return snapTS(b, xs, ys, th);
      input[0] = b[0]; input[1] = b[1]; input[2] = b[2]; input[3] = b[3];
      input.set(xs, 4);
      input.set(ys, 4 + xs.length);
      const mask = ex.snap(xs.length, ys.length, th);
      return {
        dx: mask & 1 ? output[0] ?? 0 : 0, dy: mask & 2 ? output[1] ?? 0 : 0,
        gx: mask & 1 ? output[2] ?? null : null, gy: mask & 2 ? output[3] ?? null : null,
      };
    };
    engineName = "Rust · WebAssembly";
    return true;
  } catch {
    wasmSnap = null;
    return false;
  }
}
const snapNow: SnapFn = (b, xs, ys, th) => (wasmSnap ?? snapTS)(b, xs, ys, th);

// ---- benchmark: the same 20 000 drags through both engines ----
interface BenchResult { cases: number; targets: number; wasmUs: number | null; tsUs: number; matches: number }
function benchSnap(cases = 20000, targets = 40): BenchResult {
  let seed = 7;
  const rnd = (): number => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const data: { b: [number, number, number, number]; xs: number[]; ys: number[] }[] = [];
  for (let i = 0; i < cases; i++) {
    const x = rnd() * 80, y = rnd() * 48, w = 2 + rnd() * 30, h = 1 + rnd() * 12;
    data.push({ b: [x, y, x + w, y + h], xs: Array.from({ length: targets / 2 }, () => rnd() * 90), ys: Array.from({ length: targets / 2 }, () => rnd() * 54) });
  }
  const run = (fn: SnapFn): { us: number; out: SnapAnswer[] } => {
    const out: SnapAnswer[] = [];
    for (const d of data.slice(0, 500)) fn(d.b, d.xs, d.ys, 0.8); // warm up
    const t0 = performance.now();
    for (const d of data) out.push(fn(d.b, d.xs, d.ys, 0.8));
    return { us: ((performance.now() - t0) * 1000) / cases, out };
  };
  const ts = run(snapTS), wa = wasmSnap ? run(wasmSnap) : null;
  let matches = 0;
  if (wa) {
    wa.out.forEach((a, i) => {
      const b = ts.out[i];
      if (b && a.gx === b.gx && a.gy === b.gy && Math.abs(a.dx - b.dx) < 1e-12 && Math.abs(a.dy - b.dy) < 1e-12) matches++;
    });
  }
  return { cases, targets, wasmUs: wa ? wa.us : null, tsUs: ts.us, matches };
}

// ---- live timing: how long each pointer move takes to handle, snap and redraw included ----
const dragTimes: number[] = [];
function recordDragTime(ms: number): void {
  dragTimes.push(ms);
  if (dragTimes.length > 600) dragTimes.shift();
}
function dragStats(): { n: number; avg: number; p95: number } | null {
  if (!dragTimes.length) return null;
  const s = [...dragTimes].sort((a, b) => a - b);
  return { n: s.length, avg: s.reduce((a, b) => a + b, 0) / s.length, p95: s[Math.min(s.length - 1, Math.floor(s.length * 0.95))] ?? 0 };
}
