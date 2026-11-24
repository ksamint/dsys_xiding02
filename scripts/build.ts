import { build } from "esbuild";
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PHOTOS, setPhotoSources } from "../src/shared/photo";
import { APPS, type AppSpec, type Links } from "./apps";
import { exportPdfs, exportPngs } from "./export-pdf";
import { slideCount } from "../src/deck/render";

/* Builds every page twice from the same sources:
     dist/<app>/index.html      a complete document, for hosting on the official site
     dist/artifact/<app>.html   the same page as a fragment, for publishing as a Claude Artifact preview
   Styles and script are inlined; the web fonts load from Google Fonts.
   Beside the pages go the pictures found in public/photos/ (one per photo slot) and, for the deck, one PDF per
   language under pdf/, printed from the built deck, so "Export PDF" always hands over the deck as it stands. */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");

const FONTS =
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Instrument+Sans:wght@400;500;600&family=Noto+Sans+SC:wght@400;500&family=Noto+Sans+TC:wght@400;500&family=Noto+Serif+SC:wght@500;600;700&family=Noto+Serif+TC:wght@500;600;700&display=swap";

/** `56u` in a stylesheet is 56 slide pixels: see src/deck/deck.css. */
export function expandSlideUnits(css: string): string {
  return css.replace(/(-?\d*\.?\d+)u\b/g, (_m, n: string) => `calc(var(--u) * ${n})`);
}

