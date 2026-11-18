/** Three locales, one string type. Every piece of copy is an `L`, so a missing translation cannot compile. */
export type Locale = "en" | "zh-Hant" | "zh-Hans";

export const LOCALES: readonly Locale[] = ["en", "zh-Hant", "zh-Hans"];

export interface L {
  readonly en: string;
  readonly hant: string;
  readonly hans: string;
}

/** English, Traditional Chinese, Simplified Chinese: always in that order. */
export const t = (en: string, hant: string, hans: string): L => ({ en, hant, hans });

export function tr(l: L, locale: Locale): string {
  if (locale === "en") return l.en;
  return locale === "zh-Hant" ? l.hant : l.hans;
}

/** One BCP 47 tag to a supported locale, or null when the language is neither English nor Chinese. */
export function matchLocale(tag: string): Locale | null {
  const s = tag.trim().toLowerCase().replace(/_/g, "-");
  if (s === "en" || s.startsWith("en-")) return "en";
  if (s === "zh" || s.startsWith("zh-")) {
    if (/-hans(-|$)/.test(s)) return "zh-Hans";
    if (/-hant(-|$)/.test(s)) return "zh-Hant";
    return /-(tw|hk|mo)(-|$)/.test(s) ? "zh-Hant" : "zh-Hans";
  }
  return null;
}

/** The first supported language in the reader's preference list; English when none matches. */
export function localeFromTags(tags: readonly string[]): Locale {
  for (const tag of tags) {
    const hit = matchLocale(tag);
    if (hit) return hit;
  }
  return "en";
}

export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
