// The portrait card: one card in three layers, top to bottom. Its size is free (54 × 96 mm (9:16) by default, presets
// and sliders for others), and so is every border. Work in two steps:
//   结构 Structure: only the layers and blocks, with their sizes, to shape the card;
//   内容 Content: the type, logo, photos and QR placed on that structure. Each item can be turned off, and the
//   lines that remain close up, so the content never dictates the layout.
//   1 Identity: a vi-teal block holding the dot mark; on white, 西顶文化, the title, the name and the contacts.
//   2 Photographs: the site and the art space side by side. A photo dropped in fills its slot.
//   3 Pillars: the card's two brands (西顶艺术 and 西顶新知), the services each offers clients beneath it, and a QR code to the website.
// Shares the card's people, inks, VI outlines and type helpers (card.ts), and its editor: every part is a named
// element (el), so it can be dragged, scaled, rotated, retyped, hidden and locked on the canvas. The borders between
// the layers, the teal block's edge and the split between the photos have their own handles on the canvas.
// All measures in mm.

/** Read from the settings (S.pt*) each time the card is drawn, clamped to the card. */
/** PMY: the top and bottom margin, the side margin plus any inset kept clear for a platform's own buttons. */
let PMY = 4;
let PW = 54, PH = 90, PM = 4, L1 = 40, L2 = 22, BLOCK_W = 16, SPLIT = 27;
const clampMm = (v: number, lo: number, hi: number): number => Math.min(Math.max(lo, hi), Math.max(lo, v));
function syncPortrait(): void {
  syncInks();
  PW = S.ptW; PH = S.ptH; PM = S.ptMargin; PMY = PM + (S.ptPadY || 0);
  document.getElementById("pt-wrap")?.style.setProperty("--pt-ratio", String(PW / PH));
  L1 = clampMm(S.ptL1, 0, PH); L2 = clampMm(S.ptL2, 0, PH - L1); BLOCK_W = clampMm(S.ptBlock, 0, PW); SPLIT = clampMm(S.ptSplit, 0, PW);
}
/** The card's inks, set from the theme (S.ptTheme) each time it is drawn. 标准: white ground, teal block, charcoal type.
 *  纯黑 / 墨: the whole card one dark ground (#000 or vi-charcoal), everything on it white; the QR keeps its white tile. */
let P_TEAL = C.teal, P_INK = C.charcoal, P_TEAL_TEXT = C.tealText, P_WHITE = "#FFFFFF", P_MUTED = "#6B6B6C";
let P_BLOCK = C.teal, P_PANEL = C.charcoal, P_MARK = C.ivory, P_SAND = C.sand;
const PT_THEMES: { zh: string; en: string }[] = [{ zh: "标准", en: "Standard" }, { zh: "纯黑", en: "All black" }, { zh: "墨", en: "All vi-charcoal" }, { zh: "屏显", en: "Black, for screens" }];
/** 屏显: black for screens. Text is not pure white, which glows against black on a screen: the main text at 87 %
 *  white, labels and the web address at 60 % (Material's dark-theme emphasis); the mark stays full white. */
const SCREEN_HIGH = "#DEDEDE", SCREEN_MEDIUM = "#999999";
function syncInks(): void {
  const t = S.ptTheme;
  if (t >= 1) {
    const ground = t === 2 ? C.charcoal : "#000000";
    P_WHITE = ground; P_BLOCK = ground; P_PANEL = ground;
    P_INK = "#FFFFFF"; P_TEAL = "#FFFFFF"; P_TEAL_TEXT = "#FFFFFF"; P_MARK = "#FFFFFF"; P_SAND = "#FFFFFF"; P_MUTED = "#A6A6A6";
    if (t === 3) { P_INK = SCREEN_HIGH; P_TEAL = SCREEN_HIGH; P_TEAL_TEXT = SCREEN_MEDIUM; P_SAND = SCREEN_MEDIUM; P_MUTED = SCREEN_MEDIUM; }
  } else {
    P_WHITE = "#FFFFFF"; P_BLOCK = C.teal; P_PANEL = C.charcoal;
    P_INK = C.charcoal; P_TEAL = C.teal; P_TEAL_TEXT = C.tealText; P_MARK = C.ivory; P_SAND = C.sand; P_MUTED = "#6B6B6C";
  }
}
/** Which step the canvas shows. A view setting: never saved, never an undo step. */
let ptView: "structure" | "content" = "content";
const shown = (id: string): boolean => !overrideOf(PORTRAIT_KEY, id).hidden;

interface PhotoSlotP { key: "site" | "art"; zh: string; en: string; brief: string }
const P_SLOTS: PhotoSlotP[] = [
  { key: "site", zh: "西顶庙", en: "Site", brief: "院落，正面，白天" },
  { key: "art", zh: "艺术空间", en: "Art space", brief: "展厅，作品同高" },
];
/** Layer 2 as one picture: the site and its art space together. It uses the first slot's photo. */
const P_ONE: PhotoSlotP = { key: "site", zh: "西顶庙 · 艺术空间", en: "Site and art space", brief: "院落与展厅，一张全景" };
/** Photos dropped onto the slots, as data URLs. Kept for this visit only; not saved with a version. */
const portraitPhotos: Partial<Record<PhotoSlotP["key"], string>> = PHOTO_INIT ? { site: PHOTO_INIT } : {};
/** Each photo's width over height, read once it loads, so the picture can be laid out at its own proportions. */
const photoAspect: Partial<Record<PhotoSlotP["key"], number>> = {};
function loadAspect(key: PhotoSlotP["key"]): void {
  const src = portraitPhotos[key];
  if (!src) return;
  const img = new Image();
  img.onload = (): void => { if (img.naturalWidth && img.naturalHeight) { photoAspect[key] = img.naturalWidth / img.naturalHeight; renderPortrait(); } };
  img.src = src;
}
if (PHOTO_INIT) loadAspect("site");

type Pillar = BrandDef;
/** The two pillars are the card's brands (card.ts), the same list the back's name row reads. */
const PILLARS: Pillar[] = CARD_BRANDS;
/** A brand's own word, for short labels: 西顶艺术 → 艺术. */
const brandWord = (b: Pillar): string => b.zh.replace(/^西顶/, "");

/** The content items, by layer, for the checklist. Minimal keeps the ones marked true. */
const PT_CONTENT: [string, [string, string, boolean][]][] = [
  ["第一层", [["mark", "标志", true], ["company", "西顶文化", true], ["name", "姓名", true], ["nameEn", "英文名", false],
    ["roleZh", "职务（中）", false], ["roleEn", "职务（英）", true],
    ["phone", "电话", true], ["email", "邮箱", true], ["web", "网址", false], ["address", "地址", true]]],
  ["第二层", [["photo-site", "照片一", true], ["tab-site", "标签一", false], ["photo-art", "照片二", true], ["tab-art", "标签二", false]]],
  ["第三层", [["solutions", "为客户提供", false], ["pillar1", PILLARS[0]!.zh, true], ["pillar1En", PILLARS[0]!.en, false], ["pillar1List", `${brandWord(PILLARS[0]!)} · 服务`, true],
    ["pillar2", PILLARS[1]!.zh, true], ["pillar2En", PILLARS[1]!.en, false], ["pillar2List", `${brandWord(PILLARS[1]!)} · 服务`, true], ["pillarAxis", "中轴", true], ["qr", "二维码", true], ["qrCaption", "码下网址", true]]],
];

/** Layer 1: the teal block with the dot mark; the person on white. Lines that are turned off leave no gap. */
function portraitIdentity(p: Person): string {
  const d = VI.dots, mh = S.ptMark, mw = (mh * d[2]) / d[3];
  const k = S.ptK1, x = BLOCK_W + 4, maxW = Math.max(10, PW - PM - x), small = 1.8 * k, lead = 2.6 * k;
  const ink = l1Ink();
  let s = (S.ptL1Dark ? el("panel", "第一层右侧 Layer 1 right", `<rect x="${f2(BLOCK_W)}" y="${-BLEED}" width="${f2(PW - BLOCK_W + BLEED)}" height="${f2(L1 + BLEED)}" fill="${P_PANEL}"/>`, true) : "") +
    el("block", "色块 Teal block", `<rect x="${-BLEED}" y="${-BLEED}" width="${f2(BLOCK_W + BLEED)}" height="${f2(L1 + BLEED)}" fill="${P_BLOCK}"/>`, !!S.ptLock) +
    // on a dark card there is no field to centre the mark in: it hangs from the top margin, level with 西顶文化
    el("mark", "标志 Logo", viMark(BLOCK_W / 2 - mw / 2, S.ptTheme >= 1 && S.ptDir === 4 ? PMY : L1 / 2 - mh / 2, mh, P_MARK));
  // the other layout directions place layer 1's type by their own plan
  if (S.ptDir >= 1) return s + identityPlan(p, k, S.ptName, S.ptDir).svg;
  // the top stack: 西顶文化, the name and its romanisation, then the title
  const co = p.company.trim(), title = roleText(p);
  let yc = PM;
  if (co) { const b = yc + INK_TOP * 2.3 * k; s += el("company", "西顶文化", text(co, x, b, 2.3 * k, { family: SERIF, weight: 600, spacing: 0.3, fill: ink.co })); if (shown("company")) yc = b + 1.6 * k; }
  const nx = x + S.ptNameX, ny = yc + INK_TOP * S.ptName + 1.2 * k + S.ptNameY;
  if (p.nameZh.trim()) { s += el("name", "姓名 Name", text(p.nameZh.trim(), nx, ny, S.ptName, { family: SERIF, weight: 600, spacing: 0.1, fill: ink.fg })); if (shown("name")) yc = ny - S.ptNameY; }
  if (p.nameEn.trim()) { s += el("nameEn", "英文名 Romanisation", text(p.nameEn.trim(), nx, yc + 3.2 * k, 1.8 * k, { weight: 500, fill: ink.fg })); if (shown("nameEn")) yc += 3.2 * k; }
  if (title) s += el("role", "职务 Title", text(title, x, yc + 3.4 * k, 1.8 * k, { fill: ink.fg, weight: 500 }));
  // the contacts, stacked up from the layer's bottom (or in layer 3, where 自适应优化 may move them); with the QR at the
  // bottom of layer 3 the address goes there instead
  if (!S.ptCL3) s += contactEls(p, x, L1 - 3.2 * k, k, maxW, ink.fg);
  void small; void lead;
  return s;
}
/** The contacts, one element each, stacked up so the last line's baseline sits at `bottom`; lines that are turned off leave no gap. */
function contactEls(p: Person, x: number, bottom: number, k: number, maxW: number, fill: string = P_INK): string {
  const small = 1.8 * k, lead = 2.6 * k;
  let s = "", yb = bottom;
  for (const [kind, v] of [...contacts(p)].reverse()) {
    if (kind === "address" && S.ptQRPos === 1) continue;
    const lines = wrap(v, small, maxW), top = yb - (lines.length - 1) * lead;
    s += el(kind, ({ phone: "电话 Phone", email: "邮箱 Email", web: "网址 Website", address: "地址 Address" } as Record<ContactKind, string>)[kind],
      lines.map((t, i) => text(t, x, top + i * lead, small, { fill })).join(""));
    if (shown(kind)) yb = top - lead;
  }
  return s;
}
/** Layer 1's inks: ivory type and a sand 西顶文化 on the charcoal side, charcoal type and teal 西顶文化 on white. */
function l1Ink(): { fg: string; co: string } { return S.ptTheme === 3 ? { fg: SCREEN_HIGH, co: SCREEN_MEDIUM } : S.ptTheme >= 1 ? { fg: "#FFFFFF", co: "#FFFFFF" } : S.ptL1Dark ? { fg: C.ivory, co: C.sand } : { fg: P_INK, co: P_TEAL_TEXT }; }
/** The title line: the Chinese and English titles, each when it is turned on. */
function roleText(p: Person): string {
  // a person with no English title shows the Chinese one where the English would stand
  const zh = p.titleZh.trim(), en = p.titleEn.trim() || (shown("roleZh") ? "" : zh);
  return [shown("roleZh") ? zh : "", shown("roleEn") ? en : ""].filter(Boolean).join("  ");
}
/** How many lines the visible contacts take at type scale k in a column maxW wide. */
function contactLines(p: Person, k: number, maxW: number): number {
  let n = 0;
  for (const [kind, v] of contacts(p)) if (shown(kind) && !(kind === "address" && S.ptQRPos === 1)) n += wrap(v, 1.8 * k, maxW).length;
  return n;
}

/** One photo slot: the photo filling the box, or a quiet field naming what goes there; a teal tab names the place. */
function photoSlot(slot: PhotoSlotP, x: number, w: number, tabX: number, content: boolean): string {
  const y = L1, h = L2, id = `pclip-${slot.key}`, src = portraitPhotos[slot.key];
  if (w <= 0 || h <= 0) return "";
  // the frame: the layer's field, and the clip the picture shows through
  const clip = `<clipPath id="${id}"><rect x="${f2(x)}" y="${f2(y)}" width="${f2(w)}" height="${f2(h)}"/></clipPath>`;
  let s = `<rect x="${f2(x)}" y="${f2(y)}" width="${f2(w)}" height="${f2(h)}" fill="#E6E4DC"/>`;
  const pic = !!(src && content);
  if (!pic && content && h > 9 && w > 14) { const cx = x + w / 2, cy = y + h / 2 - 1.5; s += text("照片待放", cx, cy, 1.7, { anchor: "middle", fill: P_MUTED, weight: 500 }) + text(slot.brief, cx, cy + 2.5, 1.5, { anchor: "middle", fill: P_MUTED }); }
  let out = clip + el(`photo-${slot.key}`, `照片 Photo · ${slot.zh}`, s, !!S.ptLock);
  // the picture: its own element at its own proportions, covering the frame; drag it to pan, a corner to enlarge,
  // the round handle to turn it. It is clicked and seen only inside the frame.
  if (pic && shown(`photo-${slot.key}`)) {
    const a = photoAspect[slot.key] ?? w / h;
    let iw = w, ih = w / a;
    if (ih < h) { ih = h; iw = h * a; }
    const ix = x - (iw - w) / 2, iy = y - (ih - h) / 2;
    out += `<g clip-path="url(#${id})">` +
      el(`photoImg-${slot.key}`, `照片画面 Picture · ${slot.zh}`, `<image href="${esc(src!)}" x="${f2(ix)}" y="${f2(iy)}" width="${f2(iw)}" height="${f2(ih)}" preserveAspectRatio="none"/>`)
        .replace("<g data-el=", `<g data-hit="${f2(x)} ${f2(y)} ${f2(w)} ${f2(h)}" data-el=`) + `</g>`;
  }
  if (content) {
    const k2 = S.ptK2, label = `${slot.zh} ${slot.en}`, tw = textW(label, 1.5 * k2, SANS, 500, 0) + 2.4 * k2, ty = y + h - 4.6 * k2;
    out += el(`tab-${slot.key}`, `标签 Label · ${slot.zh}`, `<rect x="${f2(tabX)}" y="${f2(ty)}" width="${f2(tw)}" height="${f2(3 * k2)}" fill="${P_TEAL}"/>` +
      text(label, tabX + 1.2 * k2, ty + 2.05 * k2, 1.5 * k2, { fill: C.ivory, weight: 500 }));
  }
  return out;
}

/** Layer 2: the site on the left, the art space on the right, split at SPLIT with a white line, bled at the sides. */
function portraitPhotoLayer(content: boolean): string {
  const gap = S.ptGap;
  // one photo: the layer is one picture, edge to edge
  if (S.ptPhotos === 1) return photoSlot(P_ONE, -BLEED, PW + 2 * BLEED, PM, content);
  return photoSlot(P_SLOTS[0]!, -BLEED, SPLIT - gap / 2 + BLEED, PM, content) +
    photoSlot(P_SLOTS[1]!, SPLIT + gap / 2, PW + BLEED - SPLIT - gap / 2, SPLIT + gap / 2 + 2, content);
}

/** The QR code to the website, as charcoal modules on white with its quiet zone, `size` mm square. */
/** The address the QR leads to, as it is written under the code: read from the code itself, so the two cannot differ. */
const QR_HOST = ((): string => { try { return new URL(QR.url).host; } catch { return ""; } })();
function qrMark(x: number, y: number, size: number): string {
  const n = QR.n + 8, k = size / n;
  // On a light card: dark modules on a white tile. On a dark card: white modules straight on the ground, inverted,
  // with the same four-module quiet zone kept dark around them (the tile is the ground's own colour).
  // ptQRInv 0 keeps the standard polarity on a dark card too: dark modules on a white tile, its quiet zone inside the tile
  const dark = S.ptTheme >= 1 && S.ptQRInv !== 0, tile = dark ? P_WHITE : S.ptTheme === 3 ? SCREEN_HIGH : "#FFFFFF", ink = dark ? (S.ptTheme === 3 ? SCREEN_HIGH : "#FFFFFF") : S.ptTheme >= 1 ? "#000000" : C.charcoal;
  return `<rect x="${f2(x)}" y="${f2(y)}" width="${f2(size)}" height="${f2(size)}" fill="${tile}"/>` +
    `<path d="${QR.d}" fill="${ink}" transform="translate(${f2(x + 4 * k)} ${f2(y + 4 * k)}) scale(${f2(k)})" shape-rendering="crispEdges"/>`;
}

/** Where layer 3's parts sit at type scale k with a QR of q mm: shared by the drawing and by 自适应优化.
 *  ptQRPos 0: the QR in a right-hand column. ptQRPos 1: the pillars across the width, and under them the QR with the
 *  address (and its caption, when on), centred and set in the middle of the room left below the lists. */
