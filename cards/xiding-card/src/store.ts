// Saved versions: one document per version in the artifact's shared database (collection "versions").
// A version keeps everything that shapes the card: settings, element moves, layout, colours and the people's lines.

interface SavedState {
  settings: Settings; ov: Record<string, Override>; groups: Record<string, string[][]>; locks: Record<string, boolean>;
  texts: Record<string, string>; extras: Record<string, Extra[]>; refLines: Record<string, RefLines>;
  person: number; inks: 2 | 3; logo: Layout; rings: boolean; field: FieldKey; ground?: GroundKey; groundBack?: GroundKey; data: Person[];
}
interface LogEntry { label: string; at: string }
interface VersionDoc { label?: string; savedAt?: string; updatedAt?: string; by?: string | null; state?: Partial<SavedState>; log?: LogEntry[]; archived?: boolean }
/** The edits made since the version in hand was loaded, saved or updated: written into it by Save or Update. */
let changeLog: LogEntry[] = [];

let DB: ClaudeDb | null | false = null;
let USER: ClaudeUser | null = null;
let CAN_WRITE: boolean | null = null;
let VERSIONS: DbDoc[] = [];
const NAMES: Record<string, string> = {};
let currentVersion: string | null = null;
/** Archived versions are kept but out of sight until asked for. */
let showArchived = false;
const isArchived = (d: DbDoc): boolean => ((d.data() ?? {}) as VersionDoc).archived === true;

function savedState(): SavedState {
  return JSON.parse(JSON.stringify({ settings: S, ov: state.ov, groups: state.groups, locks: state.locks, texts: state.texts, extras: state.extras, refLines: state.refLines, person: state.person, inks: state.inks, logo: state.logo, rings: state.rings, field: state.field, ground: state.ground, groundBack: state.groundBack, data: state.data })) as SavedState;
}
function isLayout(v: unknown): v is Layout { return v === "grid" || v === "seal2" || v === "axis"; }
function isField(v: unknown): v is FieldKey { return typeof v === "string" && v in FIELDS; }
function isGround(v: unknown): v is GroundKey { return typeof v === "string" && v in GROUNDS; }
/** The portrait's choices that are a short list of whole numbers, each held to its list. */
const PT_CHOICES: Record<string, [number, number]> = {
  ptCL3: [0, 1], ptL1Dark: [0, 1], ptQRPos: [0, 1], ptDir: [0, 4], ptGrid: [0, 8], ptL1Style: [0, 4], ptTheme: [0, 3], ptPhotos: [1, 2],
  ptRatio: [0, 3], ptLock: [0, 1], ptAxisStyle: [0, 3], ptLineStyle: [0, 3], ptFootStyle: [-1, 3], ptQRInv: [0, 1],
  ptW: [40, 100], ptH: [60, 160], ptK1: [0.5, 1.6], ptK2: [0.5, 1.6], ptK3: [0.5, 1.6], ptQR: [8, 30], ptName: [2, 14], ptNameX: [-30, 50], ptNameY: [-30, 80],
  ptMark: [4, 60], ptBlock: [0, 100], ptL1: [0, 160], ptL2: [0, 160], ptSplit: [0, 100], ptGap: [0, 4], ptMargin: [2, 12], ptPadY: [0, 30], ptFoot: [0, 160], ptAxis: [0, 100],
};
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
  const range = new Map<string, [number, number]>([...Object.values(SLIDERS).flat().map((r): [string, [number, number]] => [r[0], [r[2], r[3]]]), ...Object.entries(PT_CHOICES)]);
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
  // versions saved before these choices existed had white behind layer 1's text and the QR in a right-hand column
  const LEGACY: Partial<Settings> = { ptL1Dark: 0, ptQRPos: 0, ptDir: 0, ptGrid: 0 };
  if (isRecord(raw.settings)) for (const k of Object.keys(LEGACY) as (keyof Settings)[]) if (raw.settings[k] === undefined) (S as unknown as Record<string, unknown>)[k] = LEGACY[k];
  // directions 2 to 4 were withdrawn; a version that used one opens on the grid
  if (S.ptDir >= 1 && S.ptDir <= 3) S.ptDir = 4;
  state.ov = recordOf(raw.ov, cleanOverride);
  state.groups = recordOf(raw.groups, (g) => (Array.isArray(g) ? g.slice(0, 200).map((x) => strings(x, 200)).filter((x): x is string[] => !!x) : undefined));
  // versions saved before the pillars were grouped take the group; one ungrouped since keeps its empty list
  if (!state.groups[PORTRAIT_KEY]) state.groups[PORTRAIT_KEY] = [["pillar1", "pillar1List", "pillarAxis", "pillar2", "pillar2List"]];
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
  // versions saved before the ground choice existed were all on charcoal
  state.ground = isGround(raw.ground) ? raw.ground : "charcoal";
  state.groundBack = isGround(raw.groundBack) ? raw.groundBack : state.ground;
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
function setMsg(t: string): void {
  const a = document.getElementById("v-msg"), b = document.getElementById("pt-v-msg");
  if (a) a.textContent = t;
  if (b) b.textContent = t.split(" · ")[0]?.replace(/[，,].*$/, "") ?? t;   // the portrait panel keeps it to a few words
}
function setSaveEnabled(on: boolean): void { for (const id of ["v-save", "pt-v-save"]) { const b = document.getElementById(id) as HTMLButtonElement | null; if (b) b.disabled = !on; } renderVersionBar(); }

