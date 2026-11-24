// Direct editing on the large card sheets, after Canva's editor: click to select, Shift-click or drag a box to
// select several, move, resize and rotate them with smart guides, group, align, distribute, lock, copy and
// paste, retype text in place, and pull dotted reference lines out that everything snaps to.
// A drag touches only the moving elements' transforms and the overlay; the card is redrawn when it ends.

interface CardSelection { svg: SVGSVGElement; key: string; ids: string[] }
let sel: CardSelection | null = null;
/** One step of the edit history: the state before it, and what it did. */
interface Step { snap: string; label: string; at: number }
const undoStack: Step[] = [], redoStack: Step[] = [];
const DRAG_LABELS: Record<string, string> = { move: "移动 Move", scale: "缩放 Resize", rotate: "旋转 Rotate", ref: "移动参考线 Move guide", marquee: "框选 Select" };

/** Everything an edit can change: settings, moves, groups, locks, retyped text, copies, reference lines, people. */
function editSnapshot(): string {
  return JSON.stringify({ S, ov: state.ov, groups: state.groups, locks: state.locks, texts: state.texts, extras: state.extras, refLines: state.refLines, data: state.data });
}
function restoreEdit(json: string): void {
  const v = JSON.parse(json) as Partial<Pick<CardState, "ov" | "groups" | "locks" | "texts" | "extras" | "refLines" | "data">> & { S: Settings };
  Object.assign(S, v.S);
  state.ov = v.ov ?? {};
  state.groups = v.groups ?? {};
  state.locks = v.locks ?? {};
  state.texts = v.texts ?? {};
  state.extras = v.extras ?? {};
  state.refLines = v.refLines ?? {};
  if (v.data) state.data = v.data;
  if (sel) {
    const s = sel;
    s.ids = s.ids.filter((id) => !isLocked(s.key, id) && (!id.includes("~") || (state.extras[s.key] ?? []).some((x) => x.id === id)));
    if (!s.ids.length) sel = null;
  }
}
function pushUndo(before: string, label = "编辑 Edit"): void {
  if (before === editSnapshot()) return;
  undoStack.push({ snap: before, label, at: Date.now() });
  if (undoStack.length > 200) undoStack.shift();
  redoStack.length = 0;
  changeLog.push({ label, at: new Date().toISOString() });
  updateUndoButtons();
}
function undo(): void {
  const prev = undoStack.pop();
  if (prev === undefined) return;
  redoStack.push({ snap: editSnapshot(), label: prev.label, at: prev.at });
  changeLog.pop();
  restoreEdit(prev.snap);
  fillForm();
  onEditChanged(true);
}
function redo(): void {
  const next = redoStack.pop();
  if (next === undefined) return;
  undoStack.push({ snap: editSnapshot(), label: next.label, at: next.at });
  changeLog.push({ label: next.label, at: new Date().toISOString() });
  restoreEdit(next.snap);
  fillForm();
  onEditChanged(true);
}
/** Record one edit for undo, then redraw. */
function commit(before: string, full = false, label = "编辑 Edit"): void { pushUndo(before, label); onEditChanged(full); }
/** Step back or forward through the history to the state after `n` steps. */
function jumpTo(n: number): void {
  while (undoStack.length > n && undoStack.length) undo();
  while (undoStack.length < n && redoStack.length) redo();
}
/** The history panel: every step since the page opened, the current one marked; click one to go back to it. */
function renderUndoHistory(): void {
  const host = document.getElementById("undo-list");
  if (!host) return;
  const t = (ms: number): string => { const d = new Date(ms); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`; };
  const done = undoStack.map((s, i) => ({ n: i + 1, label: s.label, at: s.at, future: false }));
  const ahead = [...redoStack].reverse().map((s, i) => ({ n: undoStack.length + i + 1, label: s.label, at: s.at, future: true }));
  const rows = [{ n: 0, label: "打开页面 Opened", at: 0, future: false }, ...done, ...ahead];
  host.innerHTML = rows.map((r) => `<li class="hstep${r.n === undoStack.length ? " is-now" : ""}${r.future ? " is-future" : ""}">` +
    `<button type="button" data-step="${r.n}"><span>${esc(r.label)}</span><small>${r.at ? t(r.at) : ""}</small></button></li>`).join("");
  const now = host.querySelector<HTMLElement>(".is-now");
  if (now && typeof now.scrollIntoView === "function") host.scrollTop = Math.max(0, now.offsetTop - host.clientHeight / 2);
}

function svgPoint(svg: SVGSVGElement, e: { clientX: number; clientY: number }): DOMPoint {
  const m = svg.getScreenCTM();
  const p = new DOMPoint(e.clientX, e.clientY);
  return m ? p.matrixTransform(m.inverse()) : p;
}
/** Screen pixels per millimetre on this sheet. */
function pxPerMm(svg: SVGSVGElement): number {
  const vb = svg.viewBox.baseVal;
  return vb && vb.width ? svg.getBoundingClientRect().width / vb.width : 4;
}
function groupOf(svg: SVGSVGElement, id: string): SVGGElement | null {
  return svg.querySelector<SVGGElement>(`g[data-el="${CSS.escape(id)}"]`);
}
function setOverride(key: string, id: string, o: Override): void {
  if (!moved(o) && !o.hidden) delete state.ov[ovKey(key, id)];
  else state.ov[ovKey(key, id)] = o;
}
const isExtra = (key: string, id: string): boolean => (state.extras[key] ?? []).some((x) => x.id === id);

// ---- groups and locks ----
function isLocked(key: string, id: string): boolean { return !!state.locks[ovKey(key, id)]; }
function groupsOf(key: string): string[][] { return state.groups[key] ?? []; }
/** The group an element belongs to, or the element alone. */
function unitOf(key: string, id: string): string[] {
  return groupsOf(key).find((g) => g.includes(id)) ?? [id];
}
/** A selection split into what moves as one: each group, and each loose element. */
function unitsOf(key: string, ids: string[]): string[][] {
  const seen = new Set<string>(), units: string[][] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    const u = unitOf(key, id).filter((x) => ids.includes(x));
    u.forEach((x) => seen.add(x));
    units.push(u);
  }
  return units;
}
/** Elements the editor may select: the layout's own grounds, hidden and locked ones are not. */
function selectable(g: SVGGElement, key: string): boolean {
  return !g.dataset.locked && g.style.display !== "none" && !isLocked(key, g.dataset.el ?? "");
}
function boxOfIds(svg: SVGSVGElement, key: string, ids: string[]): DOMRect | null {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const id of ids) {
    const g = groupOf(svg, id);
    if (!g || g.style.display === "none") continue;
    const b = currentBox(g, key);
    x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.width); y1 = Math.max(y1, b.y + b.height);
  }
  return x0 === Infinity ? null : new DOMRect(x0, y0, x1 - x0, y1 - y0);
}

// ---- snapping: reference lines pull harder than everything else ----
function refsOf(key: string): RefLines { return state.refLines[key] ?? { xs: [], ys: [] }; }
/** The lines every unselected visible element offers, plus the layout's own. */
function targetsFor(svg: SVGSVGElement, key: string, skip: string[]): { xs: number[]; ys: number[] } {
  const t = layoutLines(key), xs = [...t.xs], ys = [...t.ys];
  svg.querySelectorAll<SVGGElement>("g[data-el]").forEach((g) => {
    if (skip.includes(g.dataset.el ?? "") || g.dataset.locked || g.style.display === "none") return;
    const b = currentBox(g, key);
    xs.push(b.x, b.x + b.width / 2, b.x + b.width);
    ys.push(b.y, b.y + b.height / 2, b.y + b.height);
  });
  return { xs, ys };
}
function snapBox(box: [number, number, number, number], key: string, targets: { xs: number[]; ys: number[] }, th: number): SnapAnswer {
  const refs = refsOf(key), r = snapNow(box, refs.xs, refs.ys, th * 1.8), t = snapNow(box, targets.xs, targets.ys, th);
  return { dx: r.gx !== null ? r.dx : t.dx, dy: r.gy !== null ? r.dy : t.dy, gx: r.gx ?? t.gx, gy: r.gy ?? t.gy };
}

// ---- overlay: reference lines, the selection with its handles, the marquee and the smart guides ----
const OV_SEL = "#2F8FD8", OV_GUIDE = "#E0457B", OV_REF = "#16A3B8";
interface Guides { gx: number | null; gy: number | null }
function overlayOf(svg: SVGSVGElement): SVGGElement {
  let ov = svg.querySelector<SVGGElement>("g[data-overlay]");
  if (!ov) {
    ov = document.createElementNS("http://www.w3.org/2000/svg", "g");
    ov.setAttribute("data-overlay", "1");
    svg.appendChild(ov);
  }
  return ov;
}
function drawOverlay(svg: SVGSVGElement, guides: Guides = { gx: null, gy: null }, marquee: DOMRect | null = null, label: { x: number; y: number; t: string } | null = null): void {
  const key = svg.dataset.key ?? "", ov = overlayOf(svg), u = 1 / pxPerMm(svg), hs = 9 * u, dash = `${f2(4 * u)} ${f2(3 * u)}`;
  const { w: W, h: H } = sheetDims(key); // the portrait card is 54 × 96 by default
  let o = "";
  // reference lines: dotted, with a wide invisible grip
  const refs = refsOf(key), ext = BLEED + 1.5;
  refs.xs.forEach((x, i) => {
    o += `<line x1="${f2(x)}" y1="${-ext}" x2="${f2(x)}" y2="${H + ext}" stroke="${OV_REF}" stroke-width="${f2(1.6 * u)}" stroke-linecap="round" stroke-dasharray="0 ${f2(4 * u)}" pointer-events="none"/>` +
      `<line data-ref="x:${i}" x1="${f2(x)}" y1="${-ext}" x2="${f2(x)}" y2="${H + ext}" stroke="transparent" stroke-width="${f2(10 * u)}" style="cursor:col-resize"/>`;
  });
  refs.ys.forEach((y, i) => {
    o += `<line x1="${-ext}" y1="${f2(y)}" x2="${W + ext}" y2="${f2(y)}" stroke="${OV_REF}" stroke-width="${f2(1.6 * u)}" stroke-linecap="round" stroke-dasharray="0 ${f2(4 * u)}" pointer-events="none"/>` +
      `<line data-ref="y:${i}" x1="${-ext}" y1="${f2(y)}" x2="${W + ext}" y2="${f2(y)}" stroke="transparent" stroke-width="${f2(10 * u)}" style="cursor:row-resize"/>`;
  });
  if (guides.gx !== null) o += `<line x1="${f2(guides.gx)}" y1="${-BLEED - 2}" x2="${f2(guides.gx)}" y2="${H + BLEED + 2}" stroke="${OV_GUIDE}" stroke-width="${f2(1.2 * u)}" stroke-dasharray="${dash}" pointer-events="none"/>`;
  if (guides.gy !== null) o += `<line x1="${-BLEED - 2}" y1="${f2(guides.gy)}" x2="${W + BLEED + 2}" y2="${f2(guides.gy)}" stroke="${OV_GUIDE}" stroke-width="${f2(1.2 * u)}" stroke-dasharray="${dash}" pointer-events="none"/>`;
  if (sel && sel.svg === svg && sel.ids.length) {
    const all = boxOfIds(svg, key, sel.ids);
    // each element's own (turned) outline, each group dashed
    for (const id of sel.ids) {
      const g = groupOf(svg, id);
      if (!g || g.style.display === "none") continue;
      const pts = outlineOf(g, key).map(([x, y]) => `${f2(x)},${f2(y)}`).join(" ");
      o += `<polygon points="${pts}" fill="none" stroke="${OV_SEL}" stroke-width="${f2((sel.ids.length > 1 ? 0.8 : 1.5) * u)}" pointer-events="none"/>`;
    }
    if (sel.ids.length > 1) for (const unit of unitsOf(key, sel.ids)) if (unit.length > 1) {
      const b = boxOfIds(svg, key, unit);
      if (b) o += `<rect x="${f2(b.x)}" y="${f2(b.y)}" width="${f2(b.width)}" height="${f2(b.height)}" fill="none" stroke="${OV_SEL}" stroke-width="${f2(u)}" stroke-dasharray="${dash}" pointer-events="none"/>`;
    }
    if (all) {
      if (sel.ids.length > 1) o += `<rect x="${f2(all.x)}" y="${f2(all.y)}" width="${f2(all.width)}" height="${f2(all.height)}" fill="none" stroke="${OV_SEL}" stroke-width="${f2(1.5 * u)}" pointer-events="none"/>`;
      for (const [hx, hy] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) {
        const x = all.x + hx * all.width - hs / 2, y = all.y + hy * all.height - hs / 2;
        o += `<rect data-handle="${hx}${hy}" x="${f2(x)}" y="${f2(y)}" width="${f2(hs)}" height="${f2(hs)}" rx="${f2(2 * u)}" fill="#FFFFFF" stroke="${OV_SEL}" stroke-width="${f2(1.5 * u)}" style="cursor:${hx === hy ? "nwse" : "nesw"}-resize"/>`;
      }
      // the rotation handle, on a stem above the top edge
      const cx = all.x + all.width / 2, top = all.y, stem = 18 * u;
      o += `<line x1="${f2(cx)}" y1="${f2(top)}" x2="${f2(cx)}" y2="${f2(top - stem)}" stroke="${OV_SEL}" stroke-width="${f2(1.2 * u)}" pointer-events="none"/>` +
        `<circle data-handle="rot" cx="${f2(cx)}" cy="${f2(top - stem)}" r="${f2(6 * u)}" fill="#FFFFFF" stroke="${OV_SEL}" stroke-width="${f2(1.5 * u)}" style="cursor:grab"/>` +
        `<path d="M${f2(cx - 2.6 * u)} ${f2(top - stem - 1.2 * u)}a${f2(2.8 * u)} ${f2(2.8 * u)} 0 1 1 ${f2(1 * u)} ${f2(3.2 * u)}" fill="none" stroke="${OV_SEL}" stroke-width="${f2(1.1 * u)}" pointer-events="none"/>`;
    }
  }
  if (marquee) o += `<rect x="${f2(marquee.x)}" y="${f2(marquee.y)}" width="${f2(marquee.width)}" height="${f2(marquee.height)}" fill="${OV_SEL}" fill-opacity=".08" stroke="${OV_SEL}" stroke-width="${f2(u)}" stroke-dasharray="${dash}" pointer-events="none"/>`;
  if (label) {
    const w = (label.t.length * 6.4 + 10) * u, h = 15 * u;
    o += `<g pointer-events="none"><rect x="${f2(label.x)}" y="${f2(label.y - h)}" width="${f2(w)}" height="${f2(h)}" rx="${f2(3 * u)}" fill="#1D2B2A" fill-opacity=".85"/>` +
      `<text x="${f2(label.x + 5 * u)}" y="${f2(label.y - 4.2 * u)}" font-family="${esc(SANS)}" font-size="${f2(10.5 * u)}" fill="#FFFFFF">${esc(label.t)}</text></g>`;
  }
  ov.innerHTML = o;
}
function redrawOverlays(): void {
  document.querySelectorAll<SVGSVGElement>("svg[data-key][data-edit]").forEach((s) => drawOverlay(s));
}

/** The selected element under the point, if any: a click inside the selection keeps it, as in Canva. */
/** An element can carry data-hit="x y w h": it is only hit inside that box (a picture shows only inside its frame). */
function inHitArea(g: SVGGElement, pt: DOMPoint): boolean {
  const h = g.dataset.hit;
  if (!h) return true;
  const [x, y, w, hh] = h.split(" ").map(Number) as [number, number, number, number];
  return pt.x >= x && pt.x <= x + w && pt.y >= y && pt.y <= y + hh;
}
function hitSelected(svg: SVGSVGElement, key: string, pt: DOMPoint): SVGGElement | null {
  if (!sel || sel.svg !== svg) return null;
  for (const id of [...sel.ids].reverse()) {
    const g = groupOf(svg, id);
    if (!g || !selectable(g, key) || !inHitArea(g, pt)) continue;
    const b = currentBox(g, key);
    if (pt.x >= b.x && pt.x <= b.x + b.width && pt.y >= b.y && pt.y <= b.y + b.height) return g;
  }
  return null;
}
/** The topmost selectable element whose box holds the point. */
function hitTest(svg: SVGSVGElement, key: string, pt: DOMPoint): SVGGElement | null {
  for (const g of [...svg.querySelectorAll<SVGGElement>("g[data-el]")].reverse()) {
    if (!selectable(g, key) || !inHitArea(g, pt)) continue;
    const b = currentBox(g, key);
    if (pt.x >= b.x && pt.x <= b.x + b.width && pt.y >= b.y && pt.y <= b.y + b.height) return g;
  }
  return null;
}
function setSelection(svg: SVGSVGElement, key: string, ids: string[]): void {
  sel = ids.length ? { svg, key, ids: [...new Set(ids)] } : null;
  redrawOverlays();
  updateProps();
  renderLayers();
}
function deselect(): void {
  sel = null;
  redrawOverlays();
  updateProps();
  renderLayers();
}

// ---- pointer ----
interface Item { id: string; g: SVGGElement; base: DOMRect; o0: Override; box0: DOMRect }
type DragMode = "move" | "scale" | "rotate" | "marquee" | "ref";
interface DragState {
  mode: DragMode; start: DOMPoint; before: string; key: string; svg: SVGSVGElement;
  items: Item[]; box0: DOMRect; hx: 0 | 1; hy: 0 | 1; targets: { xs: number[]; ys: number[] }; additive: string[];
  ref: { axis: "x" | "y"; i: number } | null;
}
let drag: DragState | null = null;

function itemsFor(svg: SVGSVGElement, key: string, ids: string[]): Item[] {
  const out: Item[] = [];
  for (const id of ids) {
    const g = groupOf(svg, id);
    if (!g || g.style.display === "none") continue;
    out.push({ id, g, base: baseBox(g), o0: { ...overrideOf(key, id) }, box0: currentBox(g, key) });
  }
  return out;
}
function newDrag(svg: SVGSVGElement, key: string, mode: DragMode, start: DOMPoint, extra: Partial<DragState> = {}): DragState {
  return { mode, start, before: editSnapshot(), key, svg, items: [], box0: new DOMRect(start.x, start.y, 0, 0), hx: 1, hy: 1, targets: { xs: [], ys: [] }, additive: [], ref: null, ...extra };
}
function attachEditor(svg: SVGSVGElement): void {
  const key = svg.dataset.key ?? "";
  svg.dataset.edit = "1";
  svg.style.touchAction = "none";
  svg.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    // the card takes the keyboard back from any panel field, so shortcuts act on the card
    const focused = document.activeElement as HTMLElement | null;
    if (focused && focused !== document.body && focused.blur && !focused.classList.contains("text-edit")) focused.blur();
    const target = e.target as Element, pt = svgPoint(svg, e);
    const ref = target.closest<SVGElement>("[data-ref]");
    if (ref) {
      const [axis, i] = (ref.dataset.ref ?? "x:0").split(":");
      e.preventDefault(); svg.setPointerCapture(e.pointerId);
      drag = newDrag(svg, key, "ref", pt, { ref: { axis: axis === "y" ? "y" : "x", i: Number(i) || 0 }, targets: targetsFor(svg, key, []) });
      return;
    }
    const handle = target.closest<SVGElement>("[data-handle]");
    if (handle && sel && sel.svg === svg) {
      const h = handle.dataset.handle ?? "11";
      if (h === "rot") startDrag(svg, key, "rotate", e, 1, 1);
      else startDrag(svg, key, "scale", e, h[0] === "1" ? 1 : 0, h[1] === "1" ? 1 : 0);
      return;
    }
    // Ctrl/⌘-click picks the one element under the pointer, even inside a group (as in Figma)
    const deep = e.ctrlKey || e.metaKey;
    let g = e.shiftKey || deep ? null : hitSelected(svg, key, pt);
    g ??= target.closest<SVGGElement>("g[data-el]");
    // Like Canva, a click anywhere inside an element's box selects it, even between the dots of the mark.
    if (!g || !selectable(g, key)) g = hitTest(svg, key, pt);
    if (!g) {
      // empty card: start a selection box; Shift keeps what is selected
      const keep = e.shiftKey && sel && sel.svg === svg ? sel.ids : [];
      if (!e.shiftKey) deselect();
      e.preventDefault(); svg.setPointerCapture(e.pointerId);
      drag = newDrag(svg, key, "marquee", pt, { additive: keep });
      return;
    }
    const unit = (deep ? [g.dataset.el ?? ""] : unitOf(key, g.dataset.el ?? "")).filter((id) => { const x = groupOf(svg, id); return x ? selectable(x, key) : false; });
    const current = sel && sel.svg === svg ? sel.ids : [];
    if (deep) { setSelection(svg, key, unit); startDrag(svg, key, "move", e, 1, 1); return; }
    if (e.shiftKey) {
      // Shift-click adds the element (or its group) to the selection, or takes it out
      const has = unit.every((id) => current.includes(id));
      setSelection(svg, key, has ? current.filter((id) => !unit.includes(id)) : [...current, ...unit]);
      return;
    }
    if (!unit.every((id) => current.includes(id))) setSelection(svg, key, unit);
    startDrag(svg, key, "move", e, 1, 1);
  });
  svg.addEventListener("pointermove", (e) => { if (drag && drag.svg === svg) moveDrag(e); });
  const end = (): void => { if (drag && drag.svg === svg) endDrag(); };
  svg.addEventListener("pointerup", end);
  svg.addEventListener("pointercancel", end);
  svg.addEventListener("dblclick", (e) => onDoubleClick(svg, key, e));
  if (sel && sel.key === key) sel.svg = svg;
  drawOverlay(svg);
}
function startDrag(svg: SVGSVGElement, key: string, mode: "move" | "scale" | "rotate", e: PointerEvent, hx: 0 | 1, hy: 0 | 1): void {
  if (!sel) return;
  const items = itemsFor(svg, key, sel.ids), box0 = boxOfIds(svg, key, sel.ids);
  if (!items.length || !box0) return;
  e.preventDefault();
  svg.setPointerCapture(e.pointerId);
  drag = newDrag(svg, key, mode, svgPoint(svg, e), { items, box0, hx, hy, targets: targetsFor(svg, key, sel.ids) });
}
function place(d: DragState, it: Item, o: Override): void {
  setOverride(d.key, it.id, o);
  if (moved(o)) it.g.setAttribute("transform", transformFor(it.base, o));
  else it.g.removeAttribute("transform");
}
/** Put an element's centre at (cx, cy) with scale s and rotation r. */
function centred(it: Item, cx: number, cy: number, s: number, r: number): Override {
  return { ...it.o0, s, r: r ? ((r % 360) + 360) % 360 : 0, dx: cx - it.base.x - (it.base.width * s) / 2, dy: cy - it.base.y - (it.base.height * s) / 2 };
}
function moveDrag(e: PointerEvent): void {
  if (!drag) return;
  const t0 = performance.now(), d = drag, svg = d.svg, p = svgPoint(svg, e), B = d.box0;
  const th = 6 / pxPerMm(svg), free = e.altKey;
  let guides: Guides = { gx: null, gy: null }, label: { x: number; y: number; t: string } | null = null;
  if (d.mode === "marquee") {
    d.box0 = new DOMRect(Math.min(d.start.x, p.x), Math.min(d.start.y, p.y), Math.abs(p.x - d.start.x), Math.abs(p.y - d.start.y));
    drawOverlay(svg, guides, d.box0);
    return;
  }
  if (d.mode === "ref" && d.ref) {
    // a reference line follows the pointer, snapping to the layout and to elements
    const refs = { xs: [...refsOf(d.key).xs], ys: [...refsOf(d.key).ys] };
    let v = d.ref.axis === "x" ? p.x : p.y;
    if (!free) {
      const r = d.ref.axis === "x" ? snapNow([v, 0, v, 0], d.targets.xs, [], th) : snapNow([0, v, 0, v], [], d.targets.ys, th);
      v += d.ref.axis === "x" ? r.dx : r.dy;
    }
    (d.ref.axis === "x" ? refs.xs : refs.ys)[d.ref.i] = Math.round(v * 10) / 10;
    state.refLines = { ...state.refLines, [d.key]: refs };
    drawOverlay(svg, guides, null, { x: d.ref.axis === "x" ? v + 1 : 1, y: d.ref.axis === "x" ? 4 : v - 0.6, t: `${d.ref.axis === "x" ? "X" : "Y"} ${v.toFixed(1)} mm` });
    return;
  }
  if (d.mode === "move") {
    let mx = p.x - d.start.x, my = p.y - d.start.y;
    if (!free) {
      const r = snapBox([B.x + mx, B.y + my, B.x + B.width + mx, B.y + B.height + my], d.key, d.targets, th);
      mx += r.dx; my += r.dy; guides = { gx: r.gx, gy: r.gy };
    }
    // the portrait card, once its structure is locked, keeps each element inside its own area
    if (d.key === PORTRAIT_KEY) [mx, my] = portraitClampMove(d.items, mx, my);
    for (const it of d.items) place(d, it, { ...it.o0, dx: it.o0.dx + mx, dy: it.o0.dy + my });
    label = { x: B.x + mx, y: B.y + my - 1, t: `${(B.x + mx).toFixed(1)}, ${(B.y + my).toFixed(1)} mm` };
  } else if (d.mode === "scale") {
    // scale the whole selection about the opposite corner, keeping its proportions
    const fx = d.hx ? B.x : B.x + B.width, fy = d.hy ? B.y : B.y + B.height;
    let px = p.x, py = p.y;
    if (!free) {
      const r = snapBox([px, py, px, py], d.key, d.targets, th);
      px += r.dx; py += r.dy; guides = { gx: r.gx, gy: r.gy };
    }
    const k = Math.max(0.15, Math.max(Math.abs(px - fx) / (B.width || 1), Math.abs(py - fy) / (B.height || 1)));
    const ox = d.hx ? fx : fx - B.width * k, oy = d.hy ? fy : fy - B.height * k;
    for (const it of d.items) {
      const cx = ox + (it.box0.x + it.box0.width / 2 - B.x) * k, cy = oy + (it.box0.y + it.box0.height / 2 - B.y) * k;
      place(d, it, centred(it, cx, cy, Math.max(0.05, it.o0.s * k), it.o0.r ?? 0));
    }
    label = { x: ox, y: oy - 1, t: `${(B.width * k).toFixed(1)} × ${(B.height * k).toFixed(1)} mm` };
  } else {
    // rotate the selection about its centre; Shift steps by 15°, and it settles on 0, 90, 180, 270 when close
    const cx = B.x + B.width / 2, cy = B.y + B.height / 2;
    let delta = ((Math.atan2(p.y - cy, p.x - cx) - Math.atan2(d.start.y - cy, d.start.x - cx)) * 180) / Math.PI;
    const r0 = d.items.length === 1 ? d.items[0]!.o0.r ?? 0 : 0;
    let total = r0 + delta;
    if (e.shiftKey) total = Math.round(total / 15) * 15;
    else if (!free) { const near = Math.round(total / 90) * 90; if (Math.abs(total - near) < 3) total = near; }
    delta = total - r0;
    const a = (delta * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
    for (const it of d.items) {
      const ix = it.box0.x + it.box0.width / 2 - cx, iy = it.box0.y + it.box0.height / 2 - cy;
      place(d, it, centred(it, cx + ix * c - iy * s, cy + ix * s + iy * c, it.o0.s, (it.o0.r ?? 0) + delta));
    }
    const shown = ((Math.round(total) % 360) + 360) % 360;
    label = { x: cx + 2, y: B.y - 2, t: `${shown}°` };
  }
  drawOverlay(svg, guides, null, label);
  updateProps();
  recordDragTime(performance.now() - t0);
}
function endDrag(): void {
  if (!drag) return;
  const d = drag;
  drag = null;
  if (d.mode === "marquee") {
    const r = d.box0, hits: string[] = [];
    if (r.width > 0.3 || r.height > 0.3) {
      d.svg.querySelectorAll<SVGGElement>("g[data-el]").forEach((g) => {
        if (!selectable(g, d.key)) return;
        const b = currentBox(g, d.key);
        if (b.x < r.x + r.width && b.x + b.width > r.x && b.y < r.y + r.height && b.y + b.height > r.y) hits.push(...unitOf(d.key, g.dataset.el ?? ""));
      });
    }
    setSelection(d.svg, d.key, [...d.additive, ...hits]);
    return;
  }
  if (d.mode === "ref" && d.ref) {
    // a line dragged off the card is removed
    const refs = refsOf(d.key), v = (d.ref.axis === "x" ? refs.xs : refs.ys)[d.ref.i] ?? 0, lim = d.ref.axis === "x" ? sheetDims(d.key).w : sheetDims(d.key).h;
    if (v < -BLEED || v > lim + BLEED) {
      const next = { xs: [...refs.xs], ys: [...refs.ys] };
      (d.ref.axis === "x" ? next.xs : next.ys).splice(d.ref.i, 1);
      state.refLines = { ...state.refLines, [d.key]: next };
    }
  }
  if (d.key === PORTRAIT_KEY && S.ptLock && (d.mode === "scale" || d.mode === "rotate")) portraitFit(d.svg, d.items.map((it) => it.id));
  if (d.before !== editSnapshot()) commit(d.before, false, DRAG_LABELS[d.mode]);
  else drawOverlay(d.svg);
}

// ---- double-click: retype text in place, or remove a reference line ----
function onDoubleClick(svg: SVGSVGElement, key: string, e: MouseEvent): void {
  const target = e.target as Element, ref = target.closest<SVGElement>("[data-ref]");
  if (ref) {
    const [axis, i] = (ref.dataset.ref ?? "x:0").split(":"), before = editSnapshot(), refs = refsOf(key), next = { xs: [...refs.xs], ys: [...refs.ys] };
    (axis === "y" ? next.ys : next.xs).splice(Number(i) || 0, 1);
    state.refLines = { ...state.refLines, [key]: next };
    commit(before, false, "删除参考线 Remove guide");
    return;
  }
  const pt = svgPoint(svg, e);
  let g = hitSelected(svg, key, pt) ?? target.closest<SVGGElement>("g[data-el]");
  if (!g || !selectable(g, key)) g = hitTest(svg, key, pt);
  if (!g) return;
  // the line of type nearest the pointer
  const texts = [...g.querySelectorAll<SVGTextElement>("text")];
  if (!texts.length) return;
  let best = 0, bestD = Infinity;
  texts.forEach((t, i) => {
    const r = t.getBoundingClientRect(), dx = Math.max(r.left - e.clientX, 0, e.clientX - r.right), dy = Math.max(r.top - e.clientY, 0, e.clientY - r.bottom);
    const dd = dx * dx + dy * dy;
    if (dd < bestD) { bestD = dd; best = i; }
  });
  startTextEdit(svg, key, g.dataset.el ?? "", best);
}
let textEditor: HTMLInputElement | null = null;
/** Whether a fill colour is light (type on a dark ground); anything not a hex colour counts as light. */
function isLight(fill: string | null): boolean {
  const m = (fill ?? "").trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return true;
  const h = m[1]!.length === 3 ? [...m[1]!].map((c) => c + c).join("") : m[1]!;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.299 * r! + 0.587 * g! + 0.114 * b! > 150;
}
/** Open an input over one line of type; Enter or leaving keeps the change, Esc drops it. */
function startTextEdit(svg: SVGSVGElement, key: string, id: string, index: number): void {
  const g = groupOf(svg, id), t = g?.querySelectorAll<SVGTextElement>("text")[index], host = svg.parentElement;
  if (!g || !t || !host) return;
  textEditor?.remove();
  setSelection(svg, key, [id]);
  // the input is placed against the card's own box, so that box must be its containing block
  if (getComputedStyle(host).position === "static") host.style.position = "relative";
  const r = t.getBoundingClientRect(), hr = host.getBoundingClientRect(), size = Number(t.getAttribute("font-size") ?? "2") * pxPerMm(svg) * (overrideOf(key, id).s || 1);
  const inp = document.createElement("input");
  inp.className = "text-edit";
  inp.value = t.textContent ?? "";
  inp.setAttribute("aria-label", "Edit text");
  Object.assign(inp.style, {
    left: `${r.left - hr.left - 4}px`, top: `${r.top - hr.top - 4}px`, minWidth: `${Math.max(80, r.width + 24)}px`,
    font: `${t.getAttribute("font-weight") ?? "400"} ${size}px ${t.getAttribute("font-family") ?? SANS}`,
    color: t.getAttribute("fill") ?? "#F3F1E8",
    // the overlay takes a ground the type reads on: the side's own, or on the portrait dark behind light type
    background: key === PORTRAIT_KEY ? (isLight(t.getAttribute("fill")) ? (S.ptTheme === 1 ? "#000000" : "#404041") : "#FFFFFF") : key === BACK_KEY ? GB().bg : GF().bg,
  });
  host.appendChild(inp);
  textEditor = inp;
  inp.focus(); inp.select();
  const orig = t.textContent ?? "";
  let done = false;
  const finish = (keep: boolean): void => {
    if (done) return;
    done = true;
    inp.remove();
    if (textEditor === inp) textEditor = null;
    if (keep && inp.value !== orig) applyTextEdit(key, id, index, orig, inp.value);
  };
  inp.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") { ev.preventDefault(); finish(true); }
    else if (ev.key === "Escape") { ev.preventDefault(); finish(false); }
    ev.stopPropagation();
  });
  inp.addEventListener("blur", () => finish(true));
}
/**
 * Keep a retyped line. On an element drawn from the person's details, the details change too, so the form,
 * the other layouts and the saved version agree; anything else (the back's brand names, pasted copies) keeps
 * its own text.
 */
function applyTextEdit(key: string, id: string, index: number, orig: string, val: string): void {
  const before = editSnapshot(), p = state.data[state.person];
  let bound = false;
  if (p && !isExtra(key, id) && key !== BACK_KEY) {
    const fields: (keyof Person)[] = ["nameZh", "nameEn", "company", "titleEn", "titleZh", "phone", "email", "web", "address"];
    const exact = fields.find((f) => p[f].trim() === orig.trim());
    if (exact) { p[exact] = val; bound = true; }
    else if (orig.trim() === role(p)) {
      // a title line "CEO 首席执行官": the Latin part is the English title, the rest the Chinese
      const m = val.trim().match(/^([\x20-\x7E]*?)\s*([^\x20-\x7E].*)?$/);
      p.titleEn = (m?.[1] ?? val).trim(); p.titleZh = (m?.[2] ?? "").trim(); bound = true;
    } else {
      const part = fields.find((f) => orig.trim() && p[f].includes(orig.trim()));
      if (part) { p[part] = p[part].replace(orig.trim(), val.trim()); bound = true; }
    }
  }
  if (!bound) state.texts = { ...state.texts, [`${ovKey(key, id)}#${index}`]: val };
  fillForm();
  commit(before, true, `改字 Text · ${val}`);
}

// ---- keyboard ----
function typing(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
}
document.addEventListener("keydown", (e) => {
  if (typing(e)) return;
  const mod = e.metaKey || e.ctrlKey, k = e.key.toLowerCase();
  if (mod && k === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
  if (mod && k === "y") { e.preventDefault(); redo(); return; }
  if (mod && k === "a") { e.preventDefault(); selectAll(); return; }
  if (mod && k === "g") { e.preventDefault(); if (e.shiftKey) ungroupSelected(); else groupSelected(); return; }
  if (mod && k === "l") { e.preventDefault(); lockSelected(); return; }
  if (mod && k === "c") { if (sel) { e.preventDefault(); copySelected(); } return; }
  if (mod && k === "x") { if (sel) { e.preventDefault(); copySelected(); removeSelected(); } return; }
  if (mod && k === "v") { if (clipboard) { e.preventDefault(); pasteClipboard(); } return; }
  if (mod && k === "d") { if (sel) { e.preventDefault(); copySelected(); pasteClipboard(); } return; }
  if (!sel) return;
  const step = e.shiftKey ? 1 : 0.1;
  const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
  const mv = moves[e.key];
  if (mv) { e.preventDefault(); nudge(mv[0], mv[1]); }
  else if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); removeSelected(); }
  else if (e.key === "Enter" && sel.ids.length === 1) { e.preventDefault(); startTextEdit(sel.svg, sel.key, sel.ids[0] ?? "", 0); }
  else if (e.key === "Escape") deselect();
});

