import { todayAtSite } from "../shared/events";
import { type Locale, matchLocale } from "../shared/l10n";
import { applyLocale, initialLocale, saveLocale } from "../shared/locale-client";
import { loadPhotoSources } from "../shared/photo-client";
import { renderSite } from "./render";
import { copyText, copyUi, introText } from "../shared/plain";
import { tr } from "../shared/l10n";

const root = document.getElementById("app");
loadPhotoSources(root);
const links = { deck: root?.dataset["linkDeck"] ?? "", members: root?.dataset["linkMembers"] ?? "", programmes: root?.dataset["linkProgrammes"] ?? "", events: root?.dataset["linkEvents"] ?? "" };

let locale: Locale = initialLocale();

function draw(): void {
  if (!root) return;
  applyLocale(locale);
  root.innerHTML = renderSite(locale, links, todayAtSite());
}

root?.addEventListener("click", (ev) => {
  const target = ev.target instanceof Element ? ev.target : null;
  if (target?.closest('[data-act="copy"]')) {
    void copyText(introText(locale, links.events)).then((ok) => {
      const out = root.querySelector("#site-status");
      if (out) out.textContent = tr(ok ? copyUi.copied : copyUi.failed, locale);
    });
    return;
  }
  const lang = target?.closest<HTMLElement>("[data-lang]")?.dataset["lang"];
  if (!lang) return;
  const hit = matchLocale(lang);
  if (!hit || hit === locale) return;
  locale = hit;
  saveLocale(locale);
  const y = window.scrollY;
  draw();
  window.scrollTo(0, y);
  root.querySelector<HTMLElement>(`[data-lang="${locale}"]`)?.focus();
});

draw();
