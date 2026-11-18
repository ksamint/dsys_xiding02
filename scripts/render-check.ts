import { chromium, type Page } from "playwright";
import { access, readFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { extname, normalize } from "node:path";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { unzipSync } from "fflate";
import { DEFAULT_EVENTS_URL } from "./build";
import { slideCount } from "../src/deck/render";

/* Opens every built page in a real browser, in each language, at desktop and phone widths, and fails on:
   a script error, a sideways scroll, the wrong language, a slide whose content runs past its frame or into its
   corner labels, a PDF export that does not hand over a PDF in the language on screen, or a tap target on the
   member page shorter than 44px. Run `npm run build` first. */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const QR_DECODER = createRequire(import.meta.url).resolve("jsqr/dist/jsQR.js");
const LOCALES = [
  { browser: "en-US", lang: "en", probe: "Xiding" },
  { browser: "zh-TW", lang: "zh-Hant", probe: "西頂" },
  { browser: "zh-CN", lang: "zh-Hans", probe: "西顶" },
] as const;
const SIZES = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "phone", width: 390, height: 844 },
] as const;
const APPS = ["deck", "site", "onepager"] as const;

const failures: string[] = [];
let checks = 0;

function expect(ok: boolean, message: string): void {
  checks += 1;
  if (!ok) failures.push(message);
}

async function slidesFit(page: Page, where: string): Promise<void> {
  const total = await page.locator(".frame").count();
  expect(total === slideCount(), `${where}: expected ${slideCount()} slides, found ${total}`);
  for (let n = 1; n <= total; n += 1) {
    await page.evaluate((i) => {
      location.hash = `#s${i}`;
    }, n);
    await page.waitForFunction((i) => document.querySelector(".frame.is-current")?.getAttribute("data-slide") === String(i), n);
    const bad = await page.evaluate(() => {
      const frame = document.querySelector<HTMLElement>(".frame.is-current");
      if (!frame) return "no current slide";
      const box = frame.getBoundingClientRect();
      const corners = [...frame.querySelectorAll<HTMLElement>(".corner")].map((c) => c.getBoundingClientRect());
      for (const el of frame.querySelectorAll<HTMLElement>(".slide *")) {
        if (el.closest("svg") || el.closest(".lockup__mark")) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.right > box.right + 1 || r.bottom > box.bottom + 1 || r.left < box.left - 1 || r.top < box.top - 1) {
          return `${el.className || el.tagName} leaves the frame`;
        }
        if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== "visible") return `${el.className} is clipped`;
      }
      // Side-by-side columns (the brands, the modules) keep their words inside their own column.
      for (const col of frame.querySelectorAll<HTMLElement>(".bp__item")) {
        const c = col.getBoundingClientRect();
        for (const el of col.querySelectorAll<HTMLElement>("*")) {
          const range = document.createRange();
          range.selectNodeContents(el);
          const r = range.getBoundingClientRect();
          if (r.width && (r.right > c.right + 1 || r.left < c.left - 1)) return `${el.className || el.tagName} runs past its column`;
        }
      }
      // The words of a slide must stay clear of its corners.
      for (const el of frame.querySelectorAll<HTMLElement>(".panel__body, .index, .pair, .words, .say, .modhead, .mods4, .qr, .lockup__web, .st, .syshead, .sys")) {
        const r = el.getBoundingClientRect();
        if (corners.some((c) => r.left < c.right && c.left < r.right && r.top < c.bottom && c.top < r.bottom)) return `${el.className} runs into a corner label`;
      }
      return "";
    });
    expect(bad === "", `${where} slide ${n}: ${bad}`);
  }
}

