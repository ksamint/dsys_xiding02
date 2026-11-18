// Saved versions: one document per version in the artifact's shared database (collection "versions").
// A version keeps everything that shapes the card: settings, element moves, layout, colours and the people's lines.

interface SavedState {
  settings: Settings; ov: Record<string, Override>; groups: Record<string, string[][]>; locks: Record<string, boolean>;
  texts: Record<string, string>; extras: Record<string, Extra[]>; refLines: Record<string, RefLines>;
  person: number; inks: 2 | 3; logo: Layout; rings: boolean; field: FieldKey; data: Person[];
}
interface VersionDoc { label?: string; savedAt?: string; by?: string | null; state?: Partial<SavedState> }

let DB: ClaudeDb | null | false = null;
let USER: ClaudeUser | null = null;
let CAN_WRITE: boolean | null = null;
let VERSIONS: DbDoc[] = [];
const NAMES: Record<string, string> = {};
let currentVersion: string | null = null;

function savedState(): SavedState {
  return JSON.parse(JSON.stringify({ settings: S, ov: state.ov, groups: state.groups, locks: state.locks, texts: state.texts, extras: state.extras, refLines: state.refLines, person: state.person, inks: state.inks, logo: state.logo, rings: state.rings, field: state.field, data: state.data })) as SavedState;
}
function isLayout(v: unknown): v is Layout { return v === "grid" || v === "seal2" || v === "axis"; }
function isField(v: unknown): v is FieldKey { return typeof v === "string" && v in FIELDS; }
// A saved state comes from outside this page: a shared version any collaborator wrote, a design file someone imported,
// or an exported page. Each value is taken only in the shape and range the editor itself writes, so nothing in it can
// reach the card's markup as anything but a number, a switch or plain text.
const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const num = (v: unknown, lo: number, hi: number): number | undefined => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : undefined);
const str = (v: unknown, max = 400): string | undefined => (typeof v === "string" ? v.slice(0, max) : undefined);
/** Each record keeps only the entries whose value `pick` accepts, under at most 2,000 keys of 200 characters. */
function recordOf<T>(v: unknown, pick: (x: unknown) => T | undefined): Record<string, T> {
  const out: Record<string, T> = {};
  if (!isRecord(v)) return out;
  for (const [k, x] of Object.entries(v).slice(0, 2000)) {
    const y = pick(x);
    if (k.length <= 200 && y !== undefined) out[k] = y;
  }
  return out;
}
/** Settings: each number inside its slider's range (the defaults' own keys only), each switch a boolean. */
function cleanSettings(v: unknown): Settings {
  const s = isRecord(v) ? v : {}, out = { ...DEFAULTS } as unknown as Record<string, number | boolean>;
  const range = new Map<string, [number, number]>(Object.values(SLIDERS).flat().map((r) => [r[0], [r[2], r[3]]]));
  for (const k of Object.keys(DEFAULTS) as (keyof Settings)[]) {
    const d = DEFAULTS[k], x = s[k];
    if (typeof d === "boolean") { if (typeof x === "boolean") out[k] = x; continue; }
    const [lo, hi] = range.get(k) ?? [-1000, 1000];
    const n = num(x, lo, hi);
    if (n !== undefined) out[k] = n;
  }
  return out as unknown as Settings;
}
function cleanOverride(v: unknown): Override | undefined {
  if (!isRecord(v)) return undefined;
  const o: Override = { dx: num(v.dx, -500, 500) ?? 0, dy: num(v.dy, -500, 500) ?? 0, s: num(v.s, 0.05, 20) ?? 1 };
  const r = num(v.r, -360, 360);
  if (r !== undefined) o.r = r;
  if (v.hidden === true) o.hidden = true;
  return o;
}
const strings = (v: unknown, max: number): string[] | undefined => (Array.isArray(v) ? v.slice(0, max).map((x) => str(x, 200)).filter((x): x is string => x !== undefined) : undefined);
const numbers = (v: unknown): number[] => (Array.isArray(v) ? v.slice(0, 200).map((x) => num(x, -500, 500)).filter((x): x is number => x !== undefined) : []);
function cleanPerson(v: unknown, i: number): Person {
  const base = { ...(PEOPLE[i] ?? PEOPLE[0]!) } as unknown as Record<string, string>;
  if (isRecord(v)) for (const k of Object.keys(base)) { const x = str(v[k]); if (x !== undefined) base[k] = x; }
  return base as unknown as Person;
}
/** Put a saved state into `S` and `state`, keeping today's defaults for anything an older version did not save,
    and anything that is not in the shape the editor writes. */