function renderHistory(): void {
  const el = document.getElementById("hist");
  if (!el) return;
  if (DB === false) { el.innerHTML = '<p class="hist__empty">Saved versions are not available in this view. You can still adjust the card; it just will not be kept.</p>'; return; }
  if (!VERSIONS.length) { el.innerHTML = '<p class="hist__empty">还没有保存的版本 · No saved versions yet. Adjust the card, name the version and press Save version.</p>'; return; }
  const live = VERSIONS.filter((d) => !isArchived(d) || d.id === currentVersion), shelved = VERSIONS.filter((d) => isArchived(d) && d.id !== currentVersion);
  const shown = showArchived ? [...live, ...shelved] : live;
  const more = shelved.length ? `<p class="hist__more"><button type="button" class="pt-link" data-arch-toggle>${showArchived ? "收起已归档 · Hide archived" : `已归档 ${shelved.length} 个 · Show archived`}</button></p>` : "";
  if (!live.length && !showArchived) { el.innerHTML = `<p class="hist__empty">没有当前版本 · All versions are archived.</p>${more}`; return; }
  el.innerHTML = shown.map((doc) => {
    const v = (doc.data() ?? {}) as VersionDoc, st = v.state ?? {};
    const card = withSaved(st, () => {
      const p = state.data[state.person] ?? PEOPLE[0]!;
      return sheet(front(p, state.inks, state.logo, state.rings, state.field), `Saved version ${v.label ?? ""}`, `${state.logo}:front`, false);
    });
    const who = v.by && NAMES[v.by] ? NAMES[v.by] : "", tag = doc.id.replace(/[^A-Za-z0-9]/g, "");
    // the portrait card as it was saved, small, without the picture
    const portrait = st.settings && "ptW" in st.settings ? withSaved(st, () => { const p = state.data[state.person] ?? PEOPLE[0]!; return portraitSvg(p, false, false, "content"); })
      .replace(` data-key="${PORTRAIT_KEY}"`, ` data-vport="1"`).replace(/<image [^>]*\/>/g, "").replace(/id="pclip-/g, `id="pclipV${tag}-`).replace(/url\(#pclip-/g, `url(#pclipV${tag}-`) : "";
    const log = v.log ?? [], last = log[log.length - 1], cur = currentVersion === doc.id;
    const pending = cur && changeLog.length ? `<small class="ver__pending">未写入的修改 ${changeLog.length} 处 · ${changeLog.length} change${changeLog.length === 1 ? "" : "s"} not yet in this version</small>` : "";
    const logHtml = log.length ? `<details class="ver__log"><summary>修改记录 · ${log.length} change${log.length === 1 ? "" : "s"}${last ? ` · 最近 ${esc(last.label)}` : ""}</summary><ol>${[...log].reverse().slice(0, 60).map((l) => `<li><span>${esc(l.label)}</span><small>${fmtTime(l.at)}</small></li>`).join("")}</ol></details>` : "";
    const arch = v.archived === true;
    return `<div class="ver${cur ? " is-current" : ""}${arch ? " is-archived" : ""}" data-ver="${esc(doc.id)}"><div class="ver__thumbs">${card}${portrait}</div><b>${esc(v.label || "未命名 Untitled")}</b>` +
      `<small>${fmtTime(v.savedAt)}${v.updatedAt ? ` · 更新 ${fmtTime(v.updatedAt)}` : ""}${who ? " · " + esc(who) : ""}</small>${pending}${logHtml}<div class="ver__btns"><button type="button" class="btn btn--sm" data-load="${esc(doc.id)}">载入 Load</button>` +
      (CAN_WRITE !== false ? `<button type="button" class="btn btn--sm btn--ghost" data-upd="${esc(doc.id)}" title="Write the card as it is now into this version">更新 Update</button><button type="button" class="btn btn--sm btn--ghost" data-arch="${esc(doc.id)}" data-on="${arch ? "0" : "1"}">${arch ? "取回 Restore" : "归档 Archive"}</button>` +
      (arch ? `<button type="button" class="btn btn--sm btn--ghost" data-del="${esc(doc.id)}">删除 Delete</button>` : "") : "") + "</div></div>";
  }).join("") + more;
  // thumbnails carry their own element moves
  el.querySelectorAll<HTMLElement>(".ver").forEach((card) => {
    const doc = VERSIONS.find((d) => d.id === card.dataset.ver), svg = card.querySelector<SVGSVGElement>("svg");
    if (!doc || !svg) return;
    const st = ((doc.data() ?? {}) as VersionDoc).state ?? {};
    withSaved(st, () => applyOverrides(svg, `${state.logo}:front`));
    const ps = card.querySelector<SVGSVGElement>("svg[data-vport]");
    if (ps) withSaved(st, () => ps.querySelectorAll<SVGGElement>("g[data-el]").forEach((g) => { if (overrideOf(PORTRAIT_KEY, g.dataset.el ?? "").hidden) g.style.display = "none"; }));
  });
  renderVersionBar();
}
/** The Update buttons and the line under them: which version is in hand and what has changed since. */
function renderVersionBar(): void {
  const doc = currentVersion ? VERSIONS.find((d) => d.id === currentVersion) : null, v = (doc?.data() ?? {}) as VersionDoc;
  const label = doc ? v.label || "未命名" : "";
  const pb = document.getElementById("pt-v-update") as HTMLButtonElement | null, n = changeLog.length;
  if (pb) {
    pb.hidden = DB === false || CAN_WRITE === false;
    pb.disabled = !!doc && !n;
    pb.textContent = n ? `保存 · ${n}` : "保存";
    pb.title = doc ? `Save into “${label}”` : "Save as a new version";
  }
  const st = document.getElementById("pt-v-last");
  if (st) st.textContent = doc ? `${label}${n ? ` · ${n} 处未保存` : " · 已保存"}` : n ? "未保存" : "";
  const sa = document.getElementById("pt-v-saveas");
  if (sa) sa.hidden = DB === false || CAN_WRITE === false;
  for (const id of ["v-update"]) {
    const b = document.getElementById(id) as HTMLButtonElement | null;
    if (!b) continue;
    b.hidden = !doc || CAN_WRITE === false || DB === false;
    b.disabled = !changeLog.length;
    b.textContent = doc ? `更新当前版本 · Update “${label}”${changeLog.length ? `（${changeLog.length}）` : ""}` : "更新当前版本 · Update";
  }
  const last = changeLog[changeLog.length - 1];
  for (const id of ["v-last"]) {
    const el = document.getElementById(id);
    if (el) el.textContent = last ? `上次修改 · Last change: ${last.label} · ${fmtTime(last.at)}${doc ? "" : " · 尚未保存为版本 · not in a version yet"}` : doc ? `当前版本 · In hand: “${label}”，无未写入的修改 · nothing to update` : "";
  }
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
  if (!c || !c.use) { DB = false; renderHistory(); setSaveEnabled(false); watchStructures(); return; }
  try {
    const [db, user] = await Promise.all([c.use("db"), c.use("user")]);
    DB = db ?? false; USER = user;
  } catch { DB = false; }
  if (!DB) { renderHistory(); setSaveEnabled(false); setMsg("Saving needs a signed-in view of this page."); watchStructures(); return; }
  if (USER) { try { CAN_WRITE = await USER.can("data.write"); } catch { CAN_WRITE = null; } }
  if (CAN_WRITE === false) { setSaveEnabled(false); setMsg("You can view saved versions; saving needs edit access to this page."); }
  const timer = setTimeout(() => {
    const el = document.getElementById("hist");
    if (el && !VERSIONS.length) el.innerHTML = '<p class="hist__empty">Saved versions cannot be reached yet. Your adjustments still work.</p>';
  }, 10000);
  void loadPeople(DB);
  watchStructures();
  void restoreDraft(DB).then(openLatest);
  DB.collection("versions").orderBy("savedAt", "desc").limit(60).onSnapshot((snap) => {
    if (!snap.metadata.fromCache) { clearTimeout(timer); versionsIn = true; }
    VERSIONS = snap.docs;
    renderHistory();
    openLatest();
    void resolveNames();
  }, () => {
    clearTimeout(timer);
    const el = document.getElementById("hist");
    if (el) el.innerHTML = '<p class="hist__empty">Saved versions could not be loaded. Reload the page to try again.</p>';
  });
}
/** With no adjustments of your own to restore, the page opens on the newest version that is not archived and has a portrait card. */
let versionsIn = false, opened = false;
function openLatest(): void {
  if (opened || !draftReady || !versionsIn) return;
  opened = true;
  const dr = pendingDraft;
  pendingDraft = null;
  if (currentVersion || changeLog.length) return;
  const vd = (d: DbDoc): VersionDoc => (d.data() ?? {}) as VersionDoc, stamp = (d: DbDoc): string => vd(d).updatedAt ?? vd(d).savedAt ?? "";
  const inHand = dr?.version ? VERSIONS.find((x) => x.id === dr.version) : undefined;
  // unsaved changes come back, unless the version they were made on has been saved again since
  if (dr?.state && dr.log?.length && !(inHand && stamp(inHand) > (dr.savedAt ?? ""))) {
    applySaved(dr.state);
    currentVersion = inHand ? inHand.id : null;
    changeLog = dr.log;
    syncControls(); fillForm(); render(); renderHistory();
    for (const id of ["v-restored", "pt-v-restored"]) { const b = document.getElementById(id); if (b) b.hidden = false; }
    setMsg(`已恢复未保存的调整 · Restored your unsaved adjustments (${fmtTime(dr.savedAt)}).`);
    return;
  }
  const d = inHand ?? VERSIONS.filter((x) => !isArchived(x) && "ptW" in (vd(x).state?.settings ?? {})).sort((a, b) => stamp(b).localeCompare(stamp(a)))[0];
  if (!d) return;
  applySaved(vd(d).state ?? {});
  currentVersion = d.id; changeLog = [];
  syncControls(); fillForm(); render(); renderHistory();
  setMsg(`已打开 · Opened “${vd(d).label ?? ""}”.`);
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
async function saveVersion(from: "card" | "portrait" = "card"): Promise<void> {
  if (!DB) return;
  const input = document.getElementById(from === "portrait" ? "v-label-pt" : "v-label") as HTMLInputElement | null;
  const ptName = `竖版 · ${PT_LAYOUTS[layoutIndex()]?.zh ?? ""}${S.ptDir === 4 ? ` · ${PT_L1_STYLES[S.ptL1Style]?.zh ?? ""}` : ""} · ${fmtTime(new Date().toISOString())}`;
  const label = (input?.value.trim()) || (from === "portrait" ? ptName : "") || `${LAYOUTS[state.logo].zh} · ${FIELDS[state.field].zh}${state.ground === "charcoal" && state.groundBack === "charcoal" ? "" : " · " + GROUNDS[state.ground].zh + "/" + GROUNDS[state.groundBack].zh} · ${fmtTime(new Date().toISOString())}`;
  setSaveEnabled(false); setMsg("正在保存 · Saving…");
  try {
    const by = USER ? await USER.id() : null;
    const ref = await DB.collection("versions").add({ label, savedAt: new Date().toISOString(), by, state: savedState(), log: changeLog.slice(-200) });
    currentVersion = ref.id;
    changeLog = [];
    if (input) input.value = "";
    setMsg(`已保存 · Saved “${label}”.`);
    renderHistory(); scheduleDraft();
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
  const load = t.closest<HTMLElement>("[data-load]"), del = t.closest<HTMLElement>("[data-del]"), upd = t.closest<HTMLElement>("[data-upd]");
  if (t.closest("[data-arch-toggle]")) { showArchived = !showArchived; renderHistory(); return; }
  const arch = t.closest<HTMLElement>("[data-arch]");
  if (arch && DB) {
    const d = VERSIONS.find((x) => x.id === arch.dataset.arch), on = arch.dataset.on === "1";
    if (!d) return;
    try { await DB.collection("versions").doc(d.id).set({ ...(d.data() ?? {}), archived: on }); setMsg(on ? "已归档 · Archived." : "已取回 · Restored."); }
    catch { setMsg("Could not change that version."); }
    return;
  }
  if (upd) { await updateVersion(upd.dataset.upd ?? ""); return; }
  if (load) {
    const d = VERSIONS.find((x) => x.id === load.dataset.load);
    if (!d) return;
    const v = (d.data() ?? {}) as VersionDoc, before = editSnapshot();
    applySaved(v.state ?? {});
    pushUndo(before, `载入版本 Load · ${v.label ?? ""}`);
    currentVersion = d.id;
    changeLog = [];
    syncControls(); fillForm(); onEditChanged(true);
    setMsg(`已载入 · Loaded “${v.label ?? ""}”.`);
  } else if (del && DB) {
    if (del.dataset.armed !== "1") { del.dataset.armed = "1"; del.textContent = "确认删除 · Confirm"; return; }
    try { await DB.collection("versions").doc(del.dataset.del ?? "").delete(); setMsg("已删除 · Deleted."); }
    catch { setMsg("Could not delete that version."); }
  }
}

/** Write the card as it is now into a saved version, keeping its name and first date, adding this session's changes
 *  to its log. The version then is the one in hand. */
async function updateVersion(id?: string): Promise<void> {
  const vid = id || currentVersion, doc = vid ? VERSIONS.find((d) => d.id === vid) : null;
  if (!DB || !vid || !doc) { setMsg("先载入或保存一个版本 · Load or save a version first."); return; }
  const old = (doc.data() ?? {}) as VersionDoc, label = old.label || "未命名";
  const fresh = vid === currentVersion ? changeLog : [{ label: `从其他版本写入 · Written from another state`, at: new Date().toISOString() }, ...changeLog];
  setSaveEnabled(false); setMsg(`正在更新 · Updating “${label}”…`);
  try {
    const by = USER ? await USER.id() : old.by ?? null;
    await DB.collection("versions").doc(vid).set({ ...old, by, updatedAt: new Date().toISOString(), state: savedState(), log: [...(old.log ?? []), ...fresh].slice(-200) } as Record<string, unknown>);
    const n = fresh.length;
    currentVersion = vid; changeLog = [];
    setMsg(`已更新 · Updated “${label}”${n ? `，写入 ${n} 处修改 · ${n} change${n === 1 ? "" : "s"} recorded` : ""}.`);
    scheduleDraft();
  } catch (e) {
    const code = (e as { code?: string } | null)?.code;
    setMsg(code === "invalid_argument" || code === "permission_denied" ? "This view cannot update versions. Ask the owner for edit access." : "Could not update just now. Try again in a moment.");
  } finally {
    if (CAN_WRITE !== false) setSaveEnabled(true);
    renderHistory();
  }
}

// ---- your last adjustments, remembered: a private draft for each person who opens the page ----
// Saved under data/users/<your id> (only you can read it) about a second after each change. When the page opens it
// brings back the changes you had not saved yet; with none, it opens the version you had in hand as it is now saved.
interface DraftDoc { state?: Partial<SavedState>; version?: string | null; log?: LogEntry[]; savedAt?: string }
let draftTimer: number | undefined, draftReady = false, UID: string | null = null, pendingDraft: DraftDoc | null = null;
const draftColl = (db: ClaudeDb): DbCollection | null => UID ? db.collection(`data/users/${UID}`) : null;
function scheduleDraft(): void {
  if (!DB || !draftReady || !UID) return;
  if (draftTimer !== undefined) clearTimeout(draftTimer);
  draftTimer = window.setTimeout(() => {
    const c = DB ? draftColl(DB) : null;
    if (!c) return;
    void c.doc("draft").set({ savedAt: new Date().toISOString(), version: currentVersion, log: changeLog.slice(-200), state: savedState() }).catch(() => { /* the card still works */ });
  }, 1200);
}
async function restoreDraft(db: ClaudeDb): Promise<void> {
  try {
    UID = USER ? await USER.id() : null;
    const c = draftColl(db);
    if (c) {
      const snap = await c.get();
      pendingDraft = (snap.docs.find((x) => x.id === "draft")?.data() ?? null) as DraftDoc | null;
    }
  } catch { /* start from the saved versions */ }
  draftReady = true;
}
/** Drop the restored adjustments: back to the version in hand, or to the defaults. */
function discardDraft(): void {
  const doc = currentVersion ? VERSIONS.find((d) => d.id === currentVersion) : null, before = editSnapshot();
  applySaved(doc ? (((doc.data() ?? {}) as VersionDoc).state ?? {}) : {});
  changeLog = [];
  pushUndo(before, "放弃调整 · Discard adjustments");
  changeLog = [];
  syncControls(); fillForm(); onEditChanged(true);
  for (const id of ["v-restored", "pt-v-restored"]) { const b = document.getElementById(id); if (b) b.hidden = true; }
  setMsg(doc ? "已回到当前版本 · Back to the version in hand." : "已回到默认 · Back to the defaults.");
}
