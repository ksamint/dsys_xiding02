/* 西顶 pillar simulator: the mark's styles, colours and sizes, drawn by the design system's own bundle, with its
   ratio, spacing and clear space measured and labelled. Runs in the browser; the build inlines the bundle. */
import type {} from "../../design-system/components/index";
import {
  agreement, columns, fix, inkExtent, measures, pairs, perUnit, radius, ratio, rows,
  type Geometry, type Look, type MarkData, type Scale, type Style, type Unit,
} from "./spec";

type Colorway = "teal" | "ink" | "night" | "tealInk";
type Lockup = "mark" | "stacked" | "horizontal";
interface State extends Look {
  geometry: Geometry;
  lockup: Lockup;
  colorway: Colorway | "custom";
  ink: string;
  ground: string;
  transparent: boolean;
  show: { box: boolean; clear: boolean; grid: boolean; centres: boolean; dims: boolean };
  scale: Scale;
}
interface Embedded {
  tokens: Record<string, number>;
  source: { repo: string; commit: string; date: string; dirty: boolean };
}

const X = window.Xiding;
const data = JSON.parse(document.getElementById("xd-sim-data")?.textContent ?? "{}") as Embedded;
const $ = <T extends Element>(sel: string): T => {
  const el = document.querySelector<T>(sel);
  if (!el) throw new Error(`missing ${sel}`);
  return el;
};
const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const n = (v: number, d = 2): string => fix(v, d);

const STYLES: { id: Style; zh: string; en: string }[] = [
  { id: "dot", zh: "实点", en: "Dot" }, { id: "ring", zh: "圆圈", en: "Circle" }, { id: "point", zh: "细点", en: "Point" },
];
const LOCKUPS: { id: Lockup; zh: string; en: string }[] = [
  { id: "mark", zh: "标识", en: "Mark" }, { id: "stacked", zh: "竖排", en: "Stacked" }, { id: "horizontal", zh: "横排", en: "Wide" },
];
const GEOMETRIES: { id: Geometry; zh: string; en: string }[] = [
  { id: "extracted", zh: "原稿", en: "Extracted" }, { id: "trued", zh: "校正", en: "Trued" },
];
const COLORWAYS: { id: Colorway | "custom"; zh: string }[] = [
  { id: "teal", zh: "白点 · 庙青底" }, { id: "ink", zh: "黑点 · 白底" }, { id: "night", zh: "白点 · 黑底" }, { id: "tealInk", zh: "庙青点 · 白底" }, { id: "custom", zh: "自定" },
];
const UNITS: Unit[] = ["mm", "px", "pt"];

const state: State = {
  style: "dot", size: 1, ring: data.tokens["mark-ring"] ?? 6, geometry: "extracted", lockup: "mark",
  colorway: "teal", ink: "#FFFFFF", ground: "#628F8A", transparent: false,
  show: { box: true, clear: true, grid: false, centres: false, dims: true },
  scale: { height: 30, unit: "mm", dpi: 300 },
};

function markData(g: Geometry): MarkData {
  return { R: X.R, PAD: X.PAD, BOUNDS: X.BOUNDS, points: X.points(g), circles: X.circles(g), tokens: data.tokens };
}

/** The mark exactly as the bundle draws it for the current state. */
function markSVG(sized: boolean): string {
  const custom = state.colorway === "custom";
  return X.mark({
    colorway: state.colorway === "custom" ? "ink" : state.colorway, style: state.style, lockup: state.lockup, geometry: state.geometry,
    size: state.size, ring: state.ring, transparent: state.transparent, sized,
    ...(custom ? { ink: state.ink, ground: state.transparent ? "none" : state.ground } : {}),
    title: "西顶 Xiding",
  });
}

