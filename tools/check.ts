/* The full local check suite for the design system. Exits non-zero on any failure. */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { loadTokens, validate } from "./tokens.ts";
import { buildBundle } from "./bundle.ts";
import { buildShowcase } from "./showcase.ts";
import { scan } from "./public-export.ts";

const DS = new URL("../design-system/", import.meta.url).pathname;
const failures: string[] = [];
const ok = (msg: string) => console.log(`ok    ${msg}`);
const fail = (msg: string) => { failures.push(msg); console.log(`FAIL  ${msg}`); };

// 1. tokens.json follows the shape the design-system page reads
const tokenErrs = validate(loadTokens(join(DS, "tokens.json")));
tokenErrs.length ? tokenErrs.forEach((e) => fail(`tokens: ${e}`)) : ok("tokens.json: every token readable, named once, with a usage note");

// 2. bundle.js is a fresh build of the TypeScript source
const bundle = readFileSync(join(DS, "components/bundle.js"), "utf8");
bundle === buildBundle() ? ok("bundle.js matches components/src/xiding.ts") : fail("bundle.js is out of date: run `npm run build`");
/<\/script|<!--/i.test(bundle) ? fail("bundle.js contains </script or <!-- and cannot be inlined") : ok("bundle.js can be inlined");

// 3. every asset the index names is in the repo at its recorded size
interface AssetFile { name: string; blob: string; size: number; type: string }
const index = JSON.parse(readFileSync(join(DS, "design-system.json"), "utf8")) as {
  groups: string[]; assetGroups: Record<string, { order: string[]; files: Record<string, AssetFile> }>;
};
let assets = 0;
for (const [group, g] of Object.entries(index.assetGroups)) {
  if (!index.groups.includes(group)) fail(`index: asset group ${group} missing from groups`);
  for (const name of g.order) if (!(name in g.files)) fail(`index: ${group}/${name} in order but not in files`);
  for (const f of Object.values(g.files)) {
    const p = join(DS, "assets", group, f.name);
    if (!existsSync(p)) fail(`asset missing: assets/${group}/${f.name}`);
    else if (statSync(p).size !== f.size) fail(`asset size differs: assets/${group}/${f.name}`);
    else assets++;
    if (f.type === "image/svg+xml" && /<script|on[a-z]+=|javascript:/i.test(readFileSync(p, "utf8")))
      fail(`asset has script: assets/${group}/${f.name}`);
  }
  if (!existsSync(join(DS, "assets", group, "README.md"))) fail(`asset group ${group} has no README.md`);
}
ok(`${assets} assets present at their recorded sizes`);

