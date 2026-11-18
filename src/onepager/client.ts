import { type L, type Locale, matchLocale, tr } from "../shared/l10n";
import { type Scope, exportNow } from "../shared/export-ui";
import { applyLocale, initialLocale, saveLocale } from "../shared/locale-client";
import { renderOnepager, ui } from "./render";
import { copyText, copyUi, introText } from "../shared/plain";

const root = document.getElementById("app");
const eventsUrl = root?.dataset["linkEvents"] ?? "";
let locale: Locale = initialLocale();
let busy = false;

function draw(): void {
  if (!root) return;
  applyLocale(locale);
  root.innerHTML = renderOnepager(locale, eventsUrl);
}

function say(message: L | null): void {
  const el = root?.querySelector("#op-status");
  if (el) el.textContent = message ? tr(message, locale) : "";
}

/** The overview as a PDF or an image: in the language on screen, or all three in one zip. The files are made at build time. */
async function take(kind: "pdf" | "png", scope: Scope): Promise<void> {
  if (busy) return;
  busy = true;
  say(ui.busy);
  const result = await exportNow(kind, "xiding-overview", kind, scope, locale);
  say(result === "saved" ? ui.saved : result === "declined" ? ui.declined : ui.failed);
  busy = false;
}

root?.addEventListener("click", (ev) => {
  const target = ev.target instanceof Element ? ev.target : null;
  if (!target) return;
  const lang = target.closest<HTMLElement>("[data-lang]")?.dataset["lang"];
  if (lang) {
    const hit = matchLocale(lang);
    if (hit && hit !== locale) {
      locale = hit;
      saveLocale(locale);
      draw();
      root.querySelector<HTMLElement>(`[data-lang="${locale}"]`)?.focus();
    }
    return;
  }
  const el = target.closest<HTMLElement>("[data-act]");
  const act = el?.dataset["act"];
  if (act === "copy") void copyText(introText(locale, eventsUrl)).then((ok) => say(ok ? copyUi.copied : copyUi.failed));
  else if (act === "pdf" || act === "png") void take(act, el?.dataset["scope"] === "all" ? "all" : "current");
});

draw();
