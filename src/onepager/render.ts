import { brand, brands, closing, ecosystem, foundation, pillars, thesis, who } from "../shared/content";
import { type Locale, esc, t, tr } from "../shared/l10n";
import { exportGroup } from "../shared/export-ui";
import { langSwitch } from "../shared/lang-switch";
import { qrSvg } from "../shared/qr";
import { lockupSvg, markSvg } from "../shared/mark";
import { systemHtml } from "../shared/system";
import { brandPairHtml } from "../shared/brand-pair";
import { copyButton } from "../shared/plain";

/* The overview on one portrait page (A4): the whole 1 – 2 – 3 – X architecture, to share as a PDF or an image.
   Laid out at 794 × 1123 (A4 at 96 dpi); every length scales with the page, as the slides do. */

export const ui = {
  overview: t("Overview", "概覽", "概览"),
  pdf: t("Export PDF", "匯出 PDF", "导出 PDF"),
  png: t("Save image", "儲存圖片", "保存图片"),
  busy: t("Preparing the file", "正在準備檔案", "正在准备文件"),
  saved: t("Saved", "已儲存", "已保存"),
  declined: t("Nothing was saved", "沒有儲存", "没有保存"),
  failed: t("The file could not be prepared", "檔案沒有準備好", "文件没有准备好"),
};

const key = (locale: Locale): "en" | "hant" | "hans" => (locale === "en" ? "en" : locale === "zh-Hant" ? "hant" : "hans");

function head(figure: string, label: string): string {
  return `<div class="op-head"><span class="op-fig">${figure}</span><span class="op-label">${label}</span></div>`;
}

/** The page itself, as it prints. */
export function sheet(locale: Locale, eventsUrl = ""): string {
  const plates = pillars.items.map((p) => `<div class="op-plate xd-ink--${p.ink}"><span>${p.n}</span><b>${tr(p.name, locale)}</b></div>`).join("");
  const qr = eventsUrl
    ? `<a class="op-qr" href="${esc(eventsUrl)}" target="_blank" rel="noopener">${qrSvg(eventsUrl, tr(closing.events, locale))}<span>${tr(closing.events, locale)}</span></a>`
    : "";
  const where = closing.headline[key(locale)].map((l) => `<span>${l}</span>`).join("");
  return `<article class="sheet" aria-label="${esc(`${tr(brand.name, locale)} ${tr(ui.overview, locale)}`)}">
<header class="op-top"><div class="op-top__field" aria-hidden="true">${markSvg({ style: "ring" })}</div><div class="op-top__id"><h1 class="op-top__lockup">${lockupSvg({ title: tr(brand.name, locale) })}</h1><p class="op-top__line">${tr(thesis.line, locale)}</p></div></header>
<section class="op-two">
<div class="op-cell">${head("1", tr(who.label, locale))}<h2 class="op-name">${tr(brand.name, locale)}</h2><p class="op-verse">${tr(who.verse, locale)}</p></div>
<div class="op-cell">${head("2", tr(brands.label, locale))}${brandPairHtml(locale)}</div>
</section>
<section class="op-three">${head("3", tr(pillars.label, locale))}<div class="op-plates">${plates}</div></section>
<section class="op-x"><div class="op-x__head">${head("X", tr(ecosystem.label, locale))}<p class="op-x__line">${tr(foundation.native, locale)}</p></div>${systemHtml(locale)}</section>
<footer class="op-foot"><div class="op-where"><p>${where}</p><p class="op-web">${brand.web}</p></div>${qr}</footer>
</article>`;
}

/** The page on screen: the sheet, and a bar to switch language and take the file away. */
export function renderOnepager(locale: Locale, eventsUrl = ""): string {
  return `<main class="op-stage"><div class="op-frame">${sheet(locale, eventsUrl)}</div></main>
<footer class="op-bar"><output class="op-status" id="op-status" aria-live="polite"></output>${langSwitch(locale)}${copyButton(locale)}${exportGroup("pdf", ui.pdf, locale)}${exportGroup("png", ui.png, locale)}</footer>`;
}
