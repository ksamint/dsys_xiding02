import { brand, brands, closing, ecosystem, foundation, overview, type Pillar, pillars, values, who } from "../shared/content";
import { type Locale, esc, t, tr } from "../shared/l10n";
import { exportGroup } from "../shared/export-ui";
import { copyButton } from "../shared/plain";
import { langSwitch } from "../shared/lang-switch";
import { lockupSvg } from "../shared/mark";
import { photo } from "../shared/photo";
import { systemHtml } from "../shared/system";
import { qrSvg } from "../shared/qr";
import { thesisHtml } from "../shared/thesis";
import { brandPairHtml } from "../shared/brand-pair";

/* The official introduction: 1 who we are, 2 what we do, 3 how we do it, X the Xiding ecosystem.
   One image or one field, and one line, per slide. Pure string rendering, so the build can draw the deck ahead of
   time and the browser can redraw it in another language. */

export const ui = {
  prev: t("Previous", "上一頁", "上一页"),
  next: t("Next", "下一頁", "下一页"),
  full: t("Full screen", "全螢幕", "全屏"),
  pdf: t("Export PDF", "匯出 PDF", "导出 PDF"),
  pdfBusy: t("Preparing the PDF", "正在準備 PDF", "正在准备 PDF"),
  pdfSaved: t("PDF saved", "PDF 已儲存", "PDF 已保存"),
  pdfDeclined: t("Nothing was saved", "沒有儲存", "没有保存"),
  pdfFailed: t("The PDF could not be prepared", "PDF 沒有準備好", "PDF 没有准备好"),
  slide: t("Slide", "第", "第"),
};

type Tone = "paper" | "night" | "teal";

interface Slide {
  readonly tone: Tone;
  readonly html: string;
  /** A detail slide may carry more words than the others. */
  readonly dense: boolean;
}

const key = (locale: Locale): "en" | "hant" | "hans" => (locale === "en" ? "en" : locale === "zh-Hant" ? "hant" : "hans");
const two = (n: number): string => String(n).padStart(2, "0");
const lines = (parts: readonly string[]): string => parts.map((p) => `<span>${p}</span>`).join("");

/** The four corners: the name, where we are, the page. Nothing else. */
function corners(n: number, section: string): string {
  return `<span class="corner corner--tl xd-latin">${brand.latin}</span><span class="corner corner--tr">${section}</span><span class="corner corner--bl">${two(n)}</span>`;
}

function cover(locale: Locale): string {
  // The master lockup, as the design system draws it: the mark, 西顶, XIDING and the brand row, each on a row of dots.
  // The logo is artwork: it keeps its own characters in every language.
  return `<div class="lockup"><h1 class="lockup__art">${lockupSvg({ title: tr(brand.name, locale), assemble: true })}</h1></div>`;
}

function statement(locale: Locale, n: number): string {
  return `${corners(n, tr(overview.label, locale))}<div class="center">${thesisHtml(locale)}</div>`;
}

function index(locale: Locale, n: number): string {
  const cols = overview.figures
    .map(
      (f) =>
        `<div class="index__col"><div class="index__n">${f.figure}</div><div><div class="index__w">${tr(f.label, locale)}</div><div class="index__s">${tr(f.line, locale)}</div></div></div>`,
    )
    .join("");
  return `${corners(n, tr(overview.index, locale))}<div class="index" style="--n:${overview.figures.length}">${cols}</div>`;
}

function whoSlide(locale: Locale, n: number): string {
  return `${photo(who.photo, locale, "half half--left")}<div class="panel panel--right">${corners(n, tr(who.label, locale))}<div class="panel__body"><span class="fig">1</span><h2 class="line">${tr(brand.name, locale)}</h2><p class="verse">${tr(who.verse, locale)}</p></div></div>`;
}

function valuesSlide(locale: Locale, n: number): string {
  const words = values.items
    .map((v) => {
      const focus = "focus" in v && v.focus;
      return `<div class="word${focus ? " is-focus" : ""}"><div class="word__name">${tr(v.name, locale)}</div><div class="word__alt">${tr(v.alt, locale)}</div></div>`;
    })
    .join("");
  return `${corners(n, tr(who.label, locale))}<div class="center"><div class="words">${words}</div></div>`;
}

function brandsSlide(locale: Locale, n: number): string {
  return `${corners(n, tr(brands.label, locale))}<div class="what"><span class="fig">2</span>${brandPairHtml(locale)}</div>`;
}

