// The page: controls, sliders, the large sheets, the strips, the position panel and the benchmark.

const $ = (id: string): HTMLElement => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el;
};
const input = (id: string): HTMLInputElement => $(id) as HTMLInputElement;

type SliderKey = Exclude<keyof Settings, "icons" | "crop" | "align">;
/** [setting, label, min, max, step, where it applies] */
type SliderDef = [SliderKey, string, number, number, number, string];
const SLIDERS: Record<string, SliderDef[]> = {
  "sl-front": [
    ["fieldW", "色块宽度 Field width", 28, 46, 0.5, "H"],
    ["markH", "标志大小 Logo size", 12, 30, 0.5, "G H I"],
    ["zhW", "字标宽度 Lettering width", 16, 32, 0.5, "G H I"],
    ["logoGap", "标志与字距 Logo to lettering", 2, 9, 0.1, "H I"],
    ["logoY", "标志上下 Logo up or down", -8, 8, 0.1, "G H I"],
  ],
  "sl-type": [
    ["name", "姓名 Name", 4, 8, 0.1, "G H I"],
    ["small", "小字 Small text", 1.8, 2.8, 0.05, "G H I"],
    ["lead", "行距 Line spacing", 2.8, 4.8, 0.05, "H I"],
    ["co", "西顶文化", 2, 3.6, 0.05, "G H I"],
    ["iconD", "图标圆点 Icon dot", 2, 3.6, 0.05, "G H I"],
  ],
  "sl-back": [
    ["backMark", "背面标志 Back logo", 10, 26, 0.5, "Back"],
    ["backY", "背面标志上下 Back logo up or down", -8, 8, 0.1, "Back"],
    ["brand", "西顶艺术 · 西顶教育 · 西顶时光", 2, 3.8, 0.05, "Back"],
  ],
};
const SLIDER_KEYS: SliderKey[] = Object.values(SLIDERS).flat().map((r) => r[0]);
const fixed2 = new Set<SliderKey>(["small", "lead", "co", "iconD", "brand"]);

const frontKey = (): string => `${state.logo}:front`;
const BACK_KEY = "back";

function mount(host: HTMLElement, svgText: string, key: string, editable: boolean): void {
  host.innerHTML = svgText;
  const svg = host.querySelector<SVGSVGElement>("svg");
  if (!svg) return;
  applyOverrides(svg, key);
  if (editable) attachEditor(svg);
}

function render(): void {
  const p = state.data[state.person] ?? PEOPLE[0]!;
  document.body.classList.toggle("guides", state.guides);
  mount($("front"), sheet(front(p, state.inks, state.logo, state.rings, state.field), `Business card front, ${p.nameEn || p.nameZh || "blank"}`, frontKey(), true), frontKey(), true);
  mount($("back"), sheet(back(state.inks), "Business card back", BACK_KEY, true), BACK_KEY, true);
  $("cap-front").textContent = `正面 · ${LAYOUTS[state.logo].zh}${p.nameZh ? " · " + p.nameZh : ""}`;
  $("cap-inks").textContent = state.inks === 3 ? "Three inks" : "Two inks";
  const inks: [string, string][] = [["#404041", "vi-charcoal · ground"], ["#F3F1E8", "vi-ivory · logo, name, contacts"]];
  if (state.inks === 3) inks.push(["#C3A585", "vi-sand · 西顶艺术, 西顶教育, 西顶时光, 西顶文化"]);
  $("inks").innerHTML = inks.map(([c, t]) => `<span><i style="background:${c}"></i>${t}</span>`).join("");
  for (const k of SLIDER_KEYS) {
    const o = document.getElementById(`o-${k}`);
    if (o) o.textContent = `${(+S[k]).toFixed(fixed2.has(k) ? 2 : 1)} mm`;
  }
  // the three fronts side by side, and H in every field colour, each with its own moves
  const alts = $("alts");
  alts.innerHTML = (["grid", "seal2", "axis"] as Layout[]).map((k, i) =>
    `<figure class="alt"><div data-alt="${k}">${sheet(front(p, state.inks, k, state.rings, state.field), `Front ${"GHI"[i]}`, `${k}:front`, false)}</div>` +
    `<figcaption><b>${"GHI"[i]} · ${LAYOUTS[k].zh} ${LAYOUTS[k].en}</b></figcaption></figure>`).join("");
  alts.querySelectorAll<HTMLElement>("[data-alt]").forEach((d) => { const s = d.querySelector<SVGSVGElement>("svg"); if (s) applyOverrides(s, `${d.dataset.alt}:front`); });
  const fields = $("fields");
  fields.innerHTML = (Object.keys(FIELDS) as FieldKey[]).map((k) =>
    `<figure class="alt"><div>${sheet(frontSeal(p, state.inks, state.rings, k), `Front H, ${FIELDS[k].en}`, "seal2:front", false)}</div><figcaption><b>${FIELDS[k].zh} · ${FIELDS[k].en}</b></figcaption></figure>`).join("");
  fields.querySelectorAll<SVGSVGElement>("svg").forEach((s) => applyOverrides(s, "seal2:front"));
  if (sel && !document.body.contains(sel.svg)) sel = null;
  updateProps();
  renderLayers();
}

