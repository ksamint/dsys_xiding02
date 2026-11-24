import { OBJ_NAME, applyEdit, type Box, type Drawn, type Edit, type Look, type ObjId } from "./card.js";
import { el } from "./dom.js";

// 移动与缩放: select a thing on the card, drag it, drag a corner or pinch to size it.
// Moves snap to the layout's lines (margins, centres, the field's edge) and to the other things' edges and centres,
// and a guide shows the line it snapped to. Arrow keys nudge; Shift moves ten at a time; + and − size.

export interface EditorHost {
  look(): Look;
  /** Stores the edit and redraws at once (the canvas, not the PNG). */
  setEdit(id: ObjId, e: Edit | null): void;
  /** The last drawing: boxes and guide lines. */
  drawn(): Drawn;
  /** Called when a gesture ends: time to make the PNG. */
  settle(): void;
  /** The drawing's size in px: it changes with the layout. */
  size(): { w: number; h: number };
}

const ORDER: ObjId[] = ["title", "code", "wordmark", "mark", "photo"]; // hit-test order, top first
const SNAP_PX = 7; // on screen
const MIN_S = 0.3;
const MAX_S = 3;

export function attachEditor(stage: HTMLElement, host: EditorHost, onSelect: (id: ObjId | null) => void) {
  const sel = el("div", { class: "sel", hidden: true });
  const handles = (["nw", "ne", "sw", "se"] as const).map((k) => {
    const h = el("span", { class: `sel__h sel__h--${k}`, "data-handle": k });
    sel.append(h);
    return h;
  });
  void handles;
  const gx = el("div", { class: "guide guide--x", hidden: true });
  const gy = el("div", { class: "guide guide--y", hidden: true });
  stage.append(sel, gx, gy);

  let current: ObjId | null = null;
  const pts = new Map<number, { x: number; y: number }>();
  type Drag =
    | { mode: "move"; id: ObjId; start: Edit; px: number; py: number; base: Box }
    | { mode: "scale"; id: ObjId; start: Edit; d0: number; c: { x: number; y: number } }
    | { mode: "pinch"; id: ObjId; start: Edit; d0: number };
  let drag: Drag | null = null;

  const W = () => host.size().w;
  const H = () => host.size().h;
  const ratio = () => W() / stage.getBoundingClientRect().width;
  const toCard = (e: PointerEvent) => {
    const r = stage.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W(), y: ((e.clientY - r.top) / r.height) * H() };
  };
  const editOf = (id: ObjId): Edit => host.look().edits?.[host.look().layout]?.[id] ?? { dx: 0, dy: 0, s: 1 };
  const boxOf = (id: ObjId) => host.drawn().boxes[id];
  /** The box before its edit: the layout's own place. */
  const baseOf = (id: ObjId): Box | undefined => {
    const b = boxOf(id);
    if (!b) return undefined;
    const e = editOf(id);
    const w = b.w / e.s;
    const h = b.h / e.s;
    return { x: b.x + b.w / 2 - w / 2 - e.dx, y: b.y + b.h / 2 - h / 2 - e.dy, w, h };
  };

  const pct = (v: number, of: number) => `${(v / of) * 100}%`;
  function show(): void {
    const b = current ? boxOf(current) : undefined;
    sel.hidden = !b;
    if (!b) return;
    sel.style.left = pct(b.x, W());
    sel.style.top = pct(b.y, H());
    sel.style.width = pct(b.w, W());
    sel.style.height = pct(b.h, H());
    sel.dataset.name = current ? OBJ_NAME[current] : "";
  }
  function guide(x: number | null, y: number | null): void {
    gx.hidden = x === null;
    gy.hidden = y === null;
    if (x !== null) gx.style.left = pct(x, W());
    if (y !== null) gy.style.top = pct(y, H());
  }
  function select(id: ObjId | null): void {
    current = id;
    show();
    onSelect(id);
  }

  function hit(p: { x: number; y: number }): ObjId | null {
    const pad = 12 * ratio();
    for (const id of ORDER) {
      const b = boxOf(id);
      if (b && p.x >= b.x - pad && p.x <= b.x + b.w + pad && p.y >= b.y - pad && p.y <= b.y + b.h + pad) return id;
    }
    return null;
  }

  /** The nearest line within reach for any of the moving box's edges or centre, on one axis. */
  function snapAxis(edges: number[], lines: number[], reach: number): { shift: number; at: number } | null {
    let best: { shift: number; at: number } | null = null;
    for (const e of edges)
      for (const l of lines) {
        const d = l - e;
        if (Math.abs(d) <= reach && (!best || Math.abs(d) < Math.abs(best.shift))) best = { shift: d, at: l };
      }
    return best;
  }
  function linesFor(id: ObjId) {
    const g = host.drawn().guides;
    const xs = [...g.x];
    const ys = [...g.y];
    for (const other of ORDER) {
      if (other === id) continue;
      const b = boxOf(other);
      if (!b) continue;
      xs.push(b.x, b.x + b.w / 2, b.x + b.w);
      ys.push(b.y, b.y + b.h / 2, b.y + b.h);
    }
    return { xs, ys };
  }

  const clampS = (s: number) => Math.min(MAX_S, Math.max(MIN_S, s));
  /** Sizes close to the layout's own snap to it. */
  const snapS = (s: number) => (Math.abs(s - 1) < 0.04 ? 1 : s);

  function commit(id: ObjId, e: Edit): void {
    const same = Math.abs(e.dx) < 0.5 && Math.abs(e.dy) < 0.5 && e.s === 1;
    host.setEdit(id, same ? null : e);
    show();
  }

  stage.addEventListener("pointerdown", (ev) => {
    if (ev.button > 0) return;
    stage.setPointerCapture(ev.pointerId);
    const p = toCard(ev);
    pts.set(ev.pointerId, p);
    stage.focus({ preventScroll: true });

    if (pts.size === 2 && current) {
      const [a, b] = [...pts.values()];
      drag = { mode: "pinch", id: current, start: editOf(current), d0: Math.hypot(a.x - b.x, a.y - b.y) };
      guide(null, null);
      return;
    }
    const handle = (ev.target as HTMLElement).dataset?.handle;
    if (handle && current) {
      const b = boxOf(current)!;
      const c = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
      drag = { mode: "scale", id: current, start: editOf(current), d0: Math.hypot(p.x - c.x, p.y - c.y), c };
      return;
    }
    const id = hit(p);
    select(id);
    if (id) drag = { mode: "move", id, start: editOf(id), px: p.x, py: p.y, base: baseOf(id)! };
    ev.preventDefault();
  });

  stage.addEventListener("pointermove", (ev) => {
    if (!pts.has(ev.pointerId)) return;
    const p = toCard(ev);
    pts.set(ev.pointerId, p);
    if (!drag) return;
    ev.preventDefault();
    if (drag.mode === "pinch") {
      const [a, b] = [...pts.values()];
      if (!a || !b) return;
      const s = snapS(clampS(drag.start.s * (Math.hypot(a.x - b.x, a.y - b.y) / drag.d0)));
      commit(drag.id, { ...drag.start, s });
      return;
    }
    if (drag.mode === "scale") {
      const s = snapS(clampS(drag.start.s * (Math.hypot(p.x - drag.c.x, p.y - drag.c.y) / Math.max(1, drag.d0))));
      commit(drag.id, { ...drag.start, s });
      return;
    }
    // Move, then snap the box's edges and centre to the nearest line in reach.
    let dx = drag.start.dx + (p.x - drag.px);
    let dy = drag.start.dy + (p.y - drag.py);
    const moved = applyEdit(drag.base, { dx, dy, s: drag.start.s });
    const reach = SNAP_PX * ratio();
    const { xs, ys } = linesFor(drag.id);
    const sx = ev.altKey ? null : snapAxis([moved.x, moved.x + moved.w / 2, moved.x + moved.w], xs, reach);
    const sy = ev.altKey ? null : snapAxis([moved.y, moved.y + moved.h / 2, moved.y + moved.h], ys, reach);
    if (sx) dx += sx.shift;
    if (sy) dy += sy.shift;
    guide(sx ? sx.at : null, sy ? sy.at : null);
    commit(drag.id, { dx, dy, s: drag.start.s });
  });

  const end = (ev: PointerEvent) => {
    pts.delete(ev.pointerId);
    if (pts.size === 0 && drag) {
      drag = null;
      guide(null, null);
      host.settle();
    } else if (pts.size === 1 && drag?.mode === "pinch") drag = null;
  };
  stage.addEventListener("pointerup", end);
  stage.addEventListener("pointercancel", end);

  stage.addEventListener("keydown", (ev) => {
    if (!current) return;
    const e = editOf(current);
    const step = ev.shiftKey ? 10 : 1;
    const keys: Record<string, Edit> = {
      ArrowLeft: { ...e, dx: e.dx - step },
      ArrowRight: { ...e, dx: e.dx + step },
      ArrowUp: { ...e, dy: e.dy - step },
      ArrowDown: { ...e, dy: e.dy + step },
      "+": { ...e, s: clampS(e.s * 1.05) },
      "=": { ...e, s: clampS(e.s * 1.05) },
      "-": { ...e, s: clampS(e.s / 1.05) },
    };
    if (ev.key === "Escape") return select(null);
    const next = keys[ev.key];
    if (!next) return;
    ev.preventDefault();
    commit(current, next);
    host.settle();
  });

  return {
    /** Redraw the selection after the card changed (layout, text, sliders). */
    refresh: show,
    select,
    selected: () => current,
  };
}
