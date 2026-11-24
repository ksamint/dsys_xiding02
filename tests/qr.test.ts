// The QR share card page (cards/xiding-qr): its encoder reads back, its marks are the design system's, and it builds
// into dist/qr/index.html for the showcase (run `npm run build:qr` first; `npm run check` does it before the tests).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

// The page's own sources are checked by its own tsconfig; load them here by path so this file does not re-check them.
const SRC = new URL("../cards/xiding-qr/web/src/", import.meta.url).href;
const { capacity, encode } = (await import(`${SRC}qr.ts`)) as {
  capacity(ecl?: string): number;
  encode(text: string, ecl?: string): { size: number; version: number; modules: boolean[][] };
};
const { MARK_BOX, MARK_DOTS } = (await import(`${SRC}mark-data.ts`)) as {
  MARK_BOX: { w: number; h: number };
  MARK_DOTS: unknown[];
};

const jsQR = ((await import("jsqr")) as unknown as {
  default: (d: Uint8ClampedArray, w: number, h: number) => { binaryData: number[] } | null;
}).default;

const CASES = [
  "https://example.org",
  "https://例子.中国/西顶/素材库?q=大美&r=大智#大礼",
  "HELLO WORLD",
  "a",
  "https://example.com/" + "x".repeat(120),
  "https://example.com/?" + "abcdefghij".repeat(30),
  "西顶文化 艺术 · 教育 · 生活方式 ".repeat(12),
  "https://example.com/" + "y".repeat(900),
];

test("the encoder's codes read back exactly, Chinese and long text included", () => {
  for (const text of CASES) {
    const q = encode(text, "M");
    const s = 6, quiet = 4, n = (q.size + quiet * 2) * s;
    const rgba = new Uint8ClampedArray(n * n * 4).fill(255);
    for (let y = 0; y < q.size; y++) for (let x = 0; x < q.size; x++) if (q.modules[y]?.[x])
      for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) {
        const i = (((y + quiet) * s + dy) * n + (x + quiet) * s + dx) * 4;
        rgba[i] = rgba[i + 1] = rgba[i + 2] = 0;
      }
    const got = jsQR(rgba, n, n);
    assert.ok(got, `no code found for ${JSON.stringify(text.slice(0, 40))}`);
    assert.equal(new TextDecoder().decode(Uint8Array.from(got.binaryData)), text, `v${q.version} read back differently`);
  }
  assert.ok(capacity("M") >= 900, "capacity M holds the longest case");
});

test("the mark is the design system's: 40 dots in the 844 × 1356 box", () => {
  assert.equal(MARK_DOTS.length, 40);
  assert.deepEqual([MARK_BOX.w, MARK_BOX.h], [844, 1356]);
  const tokens = readFileSync("design-system/tokens.json", "utf8");
  assert.ok(tokens.includes('"mark-width"') && /"value": 844\b|"value": "844"/.test(tokens), "tokens.json holds the mark width 844");
});

test("the wordmark is the VI's 西頂廣仁宮: every outline path of chinese-wordmark-teal.svg is in wordmark-data.ts", () => {
  const svg = readFileSync("design-system/assets/VI/chinese-wordmark-teal.svg", "utf8");
  const data = readFileSync("cards/xiding-qr/web/src/wordmark-data.ts", "utf8");
  const paths = [...svg.matchAll(/\sd="([^"]+)"/g)].map((m) => m[1] ?? "");
  assert.ok(paths.length > 0, "the VI wordmark has paths");
  const missing = paths.filter((d) => !data.includes(d));
  assert.deepEqual(missing.map((d) => d.slice(0, 30)), [], "paths of the VI wordmark missing from wordmark-data.ts");
});

test("the page builds to one self-contained file with every photo inside", () => {
  const html = readFileSync("dist/qr/index.html", "utf8");
  const photos = readdirSync("cards/xiding-qr/web/photos").filter((f) => f.endsWith(".jpg")).length;
  assert.equal((html.match(/data:image\/jpeg;base64,/g) ?? []).length, photos);
  assert.ok(!/(?:src|href)="(?!data:|#)[^"]*"/.test(html.replace(/https:\/\/fonts\.g[a-z]+\.com[^"]*/g, "")), "no outside file is loaded");
  assert.ok(html.includes("<title>西顶 · 二维码</title>"));
  assert.ok(html.includes("function setCustomPhoto") && html.includes("function setLogo") && html.includes("function drawContain"), "the temporary photo and logo replacements are in the page");
});
