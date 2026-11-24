import assert from "node:assert/strict";
import { test } from "node:test";
import * as content from "../src/shared/content";
import { EVENTS, INTERESTS, KINDS, PLACE } from "../src/shared/events";
import { type L, localeFromTags, matchLocale } from "../src/shared/l10n";
import { PHOTOS } from "../src/shared/photo";

/** Every `L` reachable from a value, with the path that leads to it. */
function collect(value: unknown, path: string, out: { path: string; l: L }[]): void {
  if (!value || typeof value !== "object") return;
  const o = value as Record<string, unknown>;
  if (typeof o["en"] === "string" && typeof o["hant"] === "string" && typeof o["hans"] === "string") {
    out.push({ path, l: o as unknown as L });
    return;
  }
  for (const [k, v] of Object.entries(o)) collect(v, `${path}.${k}`, out);
}

const all: { path: string; l: L }[] = [];
collect(content, "content", all);
collect({ EVENTS, INTERESTS, KINDS, PLACE }, "events", all);
collect(PHOTOS, "photos", all);

// Simplified and Traditional forms of the characters this copy uses most. A Simplified form in Traditional copy
// (or the reverse) is a conversion slip.
const PAIRS = "顶頂 时時 学學 传傳 会會 员員 课課 讲講 这這 个個 们們 处處 两兩 块塊 组組 与與 动動 间間 专專 顾顧 问問 询詢 订訂 场場 务務 办辦 见見 现現 实實 营營 运運 预預 约約 单單 请請 艺藝 术術 赏賞 导導 览覽 团團 队隊 装裝 进進 录錄 读讀 归歸 过過 历曆 对對 选選 为為 师師 书書 记記 点點 庙廟 馆館 报報 满滿 结結 级級 讯訊 试試 页頁 门門 开開 关關 听聽 里裡 应應 库庫 断斷 陪陪";
const SIMPLIFIED_ONLY = PAIRS.split(" ").map((p) => [...p]).filter((p) => p[0] !== p[1]).map((p) => p[0] ?? "").join("");
const TRADITIONAL_ONLY = PAIRS.split(" ").map((p) => [...p]).filter((p) => p[0] !== p[1]).map((p) => p[1] ?? "").join("");

test("every string exists in all three languages", () => {
  assert.ok(all.length > 120, `expected the full copy deck, found ${all.length} strings`);
  for (const { path, l } of all) {
    for (const k of ["en", "hant", "hans"] as const) assert.ok(l[k].trim().length > 0, `${path}.${k} is empty`);
  }
});

test("Traditional copy holds no Simplified forms, and the reverse", () => {
  for (const { path, l } of all) {
    for (const ch of l.hant) assert.ok(!SIMPLIFIED_ONLY.includes(ch), `${path}.hant holds the Simplified form ${ch}: ${l.hant}`);
    for (const ch of l.hans) assert.ok(!TRADITIONAL_ONLY.includes(ch), `${path}.hans holds the Traditional form ${ch}: ${l.hans}`);
  }
});

test("the voice rules hold: no exclamation marks, no emoji", () => {
  for (const { path, l } of all) {
    for (const k of ["en", "hant", "hans"] as const) {
      assert.ok(!/[!！]/.test(l[k]), `${path}.${k} has an exclamation mark`);
      assert.ok(!/\p{Extended_Pictographic}/u.test(l[k]), `${path}.${k} has an emoji`);
    }
  }
});

test("Traditional copy quotes with 「」 and Simplified with “”", () => {
  for (const { path, l } of all) {
    assert.ok(!/[“”]/.test(l.hant), `${path}.hant uses “”`);
    assert.ok(!/[「」]/.test(l.hans), `${path}.hans uses 「」`);
  }
});

