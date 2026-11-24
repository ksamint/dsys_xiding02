import { MARK_BOX, MARK_DOTS, MARK_R } from "./mark-data.js";
import { customLogo, drawContain } from "./custom.js";
import { drawPhoto, photoFor, type Photo } from "./photos.js";
import { encode, type QrMatrix } from "./qr.js";
import { WORDMARK, WORDMARK_H, WORDMARK_W } from "./wordmark-data.js";

// The share card, 1080 × 1440 (3:4), in two layouts from dsys_xiding02:
//
//   立轴 (scroll)  the Hero: a field across two thirds with the mark standing whole in it and 西頂廣仁宮 at its
//                  foot; on the white third the name hangs vertically in Songti and the code stands at the foot.
//   横卷 (band)    a field across the top with the mark and the name; the code on white; the wordmark centred.
//
// Four colourways, as the system sets them: white on temple teal, white on black, black on white, teal on white.
// The code is always black on white with its quiet zone and nothing over it. Its modules may be round, echoing the
// mark's dots; the three finder squares stay square so every phone finds the code.

export const CARD_W = 1080;
export const CARD_H = 1440;

const TEAL = "#628F8A";
const WHITE = "#FFFFFF";
const BLACK = "#000000";
const PAPER = "#EEF2F1";
const MUTED = "#4E5A58";
const LINE = "#CDD6D4";
export const SERIF = '"Noto Serif SC", "Songti SC", "STSong", SimSun, serif';
export const SANS = '"Instrument Sans", "PingFang SC", "Hiragino Sans GB", "Noto Sans SC", "Microsoft YaHei", sans-serif';

const M = 72; // outer margin

export type Layout = "scroll" | "band" | "sign" | "square";

/** Each layout has its own size: the two cards are 3:4, the nameplate 4:1. */
export const SIZES: Record<Layout, { w: number; h: number }> = {
  scroll: { w: 1080, h: 1440 },
  band: { w: 1080, h: 1440 },
  sign: { w: 2560, h: 640 },
  square: { w: 1440, h: 1440 },
};
/** 边框: the white around and between things. On the cards a mat round the whole; on the nameplate, the margins and gaps. */
export const BORDER_DEFAULT: Record<Layout, number> = { scroll: 0, band: 0, sign: 32, square: 0 };
export const BORDER_MAX = 120;
const VI_TEAL = "#559895";
const VI_CHARCOAL = "#404041";
export type Way = "teal" | "night" | "ink" | "tealInk";
export type Dots = "round" | "square";

interface Colourway {
  name: string;
  field: string;
  mark: string;
  /** The ground beside or under the field, where the code stands. */
  ground: string;
}
export const WAYS: Record<Way, Colourway> = {
  teal: { name: "青", field: TEAL, mark: WHITE, ground: WHITE },
  night: { name: "墨", field: BLACK, mark: WHITE, ground: WHITE },
  ink: { name: "白", field: WHITE, mark: BLACK, ground: PAPER },
  tealInk: { name: "青白", field: WHITE, mark: TEAL, ground: PAPER },
};

/** What the viewer can adjust. */
export interface Look {
  /** Name size in px, 48–120. */
  size: number;
  /** Where the name sits along its line: 0 start, 100 end. */
  pos: number;
  /** Code size, 60–130 (%). */
  zoom: number;
  layout: Layout;
  way: Way;
  dots: Dots;
  /** Moves and sizes made on the card, per layout. */
  edits?: Edits;
  /** 边框 per layout, in px of the drawing. */
  border?: Partial<Record<Layout, number>>;
  /** 门牌: the code white on the panel (反白), or black on a white tile (白底). */
  qr?: QrMode;
  /** 白边: the white round the outside. Off, the picture runs to its edges; the gaps inside stay. */
  edge?: EdgeMode;
  /** 方: which of the three compositions. */
  square?: SquareStyle;
  /** 空's photo: a photo's id, "none", or unset for the one its address takes. */
  photo?: string;
}
export type EdgeMode = "on" | "off";
const edgeOn = (look: Look) => (look.edge ?? "on") === "on";
export type QrMode = "invert" | "tile";

export const borderOf = (look: Look) => look.border?.[look.layout] ?? BORDER_DEFAULT[look.layout];
export const LOOK: Look = { size: 88, pos: 0, zoom: 100, layout: "scroll", way: "teal", dots: "round" };
export const LOOK_RANGE = { size: [48, 120], pos: [0, 100], zoom: [60, 130] } as const;
export type Slider = keyof typeof LOOK_RANGE;

/** The things on the card that can be selected, moved and resized. */
export type ObjId = "mark" | "title" | "code" | "wordmark" | "photo";
export const OBJ_NAME: Record<ObjId, string> = { mark: "标志", title: "名称", code: "二维码", wordmark: "西頂廣仁宮", photo: "照片" };
/** A move and a size, from where the layout puts the thing; scaled about its centre. */
export interface Edit {
  dx: number;
  dy: number;
  s: number;
}
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
export type Edits = Partial<Record<Layout, Partial<Record<ObjId, Edit>>>>;
/** What a drawing reports: where each thing ended up, and the layout's own lines to align to. */
export interface Drawn {
  boxes: Partial<Record<ObjId, Box>>;
  guides: { x: number[]; y: number[] };
}

export interface CardInput {
  /** What the code holds. Empty draws the waiting state. */
  text: string;
  title: string;
  look: Look;
}

/** Text with letter-spacing, drawn glyph by glyph (canvas letterSpacing is not everywhere yet). */
function tracked(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, em: number, align: "left" | "right" | "center" = "left"): number {
  const size = parseFloat(ctx.font.match(/(\d+(?:\.\d+)?)px/)?.[1] ?? "16");
  const gap = size * em;
  const chars = Array.from(s);
  const w = chars.reduce((n, c) => n + ctx.measureText(c).width, 0) + gap * Math.max(0, chars.length - 1);
  let cx = align === "left" ? x : align === "right" ? x - w : x - w / 2;
  ctx.textAlign = "left";
  for (const c of chars) {
    ctx.fillText(c, cx, y);
    cx += ctx.measureText(c).width + gap;
  }
  return w;
}