function renderBefore(): void {
  const X = window.Xiding, p = PEOPLE[0]!;
  const before = X ? [X.card({ side: "front", front: "teal" }), X.card({ side: "back", back: "paper", person: { nameZh: p.nameZh, nameEn: p.nameEn, titleZh: p.titleZh, titleEn: p.titleEn, phone: p.phone, email: p.email, web: p.web, address: p.address } })] : ["", ""];
  const cmp = $("compare");
  cmp.innerHTML = '<div class="tag">BEFORE<span>v1.8 BusinessCard</span></div>' + before.map((s) => `<div>${s}</div>`).join("") +
    `<div class="tag">AFTER<span>This card</span></div><div data-k="${BACK_KEY}">${sheet(back(3), "After, logo side", BACK_KEY, false)}</div>` +
    `<div data-k="seal2:front">${sheet(frontSeal(state.data[0] ?? p, 3, false, "gold"), "After, name side", "seal2:front", false)}</div>`;
  cmp.querySelectorAll<HTMLElement>("[data-k]").forEach((d) => { const s = d.querySelector<SVGSVGElement>("svg"); if (s) applyOverrides(s, d.dataset.k ?? ""); });
}

/** After any edit: redraw, refresh the history thumbnails' highlight and the timings. */
function onEditChanged(full: boolean): void {
  render();
  if (full) renderHistory();
  renderBench(false);
  updateUndoButtons();
}
function updateUndoButtons(): void {
  (document.getElementById("undo") as HTMLButtonElement | null)?.toggleAttribute("disabled", undoStack.length === 0);
  (document.getElementById("redo") as HTMLButtonElement | null)?.toggleAttribute("disabled", redoStack.length === 0);
  renderUndoHistory();
}

function updateProps(): void {
  const label = $("p-label"), box = selectedBox(), on = !!(sel && box);
  document.querySelectorAll<HTMLInputElement | HTMLButtonElement>("[data-prop]").forEach((el) => { el.disabled = !on; });
  if (!on || !sel || !box) {
    label.textContent = "点选卡片上的元素 · Click an element on a card";
    for (const id of ["p-x", "p-y", "p-w", "p-h", "p-r"]) input(id).value = "";
    ($("p-paste") as HTMLButtonElement).disabled = !clipboard;
    $("p-s").textContent = "";
    return;
  }
  const side = sel.key === BACK_KEY ? "背面" : "正面", first = sel.ids[0] ?? "", g = groupOf(sel.svg, first);
  const units = unitsOf(sel.key, sel.ids).length;
  label.textContent = sel.ids.length === 1 ? `${side} · ${g?.dataset.label ?? first}`
    : `${side} · ${sel.ids.length} 个元素 · ${sel.ids.length} elements${units === 1 ? " · 一组 one group" : ""}`;
  const active = document.activeElement;
  const put = (id: string, v: number): void => { const el = input(id); if (el !== active) el.value = v.toFixed(1); };
  put("p-x", box.x); put("p-y", box.y); put("p-w", box.width); put("p-h", box.height);
  $("p-s").textContent = sel.ids.length === 1 ? `${Math.round(overrideOf(sel.key, first).s * 100)}%` : "";
  // what the selection allows
  const set = (id: string, on: boolean): void => { const b = document.getElementById(id) as HTMLButtonElement | null; if (b) b.disabled = !on; };
  set("p-group", units >= 2);
  set("p-ungroup", sel.ids.some((id) => unitOf(sel!.key, id).length > 1));
  set("p-dist-h", units >= 3); set("p-dist-v", units >= 3);
  set("p-paste", !!clipboard);
  const r = overrideOf(sel.key, first).r ?? 0, rin = input("p-r");
  if (rin !== active) rin.value = sel.ids.length === 1 ? String(Math.round(r * 10) / 10) : "";
  rin.placeholder = sel.ids.length === 1 ? "" : "…";
}

