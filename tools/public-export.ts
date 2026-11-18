// Part 2: build the public, non-sensitive copy of this private repository (published as ksamint/dsys_xiding02).
// See docs/adr/0001-private-and-public-repositories.md.
// Copies the tracked files public.manifest.json lists, replaces every real person's name, number and email with the
// fictional samples, and refuses to finish if anything personal is left: each private value in any spelling, any
// mainland mobile number, any staff email, also behind HTML entities, %-escapes and \u escapes. A binary file (an
// image, a PDF, a font, WebAssembly) is published only when the manifest lists it with its SHA-256, so a person has
// looked at it; its bytes are scanned for private values as well. Nothing in private/ is copied.
// Usage: node --experimental-strip-types public-export.ts <out-dir>     (out/<name> or a folder outside the repository)
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

export interface Manifest {
  include: string[];
  exclude: string[];
  redactWith: string;
  privatePeople: string;
  readmeNote: string;
  /** Files the public copy carries in a public version: published path → source file in this repository (the
      private README.md is replaced by docs/public-readme.md, AGENTS.md by docs/public-agents.md). */
  overrides?: Record<string, string>;
  /** Every binary file the copy may carry, with the SHA-256 of the reviewed bytes. */
  binaries?: Record<string, string>;
  binariesNote?: string;
}
type Person = Record<string, string>;

