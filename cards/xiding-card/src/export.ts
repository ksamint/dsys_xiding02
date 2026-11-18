// Exports: a print PDF of both sides, the sides as SVG, this page as a standalone HTML file with the design in
// it, and the design as JSON (which the page can import again). Files leave through the viewer's `downloads`
// capability, which asks the viewer before saving anything.

/** This page as it was written, captured before any card is drawn into it, without any design a previous export put in. */
const PAGE_SOURCE = ((): string => {
  const doc = document.documentElement.cloneNode(true) as HTMLElement;
  doc.querySelector("#xd-state")?.remove();
  return "<!doctype html>\n" + doc.outerHTML;
})();
// Tags are spelled in pieces in this script, so the page's HTML parser never mistakes a string for markup.
const TAG_SCRIPT = "<" + "script", TAG_END = "<" + "/script>", COMMENT_OPEN = "<" + "!--";

interface DownloadsApi { save(r: { filename: string; data: string | Blob | ArrayBuffer | ArrayBufferView }): Promise<unknown> }
let downloadsApi: DownloadsApi | null | undefined;
async function downloads(): Promise<DownloadsApi | null> {
  if (downloadsApi !== undefined) return downloadsApi;
  const c = window.claude as (ClaudeRuntime & { use(name: "downloads"): Promise<DownloadsApi | null> }) | undefined;
  try { downloadsApi = c?.use ? await c.use("downloads") : null; } catch { downloadsApi = null; }
  return downloadsApi;
}
function exportMsg(t: string): void { const el = document.getElementById("x-msg"); if (el) el.textContent = t; }
async function saveFile(filename: string, data: string | Blob | ArrayBuffer | Uint8Array): Promise<void> {
  const dl = await downloads();
  if (!dl) { exportMsg("Saving files is not available in this view. Open the page in claude.ai to export."); return; }
  try {
    await dl.save({ filename, data });
    exportMsg(`已导出 · Saved ${filename}`);
  } catch (e) {
    const code = (e as { code?: string } | null)?.code;
    exportMsg(code === "declined" ? "Export cancelled." : code === "rate_limited" ? "Another save is waiting for an answer; try again in a moment." : "This file could not be saved here.");
  }
}
const stamp = (): string => { const d = new Date(), p = (n: number): string => String(n).padStart(2, "0"); return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`; };
const fileBase = (): string => { const p = state.data[state.person]; return `西顶名片-${(p?.nameZh || "card").replace(/[\\/:*?"<>|]/g, "")}-${LAYOUTS[state.logo].zh}`; };

// ---- a side, drawn standalone ----
/** One side, drawn off screen with every move, copy and retyped line applied, in a viewBox that shows `pad` mm around the trim. */
function standaloneSide(side: "front" | "back", pad: number): SVGSVGElement {
  const p = state.data[state.person] ?? PEOPLE[0]!, key = side === "front" ? `${state.logo}:front` : BACK_KEY;
  const inner = side === "front" ? front(p, state.inks, state.logo, state.rings, state.field) : back(state.inks);
  const host = document.createElement("div");
  host.style.cssText = "position:absolute;left:-10000px;top:0;width:960px";
  host.innerHTML = sheet(inner, side, key, false);
  document.body.appendChild(host);
  const svg = host.querySelector("svg") as SVGSVGElement;
  svg.setAttribute("viewBox", `${-pad} ${-pad} ${W + 2 * pad} ${H + 2 * pad}`);
  svg.setAttribute("width", "960");
  applyOverrides(svg, key);
  return svg;
}
function dropHost(svg: SVGSVGElement): void { svg.parentElement?.remove(); }

// ---- SVG ----
/** A side as an SVG file: millimetre-sized with 2 mm bleed and crop marks, the VI outlines inlined, fonts named. */
function sideSvgText(side: "front" | "back"): string {
  const pad = 8, svg = standaloneSide(side, pad);
  svg.setAttribute("width", `${W + 2 * pad}mm`);
  svg.setAttribute("height", `${H + 2 * pad}mm`);
  svg.querySelector("g[data-overlay]")?.remove();
  svg.querySelectorAll("[style]").forEach((e) => { if ((e as HTMLElement).style.display !== "none") e.removeAttribute("style"); });
  svg.querySelectorAll("[style]").forEach((e) => e.remove()); // hidden elements stay out of print
  const defs = (["vi-dots", "vi-zh"] as const).map((id) => { const d = document.getElementById(id)?.getAttribute("d") ?? ""; return `<path id="${id}" d="${d}"/>`; }).join("");
  let marks = "";
  for (const [cx, cy] of [[0, 0], [W, 0], [0, H], [W, H]] as const) {
    const sx = cx === 0 ? -1 : 1, sy = cy === 0 ? -1 : 1;
    marks += `<line x1="${cx + sx * 3}" y1="${cy}" x2="${cx + sx * 7}" y2="${cy}" stroke="#000" stroke-width=".15"/><line x1="${cx}" y1="${cy + sy * 3}" x2="${cx}" y2="${cy + sy * 7}" stroke="#000" stroke-width=".15"/>`;
  }
  const body = new XMLSerializer().serializeToString(svg)
    .replace(/<svg([^>]*)>/, `<svg$1><style>@import url("https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&amp;family=Noto+Sans+SC:wght@400;500&amp;family=Noto+Serif+SC:wght@500;600;700&amp;display=swap");</style><defs>${defs}</defs>`)
    .replace(/<\/svg>$/, `<g id="crop-marks">${marks}</g></svg>`);
  dropHost(svg);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${COMMENT_OPEN} 西頂廣仁宮 business card, ${side}: trim 90 × 54 mm, bleed 2 mm, crop marks. Fonts: Noto Serif SC, Instrument Sans, Noto Sans SC. Convert text to outlines before print. -->\n${body}`;
}
async function exportSvg(): Promise<void> {
  await saveFile(`${fileBase()}-正面-front-${stamp()}.svg`, sideSvgText("front"));
  await saveFile(`${fileBase()}-背面-back-${stamp()}.svg`, sideSvgText("back"));
}

// ---- print PDF: each side drawn at 600 dpi with the page's own fonts, bleed and crop marks around it ----
const DPI = 600;
function inherited(el: Element, name: string): string | null {
  for (let e: Element | null = el; e && e.tagName.toLowerCase() !== "svg"; e = e.parentElement) {
    const v = e.getAttribute(name);
    if (v !== null) return v;
  }
  return null;
}
function hiddenEl(el: Element): boolean {
  for (let e: Element | null = el; e && e.tagName.toLowerCase() !== "svg"; e = e.parentElement) if ((e as SVGElement).style?.display === "none") return true;
  return false;
}
/** Draw a side onto a canvas: rects, circles, lines, paths, the VI outlines and type, each with its own transform. */
function drawSide(svg: SVGSVGElement, pad: number): HTMLCanvasElement {
  const k = DPI / 25.4, wmm = W + 2 * pad, hmm = H + 2 * pad;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(wmm * k); canvas.height = Math.round(hmm * k);
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const root = svg.getScreenCTM()?.inverse();
  const card = svg.querySelector("g[data-card]");
  if (!root || !card) return canvas;
  card.querySelectorAll("rect, circle, line, path, use, text, polygon").forEach((el) => {
    if (hiddenEl(el) || el.closest("defs")) return;
    const ctm = (el as SVGGraphicsElement).getScreenCTM();
    if (!ctm) return;
    const m = root.multiply(ctm); // element → mm, as the root's viewBox maps them
    ctx.setTransform(k * m.a, k * m.b, k * m.c, k * m.d, k * (m.e + pad), k * (m.f + pad));
    const fill = inherited(el, "fill") ?? "#000", stroke = inherited(el, "stroke"), sw = Number(inherited(el, "stroke-width") ?? "1");
    const paint = (path: Path2D | null): void => {
      if (fill !== "none") { ctx.fillStyle = fill; if (path) ctx.fill(path); }
      if (stroke && stroke !== "none") { ctx.strokeStyle = stroke; ctx.lineWidth = sw; ctx.lineCap = (inherited(el, "stroke-linecap") as CanvasLineCap) ?? "butt"; if (path) ctx.stroke(path); }
    };
    const n = (a: string): number => Number(el.getAttribute(a) ?? "0");
    switch (el.tagName.toLowerCase()) {
      case "rect": { const p = new Path2D(); p.rect(n("x"), n("y"), n("width"), n("height")); paint(p); break; }
      case "circle": { const p = new Path2D(); p.arc(n("cx"), n("cy"), n("r"), 0, Math.PI * 2); paint(p); break; }
      case "line": { const p = new Path2D(); p.moveTo(n("x1"), n("y1")); p.lineTo(n("x2"), n("y2")); if (stroke && stroke !== "none") { ctx.strokeStyle = stroke; ctx.lineWidth = sw; ctx.stroke(p); } break; }
      case "polygon": { const pts = (el.getAttribute("points") ?? "").trim().split(/[\s,]+/).map(Number), p = new Path2D(); for (let i = 0; i + 1 < pts.length; i += 2) (i ? p.lineTo : p.moveTo).call(p, pts[i] ?? 0, pts[i + 1] ?? 0); p.closePath(); paint(p); break; }
      case "path": paint(new Path2D(el.getAttribute("d") ?? "")); break;
      case "use": {
        const id = (el.getAttribute("href") ?? el.getAttribute("xlink:href") ?? "").replace(/^#/, "");
        const d = document.getElementById(id)?.getAttribute("d");
        if (d) paint(new Path2D(d));
        break;
      }
      case "text": {
        const size = Number(el.getAttribute("font-size") ?? "2"), weight = el.getAttribute("font-weight") ?? "400";
        ctx.font = `${weight} ${size}px ${el.getAttribute("font-family") ?? SANS}`;
        const ls = parseFloat(el.getAttribute("letter-spacing") ?? "0");
        (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${ls * size}px`;
        const anchor = el.getAttribute("text-anchor");
        ctx.textAlign = anchor === "middle" ? "center" : anchor === "end" ? "right" : "left";
        ctx.textBaseline = "alphabetic";
        ctx.fillStyle = fill;
        ctx.fillText(el.textContent ?? "", n("x"), n("y"));
        break;
      }
    }
  });
  return canvas;
}
const enc = new TextEncoder();
/** A minimal PDF: one page per side, the side as a JPEG with bleed, crop marks in registration black, Trim and Bleed boxes set. */
function buildPdf(pages: { jpeg: Uint8Array; wPx: number; hPx: number }[], pad: number): Uint8Array {
  const pt = (mm: number): number => Math.round((mm * 72 / 25.4) * 1000) / 1000;
  const marksPad = 8, pw = W + 2 * marksPad, ph = H + 2 * marksPad, ox = marksPad - pad;
  const chunks: Uint8Array[] = [], offsets: number[] = [];
  let size = 0;
  const put = (b: Uint8Array | string): void => { const u = typeof b === "string" ? enc.encode(b) : b; chunks.push(u); size += u.length; };
  const obj = (n: number, body: (Uint8Array | string)[]): void => { offsets[n] = size; put(`${n} 0 obj\n`); body.forEach(put); put("\nendobj\n"); };
  put("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  const nPages = pages.length, first = 3; // 1 catalog, 2 pages, then per side: page, contents, image
  obj(1, ["<< /Type /Catalog /Pages 2 0 R >>"]);
  obj(2, [`<< /Type /Pages /Count ${nPages} /Kids [${pages.map((_, i) => `${first + i * 3} 0 R`).join(" ")}] >>`]);
  pages.forEach((pg, i) => {
    const pn = first + i * 3, cn = pn + 1, im = pn + 2;
    const bx = (mm: number): string => String(pt(mm));
    let marks = "q 0 0 0 1 K 0.4 w\n";
    for (const [cx, cy] of [[0, 0], [W, 0], [0, H], [W, H]] as const) {
      const sx = cx === 0 ? -1 : 1, sy = cy === 0 ? -1 : 1, X = marksPad + cx, Y = ph - (marksPad + cy);
      marks += `${bx(X + sx * 3)} ${bx(Y)} m ${bx(X + sx * 7)} ${bx(Y)} l S\n${bx(X)} ${bx(Y - sy * 3)} m ${bx(X)} ${bx(Y - sy * 7)} l S\n`;
    }
    marks += "Q\n";
    const content = `q ${bx(W + 2 * pad)} 0 0 ${bx(H + 2 * pad)} ${bx(ox)} ${bx(ox)} cm /Im0 Do Q\n${marks}`;
    obj(pn, [`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${bx(pw)} ${bx(ph)}] /BleedBox [${bx(ox)} ${bx(ox)} ${bx(ox + W + 2 * pad)} ${bx(ox + H + 2 * pad)}] ` +
      `/TrimBox [${bx(marksPad)} ${bx(marksPad)} ${bx(marksPad + W)} ${bx(marksPad + H)}] /Resources << /XObject << /Im0 ${im} 0 R >> >> /Contents ${cn} 0 R >>`]);
    obj(cn, [`<< /Length ${enc.encode(content).length} >>\nstream\n`, content, "\nendstream"]);
    obj(im, [`<< /Type /XObject /Subtype /Image /Width ${pg.wPx} /Height ${pg.hPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${pg.jpeg.length} >>\nstream\n`, pg.jpeg, "\nendstream"]);
  });
  const infoN = first + nPages * 3;
  obj(infoN, [`<< /Title (Xiding business card) /Producer (Xiding card editor) /Creator (cards/xiding-card) >>`]);
  const xref = size, count = infoN + 1;
  let x = `xref\n0 ${count}\n0000000000 65535 f \n`;
  for (let n = 1; n < count; n++) x += `${String(offsets[n] ?? 0).padStart(10, "0")} 00000 n \n`;
  put(x);
  put(`trailer\n<< /Size ${count} /Root 1 0 R /Info ${infoN} 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const out = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) { out.set(c, at); at += c.length; }
  return out;
}
async function canvasJpeg(c: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob | null>((res) => c.toBlob(res, "image/jpeg", 0.95));
  return new Uint8Array(blob ? await blob.arrayBuffer() : new ArrayBuffer(0));
}
/** Both sides as a two-page print PDF, from the design as it stands now. */
async function makePrintPdf(): Promise<Uint8Array> {
  if (document.fonts?.ready) await document.fonts.ready;
  const pages: { jpeg: Uint8Array; wPx: number; hPx: number }[] = [];
  for (const side of ["front", "back"] as const) {
    const svg = standaloneSide(side, BLEED), c = drawSide(svg, BLEED);
    dropHost(svg);
    pages.push({ jpeg: await canvasJpeg(c), wPx: c.width, hPx: c.height });
  }
  return buildPdf(pages, BLEED);
}
async function exportPdf(): Promise<void> {
  exportMsg("正在生成 PDF · Building the PDF…");
  await saveFile(`${fileBase()}-print-${stamp()}.pdf`, await makePrintPdf());
}

// ---- this page, and the design as data ----
async function exportPage(): Promise<void> {
  const data = JSON.stringify(savedState()).replace(/</g, "\\u003c");
  // the design goes in just before the page's own script, which reads it on load
  const mainStart = new RegExp(`(${TAG_SCRIPT}>\\s*\\(function \\(\\) \\{\\s*"use strict";)`);
  const html = PAGE_SOURCE.replace(mainStart, () => `${TAG_SCRIPT} type="application/json" id="xd-state">${data}${TAG_END}\n` + (PAGE_SOURCE.match(mainStart)?.[1] ?? ""));
  await saveFile(`${fileBase()}-page-${stamp()}.html`, html);
}
async function exportJson(): Promise<void> {
  await saveFile(`${fileBase()}-design-${stamp()}.json`, JSON.stringify({ format: "xiding-card/1", ...savedState() }, null, 2));
}
async function importJson(file: File): Promise<void> {
  try {
    const v = JSON.parse(await file.text()) as Partial<SavedState>;
    const before = editSnapshot();
    applySaved(v);
    syncControls(); fillForm();
    commit(before, true, `导入 Import · ${file.name}`);
    exportMsg(`已导入 · Imported ${file.name}`);
  } catch {
    exportMsg("That file is not a design exported from this page.");
  }
}
/** A page exported with its design starts from that design. */
function loadEmbeddedState(): void {
  const el = document.getElementById("xd-state");
  if (!el?.textContent) return;
  try { applySaved(JSON.parse(el.textContent) as Partial<SavedState>); } catch { /* start from the defaults */ }
}
