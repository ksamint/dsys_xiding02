import { type L, type Locale, LOCALES, matchLocale, tr } from "../shared/l10n";
import { applyLocale, initialLocale, saveLocale } from "../shared/locale-client";
import { loadPhotoSources } from "../shared/photo-client";
import { type Scope, exportNow } from "../shared/export-ui";
import { renderDeck, slideCount, ui } from "./render";
import { copyText, copyUi, introText } from "../shared/plain";

const root = document.getElementById("app");
loadPhotoSources(root);
const eventsUrl = root?.dataset["linkEvents"] ?? "";
const total = slideCount();

let locale: Locale = initialLocale();
let current = fromHash() ?? 1;

function fromHash(): number | null {
  const m = /^#s(\d+)$/.exec(location.hash);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1 && n <= total ? n : null;
}

function draw(): void {
  if (!root) return;
  applyLocale(locale);
  root.innerHTML = renderDeck(locale, current, eventsUrl);
}

/** Move without redrawing: only the current frame and the counter change. */
function show(n: number): void {
  const next = Math.min(Math.max(1, n), total);
  if (next === current || !root) return;
  current = next;
  root.querySelectorAll<HTMLElement>(".frame").forEach((f) => f.classList.toggle("is-current", Number(f.dataset["slide"]) === current));
  const count = root.querySelector("#deck-count");
  if (count) count.textContent = `${String(current).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
  try {
    history.replaceState(null, "", `#s${current}`);
  } catch {
    /* the address stays as it is */
  }
}

function setLocale(next: Locale): void {
  if (next === locale) return;
  locale = next;
  saveLocale(locale);
  draw();
}

function say(message: L | null): void {
  const el = root?.querySelector("#deck-status");
  if (el) el.textContent = message ? tr(message, locale) : "";
}

let exporting = false;

/** The deck as a PDF: in the language on screen, or all three in one zip. The files are made at build time. */
async function exportPdf(scope: Scope): Promise<void> {
  if (exporting) return;
  exporting = true;
  say(ui.pdfBusy);
  const result = await exportNow("pdf", "xiding-introduction", "pdf", scope, locale);
  say(result === "saved" ? ui.pdfSaved : result === "declined" ? ui.pdfDeclined : ui.pdfFailed);
  exporting = false;
}

function fullscreen(): void {
  const el = document.documentElement;
  if (document.fullscreenElement) {
    void document.exitFullscreen().catch(() => undefined);
  } else if (el.requestFullscreen) {
    void el.requestFullscreen().catch(() => undefined);
  }
}

root?.addEventListener("click", (ev) => {
  const target = ev.target instanceof Element ? ev.target : null;
  if (!target) return;
  const lang = target.closest<HTMLElement>("[data-lang]")?.dataset["lang"];
  if (lang) {
    const hit = matchLocale(lang);
    if (hit) {
      setLocale(hit);
      root.querySelector<HTMLElement>(`[data-lang="${locale}"]`)?.focus();
    }
    return;
  }
  const actEl = target.closest<HTMLElement>("[data-act]");
  const act = actEl?.dataset["act"];
  if (act === "prev") show(current - 1);
  else if (act === "next") show(current + 1);
  else if (act === "full") fullscreen();
  else if (act === "copy") void copyText(introText(locale, eventsUrl)).then((ok) => say(ok ? copyUi.copied : copyUi.failed));
  else if (act === "pdf") void exportPdf(actEl?.dataset["scope"] === "all" ? "all" : "current");
  else if (target.closest(".frame.is-current") && getComputedStyle(root.querySelector(".deck__nav") ?? root).display !== "none") {
    // Presenting: a click on the right half goes on, on the left half goes back.
    const frame = target.closest<HTMLElement>(".frame");
    if (frame && ev instanceof MouseEvent) {
      const box = frame.getBoundingClientRect();
      show(ev.clientX - box.left > box.width / 2 ? current + 1 : current - 1);
    }
  }
});

document.addEventListener("keydown", (ev) => {
  if (ev.defaultPrevented || ev.altKey || ev.ctrlKey || ev.metaKey) return;
  const el = ev.target instanceof HTMLElement ? ev.target : null;
  const onButton = el?.tagName === "BUTTON";
  switch (ev.key) {
    case "ArrowRight":
    case "PageDown":
      show(current + 1);
      break;
    case " ":
      if (onButton) return;
      show(current + 1);
      break;
    case "ArrowLeft":
    case "PageUp":
      show(current - 1);
      break;
    case "Home":
      show(1);
      break;
    case "End":
      show(total);
      break;
    case "f":
    case "F":
      fullscreen();
      break;
    case "l":
    case "L":
      // One key walks through the three languages.
      setLocale(LOCALES[(LOCALES.indexOf(locale) + 1) % LOCALES.length] ?? "en");
      break;
    case "p":
    case "P":
      void exportPdf("current");
      break;
    default:
      return;
  }
  ev.preventDefault();
});

let touchX: number | null = null;
root?.addEventListener("touchstart", (ev) => { touchX = ev.touches[0]?.clientX ?? null; }, { passive: true });
root?.addEventListener("touchend", (ev) => {
  const end = ev.changedTouches[0]?.clientX;
  if (touchX === null || end === undefined) return;
  const dx = end - touchX;
  touchX = null;
  if (Math.abs(dx) > 48) show(dx < 0 ? current + 1 : current - 1);
}, { passive: true });

window.addEventListener("hashchange", () => {
  const n = fromHash();
  if (n) show(n);
});

draw();