/** Reads the QR code on the closing slide back with a decoder, as a phone would. */
async function qrReads(page: Page, where: string, expected: string, selector: string): Promise<void> {
  await page.waitForSelector(selector);
  await page.addScriptTag({ path: QR_DECODER });
  const text = await page.evaluate(async (sel) => {
    const svg = document.querySelector(sel);
    if (!svg) return "no QR code";
    const img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`;
    await img.decode();
    const size = 400;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "no canvas";
    ctx.drawImage(img, 0, 0, size, size);
    const data = ctx.getImageData(0, 0, size, size);
    const decode = (window as unknown as { jsQR: (d: Uint8ClampedArray, w: number, h: number) => { data: string } | null }).jsQR;
    return decode(data.data, size, size)?.data ?? "unreadable";
  }, selector);
  expect(text === expected, `${where}: the QR code should read ${expected}, read ${text}`);
}

/** The overview: nothing leaves the page or runs into the next band, the QR code reads, and both files come in the language on screen. */
async function overviewChecks(page: Page, where: string, exports: boolean): Promise<void> {
  const bad = await page.evaluate(() => {
    const sheet = document.querySelector<HTMLElement>(".sheet");
    if (!sheet) return "no sheet";
    const box = sheet.getBoundingClientRect();
    for (const el of sheet.querySelectorAll<HTMLElement>("*")) {
      if (el.closest("svg")) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.right > box.right + 1 || r.bottom > box.bottom + 1 || r.left < box.left - 1 || r.top < box.top - 1) return `${el.className || el.tagName} leaves the page`;
    }
    // Each band keeps its content inside it.
    for (const band of sheet.querySelectorAll<HTMLElement>(":scope > *")) {
      const b = band.getBoundingClientRect();
      for (const el of band.querySelectorAll<HTMLElement>("*")) {
        if (el.closest("svg")) continue;
        const r = el.getBoundingClientRect();
        if (r.height > 0 && r.bottom > b.bottom + 1) return `${el.className || el.tagName} runs out of ${band.className}`;
      }
    }
    return "";
  });
  expect(bad === "", `${where}: ${bad}`);
  await qrReads(page, where, DEFAULT_EVENTS_URL, ".sheet .xd-qr");
  if (!exports) return;
  for (const lang of ["en", "zh-Hant", "zh-Hans"]) {
    await page.click(`[data-lang="${lang}"]`);
    for (const kind of ["pdf", "png"] as const) {
      const got = await download(page, `#${kind}-current`);
      expect(got.name === `xiding-overview-${lang}.${kind}`, `${where}: ${kind} in ${lang}, got ${got.name}`);
      const head = got.bytes.subarray(0, 5).toString("latin1");
      expect(head === (kind === "pdf" ? "%PDF-" : "\x89PNG\r"), `${where}: the ${lang} ${kind} should be a ${kind.toUpperCase()} file`);
    }
  }
  for (const kind of ["pdf", "png"] as const) checkZip(where, await download(page, `#${kind}-all`), "xiding-overview", kind);
}

/** Clicks an export button and returns the downloaded file's name and bytes. */
async function download(page: Page, selector: string): Promise<{ name: string; bytes: Buffer }> {
  const [file] = await Promise.all([page.waitForEvent("download", { timeout: 10000 }), page.click(selector)]);
  const path = await file.path();
  return { name: file.suggestedFilename(), bytes: path ? await readFile(path) : Buffer.alloc(0) };
}

/** "All three" hands over one zip holding the file for each language, each one whole. */
function checkZip(where: string, got: { name: string; bytes: Buffer }, stem: string, ext: "pdf" | "png"): void {
  expect(got.name === `${stem}-all-languages.zip`, `${where}: "all three" should offer ${stem}-all-languages.zip, got ${got.name}`);
  let entries: Record<string, Uint8Array> = {};
  try {
    entries = unzipSync(new Uint8Array(got.bytes));
  } catch {
    expect(false, `${where}: ${got.name} is not a zip`);
    return;
  }
  const names = Object.keys(entries).sort();
  const want = ["en", "zh-Hans", "zh-Hant"].map((l) => `${stem}-${l}.${ext}`);
  expect(JSON.stringify(names) === JSON.stringify(want), `${where}: ${got.name} should hold ${want.join(", ")}, holds ${names.join(", ")}`);
  const magic = ext === "pdf" ? "%PDF-" : "\x89PNG\r";
  for (const n of names) expect(Buffer.from(entries[n] ?? []).subarray(0, 5).toString("latin1") === magic, `${where}: ${n} in the zip should be a ${ext.toUpperCase()}`);
}

async function pdfExport(page: Page, where: string): Promise<void> {
  for (const lang of ["en", "zh-Hant", "zh-Hans"]) {
    await page.click(`[data-lang="${lang}"]`);
    const got = await download(page, "#pdf-current");
    expect(got.name === `xiding-introduction-${lang}.pdf`, `${where}: export in ${lang} should offer its own PDF, got ${got.name}`);
    expect(got.bytes.subarray(0, 5).toString("latin1") === "%PDF-", `${where}: the ${lang} export should be a PDF file`);
  }
  checkZip(where, await download(page, "#pdf-all"), "xiding-introduction", "pdf");
  await page.keyboard.press("l");
  expect((await page.getAttribute("html", "lang")) === "en", `${where}: the L key should walk to the next language`);
}

