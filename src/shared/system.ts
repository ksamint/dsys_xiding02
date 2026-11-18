import { ecosystem, foundation, pillars, system } from "./content";
import { type L, type Locale, tr } from "./l10n";

/* X as one picture, after the design system's 一底三柱: the people of the ecosystem across the top, the three pillars
   standing with their four modules each, and the foundation, 真知 and 范式, as the base they all stand on. */

function label(row: { name: L }, locale: Locale): string {
  return `<div class="sys__label"><b>${tr(row.name, locale)}</b></div>`;
}

export function systemHtml(locale: Locale, withSolutions = true): string {
  const people = ecosystem.members.map((m) => `<span><i class="sys__dot"></i>${tr(m, locale)}</span>`).join("");
  const cols = pillars.items
    .map((p) => {
      const mods = p.modules.map((m) => `<li>${tr(m.name, locale)}</li>`).join("");
      return `<div class="sys__col"><div class="sys__plate xd-ink--${p.ink}"><b>${p.n}</b><span>${tr(p.name, locale)}</span></div><ul>${mods}</ul></div>`;
    })
    .join("");
  const half = (w: { name: L; line: L }): string => `<div class="sys__half"><b>${tr(w.name, locale)}</b><span>${tr(w.line, locale)}</span></div>`;
  return `<div class="sys">
<div class="sys__row sys__row--eco">${label(system.eco, locale)}<div class="sys__eco">${people}</div></div>
${withSolutions ? `<div class="sys__row sys__row--sol">${label(system.solutions, locale)}<div class="sys__cols">${cols}</div></div>` : ""}
<div class="sys__row sys__row--base">${label(system.base, locale)}<div class="sys__base"><div class="sys__base-top">${half(foundation.truth)}${half(foundation.paradigm)}${half(foundation.platform)}</div><div class="sys__base-more">${foundation.more.map((m) => `<span>${tr(m, locale)}</span>`).join("")}</div></div></div>
</div>`;
}
