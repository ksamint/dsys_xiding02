/* Writes dist/gallery/: tokens.css compiled from tokens.json, the bundle, and every
   component preview wrapped the way the design-system page frames it (tokens.css,
   bundle.css and bundle.js preloaded, data-theme set). index.html shows them all. */
import { pathToFileURL } from "node:url";
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadTokens, toCSS } from "./tokens.ts";

const DS = new URL("../design-system/", import.meta.url).pathname;
const OUT = new URL("../dist/gallery/", import.meta.url).pathname;

export interface Card { name: string; group: string; height: number; width: number }

export function buildGallery(): Card[] {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(join(OUT, "components"), { recursive: true });
  writeFileSync(join(OUT, "tokens.css"), toCSS(loadTokens(join(DS, "tokens.json"))));
  cpSync(join(DS, "components/bundle.css"), join(OUT, "bundle.css"));
  cpSync(join(DS, "components/bundle.js"), join(OUT, "bundle.js"));
  cpSync(join(DS, "assets"), join(OUT, "assets"), { recursive: true });
  const cards: Card[] = [];
  for (const name of readdirSync(join(DS, "components")).sort()) {
    const p = join(DS, "components", name, "preview.html");
    try { statSync(p); } catch { continue; }
    const html = readFileSync(p, "utf8");
    const marker = /^<!-- @dsCard([^>]*)-->/.exec(html)?.[1] ?? "";
    const attr = (k: string) => new RegExp(`${k}=(?:"([^"]*)"|(\\d+))`).exec(marker);
    const group = attr("group")?.[1] ?? "Other";
    const height = Number(attr("height")?.[2] ?? 120);
    const width = Number(attr("width")?.[2] ?? 640);
    for (const theme of ["light", "dark"]) {
      const pre = `<link rel="stylesheet" href="../tokens.css"><link rel="stylesheet" href="../bundle.css"><script src="../bundle.js"></script>`;
      const out = html
        .replace(/<html([^>]*)>/i, `<html$1 data-theme="${theme}">`)
        .replace(/<head>/i, `<head>${pre}`);
      writeFileSync(join(OUT, "components", `${name}.${theme}.html`), out);
    }
    cards.push({ name, group, height, width });
  }
  const order = ["Cover"];
  cards.sort((a, b) => (order.indexOf(b.name) - order.indexOf(a.name)) || a.group.localeCompare(b.group) || a.name.localeCompare(b.name));
  const rows = cards.map((c) => `<section><h2>${c.group} · ${c.name}</h2><div class="pair">${["light", "dark"].map((t) =>
    `<iframe src="components/${c.name}.${t}.html" style="width:${c.width}px;height:${c.height}px" loading="lazy"></iframe>`).join("")}</div></section>`).join("\n");
  writeFileSync(join(OUT, "index.html"), `<!doctype html><meta charset="utf-8"><title>Xiding gallery</title>
<style>body{margin:24px;font:14px system-ui;background:#ddd}h2{font-size:13px;margin:24px 0 8px}.pair{display:flex;gap:16px;flex-wrap:wrap}iframe{border:0;background:#fff}</style>
${rows}`);
  return cards;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const cards = buildGallery();
  console.log(`${cards.length} previews written to dist/gallery/`);
}
