import { chromium, type Page } from "playwright";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export const PRINT_LOCALES = ["en", "zh-Hant", "zh-Hans"] as const;

/* Google Fonts hands a modern browser variable fonts, and Chrome embeds those in a PDF as Type 3 fonts, which some
   readers render badly or report as errors. A plain client is handed one static TrueType file per weight, which
   Chrome embeds as an ordinary font. So, for the PDF only, the font stylesheet is fetched as a plain client. */
const PLAIN_CLIENT = "Wget/1.21";
const cssCache = new Map<string, string>();

async function useStaticFonts(page: Page): Promise<void> {
  await page.route("https://fonts.googleapis.com/css2**", async (route) => {
    const url = route.request().url();
    let css = cssCache.get(url);
    if (css === undefined) {
      const res = await fetch(url, { headers: { "User-Agent": PLAIN_CLIENT } });
      if (!res.ok) throw new Error(`Google Fonts answered ${res.status} for the PDF fonts`);
      css = await res.text();
      cssCache.set(url, css);
    }
    await route.fulfill({ status: 200, contentType: "text/css; charset=utf-8", body: css });
  });
}

async function fontsReady(page: Page, what: string): Promise<void> {
  // Whole TrueType files are larger than the web's slices: give them time, then fail loudly rather than print a fallback.
  const ready = await page.evaluate(async () => {
    await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 90000))]);
    return document.fonts.status === "loaded";
  });
  if (!ready) throw new Error(`The fonts did not finish loading for ${what}`);
}

export interface PrintSpec {
  /** The built page to print. */
  readonly html: string;
  readonly outDir: string;
  readonly name: (locale: string) => string;
  readonly width: string;
  readonly height: string;
  /** How many pages each PDF must have. */
  readonly pages: number;
  /** Viewport for laying the page out before printing. */
  readonly viewport: { width: number; height: number };
}

/** Prints the page to one PDF per language. Refuses a PDF with a Type 3 font or the wrong number of pages. */
export async function exportPdfs(spec: PrintSpec): Promise<string[]> {
  await mkdir(spec.outDir, { recursive: true });
  const written: string[] = [];
  const browser = await chromium.launch();
  try {
    for (const lang of PRINT_LOCALES) {
      const page = await browser.newPage({ viewport: spec.viewport, colorScheme: "light" });
      await useStaticFonts(page);
      await page.goto(`${pathToFileURL(spec.html).href}?lang=${lang}`);
      await fontsReady(page, spec.name(lang));
      await page.emulateMedia({ media: "print", colorScheme: "light" });
      const path = join(spec.outDir, spec.name(lang));
      const pdf = await page.pdf({ path, width: spec.width, height: spec.height, printBackground: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
      const bytes = pdf.toString("latin1");
      if (bytes.includes("/Type3")) throw new Error(`${spec.name(lang)} embeds a Type 3 font: a variable font slipped past the static-font fetch`);
      if (!bytes.includes("/FontFile2")) throw new Error(`${spec.name(lang)} embeds no TrueType font`);
      const pages = (bytes.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
      if (pages !== spec.pages) throw new Error(`${spec.name(lang)} has ${pages} pages, expected ${spec.pages}`);
      written.push(path);
      await page.close();
    }
  } finally {
    await browser.close();
  }
  return written;
}

export interface ImageSpec {
  readonly html: string;
  readonly outDir: string;
  readonly name: (locale: string) => string;
  /** The element to capture. */
  readonly selector: string;
  readonly viewport: { width: number; height: number };
}

/** Saves the page as a PNG per language at twice its size, for sharing in chat apps. */
export async function exportPngs(spec: ImageSpec): Promise<string[]> {
  await mkdir(spec.outDir, { recursive: true });
  const written: string[] = [];
  const browser = await chromium.launch();
  try {
    for (const lang of PRINT_LOCALES) {
      const page = await browser.newPage({ viewport: spec.viewport, deviceScaleFactor: 2, colorScheme: "light" });
      await page.goto(`${pathToFileURL(spec.html).href}?lang=${lang}`);
      await fontsReady(page, spec.name(lang));
      await page.emulateMedia({ media: "print", colorScheme: "light" });
      const path = join(spec.outDir, spec.name(lang));
      await page.locator(spec.selector).screenshot({ path });
      written.push(path);
      await page.close();
    }
  } finally {
    await browser.close();
  }
  return written;
}