// ---------- controls ----------
function seg<T extends string>(name: string, items: { id: T; zh: string; en?: string }[], current: T, wrap = false): string {
  return `<div class="xd-seg${wrap ? " xd-seg--wrap" : ""}" role="radiogroup">${items.map((it) =>
    `<label><input type="radio" name="${name}" value="${it.id}"${it.id === current ? " checked" : ""}><span>${esc(it.zh)}${it.en ? ` <small>${esc(it.en)}</small>` : ""}</span></label>`).join("")}</div>`;
}
function controls(): string {
  const checks = ([["box", "外框与比例"], ["clear", "留白"], ["dims", "尺寸标注"], ["grid", "行与列"], ["centres", "圆心与编号"]] as const)
    .map(([k, zh]) => `<label class="xd-check"><input type="checkbox" name="show" value="${k}"${state.show[k] ? " checked" : ""}>${zh}</label>`).join("");
  return `
<fieldset><legend>样式 <small>Style</small></legend>${seg("style", STYLES, state.style)}</fieldset>
<fieldset class="xd-range"><legend>点径倍数 <small>Dot scale</small> <output id="o-size">${n(state.size)} ×</output></legend>
  <input type="range" name="size" min="0.3" max="1.4" step="0.05" value="${state.size}" aria-label="点径倍数">
  <p class="xd-hint">规范为 1 ×：实点半径 ${X.R}，细点半径 ${data.tokens["mark-point"]}。</p></fieldset>
<fieldset class="xd-range" id="f-ring"><legend>圆圈线宽 <small>Line weight</small> <output id="o-ring">${state.ring}</output></legend>
  <input type="range" name="ring" min="1" max="16" step="1" value="${state.ring}" aria-label="圆圈线宽">
  <p class="xd-hint">规范为 ${data.tokens["mark-ring"]}（1–16），外径不变。</p></fieldset>
<fieldset><legend>配色 <small>Colour</small></legend>${seg("colorway", COLORWAYS, state.colorway, true)}
  <div class="sim-custom" id="f-custom"${state.colorway === "custom" ? "" : " hidden"}>
    <label class="xd-field">点 Ink<input type="color" name="ink" value="${state.ink}"></label>
    <label class="xd-field">底 Ground<input type="color" name="ground" value="${state.ground}"></label>
  </div>
  <label class="xd-check"><input type="checkbox" name="transparent"${state.transparent ? " checked" : ""}>透明底 <small>No field</small></label></fieldset>
<fieldset><legend>组合 <small>Lockup</small></legend>${seg("lockup", LOCKUPS, state.lockup)}</fieldset>
<fieldset><legend>几何 <small>Geometry</small></legend>${seg("geometry", GEOMETRIES, state.geometry)}
  <p class="xd-hint">原稿：从标识量出的点。校正：以 x = ${X.CENTER.x} 镜像并取整。</p></fieldset>
<fieldset><legend>标注 <small>Guides</small></legend><div class="xd-stack">${checks}</div></fieldset>
<fieldset><legend>输出尺寸 <small>Output size</small></legend>
  <div class="sim-size">
    <label class="xd-field">标识高<input type="number" name="height" min="1" step="any" value="${state.scale.height}" inputmode="decimal"></label>
    <label class="xd-field">单位<select name="unit">${UNITS.map((u) => `<option${u === state.scale.unit ? " selected" : ""}>${u}</option>`).join("")}</select></label>
    <label class="xd-field">DPI<input type="number" name="dpi" min="1" step="1" value="${state.scale.dpi}" inputmode="numeric"></label>
  </div>
  <p class="xd-hint">1 u（源单位）= 标识高 ÷ ${data.tokens["mark-height"]}。</p></fieldset>`;
}