interface L3 { q: number; colW: number; leftW: number; labelY: number; top: number; nameY: number; lead: number; listEnd: number; captionEnd: number; qx: number; qy: number; addr: string[]; addrY: number; addrSize: number }
function layer3Geometry(k: number, qSize: number, p?: Person): L3 {
  const bottomQR = S.ptQRPos === 1, q = shown("qr") ? qSize : 0;
  const right = q && !bottomQR ? PW - PM - q - 2.5 : PW - PM, colW = (right - PM - 1) / 2, leftW = right - PM;
  let top = L1 + L2 + 3 * k;
  const labelY = top + INK_TOP * 1.35 * k;
  if (shown("solutions")) top = labelY + 1.6 * k;
  const nameY = top + INK_TOP * 2.4 * k, lead = 2.55 * k;
  let listEnd = nameY + 0.5 * k;
  PILLARS.forEach((pl, i) => {
    const id = `pillar${i + 1}`;
    if (!shown(id) && !shown(`${id}En`) && !shown(`${id}List`)) return;
    const enY = nameY + 2.6 * k, base = shown(`${id}En`) ? enY : nameY;
    listEnd = Math.max(listEnd, shown(`${id}List`) ? base + 3.2 * k + (pl.services.length - 1) * lead + 0.5 * k : base + 0.5 * k);
  });
  const addrSize = 1.7 * k, address = p?.address.trim() ?? "";
  const addr = bottomQR && address && shown("address") ? wrap(address, addrSize, PW - 2 * PM) : [];
  const capH = q && shown("qrCaption") ? 4.8 * k + 0.4 * k : 0;
  if (!bottomQR) {
    const captionEnd = q ? top + q + capH : top;
    return { q, colW, leftW, labelY, top, nameY, lead, listEnd, captionEnd, qx: PW - PM - q, qy: top, addr: [], addrY: 0, addrSize };
  }
  // the group under the lists: QR, caption, address; centred across, and in the middle of the free height
  const addrH = addr.length ? (q ? 2.2 * k : 0) + INK_TOP * addrSize + (addr.length - 1) * 2.4 * k + 0.5 * k : 0;
  const groupH = q + capH + addrH, floor = PH - PM, from = listEnd + 3 * k;
  const qy = Math.max(from, from + (floor - from - groupH) / 2);
  const addrY = qy + q + capH + (q ? 2.2 * k : 0) + INK_TOP * addrSize;
  return { q, colW, leftW, labelY, top, nameY, lead, listEnd, captionEnd: qy + groupH, qx: PW / 2 - q / 2, qy, addr, addrY, addrSize };
}
/** Layer 3: two pillars, each a teal rule with its name, its English and its services; the QR on the right. */
function portraitPillarLayer(p: Person): string {
  if (S.ptDir >= 1) return pillarsPlan(p, S.ptK3, S.ptQR, S.ptDir).svg;
  const k = S.ptK3, L = layer3Geometry(k, S.ptQR, p), q = L.q, qx = L.qx;
  let s = el("solutions", "为客户提供 Solutions", text("为客户提供 · Solutions for clients", PM, L.labelY, 1.35 * k, { fill: P_MUTED, weight: 500, spacing: 0.04 }));
  PILLARS.forEach((pl, i) => {
    const id = `pillar${i + 1}`, x0 = PM + i * (L.colW + 1), tx = x0 + 1.5 * k;
    const enOn = shown(`${id}En`), enY = L.nameY + 2.6 * k, listY = (enOn ? enY : L.nameY) + 3.2 * k;
    const end = shown(`${id}List`) ? listY + (pl.services.length - 1) * L.lead + 0.6 * k : (enOn ? enY : L.nameY) + 0.6 * k;
    s += el(id, `支柱 Pillar · ${pl.zh}`, `<rect x="${f2(x0)}" y="${f2(L.top)}" width="${f2(0.6 * Math.max(1, k))}" height="${f2(end - L.top)}" fill="${P_TEAL}"/>` +
      text(pl.zh, tx, L.nameY, 2.4 * k, { family: SERIF, weight: 600, spacing: 0.04, fill: P_INK })) +
      el(`${id}En`, `支柱英文 · ${pl.en}`, text(pl.en, tx, enY, 1.35 * k, { weight: 500, fill: P_TEAL_TEXT })) +
      el(`${id}List`, `服务 Services · ${pl.zh}`, pl.services.map((sv, j) => text(sv, tx, listY + j * L.lead, 1.7 * k, { fill: P_INK })).join(""));
  });
  if (S.ptCL3) s += contactEls(p, PM, PH - PM, k, L.leftW);
  const web = QR_HOST, qy = L.qy;
  if (S.ptQRPos === 1 && p.address.trim()) s += el("address", "地址 Address", (L.addr.length ? L.addr : wrap(p.address.trim(), L.addrSize, PW - 2 * PM))
    .map((t, i) => text(t, PW / 2, (L.addr.length ? L.addrY : qy + q + 2.6 * k) + i * 2.4 * k, L.addrSize, { anchor: "middle", fill: P_INK })).join(""));
  s += el("qr", "二维码 QR code", qrMark(qx, qy, q)) + el("qrCaption", "扫码了解西顶", text("扫码了解西顶", qx + q / 2, qy + q + 2.4 * k, 1.6 * k, { family: SERIF, weight: 600, anchor: "middle", fill: P_INK }) +
    text(web, qx + q / 2, qy + q + 4.8 * k, 1.4 * k, { anchor: "middle", fill: P_TEAL_TEXT, weight: 500 }));
  return s;
}

/** The structure view's labels: each layer's name and height, the block's width, the card's size. Never exported. */
function structureLabels(): string {
  const tag = (t: string, x: number, y: number, anchor: "start" | "end" = "start"): string =>
    text(t, x, y, 2, { fill: P_TEAL_TEXT, weight: 600, anchor });
  const L3 = PH - L1 - L2, xL = Math.max(BLOCK_W + 2, PM);
  let o = "";
  if (L1 > 4) o += tag(`一 名片 · ${f2(L1)} mm`, xL, Math.min(L1 - 2, PM + 3));
  if (BLOCK_W > 6 && L1 > 10) o += text(`色块 ${f2(BLOCK_W)}`, BLOCK_W / 2, L1 / 2, 1.8, { fill: C.ivory, weight: 600, anchor: "middle" });
  if (L2 > 4) o += tag(`二 照片 · ${f2(L2)} mm`, PM, L1 + Math.min(L2 - 1.5, 4.5));
  if (L3 > 4) o += tag(`三 支柱 · ${f2(L3)} mm`, PM, L1 + L2 + Math.min(L3 - 1.5, 4.5));
  o += tag(`${f2(PW)} × ${f2(PH)} mm`, PW - PM, PH - PM, "end");
  return `<g pointer-events="none">${o}${line(0, L1, PW, L1, "#2F8FD8", ".8 .5")}${line(0, L1 + L2, PW, L1 + L2, "#2F8FD8", ".8 .5")}</g>`;
}

function portraitCard(p: Person, view: "structure" | "content" = ptView): string {
  syncPortrait();
  FOOT = null; AXIS = null;
  const ground = el("ground", "底色 Ground", `<rect x="${-BLEED}" y="${-BLEED}" width="${f2(PW + 2 * BLEED)}" height="${f2(PH + 2 * BLEED)}" fill="${P_WHITE}"/>`, true);
  if (view === "structure") {
    return ground + (S.ptL1Dark ? el("panel", "第一层右侧 Layer 1 right", `<rect x="${f2(BLOCK_W)}" y="${-BLEED}" width="${f2(PW - BLOCK_W + BLEED)}" height="${f2(L1 + BLEED)}" fill="${P_PANEL}"/>`, true) : "") +
      el("block", "色块 Teal block", `<rect x="${-BLEED}" y="${-BLEED}" width="${f2(BLOCK_W + BLEED)}" height="${f2(L1 + BLEED)}" fill="${P_BLOCK}"/>`, !!S.ptLock) +
      portraitPhotoLayer(false) + structureLabels();
  }
  return ground + portraitIdentity(p) + portraitPhotoLayer(true) + portraitPillarLayer(p) +
    // a dark card with no photo layer: a faint hairline keeps the person apart from the pillars
    (S.ptTheme >= 1 && L2 < 0.5 ? hRule(PM, PW - PM, L1, "#FFFFFF", 0.3) : "");
}
/** The lines a dragged element snaps to: card edges, margins, centre lines, the block's edge and the layer borders. */
function portraitLines(): { xs: number[]; ys: number[] } {
  syncPortrait();
  const r = ratioLines();
  return { xs: [0, PM, PW / 2, PW - PM, PW, BLOCK_W, BLOCK_W + 4, SPLIT, ...r.xs], ys: [0, PM, PH / 2, PH - PM, PH, L1, L1 + L2, ...r.ys] };
}

// ---- border handles: drag a layer border, the block's edge or the photo split on the canvas ----
type BorderKey = "l1" | "l2" | "block" | "split" | "foot" | "axis" | "w" | "h" | "wh";
const BORDER_NAMES: Record<BorderKey, string> = { l1: "第一层边界 Layer 1 border", l2: "照片层边界 Photo layer border", block: "色块边界 Block edge", split: "照片分界 Photo split", foot: "页脚线 Footer line", axis: "中轴 Pillar axis",
  w: "卡宽 Card width", h: "卡长 Card length", wh: "等比缩放 The whole design, in proportion" };
/** Layer 3's own borders, as the last drawing of the card placed them: the footer line (and how far it may go), and the
 *  axis between the two pillars (and how tall it stands). Null where the layout has none. */
let FOOT: { y: number; max: number; min: number } | null = null, AXIS: { x: number; y0: number; y1: number } | null = null;
/** A wide invisible grip along each border, and a small visible tab on it. Drawn on screen only, never exported. */
function portraitHandles(): string {
  const y1 = L1, y2 = L1 + L2, xb = BLOCK_W, xs = SPLIT;
  const hit = (k: BorderKey, x1: number, ya: number, x2: number, yb: number, cur: string): string =>
    `<line data-border="${k}" x1="${f2(x1)}" y1="${f2(ya)}" x2="${f2(x2)}" y2="${f2(yb)}" stroke="transparent" stroke-width="2.2" style="cursor:${cur}"><title>${BORDER_NAMES[k]}</title></line>`;
  const tab = (k: BorderKey, cx: number, cy: number, vertical: boolean): string => {
    const w = vertical ? 1.3 : 6, h = vertical ? 6 : 1.3;
    return `<rect data-border="${k}" class="pt-grip" x="${f2(cx - w / 2)}" y="${f2(cy - h / 2)}" width="${w}" height="${h}" rx=".65" fill="#FFFFFF" stroke="#2F8FD8" stroke-width=".3" style="cursor:${vertical ? "col-resize" : "row-resize"}"><title>${BORDER_NAMES[k]}</title></rect>`;
  };
  // the borders stay movable on a locked structure too: dragging one is a deliberate change, and the content follows it
  const l2On = L2 >= 0.5, two = S.ptPhotos !== 1 && l2On;
  // the card's own edges: the right edge sets the width, the bottom edge the height, the corner both in proportion
  const size = hit("w", PW - 0.6, 0, PW - 0.6, PH - 3, "ew-resize") + hit("h", 0, PH - 0.6, PW - 3, PH - 0.6, "ns-resize") +
    tab("w", PW - 0.9, PH / 2, true).replace("col-resize", "ew-resize") + tab("h", PW / 2, PH - 0.9, false).replace("row-resize", "ns-resize") +
    `<rect data-border="wh" class="pt-grip" x="${f2(PW - 2.4)}" y="${f2(PH - 2.4)}" width="2" height="2" rx=".4" fill="#FFFFFF" stroke="#2F8FD8" stroke-width=".3" style="cursor:nwse-resize"><title>${BORDER_NAMES.wh}</title></rect>`;
  return `<g data-pt-handles="1">` + size +
    hit("block", xb, -BLEED, xb, y1, "col-resize") + (two ? hit("split", xs, y1, xs, y2, "col-resize") : "") +
    hit("l1", -BLEED, y1, PW + BLEED, y1, "row-resize") + (l2On ? hit("l2", -BLEED, y2, PW + BLEED, y2, "row-resize") : "") +
    (FOOT ? hit("foot", PM, FOOT.y, PW - PM, FOOT.y, "row-resize") : "") + (AXIS ? hit("axis", AXIS.x, AXIS.y0, AXIS.x, AXIS.y1, "col-resize") : "") +
    tab("block", xb, Math.min(7, Math.max(3, y1 / 2)), true) + (two ? tab("split", xs, y1 + L2 / 2, true) : "") + tab("l1", PW - 9, y1, false) + (l2On ? tab("l2", PW - 9, y2, false) : "") +
    (FOOT ? tab("foot", PW - 9, FOOT.y, false) : "") + (AXIS ? tab("axis", AXIS.x, (AXIS.y0 + AXIS.y1) / 2, true) : "") + `</g>`;
}
/** Set a border from a point on the card: anywhere on the card, in 0.5 mm steps. */
function setBorder(k: BorderKey, pt: DOMPoint): void {
  // a border within 1.2 mm of a proportion line settles on it; elsewhere it moves in 0.5 mm steps
  const lines = ratioLines(), near = (v: number, list: number[]): number | null => { let best: number | null = null; for (const c of list) if (Math.abs(c - v) < 1.2 && (best === null || Math.abs(c - v) < Math.abs(best - v))) best = c; return best; };
  const r = (v: number, lo: number, hi: number, axis: "x" | "y" = "y"): number => {
    const snap = near(v, axis === "x" ? lines.xs : lines.ys);
    return snap !== null ? Math.round(clampMm(snap, lo, hi) * 10) / 10 : Math.round(clampMm(v, lo, hi) * 2) / 2;
  };
  if (k === "l1") S.ptL1 = r(pt.y, 0, S.ptH);
  else if (k === "l2") S.ptL2 = Math.round((r(pt.y, S.ptL1, S.ptH) - S.ptL1) * 10) / 10;
  else if (k === "block") S.ptBlock = r(pt.x, 0, S.ptW, "x");
  else if (k === "foot") {
    // the footer line: up into layer 3, never down onto the footer; back at its own place it is automatic again
    if (!FOOT) return;
    const y = Math.round(clampMm(pt.y, FOOT.min, FOOT.max) * 2) / 2;
    S.ptFoot = FOOT.max - y < 0.5 ? 0 : y;
  } else if (k === "axis") {
    const x = Math.round(clampMm(pt.x, PM + 8, S.ptW - PM - 8) * 2) / 2;
    S.ptAxis = Math.abs(x - S.ptW / 2) < 0.8 ? 0 : x;
  } else S.ptSplit = r(pt.x, 0, S.ptW, "x");
}

// ---- card size: presets keep the layers in proportion ----
// for sharing on screens first: the full-screen phone and story formats, then 小红书's 3:4; then the printed sizes
const PT_PRESETS: [string, number, number][] = [["9:16 竖屏 1080×1920", 54, 96], ["3:4 小红书 1080×1440", 54, 72], ["9:19.5 全面屏", 54, 117], ["4:5 1080×1350", 54, 67.5], ["3:7 · 45 × 105", 45, 105], ["2:3 · 60 × 90", 60, 90], ["2:3 · 64 × 96", 64, 96], ["2:3 · 70 × 105", 70, 105], ["名片 54 × 90", 54, 90], ["55 × 85", 55, 85], ["大 70 × 120", 70, 120]];
function applyPreset(w: number, h: number): void {
  const before = editSnapshot(), kx = w / S.ptW, ky = h / S.ptH;
  S.ptL1 = Math.round(S.ptL1 * ky * 2) / 2; S.ptL2 = Math.round(S.ptL2 * ky * 2) / 2;
  S.ptBlock = Math.round(S.ptBlock * kx * 2) / 2; S.ptSplit = Math.round(S.ptSplit * kx * 2) / 2;
  S.ptW = w; S.ptH = h;
  syncControls();
  pushUndo(before, `尺寸 Size · ${w} × ${h}`);
  onEditChanged(false);
  if (document.getElementById("pt-section")?.classList.contains("pt-focus")) setPtZoom(ptZoom);
}
/** Turn content items on or off in one undo step. */
function setContent(ids: string[], on: boolean, label: string): void {
  const before = editSnapshot();
  for (const id of ids) setOverride(PORTRAIT_KEY, id, { ...overrideOf(PORTRAIT_KEY, id), hidden: !on });
  commit(before, true, label);
}
function renderPtControls(): void {
  const pre = document.getElementById("pt-presets");
  if (pre) pre.innerHTML = PT_PRESETS.map(([t, w, h]) =>
    `<button type="button" class="btn btn--ghost btn--sm${S.ptW === w && S.ptH === h ? " is-on" : ""}" data-preset="${w}x${h}" aria-pressed="${S.ptW === w && S.ptH === h}">${t}</button>`).join("");
  const list = document.getElementById("pt-content");
  if (list) list.innerHTML = PT_CONTENT.map(([g, items]) =>
    `<div class="pt-cgroup"><b>${g}</b>${items.map(([id, label]) =>
      `<label class="check"><input type="checkbox" data-content="${id}"${shown(id) ? " checked" : ""}> ${esc(label)}</label>`).join("")}</div>`).join("");
}
function portraitGuides(): string {
  return `<rect x="${-BLEED}" y="${-BLEED}" width="${PW + 2 * BLEED}" height="${PH + 2 * BLEED}" fill="none" stroke="#9AA5A3" stroke-width=".12"/>` +
    `<rect x="0" y="0" width="${PW}" height="${PH}" fill="none" stroke="${C.trim}" stroke-width=".2"/>` +
    `<rect x="${SAFE}" y="${SAFE}" width="${PW - 2 * SAFE}" height="${PH - 2 * SAFE}" fill="none" stroke="${C.safe}" stroke-width=".18" stroke-dasharray=".8 .6"/>` +
    line(-BLEED, L1, PW + BLEED, L1, C.safe, ".6 .4") + line(-BLEED, L1 + L2, PW + BLEED, L1 + L2, C.safe, ".6 .4");
}
/** The portrait card as an editable sheet, in the same shape as the landscape sheets (card group, then guides). */
function portraitSvg(p: Person, guides: boolean, handles = true, view: "structure" | "content" = ptView): string {
  const inner = portraitCard(p, view), pad = guides ? BLEED + 1 : 0, vb = [-pad, -pad, PW + 2 * pad, PH + 2 * pad];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(" ")}" role="img" aria-label="Portrait card, ${esc(p.nameEn || p.nameZh || "blank")}" data-key="${PORTRAIT_KEY}">` +
    `<g data-card="1">${inner}</g><g pointer-events="none">${guides ? portraitGuides() : ""}${handles && ptSafe ? safeZones() : ""}</g>${handles ? ratioGuides() + (ptHandles ? portraitHandles() : "") : ""}</svg>`;
}

