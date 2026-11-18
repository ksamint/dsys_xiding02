/* Renders every preview headless with the preinstalled Playwright and writes PNGs to
   dist/shots/. Fails if a preview throws or renders blank. Usage: npm run shots [-- Name ...] [--dark] */
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildGallery } from "./gallery.ts";

interface Page {
  on(ev: "pageerror", fn: (e: Error) => void): void;
  goto(url: string, o?: { waitUntil?: string }): Promise<unknown>;
  evaluate<T>(fn: () => T): Promise<T>;
  screenshot(o: { path: string; fullPage?: boolean }): Promise<unknown>;
  waitForTimeout(ms: number): Promise<void>;
  close(): Promise<void>;
}
interface Browser { newPage(o: { viewport: { width: number; height: number }; deviceScaleFactor: number }): Promise<Page>; close(): Promise<void> }
const require = createRequire(import.meta.url);
let pw: { chromium: { launch(): Promise<Browser> } };
try { pw = require("playwright"); } catch { pw = require("/opt/node22/lib/node_modules/playwright"); }

const OUT = new URL("../dist/shots/", import.meta.url).pathname;
const DS = new URL("../design-system/", import.meta.url).pathname;
const GAL = new URL("../dist/gallery/components/", import.meta.url).pathname;
const args = process.argv.slice(2);
const themes = args.includes("--dark") ? ["light", "dark"] : ["light"];
const only = args.filter((a) => !a.startsWith("--"));
const scale = args.includes("--2x") ? 2 : 1;

mkdirSync(OUT, { recursive: true });
const cards = buildGallery().filter((c) => !only.length || only.includes(c.name));
const browser = await pw.chromium.launch();
let bad = 0;
for (const c of cards) {
  for (const theme of themes) {
    const page = await browser.newPage({ viewport: { width: c.width, height: c.height }, deviceScaleFactor: scale });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`file://${join(GAL, `${c.name}.${theme}.html`)}`, { waitUntil: "networkidle" }).catch(() => undefined);
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    await page.waitForTimeout(1800);
    if (args.includes("--fit") && theme === "light") {
      const h = await page.evaluate(() => Math.ceil(document.querySelector("body > *")?.getBoundingClientRect().bottom ?? 0));
      const file = join(DS, "components", c.name, "preview.html");
      const src = readFileSync(file, "utf8");
      if (h > 40 && h !== c.height) writeFileSync(file, src.replace(/^(<!-- @dsCard[^>]*?height=)\d+/, `$1${h}`));
      c.height = h;
    }
    const empty = await page.evaluate(() => document.body.innerText.trim().length + document.body.querySelectorAll("svg,img,canvas").length === 0);
    await page.screenshot({ path: join(OUT, `${c.name}.${theme}.png`), fullPage: true });
    if (errors.length || empty) { bad++; console.log(`FAIL  ${c.name} (${theme}): ${errors.join("; ") || "blank"}`); }
    else console.log(`ok    ${c.name} (${theme})`);
    await page.close();
  }
}
await browser.close();
if (bad) process.exit(1);