function syncControls(): void {
  for (const k of SLIDER_KEYS) { const el = document.getElementById(`s-${k}`) as HTMLInputElement | null; if (el) el.value = String(S[k]); }
  input("t-icons").checked = S.icons; input("t-crop").checked = S.crop; input("t-align").checked = S.align;
  const radios: [string, string][] = [["person", String(state.person)], ["inks", String(state.inks)], ["logo", state.logo], ["dots", state.rings ? "ring" : "dot"], ["field", state.field]];
  for (const [n, v] of radios) {
    const el = document.querySelector<HTMLInputElement>(`input[name="${n}"][value="${v}"]`);
    if (el) el.checked = true;
  }
}
function fillForm(): void {
  const p = state.data[state.person] ?? PEOPLE[0]!;
  (Object.keys(p) as (keyof Person)[]).forEach((k) => { const el = document.getElementById(`e-${k}`) as HTMLInputElement | null; if (el) el.value = p[k]; });
}

// ---- benchmark ----
let bench: BenchResult | null = null;
function renderBench(run: boolean): void {
  if (run) bench = benchSnap();
  const d = dragStats(), fmt = (us: number): string => (us < 1 ? `${(us * 1000).toFixed(0)} ns` : `${us.toFixed(2)} µs`);
  $("b-engine").textContent = engineName;
  if (bench) {
    $("b-wasm").textContent = bench.wasmUs === null ? "WebAssembly refused here; TypeScript twin in use" : fmt(bench.wasmUs);
    $("b-ts").textContent = fmt(bench.tsUs);
    $("b-parity").textContent = bench.wasmUs === null ? "—" : `${bench.matches.toLocaleString()} / ${bench.cases.toLocaleString()} identical`;
    $("b-cases").textContent = `${bench.cases.toLocaleString()} snaps, ${bench.targets} lines each`;
  }
  $("b-drag").textContent = d ? `${d.avg.toFixed(2)} ms average, ${d.p95.toFixed(2)} ms at the 95th percentile, over ${d.n} moves` : "Drag something on the card to measure";
}