function renderPortrait(): void {
  const host = document.getElementById("portrait");
  if (!host) return;
  const p = state.data[state.person] ?? PEOPLE[0]!;
  host.innerHTML = `<figure class="pt-panel"><div id="portrait-sheet"></div>` +
    `<figcaption><b>竖版 · ${esc(p.nameZh || p.nameEn)}</b><span></span></figcaption></figure>`;
  const sheetHost = document.getElementById("portrait-sheet");
  if (sheetHost) mount(sheetHost, portraitSvg(p, state.guides), PORTRAIT_KEY, true);
  // the galleries below draw the card again; the borders a drag reads are this card's, so keep them
  const borders = { FOOT, AXIS };
  // the caption reads the layer heights the card was just drawn with
  const cap = host.querySelector("figcaption span");
  if (cap) cap.textContent = `${f2(PW)} × ${f2(PH)} · 1 : ${(PH / PW).toFixed(3)} · 1080 × ${Math.round(1080 * PH / PW)} px · 一 名片 ${f2(L1)} · 二 照片 ${f2(L2)} · 三 支柱 ${f2(PH - L1 - L2)}`;
  host.classList.toggle("is-structure", ptView === "structure");
  renderPtControls();
  renderProportion();
  renderStructures();
  syncPictureControls();
  renderDirections();
  renderL1Styles();
  renderRuleStyles();
  FOOT = borders.FOOT; AXIS = borders.AXIS;
}
/** The card as an SVG file: millimetre-sized with the bleed, every move applied, the VI outlines inlined, fonts named. */
/** One person's portrait card, drawn off screen with every move applied, `pad` mm around the trim; dropHost removes it. */
function portraitSheetFor(p: Person, pad: number): SVGSVGElement {
  const host = document.createElement("div");
  host.style.cssText = "position:absolute;left:-10000px;top:0;width:600px";
  host.innerHTML = portraitSvg(p, false, false, "content"); // a file always carries the content
  document.body.appendChild(host);
  const svg = host.querySelector("svg") as SVGSVGElement;
  svg.setAttribute("viewBox", `${-pad} ${-pad} ${PW + 2 * pad} ${PH + 2 * pad}`);
  svg.setAttribute("width", "600");
  applyOverrides(svg, PORTRAIT_KEY);
  return svg;
}
function portraitFileSvg(p: Person): string {
  const pad = BLEED + 1, svg = portraitSheetFor(p, pad), host = svg.parentElement;
  svg.setAttribute("width", `${PW + 2 * pad}mm`);
  svg.setAttribute("height", `${PH + 2 * pad}mm`);
  svg.querySelectorAll("[style]").forEach((e) => { if ((e as HTMLElement).style.display === "none") e.remove(); else e.removeAttribute("style"); });
  const defs = (["vi-dots", "vi-zh"] as const).map((id) => `<path id="${id}" d="${document.getElementById(id)?.getAttribute("d") ?? ""}"/>`).join("");
  const body = new XMLSerializer().serializeToString(svg).replace(/<svg([^>]*)>/, `<svg$1><defs>${defs}</defs>`);
  host?.remove();
  return `<?xml version="1.0" encoding="UTF-8"?>\n${body}`;
}
function wirePortrait(): void {
  // Canvas size: the whole row (default), or as large as the window's height allows. A view setting, not saved.
  document.querySelectorAll<HTMLInputElement>('input[name="ptSize"]').forEach((r) => r.addEventListener("change", () => {
    document.getElementById("pt-wrap")?.classList.toggle("pt-fit", r.value === "fit" && r.checked);
    redrawOverlays();
  }));
  wireFocus();
  wireTabs();
  wireProportion();
  wirePicture();
  wireAllCombos();
  document.getElementById("pt-rules")?.addEventListener("click", (e) => {
    const b = (e.target as Element).closest<HTMLElement>("[data-rule]"), r = PT_RULES[Number(b?.dataset.rule)];
    if (!b || !r) return;
    const before = editSnapshot();
    S.ptAxisStyle = r.axis; S.ptLineStyle = r.line; S.ptFootStyle = -1;
    pushUndo(before, `线型 Lines · ${r.zh}`);
    onEditChanged(false);
  });
  document.getElementById("pt-safe")?.addEventListener("click", () => {
    ptSafe = !ptSafe;
    try { localStorage.setItem("xd-pt-safe", ptSafe ? "1" : "0"); } catch { /* fine */ }
    syncHandlesBtn(); renderPortrait();
  });
  document.getElementById("pt-handles")?.addEventListener("click", () => {
    ptHandles = !ptHandles;
    try { localStorage.setItem("xd-pt-handles", ptHandles ? "1" : "0"); } catch { /* fine */ }
    syncHandlesBtn(); renderPortrait();
  });
  syncHandlesBtn();
  document.getElementById("pt-l1s")?.addEventListener("click", (e) => {
    const b = (e.target as Element).closest<HTMLElement>("[data-l1]");
    if (b) applyL1Style(Number(b.dataset.l1) || 0);
  });
  document.getElementById("pt-dirs")?.addEventListener("click", (e) => {
    const b = (e.target as Element).closest<HTMLElement>("[data-dir]");
    if (b) applyDirection(Number(b.dataset.dir) || 0);
  });
  // structure or content: what the canvas shows
  document.querySelectorAll<HTMLInputElement>('input[name="ptView"]').forEach((r) => r.addEventListener("change", () => {
    if (r.checked) { ptView = r.value === "structure" ? "structure" : "content"; sel = null; renderPortrait(); updateProps(); renderLayers(); }
  }));
  document.getElementById("pt-presets")?.addEventListener("click", (e) => {
    const b = (e.target as Element).closest<HTMLElement>("[data-preset]");
    const [w, h] = (b?.dataset.preset ?? "").split("x").map(Number);
    if (w && h) applyPreset(w, h);
  });
  document.getElementById("pt-content")?.addEventListener("change", (e) => {
    const t = e.target as HTMLInputElement, id = t.dataset.content;
    if (id) setContent([id], t.checked, `${t.checked ? "显示" : "隐藏"} · ${t.parentElement?.textContent?.trim() ?? id}`);
  });
  const allIds = PT_CONTENT.flatMap(([, items]) => items.map(([id]) => id));
  document.getElementById("pt-minimal")?.addEventListener("click", () => {
    const keep = new Set(PT_CONTENT.flatMap(([, items]) => items.filter(([, , on]) => on).map(([id]) => id)));
    const before = editSnapshot();
    for (const id of allIds) setOverride(PORTRAIT_KEY, id, { ...overrideOf(PORTRAIT_KEY, id), hidden: !keep.has(id) });
    commit(before, true, "内容 Content · 精简 Minimal");
  });
  document.getElementById("pt-all")?.addEventListener("click", () => setContent(allIds, true, "内容 Content · 全部 All"));
  // Border handles. Caught on the way down (capture), so the card editor never starts a move or a selection box.
  const host = document.getElementById("portrait");
  // A press that does not move is a click: on a line it offers that line's styles.
  let border: { k: BorderKey; before: string; x: number; y: number; px: number; d0: CardDims; moved: boolean } | null = null;
  host?.addEventListener("pointerdown", (e) => {
    const t = (e.target as Element).closest<SVGElement>("[data-border]");
    if (!t || e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    const svg = document.querySelector<SVGSVGElement>("#portrait-sheet svg");
    border = { k: (t.dataset.border ?? "l1") as BorderKey, before: editSnapshot(), x: e.clientX, y: e.clientY, px: svg?.getScreenCTM()?.a || 1, d0: cardDims(), moved: false };
    document.body.style.cursor = t.style.cursor;
  }, true);
  window.addEventListener("pointermove", (e) => {
    if (!border) return;
    const svg = document.querySelector<SVGSVGElement>("#portrait-sheet svg");
    if (!svg) return;
    if (!border.moved && Math.hypot(e.clientX - border.x, e.clientY - border.y) < 4) return;
    border.moved = true;
    // the card's size follows the pointer's travel at the scale the drag began with, since the card is redrawn as it grows
    if (border.k === "w" || border.k === "h" || border.k === "wh") resizeCard(border.d0, (e.clientX - border.x) / border.px, (e.clientY - border.y) / border.px, border.k);
    else setBorder(border.k, svgPoint(svg, e));
    renderPortrait();
  });
  window.addEventListener("pointerup", (e) => {
    if (!border) return;
    const { k, before, moved } = border;
    border = null; document.body.style.cursor = "";
    if (!moved) { if (k === "l1" || k === "foot" || k === "axis") openStylePicker(k, e.clientX, e.clientY); return; }
    syncControls();
    pushUndo(before, `拖动 Drag · ${BORDER_NAMES[k]}`);
    onEditChanged(false);
    if (document.getElementById("pt-section")?.classList.contains("pt-focus")) setPtZoom(ptZoom);
  });
  for (const slot of P_SLOTS) {
    const inp = document.getElementById(`ph-${slot.key}`) as HTMLInputElement | null;
    inp?.addEventListener("change", () => {
      const f = inp.files?.[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = (): void => { if (typeof r.result === "string") { portraitPhotos[slot.key] = r.result; delete photoAspect[slot.key]; loadAspect(slot.key); renderPortrait(); } };
      r.readAsDataURL(f);
    });
  }
  wireExport();
}

// ---- export: choose people and formats, get one ZIP ----
/** The people ticked for export: the person on the card until someone chooses. A view choice, never saved. */
const exportPick = new Set<number>();
let exportPicked = false;
function buildExportPeople(): void {
  const box = document.getElementById("pt-x-people");
  if (!box) return;
  if (!exportPicked) { exportPick.clear(); exportPick.add(state.person); }
  for (const i of [...exportPick]) if (i >= state.data.length) exportPick.delete(i);
  box.innerHTML = state.data.map((p, i) => `<label class="check"><input type="checkbox" data-xp="${i}"${exportPick.has(i) ? " checked" : ""}><span>${esc(p.nameZh || p.nameEn || String(i + 1))}</span></label>`).join("");
}
function exportPanel(open: boolean): void {
  const panel = document.getElementById("pt-export"), btn = document.getElementById("pt-export-btn"), bar = document.querySelector<HTMLElement>("#pt-section .pt-bar");
  if (!panel) return;
  if (open) { buildExportPeople(); if (bar) panel.style.top = `${bar.offsetTop + bar.offsetHeight + 6}px`; }
  panel.hidden = !open;
  btn?.setAttribute("aria-expanded", String(open));
}
function wireExport(): void {
  const panel = document.getElementById("pt-export"), say = (t: string): void => { const m = document.getElementById("pt-x-msg"); if (m) m.textContent = t; };
  document.getElementById("pt-export-btn")?.addEventListener("click", () => exportPanel(!!panel?.hidden));
  panel?.addEventListener("change", (e) => {
    const t = e.target as HTMLInputElement, i = t.dataset.xp;
    if (i === undefined) return;
    exportPicked = true;
    if (t.checked) exportPick.add(+i); else exportPick.delete(+i);
  });
  const all = (on: boolean): void => { exportPicked = true; exportPick.clear(); if (on) state.data.forEach((_, i) => exportPick.add(i)); buildExportPeople(); };
  document.getElementById("pt-x-all")?.addEventListener("click", () => all(true));
  document.getElementById("pt-x-none")?.addEventListener("click", () => all(false));
  document.getElementById("pt-x-go")?.addEventListener("click", () => {
    const go = document.getElementById("pt-x-go") as HTMLButtonElement | null;
    if (go) go.disabled = true;
    const pdf = (document.getElementById("pt-x-pdf") as HTMLInputElement | null)?.checked ?? false, svgOn = (document.getElementById("pt-x-svg") as HTMLInputElement | null)?.checked ?? false;
    const png = (document.getElementById("pt-x-png") as HTMLInputElement | null)?.checked ?? true;
    void exportPortraitZip([...exportPick].sort((a, b) => a - b), pdf, svgOn, say, png).finally(() => { if (go) go.disabled = false; });
  });
  // a click elsewhere closes it
  document.addEventListener("pointerdown", (e) => {
    if (!panel || panel.hidden) return;
    const t = e.target as Element;
    if (!t.closest("#pt-export, #pt-export-btn")) exportPanel(false);
  });
}

// ---- one-screen editing with zoom ----
// The section fills the window: the card in a scrolling canvas on the left, the panel on the right. Zoom 100% fits
// the whole card in the canvas; up to 600% to work on small type. Ctrl or ⌘ + wheel, or pinch, zooms at the pointer.
// A view setting: never saved, never an undo step.
const PT_ZOOMS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6];
let ptZoom = 1;
function ptFitWidth(): number {
  const stage = document.getElementById("pt-stage");
  if (!stage) return 400;
  const cs = getComputedStyle(stage), padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight), padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
  const cap = stage.querySelector("figcaption")?.getBoundingClientRect().height ?? 40;
  const pad = state.guides ? (BLEED + 1) * 2 : 0, ratio = (PW + pad) / (PH + pad);
  return Math.max(120, Math.min(stage.clientWidth - padX, (stage.clientHeight - padY - cap - 12) * ratio));
}
/** Apply a zoom, keeping the point at (cx, cy) in the canvas (its centre by default) where it was. */
function setPtZoom(z: number, cx?: number, cy?: number): void {
  const stage = document.getElementById("pt-stage"), wrap = document.getElementById("pt-wrap");
  if (!stage || !wrap) return;
  const old = ptZoom;
  ptZoom = Math.min(6, Math.max(0.5, z));
  const px = cx ?? stage.clientWidth / 2, py = cy ?? stage.clientHeight / 2;
  const fx = (stage.scrollLeft + px) / Math.max(1, stage.scrollWidth), fy = (stage.scrollTop + py) / Math.max(1, stage.scrollHeight);
  wrap.style.setProperty("--pt-w", `${Math.round(ptFitWidth() * ptZoom)}px`);
  const out = document.getElementById("pt-zval");
  if (out) out.textContent = `${Math.round(ptZoom * 100)}%`;
  if (old !== ptZoom || cx !== undefined) { stage.scrollLeft = fx * stage.scrollWidth - px; stage.scrollTop = fy * stage.scrollHeight - py; }
  redrawOverlays();
}
function stepPtZoom(dir: 1 | -1): void {
  const next = dir > 0 ? PT_ZOOMS.find((z) => z > ptZoom + 1e-6) : [...PT_ZOOMS].reverse().find((z) => z < ptZoom - 1e-6);
  setPtZoom(next ?? ptZoom);
}
/** One-screen editing is entered with the 全屏 button; it covers the page, so the page never opens in it. */
const FOCUS_KEY = "xd-pt-focus";
function setFocus(on: boolean, remember = true): void {
  if (remember) { try { localStorage.setItem(FOCUS_KEY, on ? "1" : "0"); } catch { /* fine */ } }
  const sec = document.getElementById("pt-section"), btn = document.getElementById("pt-focus");
  if (!sec) return;
  sec.classList.toggle("pt-focus", on);
  document.body.classList.toggle("pt-focus-on", on);
  if (btn) { btn.setAttribute("aria-pressed", String(on)); btn.textContent = on ? "退出" : "全屏"; btn.title = on ? "Exit (Esc)" : "Edit in one screen"; }
  if (!on) document.getElementById("pt-wrap")?.style.removeProperty("--pt-w");
  ptZoom = 1;
  if (on) setPtZoom(1); else redrawOverlays();
  if (!on && remember) sec.scrollIntoView({ block: "start" });
}
function wireFocus(): void {
  const stage = document.getElementById("pt-stage"), sec = document.getElementById("pt-section");
  document.getElementById("pt-focus")?.addEventListener("click", () => setFocus(!sec?.classList.contains("pt-focus")));
  document.getElementById("pt-zin")?.addEventListener("click", () => stepPtZoom(1));
  document.getElementById("pt-zout")?.addEventListener("click", () => stepPtZoom(-1));
  document.getElementById("pt-zfit")?.addEventListener("click", () => setPtZoom(1));
  stage?.addEventListener("wheel", (e) => {
    if (!sec?.classList.contains("pt-focus") || !(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    const r = stage.getBoundingClientRect();
    setPtZoom(ptZoom * Math.exp(-e.deltaY * 0.0025), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // capture phase: this runs before the card's own Esc clears the selection, so one Esc does one thing
  document.addEventListener("keydown", (e) => {
    const xp = document.getElementById("pt-export");
    if (e.key === "Escape" && xp && !xp.hidden) { e.preventDefault(); e.stopPropagation(); exportPanel(false); return; }
    if (!sec?.classList.contains("pt-focus") || typing(e)) return;
    // Esc first clears a selection, as on the card; with nothing selected it leaves one-screen editing
    if (e.key === "Escape" && !sel) { e.preventDefault(); setFocus(false); }
    else if ((e.ctrlKey || e.metaKey) && (e.key === "=" || e.key === "+")) { e.preventDefault(); stepPtZoom(1); }
    else if ((e.ctrlKey || e.metaKey) && e.key === "-") { e.preventDefault(); stepPtZoom(-1); }
    else if ((e.ctrlKey || e.metaKey) && e.key === "0") { e.preventDefault(); setPtZoom(1); }
  }, true);
  window.addEventListener("resize", () => { if (sec?.classList.contains("pt-focus")) setPtZoom(ptZoom); });
}

// ---- proportion systems: suggestions, guide lines, apply ----
// Each system divides a length into a major and a minor part, major / minor = r. Its lines sit at the major part
// from either end, and once more inside the top major part (the nested section the layer suggestion uses).
interface Ratio { zh: string; en: string; r: number; sym: string }
const PT_RATIOS: Ratio[] = [
  { zh: "黄金分割", en: "Golden section", r: (1 + Math.sqrt(5)) / 2, sym: "φ" },
  { zh: "白银分割", en: "Silver, 1 : √2", r: Math.SQRT2, sym: "√2" },
  { zh: "2:3", en: "Two to three", r: 1.5, sym: "2:3" },
  { zh: "三分法", en: "Rule of thirds", r: 2, sym: "⅓" },
];
const ratioOf = (): Ratio => PT_RATIOS[S.ptRatio] ?? PT_RATIOS[0]!;
/** The share of the major part for ratio r: r / (1 + r). Golden 0.618, silver 0.586, 2:3 0.6, thirds 0.667. */
const majorOf = (r: number): number => r / (1 + r);
interface Suggestion { w: number; h: number; l1: number; l2: number; block: number; split: number }
/** What the chosen system suggests for this card: its shape at the same height, the three layers as a nested
 *  section (layers 1 and 2 take the major part; layer 1 takes the major part of that), the block and the split. */
function suggestion(): Suggestion {
  const R = ratioOf(), m = majorOf(R.r), h = S.ptH, w = Math.round((h / (R.r === 2 ? 1.5 : R.r)) * 10) / 10;
  const top = h * m, l1 = top * m, cw = S.ptW;
  const r1 = (v: number): number => Math.round(v * 10) / 10;
  return { w, h, l1: r1(l1), l2: r1(top - l1), block: r1(cw * (1 - m)), split: r1(cw * m) };
}
/** The guide lines of the chosen system on this card, for the eye and for snapping. */
function ratioLines(): { xs: number[]; ys: number[] } {
  const m = majorOf(ratioOf().r), w = S.ptW, h = S.ptH, top = h * m;
  return { xs: [w * m, w * (1 - m)], ys: [h * m, h * (1 - m), top * m] };
}
/** Whether the content view shows the proportion lines (the structure view always does). A view setting, not saved. */
let ptRatioLines = false;
function ratioGuides(): string {
  if (!ptRatioLines && ptView !== "structure") return "";
  const { xs, ys } = ratioLines(), sym = ratioOf().sym, col = "#B8925F";
  let o = "";
  for (const x of xs) o += line(x, -BLEED, x, PH + BLEED, col, "1.2 .8") + text(sym, x + 0.6, PH - 1.2, 1.6, { fill: col, weight: 600 });
  for (const y of ys) o += line(-BLEED, y, PW + BLEED, y, col, "1.2 .8") + text(sym, 0.6, y - 0.6, 1.6, { fill: col, weight: 600 });
  return `<g pointer-events="none" opacity=".9">${o}</g>`;
}
function applySuggestion(what: "shape" | "layers" | "all"): void {
  if (S.ptLock) return;
  const before = editSnapshot(), sg = suggestion();
  if (what !== "layers") { const k = sg.w / S.ptW; S.ptW = sg.w; S.ptBlock = Math.round(S.ptBlock * k * 10) / 10; S.ptSplit = Math.round(S.ptSplit * k * 10) / 10; }
  if (what !== "shape") { const s2 = suggestion(); S.ptL1 = s2.l1; S.ptL2 = s2.l2; S.ptBlock = s2.block; S.ptSplit = s2.split; }
  syncControls();
  pushUndo(before, `比例 ${ratioOf().zh} · ${what === "shape" ? "卡片形状" : what === "layers" ? "版面" : "全部"}`);
  onEditChanged(false);
  if (document.getElementById("pt-section")?.classList.contains("pt-focus")) setPtZoom(ptZoom);
}

// ---- content stays inside its own area once the structure is locked ----
/** The structure's own parts: shaped by the borders, never fitted or held like content. */
const STRUCTURE_IDS = new Set(["ground", "panel", "block", "photo-site", "photo-art", "photoImg-site", "photoImg-art"]); // pictures pan freely inside their frames
/** The area an element belongs to, inset from the layer's edges. */
function regionOf(id: string): DOMRect {
  syncPortrait();
  const y3 = L1 + L2, inset = (x0: number, y0: number, x1: number, y1: number, i: number): DOMRect => new DOMRect(x0 + i, y0 + i, Math.max(0, x1 - x0 - 2 * i), Math.max(0, y1 - y0 - 2 * i));
  if (id === "mark") return BLOCK_W > 6 ? inset(0, 0, BLOCK_W, L1, 1.5) : inset(0, 0, PW, L1, PM);
  if ((S.ptCL3 && ["phone", "email", "web", "address"].includes(id)) || ((S.ptQRPos === 1 || S.ptDir >= 1) && id === "address")) return new DOMRect(PM, y3 + 1.5, Math.max(0, PW - 2 * PM), Math.max(0, PH - y3 - 1.5 - PM * 0.75));
  if (["company", "role", "name", "nameEn", "phone", "email", "web", "address"].includes(id)) return new DOMRect(BLOCK_W + 2, PM * 0.75, Math.max(0, PW - PM - BLOCK_W - 2), Math.max(0, L1 - PM * 0.75 - 1.5));
  if (id === "tab-site") return S.ptPhotos === 1 ? inset(0, L1, PW, y3, 1) : inset(0, L1, SPLIT, y3, 1);
  if (id === "tab-art") return inset(SPLIT, L1, PW, y3, 1);
  return new DOMRect(PM, y3 + 1.5, Math.max(0, PW - 2 * PM), Math.max(0, PH - y3 - 1.5 - PM * 0.75));
}
/** While the structure is locked, a move stops at the edge of each moving element's area. */
function portraitClampMove(items: { id: string; box0: DOMRect }[], mx: number, my: number): [number, number] {
  if (!S.ptLock) return [mx, my];
  let lox = -Infinity, hix = Infinity, loy = -Infinity, hiy = Infinity;
  for (const it of items) {
    if (STRUCTURE_IDS.has(it.id)) continue;
    const R = regionOf(it.id), b = it.box0;
    lox = Math.max(lox, R.x - b.x); hix = Math.min(hix, R.x + R.width - (b.x + b.width));
    loy = Math.max(loy, R.y - b.y); hiy = Math.min(hiy, R.y + R.height - (b.y + b.height));
  }
  return [lox <= hix ? Math.min(hix, Math.max(lox, mx)) : mx, loy <= hiy ? Math.min(hiy, Math.max(loy, my)) : my];
}
/** Fit elements into their areas: shrink what is too big, then move it inside. Rotated elements keep their angle. */
function portraitFit(svg: SVGSVGElement, ids: string[]): number {
  let n = 0;
  // a group is fitted as one: scaled and moved together, so its parts keep their places to each other
  const loose: string[] = [];
  for (const unit of unitsOf(PORTRAIT_KEY, ids)) {
    const live = unit.filter((id) => { const g = groupOf(svg, id); return !STRUCTURE_IDS.has(id) && g && !g.dataset.locked && g.style.display !== "none"; });
    if (live.length < 2) { loose.push(...live); continue; }
    const boxes = live.map((id) => ({ id, g: groupOf(svg, id)!, b: currentBox(groupOf(svg, id)!, PORTRAIT_KEY) })).filter((x) => x.b.width && x.b.height);
    if (!boxes.length) continue;
    const x0 = Math.min(...boxes.map((x) => x.b.x)), y0 = Math.min(...boxes.map((x) => x.b.y)), x1 = Math.max(...boxes.map((x) => x.b.x + x.b.width)), y1 = Math.max(...boxes.map((x) => x.b.y + x.b.height));
    const R = regionOf(boxes[0]!.id), U = { w: x1 - x0, h: y1 - y0 };
    if (!R.width || !R.height) continue;
    const k = Math.min(1, R.width / U.w, R.height / U.h), w = U.w * k, h = U.h * k;
    const nx = Math.min(R.x + R.width - w, Math.max(R.x, x0)), ny = Math.min(R.y + R.height - h, Math.max(R.y, y0));
    if (k > 0.999 && Math.abs(nx - x0) < 0.01 && Math.abs(ny - y0) < 0.01) continue;
    for (const { id, g, b } of boxes) {
      const o = overrideOf(PORTRAIT_KEY, id), base = baseBox(g), sc = o.s * k;
      const cx = nx + (b.x + b.width / 2 - x0) * k, cy = ny + (b.y + b.height / 2 - y0) * k;
      setOverride(PORTRAIT_KEY, id, { ...o, s: sc, dx: cx - base.x - (base.width * sc) / 2, dy: cy - base.y - (base.height * sc) / 2 });
    }
    n++;
  }
  for (const id of loose) {
    const g = groupOf(svg, id);
    if (STRUCTURE_IDS.has(id) || !g || g.dataset.locked || g.style.display === "none") continue;
    const R = regionOf(id), o = overrideOf(PORTRAIT_KEY, id), b = currentBox(g, PORTRAIT_KEY), base = baseBox(g);
    if (!R.width || !R.height || !b.width || !b.height) continue;
    const k = Math.min(1, R.width / b.width, R.height / b.height), w = b.width * k, h = b.height * k;
    const x = Math.min(R.x + R.width - w, Math.max(R.x, b.x)), y = Math.min(R.y + R.height - h, Math.max(R.y, b.y));
    if (k > 0.999 && Math.abs(x - b.x) < 0.01 && Math.abs(y - b.y) < 0.01) continue;
    // rotation turns about the box's centre, so place the centre and the upright box follows
    const s = o.s * k, cx = x + w / 2, cy = y + h / 2;
    setOverride(PORTRAIT_KEY, id, { ...o, s, dx: cx - base.x - (base.width * s) / 2, dy: cy - base.y - (base.height * s) / 2 });
    n++;
  }
  return n;
}
/** 优化 Optimise: every visible content element, fitted into its area, in one undo step. */
function optimiseContent(): void {
  const svg = document.querySelector<SVGSVGElement>("#portrait-sheet svg");
  if (!svg) return;
  const before = editSnapshot(), ids = PT_CONTENT.flatMap(([, items]) => items.map(([id]) => id));
  const n = portraitFit(svg, ids);
  const msg = document.getElementById("pt-msg");
  if (msg) msg.textContent = n ? `已优化 ${n} 项 · ${n} item${n === 1 ? "" : "s"} fitted into their areas.` : "全部已在范围内 · Everything already sits inside its area.";
  if (n) commit(before, true, `优化 Optimise · ${n}`);
}

// ---- saved structures: size, borders and photos under a name, in the artifact's shared store ----
const STRUCT_KEYS = ["ptW", "ptH", "ptPhotos", "ptRatio", "ptL1", "ptL2", "ptBlock", "ptSplit", "ptGap", "ptMargin"] as const;
type StructDims = Record<(typeof STRUCT_KEYS)[number], number>;
interface StructDoc { id: string; name: string; savedAt: string; dims: StructDims }
let STRUCTS: StructDoc[] = [];
let structsLocal = false;
function currentDims(): StructDims { return Object.fromEntries(STRUCT_KEYS.map((k) => [k, S[k]])) as StructDims; }
function watchStructures(): void {
  if (!DB) { structsLocal = true; renderStructures(); return; }
  DB.collection("structures").orderBy("savedAt", "desc").limit(40).onSnapshot((snap) => {
    STRUCTS = snap.docs.map((d) => { const v = d.data() ?? {}; return { id: d.id, name: String(v.name ?? ""), savedAt: String(v.savedAt ?? ""), dims: (v.dims ?? {}) as StructDims }; })
      .filter((x) => typeof x.dims.ptW === "number");
    renderStructures();
  }, () => { structsLocal = true; renderStructures(); });
}
function renderStructures(): void {
  const el = document.getElementById("pt-structs");
  if (!el) return;
  const cur = JSON.stringify(currentDims());
  el.innerHTML = STRUCTS.length ? STRUCTS.map((x) =>
    `<div class="pt-struct${JSON.stringify(Object.fromEntries(STRUCT_KEYS.map((k) => [k, x.dims[k]]))) === cur ? " is-on" : ""}"><b>${esc(x.name)}</b>` +
    `<small>${f2(x.dims.ptW)} × ${f2(x.dims.ptH)} mm · 一 ${f2(x.dims.ptL1)} · 二 ${f2(x.dims.ptL2)} · ${x.dims.ptPhotos === 1 ? "一张图" : "两张图"}</small>` +
    `<code class="pt-sid">ID ${esc(x.id)}</code>` +
    `<span><button type="button" class="btn btn--sm" data-struct-use="${esc(x.id)}">使用并优化 Use</button><button type="button" class="btn btn--ghost btn--sm" data-struct-copy="${esc(x.id)}">复制 ID</button><button type="button" class="btn btn--ghost btn--sm" data-struct-del="${esc(x.id)}">删除</button></span></div>`).join("")
    : `<p class="hist__empty">${structsLocal ? "Saved structures need a signed-in view of this page; this one stays for this visit." : "还没有保存的结构 · No saved structures yet."}</p>`;
}
async function saveStructure(): Promise<void> {
  const inp = document.getElementById("pt-sname") as HTMLInputElement | null, R = ratioOf();
  const name = inp?.value.trim() || `${R.zh} · ${f2(S.ptW)} × ${f2(S.ptH)} · ${fmtTime(new Date().toISOString())}`;
  const before = editSnapshot();
  S.ptLock = 1;   // a saved structure is the frame the content is fitted into
  const svg = document.querySelector<SVGSVGElement>("#portrait-sheet svg");
  if (svg) portraitFit(svg, PT_CONTENT.flatMap(([, items]) => items.map(([id]) => id)));
  commit(before, true, `保存结构 Save structure · ${name}`);
  const msg = document.getElementById("pt-msg"), doc = { name, savedAt: new Date().toISOString(), dims: currentDims() };
  if (DB) {
    try { const ref = await DB.collection("structures").add(doc); if (msg) msg.textContent = `已保存并锁定 · Saved and locked: ${name} · ID ${ref.id}`; if (inp) inp.value = ""; return; }
    catch { /* falls through to this visit only */ }
  }
  STRUCTS = [{ id: `local-${Date.now()}`, ...doc }, ...STRUCTS];
  structsLocal = true;
  renderStructures();
  if (msg) msg.textContent = `已锁定（仅本次访问）· Locked; kept for this visit only: ${name}`;
}
/** Apply a saved structure by its ID, then fit the layout and type to it. */
function useStructure(id: string): boolean {
  const x = STRUCTS.find((d) => d.id === id.trim());
  if (!x) return false;
  const before = editSnapshot();
  for (const k of STRUCT_KEYS) if (typeof x.dims[k] === "number") S[k] = x.dims[k];
  S.ptLock = 1;
  syncControls();
  commit(before, true, `使用结构 Use structure · ${x.name}`);
  autoLayout();
  if (document.getElementById("pt-section")?.classList.contains("pt-focus")) setPtZoom(ptZoom);
  return true;
}
async function deleteStructure(id: string): Promise<void> {
  if (id.startsWith("local-") || !DB) { STRUCTS = STRUCTS.filter((x) => x.id !== id); renderStructures(); return; }
  try { await DB.collection("structures").doc(id).delete(); } catch { const m = document.getElementById("pt-msg"); if (m) m.textContent = "This structure could not be deleted here."; }
}
function setLock(on: boolean): void {
  const before = editSnapshot();
  S.ptLock = on ? 1 : 0;
  if (on) { const svg = document.querySelector<SVGSVGElement>("#portrait-sheet svg"); if (svg) portraitFit(svg, PT_CONTENT.flatMap(([, items]) => items.map(([i]) => i))); }
  commit(before, true, on ? "锁定结构 Lock structure" : "解锁结构 Unlock structure");
}
function renderProportion(): void {
  const el = document.getElementById("pt-suggest");
  if (!el) return;
  const sg = suggestion(), R = ratioOf();
  el.innerHTML = `${R.sym} 建议 ${f2(sg.w)}×${f2(sg.h)} · ${f2(sg.l1)} / ${f2(sg.l2)} / ${f2(Math.round((sg.h - sg.l1 - sg.l2) * 10) / 10)}`;
  document.querySelectorAll<HTMLInputElement>('input[name="ptRatio"]').forEach((r) => { r.checked = Number(r.value) === S.ptRatio; });
  document.querySelectorAll<HTMLInputElement>('input[name="ptPhotos"]').forEach((r) => { r.checked = Number(r.value) === S.ptPhotos; });
  document.querySelectorAll<HTMLInputElement>('input[name="ptL1Dark"]').forEach((r) => { r.checked = Number(r.value) === S.ptL1Dark; });
  document.querySelectorAll<HTMLInputElement>('input[name="ptQRPos"]').forEach((r) => { r.checked = Number(r.value) === S.ptQRPos; });
  document.querySelectorAll<HTMLInputElement>('input[name="ptTheme"]').forEach((r) => { r.checked = Number(r.value) === S.ptTheme; });
  document.querySelectorAll<HTMLInputElement>('input[name="ptQRInv"]').forEach((r) => { r.checked = Number(r.value) === S.ptQRInv; });
  document.querySelectorAll<HTMLInputElement>('input[name="ptAxisStyle"]').forEach((r) => { r.checked = Number(r.value) === S.ptAxisStyle; });
  document.querySelectorAll<HTMLInputElement>('input[name="ptLineStyle"]').forEach((r) => { r.checked = Number(r.value) === S.ptLineStyle; });
  const lockBtn = document.getElementById("pt-lock");
  if (lockBtn) { lockBtn.textContent = S.ptLock ? "已锁定" : "锁定"; lockBtn.title = S.ptLock ? "Unlock structure" : "Lock structure"; lockBtn.setAttribute("aria-pressed", String(!!S.ptLock)); }
  // size, proportion and borders are always open; the lock keeps the content inside its layers
  document.getElementById("pt-section")?.classList.toggle("pt-locked", !!S.ptLock);
}
function wireProportion(): void {
  const sec = document.getElementById("pt-section");
  sec?.addEventListener("change", (e) => {
    const t = e.target as HTMLInputElement;
    if (t.name === "ptTheme") {
      const before = editSnapshot();
      S.ptTheme = Number(t.value) || 0;
      pushUndo(before, `色调 · ${PT_THEMES[S.ptTheme]?.zh ?? ""}`);
      dirCache.key = ""; l1Cache.key = "";
      onEditChanged(false);
      return;
    }
    if (t.name === "ptQRInv") {
      const before = editSnapshot();
      S.ptQRInv = t.value === "0" ? 0 : 1;
      pushUndo(before, `码色 QR · ${S.ptQRInv ? "反白" : "标准"}`);
      onEditChanged(false);
      return;
    }
    if (t.name === "ptAxisStyle" || t.name === "ptLineStyle") {
      const before = editSnapshot(), v = Number(t.value) || 0;
      if (t.name === "ptAxisStyle") S.ptAxisStyle = v; else { S.ptLineStyle = v; S.ptFootStyle = -1; }
      pushUndo(before, t.name === "ptAxisStyle" ? `中轴 Axis · ${AXIS_STYLES[v] ?? ""}` : `层线 Lines · ${LINE_STYLES[v] ?? ""}`);
      onEditChanged(false);
      return;
    }
    if (t.name === "ptRatio" || t.name === "ptPhotos" || t.name === "ptL1Dark" || t.name === "ptQRPos") {
      const before = editSnapshot();
      if (t.name === "ptRatio") S.ptRatio = Number(t.value) || 0;
      else if (t.name === "ptPhotos") S.ptPhotos = t.value === "1" ? 1 : 2;
      else if (t.name === "ptL1Dark") S.ptL1Dark = t.value === "1" ? 1 : 0;
      else S.ptQRPos = t.value === "1" ? 1 : 0;
      pushUndo(before, t.name === "ptRatio" ? `比例 Proportion · ${ratioOf().zh}` : t.name === "ptPhotos" ? `照片 Photos · ${S.ptPhotos === 1 ? "一张" : "两张"}`
        : t.name === "ptL1Dark" ? `第一层右侧 · ${S.ptL1Dark ? "墨 Charcoal" : "白 White"}` : `二维码 QR · ${S.ptQRPos ? "底部居中" : "右栏"}`);
      onEditChanged(false);
    } else if (t.id === "pt-rlines") { ptRatioLines = t.checked; renderPortrait(); }
  });
  renderStructures();
  document.getElementById("pt-apply")?.addEventListener("click", (e) => {
    const w = (e.target as Element).closest<HTMLElement>("[data-apply]")?.dataset.apply;
    if (w === "shape" || w === "layers" || w === "all") applySuggestion(w);
  });
  document.getElementById("pt-save-struct")?.addEventListener("click", () => void saveStructure());
  document.getElementById("pt-lock")?.addEventListener("click", () => setLock(!S.ptLock));
  document.getElementById("pt-optimise")?.addEventListener("click", optimiseContent);
  document.getElementById("pt-structs")?.addEventListener("click", (e) => {
    const t = e.target as Element, u = t.closest<HTMLElement>("[data-struct-use]"), d = t.closest<HTMLElement>("[data-struct-del]");
    const c = t.closest<HTMLElement>("[data-struct-copy]"), msg = document.getElementById("pt-msg");
    if (u) useStructure(u.dataset.structUse ?? "");
    else if (c) { const id = c.dataset.structCopy ?? ""; void copyText(id).then((ok) => { if (msg) msg.textContent = ok ? `已复制 · Copied ID ${id}` : `复制不可用，请手动选择 · Select to copy: ${id}`; }); }
    else if (d) void deleteStructure(d.dataset.structDel ?? "");
  });
  const useById = (): void => {
    const inp = document.getElementById("pt-sid-in") as HTMLInputElement | null, id = inp?.value.trim() ?? "", msg = document.getElementById("pt-msg");
    if (!id) return;
    if (useStructure(id)) { if (inp) inp.value = ""; } else if (msg) msg.textContent = `找不到这个 ID · No saved structure has the ID ${id}`;
  };
  document.getElementById("pt-sid-use")?.addEventListener("click", useById);
  document.getElementById("pt-sid-in")?.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); useById(); } });
  document.getElementById("pt-auto")?.addEventListener("click", autoLayout);
  // the saved structures are read once the store is reached (initStore calls watchStructures)
}

// ---- 自适应优化: layout and type fitted to the structure ----
// For each layer, the largest type scale (0.5 to 1.6) at which every visible line fits its area without
// overlapping: layer 1 keeps a clear gap between the name and the contacts and keeps 西顶文化, the title and the
// name inside the text column; layer 3 keeps the pillars inside their columns and above the bottom margin, with the
// QR as large as the layer allows (10 to 28 mm). The logo fills the block, the photo labels follow the photo layer's
// height. Every move and scale on the content is cleared, so the layout is the computed one; hidden items stay hidden.
function layer1Fits(p: Person, k: number): { ok: boolean; name: number } {
  const x = BLOCK_W + 4, A = Math.max(6, PW - PM - x), co = p.company.trim(), title = roleText(p);
  if (shown("company") && co && textW(co, 2.3 * k, SERIF, 600, 0.3) > A) return { ok: false, name: 0 };
  if (shown("role") && title && textW(title, 1.8 * k, SANS, 500, 0) > A) return { ok: false, name: 0 };
  let yc = PM;
  if (shown("company") && co) yc += INK_TOP * 2.3 * k + 1.6 * k;
  const nm = p.nameZh.trim(), w1 = nm ? textW(nm, 1, SERIF, 600, 0.1) : 1;
  const name = shown("name") && nm ? Math.min(NAME_MM * k, A / w1) : 0;
  let bottom = yc + (name ? INK_TOP * name + 1.2 * k : 0) + (shown("nameEn") && p.nameEn.trim() ? 3.2 * k : 0) + (shown("role") && title ? 3.4 * k : 0) + 0.5 * k;
  if (shown("nameEn") && p.nameEn.trim() && textW(p.nameEn.trim(), 1.8 * k, SANS, 500, 0) > A) return { ok: false, name };
  const n = S.ptCL3 ? 0 : contactLines(p, k, A);
  const contactsTop = n ? L1 - 3.2 * k - (n - 1) * 2.6 * k - INK_TOP * 1.8 * k : L1 - PM;
  bottom += 2.2 * k;
  return { ok: bottom <= contactsTop && contactsTop >= PM, name };
}
function layer3Fits(k: number, q: number, p?: Person): boolean {
  const L = layer3Geometry(k, q, p), floor = PH - PM * 0.75;
  if (L.addr.length && L.addr.some((t) => textW(t, L.addrSize, SANS, 400, 0) > PW - 2 * PM)) return false;
  // the QR group under the lists keeps inside the bottom margin, descenders included
  if (S.ptQRPos === 1 && L.captionEnd + 0.4 * k > PH - PM) return false;
  if (L.listEnd > floor || L.captionEnd > floor) return false;
  // contacts at the bottom left: above the bottom margin, clear of the pillar lists
  if (S.ptCL3 && p) {
    const n = contactLines(p, k, L.leftW);
    if (n && PH - PM - (n - 1) * 2.6 * k - INK_TOP * 1.8 * k < L.listEnd + 2 * k) return false;
  }
  const avail = L.colW - 1.5 * k;
  for (const [i, pl] of PILLARS.entries()) {
    const id = `pillar${i + 1}`;
    if (shown(id) && textW(pl.zh, 2.4 * k, SERIF, 600, 0.04) > avail) return false;
    if (shown(`${id}En`) && textW(pl.en, 1.35 * k, SANS, 500, 0) > avail) return false;
    if (shown(`${id}List`) && pl.services.some((sv) => textW(sv, 1.7 * k, SANS, 400, 0) > avail)) return false;
  }
  if (shown("solutions") && textW("为客户提供 · Solutions for clients", 1.35 * k, SANS, 500, 0.04) > PW - 2 * PM) return false;
  return true;
}
const K_STEPS = Array.from({ length: 56 }, (_, i) => Math.round((1.6 - i * 0.02) * 100) / 100); // 1.6 … 0.5
// Fitting no longer blows type up to fill the space: each layer has a designed size (k = 1) and may grow a little
// (layer 1 to 1.2, layer 3 to 1.15) or shrink until it fits. The QR is card-sized: about a fifth of the width,
// 10.5 to 14 mm (25 modules, 0.4 to 0.55 mm each), whatever room is left.
// The card's type scale, at k = 1 (mm of font size): name 3.6 (about 10 pt), pillar names 2.8, contacts and services
// 1.9 to 2.0, company and labels about 1.8, tracked. Fitting keeps these sizes and only shrinks a layer that does not fit.
const NAME_MM = 3.6;
const K1_STEPS = K_STEPS.filter((k) => k <= 1), K3_STEPS = K_STEPS.filter((k) => k <= 1);
// on a dark card the QR is the one white shape, so it is kept a step smaller
// (and never under 11.5 mm there: an inverted code on a narrow card needs modules of about 0.35 mm to print and scan)
const qPref = (): number => S.ptTheme >= 1 ? Math.round(Math.max(11.5, PW * 0.19) * 2) / 2 : Math.round(Math.min(13, Math.max(11, PW * 0.21)) * 2) / 2;
function autoLayout(): void {
  const p = state.data[state.person] ?? PEOPLE[0]!, before = editSnapshot();
  syncPortrait();
  // the content's own moves and scales go; hidden items stay hidden
  for (const id of PT_CONTENT.flatMap(([, items]) => items.map(([i]) => i))) {
    if (STRUCTURE_IDS.has(id)) continue;
    const o = overrideOf(PORTRAIT_KEY, id);
    setOverride(PORTRAIT_KEY, id, o.hidden ? { dx: 0, dy: 0, s: 1, hidden: true } : { dx: 0, dy: 0, s: 1 });
  }
  S.ptNameX = 0; S.ptNameY = 0; S.ptFoot = 0; S.ptAxis = 0;
  fitS(p);
  syncControls();
  commit(before, true, `自适应优化 Auto layout · ${PT_LAYOUTS[layoutIndex()]?.zh ?? ""} · ${f2(S.ptW)} × ${f2(S.ptH)}`);
  const msg = document.getElementById("pt-msg");
  if (msg) msg.textContent = `已按当前结构优化 · Fitted to this structure${S.ptCL3 ? "（联系方式移到第三层 · contacts moved to layer 3）" : ""}: 一 字号 ×${S.ptK1} · 姓名 ${f2(S.ptName)} mm · 标志 ${f2(S.ptMark)} mm · 三 字号 ×${S.ptK3} · 二维码 ${f2(S.ptQR)} mm`;
}
/** The type sizes, logo and QR that fit the current structure and layout direction. Changes S only. */
function fitS(p: Person): void {
  syncPortrait();
  if (S.ptDir >= 1) { fitDirection(p); fitCommon(); return; }
  // two arrangements: the contacts in layer 1, or moved down to layer 3; the one whose smaller type scale is larger wins
  const qMax = qPref();
  const solve = (cl3: number): { k1: number; name: number; k3: number; q: number } => {
    S.ptCL3 = cl3;
    let k1 = 0.5, name = 2.6;
    for (const k of K1_STEPS) { const r = layer1Fits(p, k); if (r.ok) { k1 = k; name = r.name; break; } }
    let best: { k: number; q: number } | null = null;
    for (let q = qMax; q >= 10.5 && !best; q -= 0.5) for (const k of K3_STEPS) if (layer3Fits(k, q, p)) { if (k >= 0.8 || q <= 11) best = { k, q }; break; }
    if (!best) for (const k of K3_STEPS) if (layer3Fits(k, 10.5, p)) { best = { k, q: 10.5 }; break; }
    return { k1, name, k3: best?.k ?? 0.5, q: best?.q ?? 10 };
  };
  const a = solve(0), bSol = S.ptQRPos === 1 ? a : solve(1), useB = Math.min(bSol.k1, bSol.k3) > Math.min(a.k1, a.k3) + 0.05, pick = useB ? bSol : a;
  S.ptCL3 = useB ? 1 : 0;
  S.ptK1 = pick.k1; if (pick.name) S.ptName = Math.round(pick.name * 10) / 10;
  S.ptK3 = pick.k3; S.ptQR = pick.q;
  fitCommon();
}
/** The logo and the photo labels, the same in every direction. */
function fitCommon(): void {
  // the logo: as tall as the block's width allows, inside the layer's margins
  const d = VI.dots;
  if (BLOCK_W > 5) S.ptMark = Math.round(Math.max(4, Math.min(((BLOCK_W - 4) * d[3]) / d[2], L1 - 2 * PM, 40)) * 2) / 2;
  // layer 2: the labels follow the photo layer's height
  S.ptK2 = Math.round(Math.min(1.4, Math.max(0.7, L2 / 22)) * 100) / 100;
}
async function copyText(t: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(t); return true; } catch { /* the view may not allow it */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = t; ta.style.cssText = "position:fixed;opacity:0"; document.body.appendChild(ta); ta.select();
    const ok = document.execCommand("copy"); ta.remove(); return ok;
  } catch { return false; }
}

