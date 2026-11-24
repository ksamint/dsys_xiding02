// History lives in this browser only (localStorage). It may be missing or full; the page works without it.

import type { Look } from "./card.js";

export interface Entry {
  /** XD-0001, given once and never reused, even after a delete. */
  id: string;
  text: string;
  title: string;
  at: number;
  /** The card's adjustments when it was kept. */
  look?: Look;
  tags: string[];
  desc: string;
}

const KEY = "xd-qr-history-v1";
const SEQ_KEY = "xd-qr-seq-v1";
const MAX = 200;

const valid = (e: unknown): e is Entry =>
  !!e && typeof (e as Entry).text === "string" && typeof (e as Entry).title === "string" && typeof (e as Entry).at === "number";

let seq = 0;
function readSeq(list: Entry[]): number {
  let n = 0;
  try {
    n = Number(localStorage.getItem(SEQ_KEY) ?? 0) || 0;
  } catch {
    n = 0;
  }
  for (const e of list) n = Math.max(n, Number(/^XD-(\d+)$/.exec(e.id ?? "")?.[1] ?? 0));
  return n;
}
/** The next ID. The counter lives apart from the list, so a deleted entry's ID is never given again. */
export function nextId(): string {
  seq += 1;
  try {
    localStorage.setItem(SEQ_KEY, String(seq));
  } catch {
    /* kept for this visit */
  }
  return `XD-${String(seq).padStart(4, "0")}`;
}

export function loadHistory(): Entry[] {
  let list: Entry[] = [];
  try {
    const v: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    list = Array.isArray(v) ? v.filter(valid).slice(0, MAX) : [];
  } catch {
    list = [];
  }
  // Entries from before IDs and tags get them now, the oldest first.
  seq = readSeq(list);
  [...list].sort((a, b) => a.at - b.at).forEach((e) => {
    if (!e.id) e.id = nextId();
  });
  return list.map((e) => ({ ...e, tags: Array.isArray(e.tags) ? e.tags.filter((t) => typeof t === "string") : [], desc: typeof e.desc === "string" ? e.desc : "" }));
}

/** Tags from what was typed: split on commas, 、 or spaces; each once, at most 8 of 12 characters. */
export function parseTags(raw: string): string[] {
  const out: string[] = [];
  for (const t of raw.split(/[,，、;；\s]+/)) {
    const tag = t.trim().replace(/^#/, "").slice(0, 12);
    if (tag && !out.includes(tag)) out.push(tag);
    if (out.length === 8) break;
  }
  return out;
}

export function storeHistory(list: Entry[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    /* private mode or full: keep it for this visit */
  }
}

/** Puts the entry on top; the same address appears once and keeps its ID. */
export function remember(list: Entry[], e: Omit<Entry, "id">): Entry[] {
  const old = list.find((x) => x.text === e.text);
  return [{ ...e, id: old?.id ?? nextId() }, ...list.filter((x) => x.text !== e.text)].slice(0, MAX);
}

// Links every browser starts with, newest on top. Each is added once: a deleted one stays deleted, and a link added
// to SEEDS later reaches browsers that already have the others.
const SEED_KEY = "xd-qr-seed-v1"; // the first two, from before seeds were kept one by one
const SEEDS_KEY = "xd-qr-seeds-v2";
interface Seed {
  text: string;
  title?: string;
  look?: Partial<Look>;
}
const SEEDS: Seed[] = [
  { text: "https://example.org/space", title: "扫码登陆", look: { layout: "square", square: "blank", photo: "plaque" } },
  { text: "https://example.org" },
  { text: "https://example.org/show" },
];

/** Adds the seeds this browser has not had yet. `fresh` is the newest one added now, to open on. */
export function withSeeds(list: Entry[]): { list: Entry[]; fresh: Entry | null } {
  let had: string[] = [];
  try {
    had = JSON.parse(localStorage.getItem(SEEDS_KEY) ?? "null") ?? (localStorage.getItem(SEED_KEY) ? SEEDS.slice(1).map((s) => s.text) : []);
    localStorage.setItem(SEEDS_KEY, JSON.stringify(SEEDS.map((s) => s.text)));
  } catch {
    /* no storage: offer them on every visit */
  }
  const now = Date.now();
  const add = SEEDS.filter((s) => !had.includes(s.text));
  if (add.length === 0) return { list, fresh: null };
  const seeds: Entry[] = add.map((s, i) => {
    const old = list.find((e) => e.text === s.text);
    return { id: old?.id ?? nextId(), text: s.text, title: s.title ?? old?.title ?? "", at: now - i, tags: old?.tags ?? [], desc: old?.desc ?? "", look: s.look ? ({ ...old?.look, ...s.look } as Look) : old?.look };
  });
  const texts = add.map((s) => s.text);
  return { list: [...seeds, ...list.filter((e) => !texts.includes(e.text))].slice(0, MAX), fresh: seeds[0] };
}

// ——— What is on the screen now, kept as you work, and the style you set as your own default.

export interface Draft {
  text: string;
  title: string;
  look: Look;
  tags?: string;
  desc?: string;
}
const DRAFT_KEY = "xd-qr-draft-v1";
const DEFAULT_KEY = "xd-qr-default-look-v1";

function read<T>(key: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null") as T | null;
  } catch {
    return null;
  }
}
function write(key: string, v: unknown): boolean {
  try {
    if (v === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(v));
    return true;
  } catch {
    return false;
  }
}

export const loadDraft = () => {
  const d = read<Draft>(DRAFT_KEY);
  return d && typeof d.text === "string" && typeof d.title === "string" && d.look ? d : null;
};
export const storeDraft = (d: Draft) => write(DRAFT_KEY, d);
export const loadDefaultLook = () => read<Look>(DEFAULT_KEY);
export const storeDefaultLook = (l: Look | null) => write(DEFAULT_KEY, l);

/** The entry for this address takes what is on screen now, so history keeps what was last set for it. */
export function withFields(list: Entry[], text: string, f: Partial<Pick<Entry, "look" | "title" | "tags" | "desc">>): Entry[] {
  return list.map((e) => (e.text === text ? { ...e, ...f } : e));
}