// ---- commands ----
/** The sheet commands act on: the selection's, or the front. */
function activeSheet(): { svg: SVGSVGElement; key: string } | null {
  if (sel) return { svg: sel.svg, key: sel.key };
  const svg = document.querySelector<SVGSVGElement>("#front svg");
  return svg ? { svg, key: svg.dataset.key ?? "" } : null;
}
function selectAll(): void {
  const a = activeSheet();
  if (!a) return;
  setSelection(a.svg, a.key, [...a.svg.querySelectorAll<SVGGElement>("g[data-el]")].filter((g) => selectable(g, a.key)).map((g) => g.dataset.el ?? ""));
}
function nudge(dx: number, dy: number): void {
  if (!sel) return;
  const before = editSnapshot();
  if (sel.key === PORTRAIT_KEY) [dx, dy] = portraitClampMove(itemsFor(sel.svg, sel.key, sel.ids), dx, dy);
  for (const id of sel.ids) { const o = overrideOf(sel.key, id); setOverride(sel.key, id, { ...o, dx: o.dx + dx, dy: o.dy + dy }); }
  commit(before, false, "微移 Nudge");
}
function selectedBox(): DOMRect | null { return sel ? boxOfIds(sel.svg, sel.key, sel.ids) : null; }
/** Move the selection's box to x, y and scale it to width w (any of them null to leave it). */
function setBox(x: number | null, y: number | null, w: number | null): void {
  const B = selectedBox();
  if (!sel || !B) return;
  const before = editSnapshot(), k = w !== null && B.width > 0 ? Math.max(0.05, w / B.width) : 1;
  const nx = x ?? B.x, ny = y ?? B.y;
  for (const it of itemsFor(sel.svg, sel.key, sel.ids)) {
    const cx = nx + (it.box0.x + it.box0.width / 2 - B.x) * k, cy = ny + (it.box0.y + it.box0.height / 2 - B.y) * k;
    setOverride(sel.key, it.id, centred(it, cx, cy, it.o0.s * k, it.o0.r ?? 0));
  }
  commit(before, false, "位置与大小 Position and size");
}
/** Turn each selected element to `deg` about its own centre (absolute), or by `deg` more (relative). */
function rotateSelected(deg: number, relative: boolean): void {
  if (!sel) return;
  const before = editSnapshot();
  for (const it of itemsFor(sel.svg, sel.key, sel.ids)) {
    const cx = it.box0.x + it.box0.width / 2, cy = it.box0.y + it.box0.height / 2;
    setOverride(sel.key, it.id, centred(it, cx, cy, it.o0.s, relative ? (it.o0.r ?? 0) + deg : deg));
  }
  commit(before, false, "旋转 Rotate");
}
/** Move each unit of the selection by its own offset. */
function moveUnits(offsets: [string[], number, number][], label: string): void {
  if (!sel) return;
  const before = editSnapshot();
  for (const [ids, dx, dy] of offsets) for (const id of ids) { const o = overrideOf(sel.key, id); setOverride(sel.key, id, { ...o, dx: o.dx + dx, dy: o.dy + dy }); }
  commit(before, false, label);
}
type UnitBox = { ids: string[]; b: DOMRect };
function unitBoxes(): UnitBox[] {
  if (!sel) return [];
  const s = sel;
  return unitsOf(s.key, s.ids).map((ids) => ({ ids, b: boxOfIds(s.svg, s.key, ids) })).filter((u): u is UnitBox => !!u.b);
}
/**
 * Align. One element or one group aligns to the card (or, on H, to the field it sits on); several align to
 * each other, on the selection's own edges and centres.
 */