// ---- the picture's zoom and turn, from the panel (its corner handles can lie outside the card) ----
const PIC_IDS = ["photoImg-site", "photoImg-art"] as const;
/** The picture the panel acts on: the selected one, else the first that is drawn. */
function activePicture(): string | null {
  if (sel?.key === PORTRAIT_KEY) { const id = sel.ids.find((i) => i.startsWith("photoImg-")); if (id) return id; }
  const svg = document.querySelector<SVGSVGElement>("#portrait-sheet svg");
  return PIC_IDS.find((id) => svg?.querySelector(`g[data-el="${id}"]`)) ?? null;
}
/** Set the picture's zoom and turn about its own centre, keeping where it sits. */
function setPicture(id: string, s: number, r: number): void {
  const svg = document.querySelector<SVGSVGElement>("#portrait-sheet svg"), g = svg ? groupOf(svg, id) : null;
  if (!g) return;
  const o = overrideOf(PORTRAIT_KEY, id), base = baseBox(g);
  const cx = base.x + o.dx + (base.width * o.s) / 2, cy = base.y + o.dy + (base.height * o.s) / 2;
  setOverride(PORTRAIT_KEY, id, { ...o, s, r: ((r % 360) + 360) % 360, dx: cx - base.x - (base.width * s) / 2, dy: cy - base.y - (base.height * s) / 2 });
}
function syncPictureControls(): void {
  const id = activePicture(), zs = document.getElementById("pt-pic-s") as HTMLInputElement | null, zr = document.getElementById("pt-pic-r") as HTMLInputElement | null;
  const box = document.getElementById("pt-pic");
  if (box) box.hidden = !id;
  if (!id || !zs || !zr) return;
  const o = overrideOf(PORTRAIT_KEY, id), r = o.r ? (o.r > 180 ? o.r - 360 : o.r) : 0;
  if (document.activeElement !== zs) zs.value = String(o.s);
  if (document.activeElement !== zr) zr.value = String(Math.round(r * 10) / 10);
  const os = document.getElementById("pt-pic-so"), or = document.getElementById("pt-pic-ro");
  if (os) os.textContent = `${Math.round(o.s * 100)}%`;
  if (or) or.textContent = `${Math.round(r * 10) / 10}°`;
}
function wirePicture(): void {
  let before: string | null = null;
  const live = (): void => {
    const id = activePicture(), zs = document.getElementById("pt-pic-s") as HTMLInputElement | null, zr = document.getElementById("pt-pic-r") as HTMLInputElement | null;
    if (!id || !zs || !zr) return;
    before ??= editSnapshot();
    setPicture(id, Number(zs.value) || 1, Number(zr.value) || 0);
    renderPortrait();
  };
  const done = (label: string): void => { if (before) { pushUndo(before, label); before = null; onEditChanged(false); } };
  const zs = document.getElementById("pt-pic-s"), zr = document.getElementById("pt-pic-r");
  zs?.addEventListener("input", live); zr?.addEventListener("input", live);
  zs?.addEventListener("change", () => done("照片画面 Picture · 缩放 Zoom"));
  zr?.addEventListener("change", () => done("照片画面 Picture · 旋转 Turn"));
  document.getElementById("pt-pic-reset")?.addEventListener("click", () => {
    const id = activePicture();
    if (!id) return;
    const b = editSnapshot(), o = overrideOf(PORTRAIT_KEY, id);
    setOverride(PORTRAIT_KEY, id, o.hidden ? { dx: 0, dy: 0, s: 1, hidden: true } : { dx: 0, dy: 0, s: 1 });
    commit(b, true, "照片画面 Picture · 重置 Reset");
  });
}

