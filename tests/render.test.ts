import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { renderDeck, slideCount, slides } from "../src/deck/render";
import { LOCALES } from "../src/shared/l10n";
import { PHOTOS, setPhotoSources } from "../src/shared/photo";
import { renderSite } from "../src/site/render";
import { renderOnepager, sheet } from "../src/onepager/render";
import { expandSlideUnits } from "../scripts/build";

/** What a reader would read on one slide: tags, the mark and the picture brief removed. */
function wordsOn(html: string): string[] {
  const text = html
    .replace(/<svg[\s\S]*?<\/svg>/g, " ")
    .replace(/<figcaption>[\s\S]*?<\/figcaption>/g, " ")
    .replace(/<[^>]+>/g, " ");
  return text.split(/\s+/).filter(Boolean);
}

test("the deck has the same twelve slides in every language", () => {
  assert.equal(slideCount(), 12);
  for (const locale of LOCALES) {
    const html = renderDeck(locale, 1);
    assert.equal(slides(locale).length, 12);
    assert.equal((html.match(/class="frame/g) ?? []).length, 12);
    assert.ok(!/undefined|\[object Object\]|NaN/.test(html), `${locale} deck renders every value`);
  }
  assert.deepEqual(slides("en").map((s) => s.tone), ["teal", "night", "paper", "paper", "paper", "paper", "paper", "paper", "paper", "paper", "paper", "teal"]);
});

test("a slide says little: 32 English words or 64 Chinese characters, and a dense slide 100 words or 200 characters", () => {
  assert.deepEqual(slides("en").map((s) => s.dense), [false, false, false, false, false, false, false, true, true, true, true, false]);
  assert.ok(!slides("zh-Hans")[0]?.html.includes("XIDING") && !slides("zh-Hans")[0]?.html.includes("西顶艺术"), "the cover is the mark and 西顶, nothing more");
  slides("en").forEach((s, i) => {
    const n = wordsOn(s.html).length;
    const cap = s.dense ? 100 : 32;
    assert.ok(n <= cap, `English slide ${i + 1} has ${n} words`);
  });
  for (const locale of ["zh-Hant", "zh-Hans"] as const) {
    slides(locale).forEach((s, i) => {
      const n = [...wordsOn(s.html).join("")].length;
      const cap = s.dense ? 200 : 64;
      assert.ok(n <= cap, `${locale} slide ${i + 1} has ${n} characters`);
    });
  }
});

test("each pillar slide shows its four modules, each with a picture, a detail line and a dot on the rail", () => {
  const all = slides("zh-Hans");
  for (const i of [8, 9, 10]) {
    const html = all[i]?.html ?? "";
    assert.equal((html.match(/class="mod"/g) ?? []).length, 4, `slide ${i + 1}`);
    assert.equal((html.match(/data-photo-slot="/g) ?? []).length, 4, `slide ${i + 1}`);
    assert.equal((html.match(/class="mod__line"/g) ?? []).length, 4, `slide ${i + 1}`);
    assert.equal((html.match(/class="mod__dot /g) ?? []).length, 4, `slide ${i + 1}`);
  }
});

test("1 who we are, 2 the brands, 3 the pillars, X the ecosystem with the modules", () => {
  const hans = slides("zh-Hans", "https://example.org/members/#calendar");
  const who = hans[3]?.html ?? "";
  assert.ok(who.includes("待填写") && !who.includes("西顶艺术"), "1 waits for its words, and is Xiding alone");
  const what = hans[5]?.html ?? "";
  assert.ok(what.includes("西顶艺术") && what.includes("西顶学院") && what.includes("西顶时光"), "2 is the three brands");
  const x = hans[7]?.html ?? "";
  assert.ok(x.indexOf("sys__base-top") < x.indexOf("sys__base-more"), "the foundation's second row sits under the three");
  assert.equal((x.match(/<li>/g) ?? []).length, 12, "all twelve modules stand on the base");
  assert.equal((x.match(/class="sys__half"/g) ?? []).length, 3, "the base holds three");
  assert.ok(x.indexOf("sys__row--eco") < x.indexOf("sys__row--sol") && x.indexOf("sys__row--sol") < x.indexOf("sys__row--base"), "ecosystem, then pillars, then the base");
  const close = hans[11]?.html ?? "";
  assert.ok(close.includes("<span>西顶庙</span>"), "the closing names the temple only");
  assert.ok(close.includes('href="https://example.org/members/#calendar"') && close.includes('class="xd-qr"'));
  assert.ok(!slides("en")[11]?.html.includes("xd-qr"), "no address, no QR code");
});

test("the three languages really differ, and each uses its own script", () => {
  const en = renderDeck("en");
  const hant = renderDeck("zh-Hant");
  const hans = renderDeck("zh-Hans");
  // The opening is the name and one line, nothing else; the line waits for its words.
  const opening = (name: string, line: string): string => `<div class="st"><h2 class="st__name">${name}</h2><p class="st__line">${line}</p></div>`;
  assert.ok(en.includes(opening("Xiding", "TBD")));
  assert.ok(hant.includes(opening("西頂", "待填寫")));
  assert.ok(hans.includes(opening("西顶", "待填写")));
  // The three brands sit side by side as 2, each with its name in the other script.
  assert.ok(hans.includes('<span class="bp__name">西顶艺术</span><span class="bp__alt">XIDING ARTS</span>'));
  assert.ok(en.includes('<span class="bp__name">Xiding Academy</span><span class="bp__alt">西顶学院</span>'));
  assert.ok(hans.includes('<span class="bp__name">西顶时光</span><span class="bp__alt">XIDING LIFESTYLE</span>'));
  for (const html of [en, hant, hans]) assert.ok(!/人生|>Life</.test(html), "life is no longer one of the things");
  // The logo is artwork and keeps 西顶 in every language; the words around it follow the reader's script.
  const words = (html: string): string => html.replace(/<svg class="xd-lockup[\s\S]*?<\/svg>/g, "");
  assert.ok(hant.includes("xd-lockup") && hans.includes("xd-lockup"), "the cover carries the master lockup");
  assert.ok(!words(hant).includes("西顶") && words(hant).includes("西頂"));
  assert.ok(!words(hans).includes("西頂") && words(hans).includes("西顶"));
});

test("the site gives each brand its field, its three services and its three lines", () => {
  const hans = renderSite("zh-Hans", { deck: "", members: "" }, "2026-11-13");
  assert.ok(hans.includes("艺术 · 教育 · 生活方式") && hans.includes("旗下设立三大业务品牌"));
  assert.equal((hans.match(/<article class="brand brand--/g) ?? []).length, 3);
  assert.ok(!hans.includes("三个品牌，共享文化底蕴"), "the three-brands strap was removed (owner, 2026-11-18)");
  for (const w of ["ART / CULTURE", "私享定制", "以艺术连接文化，", "战略咨询", "以人才驱动未来。", "会员生活", "以社群丰富生活。"]) assert.ok(hans.includes(w), w);
  const en = renderSite("en", { deck: "", members: "" }, "2026-11-13");
  assert.ok(en.includes("Art · Education · Lifestyle") && en.includes("Bespoke experiences") && en.includes("Community that enriches life."));
  assert.ok(hans.includes("西顶艺术　西顶学院　西顶时光"), "the footer names the three brands");
});

test("lines that were cut stay cut, on the deck and on the site", () => {
  const cut = ["两个牌子", "兩個牌子", "Two brands", "专家方案", "生态与AI原生方案", "根在广仁宫", "根在廣仁宮", "Rooted in", "聚人", "出内容", "出內容", "Gathers the people", "Makes the content", "场地，和在这里办的事", "邀请制，围绕大美艺术", "关于传承和大美的"];
  for (const locale of LOCALES) {
    const pages = [renderDeck(locale), renderSite(locale, { deck: "", members: "" }, "2026-11-13")];
    for (const html of pages) for (const phrase of cut) assert.ok(!html.includes(phrase), `${locale}: "${phrase}" is back`);
  }
});

test("slides are laid out without transforms, which break the page when Chrome prints the PDF", async () => {
  const css = await readFile("src/deck/deck.css", "utf8");
  const rules = css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/text-transform/g, "");
  assert.ok(!/\btransform\s*:|\btranslate\s*:/.test(rules), "use flex or grid to place things on a slide");
});

test("a photo slot names its picture until one is set, then shows it", () => {
  setPhotoSources({});
  const site = renderSite("zh-Hans", { deck: "", members: "" }, "2026-11-13");
  const deck = renderDeck("zh-Hans");
  for (const id of Object.keys(PHOTOS)) {
    if (id === "site-courtyard") continue; // kept for the site's next section
    if (id.startsWith("cover-")) continue; // covers for the H5 app only
    assert.ok(site.includes(`data-photo-slot="${id}"`), `${id} is placed on the site`);
    assert.ok(deck.includes(`data-photo-slot="${id}"`), `${id} is placed in the deck`);
  }
  assert.ok(!site.includes("<img"));
  assert.ok(!/undefined|\[object Object\]|NaN/.test(site));
  setPhotoSources({ "site-gate": "photos/site-gate.jpg", "not-a-slot": "x.jpg" });
  const filled = renderDeck("en");
  assert.ok(filled.includes('<img src="photos/site-gate.jpg"'));
  assert.ok(!filled.includes("x.jpg"));
  setPhotoSources({});
  assert.ok(!renderDeck("en").includes("<img"));
});

test("the site shows a link only when it has somewhere to go", () => {
  const none = renderSite("en", { deck: "", members: "" }, "2026-11-13");
  assert.ok(!none.includes("Member calendar"));
  const both = renderSite("en", { deck: "../deck/index.html", members: "../members/index.html" }, "2026-11-13");
  assert.ok(both.includes('href="../members/index.html"') && both.includes('href="../deck/index.html"'));
});

test("the site's calendar says so when nothing is coming up", () => {
  for (const locale of ["en", "zh-Hant", "zh-Hans"] as const) {
    const html = renderSite(locale, { deck: "", members: "https://example.org/members/#calendar" }, "2099-01-01");
    assert.ok(!html.includes('class="event"') && /這份日曆上暫時沒有場次|这份日历上暂时没有场次|No sessions on this calendar now/.test(html), locale);
  }
});

test("slide units expand to scaled lengths", () => {
  assert.equal(expandSlideUnits("padding: 48u 56u; margin: -24u 0; border: 2u solid;"), "padding: calc(var(--u) * 48) calc(var(--u) * 56); margin: calc(var(--u) * -24) 0; border: calc(var(--u) * 2) solid;");
  assert.equal(expandSlideUnits("color: #628F8A; width: 100cqw; --u: 1px;"), "color: #628F8A; width: 100cqw; --u: 1px;");
});

test("the overview carries the whole architecture on one page, in every language", () => {
  for (const locale of LOCALES) {
    const html = sheet(locale, "https://example.org/members/#calendar");
    assert.ok(!/undefined|\[object Object\]|NaN/.test(html), locale);
    assert.equal((html.match(/class="op-plate /g) ?? []).length, 3, `${locale}: three pillars`);
    assert.equal((html.match(/<li>/g) ?? []).length, 12, `${locale}: twelve modules`);
    assert.ok(html.includes('class="op-top__lockup"') && html.includes('xd-lockup') && html.includes('sys__row--eco') && html.includes('sys__row--sol'), `${locale}: the logo and the ecosystem`);
    assert.ok(!html.includes("op-corner") && !html.includes(">XIDING<") && !html.includes("西顶艺术</text>"), `${locale}: the top is the logo and one line, nothing else`);
    assert.ok(html.includes('class="op-top__line"') && html.includes('class="xd-qr"') && html.includes('class="sys"'));
  }
  assert.ok(sheet("zh-Hans").includes("待填写") && sheet("zh-Hant").includes("西頂藝術"));
  assert.ok(!sheet("en").includes("xd-qr"), "no address, no QR code");
  const page = renderOnepager("zh-Hans");
  for (const id of ["pdf-current", "pdf-all", "png-current", "png-all"]) assert.ok(page.includes(`id="${id}"`), id);
  assert.ok(page.includes("当前语言") && page.includes("全部语言") && page.includes('data-lang="zh-Hant"'));
  assert.ok(renderDeck("en").includes('id="pdf-all"') && renderDeck("en").includes("All three"));
});

test("copy text: the introduction in one language, whole, with nothing cut", async () => {
  const { introText } = await import("../src/shared/plain");
  const marks = { en: ["Xiding\nTBD", "Xiding Arts", "Xiding Lifestyle"], "zh-Hant": ["西頂\n待填寫", "西頂藝術", "西頂時光"], "zh-Hans": ["西顶\n待填写", "西顶艺术", "西顶时光"] } as const;
  for (const [locale, want] of Object.entries(marks) as [keyof typeof marks, readonly string[]][]) {
    const text = introText(locale, "https://example.org/#calendar");
    for (const w of want) assert.ok(text.includes(w), `${locale}: ${w}`);
    assert.ok(text.includes("https://example.org/#calendar"), `${locale}: the events link`);
    assert.ok(!/[ \t]$/m.test(text), `${locale}: no trailing spaces`);
    if (locale === "en") assert.ok(!text.includes("　"), "en: plain spaces only");
    else assert.ok(!/[A-Za-z]{4,}/.test(text.replace(/https?:\S+|xidingmiao\.com|A2A|AI/g, "")), `${locale}: no English words`);
  }
});