// ---- wiring ----
function buildPersonSeg(): void {
  $("seg-person").innerHTML = state.data.map((p, i) =>
    `<label><input type="radio" name="person" id="p-${i}" value="${i}"${i === state.person ? " checked" : ""}><span>${esc(p.nameZh || p.nameEn || String(i + 1))}</span></label>`).join("");
}
function wire(): void {
  buildPersonSeg();
  for (const box of Object.keys(SLIDERS)) {
    $(box).innerHTML = (SLIDERS[box] ?? []).map(([k, label, min, max, step, where]) =>
      `<label for="s-${k}"><span>${label} <em>${where}</em><output id="o-${k}"></output></span><input type="range" id="s-${k}" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${S[k]}"></label>`).join("");
  }
  let sliderBefore: string | null = null;
  document.addEventListener("pointerdown", (e) => { if ((e.target as Element).closest?.("[data-k]")) sliderBefore = editSnapshot(); });
  document.addEventListener("keydown", (e) => { if ((e.target as Element).closest?.("[data-k]") && sliderBefore === null) sliderBefore = editSnapshot(); });
  document.addEventListener("input", (e) => {
    const k = (e.target as HTMLElement).dataset?.k as SliderKey | undefined;
    if (!k) return;
    if (sliderBefore === null) sliderBefore = editSnapshot();
    S[k] = +(e.target as HTMLInputElement).value;
    render();
  });
  document.addEventListener("change", (e) => {
    const t = e.target as HTMLInputElement;
    if (t.dataset?.k) {
      const def = Object.values(SLIDERS).flat().find((r) => r[0] === t.dataset.k);
      if (sliderBefore) pushUndo(sliderBefore, `滑块 Slider · ${def?.[1] ?? t.dataset.k}`);
      sliderBefore = null; onEditChanged(false); return;
    }
    const before = editSnapshot();
    if (t.name === "person") { state.person = +t.value; fillForm(); }
    else if (t.name === "inks") state.inks = t.value === "2" ? 2 : 3;
    else if (t.name === "logo" && isLayout(t.value)) { state.logo = t.value; sel = null; }
    else if (t.name === "dots") state.rings = t.value === "ring";
    else if (t.name === "field" && isField(t.value)) state.field = t.value;
    else if (t.id === "guides") state.guides = t.checked;
    else if (t.id === "t-icons") S.icons = t.checked;
    else if (t.id === "t-crop") S.crop = t.checked;
    else if (t.id === "t-align") S.align = t.checked;
    else return;
    const names: Record<string, string> = { person: "切换人 Person", inks: "颜色 Inks", logo: "版式 Layout", dots: "圆点 Dots", field: "色块 Field", guides: "出血框 Bleed guides", "t-icons": "图标 Icons", "t-crop": "裁切线 Crop marks", "t-align": "对齐线 Alignment lines" };
    pushUndo(before, names[t.name] ?? names[t.id] ?? "设置 Setting");
    onEditChanged(false);
  });
  $("edit").addEventListener("input", (e) => {
    const t = e.target as HTMLInputElement, p = state.data[state.person];
    if (p && t.name in p) { p[t.name as keyof Person] = t.value; render(); }
  });
  $("edit").addEventListener("submit", (e) => e.preventDefault());
  $("reset").addEventListener("click", () => { const b = editSnapshot(); Object.assign(S, DEFAULTS); syncControls(); pushUndo(b, "恢复默认 Reset sliders"); onEditChanged(false); });
  $("undo-list").addEventListener("click", (e) => { const b = (e.target as Element).closest<HTMLElement>("[data-step]"); if (b) jumpTo(Number(b.dataset.step)); });
  $("x-pdf").addEventListener("click", () => void exportPdf());
  $("x-svg").addEventListener("click", () => void exportSvg());
  $("x-page").addEventListener("click", () => void exportPage());
  $("x-json").addEventListener("click", () => void exportJson());
  input("x-import").addEventListener("change", () => { const f = input("x-import").files?.[0]; if (f) void importJson(f); input("x-import").value = ""; });
  $("v-save").addEventListener("click", () => void saveVersion());
  input("v-label").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); void saveVersion(); } });
  $("hist").addEventListener("click", (e) => void onHistoryClick(e));
  $("undo").addEventListener("click", undo);
  $("redo").addEventListener("click", redo);
  document.querySelectorAll<HTMLButtonElement>("[data-align]").forEach((b) => b.addEventListener("click", () => alignSelected(b.dataset.align ?? "")));
  $("p-reset").addEventListener("click", resetSelected);
  $("p-hide").addEventListener("click", hideSelected);
  $("p-showall").addEventListener("click", showAll);
  $("p-resetall").addEventListener("click", resetLayout);
  $("p-group").addEventListener("click", groupSelected);
  $("p-ungroup").addEventListener("click", ungroupSelected);
  $("p-lock").addEventListener("click", lockSelected);
  $("p-dist-h").addEventListener("click", () => distributeSelected("h"));
  $("p-dist-v").addEventListener("click", () => distributeSelected("v"));
  $("p-all").addEventListener("click", selectAll);
  $("p-copy").addEventListener("click", copySelected);
  $("p-paste").addEventListener("click", pasteClipboard);
  $("p-dup").addEventListener("click", () => { copySelected(); pasteClipboard(); });
  $("p-rot90").addEventListener("click", () => rotateSelected(90, true));
  $("p-edit").addEventListener("click", () => { if (sel && sel.ids.length === 1) startTextEdit(sel.svg, sel.key, sel.ids[0] ?? "", 0); });
  $("ref-x").addEventListener("click", () => addRefLine("x"));
  $("ref-y").addEventListener("click", () => addRefLine("y"));
  $("ref-clear").addEventListener("click", clearRefLines);
  $("layers").addEventListener("click", (e) => onLayersClick(e));
  const num = (id: string, f: (v: number) => void): void => {
    input(id).addEventListener("change", () => { const v = parseFloat(input(id).value); if (Number.isFinite(v)) f(v); });
  };
  num("p-x", (v) => setBox(v, null, null));
  num("p-y", (v) => setBox(null, v, null));
  num("p-w", (v) => setBox(null, null, v));
  num("p-h", (v) => { const b = selectedBox(); if (b && b.height > 0) setBox(null, null, (b.width * v) / b.height); });
  num("p-r", (v) => rotateSelected(v, false));
  $("b-run").addEventListener("click", () => renderBench(true));
}

loadEmbeddedState();
wire();
syncControls();
fillForm();
render();
renderBefore();
updateUndoButtons();
void initStore();
void loadSnapEngine().then(() => renderBench(true));
if (document.fonts && document.fonts.ready) {
  void document.fonts.ready.then(() => { render(); renderBefore(); renderHistory(); });
}