function applySaved(v: Partial<SavedState>): void {
  const raw = (isRecord(v) ? v : {}) as Record<string, unknown>;
  Object.assign(S, cleanSettings(raw.settings));
  state.ov = recordOf(raw.ov, cleanOverride);
  state.groups = recordOf(raw.groups, (g) => (Array.isArray(g) ? g.slice(0, 200).map((x) => strings(x, 200)).filter((x): x is string[] => !!x) : undefined));
  state.locks = recordOf(raw.locks, (x) => (typeof x === "boolean" ? x : undefined));
  state.texts = recordOf(raw.texts, (x) => str(x));
  state.extras = recordOf(raw.extras, (l) => (Array.isArray(l) ? l.slice(0, 200).flatMap((x) => {
    if (!isRecord(x)) return [];
    const id = str(x.id, 200), src = str(x.src, 200), label = str(x.label, 200);
    return id !== undefined && src !== undefined ? [{ id, src, label: label ?? "" }] : [];
  }) : undefined));
  state.refLines = recordOf(raw.refLines, (r) => (isRecord(r) ? { xs: numbers(r.xs), ys: numbers(r.ys) } : undefined));
  if (Array.isArray(raw.data) && raw.data.length) state.data = raw.data.slice(0, 50).map((p, i) => cleanPerson(p, i));
  const person = raw.person;
  if (typeof person === "number" && Number.isInteger(person)) state.person = Math.min(Math.max(person, 0), Math.max(state.data.length - 1, 0));
  if (raw.inks === 2 || raw.inks === 3) state.inks = raw.inks;
  if (isLayout(raw.logo)) state.logo = raw.logo;
  if (typeof raw.rings === "boolean") state.rings = raw.rings;
  if (isField(raw.field)) state.field = raw.field;
}
/** Run `fn` with a saved state in place, then put the live one back. Used to draw history thumbnails. */
function withSaved<T>(v: Partial<SavedState>, fn: () => T): T {
  const keepS = { ...S }, keep = { ...state };
  applySaved(v);
  try { return fn(); } finally { Object.assign(S, keepS); Object.assign(state, keep); }
}