// ---------- the stage: the mark, and the guides drawn in its own units ----------
const GUIDE = "var(--guide-safe)", CLEAR = "var(--guide-trim)";
function viewBoxOf(svg: string): [number, number, number, number] {
  const m = /viewBox="([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+)"/.exec(svg);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])] : [0, 0, 100, 100];
}
function label(x: number, y: number, text: string, o: { anchor?: "start" | "middle" | "end"; size?: number; fill?: string; rotate?: boolean } = {}): string {
  const size = o.size ?? 60, t = o.rotate ? ` transform="rotate(-90 ${n(x)} ${n(y)})"` : "";
  return `<text x="${n(x)}" y="${n(y)}" font-size="${size}" text-anchor="${o.anchor ?? "middle"}" fill="${o.fill ?? GUIDE}" font-family="var(--font-sans)" font-weight="600" stroke="var(--surface)" stroke-width="${n(size / 5, 1)}" paint-order="stroke" stroke-linejoin="round"${t}>${esc(text)}</text>`;
}
function dim(x1: number, y1: number, x2: number, y2: number, text: string, side: -1 | 1, size = 60): string {
  const vertical = x1 === x2, tick = 14;
  const ticks = vertical
    ? `<path d="M${n(x1 - tick)} ${n(y1)}H${n(x1 + tick)}M${n(x2 - tick)} ${n(y2)}H${n(x2 + tick)}"/>`
    : `<path d="M${n(x1)} ${n(y1 - tick)}V${n(y1 + tick)}M${n(x2)} ${n(y2 - tick)}V${n(y2 + tick)}"/>`;
  const lx = vertical ? x1 + side * 22 : (x1 + x2) / 2, ly = vertical ? (y1 + y2) / 2 : y1 + side * 16 + (side > 0 ? 46 : 0);
  return `<g stroke="${GUIDE}" stroke-width="2"><path d="M${n(x1)} ${n(y1)}L${n(x2)} ${n(y2)}"/>${ticks}</g>${label(lx, ly, text, { rotate: vertical, anchor: "middle", size })}`;
}
function guides(d: MarkData): string {
  const b = d.BOUNDS, pad = d.PAD, look: Look = state;
  const out: string[] = [];
  const r = radius(d, look);
  if (state.show.clear) {
    out.push(`<rect x="${b.left - pad}" y="${b.top - pad}" width="${b.right - b.left + 2 * pad}" height="${b.bottom - b.top + 2 * pad}" fill="none" stroke="${CLEAR}" stroke-width="3" stroke-dasharray="14 10"/>`);
    out.push(`<path d="M${b.left - pad} ${b.bottom - 80}H${b.left}M${b.left + 80} ${b.bottom}V${b.bottom + pad}" stroke="${CLEAR}" stroke-width="2"/>`);
    out.push(label(b.left + 90, b.bottom + pad / 2 + 16, `留白 ${pad}`, { fill: CLEAR, size: 44, anchor: "start" }));
  }
  if (state.show.box) {
    out.push(`<rect x="${b.left}" y="${b.top}" width="${b.right - b.left}" height="${b.bottom - b.top}" fill="none" stroke="${GUIDE}" stroke-width="2.5"/>`);
    const ra = ratio(b);
    out.push(label((b.left + b.right) / 2, b.top - pad / 2 + 16, `${ra.w} : ${ra.h} = 1 : ${n(ra.hOverW, 3)}`, { size: 48 }));
  }
  if (state.show.dims) {
    out.push(dim(b.left, b.top - pad - 60, b.right, b.top - pad - 60, `宽 ${b.right - b.left} u`, -1));
    out.push(dim(b.left - pad - 60, b.top, b.left - pad - 60, b.bottom, `高 ${b.bottom - b.top} u`, -1));
    const p = pairs(d, look).find((q) => q.id === "C2");
    if (p) {
      const y = p.y + r + 46;
      out.push(dim(p.x - p.half, y, p.x + p.half, y, `${p.distance}`, 1, 36));
    }
    const rs = rows(d);
    const a = rs[0], bRow = rs[1];
    if (a && bRow) out.push(dim(b.left - pad / 2, a.y, b.left - pad / 2, bRow.y, `行距 ${n(bRow.y - a.y, 1)}`, -1));
  }
  if (state.show.grid) {
    for (const row of rows(d)) {
      out.push(`<path d="M${b.left} ${row.y}H${b.right}" stroke="${GUIDE}" stroke-width="1.2" stroke-dasharray="6 6"/>`);
      out.push(label(b.right + 24, row.y + 16, row.label, { anchor: "start", size: 48 }));
    }
    for (const c of columns(d)) for (const x of c.xs) out.push(`<path d="M${x} ${b.top}V${b.bottom}" stroke="${GUIDE}" stroke-width="1" stroke-dasharray="2 8" opacity="0.7"/>`);
  }
  if (state.show.centres) {
    for (const c of d.circles) out.push(`<path d="M${n(c.cx - 10)} ${n(c.cy)}H${n(c.cx + 10)}M${n(c.cx)} ${n(c.cy - 10)}V${n(c.cy + 10)}" stroke="${GUIDE}" stroke-width="2"/>`);
    for (const p of d.points) out.push(label(p.x, p.y - r - 10, p.id, { size: 30 }));
  }
  return out.join("\n");
}
function drawStage(): void {
  const d = markData(state.geometry), svg = markSVG(false);
  const [vx, vy, vw, vh] = viewBoxOf(svg), m = 190;
  const inner = svg.replace("<svg ", `<svg x="${vx}" y="${vy}" width="${vw}" height="${vh}" `);
  $("#stage").innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vx - m} ${vy - m} ${vw + 2 * m} ${vh + 2 * m}" role="img" aria-label="西顶标识与标注">${inner}<g class="sim-guides">${guides(d)}</g></svg>`;
}