test("the architecture is 1 who we are, 2 what we do (the brands), 3 how we do it (the pillars), X the Xiding ecosystem", () => {
  // The words of 1, 3 and X are being redrafted (owner, 2026-11-19): their slots hold TBD; the shape stays.
  assert.equal(content.overview.figures.map((f) => f.figure).join(""), "123X");
  assert.equal(content.brands.items.length, 3);
  assert.deepEqual(content.pillars.items.map((p) => [p.n, p.id, p.ink]), [
    [1, "space", "arts"],
    [2, "courses", "academy"],
    [3, "membership", "lifestyle"],
  ]);
  for (const p of content.pillars.items) assert.equal(p.modules.length, 4, `${p.id} modules`);
  assert.equal(content.values.items.filter((v) => "focus" in v && v.focus).length, 1, "exactly one value is the centre");
  assert.equal(content.ecosystem.members.length, 5);
  assert.equal(content.foundation.more.length, 2);
  const tbd = [content.thesis.line, content.who.verse, content.brands.label, content.pillars.label, content.ecosystem.label, ...content.overview.figures.flatMap((f) => [f.label, f.line]), ...content.pillars.items.flatMap((p) => [p.name, ...p.modules.flatMap((m) => [m.name, m.line])])];
  for (const l of tbd) assert.deepEqual(l, content.TBD, "a redrafted slot shows the placeholder");
  assert.deepEqual([content.TBD.hans, content.TBD.hant, content.TBD.en], ["待填写", "待填寫", "TBD"]);
});

test("a reader's language list picks the right locale", () => {
  assert.equal(localeFromTags(["zh-TW", "en"]), "zh-Hant");
  assert.equal(localeFromTags(["zh-HK"]), "zh-Hant");
  assert.equal(localeFromTags(["zh-Hant-CN"]), "zh-Hant");
  assert.equal(localeFromTags(["zh-CN", "en"]), "zh-Hans");
  assert.equal(localeFromTags(["zh"]), "zh-Hans");
  assert.equal(localeFromTags(["zh-Hans-HK"]), "zh-Hans");
  assert.equal(localeFromTags(["zh-SG"]), "zh-Hans");
  assert.equal(localeFromTags(["en-GB", "zh-CN"]), "en");
  assert.equal(localeFromTags(["fr-FR", "zh-TW"]), "zh-Hant");
  assert.equal(localeFromTags(["ja-JP"]), "en");
  assert.equal(localeFromTags([]), "en");
  assert.equal(matchLocale("ZH_tw"), "zh-Hant");
  assert.equal(matchLocale("de"), null);
});

test("the brands, as the public introduction sets them: 西顶文化 over 西顶艺术, 西顶新知 and 西顶时光", () => {
  const { brand, brands } = content;
  assert.deepEqual([brand.org.hans, brand.org.hant, brand.org.en], ["西顶文化", "西頂文化", "Xiding"]);
  assert.deepEqual(
    brands.items.map((b) => [b.id, b.name.hans, b.name.hant, b.name.en, b.latin]),
    [
      ["arts", "西顶艺术", "西頂藝術", "Xiding Arts", "XIDING ARTS"],
      ["academy", "西顶新知", "西頂新知", "Xiding Insights", "XIDING INSIGHTS"],
      ["lifestyle", "西顶时光", "西頂時光", "Xiding Lifestyle", "XIDING LIFESTYLE"],
    ],
  );
  assert.deepEqual([brand.tagline.hans, brand.tagline.en], ["艺术 · 教育 · 生活方式", "Art · Education · Lifestyle"]);
  assert.deepEqual(brands.items.map((b) => b.field), ["ART / CULTURE", "EDUCATION / LEARNING", "LIFESTYLE / MEMBERSHIP"]);
  for (const b of brands.items) {
    assert.equal(b.services.length, 3, `${b.id}: three services`);
    assert.equal(b.lines.length, 3, `${b.id}: three lines`);
    assert.ok(b.lines[2].hans.endsWith("。") && b.lines[0].hans.endsWith("，"), `${b.id}: one sentence over three lines`);
  }
  assert.deepEqual(brands.items.map((b) => b.services.map((s) => s.hans).join("·")), ["艺术策展·品牌共创·私享定制", "课程研修·战略咨询·人才发展", "会员生活·品质社交·精致体验"]);
});
