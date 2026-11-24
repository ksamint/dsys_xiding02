// Checks on the business-card page and its snap engine (run `npm run build` first; `npm run check` does both).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { runInNewContext } from "node:vm";
import { cardOutlines } from "../tools/card-geometry.ts";

const page = readFileSync("out/xiding-card.html", "utf8");
const wasm = readFileSync("cards/xiding-card/engine/target/wasm32-unknown-unknown/release/xd_snap.wasm");

type Box = [number, number, number, number];
type Answer = { dx: number; dy: number; gx: number | null; gy: number | null };
type Snap = (b: Box, xs: number[], ys: number[], th: number) => Answer;

/** The page's TypeScript snap twin, run on its own. */
function tsTwin(): Snap {
  const src = stripTypeScriptTypes(readFileSync("cards/xiding-card/src/snap.ts", "utf8"));
  const ctx: Record<string, unknown> = { SNAP_WASM_B64: "", performance, WebAssembly, atob };
  runInNewContext(`${src}\n;globalThis.__snap = snapTS;`, ctx);
  return ctx.__snap as Snap;
}
interface Engine { memory: WebAssembly.Memory; input_ptr(): number; output_ptr(): number; snap(nx: number, ny: number, th: number): number }
async function rustEngine(): Promise<Snap> {
  const { instance } = await WebAssembly.instantiate(wasm, {});
  const ex = instance.exports as unknown as Engine;
  return (b, xs, ys, th) => {
    const input = new Float64Array(ex.memory.buffer, ex.input_ptr(), 4 + xs.length + ys.length);
    input.set([...b, ...xs, ...ys]);
    const mask = ex.snap(xs.length, ys.length, th), out = new Float64Array(ex.memory.buffer, ex.output_ptr(), 6);
    return { dx: mask & 1 ? out[0]! : 0, dy: mask & 2 ? out[1]! : 0, gx: mask & 1 ? out[2]! : null, gy: mask & 2 ? out[3]! : null };
  };
}

