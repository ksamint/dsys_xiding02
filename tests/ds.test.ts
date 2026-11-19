// The design system's own tools: the token rules keep the showcase's stylesheet plain, and the preview rule finds
// every way a preview could load from another host.
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTokens, validate } from "../tools/tokens.ts";

test("tokens: a value that could close a rule, a comment or the <style> is refused", () => {
  const good = loadTokens("design-system/tokens.json");
  assert.deepEqual(validate(good), []);
  const bad = structuredClone(good) as unknown as Record<string, { tokens: { value: unknown }[] }> & { type: { families: Record<string, string>; groups: { styles: Record<string, unknown>[] }[] }; name: string };
  bad["shadow"]!.tokens[0]!.value = "0 0 1px red}</style><script>alert(1)</script><style>";
  const fam = Object.keys(bad.type.families)[0]!;
  bad.type.families[fam] = "serif}</style><img src=x onerror=alert(1)>";
  bad.type.groups[0]!.styles[0]!["letterSpacing"] = "0.1em; } body { display: none";
  bad.name = "x */ </style>";
  const errs = validate(bad as never).join("\n");
  assert.match(errs, /shadow: .* CSS cannot take as written/);
  assert.match(errs, /family .* CSS cannot take as written/);
  assert.match(errs, /letterSpacing/);
  assert.match(errs, /cannot sit in a CSS comment/);
});

test("duplicates: the same colour value under two names is listed; an alias is not", async () => {
  const { sameValues, copiesIn } = await import("../tools/tokens.ts");
  const t = loadTokens("design-system/tokens.json");
  const pairs = sameValues(t).map((d) => `${d.theme}:${d.names.join("+")}`);
  assert.ok(pairs.includes("light:teal+brand-teal"), pairs.join());
  assert.ok(!pairs.some((p) => p.includes("ink-arts")), "ink-arts is an alias of brand-teal, not a copy");
  const css = ':root {\n  --paper: #EEF2F1;\n  --teal: #000001;\n  --page-only: 1px;\n}\n:root[data-theme="dark"] {\n  --paper: #000000;\n}';
  const c = copiesIn(css, t);
  assert.deepEqual(c.filter((x) => x.tokens !== null && !x.same).map((x) => x.name), ["teal"], "a drifted copy is found");
  assert.ok(c.some((x) => x.name === "page-only" && x.tokens === null), "a page-only property is not drift");
  assert.ok(c.some((x) => x.name === "paper" && x.theme === "dark" && x.same), "the dark copy is compared with the dark value");
});

test("retired: the three lines of work, the three pillars and the value line are gone from the system and the pages", async () => {
  const { readFileSync, readdirSync } = await import("node:fs");
  const { join } = await import("node:path");
  const vm = await import("node:vm");
  const sandbox: Record<string, unknown> = {};
  vm.runInNewContext(readFileSync("design-system/components/bundle.js", "utf8"), sandbox);
  const X = sandbox["Xiding"] as Record<string, unknown> & { BRANDS: { level: string }[]; BRAND_DETAILS: { id: string }[]; SCENES: { id: string }[]; kit(): { name: string }[] };
  assert.equal(X["PILLARS"], undefined, "Xiding.PILLARS");
  assert.equal(X["LINE"], undefined, "Xiding.LINE");
  const plain = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T; // the bundle's arrays come from another realm
  assert.deepEqual(plain([...new Set(X.BRANDS.map((b) => b.level))]), ["整体", "牌子"]);
  assert.deepEqual(plain(X.BRAND_DETAILS.map((b) => b.id)), ["arts", "academy", "lifestyle"]);
  assert.deepEqual(plain(X.SCENES.map((s) => s.id)), ["arts", "academy", "lifestyle", "root"]);
  const names = X.kit().map((a) => a.name);
  for (const n of ["xiding-name-zhixing", "xiding-name-meicheng", "xiding-name-liyu", "xiding-pillar-mei", "xiding-pillar-zhi", "xiding-pillar-li"]) assert.ok(!names.some((x) => x.startsWith(n + "-") || x === n), n);
  assert.ok(names.includes("xiding-pillar-arts") && names.includes("xiding-pillar-lifestyle"));
  // The words themselves, anywhere in the design system's sources or the pages' sources.
  const words = [/大美/, /大智/, /大礼/, /眼光/, /章法/, /分寸/, /以美成人/, /以智行事/, /以礼相遇/, /智行/, /美成/, /西顶礼遇/, /Praxis/, /pillar-(mei|zhi|li)\b/];
  const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]);
  const files = [...walk("design-system"), ...walk("src"), ...walk("cards/xiding-card/src"), "cards/xiding-card/page.html"].filter((f) => /\.(ts|js|css|html|md|json|svg)$/.test(f));
  const hits = files.flatMap((f) => { const s = readFileSync(f, "utf8"); return words.filter((w) => w.test(s)).map((w) => `${f}: ${w.source}`); });
  assert.deepEqual(hits, []);
});