function fmtTime(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso), p = (n: number): string => String(n).padStart(2, "0");
  return Number.isNaN(d.getTime()) ? "" : `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function setMsg(t: string): void { const el = document.getElementById("v-msg"); if (el) el.textContent = t; }
function setSaveEnabled(on: boolean): void { const b = document.getElementById("v-save") as HTMLButtonElement | null; if (b) b.disabled = !on; }

function renderHistory(): void {
  const el = document.getElementById("hist");
  if (!el) return;
  if (DB === false) { el.innerHTML = '<p class="hist__empty">Saved versions are not available in this view. You can still adjust the card; it just will not be kept.</p>'; return; }
  if (!VERSIONS.length) { el.innerHTML = '<p class="hist__empty">还没有保存的版本 · No saved versions yet. Adjust the card, name the version and press Save version.</p>'; return; }
  el.innerHTML = VERSIONS.map((doc) => {
    const v = (doc.data() ?? {}) as VersionDoc, st = v.state ?? {};
    const card = withSaved(st, () => {
      const p = state.data[state.person] ?? PEOPLE[0]!;
      return sheet(front(p, state.inks, state.logo, state.rings, state.field), `Saved version ${v.label ?? ""}`, `${state.logo}:front`, false);
    });
    const who = v.by && NAMES[v.by] ? NAMES[v.by] : "";
    return `<div class="ver${currentVersion === doc.id ? " is-current" : ""}" data-ver="${esc(doc.id)}">${card}<b>${esc(v.label || "未命名 Untitled")}</b>` +
      `<small>${fmtTime(v.savedAt)}${who ? " · " + esc(who) : ""}</small><div class="ver__btns"><button type="button" class="btn btn--sm" data-load="${esc(doc.id)}">载入 Load</button>` +
      (CAN_WRITE !== false ? `<button type="button" class="btn btn--sm btn--ghost" data-del="${esc(doc.id)}">删除 Delete</button>` : "") + "</div></div>";
  }).join("");
  // thumbnails carry their own element moves
  el.querySelectorAll<HTMLElement>(".ver").forEach((card) => {
    const doc = VERSIONS.find((d) => d.id === card.dataset.ver), svg = card.querySelector<SVGSVGElement>("svg");
    if (!doc || !svg) return;
    const st = ((doc.data() ?? {}) as VersionDoc).state ?? {};
    withSaved(st, () => applyOverrides(svg, `${state.logo}:front`));
  });
}
async function resolveNames(): Promise<void> {
  if (!USER) return;
  const ids = VERSIONS.map((d) => ((d.data() ?? {}) as VersionDoc).by).filter((x): x is string => !!x);
  if (!ids.length) return;
  try {
    const ps = await USER.profiles([...new Set(ids)].slice(0, 64));
    for (const k of Object.keys(ps)) NAMES[k] = ps[k]?.name || "";
  } catch { /* names stay blank */ }
  renderHistory();
}
async function initStore(): Promise<void> {
  const c = window.claude;
  if (!c || !c.use) { DB = false; renderHistory(); setSaveEnabled(false); return; }
  try {
    const [db, user] = await Promise.all([c.use("db"), c.use("user")]);
    DB = db ?? false; USER = user;
  } catch { DB = false; }
  if (!DB) { renderHistory(); setSaveEnabled(false); setMsg("Saving needs a signed-in view of this page."); return; }
  if (USER) { try { CAN_WRITE = await USER.can("data.write"); } catch { CAN_WRITE = null; } }
  if (CAN_WRITE === false) { setSaveEnabled(false); setMsg("You can view saved versions; saving needs edit access to this page."); }
  const timer = setTimeout(() => {
    const el = document.getElementById("hist");
    if (el && !VERSIONS.length) el.innerHTML = '<p class="hist__empty">Saved versions cannot be reached yet. Your adjustments still work.</p>';
  }, 10000);
  void loadPeople(DB);
  DB.collection("versions").orderBy("savedAt", "desc").limit(60).onSnapshot((snap) => {
    if (!snap.metadata.fromCache) clearTimeout(timer);
    VERSIONS = snap.docs;
    renderHistory();
    void resolveNames();
  }, () => {
    clearTimeout(timer);
    const el = document.getElementById("hist");
    if (el) el.innerHTML = '<p class="hist__empty">Saved versions could not be loaded. Reload the page to try again.</p>';
  });
}
/**
 * The real people live in the published card's own store, never in the source: one document per person in
 * "people", ordered by "order". They replace the samples, unless someone has already started editing.
 */
async function loadPeople(db: ClaudeDb): Promise<void> {
  try {
    const snap = await db.collection("people").orderBy("order").limit(20).get();
    const list = snap.docs.map((d) => d.data() ?? {}).map((r) => ({ ...PEOPLE[0]!, ...Object.fromEntries(Object.entries(r).filter(([k, v]) => k in PEOPLE[0]! && typeof v === "string")) }) as Person);
    if (!list.length) return;
    const untouched = JSON.stringify(state.data) === JSON.stringify(PEOPLE);
    PEOPLE.splice(0, PEOPLE.length, ...list);
    if (untouched) { state.data = PEOPLE.map((p) => ({ ...p })); if (state.person >= state.data.length) state.person = 0; }
    buildPersonSeg(); fillForm(); render(); renderBefore();
  } catch { /* keep the samples */ }
}
async function saveVersion(): Promise<void> {
  if (!DB) return;
  const input = document.getElementById("v-label") as HTMLInputElement | null;
  const label = (input?.value.trim()) || `${LAYOUTS[state.logo].zh} · ${FIELDS[state.field].zh} · ${fmtTime(new Date().toISOString())}`;
  setSaveEnabled(false); setMsg("正在保存 · Saving…");
  try {
    const by = USER ? await USER.id() : null;
    const ref = await DB.collection("versions").add({ label, savedAt: new Date().toISOString(), by, state: savedState() });
    currentVersion = ref.id;
    if (input) input.value = "";
    setMsg(`已保存 · Saved “${label}”.`);
  } catch (e) {
    const code = (e as { code?: string } | null)?.code;
    if (code === "invalid_argument") { CAN_WRITE = false; setMsg("This view cannot save versions. Ask the owner for edit access."); return; }
    setMsg(code === "quota_exceeded" ? "The history is full. Delete some old versions, then save again." : "Could not save just now. Try again in a moment.");
  } finally {
    if (CAN_WRITE !== false) setSaveEnabled(true);
  }
}
async function onHistoryClick(e: Event): Promise<void> {
  const t = e.target as Element;
  const load = t.closest<HTMLElement>("[data-load]"), del = t.closest<HTMLElement>("[data-del]");
  if (load) {
    const d = VERSIONS.find((x) => x.id === load.dataset.load);
    if (!d) return;
    const v = (d.data() ?? {}) as VersionDoc, before = editSnapshot();
    applySaved(v.state ?? {});
    pushUndo(before, `载入版本 Load · ${v.label ?? ""}`);
    currentVersion = d.id;
    syncControls(); fillForm(); onEditChanged(true);
    setMsg(`已载入 · Loaded “${v.label ?? ""}”.`);
  } else if (del && DB) {
    if (del.dataset.armed !== "1") { del.dataset.armed = "1"; del.textContent = "确认删除 · Confirm"; return; }
    try { await DB.collection("versions").doc(del.dataset.del ?? "").delete(); setMsg("已删除 · Deleted."); }
    catch { setMsg("Could not delete that version."); }
  }
}