function alignSelected(how: string): void {
  const units = unitBoxes(), all = selectedBox();
  if (!sel || !all || !units.length) return;
  let f: { l: number; c: number; r: number; t: number; m: number; b: number };
  if (units.length === 1) {
    const onField = sel.key === "seal2:front" && all.x < S.fieldW, dm = sheetDims(sel.key);
    f = sel.key === PORTRAIT_KEY ? { l: dm.m, c: dm.w / 2, r: dm.w - dm.m, t: dm.m, m: dm.h / 2, b: dm.h - dm.m } : onField ? { l: 3, c: S.fieldW / 2, r: S.fieldW - 3, t: M, m: H / 2, b: BASE } : { l: M, c: W / 2, r: W - M, t: M, m: H / 2, b: BASE };
  } else {
    f = { l: all.x, c: all.x + all.width / 2, r: all.x + all.width, t: all.y, m: all.y + all.height / 2, b: all.y + all.height };
  }
  moveUnits(units.map(({ ids, b }): [string[], number, number] => {
    switch (how) {
      case "l": return [ids, f.l - b.x, 0];
      case "c": return [ids, f.c - (b.x + b.width / 2), 0];
      case "r": return [ids, f.r - (b.x + b.width), 0];
      case "t": return [ids, 0, f.t - b.y];
      case "m": return [ids, 0, f.m - (b.y + b.height / 2)];
      case "b": return [ids, 0, f.b - (b.y + b.height)];
      default: return [ids, 0, 0];
    }
  }), "对齐 Align");
}
/** Equal gaps between three or more units, keeping the outermost two where they are. */
function distributeSelected(axis: "h" | "v"): void {
  const units = unitBoxes();
  if (units.length < 3) return;
  const pos = (b: DOMRect): number => (axis === "h" ? b.x : b.y), size = (b: DOMRect): number => (axis === "h" ? b.width : b.height);
  units.sort((a, b) => pos(a.b) - pos(b.b));
  const first = units[0]!, last = units[units.length - 1]!;
  const gap = (pos(last.b) + size(last.b) - pos(first.b) - units.reduce((s, u) => s + size(u.b), 0)) / (units.length - 1);
  let at = pos(first.b);
  moveUnits(units.map((u): [string[], number, number] => {
    const d = at - pos(u.b);
    at += size(u.b) + gap;
    return axis === "h" ? [u.ids, d, 0] : [u.ids, 0, d];
  }), axis === "h" ? "水平分布 Distribute across" : "垂直分布 Distribute down");
}
function groupSelected(): void {
  if (!sel || unitsOf(sel.key, sel.ids).length < 2) return;
  const before = editSnapshot(), ids = [...sel.ids];
  const rest = groupsOf(sel.key).map((g) => g.filter((id) => !ids.includes(id))).filter((g) => g.length > 1);
  state.groups = { ...state.groups, [sel.key]: [...rest, ids] };
  commit(before, false, "编组 Group");
}
/** Take every group on a sheet apart, so each element moves on its own. */
function ungroupAll(key: string): void {
  if (!groupsOf(key).length) return;
  const before = editSnapshot();
  state.groups = { ...state.groups, [key]: [] };
  commit(before, false, "全部取消编组 Ungroup all");
}
/** The portrait's default group again: the two pillars, their services and the axis. */
function regroupPillars(): void {
  const before = editSnapshot(), ids = ["pillar1", "pillar1List", "pillarAxis", "pillar2", "pillar2List"];
  const rest = groupsOf(PORTRAIT_KEY).map((g) => g.filter((id) => !ids.includes(id))).filter((g) => g.length > 1);
  state.groups = { ...state.groups, [PORTRAIT_KEY]: [...rest, ids] };
  commit(before, false, "两栏编组 Group the pillars");
}
function ungroupSelected(): void {
  if (!sel) return;
  const ids = sel.ids, before = editSnapshot();
  state.groups = { ...state.groups, [sel.key]: groupsOf(sel.key).filter((g) => !g.some((id) => ids.includes(id))) };
  commit(before, false, "取消编组 Ungroup");
}
function lockSelected(): void {
  if (!sel) return;
  const before = editSnapshot(), locks = { ...state.locks };
  for (const id of sel.ids) locks[ovKey(sel.key, id)] = true;
  state.locks = locks;
  sel = null;
  commit(before, true, "锁定 Lock");
}
function toggleLock(key: string, id: string): void {
  const before = editSnapshot(), locks = { ...state.locks }, k = ovKey(key, id);
  if (locks[k]) delete locks[k]; else locks[k] = true;
  state.locks = locks;
  if (sel && locks[k]) { sel.ids = sel.ids.filter((x) => x !== id); if (!sel.ids.length) sel = null; }
  commit(before, true, locks[k] ? "锁定 Lock" : "解锁 Unlock");
}
function toggleHidden(key: string, id: string): void {
  const before = editSnapshot(), o = overrideOf(key, id);
  setOverride(key, id, { ...o, hidden: !o.hidden });
  if (sel && !o.hidden) { sel.ids = sel.ids.filter((x) => x !== id); if (!sel.ids.length) sel = null; }
  commit(before, true, o.hidden ? "显示 Show" : "隐藏 Hide");
}
/** Delete: pasted copies go; the layout's own elements hide (Show hidden brings them back). */
function removeSelected(): void {
  if (!sel) return;
  const s = sel, before = editSnapshot(), extras = (state.extras[s.key] ?? []).filter((x) => !s.ids.includes(x.id));
  state.extras = { ...state.extras, [s.key]: extras };
  for (const id of s.ids) {
    if (id.includes("~")) {
      delete state.ov[ovKey(s.key, id)];
      for (const k of Object.keys(state.texts)) if (k.startsWith(`${ovKey(s.key, id)}#`)) delete state.texts[k];
    } else setOverride(s.key, id, { ...overrideOf(s.key, id), hidden: true });
  }
  state.groups = { ...state.groups, [s.key]: groupsOf(s.key).map((g) => g.filter((id) => !(id.includes("~") && s.ids.includes(id)))).filter((g) => g.length > 1) };
  sel = null;
  commit(before, true, "删除 Delete");
}
function hideSelected(): void { removeSelected(); }
function resetSelected(): void {
  if (!sel) return;
  const before = editSnapshot();
  for (const id of sel.ids) setOverride(sel.key, id, { dx: 0, dy: 0, s: 1 });
  commit(before, false, "复位 Reset");
}
function showAll(): void {
  const before = editSnapshot();
  for (const k of Object.keys(state.ov)) {
    const o = state.ov[k];
    if (o && o.hidden) { const { hidden: _h, ...rest } = o; void _h; if (moved(rest)) state.ov[k] = rest; else delete state.ov[k]; }
  }
  commit(before, true, "显示全部 Show hidden");
}
function resetLayout(): void {
  const a = activeSheet(), before = editSnapshot(), keys = a?.key === PORTRAIT_KEY ? [PORTRAIT_KEY] : [`${state.logo}:front`, BACK_KEY], hit = (k: string): boolean => keys.some((p) => k.startsWith(`${p}:`));
  for (const k of Object.keys(state.ov)) if (hit(k)) delete state.ov[k];
  for (const k of Object.keys(state.locks)) if (hit(k)) delete state.locks[k];
  for (const k of Object.keys(state.texts)) if (hit(k)) delete state.texts[k];
  const drop = <T,>(r: Record<string, T>): Record<string, T> => Object.fromEntries(Object.entries(r).filter(([k]) => !keys.includes(k)));
  state.groups = drop(state.groups); state.extras = drop(state.extras); state.refLines = drop(state.refLines);
  sel = null;
  commit(before, true, "复位版式 Reset layout");
}