function must(cond: unknown, what: string): asserts cond {
  if (!cond) throw new Error(`public-export: ${what}`);
}
const SENSITIVE = ["nameZh", "nameEn", "phone", "email"] as const;
const BINARY = /\.(pdf|png|jpe?g|gif|webp|woff2?|ttf|otf|ico|wasm|zip)$/i;
const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** A value as JSON writes it with escapes: "张三" becomes \u5f20\u4e09. */
const jsonEscaped = (s: string): string => [...s].map((c) => (c.charCodeAt(0) > 0x7e ? "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0") : c)).join("");
/** A pattern for one private value in the spellings it can take: as written, in other cases, JSON-escaped, and a phone with any separators. */
function patternFor(field: string, value: string): RegExp {
  if (field === "phone") {
    const digits = value.replace(/\D/g, "").replace(/^86/, "");
    return new RegExp(`(?:\\+?86[\\s.()-]{0,3})?${[...digits].map(escapeRe).join("[\\s.()-]{0,3}")}`, "g");
  }
  // As written, with any run of white space (a line break, two spaces) where the value has a space, or none; CJK
  // characters may also stand apart. Then the JSON-escaped form.
  const loose = value.trim().split(/\s+/).map((w) => [...w].map(escapeRe).join(/[\u3400-\u9fff]/.test(w) ? "\\s*" : "")).join("\\s*");
  return new RegExp([loose, escapeRe(jsonEscaped(value))].join("|"), "gi");
}
// A mobile number with any of the usual separators. It is not part of a longer number, and not a decimal fraction
// (0.15812345678) or the start of one (15812345678.5), as SVG path data is full of those.
const GENERIC: [string, RegExp][] = [
  ["mainland mobile number", /(?<!\d)(?<!\d\.)(?:\+?86[\s.()-]{0,3})?\(?1[3-9]\d\)?[\s.-]?\d{4}[\s.-]?\d{4}(?!\d)(?!\.\d)/g],
  // Found from its "@", with a local part before it: matching the local part first would rescan every long run of
  // letters and digits (base64 in a page) and take quadratic time.
  ["staff email", /(?<=[A-Za-z0-9._%+-])@(?:[A-Za-z0-9-]+\.)*xidingmiao\.com/gi],
];
/** The text as a reader would see it: HTML entities, %-escapes and \\u escapes decoded. */
export function normalise(text: string): string {
  const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", commat: "@", period: "." };
  let t = text
    .replace(/&#x([0-9a-f]+);?/gi, (_, h: string) => String.fromCodePoint(Math.min(parseInt(h, 16), 0x10ffff)))
    .replace(/&#(\d+);?/g, (_, d: string) => String.fromCodePoint(Math.min(Number(d), 0x10ffff)))
    .replace(/&([a-z]+);/gi, (m, n: string) => named[n.toLowerCase()] ?? m)
    .replace(/\\u\{([0-9a-f]+)\}/gi, (_, h: string) => String.fromCodePoint(Math.min(parseInt(h, 16), 0x10ffff)))
    .replace(/\\u([0-9a-f]{4})/gi, (_, h: string) => String.fromCharCode(parseInt(h, 16)));
  t = t.replace(/(?:%[0-9a-f]{2})+/gi, (m) => {
    try {
      return decodeURIComponent(m);
    } catch {
      return m;
    }
  });
  return t;
}

/** The files to publish: tracked, listed by the manifest, never private. */
export function publicFiles(root: string, m: Manifest): string[] {
  const all = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean);
  const hit = (f: string, list: string[]): boolean => list.some((p) => (p.endsWith("/") ? f.startsWith(p) : f === p));
  return all.filter((f) => hit(f, m.include) && !hit(f, m.exclude) && !f.startsWith("private/"));
}
export interface Finding { file: string; what: string; sample: string }
/** Replace the private people with the samples in a text, field by field. */
export function redact(text: string, real: Person[], samples: Person[]): string {
  let out = text;
  real.forEach((p, i) => {
    const s = samples[i % samples.length] ?? {};
    for (const f of SENSITIVE) {
      const v = p[f];
      if (!v) continue;
      const repl = s[f] ?? "";
      out = out.replace(patternFor(f, v), (m) => (m.startsWith("\\u") ? jsonEscaped(repl) : m === v.toUpperCase() && v !== v.toUpperCase() ? repl.toUpperCase() : repl));
    }
  });
  return out;
}
/** Everything personal left in a text, as written or once decoded. */
export function scan(file: string, text: string, real: Person[], generic = true): Finding[] {
  const out: Finding[] = [];
  const forms = [text, normalise(text)];
  for (const p of real) for (const f of SENSITIVE) {
    const v = p[f];
    if (v && forms.some((t) => patternFor(f, v).test(t))) out.push({ file, what: `a private ${f}`, sample: "(hidden)" });
  }
  if (generic) for (const [what, re] of GENERIC) {
    const m = forms.map((t) => t.match(re)).find(Boolean);
    if (m) out.push({ file, what, sample: (m[0] ?? "").replace(/\d(?=\d{4})/g, "•") });
  }
  return out;
}

/** Where a copy may be written: under out/ in the repository, or anywhere outside it, and never above it. */
export function safeOutDir(root: string, outDir: string): string {
  const base = resolve(root), out = resolve(outDir);
  const rel = relative(base, out), up = relative(out, base);
  const inside = rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
  const above = up === "" || (!up.startsWith("..") && !isAbsolute(up));
  must(!above, "the output folder must not be the repository or a folder that holds it");
  must(!inside || (rel.split(sep)[0] === "out" && rel !== "out"), "the output folder must be inside out/ or outside the repository");
  return out;
}
const sha256 = (b: Buffer): string => createHash("sha256").update(b).digest("hex");

export function exportPublic(root: string, outDir: string): { files: number; redacted: string[]; commit: string } {
  const m = JSON.parse(readFileSync(join(root, "public.manifest.json"), "utf8")) as Manifest;
  const samples = JSON.parse(readFileSync(join(root, m.redactWith), "utf8")) as Person[];
  const privPath = join(root, m.privatePeople);
  const real = existsSync(privPath) ? (JSON.parse(readFileSync(privPath, "utf8")) as Person[]) : [];
  const out = safeOutDir(root, outDir);
  if (existsSync(out)) rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  const files = publicFiles(root, m), redacted: string[] = [], findings: Finding[] = [];
  const reviewed = m.binaries ?? {};
  // In the public copy itself these files are already the public versions, and their sources are not there.
  const overrides = Object.entries(m.overrides ?? {}).filter(([, src]) => existsSync(join(root, src)));
  const replaced = new Set(overrides.map(([dest]) => dest));
  for (const f of files) {
    if (replaced.has(f)) continue;
    const bytes = readFileSync(join(root, f)), dest = join(out, f);
    mkdirSync(dirname(dest), { recursive: true });
    if (BINARY.test(f) || bytes.includes(0)) {
      const want = reviewed[f];
      if (!want) findings.push({ file: f, what: "a binary file not listed in public.manifest.json binaries", sample: "" });
      else if (want !== sha256(bytes)) findings.push({ file: f, what: "a binary file changed since it was reviewed (SHA-256 differs)", sample: "" });
      // Text hidden in the bytes: private values only, as random bytes can look like any number.
      findings.push(...scan(f, bytes.toString("latin1"), real, false), ...scan(f, bytes.toString("utf16le"), real, false));
      writeFileSync(dest, bytes);
      continue;
    }
    let text = bytes.toString("utf8");
    const clean = redact(text, real, samples);
    if (clean !== text) redacted.push(f);
    text = clean;
    if (!m.overrides && f === "README.md") text = `> ${m.readmeNote}\n\n` + text;
    findings.push(...scan(f, text, real));
    writeFileSync(dest, text);
  }
  for (const f of Object.keys(reviewed)) if (!files.includes(f)) findings.push({ file: f, what: "listed in binaries but not published (remove it from the list)", sample: "" });
  for (const [dest, src] of overrides) {
    const text = readFileSync(join(root, src), "utf8");
    findings.push(...scan(dest, text, real));
    mkdirSync(dirname(join(out, dest)), { recursive: true });
    writeFileSync(join(out, dest), text);
  }
  if (findings.length) {
    rmSync(out, { recursive: true, force: true });
    throw new Error(`public-export: personal details left, nothing written:\n${findings.map((x) => `  ${x.file}: ${x.what} ${x.sample}`).join("\n")}`);
  }
  const commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  const dirty = execFileSync("git", ["status", "--porcelain", "--", ...m.include], { cwd: root, encoding: "utf8" }).trim() !== "";
  writeFileSync(join(out, "PUBLIC_EXPORT.json"), JSON.stringify({
    from: "private repository", commit, uncommittedChanges: dirty, files: files.length + overrides.filter(([dest]) => !files.includes(dest)).length, redacted,
    excluded: m.exclude, note: m.readmeNote,
  }, null, 2) + "\n");
  return { files: files.length, redacted, commit };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const outDir = process.argv[2];
  if (!outDir) throw new Error("usage: public-export.ts <out-dir>");
  const r = exportPublic(process.cwd(), outDir);
  console.log(`public copy written: ${outDir} (${r.files} files from ${r.commit.slice(0, 7)}; redacted: ${r.redacted.join(", ") || "none"})`);
}