// ---------- the zoomed pair: radius, centre distance, overlap, line weight ----------
function drawDetail(): void {
  const d = markData(state.geometry), r = radius(d, state), p = pairs(d, state).find((q) => q.id === "C2") ?? pairs(d, state)[0];
  if (!p) { $("#detail").innerHTML = ""; return; }
  const R = d.R, w = 2 * p.half + 2 * R + 120, h = 2 * R + 150, x0 = p.x - w / 2, y0 = p.y - R - 50;
  const ink = "var(--ink)";
  const circle = (cx: number): string => state.style === "ring"
    ? `<circle cx="${cx}" cy="${p.y}" r="${n(Math.max(0.5, r - state.ring / 2))}" fill="none" stroke="${ink}" stroke-width="${state.ring}" opacity=".85"/>`
    : `<circle cx="${cx}" cy="${p.y}" r="${n(r)}" fill="${ink}" opacity=".85"/>`;
  const a = p.x - p.half, b = p.x + p.half;
  const s = 7;
  $("#detail").innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${n(x0)} ${n(y0)} ${n(w)} ${n(h)}" role="img" aria-label="双点细部">
${circle(a)}${circle(b)}
<g stroke="${GUIDE}" stroke-width="1"><path d="M${a} ${p.y - 3}V${p.y + 3}M${a - 3} ${p.y}H${a + 3}M${b} ${p.y - 3}V${p.y + 3}M${b - 3} ${p.y}H${b + 3}"/>
<path d="M${a} ${p.y + R + 18}H${b}M${a} ${p.y + R + 13}V${p.y + R + 23}M${b} ${p.y + R + 13}V${p.y + R + 23}"/>
<path d="M${b} ${p.y}H${n(b + r)}"/></g>
<text x="${p.x}" y="${p.y + R + 38}" font-size="${s * 1.6}" text-anchor="middle" fill="${GUIDE}" font-family="var(--font-sans)">圆心距 ${p.distance}</text>
<text x="${n(b + r + 6)}" y="${p.y + 4}" font-size="${s * 1.6}" fill="${GUIDE}" font-family="var(--font-sans)">r ${n(r)}</text>
<text x="${p.x}" y="${y0 + 22}" font-size="${s * 1.6}" text-anchor="middle" fill="${GUIDE}" font-family="var(--font-sans)">${p.id} · ${p.overlap > 0 ? `重叠 ${n(p.overlap)}` : `间隙 ${n(p.gap)}`}${state.style === "ring" ? ` · 线宽 ${state.ring}` : ""}</text>
</svg>`;
}

// ---------- the numbers ----------
function drawSpec(): void {
  const d = markData(state.geometry), k = perUnit(d, state.scale), look: Look = state;
  const conv = (u: number): string => `<td>${n(u, 1)}</td><td>${n(u * k.mm, 3)}</td><td>${n(u * k.px, 1)}</td><td>${n(u * k.pt, 2)}</td>`;
  $("#measures").innerHTML = measures(d, look).map((m) =>
    `<tr><th scope="row">${esc(m.zh)}<small>${esc(m.en)}</small></th>${conv(m.u)}<td class="sim-note">${esc(m.note)}<small>${esc(m.source)}</small></td></tr>`).join("");
  const ra = ratio(d.BOUNDS), ink = inkExtent(d, look), ir = ratio(ink);
  $("#ratio").innerHTML = [
    ["外框 Ink box", `${ra.w} × ${ra.h} u`],
    ["比例 Ratio", `${ra.reduced[0]} : ${ra.reduced[1]} = 1 : ${n(ra.hOverW, 4)}（宽是高的 ${n(ra.wOverH * 100, 2)}%）`],
    ["当前墨迹 Ink drawn", `${n(ir.w, 1)} × ${n(ir.h, 1)} u（${Math.abs(ir.w - ra.w) < 1 && Math.abs(ir.h - ra.h) < 1 ? "与外框相差不到 1 u" : "随样式与点径变化；外框与留白不变"}）`],
    ["1 u", `${n(k.mm, 4)} mm · ${n(k.px, 3)} px · ${n(k.pt, 3)} pt`],
    ["结构 Structure", `${d.points.length} 个点位，${d.circles.length} 个圆，${rows(d).length} 行`],
  ].map(([a, b]) => `<div><dt>${esc(a ?? "")}</dt><dd>${esc(b ?? "")}</dd></div>`).join("");
  $("#rows").innerHTML = rows(d).map((r) => `<tr><th scope="row">${r.label}</th><td>${n(r.y, 1)}</td><td>${r.pitch === null ? "—" : n(r.pitch, 1)}</td><td>${r.marks}</td><td>${r.circles}</td><td>${n(r.y * k.mm, 2)}</td></tr>`).join("");
  $("#cols").innerHTML = columns(d).map((c) => `<tr><th scope="row">${c.rows.split("").join(" ")}</th><td>${c.xs.map((x, i) => (c.halves[i] ? `${n(x, 1)} ± ${n(c.halves[i] ?? 0, 1)}` : n(x, 1))).join("　")}</td><td>${c.pitches.map((p) => n(p, 1)).join("　")}</td></tr>`).join("");
  $("#circles").innerHTML = d.circles.map((c) => `<tr><th scope="row">${c.id}</th><td>${n(c.cx, 1)}</td><td>${n(c.cy, 1)}</td><td>${n((c.cx - d.BOUNDS.left) * k.mm, 2)}</td><td>${n((c.cy - d.BOUNDS.top) * k.mm, 2)}</td></tr>`).join("");
  const LEVEL = { same: ["sim-ok", "一致"], near: ["sim-near", "相差不到 0.5 u：原稿按量测保留，校正几何取整"], differs: ["sim-bad", "不一致"] } as const;
  $("#agree").innerHTML = agreement(d).map((a) => `<tr><td><code>${a.token}</code></td><td>${a.value}</td><td>${a.bundle.map((x) => n(x, 2)).join(" / ")}</td><td><code>${esc(a.what)}</code></td><td class="${LEVEL[a.level][0]}">${LEVEL[a.level][1]}</td></tr>`).join("");
  $("#unit-h").textContent = `${state.scale.height} ${state.scale.unit}`;
}

function draw(): void {
  ($("#f-ring") as HTMLElement).hidden = state.style !== "ring";
  ($("#f-custom") as HTMLElement).hidden = state.colorway !== "custom";
  $("#o-size").textContent = `${n(state.size)} ×`;
  $("#o-ring").textContent = String(state.ring);
  drawStage();
  drawDetail();
  drawSpec();
}

// ---------- copy and save ----------
function say(text: string): void {
  const s = $("#status");
  s.textContent = text;
  window.setTimeout(() => { if (s.textContent === text) s.textContent = ""; }, 4000);
}
async function copy(text: string, what: string): Promise<void> {
  try { await navigator.clipboard.writeText(text); say(`已复制${what}`); }
  catch {
    const ta = $("#fallback") as HTMLTextAreaElement;
    ta.hidden = false; ta.value = text; ta.select();
    say("浏览器不允许直接复制：内容已选中，按 Ctrl/⌘ + C 复制");
  }
}
function fileName(ext: string): string {
  const cw = state.colorway === "custom" ? `custom-${state.ink.slice(1)}-${state.transparent ? "none" : state.ground.slice(1)}` : state.colorway + (state.transparent ? "-transparent" : "");
  return `xiding-${state.lockup}-${state.style}-${cw}-${state.geometry}.${ext}`;
}
async function save(): Promise<void> {
  const svg = markSVG(true), name = fileName("svg");
  try {
    const claude = window.claude;
    if (claude && typeof claude.use === "function") {
      const dl = await claude.use("downloads");
      if (!dl) { say("此处不能保存文件：请用「复制 SVG」"); return; }
      await dl.save({ filename: name, data: new Blob([svg], { type: "image/svg+xml" }) });
      say(`已保存 ${name}`);
      return;
    }
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const a = document.createElement("a");
    a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    say(`已保存 ${name}`);
  } catch (e) {
    say(e && typeof e === "object" && "code" in e && String((e as { code: unknown }).code) === "declined" ? "已取消保存" : "保存没有成功：请用「复制 SVG」");
  }
}
function specJSON(): string {
  const d = markData(state.geometry), look: Look = state, k = perUnit(d, state.scale);
  return JSON.stringify({
    source: data.source, geometry: state.geometry, look, scale: { ...state.scale, perUnit: k },
    bounds: d.BOUNDS, clear: d.PAD, ratio: ratio(d.BOUNDS), rows: rows(d), columns: columns(d), pairs: pairs(d, look),
    measures: measures(d, look), circles: d.circles, points: d.points,
  }, null, 2);
}

// ---------- wiring ----------
function readNumber(el: HTMLInputElement, fallback: number, min: number): number {
  const v = Number(el.value);
  return Number.isFinite(v) && v >= min ? v : fallback;
}
function wire(): void {
  const form = $("#controls") as HTMLFormElement;
  form.addEventListener("submit", (e) => e.preventDefault());
  form.addEventListener("input", (e) => {
    const t = e.target as HTMLInputElement | HTMLSelectElement;
    switch (t.name) {
      case "style": state.style = t.value as Style; break;
      case "size": state.size = readNumber(t as HTMLInputElement, 1, 0.3); break;
      case "ring": state.ring = readNumber(t as HTMLInputElement, 6, 1); break;
      case "colorway": state.colorway = t.value as Colorway | "custom"; break;
      case "ink": state.ink = t.value; break;
      case "ground": state.ground = t.value; break;
      case "transparent": state.transparent = (t as HTMLInputElement).checked; break;
      case "lockup": state.lockup = t.value as Lockup; break;
      case "geometry": state.geometry = t.value as Geometry; break;
      case "show": state.show[t.value as keyof State["show"]] = (t as HTMLInputElement).checked; break;
      case "height": state.scale.height = readNumber(t as HTMLInputElement, state.scale.height, 0.001); break;
      case "unit": state.scale.unit = t.value as Unit; break;
      case "dpi": state.scale.dpi = readNumber(t as HTMLInputElement, state.scale.dpi, 1); break;
      default: return;
    }
    draw();
  });
  $("#b-copy").addEventListener("click", () => void copy(markSVG(true), " SVG"));
  $("#b-save").addEventListener("click", () => void save());
  $("#b-json").addEventListener("click", () => void copy(specJSON(), "规格 JSON"));
  $("#b-reset").addEventListener("click", () => {
    Object.assign(state, { style: "dot", size: 1, ring: data.tokens["mark-ring"] ?? 6, geometry: "extracted", lockup: "mark", colorway: "teal", transparent: false });
    form.innerHTML = controls();
    draw();
  });
  const theme = $("#theme");
  theme.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-theme]");
    if (!b) return;
    const v = b.dataset["theme"] ?? "";
    if (v) document.documentElement.dataset["theme"] = v; else delete document.documentElement.dataset["theme"];
    theme.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  });
}

function start(): void {
  ($("#controls") as HTMLFormElement).innerHTML = controls();
  const src = data.source;
  const at = src.commit ? `https://github.com/${src.repo}/blob/${src.commit}/` : "";
  $("#source").innerHTML = src.commit
    ? `数据读自 <a href="${at}design-system/components/src/xiding.ts" target="_blank" rel="noopener"><code>xiding.ts</code></a> 与 <a href="${at}design-system/tokens.json" target="_blank" rel="noopener"><code>tokens.json</code></a>，${esc(src.repo)} @ <code>${esc(src.commit.slice(0, 7))}</code>（${esc(src.date)}${src.dirty ? "，含未提交改动" : ""}）。`
    : "数据读自 design-system/components/src/xiding.ts 与 design-system/tokens.json。";
  wire();
  draw();
}
start();
