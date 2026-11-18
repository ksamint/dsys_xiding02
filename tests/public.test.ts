// Part 2: the public copy carries nothing personal, and a sync lands it in another repository as one fresh commit.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { exportPublic, redact, safeOutDir, scan } from "../tools/public-export.ts";

// Made-up "private" people: the checks below must hold for any list, so this file names no one real.
// The fictional number and address are put together at run time, so this file's own text passes the export's scan.
const DOMAIN = ["xidingmiao", "com"].join("."), MOBILE = ["139", "1234", "5678"];
const REAL = [{ nameZh: "甄实名", nameEn: "Zhen Shiming", phone: `+86 ${MOBILE.join(" ")}`, email: `zsm@${DOMAIN}` }];
const SAMPLE = [{ nameZh: "张三", nameEn: "Zhang San", phone: "+86 100 0000 0001", email: "zhangsan@example.com" }];

test("redaction: every spelling of a private value becomes the sample", () => {
  const text = `name 甄实名, "\\u7504\\u5b9e\\u540d", ZHEN SHIMING, Zhen Shiming, tel +86 ${MOBILE.join(" ")} / ${MOBILE.join("")} / ${MOBILE.join("-")}, mail zsm@${DOMAIN}`;
  const out = redact(text, REAL, SAMPLE);
  assert.ok(!out.includes("甄实名") && !out.includes("\\u7504") && !/zhen ?shiming/i.test(out), out);
  assert.ok(!new RegExp(MOBILE.join("[\\s-]?")).test(out) && !out.includes(`@${DOMAIN}`), out);
  assert.ok(out.includes("张三") && out.includes("\\u5f20\\u4e09") && out.includes("ZHANG SAN") && out.includes("zhangsan@example.com"), out);
  assert.deepEqual(scan("x", out, REAL), []);
});

test("scan: finds private values and any mobile number or staff email it was not told about", () => {
  const found = scan("x", `call ${["186", "0000", "1111"].join("-")} or write a@${DOMAIN}`, REAL).map((f) => f.what);
  assert.ok(found.includes("mainland mobile number") && found.includes("staff email"), found.join());
  assert.deepEqual(scan("x", "+86 100 0000 0001, 0.15812345678, path M15812345678.5", REAL), [], "samples and decimals are not numbers to hide");
});

test("scan: sees through other spellings, separators and encodings", () => {
  const m = MOBILE.join("");
  const cases: [string, string][] = [
    [`tel ${MOBILE.join(".")}`, "mainland mobile number"],
    [`+86 (${MOBILE[0]}) ${MOBILE[1]}-${MOBILE[2]}`, "mainland mobile number"],
    [`call ${m}.`, "mainland mobile number"],
    [`tel.${m}`, "mainland mobile number"],
    [`mail zsm&#64;${DOMAIN}`, "staff email"],
    [`mail a@team.${DOMAIN}`, "staff email"],
    [`name %E7%94%84%E5%AE%9E%E5%90%8D`, "a private nameZh"],
    ["name 甄实\n名", "a private nameZh"],
    ["name Zhen\n  Shiming", "a private nameEn"],
    ["name &#x7504;&#x5b9e;&#x540d;", "a private nameZh"],
  ];
  for (const [text, what] of cases) assert.ok(scan("x", text, REAL).some((f) => f.what === what), `${what} in ${JSON.stringify(text)}`);
  assert.deepEqual(scan("x", "0.15812345678 M15812345678.5 L2.13912345678", []), [], "decimals in SVG path data stay unflagged");
});

test("public copy: written only under out/ or outside the repository", () => {
  const root = process.cwd();
  assert.throws(() => safeOutDir(root, root), /must not be the repository/);
  assert.throws(() => safeOutDir(root, join(root, "..")), /must not be the repository/);
  assert.throws(() => safeOutDir(root, join(root, "src")), /inside out\//);
  assert.throws(() => safeOutDir(root, join(root, "out")), /inside out\//);
  assert.ok(safeOutDir(root, join(root, "out", "public")).endsWith(join("out", "public")));
  assert.ok(safeOutDir(root, mkdtempSync(join(tmpdir(), "xd-out-"))));
});

test("public copy: a binary file goes out only when reviewed, by its SHA-256", () => {
  const repo = mkdtempSync(join(tmpdir(), "xd-bin-"));
  const sh = (...a: string[]): string => execFileSync("git", a, { cwd: repo, encoding: "utf8" });
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 1, 2, 3]);
  mkdirSync(join(repo, "img"));
  writeFileSync(join(repo, "img", "a.png"), png);
  writeFileSync(join(repo, "samples.json"), JSON.stringify(SAMPLE));
  const manifest = (binaries: Record<string, string>): void =>
    writeFileSync(join(repo, "public.manifest.json"), JSON.stringify({ include: ["img/"], exclude: [], redactWith: "samples.json", privatePeople: "none.json", readmeNote: "n", binaries }));
  manifest({});
  sh("init", "-q");
  sh("add", "-A");
  sh("-c", "user.email=t@example.com", "-c", "user.name=t", "commit", "-qm", "x");
  const out = join(repo, "out", "public");
  assert.throws(() => exportPublic(repo, out), /not listed in public\.manifest\.json binaries/);
  manifest({ "img/a.png": "0".repeat(64) });
  assert.throws(() => exportPublic(repo, out), /changed since it was reviewed/);
  manifest({ "img/a.png": createHash("sha256").update(png).digest("hex") });
  assert.equal(exportPublic(repo, out).files, 1);
});

