import { thesis } from "./content";
import { type Locale, tr } from "./l10n";

/** The opening, and nothing else: 西顶, then its one line (being redrafted). */
export function thesisHtml(locale: Locale, tag: "h1" | "h2" = "h2"): string {
  return `<div class="st"><${tag} class="st__name">${tr(thesis.name, locale)}</${tag}><p class="st__line">${tr(thesis.line, locale)}</p></div>`;
}