// ---- copy and paste ----
interface Clip { key: string; items: { src: string; label: string; o: Override; texts: [number, string][] }[] }
let clipboard: Clip | null = null;
function copySelected(): void {
  if (!sel) return;
  const s = sel;
  clipboard = {
    key: s.key,
    items: s.ids.map((id) => {
      const g = groupOf(s.svg, id), extra = (state.extras[s.key] ?? []).find((x) => x.id === id);
      const texts: [number, string][] = [];
      g?.querySelectorAll("text").forEach((t, i) => texts.push([i, t.textContent ?? ""]));
      return { src: extra ? extra.src : id, label: extra ? extra.label : `${g?.dataset.label ?? id} · 副本`, o: { ...overrideOf(s.key, id), hidden: false }, texts };
    }),
  };
  updateProps();
}
/** Paste the copied elements onto their sheet, 3 mm down and right of where they were, and select them. */
function pasteClipboard(): void {
  if (!clipboard) return;
  const key = clipboard.key, svg = document.querySelector<SVGSVGElement>(`svg[data-key="${CSS.escape(key)}"][data-edit]`);
  if (!svg) return;
  const before = editSnapshot(), extras = [...(state.extras[key] ?? [])], ids: string[] = [];
  const taken = new Set([...extras.map((x) => x.id)]);
  for (const it of clipboard.items) {
    let n = 1;
    while (taken.has(`${it.src}~${n}`)) n++;
    const id = `${it.src}~${n}`;
    taken.add(id);
    extras.push({ id, src: it.src, label: it.label });
    state.ov[ovKey(key, id)] = { ...it.o, dx: it.o.dx + 3, dy: it.o.dy + 3, hidden: false };
    for (const [i, t] of it.texts) state.texts[`${ovKey(key, id)}#${i}`] = t;
    ids.push(id);
    it.o = { ...it.o, dx: it.o.dx + 3, dy: it.o.dy + 3 }; // the next paste steps on again
  }
  state.extras = { ...state.extras, [key]: extras };
  commit(before, true, "粘贴 Paste");
  const live = document.querySelector<SVGSVGElement>(`svg[data-key="${CSS.escape(key)}"][data-edit]`);
  if (live) setSelection(live, key, ids);
}