function pillarsSlide(locale: Locale): string {
  const bands = pillars.items
    .map((p) => `<div class="band xd-ink--${p.ink}"><span class="band__n">${p.n}</span><h3 class="band__name">${tr(p.name, locale)}</h3></div>`)
    .join("");
  return `<div class="bands">${bands}</div><span class="corner corner--tr">${tr(pillars.label, locale)}</span>`;
}

function modulesSlide(locale: Locale, n: number, p: Pillar): string {
  const cols = p.modules
    .map(
      (m, i) =>
        `<div class="mod">${photo(m.photo, locale, "mod__photo")}<i class="mod__dot xd-ink--${p.ink}"></i><span class="mod__n">${String(i + 1).padStart(2, "0")}</span><h3 class="mod__name">${tr(m.name, locale)}</h3><p class="mod__line">${tr(m.line, locale)}</p></div>`,
    )
    .join("");
  return `${corners(n, tr(ecosystem.label, locale))}<div class="modhead"><span class="fig">${p.n}</span><h2 class="modhead__name">${tr(p.name, locale)}</h2><span class="modhead__runs">${tr(foundation.runsOn, locale)}</span></div><div class="mods4">${cols}</div>`;
}

function systemSlide(locale: Locale, n: number): string {
  return `${corners(n, tr(ecosystem.label, locale))}<div class="syshead"><span class="fig">X</span><h2 class="syshead__line">${tr(foundation.native, locale)}</h2></div>${systemHtml(locale)}`;
}

function closeSlide(locale: Locale, eventsUrl: string): string {
  const qr = eventsUrl
    ? `<a class="qr" href="${esc(eventsUrl)}" target="_blank" rel="noopener">${qrSvg(eventsUrl, tr(closing.events, locale))}<span class="qr__label">${tr(closing.events, locale)}</span></a>`
    : "";
  return `<div class="lockup lockup--close"><div class="lockup__art">${lockupSvg({ title: tr(brand.name, locale) })}</div><p class="lockup__where">${lines(closing.headline[key(locale)])}</p><p class="lockup__web">${brand.web}</p></div>${qr}`;
}

/** Every slide, in order. */
export function slides(locale: Locale, eventsUrl = ""): Slide[] {
  const out: Slide[] = [];
  const add = (tone: Tone, make: (n: number) => string, dense = false): void => {
    out.push({ tone, html: make(out.length + 1), dense });
  };
  add("teal", () => cover(locale));
  add("night", (n) => statement(locale, n));
  add("paper", (n) => index(locale, n));
  add("paper", (n) => whoSlide(locale, n));
  add("paper", (n) => valuesSlide(locale, n));
  add("paper", (n) => brandsSlide(locale, n));
  add("paper", () => pillarsSlide(locale));
  add("paper", (n) => systemSlide(locale, n), true);
  for (const p of pillars.items) add("paper", (n) => modulesSlide(locale, n, p), true);
  add("teal", () => closeSlide(locale, eventsUrl));
  return out;
}

export function slideCount(): number {
  return slides("en").length;
}

/** The whole deck: every slide framed, then the slim bar that pages through them. `current` is 1-based. */
export function renderDeck(locale: Locale, current = 1, eventsUrl = ""): string {
  const all = slides(locale, eventsUrl);
  const total = all.length;
  const at = Math.min(Math.max(1, current), total);
  const frames = all
    .map((s, i) => {
      const n = i + 1;
      const label = locale === "en" ? `${tr(ui.slide, locale)} ${n} / ${total}` : `${tr(ui.slide, locale)} ${n} / ${total} ${locale === "zh-Hant" ? "頁" : "页"}`;
      return `<section class="frame${n === at ? " is-current" : ""}" id="s${n}" data-slide="${n}" aria-roledescription="slide" aria-label="${esc(label)}"><div class="slide slide--${s.tone}">${s.html}</div></section>`;
    })
    .join("\n");
  return `<main class="deck__stage" id="stage">${frames}</main>
<footer class="deck__bar">
<div class="deck__nav"><button type="button" class="deck__btn" id="deck-prev" data-act="prev">${tr(ui.prev, locale)}</button><output class="deck__count" id="deck-count" aria-live="polite">${two(at)} / ${two(total)}</output><button type="button" class="deck__btn" id="deck-next" data-act="next">${tr(ui.next, locale)}</button></div>
<div class="deck__tools"><output class="deck__status" id="deck-status" aria-live="polite"></output>${langSwitch(locale)}${copyButton(locale)}${exportGroup("pdf", ui.pdf, locale)}<button type="button" class="deck__btn deck__full" id="deck-full" data-act="full">${tr(ui.full, locale)}</button></div>
</footer>`;
}
