// Build the 西頂廣仁宮 business-card page: the card editor (strict TypeScript, type-stripped into the page),
// the Rust snap engine (compiled to WebAssembly and embedded), the VI's outlines, and the design system's bundle
// (design-system/components/bundle.js) for the "before" card.
// Usage: node --experimental-strip-types build-card.ts <vi-dir> <bundle.js> <out.html> [--people <people.json>]
// With --people and that file present (private/people.json in the private repository) the cards carry those people;
// otherwise they carry the fictional samples in cards/xiding-card/people.sample.json.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { join } from "node:path";
import { cardOutlines } from "./card-geometry.ts";

const args = process.argv.slice(2), pi = args.indexOf("--people");
const peopleFile = pi >= 0 ? args[pi + 1] : undefined;
if (pi >= 0) args.splice(pi, 2);
const [viDir, bundleFile, outFile] = args;
if (!viDir || !bundleFile || !outFile) throw new Error("usage: build-card.ts <vi-dir> <bundle.js> <out.html>");
function must(cond: unknown, what: string): asserts cond {
  if (!cond) throw new Error(`build-card: ${what}`);
}
const CARD = "cards/xiding-card";

// 1. the VI's outlines
const outlines = cardOutlines(readFileSync(join(viDir, "brand-assets/logo-lockup-teal.svg"), "utf8"));
const defs = `<path id="vi-dots" d="${outlines.dotsPath}"/>\n<path id="vi-zh" d="${outlines.zhPath}"/>`;

// 2. the Rust snap engine, as WebAssembly
const manifest = join(CARD, "engine/Cargo.toml");
execFileSync("cargo", ["build", "--quiet", "--release", "--target", "wasm32-unknown-unknown", "--manifest-path", manifest], { stdio: "inherit" });
const wasmFile = join(CARD, "engine/target/wasm32-unknown-unknown/release/xd_snap.wasm");
must(existsSync(wasmFile), "the wasm build left no xd_snap.wasm");
const wasm = readFileSync(wasmFile);
must(wasm.subarray(0, 4).toString("hex") === "0061736d", "xd_snap.wasm is not a WebAssembly module");
const wasmB64 = wasm.toString("base64");

// 3. the design system's bundle, for the "before" card
const bundle = readFileSync(bundleFile, "utf8");
must(bundle.includes("Xiding"), "design system bundle");
// The page passes every line of the "before" card itself. The bundle's own list of people is replaced by samples
// all the same, so whatever the bundle holds, no personal details reach the built page.
const peopleAt = bundle.indexOf("const PEOPLE = ["), peopleEnd = bundle.indexOf("];", peopleAt);
must(peopleAt > 0 && peopleEnd > peopleAt, "people list in the design system bundle");
const SAMPLE = (n: number, zh: string, en: string, tz: string, te: string): string =>
  `{ nameZh: "${zh}", nameEn: "${en}", titleZh: "${tz}", titleEn: "${te}", phone: "+86 100 0000 000${n}", email: "sample${n}@example.com", web: "example.com", address: ADDRESS }`;
const bundleSafe = bundle.slice(0, peopleAt) +
  `const PEOPLE = [\n        ${[SAMPLE(1, "张三", "Zhang San", "首席执行官", "CEO"), SAMPLE(2, "李四", "Li Si", "院长", "Dean"), SAMPLE(3, "王小五", "Wang Xiaowu", "董事", "Director")].join(",\n        ")}\n    ` +
  bundle.slice(peopleEnd);

// 4. the page script: the TypeScript sources, types stripped, in one function scope
const SOURCES = ["card.ts", "snap.ts", "editor.ts", "store.ts", "export.ts", "main.ts"];
const stripped = SOURCES.map((f) => `// ---- ${f} ----\n` + stripTypeScriptTypes(readFileSync(join(CARD, "src", f), "utf8")));
// 5. the people: private when the private file is there, the fictional samples otherwise
const usePrivate = !!peopleFile && existsSync(peopleFile);
const people = JSON.parse(readFileSync(usePrivate ? peopleFile! : join(CARD, "people.sample.json"), "utf8")) as Record<string, string>[];
must(Array.isArray(people) && people.length > 0 && people.every((p) => typeof p.nameZh === "string"), "people list");
const script = `(function () {\n"use strict";\nconst VI = ${JSON.stringify(outlines.geometry)};\nconst PEOPLE_INIT = ${JSON.stringify(people).replace(/</g, "\\u003c")};\nconst SNAP_WASM_B64 = "${wasmB64}";\n${stripped.join("\n")}\n})();`;
for (const [name, text] of [["script", script], ["bundle", bundleSafe]] as const) must(!/<\/script/i.test(text), `${name} contains </script`);
// "<!--" or "<script" inside a script can change how the HTML parser finds its end; the page script spells tags in pieces.
must(!/<!--|<script/i.test(script), "the page script contains <!-- or <script");

// 6. the page
let page = readFileSync(join(CARD, "page.html"), "utf8");
for (const [k, v] of [["{{DEFS}}", defs], ["{{BUNDLE}}", bundleSafe], ["{{SCRIPT}}", script]] as const) {
  must(page.split(k).length === 2, `template placeholder ${k} must occur once`);
  page = page.replace(k, () => v);
}
writeFileSync(outFile, page);
console.log(`card written: ${outFile} (${(page.length / 1024).toFixed(1)} KB, wasm ${(wasm.length / 1024).toFixed(1)} KB, ${usePrivate ? "private people" : "sample people"})`);
