import { type Locale, localeFromTags, matchLocale } from "./l10n";

const KEY = "xiding.locale";

/** `?lang=` first (a link can open a page in one language), then the reader's own saved choice, then the browser's
    language list. When the reader switches, saveLocale drops `?lang=` from the address, so their choice stays. */
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
  try {
    const url = new URL(location.href);
    if (url.searchParams.has("lang")) {
      url.searchParams.delete("lang");
      history.replaceState(history.state, "", url.toString());
    }
  } catch {
    /* a frame that cannot change its address keeps it */
  }
}

export function applyLocale(locale: Locale): void {
  document.documentElement.lang = locale;
}