test("public copy: no private folder, nothing personal, its own README", () => {
  const out = mkdtempSync(join(tmpdir(), "xd-public-"));
  const r = exportPublic(process.cwd(), out);
  assert.ok(r.files > 40);
  assert.ok(!existsSync(join(out, "private")), "private/ stays out");
  const readme = readFileSync(join(out, "README.md"), "utf8");
  assert.match(readme, /generated/i, "the public README says the repository is generated");
  assert.ok(!readme.includes("private/people.json"), "the private README stays private");
  const agents = readFileSync(join(out, "AGENTS.md"), "utf8");
  assert.match(agents, /generated/i, "the public AGENTS.md says the repository is generated");
  assert.match(agents, /Do not edit, commit or push here by hand/);
  assert.ok(!agents.includes("private/people.json") && !agents.includes("xidinglife01"), "the private AGENTS.md stays private");
  assert.match(readFileSync(join(out, "CLAUDE.md"), "utf8"), /@AGENTS\.md/, "Claude Code is pointed at AGENTS.md");
  assert.match(readFileSync(join(out, "LICENSE"), "utf8"), /Apache License\s+Version 2\.0/);
  assert.match(readFileSync(join(out, "NOTICE"), "utf8"), /all rights reserved/i);
  const info = JSON.parse(readFileSync(join(out, "PUBLIC_EXPORT.json"), "utf8")) as { commit: string };
  assert.match(info.commit, /^[0-9a-f]{40}$/);
  const real = existsSync("private/people.json") ? (JSON.parse(readFileSync("private/people.json", "utf8")) as Record<string, string>[]) : [];
  const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
  for (const f of walk(out)) {
    if (/\.(pdf|png|jpe?g|wasm|webp|woff2?)$/i.test(f)) continue;
    assert.deepEqual(scan(f, readFileSync(f, "utf8"), real), [], f);
  }
});

test("public sync: a sync branch starts from the public main, for a pull request", () => {
  const bare = mkdtempSync(join(tmpdir(), "xd-public-remote-"));
  execFileSync("git", ["init", "-q", "--bare", "-b", "main", bare]);
  const seed = mkdtempSync(join(tmpdir(), "xd-public-seed-"));
  execFileSync("git", ["clone", "-q", bare, seed]);
  writeFileSync(join(seed, "README.md"), "seed\n");
  execFileSync("git", ["-C", seed, "add", "-A"]);
  execFileSync("git", ["-C", seed, "-c", "user.email=t@example.com", "-c", "user.name=t", "commit", "-qm", "seed"]);
  execFileSync("git", ["-C", seed, "push", "-q", "origin", "HEAD:main"]);
  execFileSync("node", ["--experimental-strip-types", "--no-warnings", "tools/public-sync.ts", bare, "--branch", "sync/test", "--base", "main"], { encoding: "utf8" });
  const log = execFileSync("git", ["--git-dir", bare, "log", "--format=%s", "sync/test"], { encoding: "utf8" }).trim().split("\n");
  assert.equal(log.length, 2);
  assert.equal(log[1], "seed", "the sync commit sits on the public main");
});

test("public sync: one fresh commit in the other repository, none of this one's history", () => {
  const bare = mkdtempSync(join(tmpdir(), "xd-public-remote-"));
  execFileSync("git", ["init", "-q", "--bare", "-b", "main", bare]);
  const run = (): string => execFileSync("node", ["--experimental-strip-types", "--no-warnings", "tools/public-sync.ts", bare], { encoding: "utf8" });
  assert.match(run(), /synced:/);
  assert.match(run(), /nothing to sync/, "a second sync with no changes adds nothing");
  const log = execFileSync("git", ["--git-dir", bare, "log", "--format=%s", "main"], { encoding: "utf8" }).trim().split("\n");
  assert.equal(log.length, 1);
  assert.match(log[0] ?? "", /^Sync from private [0-9a-f]{7}$/);
  const files = execFileSync("git", ["--git-dir", bare, "ls-tree", "-r", "--name-only", "main"], { encoding: "utf8" }).split("\n");
  assert.ok(!files.some((f) => f.startsWith("private/")) && files.includes("PUBLIC_EXPORT.json") && files.includes("cards/xiding-card/src/card.ts"));
});
