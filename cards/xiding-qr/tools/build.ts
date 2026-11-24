// Builds dist/qr/index.html (at the repository root): one self-contained page (styles, script, icon and photos inline).
// Host it anywhere static, publish it as an artifact, or open it in the showcase's 页面 section.
// Run with: npm run build:qr

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { MARK_BOX, MARK_DOTS, MARK_R } from "../web/src/mark-data.ts";

const ROOT = join(import.meta.dirname, "..");
const REPO = join(ROOT, "../..");
const TMP = join(REPO, "out/.qr-build");
// Each module only uses names from modules above it.
const ORDER = ["dom", "mark-data", "wordmark-data", "qr", "photos", "custom", "card", "editor", "history", "save", "main"];

execFileSync("tsc", ["-p", join(ROOT, "tsconfig.json"), "--outDir", join(TMP, "js")], { stdio: "inherit" });

const js = ORDER.map((m) => {
  const body = readFileSync(join(TMP, "js", `${m}.js`), "utf8")
    .split("\n")
    .filter((l) => !/^import\s.*from\s.*;\s*$/.test(l) && !/^export\s*\{\s*\};?\s*$/.test(l))
    .map((l) => l.replace(/^export\s+(?=(async\s+)?(function|const|let|class)\b)/, ""))
    .join("\n");
  if (/^\s*(import|export)\s/m.test(body)) throw new Error(`${m}.js still has an import or export`);
  return `// ${m}.ts\n${body.trim()}`;
})
  .join("\n\n")
  // The photos go inside the page as data URLs, so the page is one file that opens anywhere.
  .replace(/"photos\/([a-z0-9-]+\.jpg)"/g, (_, f: string) => `"data:image/jpeg;base64,${readFileSync(join(ROOT, "web/photos", f)).toString("base64")}"`);

const pad = 140;
const size = Math.max(MARK_BOX.w, MARK_BOX.h) + pad * 2;
const ox = MARK_BOX.x - (size - MARK_BOX.w) / 2;
const oy = MARK_BOX.y - (size - MARK_BOX.h) / 2;
const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${ox} ${oy} ${size} ${size}"><rect x="${ox}" y="${oy}" width="${size}" height="${size}" fill="#628F8A"/><g fill="#FFFFFF">${MARK_DOTS.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${MARK_R * 1.25}"/>`).join("")}</g></svg>`;

const page = readFileSync(join(ROOT, "web/index.html"), "utf8")
  .split("<!--ICON-->").join(`<link rel="icon" href="data:image/svg+xml;base64,${Buffer.from(icon).toString("base64")}">`)
  .split("/*CSS*/").join(readFileSync(join(ROOT, "web/app.css"), "utf8"))
  .split("/*JS*/").join(`(function () {\n"use strict";\n${js}\n})();`.replace(/<\/script/gi, "<\\/script"));

mkdirSync(join(REPO, "dist/qr"), { recursive: true });
writeFileSync(join(REPO, "dist/qr/index.html"), page);
const inPage = (js.match(/"data:image\/jpeg;base64,/g) ?? []).length;
const onDisk = readdirSync(join(ROOT, "web/photos")).filter((f) => f.endsWith(".jpg")).length;
if (/"photos\//.test(js) || inPage !== onDisk) throw new Error(`photos: ${inPage} in the page, ${onDisk} in web/photos`);
rmSync(TMP, { recursive: true, force: true });
console.log(`dist/qr/index.html  ${(page.length / 1024).toFixed(1)} KB`);
