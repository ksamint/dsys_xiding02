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
/** Put a saved state into `S` and `state`, keeping today's defaults for anything an older version did not save. */
function applySaved(v: Partial<SavedState>): void {
  const s: Partial<Settings> = v.settings ?? {};
  (Object.keys(DEFAULTS) as (keyof Settings)[]).forEach((k) => {
    const val = s[k];
    (S as unknown as Record<string, unknown>)[k] = val ?? DEFAULTS[k];
  });
  state.ov = v.ov && typeof v.ov === "object" ? { ...v.ov } : {};
  state.groups = v.groups && typeof v.groups === "object" ? { ...v.groups } : {};
  state.locks = v.locks && typeof v.locks === "object" ? { ...v.locks } : {};
  state.texts = v.texts && typeof v.texts === "object" ? { ...v.texts } : {};
  state.extras = v.extras && typeof v.extras === "object" ? { ...v.extras } : {};
  state.refLines = v.refLines && typeof v.refLines === "object" ? { ...v.refLines } : {};
  if (typeof v.person === "number") state.person = v.person;
  if (v.inks === 2 || v.inks === 3) state.inks = v.inks;
  if (isLayout(v.logo)) state.logo = v.logo;
  if (typeof v.rings === "boolean") state.rings = v.rings;
  if (isField(v.field)) state.field = v.field;
  if (Array.isArray(v.data) && v.data.length) state.data = v.data.map((p, i) => ({ ...(PEOPLE[i] ?? PEOPLE[0]!), ...p }));
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