// 4. components: a README, a preview with the card marker, only allowed external URLs
const comps = readdirSync(join(DS, "components")).filter((d) => statSync(join(DS, "components", d)).isDirectory() && d !== "src" && d !== "lib");
const ALLOWED = /^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com)\b/;
for (const c of comps) {
  const dir = join(DS, "components", c);
  const prev = join(dir, "preview.html");
  if (c !== "Cover" && !existsSync(join(dir, "README.md"))) fail(`${c}: no README.md`);
  if (!existsSync(prev)) { fail(`${c}: no preview.html`); continue; }
  const html = readFileSync(prev, "utf8");
  if (!/^<!-- @dsCard\b[^>]*-->/.test(html)) fail(`${c}: preview line 1 is not an @dsCard marker`);
  if (/<(iframe|frame|object|embed|portal|noscript)\b/i.test(html)) fail(`${c}: preview uses a forbidden element`);
  for (const m of html.matchAll(/(?:\bsrc|\bhref|\bimport\s*\(|\bfetch\s*\(|\burl\s*\()\s*=?\s*["'`]?\s*((?:https?:)?\/\/[^"'`\s)>]+)/gi))
    if (!ALLOWED.test((m[1] ?? "").replace(/^\/\//, "https://"))) fail(`${c}: loads ${m[1] ?? ""}`);
  if (statSync(prev).size > 256 * 1024) fail(`${c}: preview over 256 KB`);
}
ok(`${comps.length} components checked`);

// 5. README first-sentence summaries exist for components (manifest summary)
for (const c of comps) {
  const r = join(DS, "components", c, "README.md");
  if (existsSync(r) && !/\.\s/.test(readFileSync(r, "utf8").replace(/^#.*\n/, ""))) fail(`${c}: README has no first sentence`);
}

// 6. no component's base class is declared twice in bundle.css (one component's styles silently restyling another)
const css = readFileSync(join(DS, "components/bundle.css"), "utf8");
const bases = new Map<string, number>();
{
  // only top-level rules count: a class restated inside @media is an override, not a second definition
  const src = css.replace(/\/\*[\s\S]*?\*\//g, "");
  let depth = 0, start = 0;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === "{") {
      if (depth === 0) {
        const sel = src.slice(start, i).trim();
        const m = /^\.(xd-[a-z0-9-]+(?:__[a-z0-9-]+)?)$/.exec(sel);
        if (m?.[1]) bases.set(m[1], (bases.get(m[1]) ?? 0) + 1);
      }
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) start = i + 1;
    } else if (ch === ";" && depth === 0) start = i + 1;
  }
}
const twice = [...bases].filter(([, n]) => n > 1).map(([c]) => c);
twice.length ? twice.forEach((c) => fail(`bundle.css declares .${c} { … } more than once`)) : ok(`bundle.css: ${bases.size} base classes, each declared once`);

// 7. the VI group holds byte-for-byte copies of the source VI files under brand/
const VI_SRC = new URL("../brand/xiding-guangren-vi/brand-assets/", import.meta.url).pathname;
const viFiles = Object.values(index.assetGroups["VI"]?.files ?? {});
const drifted = viFiles.filter((f) => !existsSync(join(VI_SRC, f.name)) || !readFileSync(join(VI_SRC, f.name)).equals(readFileSync(join(DS, "assets/VI", f.name))));
drifted.length ? drifted.forEach((f) => fail(`assets/VI/${f.name} differs from brand/xiding-guangren-vi/brand-assets/`)) : ok(`assets/VI: ${viFiles.length} files identical to the source VI`);

// 8. no personal details: the real people stay in private/people.json (skipped where it is absent, as in the public copy)
const PEOPLE_FILE = new URL("../private/people.json", import.meta.url).pathname;
if (existsSync(PEOPLE_FILE)) {
  const real = JSON.parse(readFileSync(PEOPLE_FILE, "utf8")) as Record<string, string>[];
  const walk = (d: string): string[] => readdirSync(d).flatMap((n) => { const q = join(d, n); return statSync(q).isDirectory() ? walk(q) : [q]; });
  const texts = walk(DS).filter((f) => /\.(md|json|html|css|js|ts|svg|txt)$/.test(f) && statSync(f).size < 1024 * 1024);
  const found = texts.flatMap((f) => scan(f.slice(DS.length), readFileSync(f, "utf8"), real));
  // the generated showcase is large: look for the exact values, phone digits with separators ignored
  const sc = existsSync(new URL("../showcase/index.html", import.meta.url).pathname) ? readFileSync(new URL("../showcase/index.html", import.meta.url).pathname, "utf8") : "";
  const scLower = sc.toLowerCase(), scDigits = sc.replace(/[\s+-]/g, "");
  for (const p of real) {
    for (const k of ["nameZh", "nameEn", "email"]) { const v = p[k]; if (v && scLower.includes(v.toLowerCase())) found.push({ file: "showcase/index.html", what: `a private ${k}`, sample: "(hidden)" }); }
    const digits = (p["phone"] ?? "").replace(/\D/g, "").replace(/^86/, "");
    if (digits.length >= 7 && scDigits.includes(digits)) found.push({ file: "showcase/index.html", what: "a private phone", sample: "(hidden)" });
  }
  found.length ? found.forEach((f) => fail(`personal detail in ${f.file}: ${f.what}`)) : ok(`no personal details in design-system/ (${texts.length} files) or the showcase`);
}

// 9. the showcase shows exactly what is committed
const SHOWCASE = new URL("../showcase/index.html", import.meta.url).pathname;
const sc = buildShowcase();
existsSync(SHOWCASE) && readFileSync(SHOWCASE, "utf8") === sc.doc
  ? ok(`showcase/index.html matches design-system/ (inputs ${sc.hash.slice(0, 12)})`)
  : fail("showcase/index.html is out of date: run `npm run showcase`");

if (failures.length) { console.log(`\n${failures.length} check(s) failed`); process.exit(1); }
console.log("\nall checks passed");