function minifyCss(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

async function styles(app: AppSpec): Promise<string> {
  const parts: string[] = [];
  for (const file of app.css) {
    const css = await readFile(join(ROOT, file), "utf8");
    parts.push(app.slideUnits && file.includes(app.id) ? expandSlideUnits(css) : css);
  }
  return minifyCss(parts.join("\n"));
}

async function script(app: AppSpec): Promise<string> {
  const result = await build({
    entryPoints: [join(ROOT, app.entry)],
    bundle: true,
    format: "iife",
    target: "es2020",
    minify: true,
    write: false,
    legalComments: "none",
    logLevel: "warning",
  });
  const out = result.outputFiles[0];
  if (!out) throw new Error(`No script produced for ${app.id}`);
  return out.text.replace(/<\/script/gi, "<\\/script");
}

function linkAttrs(links: Links, photos: Record<string, string>): string {
  const attrs = Object.entries(links)
    .map(([k, v]) => (v ? ` data-link-${k}="${v.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}"` : ""))
    .join("");
  const json = JSON.stringify(photos).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  return `${attrs} data-photos="${json}"`;
}

/** public/photos/<slot id>.(jpg|jpeg|png|webp) fills that slot. Anything else in the folder is ignored. */
async function findPhotos(): Promise<Record<string, string>> {
  const dir = join(ROOT, "public", "photos");
  let names: string[] = [];
  try {
    names = await readdir(dir);
  } catch {
    return {};
  }
  const found: Record<string, string> = {};
  for (const name of names.sort()) {
    const m = /^([a-z0-9-]+)\.(jpg|jpeg|png|webp)$/.exec(name);
    if (m && m[1] && m[1] in PHOTOS) found[m[1]] = `photos/${name}`;
  }
  return found;
}

async function copyInto(files: readonly string[], fromDir: string, toDir: string): Promise<void> {
  if (!files.length) return;
  await mkdir(toDir, { recursive: true });
  for (const f of files) await copyFile(join(fromDir, f), join(toDir, f));
}

/** The QR code on the deck and the site leads to the member calendar on the official site. */
export const DEFAULT_EVENTS_URL = "https://example.org/members/#calendar";

function eventsUrl(): string {
  const v = (process.env["XIDING_EVENTS_URL"] ?? "").trim();
  if (!v) return DEFAULT_EVENTS_URL;
  if (!/^https:\/\/[^\s"'<>]+$/.test(v)) throw new Error("XIDING_EVENTS_URL must be an https address");
  return v;
}

/** Hosted, the pages link to each other, and to the member calendar where the QR code leads. The member calendar and
    the H5 app are built in the member-app repository; the app's link shows only when XIDING_APP_URL (https) is given. */
function hostedLinks(): Links {
  const app = (process.env["XIDING_APP_URL"] ?? "").trim();
  if (app && !/^https:\/\/[^\s"'<>]+$/.test(app)) throw new Error("XIDING_APP_URL must be an https address");
  return { deck: "../deck/index.html", site: "../site/index.html", members: eventsUrl(), programmes: app, events: eventsUrl() };
}

/** Artifact previews link to each other only when their addresses are given: XIDING_LINK_DECK, XIDING_LINK_SITE, XIDING_LINK_MEMBERS, XIDING_LINK_PROGRAMMES. */
function artifactLinks(): Links {
  const env = (k: string): string => {
    const v = process.env[k] ?? "";
    return /^https:\/\/claude\.ai\/[\w\-/]+$/.test(v) ? v : "";
  };
  return { deck: env("XIDING_LINK_DECK"), site: env("XIDING_LINK_SITE"), members: env("XIDING_LINK_MEMBERS"), programmes: env("XIDING_LINK_PROGRAMMES"), events: eventsUrl() };
}

function fragment(app: AppSpec, css: string, js: string, links: Links, photos: Record<string, string>): string {
  return `<title>${app.title}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="${FONTS}">
<style>
${css}
</style>
<div id="app" class="${app.rootClass}"${linkAttrs(links, photos)}>${app.prerender(links)}</div>
<script>${js}</script>
`;
}

function document(app: AppSpec, css: string, js: string, links: Links, photos: Record<string, string>): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${app.title}</title>
<meta name="description" content="${app.description}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<style>
:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
[hidden]{display:none!important}
img{max-width:100%}
${css}
</style>
</head>
<body>
<div id="app" class="${app.rootClass}"${linkAttrs(links, photos)}>${app.prerender(links)}</div>
<script>${js}</script>
</body>
</html>
`;
}

async function main(): Promise<void> {
  await rm(DIST, { recursive: true, force: true });
  await mkdir(join(DIST, "artifact"), { recursive: true });
  const photos = await findPhotos();
  const photoFiles = Object.values(photos).map((p) => p.replace(/^photos\//, ""));
  setPhotoSources(photos);
  for (const app of APPS) {
    const [css, js] = await Promise.all([styles(app), script(app)]);
    await mkdir(join(DIST, app.id), { recursive: true });
    const hosted = document(app, css, js, hostedLinks(), photos);
    const preview = fragment(app, css, js, artifactLinks(), photos);
    await writeFile(join(DIST, app.id, "index.html"), hosted);
    await writeFile(join(DIST, "artifact", `${app.artifact}.html`), preview);
    await copyInto(photoFiles, join(ROOT, "public", "photos"), join(DIST, app.id, "photos"));
    console.log(`${app.id}: ${(hosted.length / 1024).toFixed(1)} kB hosted, ${(preview.length / 1024).toFixed(1)} kB preview`);
  }
  await copyInto(photoFiles, join(ROOT, "public", "photos"), join(DIST, "artifact", "photos"));
  const deckPdfs = await exportPdfs({
    html: join(DIST, "deck", "index.html"),
    outDir: join(DIST, "deck", "pdf"),
    name: (l) => `xiding-introduction-${l}.pdf`,
    width: "13.333in",
    height: "7.5in",
    pages: slideCount(),
    viewport: { width: 1280, height: 720 },
  });
  const overview = { html: join(DIST, "onepager", "index.html"), name: (l: string) => `xiding-overview-${l}`, viewport: { width: 794, height: 1123 } };
  const overviewPdfs = await exportPdfs({ ...overview, outDir: join(DIST, "onepager", "pdf"), name: (l) => `${overview.name(l)}.pdf`, width: "210mm", height: "297mm", pages: 1 });
  const overviewPngs = await exportPngs({ ...overview, outDir: join(DIST, "onepager", "png"), name: (l) => `${overview.name(l)}.png`, selector: ".op-frame" });
  await copyInto(deckPdfs.map((p) => basename(p)), join(DIST, "deck", "pdf"), join(DIST, "artifact", "pdf"));
  await copyInto(overviewPdfs.map((p) => basename(p)), join(DIST, "onepager", "pdf"), join(DIST, "artifact", "pdf"));
  await copyInto(overviewPngs.map((p) => basename(p)), join(DIST, "onepager", "png"), join(DIST, "artifact", "png"));
  const pdfs = [...deckPdfs, ...overviewPdfs];
  console.log(`photos: ${photoFiles.length} of ${Object.keys(PHOTOS).length} slots filled; pdf: ${pdfs.length} files; png: ${overviewPngs.length} files`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main();
}
