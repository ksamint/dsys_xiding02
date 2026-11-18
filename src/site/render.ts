import { brand, brands, closing, common, ecosystem, foundation, pillars, thesis, values, who } from "../shared/content";
import { EVENTS, KINDS, PLACE, dateParts, eventTitle, upcoming, weekdayName } from "../shared/events";
import { type Locale, esc, t, tr } from "../shared/l10n";
import { langSwitch } from "../shared/lang-switch";
import { lockupSvg, markSvg } from "../shared/mark";
import { photo } from "../shared/photo";
import { systemHtml } from "../shared/system";
import { qrSvg } from "../shared/qr";
import { copyButton } from "../shared/plain";

/* The official website: the same 1 – 2 – 3 – X introduction as the deck, as one quiet page.
   One line and one picture per section; the detail opens only when a reader asks for it. */

export interface SiteLinks {
  readonly deck: string;
  readonly members: string;
  /** Programmes and activities: the full calendar, courses, membership and articles. Empty hides the link. */
  readonly programmes?: string;
  /** Where the QR code for the latest events leads. Empty hides it. */
  readonly events?: string;
}

const ui = {
  nav: {
    who: t("Who we are", "我們是誰", "我们是谁"),
    brands: t("What we do", "我們做什麼", "我们做什么"),
    pillars: t("How we do it", "我們怎麼做", "我们怎么做"),
    ecosystem: t("Ecosystem", "生態", "生态"),
    calendar: t("Calendar", "日曆", "日历"),
  },
  menu: t("Sections", "欄目", "栏目"),
  calendarTitle: t("On the calendar", "日曆上", "日历上"),
  calendarNote: t("By invitation. Sample sessions.", "邀請制。以下為範例場次。", "邀请制。以下为示例场次。"),
  calendarEmpty: t("No sessions on this calendar now. The member calendar has what comes next.", "這份日曆上暫時沒有場次。會員日曆上有接下來的安排。", "这份日历上暂时没有场次。会员日历上有接下来的安排。"),
  openCalendar: t("Member calendar", "會員日曆", "会员日历"),
  openDeck: t("Introduction slides", "介紹簡報", "介绍幻灯片"),
  openProgrammes: t("Courses and activities", "課程與活動", "课程与活动"),
  top: t("Top", "頂部", "顶部"),
};

const key = (locale: Locale): "en" | "hant" | "hans" => (locale === "en" ? "en" : locale === "zh-Hant" ? "hant" : "hans");
const lines = (parts: readonly string[]): string => parts.map((p) => `<span>${p}</span>`).join("");

function eyebrow(figure: string, label: string, id: string): string {
  const f = figure ? `<span class="eyebrow__fig" aria-hidden="true">${figure}</span>` : "";
  return `<div class="eyebrow">${f}<h2 class="xd-whisper" id="${id}-title">${label}</h2></div>`;
}

function header(locale: Locale): string {
  const links = (Object.keys(ui.nav) as (keyof typeof ui.nav)[]).map((k) => `<a href="#${k}">${tr(ui.nav[k], locale)}</a>`).join("");
  const zh = locale === "zh-Hant" ? brand.name.hant : brand.name.hans;
  return `<header class="top"><div class="wrap top__in">
<a class="top__brand" href="#top" aria-label="${tr(brand.name, locale)}">${markSvg({ tight: true })}<b>${zh}</b></a>
<nav class="top__nav" aria-label="${tr(ui.menu, locale)}">${links}</nav>
${langSwitch(locale)}
</div></header>`;
}

function hero(locale: Locale): string {
  return `<section class="hero" id="top">
<div class="hero__field"><h1 class="hero__lockup">${lockupSvg({ title: tr(brand.name, locale), assemble: true })}</h1><p class="hero__line">${tr(thesis.line, locale)}</p></div>
</section>`;
}

function sectionWho(locale: Locale): string {
  const words = values.items
    .map((v) => {
      const focus = "focus" in v && v.focus;
      return `<div class="word${focus ? " is-focus" : ""}"><div class="word__name">${tr(v.name, locale)}</div><div class="word__alt">${tr(v.alt, locale)}</div></div>`;
    })
    .join("");
  return `<section class="sec" id="who" aria-labelledby="who-title"><div class="wrap">
<div class="split">${photo(who.photo, locale)}<div class="split__text">${eyebrow("1", tr(who.label, locale), "who")}<p class="line">${tr(brand.name, locale)}</p><p class="verse">${tr(who.verse, locale)}</p></div></div>
</div>
<div class="wrap values"><div class="words">${words}</div></div>
</section>`;
}

function sectionPillars(locale: Locale): string {
  const bands = pillars.items
    .map((p) => `<a class="band xd-ink--${p.ink}" href="#how-${p.id}"><span class="band__n">${p.n}</span><span class="band__name">${tr(p.name, locale)}</span></a>`)
    .join("");
  return `<section class="sec sec--flush" id="pillars" aria-labelledby="pillars-title">
<div class="wrap">${eyebrow("3", tr(pillars.label, locale), "pillars")}</div>
<div class="bands">${bands}</div>
</section>`;
}

