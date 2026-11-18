import { type Locale, LOCALES, t, tr } from "./l10n";

const LANGUAGE = t("Language", "語言", "语言");
const LABEL: Record<Locale, string> = { en: "EN", "zh-Hant": "繁", "zh-Hans": "简" };

/** Three choices; the chosen one is filled with ink. Each page listens for clicks on `[data-lang]`. */
export function langSwitch(locale: Locale): string {
  const buttons = LOCALES.map(
    (l) => `<button type="button" data-lang="${l}" aria-pressed="${l === locale}" lang="${l}">${LABEL[l]}</button>`,
  ).join("");
  return `<div class="xd-lang" role="group" aria-label="${tr(LANGUAGE, locale)}">${buttons}</div>`;
}
