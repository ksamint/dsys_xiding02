import { type L, type Locale, t, tr } from "./l10n";
import type { Ink } from "./content";
import type { EventKind, InterestId } from "./ontology";
import { ACTIVITIES, TAGS } from "./catalog";

/* The calendar of programmes and activities.
   Drawn from the activities in catalog.ts, the one list every page reads. Every entry is a SAMPLE, marked as such
   wherever it is shown, until the member service serves real sessions from the one source of truth. */

export type { EventKind, InterestId } from "./ontology";

export interface CalEvent {
  readonly id: string;
  /** Local date at 西顶庙, YYYY-MM-DD. */
  readonly date: string;
  /** Local start time, HH:MM. */
  readonly time: string;
  readonly kind: EventKind;
  readonly title: L;
  readonly tags: readonly InterestId[];
  readonly full?: boolean;
  readonly sample: boolean;
}

export const KINDS: Readonly<Record<EventKind, { name: L; ink: Ink }>> = {
  /* The three pillars, in their order and inks: 1 space, 2 courses, 3 membership. */
  space: { name: t("Space × Events", "空間 × 活動", "空间 × 活动"), ink: "mei" },
  academy: { name: t("Courses × Services", "課程 × 服務", "课程 × 服务"), ink: "zhi" },
  member: { name: t("Members × Tailor-made", "會員 × 訂製", "会员 × 定制"), ink: "li" },
};

/** The interests a member can choose: the tags, from the one list in catalog.ts. */
export const INTERESTS: Readonly<Record<InterestId, L>> = Object.fromEntries(TAGS.map((tag) => [tag.id, tag.name])) as Record<InterestId, L>;

export const INTEREST_IDS = Object.keys(INTERESTS) as InterestId[];

export const PLACE = t("西顶庙", "西頂廟", "西顶庙");

export const EVENTS: readonly CalEvent[] = ACTIVITIES.map((a) => ({
  id: a.id,
  date: a.date,
  time: a.time,
  kind: a.pillar,
  title: a.title,
  tags: a.tags,
  ...(a.registration.taken >= a.registration.capacity ? { full: true } : {}),
  sample: a.sample,
}));

const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTHS_ZH = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];
const DAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_ZH = ["日", "一", "二", "三", "四", "五", "六"];

export interface DateParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  /** 0 is Sunday. */
  readonly weekday: number;
}

export function dateParts(date: string): DateParts {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) throw new Error(`Bad date: ${date}`);
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return { year, month, day, weekday };
}

export function monthKey(date: string): string {
  return date.slice(0, 7);
}

export function monthName(key: string, locale: Locale): string {
  const { year, month } = dateParts(`${key}-01`);
  const i = month - 1;
  if (locale === "en") return `${MONTHS_EN[i] ?? ""} ${year}`;
  return `${year} 年${MONTHS_ZH[i] ?? ""}`;
}

export function weekdayName(date: string, locale: Locale): string {
  const { weekday } = dateParts(date);
  if (locale === "en") return DAYS_EN[weekday] ?? "";
  return `${locale === "zh-Hant" ? "週" : "周"}${DAYS_ZH[weekday] ?? ""}`;
}

/** "Sat 14 Nov, 15:00" or "11 月 14 日 周六 15:00". */
export function whenLine(e: CalEvent, locale: Locale): string {
  const { month, day } = dateParts(e.date);
  if (locale === "en") return `${weekdayName(e.date, locale)} ${day} ${(MONTHS_EN[month - 1] ?? "").slice(0, 3)}, ${e.time}`;
  return `${month} 月 ${day} 日 ${weekdayName(e.date, locale)} ${e.time}`;
}

/** The date `n` days after `date` (before, when `n` is negative). */
export function addDays(date: string, n: number): string {
  const { year, month, day } = dateParts(date);
  return new Date(Date.UTC(year, month - 1, day + n)).toISOString().slice(0, 10);
}

/** The Monday of the week `date` falls in: weeks at Xiding run Monday to Sunday. */
export function mondayOf(date: string): string {
  const { weekday } = dateParts(date);
  return addDays(date, -((weekday + 6) % 7));
}

/** Minutes since midnight at 西顶庙 (UTC+8). */
export function minutesAtSite(now: Date = new Date()): number {
  const d = new Date(now.getTime() + 8 * 3600 * 1000);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

/** Today's date at 西顶庙 (UTC+8), as YYYY-MM-DD. */
export function todayAtSite(now: Date = new Date()): string {
  return new Date(now.getTime() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

export function upcoming(today: string, events: readonly CalEvent[] = EVENTS): CalEvent[] {
  return events.filter((e) => e.date >= today).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}

export function eventTitle(e: CalEvent, locale: Locale, sampleWord: L): string {
  const title = tr(e.title, locale);
  if (!e.sample) return title;
  return locale === "en" ? `${title} (${tr(sampleWord, locale)})` : `${title}（${tr(sampleWord, locale)}）`;
}

export interface Pick {
  readonly id: string;
  /** The interest that matched, or null when the pick is simply the next on the calendar. */
  readonly because: InterestId | null;
}

/** Three sessions for one member: first those that match what they care about and still have room, then the next on the calendar. */
export function pickFor(interests: readonly InterestId[], today: string, events: readonly CalEvent[] = EVENTS, count = 3): Pick[] {
  const open = upcoming(today, events).filter((e) => !e.full);
  const picks: Pick[] = [];
  for (const e of open) {
    const hit = e.tags.find((tag) => interests.includes(tag));
    if (hit && picks.length < count) picks.push({ id: e.id, because: hit });
  }
  for (const e of open) {
    if (picks.length >= count) break;
    if (!picks.some((p) => p.id === e.id)) picks.push({ id: e.id, because: null });
  }
  return picks.sort((a, b) => {
    const ea = events.find((e) => e.id === a.id);
    const eb = events.find((e) => e.id === b.id);
    return ((ea?.date ?? "") + (ea?.time ?? "")).localeCompare((eb?.date ?? "") + (eb?.time ?? ""));
  });
}