// ---- layout directions: the same structure, the content laid out four ways ----
// 方案一 is the original (left column, pillars side by side, QR and address centred). The others are plans: each places
// every element and says whether it all fits, so 自适应优化 can search the type scale for it.
interface PtLayout { dir: number; g: number; zh: string; en: string; note: string }
const PT_LAYOUTS: PtLayout[] = [
  { dir: 0, g: 0, zh: "方案一", en: "Left-aligned", note: "左栏文字；两栏支柱；码与地址居中。" },
  { dir: 4, g: 0, zh: "5A 居中", en: "Grid, centred", note: "支柱平分两栏，居中于照片与页脚之间；页脚细线，地址在左，小二维码在右。" },
  { dir: 4, g: 1, zh: "5B 码左", en: "QR at left", note: "同 5A，页脚左右互换：二维码在左，地址靠右对齐。" },
  { dir: 4, g: 2, zh: "5C 上齐", en: "Top-aligned", note: "支柱紧跟照片下方，留白集中在支柱与页脚之间。" },
  { dir: 4, g: 3, zh: "5D 横线", en: "Bar over names", note: "每个支柱名上方一条短青色横线，取代竖线；文字与栏左缘对齐。" },
  { dir: 4, g: 4, zh: "5E 双行", en: "Rows", note: "每个支柱一行：左为名称，右为四项服务排成两行两列；两行上下居中。" },
  { dir: 4, g: 5, zh: "5F 中轴", en: "Centred halves", note: `${BRANDS[0]}与${BRANDS[1]}各居半栏中心，名上一条短青色横线，服务居中排在名下；下方居中依次为二维码、地址、网址，落在底边距上。` },
  { dir: 4, g: 7, zh: "5H 镜像页脚", en: "Mirrored, footer", note: "支柱以中线镜像对齐；页脚一条细线，地址与网址在左，小二维码在右下角，与左上的标志成对角。" },
  { dir: 4, g: 8, zh: "5I 规范", en: "Benchmark", note: "按印刷与排版规范：两栏以中轴镜像，放在两条线之间的黄金分割处（上 0.382 : 下 0.618）；页脚地址在左，二维码在右下角，标准黑码白底、四格留白。" },
  { dir: 4, g: 6, zh: "5G 镜像", en: "Mirrored on the axis", note: `中线一条青色细线：${BRANDS[0]}与其服务靠右对齐于中线，${BRANDS[1]}与其服务从中线靠左对齐；下方居中依次为二维码、地址、网址。` },
];
const layoutIndex = (): number => Math.max(0, PT_LAYOUTS.findIndex((l) => l.dir === S.ptDir && (l.dir === 0 || l.g === S.ptGrid)));
interface Plan { ok: boolean; svg: string }
interface PLine { id: string; t: string; size: number; family: string; weight: number; sp: number; fill: string; gap: number; on: boolean }
const P_LABELS: Record<string, string> = { company: "西顶文化", name: "姓名 Name", nameEn: "英文名 Romanisation", role: "职务 Title", phone: "电话 Phone", email: "邮箱 Email", web: "网址 Website" };
/** Draw lines as elements, one per id, at the baselines given. */
function lineEls(lines: PLine[], ys: number[], x: (l: PLine) => number, anchor: "start" | "middle" | "end"): string {
  const by: Record<string, string> = {}, order: string[] = [];
  lines.forEach((l, i) => {
    if (!(l.id in by)) { by[l.id] = ""; order.push(l.id); }
    by[l.id] += text(l.t, x(l), ys[i] ?? 0, l.size, { family: l.family, weight: l.weight, spacing: l.sp || undefined, anchor, fill: l.fill });
  });
  return order.map((id) => el(id, P_LABELS[id] ?? id, by[id] ?? "")).join("");
}
/** Layer 1 in directions 2 to 4: centred (2), flush right (3) or flush left (4). */
function identityPlan(p: Person, k: number, N: number, dir: number): Plan {
  if (dir === 4 && S.ptL1Style >= 1) return identityStyle(p, k, N, S.ptL1Style);
  const ink = l1Ink(), centred = dir === 1, right = dir === 2;
  const x0 = BLOCK_W + (centred ? 3 : 4), x1 = PW - (centred ? 3 : PM), A = Math.max(6, x1 - x0), cx = (x0 + x1) / 2;
  const anchor = centred ? "middle" : right ? "end" : "start", ax = centred ? cx : right ? x1 : x0;
  const co = p.company.trim(), title = roleText(p), nm = p.nameZh.trim(), en = p.nameEn.trim();
  const top: PLine[] = [], bottom: PLine[] = [];
  const cs = 2 * k, cl = 2.8 * k;   // contacts: size and lead
  if (co) top.push({ id: "company", t: co, size: 1.8 * k, family: SERIF, weight: 600, sp: 0.4, fill: ink.co, gap: 0, on: shown("company") });
  if (nm) top.push({ id: "name", t: nm, size: N, family: SERIF, weight: 600, sp: 0.1, fill: ink.fg, gap: 2.4 * k, on: shown("name") });
  if (en) top.push({ id: "nameEn", t: en, size: 1.8 * k, family: SANS, weight: 500, sp: 0, fill: ink.fg, gap: 1.0 * k, on: shown("nameEn") });
  if (title) top.push({ id: "role", t: title, size: 1.8 * k, family: SANS, weight: 500, sp: 0.06, fill: ink.fg, gap: 1.5 * k, on: shown("role") });
  for (const [kind, v] of contacts(p)) {
    if (kind === "address") continue;   // the address sits with the QR in layer 3
    wrap(v, cs, A).forEach((t, i) => bottom.push({ id: kind, t, size: cs, family: SANS, weight: 400, sp: 0, fill: ink.fg, gap: i ? 0.8 * k : 1.09 * k, on: shown(kind) }));
  }
  let ok = [...top, ...bottom].every((l) => !l.on || textW(l.t, l.size, l.family, l.weight, l.sp) <= A + 0.01);
  const all = [...top, ...bottom], ys = new Array<number>(all.length).fill(PM + 3);
  const stack = (ls: PLine[], start: number, firstGap: boolean): number[] => {
    let y = start; const out: number[] = [];
    ls.forEach((l) => { if (!l.on) { out.push(PM + 3); return; } y += (out.some((_, j) => ls[j]?.on) || firstGap ? l.gap : 0) + INK_TOP * l.size; out.push(y); });
    return out;
  };
  const height = (ls: PLine[]): number => { let h = 0, first = true; for (const l of ls) if (l.on) { h += (first ? 0 : l.gap) + INK_TOP * l.size; first = false; } return h; };
  const yMin = PMY, yMax = L1 - 2;
  if (centred) {
    // one block, centred in the panel's height; the contacts open with a wider gap
    const seq = [...top, ...bottom.map((l, i) => (i === 0 ? { ...l, gap: 2.2 * k } : { ...l, gap: 2.6 * k - INK_TOP * 1.8 * k }))];
    const h = height(seq);
    ok = ok && h <= yMax - yMin;
    stack(seq, yMin + Math.max(0, (yMax - yMin - h) / 2), false).forEach((y, i) => { ys[i] = y; });
  } else {
    // the top stack from the margin, the contacts up from the layer's foot
    stack(top, yMin, false).forEach((y, i) => { ys[i] = y; });
    const tops = top.filter((l) => l.on), topEnd = tops.length ? Math.max(...top.map((l, i) => (l.on ? ys[i] ?? 0 : 0))) : yMin;
    const onB = bottom.filter((l) => l.on).length;
    // the visible contact lines, evenly from the foot up
    let n = 0;
    for (let i = bottom.length - 1; i >= 0; i--) { if (!bottom[i]!.on) continue; ys[top.length + i] = yMax - 0.4 * k - n * cl; n++; }
    const firstContact = onB ? yMax - 0.4 * k - (onB - 1) * cl - INK_TOP * cs : yMax;
    ok = ok && topEnd + 1.8 * k <= firstContact;
  }
  // the name's own nudges from the sliders
  const xs = (l: PLine): number => ax + (l.id === "name" || l.id === "nameEn" ? S.ptNameX : 0);
  const ysN = ys.map((y, i) => y + (all[i]?.id === "name" || all[i]?.id === "nameEn" ? S.ptNameY : 0));
  return { ok, svg: lineEls(all, ysN, xs, anchor) };
}
/** Services as lines of items joined by a middle dot, breaking only between items, each line at most w wide. */
function serviceLines(items: string[], size: number, w: number): string[] {
  const out: string[] = []; let cur = "";
  for (const it of items) {
    const next = cur ? `${cur}  ·  ${it}` : it;
    if (cur && textW(next, size, SANS, 400, 0) > w) { out.push(cur); cur = it; } else cur = next;
  }
  if (cur) out.push(cur);
  return out;
}
/** Layer 3 in the grid layouts (方案五 and its variants). */
function pillarsPlan(p: Person, k: number, qSize: number, dir: number): Plan {
  const floor = PH - PM, q = shown("qr") ? qSize : 0, W = PW - 2 * PM, teal = P_TEAL, ruleW = 0.6 * Math.max(1, k);
  let s = "", ok = true, y = L1 + L2 + 3 * k;
  const sol = "为客户提供 · Solutions for clients", solOn = shown("solutions");
  if (solOn && textW(sol, 1.35 * k, SANS, 500, 0.04) > W) ok = false;
  s += el("solutions", "为客户提供 Solutions", text(sol, PM, y + INK_TOP * 1.35 * k, 1.35 * k, { fill: P_MUTED, weight: 500, spacing: 0.04 }));
  if (solOn) y += INK_TOP * 1.35 * k + 2 * k;
  void dir; void floor; void teal; void ruleW;
  return gridPlan(p, k, q, y, ok, s);
}
/** 自适应优化 for the grid layouts: the largest layer-1 type, then the largest QR and layer-3 type, that fit. */
function fitDirection(p: Person): void {
  const dir = S.ptDir, centred = dir === 1, x0 = BLOCK_W + (centred ? 3 : 4), x1 = PW - (centred ? 3 : PM), A = Math.max(6, x1 - x0);
  const nm = p.nameZh.trim(), w1 = nm ? textW(nm, 1, SERIF, 600, 0.1) : 1;
  let k1 = 0.5, name = 2.6;
  for (const k of K1_STEPS) { const N = Math.min(NAME_MM * k, A / w1); if (identityPlan(p, k, N, dir).ok) { k1 = k; name = N; break; } }
  S.ptK1 = k1; S.ptName = Math.round(name * 10) / 10; S.ptCL3 = 0;
  const qMax = qPref();
  let best: { k: number; q: number } | null = null;
  for (let q = qMax; q >= 10.5 && !best; q -= 0.5) for (const k of K3_STEPS) if (pillarsPlan(p, k, q, dir).ok) { if (k >= 0.8 || q <= 11) best = { k, q }; break; }
  if (!best) for (const k of K3_STEPS) if (pillarsPlan(p, k, 10.5, dir).ok) { best = { k, q: 10.5 }; break; }
  S.ptK3 = best?.k ?? 0.5; S.ptQR = best?.q ?? 10;
}
/** Each layout drawn small, fitted on its own, with what is turned off left off. Cached until something changes. */
let dirCache = { key: "", html: "" };
function renderDirections(): void {
  const host = document.getElementById("pt-dirs");
  if (!host) return;
  const p = state.data[state.person] ?? PEOPLE[0]!, cur = layoutIndex();
  const hidden = Object.keys(state.ov).filter((k) => k.startsWith("portrait:") && state.ov[k]?.hidden).sort();
  const key = JSON.stringify([currentDims(), S.ptL1Dark, hidden, p, state.person, cur, S.ptL1Style, S.ptTheme]);
  if (dirCache.key !== key) {
    const keepS = { ...S };
    const thumbs = PT_LAYOUTS.map((d, i) => {
      try {
        S.ptDir = d.dir; S.ptGrid = d.g; S.ptNameX = 0; S.ptNameY = 0; S.ptFoot = 0; S.ptAxis = 0; fitS(p);
        // the thumbnails leave the picture out: they compare layouts, and the picture is the same in all of them
        const svg = portraitSvg(p, false, false, "content").replace(` data-key="${PORTRAIT_KEY}"`, "").replace(/<image [^>]*\/>/g, "").replace(/id="pclip-/g, `id="pclipT${i}-`).replace(/url\(#pclip-/g, `url(#pclipT${i}-`);
        return `<button type="button" class="pt-dir${i === cur ? " is-on" : ""}" data-dir="${i}" aria-pressed="${i === cur}" title="${esc(d.en)} · ${esc(d.note)}">${svg}<b>${d.zh}</b></button>`;
      } finally { Object.assign(S, keepS); syncPortrait(); }
    });
    dirCache = { key, html: thumbs.join("") };
    host.innerHTML = dirCache.html;
    host.querySelectorAll<SVGGElement>("g[data-el]").forEach((g) => { if (overrideOf(PORTRAIT_KEY, g.dataset.el ?? "").hidden) g.style.display = "none"; });
  }
  const note = document.getElementById("pt-dir-note");
  if (note) note.textContent = PT_LAYOUTS[cur]?.note ?? "";
}
/** Choose a layout: fitted to the structure, as one undo step. The structure does not change. */
function applyDirection(i: number): void {
  const L = PT_LAYOUTS[i];
  if (!L) return;
  const p = state.data[state.person] ?? PEOPLE[0]!, before = editSnapshot();
  S.ptDir = L.dir; S.ptGrid = L.g;
  if (L.dir === 4 && L.g >= 5) for (const id of ["qr", "address", "qrCaption"]) { const o = overrideOf(PORTRAIT_KEY, id); if (o.hidden) setOverride(PORTRAIT_KEY, id, { ...o, hidden: false }); }
  for (const id of PT_CONTENT.flatMap(([, items]) => items.map(([x]) => x))) {
    if (STRUCTURE_IDS.has(id)) continue;
    const o = overrideOf(PORTRAIT_KEY, id);
    setOverride(PORTRAIT_KEY, id, o.hidden ? { dx: 0, dy: 0, s: 1, hidden: true } : { dx: 0, dy: 0, s: 1 });
  }
  S.ptNameX = 0; S.ptNameY = 0; S.ptFoot = 0; S.ptAxis = 0;
  fitS(p);
  syncControls();
  dirCache.key = "";
  commit(before, true, `版式 Layout · ${L.zh}`);
}

/** 方案五 · 网格对齐 and its variants (S.ptGrid): layer 3 as pillars over a footer that rests on the bottom margin.
 *  5A pillars in two equal halves, centred between the photo and the footer; footer: hairline, address left, QR right.
 *  5B the footer mirrored: QR left, address flush right. 5C the pillars just under the photo. 5D a short teal bar over
 *  each name instead of the vertical rule. 5E each pillar one row: its name, then its services two by two. */
function gridPlan(p: Person, k: number, qSize: number, yTop: number, okIn: boolean, sIn: string): Plan {
  if (S.ptGrid >= 5) return centrePlan(p, k, qSize, yTop, okIn, sIn);
  let ok = okIn, s = sIn;
  const g = S.ptGrid, q = shown("qr") ? qSize : 0, floor = PH - PMY, W = PW - 2 * PM, ruleW = 0.6 * Math.max(1, k);
  // the footer
  const qLeft = g === 1, qx = qLeft ? PM : PW - PM - q, qy = floor - q;
  const tx0 = qLeft && q ? PM + q + 3 : PM, tx1 = !qLeft && q ? qx - 3 : PW - PM, tw = tx1 - tx0;
  const tX = qLeft ? tx1 : tx0, tAnchor = qLeft ? "end" : "start";
  const addrOn = shown("address") && !!p.address.trim(), webOn = shown("qrCaption"), web = QR_HOST;
  const addrSize = 1.8 * k, addr = p.address.trim() ? balanced(p.address.trim(), addrSize, tw) : [];
  if (addrOn && addr.some((t) => textW(t, addrSize, SANS, 400, 0) > tw + 0.01)) ok = false;
  const lines: { id: string; t: string; size: number; fill: string; weight: number }[] = [];
  if (addrOn) addr.forEach((t) => lines.push({ id: "address", t, size: addrSize, fill: P_INK, weight: 400 }));
  if (webOn) lines.push({ id: "qrCaption", t: web, size: 1.7 * k, fill: P_TEAL_TEXT, weight: 500 });
  const lead = 2.6 * k, last = floor - 0.35 * k, textTop = lines.length ? last - (lines.length - 1) * lead - INK_TOP * addrSize : floor;
  const footTop = Math.min(q ? qy : floor, textTop), ruleY = footTop - 2.6 * k;
  const by: Record<string, string> = { address: "", qrCaption: "" };
  lines.forEach((l, i) => { by[l.id] += text(l.t, tX, last - (lines.length - 1 - i) * lead, l.size, { fill: l.fill, weight: l.weight, anchor: tAnchor }); });
  const rule = q || lines.length ? `<rect x="${f2(PM)}" y="${f2(ruleY)}" width="${f2(W)}" height="0.15" fill="${P_INK}" fill-opacity=".35"/>` : "";
  // the pillars, at their designed sizes
  const ns = 2.8 * k, es = 1.4 * k, ss = 1.9 * k, sl = 2.9 * k, gapX = 1.6 * k, top = yTop + 1.5 * k, room = (ruleY - 2.6 * k) - top;
  if (g === 4) {
    // rows: the name in a column of its own, the services two by two to its right, a teal rule down the row
    const nameCol = Math.max(...PILLARS.map((pl, i) => (shown(`pillar${i + 1}`) ? textW(pl.zh, ns, SERIF, 600, 0.06) : 0)), 0);
    const nx = PM + gapX, sx = nx + nameCol + 3.5 * k, area = PW - PM - sx, sw = (area - 2 * k) / 2;
    const rowH = (pl: Pillar, i: number): number => {
      const id = `pillar${i + 1}`, nOn = shown(id), eOn = shown(`${id}En`), lOn = shown(`${id}List`);
      if (!nOn && !eOn && !lOn) return 0;
      const left = (nOn ? INK_TOP * ns : 0) + (eOn ? 2.4 * k + (nOn ? 0 : INK_TOP * es) : 0);
      const right = lOn ? INK_TOP * (nOn ? ns : ss) + (Math.ceil(pl.services.length / 2) - 1) * sl : 0;
      return Math.max(left, right) + 0.6 * k;
    };
    const hs = PILLARS.map(rowH), gap = 4.2 * k, n = hs.filter(Boolean).length, H = hs.reduce((a, b) => a + b, 0) + Math.max(0, n - 1) * gap;
    if (H > room || area < 8) ok = false;
    let ry = top + Math.max(0, (room - H) / 2);
    PILLARS.forEach((pl, i) => {
      const id = `pillar${i + 1}`, h = hs[i] ?? 0, nOn = shown(id), eOn = shown(`${id}En`);
      const nameY = ry + INK_TOP * ns, enY = (nOn ? nameY : ry + INK_TOP * es - 2.4 * k) + 2.4 * k, sy = nOn ? nameY : ry + INK_TOP * ss;
      if (shown(`${id}List`) && pl.services.some((sv) => textW(sv, ss, SANS, 400, 0) > sw)) ok = false;
      if (eOn && textW(pl.en, es, SANS, 500, 0) > nameCol + 3 * k) ok = false;
      s += el(id, `支柱 Pillar · ${pl.zh}`, `<rect x="${f2(PM)}" y="${f2(ry)}" width="${f2(ruleW)}" height="${f2(Math.max(0.1, h))}" fill="${P_TEAL}"/>` +
        text(pl.zh, nx, nameY, ns, { family: SERIF, weight: 600, spacing: 0.06, fill: P_INK })) +
        el(`${id}En`, `支柱英文 · ${pl.en}`, text(pl.en, nx, enY, es, { weight: 500, fill: P_TEAL_TEXT })) +
        el(`${id}List`, `服务 Services · ${pl.zh}`, pl.services.map((sv, j) => text(sv, sx + (j % 2) * (sw + 2 * k), sy + Math.floor(j / 2) * sl, ss, { fill: P_INK })).join(""));
      if (h) ry += h + gap;
    });
  } else {
    // two equal halves; 5D puts a short bar over each name, the others a rule down the column's left edge
    const bar = g === 3, half = W / 2;
    const cols = [{ x0: PM, right: PM + half - 2 }, { x0: PM + half + 1, right: PW - PM }].map((c) => ({ ...c, tx: bar ? c.x0 : c.x0 + gapX }));
    const blockH = (pl: Pillar, i: number): number => {
      const id = `pillar${i + 1}`; let h = bar && shown(id) ? 1.9 * k : 0;
      if (shown(id)) h += INK_TOP * ns;
      if (shown(`${id}En`)) h += 2.4 * k + (shown(id) ? 0 : INK_TOP * es);
      if (shown(`${id}List`)) h += (shown(id) || shown(`${id}En`) ? 3.4 * k : INK_TOP * ss) + (pl.services.length - 1) * sl;
      return h ? h + 0.6 * k : 0;
    };
    const H = Math.max(...PILLARS.map(blockH));
    if (H > room) ok = false;
    const py = g === 2 ? top + 1.5 * k : top + Math.max(0, (room - H) / 2);
    PILLARS.forEach((pl, i) => {
      const id = `pillar${i + 1}`, c = cols[i]!, avail = c.right - c.tx, nOn = shown(id), eOn = shown(`${id}En`);
      const nTop = py + (bar && nOn ? 1.9 * k : 0), nameY = nTop + INK_TOP * ns;
      const enY = (nOn ? nameY : py) + 2.4 * k + (nOn ? 0 : INK_TOP * es);
      const base = eOn ? enY : nOn ? nameY : py, listY = nOn || eOn ? base + 3.4 * k : py + INK_TOP * ss;
      if (nOn && textW(pl.zh, ns, SERIF, 600, 0.06) > avail) ok = false;
      if (eOn && textW(pl.en, es, SANS, 500, 0) > avail) ok = false;
      if (shown(`${id}List`) && pl.services.some((sv) => textW(sv, ss, SANS, 400, 0) > avail)) ok = false;
      const end = py + blockH(pl, i);
      const mark = bar ? `<rect x="${f2(c.x0)}" y="${f2(py)}" width="${f2(7 * k)}" height="${f2(ruleW)}" fill="${P_TEAL}"/>`
        : `<rect x="${f2(c.x0)}" y="${f2(py)}" width="${f2(ruleW)}" height="${f2(Math.max(0.1, end - py))}" fill="${P_TEAL}"/>`;
      s += el(id, `支柱 Pillar · ${pl.zh}`, mark + text(pl.zh, c.tx, nameY, ns, { family: SERIF, weight: 600, spacing: 0.06, fill: P_INK })) +
        el(`${id}En`, `支柱英文 · ${pl.en}`, text(pl.en, c.tx, enY, es, { weight: 500, fill: P_TEAL_TEXT })) +
        el(`${id}List`, `服务 Services · ${pl.zh}`, pl.services.map((sv, j) => text(sv, c.tx, listY + j * sl, ss, { fill: P_INK })).join(""));
    });
  }
  s += rule + el("qr", "二维码 QR code", q ? qrMark(qx, qy, q) : "") + el("address", "地址 Address", by.address ?? "") + el("qrCaption", "网址 Website", by.qrCaption ?? "");
  return { ok, svg: s };
}
/** An address in at most two lines, breaking where an address breaks: after 街道, 路, 区 or 市, nearest the middle;
 *  only if none of those fits, between characters at the most even point. One line when it is short. */
function balanced(t: string, size: number, w: number): string[] {
  if (textW(t, size, SANS, 400, 0) <= w * 0.75) return [t];
  const ch = Array.from(t), cands: { i: number; rank: number }[] = [];
  for (let i = 2; i < ch.length - 1; i++) {
    const a = ch.slice(0, i).join("");
    // 街 ends a word only when 道 does not follow it (曙光街道 is one word)
    const rank = /街道$/.test(a) ? 0 : /(路|大道)$/.test(a) || (/街$/.test(a) && ch[i] !== "道") ? 1 : /(区|县)$/.test(a) ? 2 : /市$/.test(a) ? 3 : 9;
    cands.push({ i, rank });
  }
  const fits = (i: number): boolean => textW(ch.slice(0, i).join(""), size, SANS, 400, 0) <= w && textW(ch.slice(i).join(""), size, SANS, 400, 0) <= w;
  const diff = (i: number): number => Math.abs(textW(ch.slice(0, i).join(""), size, SANS, 400, 0) - textW(ch.slice(i).join(""), size, SANS, 400, 0));
  const ok = cands.filter((c) => fits(c.i)).sort((a, b) => a.rank - b.rank || diff(a.i) - diff(b.i));
  const pick = ok[0];
  // no natural break gives two lines that fit: three lines, each ending at a natural break, before cutting a word
  if (!pick || pick.rank === 9) {
    const nat = cands.filter((c) => c.rank < 9), wd = (a: number, b: number): number => textW(ch.slice(a, b).join(""), size, SANS, 400, 0);
    let best: { i: number; j: number; m: number } | null = null;
    for (const a of nat) for (const b of nat) {
      if (b.i <= a.i) continue;
      const m = Math.max(wd(0, a.i), wd(a.i, b.i), wd(b.i, ch.length));
      if (m <= w && (!best || m < best.m)) best = { i: a.i, j: b.i, m };
    }
    if (best) return [ch.slice(0, best.i).join(""), ch.slice(best.i, best.j).join(""), ch.slice(best.j).join("")];
  }
  return pick ? [ch.slice(0, pick.i).join(""), ch.slice(pick.i).join("")] : [t];
}

/** 5F and 5G: everything on the card's centre line. The two pillars side by side and balanced on the axis, centred in
 *  the room above; under them, centred and resting on the bottom margin, the QR, the address and the website.
 *  5F centres each pillar in its half under a short teal bar; 5G mirrors them on a teal rule down the middle. */
function centrePlan(p: Person, k: number, qSize: number, yTop: number, okIn: boolean, sIn: string): Plan {
  let ok = okIn, s = sIn;
  // 5G and 5H mirror the pillars on the axis; 5H puts the QR in a footer corner instead of under them
  const footer = S.ptGrid === 7 || S.ptGrid === 8, mirror = S.ptGrid === 6 || footer, q = shown("qr") ? qSize : 0, floor = PH - PMY, W = PW - 2 * PM, cx = PW / 2, ruleW = 0.6 * Math.max(1, k);
  const addrOn = shown("address") && !!p.address.trim(), webOn = shown("qrCaption"), web = QR_HOST;
  const qx = footer ? PW - PM - q : cx - q / 2, tx = PM, tw = footer && q ? qx - 3 - PM : W;
  const addrSize = 1.8 * k, addr = p.address.trim() ? balanced(p.address.trim(), addrSize, tw) : [];
  if (addrOn && addr.some((t) => textW(t, addrSize, SANS, 400, 0) > tw + 0.01)) ok = false;
  const lines: { id: string; t: string; size: number; fill: string; weight: number }[] = [];
  if (addrOn) addr.forEach((t) => lines.push({ id: "address", t, size: addrSize, fill: P_INK, weight: 400 }));
  if (webOn) lines.push({ id: "qrCaption", t: web, size: 1.7 * k, fill: P_TEAL_TEXT, weight: 500 });
  const lead = 2.6 * k, last = floor - 0.35 * k, textTop = lines.length ? last - (lines.length - 1) * lead - INK_TOP * (lines[0]?.size ?? addrSize) : floor;
  let qy: number, groupTop: number, rule = "";
  if (footer) {
    // the footer rests on the bottom margin: the text at the left, the QR at the right, their feet aligned; a hairline above
    qy = floor - q;
    const footTop = Math.min(q ? qy : floor, textTop), auto = footTop - 2.6 * k, lo = Math.min(yTop + 6, auto);
    const ruleY = S.ptFoot > 0 ? clampMm(S.ptFoot, lo, auto) : auto;
    if (q || lines.length) FOOT = { y: ruleY, max: auto, min: lo };
    if (q || lines.length) rule = hRule(PM, PM + W, ruleY, P_INK, 0.35, footStyle());
    groupTop = ruleY;
  } else {
    // the bottom stack, up from the margin: website, address, then the QR
    qy = (lines.length ? textTop - 2.4 * k : floor) - q; groupTop = q ? qy : textTop;
  }
  const by: Record<string, string> = { address: "", qrCaption: "" };
  lines.forEach((l, i) => { by[l.id] += text(l.t, footer ? tx : cx, last - (lines.length - 1 - i) * lead, l.size, { fill: l.fill, weight: l.weight, anchor: footer ? "start" : "middle" }); });
  // the pillars
  const ns = 2.8 * k, es = 1.4 * k, ss = 1.9 * k, sl = 2.9 * k, bar = !mirror;
  const blockH = (pl: Pillar, i: number): number => {
    const id = `pillar${i + 1}`; let h = bar && shown(id) ? 1.9 * k : 0;
    if (shown(id)) h += INK_TOP * ns;
    if (shown(`${id}En`)) h += 2.4 * k + (shown(id) ? 0 : INK_TOP * es);
    if (shown(`${id}List`)) h += (shown(id) || shown(`${id}En`) ? 3.4 * k : INK_TOP * ss) + (pl.services.length - 1) * sl;
    return h ? h + 0.6 * k : 0;
  };
  const top = yTop + 1.5 * k, room = groupTop - 4 * k - top, H = Math.max(...PILLARS.map(blockH));
  if (H > room) ok = false;
  // 5I sets the pillars at the golden section of the room (0.382 above, 0.618 below); the others centre them
  const py = top + Math.max(0, (room - H) * (S.ptGrid === 8 ? 0.382 : 0.5)), gutter = 2.6 * k;
  // the axis between the pillars: the centre, unless it has been dragged
  const ax = mirror && S.ptAxis > 0 ? clampMm(S.ptAxis, PM + 8, PW - PM - 8) : cx;
  // where each column's type stands, and how it is anchored
  const cols = mirror
    ? [{ x: ax - gutter, anchor: "end" as const, avail: ax - gutter - PM }, { x: ax + gutter, anchor: "start" as const, avail: PW - PM - ax - gutter }]
    : [{ x: PM + W / 4, anchor: "middle" as const, avail: W / 2 - 2 }, { x: PM + (3 * W) / 4, anchor: "middle" as const, avail: W / 2 - 2 }];
  // the rows of type, as the axis dots stand beside them: the name, then each service (the longer pillar's)
  let rows: { y: number; big: boolean }[] = [];
  PILLARS.forEach((pl, i) => {
    const id = `pillar${i + 1}`, c = cols[i]!, nOn = shown(id), eOn = shown(`${id}En`);
    const nTop = py + (bar && nOn ? 1.9 * k : 0), nameY = nTop + INK_TOP * ns;
    const enY = (nOn ? nameY : py) + 2.4 * k + (nOn ? 0 : INK_TOP * es);
    const base = eOn ? enY : nOn ? nameY : py, listY = nOn || eOn ? base + 3.4 * k : py + INK_TOP * ss;
    const mine = [...(nOn ? [{ y: nameY - CJK_MID * ns, big: true }] : []), ...(shown(`${id}List`) ? pl.services.map((_, j) => ({ y: listY + j * sl - CJK_MID * ss, big: false })) : [])];
    if (mine.length > rows.length) rows = mine;
    if (nOn && textW(pl.zh, ns, SERIF, 600, 0.06) > c.avail) ok = false;
    if (eOn && textW(pl.en, es, SANS, 500, 0) > c.avail) ok = false;
    if (shown(`${id}List`) && pl.services.some((sv) => textW(sv, ss, SANS, 400, 0) > c.avail)) ok = false;
    const mark = bar ? `<rect x="${f2(c.x - 3.5 * k)}" y="${f2(py)}" width="${f2(7 * k)}" height="${f2(ruleW)}" fill="${P_TEAL}"/>` : "";
    s += el(id, `支柱 Pillar · ${pl.zh}`, mark + text(pl.zh, c.x, nameY, ns, { family: SERIF, weight: 600, spacing: 0.06, anchor: c.anchor, fill: P_INK })) +
      el(`${id}En`, `支柱英文 · ${pl.en}`, text(pl.en, c.x, enY, es, { weight: 500, anchor: c.anchor, fill: P_TEAL_TEXT })) +
      el(`${id}List`, `服务 Services · ${pl.zh}`, pl.services.map((sv, j) => text(sv, c.x, listY + j * sl, ss, { anchor: c.anchor, fill: P_INK })).join(""));
  });
  // 5G: the axis itself, a teal rule as tall as the taller pillar
  // the axis is an element of its own, so it can be grouped with the pillars and scaled with them
  const axis = !mirror || !H || !shown("pillarAxis") ? "" : el("pillarAxis", "中轴 Axis", S.ptAxisStyle === 3 && rows.length ? rowDots(ax, rows, ns, ss, P_TEAL) : vRule(ax, py, py + H, ruleW, P_TEAL));
  // its border handle follows the layout; once the axis itself has been moved or scaled, that handle would be elsewhere
  const ao = overrideOf(PORTRAIT_KEY, "pillarAxis");
  if (axis && !ao.dx && !ao.dy && (ao.s || 1) === 1) AXIS = { x: ax, y0: py, y1: py + H };
  s += axis + rule + el("qr", "二维码 QR code", q ? qrMark(qx, qy, q) : "") + el("address", "地址 Address", by.address ?? "") + el("qrCaption", "网址 Website", by.qrCaption ?? "");
  return { ok, svg: s };
}

// ---- layer 1's typographic treatments (S.ptL1Style), for the grid layouts ----
// 甲 the stack (identityPlan above). The others follow conventions of award-winning identity work:
// 乙 基线 the name and the title share one baseline; 西顶文化 small and widely spaced; the contacts carry small sand
//    labels in their own column (Swiss practice).
// 丙 对角 the name and title at the top left, the contacts flush right at the bottom right, 西顶文化 on the last
//    contact line at the left, so the panel is held by a diagonal.
// 丁 细线 sand hairlines divide the panel into company, person and contacts; the contacts run on one line.
const PT_L1_STYLES: { zh: string; en: string; note: string }[] = [
  { zh: "甲 层叠", en: "Stack", note: "西顶文化、姓名、职务自上而下，联系方式落在底部。" },
  { zh: "乙 基线", en: "Baseline", note: "姓名与职务同一基线；西顶文化小字宽字距；联系方式带金色小标签 T / E，对齐成栏。" },
  { zh: "丙 对角", en: "Diagonal", note: "姓名与职务在左上，联系方式在右下右对齐，西顶文化在左下，与之形成对角。" },
  { zh: "丁 细线", en: "Hairlines", note: "两条金色细线把面板分为公司、个人、联系方式三段；联系方式排成一行，以留白相隔。" },
  { zh: "戊 规范", en: "Benchmark", note: "标志与西顶文化、姓名职务并排，上缘齐边距；联系方式另起一组，从左边距起排满整宽，字号可达 8.5 pt。" },
];
function identityStyle(p: Person, k: number, N: number, style: number): Plan {
  const ink = l1Ink(), x0 = BLOCK_W + 4, x1 = PW - PM, A = Math.max(6, x1 - x0), yMin = PMY, yMax = L1 - 2.5;
  const co = p.company.trim(), title = roleText(p), nm = p.nameZh.trim(), en = p.nameEn.trim();
  const coOn = !!co && shown("company"), nOn = !!nm && shown("name"), tOn = !!title && shown("role"), eOn = !!en && shown("nameEn");
  const LABEL: Record<string, string> = { phone: "T", email: "E", web: "W" };
  const items = contacts(p).filter(([kind]) => kind !== "address");
  const on = items.filter(([kind]) => shown(kind));
  let ok = true, s = "";
  const w = (t: string, size: number, family = SANS, weight = 400, sp = 0): number => textW(t, size, family, weight, sp);
  const put = (id: string, label: string, svg: string): void => { s += el(id, label, svg); };
  const cs = 2 * k, cl = 2.8 * k;   // contact size and lead
  const nx = S.ptNameX, ny = S.ptNameY;
  if (style === 1 || style === 3 || style === 4) {
    // company: small, widely spaced, sand
    const coSize = 1.8 * k, coBase = yMin + INK_TOP * coSize;
    if (co) { put("company", "西顶文化", text(co, x0, coBase, coSize, { family: SERIF, weight: 600, spacing: 0.45, fill: ink.co })); if (coOn && w(co, coSize, SERIF, 600, 0.45) > A) ok = false; }
    let y = coOn ? coBase : yMin;
    let rule1 = "";
    if (style === 3 && coOn) { const ry = y + 1.5 * k; rule1 = `<rect x="${f2(x0)}" y="${f2(ry)}" width="${f2(A)}" height="${f2(0.12)}" fill="${P_SAND}"/>`; y = ry; }
    // name and title on one baseline
    const nb = y + (coOn ? 2 * k : 0) + INK_TOP * (nOn ? N : 1.8 * k);
    const nw = nOn ? w(nm, N, SERIF, 600, 0.1) : 0, tx = x0 + (nOn ? nw + 2.2 * k : 0);
    if (nm) put("name", "姓名 Name", text(nm, x0 + nx, nb + ny, N, { family: SERIF, weight: 600, spacing: 0.1, fill: ink.fg }));
    if (title) put("role", "职务 Title", text(title, tx, nb, 1.8 * k, { weight: 500, spacing: 0.08, fill: style === 1 ? ink.co : ink.fg }));
    if (tOn && tx + w(title, 1.8 * k, SANS, 500, 0.08) > x1) ok = false;
    let after = nb + 0.6 * k;
    if (en) { put("nameEn", "英文名 Romanisation", text(en, x0 + nx, nb + 2.6 * k + ny, 1.6 * k, { weight: 500, fill: ink.fg })); if (eOn) after = nb + 2.6 * k + 0.4 * k; }
    if (style === 1 || style === 4) {
      // contacts up from the foot, each with its label in a column of its own; 戊 starts them at the margin, under the mark
      // (on a light card the block is a coloured field, so the contacts stay in the panel beside it)
      const lx = style === 4 && S.ptTheme >= 1 ? PM : x0, vx = lx + 3.2 * k;
      let i = 0;
      for (const [kind, v] of [...items].reverse()) {
        const yb = yMax - (shown(kind) ? i : 0) * cl;
        put(kind, P_LABELS[kind] ?? kind, text(LABEL[kind] ?? "", lx, yb, 1.5 * k, { weight: 600, fill: P_SAND }) + text(v, vx, yb, cs, { fill: ink.fg }));
        if (shown(kind)) { if (vx + w(v, cs) > x1) ok = false; i++; }
      }
      const topC = on.length ? yMax - (on.length - 1) * cl - INK_TOP * cs : yMax;
      if (after + 1.6 * k > topC) ok = false;
      if (style === 4 && S.ptTheme >= 1 && shown("mark") && PMY + S.ptMark + 1.5 > topC) ok = false;
      return { ok, svg: s };
    }
    // 丁: a second hairline, then the contacts on one line, held apart by an even gap
    const ry2 = after + 1.6 * k, rule2 = `<rect x="${f2(x0)}" y="${f2(ry2)}" width="${f2(A)}" height="${f2(0.12)}" fill="${P_SAND}"/>`;
    const cb = ry2 + 1.6 * k + INK_TOP * cs, gap = 3.2 * k;
    let cx = x0;
    for (const [kind, v] of items) {
      const vis = shown(kind);
      put(kind, P_LABELS[kind] ?? kind, text(v, vis ? cx : x0, vis ? cb : yMin + 3, cs, { fill: ink.fg }));
      if (vis) cx += w(v, cs) + gap;
    }
    if (cx - gap > x1 + 0.01 || cb + 0.4 * k > yMax + 2) ok = false;
    s += rule1 + rule2;
    return { ok, svg: s };
  }
  // 丙 对角: the person at the top left
  const nb = yMin + INK_TOP * (nOn ? N : 1.8 * k);
  if (nm) put("name", "姓名 Name", text(nm, x0 + nx, nb + ny, N, { family: SERIF, weight: 600, spacing: 0.1, fill: ink.fg }));
  if (nOn && w(nm, N, SERIF, 600, 0.1) > A) ok = false;
  let y = nOn ? nb : yMin;
  if (en) { put("nameEn", "英文名 Romanisation", text(en, x0 + nx, y + 2.4 * k + ny, 1.6 * k, { weight: 500, fill: ink.fg })); if (eOn) y += 2.4 * k; }
  if (title) { put("role", "职务 Title", text(title, x0, y + 3 * k, 1.8 * k, { weight: 500, spacing: 0.08, fill: ink.fg })); if (tOn) y += 3 * k; }
  // the contacts flush right at the foot; 西顶文化 on the last line at the left
  const last = yMax;
  let i = 0;
  for (const [kind, v] of [...items].reverse()) {
    const vis = shown(kind);
    put(kind, P_LABELS[kind] ?? kind, text(v, x1, vis ? last - i * cl : yMin + 3, cs, { anchor: "end", fill: ink.fg }));
    if (vis) { if (w(v, cs) > A) ok = false; i++; }
  }
  const coSize = 1.8 * k;
  if (co) put("company", "西顶文化", text(co, x0, last, coSize, { family: SERIF, weight: 600, spacing: 0.4, fill: ink.co }));
  const lastW = on.length ? w(on[on.length - 1]![1], cs) : 0;
  if (coOn && w(co, coSize, SERIF, 600, 0.4) + 2.5 * k + lastW > A) ok = false;
  const topC = on.length ? last - (on.length - 1) * cl - INK_TOP * cs : last - INK_TOP * coSize;
  if (y + 0.6 * k + 1.6 * k > topC) ok = false;
  return { ok, svg: s };
}
/** Layer 1's treatments drawn small: only layer 1, each fitted on its own. */
let l1Cache = { key: "", html: "" };
function renderL1Styles(): void {
  const host = document.getElementById("pt-l1s"), box = document.getElementById("pt-l1-box");
  if (!host) return;
  if (box) box.hidden = S.ptDir !== 4;
  if (S.ptDir !== 4) return;
  const p = state.data[state.person] ?? PEOPLE[0]!;
  const hidden = Object.keys(state.ov).filter((k) => k.startsWith("portrait:") && state.ov[k]?.hidden).sort();
  const key = JSON.stringify([currentDims(), S.ptL1Dark, hidden, p, S.ptL1Style, S.ptGrid, S.ptTheme]);
  if (l1Cache.key !== key) {
    const keepS = { ...S };
    const html = PT_L1_STYLES.map((d, i) => {
      try {
        S.ptL1Style = i; S.ptNameX = 0; S.ptNameY = 0; S.ptFoot = 0; S.ptAxis = 0; fitS(p);
        const svg = portraitSvg(p, false, false, "content").replace(` data-key="${PORTRAIT_KEY}"`, "").replace(/viewBox="[^"]*"/, `viewBox="0 0 ${f2(PW)} ${f2(L1)}"`)
          .replace(/<image [^>]*\/>/g, "").replace(/id="pclip-/g, `id="pclipL${i}-`).replace(/url\(#pclip-/g, `url(#pclipL${i}-`);
        return `<button type="button" class="pt-dir pt-l1${i === keepS.ptL1Style ? " is-on" : ""}" data-l1="${i}" aria-pressed="${i === keepS.ptL1Style}" title="${esc(d.en)} · ${esc(d.note)}">${svg}<b>${d.zh}</b></button>`;
      } finally { Object.assign(S, keepS); syncPortrait(); }
    }).join("");
    l1Cache = { key, html };
    host.innerHTML = html;
    host.querySelectorAll<SVGGElement>("g[data-el]").forEach((g) => { if (overrideOf(PORTRAIT_KEY, g.dataset.el ?? "").hidden) g.style.display = "none"; });
  }
  const note = document.getElementById("pt-l1-note");
  if (note) note.textContent = PT_L1_STYLES[S.ptL1Style]?.note ?? "";
}
function applyL1Style(i: number): void {
  const p = state.data[state.person] ?? PEOPLE[0]!, before = editSnapshot();
  S.ptL1Style = i;
  for (const id of ["company", "name", "nameEn", "role", "phone", "email", "web"]) {
    const o = overrideOf(PORTRAIT_KEY, id);
    setOverride(PORTRAIT_KEY, id, o.hidden ? { dx: 0, dy: 0, s: 1, hidden: true } : { dx: 0, dy: 0, s: 1 });
  }
  S.ptNameX = 0; S.ptNameY = 0; S.ptFoot = 0; S.ptAxis = 0;
  fitS(p);
  syncControls();
  l1Cache.key = ""; dirCache.key = "";
  commit(before, true, `第一层 Layer 1 · ${PT_L1_STYLES[i]?.zh ?? i}`);
}

// ---- 全部组合: every grid layout with every layer-1 treatment, full cards, each fitted; click one to use it ----
function renderAllCombos(): void {
  const host = document.getElementById("pt-combos");
  if (!host) return;
  const p = state.data[state.person] ?? PEOPLE[0]!, keepS = { ...S };
  const grids = PT_LAYOUTS.map((l, i) => ({ l, i })).filter(({ l }) => l.dir === 4);
  let html = `<div class="pt-combo-head"></div>` + PT_L1_STYLES.map((t) => `<div class="pt-combo-head"><b>${t.zh}</b></div>`).join("");
  for (const { l, i } of grids) {
    html += `<div class="pt-combo-row"><b>${l.zh}</b><small>${l.en}</small></div>`;
    PT_L1_STYLES.forEach((t, j) => {
      try {
        S.ptDir = 4; S.ptGrid = l.g; S.ptL1Style = j; S.ptNameX = 0; S.ptNameY = 0; S.ptFoot = 0; S.ptAxis = 0; fitS(p);
        const on = keepS.ptDir === 4 && keepS.ptGrid === l.g && keepS.ptL1Style === j, tag = `C${i}x${j}`;
        const svg = portraitSvg(p, false, false, "content").replace(` data-key="${PORTRAIT_KEY}"`, "").replace(/<image [^>]*\/>/g, "")
          .replace(/id="pclip-/g, `id="pclip${tag}-`).replace(/url\(#pclip-/g, `url(#pclip${tag}-`);
        html += `<button type="button" class="pt-dir pt-combo${on ? " is-on" : ""}" data-combo="${i}:${j}" aria-label="${esc(l.zh)} · ${esc(t.zh)}" aria-pressed="${on}">${svg}</button>`;
      } finally { Object.assign(S, keepS); syncPortrait(); }
    });
  }
  host.innerHTML = html;
  host.querySelectorAll<SVGGElement>("g[data-el]").forEach((g) => { if (overrideOf(PORTRAIT_KEY, g.dataset.el ?? "").hidden) g.style.display = "none"; });
}
function wireAllCombos(): void {
  const btn = document.getElementById("pt-show-all"), host = document.getElementById("pt-combos");
  btn?.addEventListener("click", () => {
    if (!host) return;
    const open = host.hidden;
    host.hidden = !open;
    btn.textContent = open ? "收起组合" : "全部组合";
    btn.setAttribute("aria-expanded", String(open));
    if (open) renderAllCombos();
  });
  host?.addEventListener("click", (e) => {
    const b = (e.target as Element).closest<HTMLElement>("[data-combo]");
    if (!b) return;
    const [i, j] = (b.dataset.combo ?? "0:0").split(":").map(Number) as [number, number];
    const L = PT_LAYOUTS[i];
    if (!L) return;
    const p = state.data[state.person] ?? PEOPLE[0]!, before = editSnapshot();
    S.ptDir = L.dir; S.ptGrid = L.g; S.ptL1Style = j;
    if (L.g >= 5) for (const id of ["qr", "address", "qrCaption"]) { const o = overrideOf(PORTRAIT_KEY, id); if (o.hidden) setOverride(PORTRAIT_KEY, id, { ...o, hidden: false }); }
    for (const id of PT_CONTENT.flatMap(([, items]) => items.map(([x]) => x))) {
      if (STRUCTURE_IDS.has(id)) continue;
      const o = overrideOf(PORTRAIT_KEY, id);
      setOverride(PORTRAIT_KEY, id, o.hidden ? { dx: 0, dy: 0, s: 1, hidden: true } : { dx: 0, dy: 0, s: 1 });
    }
    S.ptNameX = 0; S.ptNameY = 0; S.ptFoot = 0; S.ptAxis = 0;
    fitS(p);
    syncControls();
    dirCache.key = ""; l1Cache.key = "";
    commit(before, true, `版式 Layout · ${L.zh} · ${PT_L1_STYLES[j]?.zh ?? j}`);
    renderAllCombos();
  });
}

// ---- the panel's tabs: one section at a time; the choice is remembered on this device ----
function showTab(name: string): void {
  document.querySelectorAll<HTMLElement>(".pt-tabs [data-tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === name)));
  document.querySelectorAll<HTMLElement>("[data-pt-tab]").forEach((p) => { p.hidden = p.dataset.ptTab !== name; });
  try { localStorage.setItem("xd-pt-tab", name); } catch { /* not kept */ }
}
function wireTabs(): void {
  document.querySelector(".pt-tabs")?.addEventListener("click", (e) => {
    const b = (e.target as Element).closest<HTMLElement>("[data-tab]");
    if (b?.dataset.tab) showTab(b.dataset.tab);
  });
  let saved: string | null = null;
  try { saved = localStorage.getItem("xd-pt-tab"); } catch { /* none */ }
  if (saved && document.querySelector(`[data-pt-tab="${saved}"]`)) showTab(saved);
}

// ---- line styles: the axis between the pillars, and the lines between layers ----
// The axis: a solid rule, or the mark's own dots in one column or in pairs. The lines: a hairline, a row of fine dots,
// two rows, or none (the layers held apart by space alone).
const AXIS_STYLES = ["实线", "单点", "双点", "一大三点"], LINE_STYLES = ["细线", "点线", "双点线", "无"];
const PT_RULES: { zh: string; en: string; axis: number; line: number }[] = [
  { zh: "甲 实线", en: "Solid rule, hairlines", axis: 0, line: 0 },
  { zh: "乙 单点", en: "A column of dots, dotted lines", axis: 1, line: 1 },
  { zh: "丙 双点", en: "Paired dots, dotted lines", axis: 2, line: 1 },
  { zh: "丁 双点双行", en: "Paired dots, lines of two rows", axis: 2, line: 2 },
  { zh: "戊 单点留白", en: "A column of dots, no lines", axis: 1, line: 3 },
  { zh: "己 双点留白", en: "Paired dots, no lines", axis: 2, line: 3 },
  { zh: "庚 一大三点", en: "One large dot by the names, one small dot by each service; dotted lines", axis: 3, line: 1 },
  { zh: "辛 一大三点留白", en: "One large dot by the names, one small dot by each service; no lines", axis: 3, line: 3 },
];
/** Where a CJK line's ink is centred, above its baseline, as a share of its size: the ink runs from 0.84 above to about 0.08 below. */
const CJK_MID = 0.38;
/** The axis as a dot beside each row of type: a large dot by the pillar names, a small one by each service. */
function rowDots(x: number, rows: { y: number; big: boolean }[], ns: number, ss: number, fill: string): string {
  return `<g fill="${fill}">${rows.map((r) => `<circle cx="${f2(x)}" cy="${f2(r.y)}" r="${f2(r.big ? ns * 0.2 : ss * 0.16)}"/>`).join("")}</g>`;
}
/** The vertical rule between the pillars, from y0 to y1 at x, w thick. */
function vRule(x: number, y0: number, y1: number, w: number, fill: string): string {
  const H = y1 - y0;
  if (S.ptAxisStyle === 0 || H < w * 3) return `<rect x="${f2(x - w / 2)}" y="${f2(y0)}" width="${f2(w)}" height="${f2(H)}" fill="${fill}"/>`;
  // dots of the rule's own weight, the first and last at its ends, evenly between
  // paired dots a little smaller, so the pair weighs about what one column does
  const d = S.ptAxisStyle === 2 ? w * 0.8 : w, n = Math.max(2, Math.round((H - d) / (d * 2.2)) + 1), step = (H - d) / (n - 1), r = d / 2;
  const xs = S.ptAxisStyle === 2 ? [x - d * 0.85, x + d * 0.85] : [x];
  let s = "";
  for (let i = 0; i < n; i++) for (const cx of xs) s += `<circle cx="${f2(cx)}" cy="${f2(y0 + r + i * step)}" r="${f2(r)}"/>`;
  return `<g fill="${fill}">${s}</g>`;
}
/** A line between layers, from x0 to x1 at y: a hairline, fine dots, two rows of them, or nothing. */
function hRule(x0: number, x1: number, y: number, fill: string, opacity: number, style = S.ptLineStyle): string {
  if (style === 3) return "";
  if (style === 0) return `<rect x="${f2(x0)}" y="${f2(y)}" width="${f2(x1 - x0)}" height="0.15" fill="${fill}" fill-opacity="${opacity}"/>`;
  const two = style === 2, d = two ? 0.26 : 0.32, pitch = two ? 1.0 : 1.1, r = d / 2;
  const n = Math.max(2, Math.round((x1 - x0 - d) / pitch) + 1), step = (x1 - x0 - d) / (n - 1), ys = two ? [y - 0.3, y + 0.3] : [y];
  let s = "";
  for (let i = 0; i < n; i++) for (const cy of ys) s += `<circle cx="${f2(x0 + r + i * step)}" cy="${f2(cy)}" r="${f2(r)}"/>`;
  // dots read lighter than a line of the same tone, so they carry a little more of it
  return `<g fill="${fill}" fill-opacity="${Math.min(1, opacity * 1.7)}">${s}</g>`;
}
let rulesCache = { key: "", html: "" };
/** The line styles side by side, each the card as it stands with only its lines changed. */
function renderRuleStyles(): void {
  const host = document.getElementById("pt-rules");
  if (!host) return;
  const p = state.data[state.person] ?? PEOPLE[0]!;
  const key = JSON.stringify([{ ...S, ptAxisStyle: 0, ptLineStyle: 0, ptFootStyle: 0 }, state.ov, p, state.texts]);
  if (rulesCache.key !== key) {
    const keep = { axis: S.ptAxisStyle, line: S.ptLineStyle, foot: S.ptFootStyle };
    const html = PT_RULES.map((r, i) => {
      try {
        S.ptAxisStyle = r.axis; S.ptLineStyle = r.line; S.ptFootStyle = -1;
        const svg = portraitSvg(p, false, false, "content").replace(` data-key="${PORTRAIT_KEY}"`, ` data-rthumb="${i}"`)
          .replace(/<image [^>]*\/>/g, "").replace(/id="pclip-/g, `id="pclipR${i}-`).replace(/url\(#pclip-/g, `url(#pclipR${i}-`);
        return `<button type="button" class="pt-dir" data-rule="${i}" title="${esc(r.en)}">${svg}<b>${r.zh}</b></button>`;
      } finally { S.ptAxisStyle = keep.axis; S.ptLineStyle = keep.line; S.ptFootStyle = keep.foot; }
    }).join("");
    rulesCache = { key, html };
    host.innerHTML = html;
    host.querySelectorAll<SVGSVGElement>("svg[data-rthumb]").forEach((svg) => applyOverrides(svg, PORTRAIT_KEY));
  }
  host.querySelectorAll<HTMLElement>("[data-rule]").forEach((b) => {
    const r = PT_RULES[Number(b.dataset.rule)], on = !!r && r.axis === S.ptAxisStyle && r.line === S.ptLineStyle && footStyle() === r.line;
    b.classList.toggle("is-on", on); b.setAttribute("aria-pressed", String(on));
  });
}
// ---- the border handles can be put away, to see the card clean; a view choice, kept in this browser ----
let ptHandles = ((): boolean => { try { return localStorage.getItem("xd-pt-handles") !== "0"; } catch { return true; } })();
function syncHandlesBtn(): void {
  const sb = document.getElementById("pt-safe");
  if (sb) { sb.setAttribute("aria-pressed", String(ptSafe)); sb.textContent = ptSafe ? "隐藏安全区" : "安全区"; }
  const b = document.getElementById("pt-handles");
  if (!b) return;
  b.textContent = ptHandles ? "隐藏边界" : "显示边界";
  b.setAttribute("aria-pressed", String(!ptHandles));
  b.title = ptHandles ? "Hide the border handles" : "Show the border handles";
}

// ---- the card's size by its edges ----
interface CardDims {
  W: number; H: number; L1: number; L2: number; block: number; split: number; foot: number; axis: number;
  k1: number; k3: number; name: number; mark: number; qr: number; margin: number; nameX: number; nameY: number;
  moves: Record<string, { dx: number; dy: number }>;
}
function cardDims(): CardDims {
  const moves: Record<string, { dx: number; dy: number }> = {};
  for (const [key, o] of Object.entries(state.ov)) if (key.startsWith(`${PORTRAIT_KEY}:`) && o && (o.dx || o.dy)) moves[key] = { dx: o.dx, dy: o.dy };
  return { W: S.ptW, H: S.ptH, L1: S.ptL1, L2: S.ptL2, block: S.ptBlock, split: S.ptSplit, foot: S.ptFoot, axis: S.ptAxis,
    k1: S.ptK1, k3: S.ptK3, name: S.ptName, mark: S.ptMark, qr: S.ptQR, margin: S.ptMargin, nameX: S.ptNameX, nameY: S.ptNameY, moves };
}
/**
 * Resize the card from where a drag began, dx and dy mm of pointer travel. The right edge widens the card: the block
 * keeps its width and the panel beside it takes the change. The bottom edge lengthens it: layers 1 and 2 keep their
 * heights and layer 3 takes the change. The corner scales the whole design in proportion: layers, borders, type, mark,
 * QR, margins and every move with it.
 */
function resizeCard(d0: CardDims, dx: number, dy: number, k: "w" | "h" | "wh"): void {
  const half = (v: number): number => Math.round(v * 2) / 2, tenth = (v: number): number => Math.round(v * 10) / 10, cent = (v: number): number => Math.round(v * 100) / 100;
  if (k === "w") {
    const w = half(clampMm(d0.W + dx, Math.max(40, d0.block + 20), 100)), kx = w / d0.W;
    S.ptW = w; S.ptSplit = tenth(d0.split * kx); S.ptAxis = d0.axis ? tenth(d0.axis * kx) : 0;
    return;
  }
  if (k === "h") {
    const h = half(clampMm(d0.H + dy, Math.max(60, d0.L1 + d0.L2 + 30), 160));
    S.ptH = h; S.ptFoot = d0.foot ? tenth(d0.foot + (h - d0.H)) : 0;
    return;
  }
  const s0 = Math.max((d0.W + dx) / d0.W, (d0.H + dy) / d0.H), w = half(clampMm(d0.W * s0, 40, 100)), s = w / d0.W;
  S.ptW = w; S.ptH = Math.round(clampMm(d0.H * s, 60, 160) * 10) / 10;
  S.ptBlock = tenth(d0.block * s); S.ptSplit = tenth(d0.split * s); S.ptAxis = d0.axis ? tenth(d0.axis * s) : 0;
  S.ptL1 = tenth(d0.L1 * s); S.ptL2 = tenth(d0.L2 * s); S.ptFoot = d0.foot ? tenth(d0.foot * s) : 0;
  S.ptK1 = cent(d0.k1 * s); S.ptK3 = cent(d0.k3 * s); S.ptName = tenth(d0.name * s); S.ptMark = half(d0.mark * s);
  S.ptQR = Math.max(10.5, half(d0.qr * s)); S.ptMargin = tenth(d0.margin * s); S.ptNameX = tenth(d0.nameX * s); S.ptNameY = tenth(d0.nameY * s);
  for (const [key, m] of Object.entries(d0.moves)) {
    const o = state.ov[key];
    if (o) state.ov[key] = { ...o, dx: m.dx * s, dy: m.dy * s };
  }
}

// ---- a line's style, chosen on the line itself ----
/** The footer line follows the layer line until it is given a style of its own. */
function footStyle(): number { return S.ptFootStyle >= 0 ? S.ptFootStyle : S.ptLineStyle; }
function closeStylePicker(): void { document.getElementById("pt-picker")?.remove(); }
/** A small menu at the pointer: the styles this line can take, each drawn as it would look. */
function openStylePicker(k: "l1" | "foot" | "axis", x: number, y: number): void {
  closeStylePicker();
  const axis = k === "axis", names = axis ? AXIS_STYLES : LINE_STYLES, cur = axis ? S.ptAxisStyle : k === "foot" ? footStyle() : S.ptLineStyle;
  const sample = (i: number): string => {
    const keep = { a: S.ptAxisStyle, l: S.ptLineStyle };
    try {
      if (axis) {
        S.ptAxisStyle = i;
        const art = i === 3 ? rowDots(5, [{ y: 2.4, big: true }, { y: 6.2, big: false }, { y: 9.2, big: false }, { y: 12.2, big: false }], 2.8, 1.9, "currentColor") : vRule(5, 1, 13, 0.75, "currentColor");
        return `<svg viewBox="0 0 10 14" width="20" height="28" aria-hidden="true">${art}</svg>`;
      }
      return `<svg viewBox="0 0 30 3" width="60" height="6" aria-hidden="true">${i === 3 ? "" : hRule(1, 29, 1.5, "currentColor", 0.7, i)}</svg>`;
    } finally { S.ptAxisStyle = keep.a; S.ptLineStyle = keep.l; }
  };
  const box = document.createElement("div");
  box.id = "pt-picker";
  box.className = "pt-picker";
  box.setAttribute("role", "menu");
  box.innerHTML = `<b class="pt-h">${axis ? "中轴" : k === "foot" ? "页脚线" : "层线"}</b>` + names.map((n, i) =>
    `<button type="button" role="menuitemradio" aria-checked="${i === cur}" class="${i === cur ? "is-on" : ""}" data-style="${i}">${sample(i)}<span>${n}</span></button>`).join("");
  document.body.appendChild(box);
  const r = box.getBoundingClientRect();
  box.style.left = `${Math.max(8, Math.min(x + 8, innerWidth - r.width - 8))}px`;
  box.style.top = `${Math.max(8, Math.min(y + 8, innerHeight - r.height - 8))}px`;
  box.addEventListener("click", (e) => {
    const b = (e.target as Element).closest<HTMLElement>("[data-style]");
    if (!b) return;
    const v = Number(b.dataset.style) || 0, before = editSnapshot();
    if (axis) S.ptAxisStyle = v;
    else if (k === "foot") S.ptFootStyle = v;
    else { if (S.ptFootStyle < 0) S.ptFootStyle = S.ptLineStyle; S.ptLineStyle = v; }   // each line keeps its own from here on
    closeStylePicker();
    pushUndo(before, `${axis ? "中轴 Axis" : k === "foot" ? "页脚线 Footer line" : "层线 Layer line"} · ${names[v] ?? ""}`);
    onEditChanged(false);
  });
  (box.querySelector("button.is-on") as HTMLElement | null ?? box.querySelector("button"))?.focus();
}
document.addEventListener("pointerdown", (e) => { if (!(e.target as Element).closest?.("#pt-picker")) closeStylePicker(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && document.getElementById("pt-picker")) { e.preventDefault(); e.stopImmediatePropagation(); closeStylePicker(); } }, true);

// ---- where a platform's own buttons and captions cover a full-screen image (视频号, 抖音, stories) ----
// The common guidance for a 1080 × 1920 story: about 250 px at the top (13 %) and 250 to 340 px at the bottom (13 to 18 %).
// Shown on the canvas only, as a view setting kept in this browser.
let ptSafe = ((): boolean => { try { return localStorage.getItem("xd-pt-safe") === "1"; } catch { return false; } })();
function safeZones(): string {
  const top = PH * 0.13, bottom = PH * 0.18, band = (y: number, h: number, t: string): string =>
    `<rect x="0" y="${f2(y)}" width="${f2(PW)}" height="${f2(h)}" fill="#E0457B" fill-opacity=".16"/>` +
    `<text x="${f2(PW / 2)}" y="${f2(y + h / 2 + 0.6)}" font-size="1.6" text-anchor="middle" fill="#E0457B" font-family="${SANS}">${t}</text>`;
  return band(0, top, "平台界面 · 顶部 13%") + band(PH - bottom, bottom, "平台界面 · 底部 18%") +
    `<line x1="0" y1="${f2(PH - PH * 0.13)}" x2="${f2(PW)}" y2="${f2(PH - PH * 0.13)}" stroke="#E0457B" stroke-width=".15" stroke-dasharray=".6 .5"/>`;
}