test("card page: built from the template, with the engine and outlines embedded", () => {
  assert.ok(!page.includes("{{"), "every placeholder filled");
  assert.match(page, /<title>西頂廣仁宮 名片<\/title>/);
  assert.match(page, /const SNAP_WASM_B64 = "AGFzbQ/, "wasm embedded");
  assert.match(page, /<path id="vi-dots" d="M/);
  assert.match(page, /<path id="vi-zh" d="M/);
  assert.ok(page.includes("window.Xiding"), "design system bundle for the before card");
  for (const id of ["undo-list", "x-pdf", "x-svg", "x-page", "x-json", "x-import", "p-x", "undo", "redo", "t-icons", "t-crop", "t-align", "v-save", "hist", "b-engine", "p-group", "p-ungroup", "p-lock", "p-dist-h", "p-dist-v", "p-all", "layers", "p-r", "p-rot90", "p-edit", "p-copy", "p-paste", "p-dup", "ref-x", "ref-y", "ref-clear"]) assert.ok(page.includes(`id="${id}"`), id);
});

test("card page: the VI outlines match the lockup", () => {
  const o = cardOutlines(readFileSync("brand/xiding-guangren-vi/brand-assets/logo-lockup-teal.svg", "utf8"));
  assert.ok(Math.abs(o.geometry.sq - 118.887) < 0.01, "square side");
  assert.ok(Math.abs(o.geometry.zhW - 322.754) < 0.01, "lettering width");
  assert.equal(o.geometry.chars.length, 5);
  assert.equal((o.dotsPath.match(/M/g) ?? []).length, 32, "32 dot shapes");
});

test("snap engine: Rust (WebAssembly) and the TypeScript twin give the same answers", async () => {
  const rust = await rustEngine(), ts = tsTwin();
  let seed = 11;
  const rnd = (): number => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  for (let i = 0; i < 5000; i++) {
    const x = rnd() * 80, y = rnd() * 48, b: Box = [x, y, x + 2 + rnd() * 30, y + 1 + rnd() * 12];
    const xs = Array.from({ length: 20 }, () => Math.round(rnd() * 900) / 10), ys = Array.from({ length: 20 }, () => Math.round(rnd() * 540) / 10);
    const t = ts(b, xs, ys, 0.8); // from another VM context: compare as a plain object
    assert.deepEqual(rust(b, xs, ys, 0.8), { dx: t.dx, dy: t.dy, gx: t.gx, gy: t.gy }, `case ${i}`);
  }
});

test("snap engine: snaps to the margin and centre lines", async () => {
  const rust = await rustEngine();
  const a = rust([6.4, 20, 30, 30], [6, 45, 84], [], 0.8);
  assert.ok(Math.abs(a.dx + 0.4) < 1e-9 && a.gx === 6 && a.gy === null);
  const c = rust([34.7, 0, 54.7, 10], [45], [], 0.8);
  assert.ok(Math.abs(c.dx - 0.3) < 1e-9 && c.gx === 45);
});

test("no personal details: the card's sources and its public build carry no real mobile numbers or staff emails", () => {
  // Patterns only, so this test holds no one's details: a mainland mobile number (+86 1[3-9]…) and the organisation's mail domain.
  const mobile = /\+86[\s-]?1[3-9]\d/, staffMail = /@xidingmiao\.com/i;
  const files = ["out/xiding-card.public.html", "cards/xiding-card/page.html", "cards/xiding-card/people.sample.json", "tools/build-card.ts", "tools/card-geometry.ts", "README.md",
    ...["card.ts", "snap.ts", "editor.ts", "store.ts", "export.ts", "main.ts", "globals.d.ts"].map((f) => `cards/xiding-card/src/${f}`)];
  for (const f of files) {
    const text = readFileSync(f, "utf8");
    assert.ok(!mobile.test(text), `${f} contains a mobile number`);
    assert.ok(!staffMail.test(text), `${f} contains a staff email`);
  }
});

test("a saved or imported design is taken only in the shape the editor writes: nothing reaches the markup", () => {
  const src = (f: string): string => stripTypeScriptTypes(readFileSync(`cards/xiding-card/src/${f}`, "utf8"));
  const main = readFileSync("cards/xiding-card/src/main.ts", "utf8");
  const sliders = stripTypeScriptTypes(main.slice(main.indexOf("const SLIDERS"), main.indexOf("};", main.indexOf("const SLIDERS")) + 2));
  const o = cardOutlines(readFileSync("brand/xiding-guangren-vi/brand-assets/logo-lockup-teal.svg", "utf8"));
  const people = JSON.parse(readFileSync("cards/xiding-card/people.sample.json", "utf8")) as unknown[];
  const ctx: Record<string, unknown> = { VI: o.geometry, PEOPLE_INIT: people, SNAP_WASM_B64: "", document: { createElement: () => ({ getContext: () => null }) } };
  runInNewContext(`${src("card.ts")}\n${sliders}\n${src("store.ts")}\n;globalThis.__t = { applySaved, S, state, front };`, ctx);
  const t = ctx.__t as { applySaved(v: unknown): void; S: Record<string, unknown>; state: { person: number; data: Record<string, string>[]; ov: Record<string, unknown>; texts: Record<string, unknown>; extras: Record<string, unknown> }; front(...a: unknown[]): string };
  const evil = '6"><img src=x onerror=alert(1)>';
  t.applySaved({
    settings: { name: evil, small: 99, co: -5, icons: "yes", fieldW: Number.NaN, extra: evil },
    ov: { "grid:front:name": { dx: evil, dy: 2, s: 1e9, r: "9" }, bad: "x" },
    texts: { "a#0": "plain", "b#0": 42 },
    extras: { "grid:front": [{ id: "x~1", src: "name", label: evil }, { id: 3 }] },
    person: 99,
    data: [{ nameZh: evil, phone: 13 }],
  });
  assert.equal(t.S.name, 6, "a text in a number's place keeps the default");
  assert.equal(t.S.small, 2.8, "a number above its slider is held at the top");
  assert.equal(t.S.co, 2, "and below it at the bottom");
  assert.equal(t.S.icons, false, "a switch is only true or false");
  assert.equal(t.S.fieldW, 36, "NaN keeps the default");
  assert.ok(!("extra" in t.S), "unknown settings are dropped");
  const plain = (v: unknown): unknown => JSON.parse(JSON.stringify(v)); // objects from the sandbox have its prototypes
  assert.deepEqual(plain(t.state.ov["grid:front:name"]), { dx: 0, dy: 2, s: 20 }, "moves are numbers in range");
  assert.ok(!("bad" in t.state.ov));
  assert.deepEqual(plain(t.state.texts), { "a#0": "plain" });
  assert.equal((t.state.extras["grid:front"] as unknown[]).length, 1);
  assert.equal(t.state.person, 0, "the person is one of the people");
  assert.equal(t.state.data[0]?.phone, (people[0] as Record<string, string>).phone, "a number in a text's place keeps the sample");
  for (const layout of ["grid", "seal2", "axis"]) {
    const svg = t.front(t.state.data[0], 3, layout, false, "gold");
    assert.ok(!/<img/i.test(svg), `${layout}: no markup from the design file`);
    assert.ok(svg.includes("&lt;img"), `${layout}: the name is drawn as text`);
  }
});

test("one list of brands: the back's name row, the portrait's pillars and their services read the same list, which agrees with the design system", () => {
  const read = (f: string): string => readFileSync(`cards/xiding-card/${f}`, "utf8");
  const o = cardOutlines(readFileSync("brand/xiding-guangren-vi/brand-assets/logo-lockup-teal.svg", "utf8"));
  const people = JSON.parse(read("people.sample.json")) as unknown[];
  const ctx: Record<string, unknown> = { VI: o.geometry, PEOPLE_INIT: people, SNAP_WASM_B64: "", document: { createElement: () => ({ getContext: () => null }) } };
  runInNewContext(`${stripTypeScriptTypes(read("src/card.ts"))}\n;globalThis.__b = { CARD_BRANDS, BRANDS };`, ctx);
  const card = JSON.parse(JSON.stringify((ctx.__b as { CARD_BRANDS: unknown }).CARD_BRANDS)) as { zh: string; en: string; services: string[] }[];
  assert.deepEqual(JSON.parse(JSON.stringify((ctx.__b as { BRANDS: unknown }).BRANDS)), card.map((b) => b.zh), "the back's row is the list's names");

  // the design system's brand table, id by id (design-system/components/src/xiding.ts)
  const ds = readFileSync("design-system/components/src/xiding.ts", "utf8");
  const table = [...ds.matchAll(/\{ id: "(\w+)", zh: "([^"]+)", en: "([^"]+)", latin: "[^"]*", word: "[^"]*", field: "[^"]*", services: \[([^\]]*)\]/g)]
    .map((m) => ({ id: m[1]!, zh: m[2]!, en: m[3]!, services: [...m[4]!.matchAll(/"([^"]+)"/g)].map((s) => s[1]!) }));
  assert.ok(table.length >= 3, "the design system's brand table was found");
  const ids = ["arts", "academy"];
  assert.equal(card.length, ids.length, "the card shows two brands");
  card.forEach((b, i) => {
    const ref = table.find((t) => t.id === ids[i]);
    assert.ok(ref, `the design system has a brand ${ids[i]}`);
    assert.equal(b.zh, ref.zh, `brand ${i + 1}: name`);
    assert.equal(b.en, ref.en, `brand ${i + 1}: English name`);
    assert.deepEqual(b.services, ref.services, `brand ${i + 1}: services are the design system's`);
  });

  // nothing else in the card states a brand: the portrait takes the list, and no source or page text has an old name
  const portrait = read("src/portrait.ts");
  assert.ok(/const PILLARS: Pillar\[\] = CARD_BRANDS;/.test(portrait), "the pillars are the card's list");
  assert.ok(!/zh: "西顶(艺术|新知|教育|学院|时光)"/.test(portrait), "no brand is typed again in the portrait");
  for (const f of ["page.html", "src/card.ts", "src/main.ts", "src/portrait.ts", "src/store.ts"]) {
    const t = read(f);
    for (const old of ["西顶学院", "Xiding Academy", "西顶教育", "Xiding Education", "Xiding Xinzhi", "XIDING XINZHI"]) assert.ok(!t.includes(old), `${f} still says ${old}`);
  }
});

test("the portrait's QR code decodes to its address, and the caption under it is read from that address", async () => {
  const m = page.match(/const QR = (\{[^\n]*\});/);
  assert.ok(m, "the page carries its QR code");
  const qr = JSON.parse(m[1]!) as { url: string; n: number; d: string };
  assert.ok(/^https:\/\/[a-z0-9.-]+\/?/.test(qr.url), "the code leads to an https address");
  // draw the code's modules, with the four-module quiet zone, and read it back as a scanner would
  const scale = 6, size = (qr.n + 8) * scale, px = new Uint8ClampedArray(size * size * 4).fill(255);
  for (const d of qr.d.matchAll(/M(\d+) (\d+)h1v1h-1z/g)) {
    const x0 = (Number(d[1]) + 4) * scale, y0 = (Number(d[2]) + 4) * scale;
    for (let y = y0; y < y0 + scale; y++) for (let x = x0; x < x0 + scale; x++) { const i = (y * size + x) * 4; px[i] = px[i + 1] = px[i + 2] = 0; }
  }
  // jsQR is CommonJS: its types say the module, its default export is the function
  const jsQR = ((await import("jsqr")) as unknown as { default: (d: Uint8ClampedArray, w: number, h: number) => { data: string } | null }).default;
  assert.equal(jsQR(px, size, size)?.data, qr.url, "a scanner reads the address the page says");
  // the caption is not typed: it takes the host from the code
  const portrait = readFileSync("cards/xiding-card/src/portrait.ts", "utf8");
  assert.ok(/const QR_HOST = .*new URL\(QR\.url\)\.host/.test(portrait), "the caption's address comes from the code");
  assert.ok(!/xidingmiao\.com|apuch\.cn/.test(portrait), "no address is typed in the portrait");
});

test("the public copy builds the card without the private people file or photo", async () => {
  const { execFileSync } = await import("node:child_process");
  const { mkdtempSync, readFileSync: read } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join: j } = await import("node:path");
  const out = j(mkdtempSync(j(tmpdir(), "xd-card-")), "card.html");
  execFileSync("node", ["--experimental-strip-types", "--no-warnings", "tools/build-card.ts", "brand/xiding-guangren-vi", "design-system/components/bundle.js", out,
    "--people", "private/does-not-exist.json", "--photo", "private/photos/does-not-exist.webp"], { stdio: "pipe" });
  const html = read(out, "utf8");
  assert.ok(html.includes("const PHOTO_INIT = null;"), "no photo is built in");
  assert.ok(html.includes("zhangsan@example.com"), "the sample people are used");
});