/** 2: what we do, the three brands: each with its field, its three services and its three lines. */
function sectionBrands(locale: Locale): string {
  const n = brands.items.length;
  const items = brands.items
    .map(
      (b, i) => `<article class="brand brand--${b.ink}">
<p class="brand__field"><span>${b.field}</span><span>${i + 1} / ${n}</span></p>
<h3 class="brand__name">${tr(b.name, locale)}</h3>
<p class="brand__latin">${locale === "en" ? b.name.hans : b.latin}</p>
<ul class="brand__services">${b.services.map((s) => `<li>${tr(s, locale)}</li>`).join("")}</ul>
<p class="brand__lines">${b.lines.map((l) => tr(l, locale)).join("<br>")}</p>
</article>`,
    )
    .join("");
  return `<section class="sec" id="brands" aria-labelledby="brands-title"><div class="wrap">
${eyebrow("2", tr(brands.label, locale), "brands")}
<p class="brands__tagline">${tr(brand.tagline, locale)}</p>
<p class="brands__intro">${tr(brands.intro, locale)}</p>
<p class="brands__lead">${tr(brands.lead, locale)}</p>
<div class="brands3">${items}</div>
</div></section>`;
}

/** X: the Xiding ecosystem in one picture, then each pillar's four modules. */
function sectionSystem(locale: Locale): string {
  const blocks = pillars.items
    .map((p) => {
      const mods = p.modules
        .map(
          (m, i) =>
            `<div class="mod">${photo(m.photo, locale, "mod__photo")}<i class="mod__dot xd-ink--${p.ink}"></i><span class="mod__n">${String(i + 1).padStart(2, "0")}</span><h4 class="mod__name">${tr(m.name, locale)}</h4><p class="mod__line">${tr(m.line, locale)}</p></div>`,
        )
        .join("");
      return `<article class="how" id="how-${p.id}"><div class="how__head"><span class="how__n">${p.n}</span><h3 class="line">${tr(p.name, locale)}</h3><span class="xd-whisper how__runs">${tr(foundation.runsOn, locale)}</span></div><div class="mods4">${mods}</div></article>`;
    })
    .join("");
  return `<section class="sec" id="ecosystem" aria-labelledby="ecosystem-title"><div class="wrap">
${eyebrow("X", tr(ecosystem.label, locale), "ecosystem")}
<p class="line">${tr(foundation.native, locale)}</p>
${systemHtml(locale)}
<div class="hows">${blocks}</div>
</div></section>`;
}

function sectionCalendar(locale: Locale, links: SiteLinks, today: string, now?: number): string {
  const next = upcoming(today, EVENTS, now).slice(0, 3);
  const rows = next
    .map((e) => {
      const d = dateParts(e.date);
      const date = locale === "en" ? `${weekdayName(e.date, locale)} ${d.day}.${d.month}` : `${d.month} 月 ${d.day} 日　${weekdayName(e.date, locale)}`;
      return `<div class="event"><span class="event__date">${date}</span><h3 class="event__title">${esc(eventTitle(e, locale, common.sample))}</h3><span class="event__meta">${tr(KINDS[e.kind].name, locale)}　${e.time}　${tr(PLACE, locale)}</span></div>`;
    })
    .join("");
  const members = links.members ? `<a class="more" href="${links.members}">${tr(ui.openCalendar, locale)}</a>` : "";
  const deck = links.deck ? `<a class="more" href="${links.deck}">${tr(ui.openDeck, locale)}</a>` : "";
  const programmes = links.programmes ? `<a class="more" href="${links.programmes}">${tr(ui.openProgrammes, locale)}</a>` : "";
  const qr = links.events ? `<a class="cal__qr" href="${esc(links.events)}" target="_blank" rel="noopener">${qrSvg(links.events, tr(closing.events, locale))}<span class="xd-whisper">${tr(closing.events, locale)}</span></a>` : "";
  return `<section class="sec" id="calendar" aria-labelledby="calendar-title"><div class="wrap narrow cal">
<div class="cal__main">${eyebrow("", tr(ui.calendarTitle, locale), "calendar")}
${next.length ? `<div class="events">${rows}</div>\n<p class="note">${tr(ui.calendarNote, locale)}</p>` : `<p class="note">${tr(ui.calendarEmpty, locale)}</p>`}
<div class="actions">${programmes}${members}${deck}</div></div>
${qr}
</div></section>`;
}

function footer(locale: Locale): string {
  return `<footer class="foot"><div class="foot__field"><div class="foot__mark">${markSvg()}</div><p class="foot__where">${lines(closing.headline[key(locale)])}</p><a class="foot__web" href="https://${brand.web}" target="_blank" rel="noopener">${brand.web}</a></div>
<div class="wrap foot__end"><span>© ${brand.year} ${tr(brand.org, locale)}</span><span>${tr(brand.arts, locale)}　${tr(brand.academy, locale)}　${tr(brand.lifestyle, locale)}</span>${copyButton(locale)}<output class="foot__status" id="site-status" aria-live="polite"></output><a href="#top">${tr(ui.top, locale)}</a></div></footer>`;
}

/** `now`: minutes at the site, so today's sessions that have begun are not offered; the build's first drawing omits it. */
export function renderSite(locale: Locale, links: SiteLinks, today: string, now?: number): string {
  return `${header(locale)}
<main>
${hero(locale)}
${sectionWho(locale)}
${sectionBrands(locale)}
${sectionPillars(locale)}
${sectionSystem(locale)}
${sectionCalendar(locale, links, today, now)}
</main>
${footer(locale)}`;
}