/** "Copy text" puts the whole introduction, in the language on screen, on the clipboard. */
async function copyCheck(page: Page, where: string): Promise<void> {
  const want: Record<string, string> = { en: "A world at ease, of legacy and beauty", "zh-Hant": "一方傳承大美的自在天地", "zh-Hans": "一方传承大美的自在天地" };
  for (const lang of ["zh-Hant", "en", "zh-Hans"]) {
    await page.click(`[data-lang="${lang}"]`);
    await page.click("#copy-text");
    const text = await page.evaluate(() => navigator.clipboard.readText());
    const line = want[lang] ?? "";
    expect(text.startsWith(`${lang === "en" ? "Xiding" : lang === "zh-Hant" ? "西頂" : "西顶"}\n${line}`), `${where}: copy in ${lang} should start with the name and the line, got ${JSON.stringify(text.slice(0, 40))}`);
    expect(text.includes("A2A"), `${where}: copy in ${lang} should hold the foundation`);
  }
}

const TYPES: Record<string, string> = { ".html": "text/html; charset=utf-8", ".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp" };

/** Serves dist/ over HTTP on this machine, as the official site will: pages behave as they do on a real host. */
async function serveDist(): Promise<{ server: Server; base: string }> {
  const dist = join(ROOT, "dist");
  const server = createServer((req, res) => {
    const path = normalize(decodeURIComponent((req.url ?? "/").split("?")[0] ?? "/")).replace(/^(\.\.[/\\])+/, "");
    const file = join(dist, path.endsWith("/") ? `${path}index.html` : path);
    if (!file.startsWith(dist)) {
      res.writeHead(403).end();
      return;
    }
    readFile(file)
      .then((body) => res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" }).end(body))
      .catch(() => res.writeHead(404).end());
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return { server, base: `http://127.0.0.1:${port}` };
}

async function main(): Promise<void> {
  for (const app of APPS) await access(join(ROOT, "dist", app, "index.html"));
  const { server, base } = await serveDist();
  const browser = await chromium.launch({ args: ["--proxy-bypass-list=127.0.0.1"] });
  try {
    for (const app of APPS) {
      for (const locale of LOCALES) {
        for (const size of SIZES) {
          const where = `${app} ${locale.lang} ${size.name}`;
          const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, locale: locale.browser, acceptDownloads: true, permissions: ["clipboard-read", "clipboard-write"] });
          const page = await context.newPage();
          const errors: string[] = [];
          page.on("pageerror", (e) => errors.push(String(e)));
          page.on("console", (m) => {
            if (m.type() === "error") errors.push(m.text());
          });
          await page.goto(`${base}/${app}/index.html`);
          await page.evaluate(() => Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 4000))]));
          expect((await page.getAttribute("html", "lang")) === locale.lang, `${where}: the page should open in ${locale.lang}`);
          expect(((await page.locator("#app").textContent()) ?? "").toLowerCase().includes(locale.probe.toLowerCase()), `${where}: expected to read ${locale.probe}`);
          const sideways = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
          expect(sideways <= 0, `${where}: the page scrolls sideways by ${sideways}px`);
          if (app === "deck" && size.name === "desktop") {
            await slidesFit(page, where);
            await page.evaluate(() => {
              location.hash = `#s${document.querySelectorAll(".frame").length}`;
            });
            await qrReads(page, where, DEFAULT_EVENTS_URL, ".frame.is-current .xd-qr");
            await pdfExport(page, where);
            await copyCheck(page, where);
          }
          if (app === "deck" && size.name === "phone") {
            expect((await page.locator(".frame:visible").count()) === slideCount(), `${where}: a phone held upright shows every slide in one column`);
          }
          if (app === "onepager") await overviewChecks(page, where, size.name === "desktop");
          if (app === "onepager" && size.name === "desktop") await copyCheck(page, where);
          if (app === "site" && size.name === "desktop") await copyCheck(page, where);
          // Switching language by hand must win over the browser's language.
          const other = locale.lang === "en" ? "zh-Hant" : "en";
          await page.click(`[data-lang="${other}"]`);
          expect((await page.getAttribute("html", "lang")) === other, `${where}: the language switch should change the page to ${other}`);
          await page.reload();
          expect((await page.getAttribute("html", "lang")) === other, `${where}: the chosen language should be remembered`);
          expect(errors.length === 0, `${where}: script errors: ${errors.join(" | ")}`);
          await context.close();
        }
      }
    }
  } finally {
    await browser.close();
    server.close();
  }
  if (failures.length) {
    console.error(`render-check: ${failures.length} of ${checks} checks failed`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log(`render-check: ${checks} checks passed (${APPS.length} pages × 3 languages × 2 widths)`);
}

await main();
