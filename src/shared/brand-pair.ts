import { brands } from "./content";
import { type Locale, tr } from "./l10n";

/** 西顶艺术 | 西顶学院 | 西顶时光: the brands side by side, a hairline between them, each with its name in the other script beneath. */
export function brandPairHtml(locale: Locale): string {
  const items = brands.items
    .map((b) => `<div class="bp__item"><span class="bp__name">${tr(b.name, locale)}</span><span class="bp__alt">${locale === "en" ? b.name.hans : b.latin}</span></div>`)
    .join("");
  return `<div class="bp">${items}</div>`;
}