/** Breaks a name into at most `max` lines of `width`, character by character, ending on … if it runs over. */
function wrap(ctx: CanvasRenderingContext2D, s: string, width: number, max: number, em: number): string[] {
  const size = parseFloat(ctx.font.match(/(\d+(?:\.\d+)?)px/)?.[1] ?? "16");
  const measure = (t: string) => Array.from(t).reduce((n, ch) => n + ctx.measureText(ch).width + size * em, -size * em);
  const lines: string[] = [];
  let cur = "";
  for (const ch of Array.from(s.trim())) {
    if (cur && measure(cur + ch) > width) {
      lines.push(cur.trimEnd());
      if (lines.length === max) {
        // It runs over: end the last line on an ellipsis.
        let last = lines[max - 1];
        while (last && measure(last + "…") > width) last = last.slice(0, -1);
        lines[max - 1] = last + "…";
        return lines;
      }
      cur = ch === " " ? "" : ch;
    } else cur += ch;
  }
  if (cur) lines.push(cur);
  return lines;
}

export function displayText(text: string): string {
  return text.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

// ——— pieces

function fontSize(ctx: CanvasRenderingContext2D): number {
  return parseFloat(ctx.font.match(/(\d+(?:\.\d+)?)px/)?.[1] ?? "16");
}

/** The mark, all 40 dots, `h` tall, its ink box's top-left at (x, y). */
function mark(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, colour: string, weight = 1): void {
  const own = customLogo("mark");
  if (own) { drawContain(ctx, own, x, y, (MARK_BOX.w * h) / MARK_BOX.h, h); return; }
  const s = h / MARK_BOX.h;
  ctx.fillStyle = colour;
  for (const [dx, dy] of MARK_DOTS) {
    ctx.beginPath();
    ctx.arc(x + (dx - MARK_BOX.x) * s, y + (dy - MARK_BOX.y) * s, MARK_R * s * weight, 0, Math.PI * 2);
    ctx.fill();
  }
}
const markWidth = (h: number) => (MARK_BOX.w * h) / MARK_BOX.h;

/** 西頂廣仁宮, `h` tall, its left at x (or centred on x), top at y. */
function wordmark(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, colour: string, centre = false): void {
  const own = customLogo("word");
  if (own) { const w = (WORDMARK_W * h) / WORDMARK_H; drawContain(ctx, own, centre ? x - w / 2 : x, y, w, h); return; }
  const k = h / WORDMARK_H;
  ctx.save();
  ctx.translate(centre ? x - (WORDMARK_W * k) / 2 : x, y);
  ctx.scale(k, k);
  ctx.fillStyle = colour;
  for (const [a, b, c, d, e, f, path] of WORDMARK) {
    ctx.save();
    ctx.transform(a, b, c, d, e, f);
    ctx.fill(new Path2D(path));
    ctx.restore();
  }
  ctx.restore();
}

const inFinder = (q: QrMatrix, x: number, y: number) => (x < 7 && y < 7) || (x >= q.size - 7 && y < 7) || (x < 7 && y >= q.size - 7);

/**
 * The code in a white box of `box` px at (x, y), quiet zone included. Modules land on whole pixels.
 * Round modules are dots of 0.92 of a module; the finder squares are drawn whole, square, so scanners lock on.
 * Small or dense codes fall back to square modules, and never go below 5 px a module.
 */
function code(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, box: number, dots: Dots, ink = BLACK, paper = WHITE): void {
  ctx.fillStyle = paper;
  ctx.fillRect(x, y, box, box);
  if (!text) {
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 2;
    const inset = Math.round(box * 0.12);
    ctx.strokeRect(x + inset, y + inset, box - inset * 2, box - inset * 2);
    ctx.fillStyle = MUTED;
    ctx.font = `500 ${Math.round(box * 0.06)}px ${SANS}`;
    tracked(ctx, "输入网址", x + box / 2, y + box / 2 + box * 0.02, 0.24, "center");
    return;
  }
  const q = encode(text, "M");
  const cells = q.size + 8;
  // At least 5 px a module, or scanners miss it once the picture is shrunk.
  const unit = Math.max(5, Math.floor(box / cells));
  if (unit * cells > box) {
    const grow = unit * cells - box;
    x -= grow / 2;
    y -= grow;
    box = unit * cells;
    ctx.fillStyle = paper;
    ctx.fillRect(x, y, box, box);
  }
  // Round modules need room to read: below 7 px a module, the code is drawn square.
  if (unit < 7) dots = "square";
  const ox = x + Math.round((box - unit * cells) / 2) + 4 * unit;
  const oy = y + Math.round((box - unit * cells) / 2) + 4 * unit;
  ctx.fillStyle = ink;
  if (dots === "square") {
    for (let r = 0; r < q.size; r++) for (let c = 0; c < q.size; c++) if (q.modules[r][c]) ctx.fillRect(ox + c * unit, oy + r * unit, unit, unit);
    return;
  }
  const rad = unit * 0.46;
  ctx.beginPath();
  for (let r = 0; r < q.size; r++)
    for (let c = 0; c < q.size; c++) {
      if (!q.modules[r][c] || inFinder(q, c, r)) continue;
      ctx.moveTo(ox + c * unit + unit / 2 + rad, oy + r * unit + unit / 2);
      ctx.arc(ox + c * unit + unit / 2, oy + r * unit + unit / 2, rad, 0, Math.PI * 2);
    }
  ctx.fill();
  for (const [fx, fy] of [[0, 0], [q.size - 7, 0], [0, q.size - 7]]) {
    const px = ox + fx * unit;
    const py = oy + fy * unit;
    ctx.fillRect(px, py, unit * 7, unit * 7);
    ctx.fillStyle = paper;
    ctx.fillRect(px + unit, py + unit, unit * 5, unit * 5);
    ctx.fillStyle = ink;
    ctx.fillRect(px + unit * 2, py + unit * 2, unit * 3, unit * 3);
  }
}

/**
 * A name set vertically, right to left in columns of `colH`, at most `maxCols`; returns its width.
 * Chinese stands upright, one square a character; Latin words and figures run sideways, as in vertical typesetting.
 */
function vertical(ctx: CanvasRenderingContext2D, s: string, right: number, top: number, colH: number, maxCols: number, dry = false): { w: number; h: number } {
  const size = fontSize(ctx);
  const step = size * 1.14;
  const gap = size * 0.5;
  type Tok = { t: string; h: number; side: boolean };
  const toks: Tok[] = [];
  for (const m of s.replace(/\s+/g, " ").trim().matchAll(/[A-Za-z0-9][A-Za-z0-9.'’&+\-/:]*|\s|./gu)) {
    const t = m[0];
    if (t === " ") toks.push({ t, h: size * 0.3, side: false });
    else if (/^[A-Za-z0-9]/.test(t)) toks.push({ t, h: ctx.measureText(t).width + size * 0.2, side: true });
    else toks.push({ t, h: step, side: false });
  }
  // Fill columns; a run too long for a column is cut to fit.
  const cols: Tok[][] = [[]];
  let used = 0;
  for (const tok of toks) {
    if (used + tok.h > colH && cols[cols.length - 1].length) {
      if (cols.length === maxCols) {
        const last = cols[cols.length - 1];
        while (last.length && used + step > colH) used -= (last.pop() as Tok).h;
        last.push({ t: "︙", h: step, side: false });
        break;
      }
      cols.push([]);
      used = 0;
      if (tok.t === " ") continue;
    }
    cols[cols.length - 1].push(tok);
    used += tok.h;
  }
  const tall = Math.max(...cols.map((col) => col.reduce((n, t) => n + t.h, 0)));
  const wide = cols.length * size + Math.max(0, cols.length - 1) * gap;
  if (dry) return { w: wide, h: tall };
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  cols.forEach((col, ci) => {
    const cx = right - size / 2 - ci * (size + gap);
    let y = top;
    for (const tok of col) {
      if (tok.side) {
        ctx.save();
        ctx.translate(cx, y + tok.h / 2);
        ctx.rotate(Math.PI / 2);
        ctx.fillText(tok.t, 0, size * 0.04);
        ctx.restore();
      } else if (tok.t !== " ") {
        // Punctuation sits in the upper right of its square when set vertically.
        const punct = /[，。、；：！？]/.test(tok.t);
        const dot = tok.t === "·" || tok.t === "・";
        ctx.fillText(dot ? "・" : tok.t, cx + (punct ? size * 0.32 : 0), y + step / 2 - (punct ? size * 0.3 : 0) - size * 0.07);
      }
      y += tok.h;
    }
  });
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  return { w: wide, h: tall };
}

/** Height of a name set vertically in one column. */
function measureVertical(ctx: CanvasRenderingContext2D, s: string): number {
  const size = fontSize(ctx);
  let h = 0;
  for (const m of s.replace(/\s+/g, " ").trim().matchAll(/[A-Za-z0-9][A-Za-z0-9.'’&+\-/:]*|\s|./gu))
    h += m[0] === " " ? size * 0.3 : /^[A-Za-z0-9]/.test(m[0]) ? ctx.measureText(m[0]).width + size * 0.2 : size * 1.14;
  return h;
}

// ——— layouts

function editOf(look: Look, id: ObjId): Edit {
  return look.edits?.[look.layout]?.[id] ?? { dx: 0, dy: 0, s: 1 };
}

/** Where a thing ends up: its layout box, scaled about the centre and moved. */
export function applyEdit(b: Box, e: Edit): Box {
  const w = b.w * e.s;
  const h = b.h * e.s;
  return { x: b.x + b.w / 2 - w / 2 + e.dx, y: b.y + b.h / 2 - h / 2 + e.dy, w, h };
}

/** Draws something laid out in `base`, moved and sized by its edit. Returns the box it now fills. */
function place(ctx: CanvasRenderingContext2D, base: Box, e: Edit, draw: () => void): Box {
  const cx = base.x + base.w / 2;
  const cy = base.y + base.h / 2;
  ctx.save();
  ctx.translate(cx + e.dx, cy + e.dy);
  ctx.scale(e.s, e.s);
  ctx.translate(-cx, -cy);
  draw();
  ctx.restore();
  return applyEdit(base, e);
}

/** The code is resized by drawing it at its new size, so its modules stay on whole pixels. */
function placeCode(ctx: CanvasRenderingContext2D, text: string, base: Box, e: Edit, dots: Dots, ink = BLACK, paper = WHITE): Box {
  const b = applyEdit(base, e);
  const size = Math.round(b.w);
  code(ctx, text, Math.round(b.x), Math.round(b.y), size, dots, ink, paper);
  return { x: Math.round(b.x), y: Math.round(b.y), w: size, h: size };
}

export function drawCard(ctx: CanvasRenderingContext2D, c: CardInput): Drawn {
  ctx.save();
  ctx.textBaseline = "alphabetic";
  let drawn: Drawn;
  if (c.look.layout === "sign") drawn = sign(ctx, c);
  else if (c.look.layout === "square") drawn = squareCard(ctx, c);
  else {
    // The mat: the card drawn smaller, centred, on white. Boxes and lines follow it.
    const b = edgeOn(c.look) ? borderOf(c.look) : 0;
    const k = Math.min((CARD_W - 2 * b) / CARD_W, (CARD_H - 2 * b) / CARD_H);
    const ox = (CARD_W - CARD_W * k) / 2;
    const oy = (CARD_H - CARD_H * k) / 2;
    ctx.fillStyle = WHITE;
    ctx.fillRect(0, 0, CARD_W, CARD_H);
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(k, k);
    const inner = c.look.layout === "band" ? band(ctx, c) : scroll(ctx, c);
    ctx.restore();
    const mapBox = (bx: Box): Box => ({ x: ox + bx.x * k, y: oy + bx.y * k, w: bx.w * k, h: bx.h * k });
    drawn = {
      boxes: Object.fromEntries(Object.entries(inner.boxes).map(([id, bx]) => [id, mapBox(bx as Box)])) as Drawn["boxes"],
      guides: { x: [...inner.guides.x.map((x) => ox + x * k), 0, CARD_W / 2, CARD_W], y: [...inner.guides.y.map((y) => oy + y * k), 0, CARD_H / 2, CARD_H] },
    };
  }
  ctx.restore();
  return drawn;
}

/**
 * 门牌, after the temple's nameplate: the mark in a teal square; then one charcoal panel to the right end holding the
 * name and the code with its label. 边框 sets the white margin and the gap after the square. The code is white on the
 * panel (反白) or black on a white tile (白底); either way it keeps four modules of its own ground on every side.
 */
function sign(ctx: CanvasRenderingContext2D, c: CardInput): Drawn {
  const { look } = c;
  const { w: W, h: H } = SIZES.sign;
  const gapB = borderOf(look);
  // The outer margin is the white edge; the gap after the square stays whatever the edge.
  const b = edgeOn(look) ? gapB : 0;
  const boxes: Drawn["boxes"] = {};
  const square = { teal: VI_TEAL, night: BLACK, ink: PAPER, tealInk: PAPER }[look.way];
  const dots = { teal: WHITE, night: WHITE, ink: BLACK, tealInk: TEAL }[look.way];
  const panel = { teal: VI_CHARCOAL, night: VI_CHARCOAL, ink: BLACK, tealInk: VI_TEAL }[look.way];
  const invert = (look.qr ?? "invert") === "invert";

  ctx.fillStyle = WHITE;
  ctx.fillRect(0, 0, W, H);
  const S = H - 2 * b;

  ctx.fillStyle = square;
  ctx.fillRect(b, b, S, S);
  const panelX = b + S + gapB;
  const panelW = W - b - panelX;
  ctx.fillStyle = panel;
  ctx.fillRect(panelX, b, panelW, S);

  const mh = S * 0.8;
  const mBox: Box = { x: b + (S - markWidth(mh)) / 2, y: b + (S - mh) / 2, w: markWidth(mh), h: mh };
  boxes.mark = place(ctx, mBox, editOf(look, "mark"), () => mark(ctx, mBox.x, mBox.y, mBox.h, dots));

  // The code at the panel's right end: modules and label stacked, centred in the panel's height.
  const label = c.title.trim();
  const labelH = label ? Math.round(S * 0.16) : 0;
  const q = c.text ? encode(c.text, "M") : null;
  const n = q ? q.size : 33;
  const inset = Math.round(S * 0.1);
  let modW = Math.round(S * 0.66 * (look.zoom / 100));
  // Four modules of ground round the code, and room for the label, inside the panel.
  // 反白: the panel is the code's own ground. 白底: the tile is, and it keeps a margin of panel round it.
  const ring = (q4: number) => (invert ? Math.max(inset, q4) : q4 + Math.round(inset * 0.6));
  for (let i = 0; i < 3; i++) modW = Math.min(modW, S - 2 * ring((4 * modW) / n) - labelH);
  const unit = Math.max(5, Math.floor(modW / n));
  const modulesW = unit * n;
  const quiet = 4 * unit;
  const pad = ring(quiet);
  const stackH = modulesW + labelH;
  const qx = W - b - pad - modulesW;
  const qy = b + Math.round((S - stackH) / 2);
  const box = modulesW + 2 * quiet;
  boxes.code = invert
    ? placeCode(ctx, c.text, { x: qx - quiet, y: qy - quiet, w: box, h: box }, editOf(look, "code"), look.dots, WHITE, panel)
    : placeCode(ctx, c.text, { x: qx - quiet, y: qy - quiet, w: box, h: box }, editOf(look, "code"), look.dots);

  if (label) {
    // The label is justified to the code: the first character's ink starts on the code's left edge, the last one's
    // ends on its right edge, with even space between. In 白底 the code's edge is its white tile.
    const L = invert ? qx : qx - quiet;
    const R = invert ? qx + modulesW : qx + modulesW + quiet;
    const chars = Array.from(label);
    let size = Math.round(labelH * 0.6 * (look.size / 88));
    ctx.font = `700 ${size}px ${SANS}`;
    const ink = () =>
      chars.map((ch) => {
        const m = ctx.measureText(ch);
        return { l: m.actualBoundingBoxLeft, r: m.actualBoundingBoxRight, w: m.actualBoundingBoxLeft + m.actualBoundingBoxRight };
      });
    let marks = ink();
    let sum = marks.reduce((t, m) => t + m.w, 0);
    if (sum > R - L) {
      size = Math.floor((size * (R - L)) / sum);
      ctx.font = `700 ${size}px ${SANS}`;
      marks = ink();
      sum = marks.reduce((t, m) => t + m.w, 0);
    }
    const base = qy + modulesW + (invert ? 0 : quiet) + labelH * 0.86;
    const tBox: Box = { x: L, y: base - size * 0.9, w: R - L, h: size * 1.08 };
    boxes.title = place(ctx, tBox, editOf(look, "title"), () => {
      ctx.fillStyle = WHITE;
      ctx.textAlign = "left";
      ctx.font = `700 ${size}px ${SANS}`;
      const y = base - size * 0.12;
      if (chars.length === 1) {
        ctx.fillText(chars[0], (L + R) / 2 - marks[0].w / 2 + marks[0].l, y);
        return;
      }
      const gap = (R - L - sum) / (chars.length - 1);
      let x = L;
      chars.forEach((ch, i) => {
        ctx.fillText(ch, x + marks[i].l, y);
        x += marks[i].w + gap;
      });
    });
  }

  // 西頂廣仁宮 over Xiding Guangren Temple, set in the VI's Times, in the room left of the code.
  const wh = S * 0.24;
  const ww = (WORDMARK_W * wh) / WORDMARK_H;
  const latin = S * 0.115;
  const groupH = wh + S * 0.07 + latin;
  ctx.font = `400 ${latin}px "Times New Roman", Times, "Liberation Serif", Georgia, serif`;
  const lw = ctx.measureText("Xiding Guangren Temple").width;
  const gw = Math.max(ww, lw);
  const left = panelX + panelW * 0.07;
  const right = qx - quiet - pad;
  const gx = left + (Math.max(0, right - left - gw) * look.pos) / 100;
  const gy = b + (S - groupH) / 2 - S * 0.02;
  const wBox: Box = { x: gx, y: gy, w: gw, h: groupH };
  boxes.wordmark = place(ctx, wBox, editOf(look, "wordmark"), () => {
    wordmark(ctx, gx + S * 0.004, gy, wh, WHITE);
    ctx.fillStyle = WHITE;
    ctx.font = `400 ${latin}px "Times New Roman", Times, "Liberation Serif", Georgia, serif`;
    ctx.textAlign = "left";
    ctx.fillText("Xiding Guangren Temple", gx, gy + groupH - latin * 0.2);
  });

  return {
    boxes,
    guides: { x: [0, b, b + S, panelX, panelX + panelW / 2, qx, qx + modulesW / 2, qx + modulesW, W - b, W], y: [0, b, H / 2, b + S, H - b, H] },
  };
}

const IVORY = "#F3F1E8"; // vi-ivory, the VI's paper

export type SquareStyle = "dot" | "blank" | "seal";

/** Colours for the square: the field and its dots, the ground the rest stands on, and the text on that ground. */
function squareScheme(way: Way) {
  return {
    teal: { field: VI_TEAL, dots: WHITE, ground: IVORY, text: BLACK, accent: VI_TEAL },
    night: { field: BLACK, dots: WHITE, ground: IVORY, text: BLACK, accent: BLACK },
    ink: { field: PAPER, dots: BLACK, ground: WHITE, text: BLACK, accent: BLACK },
    tealInk: { field: IVORY, dots: VI_TEAL, ground: WHITE, text: BLACK, accent: VI_TEAL },
  }[way];
}

function measureTracked(ctx: CanvasRenderingContext2D, text: string, em: number): number {
  const size = fontSize(ctx);
  const chars = Array.from(text);
  return chars.reduce((n, ch) => n + ctx.measureText(ch).width, 0) + size * em * Math.max(0, chars.length - 1);
}

/** The name, Songti, as one horizontal line with its right edge on `right` and its baseline on `base`. */
function lineRight(ctx: CanvasRenderingContext2D, text: string, right: number, base: number, size: number, colour: string): void {
  ctx.font = `600 ${size}px ${SERIF}`;
  ctx.fillStyle = colour;
  tracked(ctx, text, right, base, 0.12, "right");
}

/** Tracked capitals, the Latin line of a lockup. */
function latinLine(ctx: CanvasRenderingContext2D, text: string, x: number, base: number, size: number, colour: string, align: "left" | "right" = "left"): number {
  ctx.font = `500 ${size}px ${SANS}`;
  ctx.fillStyle = colour;
  return tracked(ctx, text, x, base, 0.42, align);
}

/**
 * 方 (1:1), three ways, all from one idea: the mark is forty dots and the code is dots, so the card is a field of dots
 * at two scales.
 *   点 (dot)    one loud element and a quiet rail: the mark drawn huge on its field, cropped by the field's edges;
 *               under it, on the VI's ivory, 西頂廣仁宮, the name and the code share one baseline.
 *   空 (blank)  emptiness: on ivory, a small mark at the top left, the name hung vertically at the right edge, the code
 *               at the foot. Most of the square is left empty on purpose.
 *   印 (seal)   the code as the image: large on ivory, its dots echoing the mark; beside it a narrow column with the
 *               mark, the name hung vertically and 西頂廣仁宮.
 * 白边 adds a white frame of 边框 round all three.
 */
function squareCard(ctx: CanvasRenderingContext2D, c: CardInput): Drawn {
  const { look } = c;
  const { w: W, h: H } = SIZES.square;
  const frame = edgeOn(look) ? borderOf(look) : 0;
  const k = (W - 2 * frame) / W;
  ctx.fillStyle = WHITE;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(frame, frame);
  ctx.scale(k, k);
  const style = look.square ?? "dot";
  const inner = style === "blank" ? sqBlank(ctx, c) : style === "seal" ? sqSeal(ctx, c) : sqDot(ctx, c);
  ctx.restore();
  const mapBox = (bx: Box): Box => ({ x: frame + bx.x * k, y: frame + bx.y * k, w: bx.w * k, h: bx.h * k });
  return {
    boxes: Object.fromEntries(Object.entries(inner.boxes).map(([id, bx]) => [id, mapBox(bx as Box)])) as Drawn["boxes"],
    guides: { x: [...inner.guides.x.map((x) => frame + x * k), 0, W], y: [...inner.guides.y.map((y) => frame + y * k), 0, H] },
  };
}

/** The code with its modules' box at (x, y), `modW` wide; its quiet zone is the ground it stands on. */
function codeAt(ctx: CanvasRenderingContext2D, c: CardInput, x: number, y: number, modW: number, ground: string): Box {
  const q = c.text ? encode(c.text, "M") : null;
  const n = q ? q.size : 33;
  const u = Math.max(5, Math.floor(modW / n));
  const mw = u * n;
  const quiet = 4 * u;
  const dark = ground === BLACK || ground === VI_CHARCOAL || ground === VI_TEAL;
  const box = mw + 2 * quiet;
  const base: Box = { x: x + (modW - mw) - quiet, y: y + (modW - mw) - quiet, w: box, h: box };
  return dark
    ? placeCode(ctx, c.text, base, editOf(c.look, "code"), c.look.dots, WHITE, ground)
    : placeCode(ctx, c.text, base, editOf(c.look, "code"), c.look.dots, BLACK, ground);
}

function sqDot(ctx: CanvasRenderingContext2D, c: CardInput): Drawn {
  const { look } = c;
  const W = SIZES.square.w;
  const sc = squareScheme(look.way);
  const boxes: Drawn["boxes"] = {};
  const m = W * 0.066; // margin of the rail
  const railH = W * 0.3;
  const fieldH = W - railH;

  ctx.fillStyle = sc.ground;
  ctx.fillRect(0, 0, W, W);
  ctx.fillStyle = sc.field;
  ctx.fillRect(0, 0, W, fieldH);

  // The mark, huge: whole in itself, cropped by the field's edges, nothing else in the field.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, fieldH);
  ctx.clip();
  const mh = W * 1.62;
  const mw = markWidth(mh);
  const mBox: Box = { x: W * 0.58 - mw / 2, y: -mh * 0.205, w: mw, h: mh };
  boxes.mark = place(ctx, mBox, editOf(look, "mark"), () => mark(ctx, mBox.x, mBox.y, mBox.h, sc.dots));
  ctx.restore();

  // The rail: 西頂廣仁宮 and its Latin line, the name, the code, on one baseline.
  const base = W - m;
  const modW = Math.round(W * 0.205 * (look.zoom / 100));
  boxes.code = codeAt(ctx, c, W - m - modW, base - modW, modW, sc.ground);
  const wh = W * 0.05;
  const latin = W * 0.0125;
  const ww = (WORDMARK_W * wh) / WORDMARK_H;
  const wBox: Box = { x: m, y: base - wh - latin * 2.6, w: ww, h: wh + latin * 2.6 };
  boxes.wordmark = place(ctx, wBox, editOf(look, "wordmark"), () => {
    wordmark(ctx, m, wBox.y, wh, sc.text);
    latinLine(ctx, "XIDING GUANGREN TEMPLE", m, base, latin, sc.text);
  });
  if (c.title.trim()) {
    const size = Math.round(W * 0.034 * (look.size / 88));
    const right = W - m - modW - W * 0.045;
    ctx.font = `600 ${size}px ${SERIF}`;
    const tw = measureTracked(ctx, c.title.trim(), 0.12);
    const tb: Box = { x: right - tw, y: base - size * 0.9, w: tw, h: size * 1.1 };
    boxes.title = place(ctx, tb, editOf(look, "title"), () => lineRight(ctx, c.title.trim(), right, base, size, sc.text));
  }
  return {
    boxes,
    guides: { x: [m, W / 2, W - m, W - m - modW], y: [fieldH, base, base - modW, W / 2] },
  };
}

/** 空's colours: ivory (or white, or black) ground, ink for words, the accent for the mark. */
function blankScheme(way: Way) {
  return {
    ground: way === "ink" ? WHITE : way === "night" ? BLACK : IVORY,
    ink: way === "night" ? WHITE : BLACK,
    accent: way === "night" ? WHITE : way === "ink" ? BLACK : VI_TEAL,
  };
}

function sqBlank(ctx: CanvasRenderingContext2D, c: CardInput): Drawn {
  const photo = photoFor(c.look.photo, c.text);
  return photo ? sqGallery(ctx, c, photo) : sqEmpty(ctx, c);
}

/**
 * 空 with a photo, set like an exhibition poster on one grid. Margin m all round, one gutter between everything.
 *   the photo    the left column, from the top margin down, as tall as leaves room for the lockup
 *   the name     hung in the right column from the top margin, flush right
 *   the code     the right column's foot, on the bottom margin
 *   the lockup   the mark and 西頂廣仁宮 side by side under the photo, also on the bottom margin; the mark's dots are
 *                drawn a little heavier at this size so they hold together as one sign
 */
function sqGallery(ctx: CanvasRenderingContext2D, c: CardInput, photo: Photo): Drawn {
  const { look } = c;
  const W = SIZES.square.w;
  const boxes: Drawn["boxes"] = {};
  const { ground, ink, accent } = blankScheme(look.way);
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, W, W);

  const m = Math.round(W * 0.07); // 101
  const gut = Math.round(W * 0.05); // 72
  const foot = W - m;
  const lockH = Math.round(W * 0.118); // the lockup's height: the mark's
  const photoB = foot - lockH - gut;
  // The right column is as wide as the code at 100%, and the code is as tall as the lockup and its gutter, so its top
  // lies on the photo's foot.
  const colW = foot - photoB;
  const colX = W - m - colW;

  // The photo.
  const pBox: Box = { x: m, y: m, w: colX - gut - m, h: photoB - m };
  boxes.photo = place(ctx, pBox, editOf(look, "photo"), () => drawPhoto(ctx, photo, pBox.x, pBox.y, pBox.w, pBox.h, look.way === "night" ? "#1A1A1A" : LINE));

  // The lockup: the mark, then 西頂廣仁宮 over XIDING GUANGREN TEMPLE, the pair centred on the mark.
  const mBox: Box = { x: m, y: foot - lockH, w: markWidth(lockH), h: lockH };
  boxes.mark = place(ctx, mBox, editOf(look, "mark"), () => mark(ctx, mBox.x, mBox.y, mBox.h, accent, 1.42));
  const wh = Math.round(W * 0.047);
  const latin = Math.round(W * 0.0118);
  const ww = (WORDMARK_W * wh) / WORDMARK_H;
  const pairH = wh + latin * 2.2;
  const wx = m + markWidth(lockH) + Math.round(W * 0.034);
  const wy = foot - lockH / 2 - pairH / 2;
  const latinW = (() => {
    ctx.font = `500 ${latin}px ${SANS}`;
    return measureTracked(ctx, "XIDING GUANGREN TEMPLE", 0.42);
  })();
  const wBox: Box = { x: wx, y: wy, w: Math.max(ww, latinW), h: pairH };
  boxes.wordmark = place(ctx, wBox, editOf(look, "wordmark"), () => {
    wordmark(ctx, wx, wy, wh, ink);
    latinLine(ctx, "XIDING GUANGREN TEMPLE", wx, wy + pairH, latin, ink);
  });

  // The code at the foot of the right column, on the bottom margin; 缩放 grows it up and to the left.
  const modW = Math.round(colW * (look.zoom / 100));
  boxes.code = codeAt(ctx, c, W - m - modW, foot - modW, modW, ground);
  const codeTop = foot - modW;

  // The name, hung flush right from the top margin, down to a gutter above the code.
  if (c.title.trim()) {
    const size = Math.round(W * 0.058 * (look.size / 88));
    ctx.font = `600 ${size}px ${SERIF}`;
    ctx.fillStyle = ink;
    const right = W - m;
    const room = codeTop - gut - m;
    const tall = Math.min(room, measureVertical(ctx, c.title));
    const top = m + ((room - tall) * look.pos) / 100;
    const dim = vertical(ctx, c.title, right, top, room - (top - m), 2, true);
    const tBox: Box = { x: right - dim.w, y: top, w: dim.w, h: dim.h };
    boxes.title = place(ctx, tBox, editOf(look, "title"), () => vertical(ctx, c.title, right, top, room - (top - m), 2));
  }
  return {
    boxes,
    guides: { x: [m, colX - gut, colX, W - m, W / 2], y: [m, photoB, foot - lockH, foot, codeTop, W / 2] },
  };
}

/** 空 without a photo: a small mark top left, the name hung at the right edge, the code and 西頂廣仁宮 on the foot. */
function sqEmpty(ctx: CanvasRenderingContext2D, c: CardInput): Drawn {
  const { look } = c;
  const W = SIZES.square.w;
  const boxes: Drawn["boxes"] = {};
  const m = W * 0.083;
  const { ground, ink, accent } = blankScheme(look.way);
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, W, W);

  const mh = W * 0.15;
  const mBox: Box = { x: m, y: m, w: markWidth(mh), h: mh };
  boxes.mark = place(ctx, mBox, editOf(look, "mark"), () => mark(ctx, mBox.x, mBox.y, mBox.h, accent, 1.15));

  if (c.title.trim()) {
    const size = Math.round(W * 0.056 * (look.size / 88));
    ctx.font = `600 ${size}px ${SERIF}`;
    ctx.fillStyle = ink;
    const right = W - m;
    const room = W * 0.55;
    const tall = Math.min(room, measureVertical(ctx, c.title));
    const top = m + ((room - tall) * look.pos) / 100;
    const dim = vertical(ctx, c.title, right, top, room, 2, true);
    const tBox: Box = { x: right - dim.w, y: top, w: dim.w, h: dim.h };
    boxes.title = place(ctx, tBox, editOf(look, "title"), () => vertical(ctx, c.title, right, top, room, 2));
  }

  const base = W - m;
  const modW = Math.round(W * 0.21 * (look.zoom / 100));
  boxes.code = codeAt(ctx, c, m, base - modW, modW, ground);
  const wh = W * 0.034;
  const latin = W * 0.011;
  const ww = (WORDMARK_W * wh) / WORDMARK_H;
  const wBox: Box = { x: W - m - ww, y: base - wh - latin * 2.6, w: ww, h: wh + latin * 2.6 };
  boxes.wordmark = place(ctx, wBox, editOf(look, "wordmark"), () => {
    wordmark(ctx, wBox.x, wBox.y, wh, ink);
    latinLine(ctx, "XIDING GUANGREN TEMPLE", W - m, base, latin, ink, "right");
  });
  return { boxes, guides: { x: [m, W / 2, W - m], y: [m, W / 2, base, base - modW] } };
}

function sqSeal(ctx: CanvasRenderingContext2D, c: CardInput): Drawn {
  const { look } = c;
  const W = SIZES.square.w;
  const boxes: Drawn["boxes"] = {};
  const m = W * 0.083;
  const ground = look.way === "ink" ? WHITE : look.way === "night" ? BLACK : IVORY;
  const ink = look.way === "night" ? WHITE : BLACK;
  const accent = look.way === "night" ? WHITE : look.way === "ink" ? BLACK : VI_TEAL;
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, W, W);

  // The code as the image: its modules square on the left, from the top margin to the bottom margin's height.
  const modW = Math.round((W - 2 * m) * 0.62 * (look.zoom / 100));
  const top = m + (W - 2 * m - modW) / 2;
  boxes.code = codeAt(ctx, c, m, top, modW, ground);

  // The column: the mark at the top, the name hung below it, 西頂廣仁宮 at the foot — top and foot on the code's.
  const colX = m + modW + W * 0.08;
  const colR = W - m;
  const mh = W * 0.12;
  const mBox: Box = { x: colR - markWidth(mh), y: top, w: markWidth(mh), h: mh };
  boxes.mark = place(ctx, mBox, editOf(look, "mark"), () => mark(ctx, mBox.x, mBox.y, mBox.h, accent));
  const wh = W * 0.03;
  const ww = (WORDMARK_W * wh) / WORDMARK_H;
  const wBox: Box = { x: colR - ww, y: top + modW - wh, w: ww, h: wh };
  boxes.wordmark = place(ctx, wBox, editOf(look, "wordmark"), () => wordmark(ctx, wBox.x, wBox.y, wh, ink));
  if (c.title.trim()) {
    const size = Math.round(W * 0.052 * (look.size / 88));
    ctx.font = `600 ${size}px ${SERIF}`;
    ctx.fillStyle = ink;
    const t0 = top + mh + W * 0.06;
    const room = top + modW - wh - W * 0.06 - t0;
    const tall = Math.min(room, measureVertical(ctx, c.title));
    const t = t0 + ((room - tall) * look.pos) / 100;
    const dim = vertical(ctx, c.title, colR, t, room, 2, true);
    const tBox: Box = { x: colR - dim.w, y: t, w: dim.w, h: dim.h };
    boxes.title = place(ctx, tBox, editOf(look, "title"), () => vertical(ctx, c.title, colR, t, room, 2));
  }
  void colX;
  return { boxes, guides: { x: [m, m + modW, colR, W / 2], y: [top, top + modW, W / 2] } };
}

/** 立轴: field two thirds, mark whole in it, the name hung on the white third, the code at its foot. */
function scroll(ctx: CanvasRenderingContext2D, c: CardInput): Drawn {
  const { look } = c;
  const way = WAYS[look.way];
  const FW = 720;
  const boxes: Drawn["boxes"] = {};

  ctx.fillStyle = way.ground;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  ctx.fillStyle = way.field;
  ctx.fillRect(0, 0, FW, CARD_H);
  if (way.field === way.ground) {
    ctx.fillStyle = LINE;
    ctx.fillRect(FW, 0, 2, CARD_H);
  }

  // The mark, whole, standing in the field: as tall as the field allows with the margins kept.
  const mh = Math.min(CARD_H - M * 2 - 200, (FW - M * 2) * (MARK_BOX.h / MARK_BOX.w));
  const mBox: Box = { x: (FW - markWidth(mh)) / 2, y: M + 32, w: markWidth(mh), h: mh };
  boxes.mark = place(ctx, mBox, editOf(look, "mark"), () => mark(ctx, mBox.x, mBox.y, mBox.h, way.mark));
  const wBox: Box = { x: M, y: CARD_H - M - 50, w: (WORDMARK_W * 50) / WORDMARK_H, h: 50 };
  boxes.wordmark = place(ctx, wBox, editOf(look, "wordmark"), () => wordmark(ctx, wBox.x, wBox.y, wBox.h, way.mark));

  // The code at the foot of the column. At 100% it fills the column; its quiet zone is the column's own white.
  const colW = CARD_W - FW;
  const box = Math.min(colW, Math.round(((colW - 16) * look.zoom) / 100));
  const cBox: Box = { x: FW + Math.round((colW - box) / 2), y: CARD_H - M - box + Math.round(box * 0.1), w: box, h: box };
  boxes.code = placeCode(ctx, c.text, cBox, editOf(look, "code"), look.dots);

  // The name, hung vertically against the right edge.
  if (c.title.trim()) {
    ctx.fillStyle = BLACK;
    ctx.font = `600 ${look.size}px ${SERIF}`;
    const room = cBox.y + box * 0.1 - M - 48;
    const tall = Math.min(room, measureVertical(ctx, c.title));
    const top = M + ((room - tall) * look.pos) / 100;
    const right = CARD_W - 56;
    const size = vertical(ctx, c.title, right, top, room - (top - M), 2, true);
    const tBox: Box = { x: right - size.w, y: top, w: size.w, h: size.h };
    boxes.title = place(ctx, tBox, editOf(look, "title"), () => vertical(ctx, c.title, right, top, room - (top - M), 2));
  }
  return {
    boxes,
    guides: { x: [0, M, FW / 2, FW, FW + colW / 2, CARD_W - 56, CARD_W - M, CARD_W], y: [0, M, CARD_H / 2, CARD_H - M, CARD_H] },
  };
}

/** 横卷: field across the top with the mark and the name; the code on the ground; the wordmark centred. */
function band(ctx: CanvasRenderingContext2D, c: CardInput): Drawn {
  const { look } = c;
  const way = WAYS[look.way];
  const FOOT = CARD_H - 128;
  const qrBox = Math.round((560 * look.zoom) / 100);
  const FIELD_H = Math.min(600, FOOT - qrBox - 80);
  const QR_TOP = FIELD_H + Math.round((FOOT - FIELD_H - qrBox) / 2);
  const boxes: Drawn["boxes"] = {};

  ctx.fillStyle = way.ground === PAPER ? WHITE : way.ground;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  ctx.fillStyle = way.field === WHITE ? PAPER : way.field;
  ctx.fillRect(0, 0, CARD_W, FIELD_H);

  const mh = FIELD_H - 112;
  const mx = CARD_W - M - markWidth(mh);
  const mBox: Box = { x: mx, y: (FIELD_H - mh) / 2, w: markWidth(mh), h: mh };
  boxes.mark = place(ctx, mBox, editOf(look, "mark"), () => mark(ctx, mBox.x, mBox.y, mBox.h, way.mark));

  boxes.code = placeCode(ctx, c.text, { x: Math.round((CARD_W - qrBox) / 2), y: QR_TOP, w: qrBox, h: qrBox }, editOf(look, "code"), look.dots);

  ctx.fillStyle = LINE;
  ctx.fillRect(M, FOOT, CARD_W - M * 2, 2);
  const ww = (WORDMARK_W * 58) / WORDMARK_H;
  const wBox: Box = { x: CARD_W / 2 - ww / 2, y: FOOT + (CARD_H - FOOT - 58) / 2, w: ww, h: 58 };
  boxes.wordmark = place(ctx, wBox, editOf(look, "wordmark"), () => wordmark(ctx, wBox.x, wBox.y, wBox.h, BLACK));

  if (c.title.trim()) {
    const size = look.size;
    const lead = Math.round(size * 1.32);
    ctx.font = `600 ${size}px ${SERIF}`;
    const lines = wrap(ctx, c.title, mx - M - 48, size > 96 ? 3 : 2, 0.08);
    const top = M + size * 0.86 + (lines.length - 1) * lead;
    const foot = FIELD_H - M;
    const last = foot - ((foot - top) * (100 - look.pos)) / 100;
    const widths = lines.map((l) => Array.from(l).reduce((n, ch) => n + ctx.measureText(ch).width + size * 0.08, -size * 0.08));
    const first = last - (lines.length - 1) * lead;
    const tBox: Box = { x: M, y: first - size * 0.88, w: Math.max(...widths), h: (lines.length - 1) * lead + size * 1.08 };
    boxes.title = place(ctx, tBox, editOf(look, "title"), () => {
      ctx.fillStyle = way.field === WHITE ? BLACK : WHITE;
      lines.forEach((line, i) => tracked(ctx, line, M, last - (lines.length - 1 - i) * lead, 0.08));
    });
  }
  return {
    boxes,
    guides: { x: [0, M, CARD_W / 2, CARD_W - M, CARD_W], y: [0, M, FIELD_H, CARD_H / 2, FOOT, CARD_H - M, CARD_H] },
  };
}
