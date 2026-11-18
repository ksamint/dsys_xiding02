import { type Locale, localeFromTags, matchLocale } from "./l10n";

const KEY = "xiding.locale";

/** A reader's own choice wins, then `?lang=`, then the browser's language list. */
export function initialLocale(): Locale {
  try {
    const fromQuery = new URLSearchParams(location.search).get("lang");
    const hit = fromQuery ? matchLocale(fromQuery) : null;
    if (hit) return hit;
  } catch {
    /* no query string in this frame */
  }
  try {
    const saved = localStorage.getItem(KEY);
    const hit = saved ? matchLocale(saved) : null;
    if (hit) return hit;
  } catch {
    /* storage is blocked: fall through to the browser's languages */
  }
  const tags = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || "en"];
  return localeFromTags(tags);
}

export function saveLocale(locale: Locale): void {
  try {
    localStorage.setItem(KEY, locale);
  } catch {
    /* the choice lasts for this visit only */
  }
}

export function applyLocale(locale: Locale): void {
  document.documentElement.lang = locale;
}