// ---- reference lines ----
function addRefLine(axis: "x" | "y"): void {
  const a = activeSheet();
  if (!a) return;
  const before = editSnapshot(), refs = refsOf(a.key), list = [...(axis === "x" ? refs.xs : refs.ys)];
  let v = axis === "x" ? sheetDims(a.key).w / 2 : sheetDims(a.key).h / 2;
  while (list.some((x) => Math.abs(x - v) < 0.5)) v += 4;
  list.push(v);
  state.refLines = { ...state.refLines, [a.key]: axis === "x" ? { xs: list, ys: [...refs.ys] } : { xs: [...refs.xs], ys: list } };
  commit(before, false, "添加参考线 Add guide");
}
function clearRefLines(): void {
  const a = activeSheet();
  if (!a) return;
  const before = editSnapshot();
  state.refLines = { ...state.refLines, [a.key]: { xs: [], ys: [] } };
  commit(before, false, "清除参考线 Clear guides");
}

// ---- layers: every element of the active sheet, with show/hide and lock ----
function renderLayers(): void {
  const host = document.getElementById("layers"), a = activeSheet();
  if (!host || !a) return;
  const groups = groupsOf(a.key);
  const rows = [...a.svg.querySelectorAll<SVGGElement>("g[data-el]")].filter((g) => !g.dataset.locked).reverse().map((g) => {
    const id = g.dataset.el ?? "", o = overrideOf(a.key, id), locked = isLocked(a.key, id), name = g.dataset.label ?? id;
    const gi = groups.findIndex((gr) => gr.includes(id)), on = !!sel && sel.svg === a.svg && sel.ids.includes(id);
    return `<li class="layer${on ? " is-on" : ""}${o.hidden ? " is-hidden" : ""}">` +
      `<button type="button" class="layer__name" data-layer="${esc(id)}">${esc(name)}${gi >= 0 ? ` <em>组 ${gi + 1}</em>` : ""}${o.r ? ` <em>${Math.round(o.r)}°</em>` : ""}</button>` +
      `<button type="button" class="layer__btn" data-eye="${esc(id)}" aria-pressed="${!o.hidden}" title="${o.hidden ? "Show" : "Hide"}" aria-label="${o.hidden ? "Show" : "Hide"} ${esc(name)}">${o.hidden ? "隐" : "显"}</button>` +
      `<button type="button" class="layer__btn" data-lock="${esc(id)}" aria-pressed="${locked}" title="${locked ? "Unlock" : "Lock"}" aria-label="${locked ? "Unlock" : "Lock"} ${esc(name)}">锁</button></li>`;
  }).join("");
  host.innerHTML = `<p class="layers__side">${a.key === BACK_KEY ? "背面 · Back" : a.key === PORTRAIT_KEY ? "竖版 · Portrait" : "正面 · Front"}</p><ul>${rows}</ul>`;
}
function onLayersClick(e: MouseEvent): void {
  const a = activeSheet(), t = e.target as Element;
  if (!a) return;
  const name = t.closest<HTMLElement>("[data-layer]"), eye = t.closest<HTMLElement>("[data-eye]"), lock = t.closest<HTMLElement>("[data-lock]");
  if (eye) { toggleHidden(a.key, eye.dataset.eye ?? ""); return; }
  if (lock) { toggleLock(a.key, lock.dataset.lock ?? ""); return; }
  if (name) {
    const id = name.dataset.layer ?? "";
    if (isLocked(a.key, id) || overrideOf(a.key, id).hidden) return;
    const unit = unitOf(a.key, id), current = sel && sel.svg === a.svg ? sel.ids : [];
    if (e.shiftKey) setSelection(a.svg, a.key, unit.every((x) => current.includes(x)) ? current.filter((x) => !unit.includes(x)) : [...current, ...unit]);
    else setSelection(a.svg, a.key, unit);
  }
}
