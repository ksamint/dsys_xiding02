import { type L, type Locale, esc, t, tr } from "./l10n";

export type Scope = "current" | "all";

const words: Readonly<Record<Scope, L>> = {
  current: t("This language", "當前語言", "当前语言"),
  all: t("All three", "全部語言", "全部语言"),
};

/** "Export PDF: this language | all three". `act` names the file kind the page hands over. */
export function exportGroup(act: string, label: L, locale: Locale): string {
  const buttons = (["current", "all"] as const)
    .map((scope) => `<button type="button" class="xd-export__btn" id="${act}-${scope}" data-act="${act}" data-scope="${scope}">${tr(words[scope], locale)}</button>`)
    .join(`<span class="xd-export__sep" aria-hidden="true">/</span>`);
  return `<div class="xd-export" role="group" aria-label="${esc(tr(label, locale))}"><span class="xd-export__label">${tr(label, locale)}</span>${buttons}</div>`;
}

import { LOCALES } from "./l10n";
import { type Offered, offerFile, offerZip } from "./download";

/** Hands over the file for the language on screen, or all three zipped into one. */
export function exportNow(dir: string, stem: string, ext: string, scope: Scope, locale: Locale): Promise<Offered> {
  if (scope === "current") return offerFile(`${dir}/${stem}-${locale}.${ext}`, `${stem}-${locale}.${ext}`);
  const files = LOCALES.map((l) => ({ path: `${dir}/${stem}-${l}.${ext}`, name: `${stem}-${l}.${ext}` }));
  return offerZip(files, `${stem}-all-languages.zip`);
}
