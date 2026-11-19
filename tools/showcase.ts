/* The 西顶 XIDING showcase: one self-contained HTML page built from design-system/ alone.
   Every value on it is read from the files at build time (tokens.json, the brand book, the IP data in
   the bundle, every component preview and README, every asset), so it always shows what is committed.

     node tools/showcase.ts                 write showcase/index.html (a full document)
     node tools/showcase.ts --check         fail if showcase/index.html differs from a fresh build
     node tools/showcase.ts --artifact F    write the same page as a fragment for publishing as an Artifact
     node tools/showcase.ts --serve [port]  serve it, rebuild on every change under design-system/, reload the browser

   The pre-commit hook in .githooks/ runs the first form on every commit, and `npm run check` runs --check. */
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { createServer, type ServerResponse } from "node:http";
import { existsSync, readFileSync, readdirSync, statSync, watch, writeFileSync, mkdirSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { execFileSync } from "node:child_process";
import { runInNewContext } from "node:vm";
import { markdown, inline, slug } from "./markdown.ts";
import { copiesIn, loadTokens, sameValues, toCSS, type Family, type Token, type Tokens } from "./tokens.ts";

const ROOT = new URL("../", import.meta.url).pathname;
const DS = join(ROOT, "design-system");
const OUT = join(ROOT, "showcase", "index.html");

// ---------- reading the system ----------
interface Pillar { id: string; zh: string; word: string; sentence: string; en: string; line: string; motto: string }
interface Brand { zh: string; en: string; level: string; settled: boolean }
interface Scene { pillar: string; id: string; scenes: string[]; use: string }
interface Art { name: string; label: string }
interface XidingAPI {
  version: string; PILLARS: Pillar[]; LINE: string; ROOT: { zh: string; en: string }; BRANDS: Brand[];
  BRAND_DETAILS: { zh: string; en: string; latin: string; field: string; services: string[]; lines: string[] }[]; TAGLINE: string;
  SCENES: Scene[]; STEPS: string[][]; SITE: string; ADDRESS: string;
  art: { architecture(theme: string): Art; steps(theme: string): Art };
  toSVG(a: Art): string;
  scatter(o: Record<string, unknown>): string;
  mark(o: Record<string, unknown>): string;
}
interface AssetFile { name: string; blob: string; size: number; type: string }
interface Index {
  title: string; namespace: string; groups: string[];
  assetGroups: Record<string, { order: string[]; files: Record<string, AssetFile> }>;
  lastChange?: { by: string; at: string; via?: string; note?: string };
}
interface Card { name: string; group: string; width: number; height: number; html: string; readme: string }

const read = (p: string) => readFileSync(join(DS, p), "utf8");
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function files(dir: string): string[] {
  return readdirSync(dir).sort().flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}

function loadBundle(js: string): XidingAPI {
  const sandbox: { window: { Xiding?: XidingAPI } } = { window: {} };
  runInNewContext(js, sandbox);
  if (!sandbox.window.Xiding) throw new Error("bundle.js did not set window.Xiding");
  return sandbox.window.Xiding;
}

function cards(): Card[] {
  const dir = join(DS, "components");
  return readdirSync(dir).sort().flatMap((name) => {
    const p = join(dir, name, "preview.html");
    if (!existsSync(p)) return [];
    const html = readFileSync(p, "utf8");
    const marker = /^<!-- @dsCard([^>]*)-->/.exec(html)?.[1] ?? "";
    const attr = (k: string) => new RegExp(`${k}=(?:"([^"]*)"|(\\d+))`).exec(marker);
    const r = join(dir, name, "README.md");
    return [{
      name, group: attr("group")?.[1] ?? (name === "Cover" ? "Cover" : "Other"),
      width: Number(attr("width")?.[2] ?? 640), height: Number(attr("height")?.[2] ?? 120),
      html, readme: existsSync(r) ? readFileSync(r, "utf8") : "",
    }];
  });
}

// ---------- colour arithmetic, for the contrast column ----------
function hex(v: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(v.trim());
  const g = m?.[1];
  if (!g) return null;
  const h = g.length === 3 ? g.split("").map((c) => c + c).join("") : g;
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}
function lum(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a: string, b: string): string {
  const x = hex(a), y = hex(b);
  if (!x || !y) return "–";
  const [l1, l2] = [lum(x), lum(y)].sort((p, q) => q - p) as [number, number];
  return ((l1 + 0.05) / (l2 + 0.05)).toFixed(1);
}
function resolver(t: Tokens) {
  const first = t.color.themes[0]?.id ?? "light";
  const byName = new Map(t.color.tokens.map((x) => [x.name, x]));
  const raw = (tok: Token, theme: string): string =>
    typeof tok.value === "string" ? tok.value : (tok.value[theme] ?? tok.value[first] ?? "");
  const resolve = (name: string, theme: string, depth = 0): string => {
    const tok = byName.get(name);
    if (!tok || depth > 16) return "";
    const v = raw(tok, theme);
    const a = /^\{(.+)\}$/.exec(v)?.[1];
    return a !== undefined ? resolve(a, theme, depth + 1) : v;
  };
  return { raw, resolve };
}

// ---------- sections ----------
function hero(X: XidingAPI, idx: Index, t: Tokens, stats: string): string {
  const art = X.scatter({
    width: 1200, height: 300, x: 120, y: 24, size: 252, spread: 0, angle: 8, strays: 0, seed: 21,
    field: { x: 0, y: 0, w: 420, h: 300 }, fieldInk: "#FFFFFF", breathe: false, title: "西顶",
  });
  return `<header class="sc-hero" id="top">
<div class="sc-hero__art">${art}</div>
<div class="sc-hero__words">
  <div class="sc-hero__name"><h1>西顶</h1><span class="sc-latin">XIDING DESIGN SYSTEM</span></div>
  <p class="sc-hero__line xd-vert">${X.LINE.replace(/，/g, "，<br>")}</p>
</div>
<dl class="sc-stats">${stats}</dl>
<p class="sc-hero__note">${esc(t.name)} · 设计系统展示。本页由仓库里的 <code>design-system/</code> 生成：令牌、IP 体系、组件、资产和品牌手册都从文件读出，提交即同步。${idx.lastChange ? ` 最近一次改动：${esc(idx.lastChange.note ?? "")}` : ""}</p>
</header>`;
}

// ---------- the three Xiding introduction pages, built from src/ by `npm run build` ----------
interface PageDef { id: string; dir: string; zh: string; en: string; w: number; h: number; note: string }
const PAGES: PageDef[] = [
  { id: "intro", dir: "deck", zh: "介绍", en: "Introduction", w: 1280, h: 720, note: "12 张横版幻灯片，16:9，三种语言，可导出 PDF。源：src/deck/。" },
  { id: "overview", dir: "onepager", zh: "总览", en: "Overview", w: 794, h: 1123, note: "整个架构在一张 A4 竖版上，可导出 PDF 或图片分享。源：src/onepager/。" },
  { id: "site", dir: "site", zh: "官网", en: "Official site", w: 1280, h: 860, note: "同一套介绍，做成一页滚动阅读。页内链接会切到相应页面。源：src/site/。" },
];
const DIST = join(ROOT, "dist");
function pageFiles(): string[] { return PAGES.map((p) => join(DIST, p.dir, "index.html")); }
function readPages(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of PAGES) {
    const f = join(DIST, p.dir, "index.html");
    if (!existsSync(f)) throw new Error(`dist/${p.dir}/index.html is missing: run \`npm run build\` first`);
    out[p.id] = readFileSync(f, "utf8");
  }
  return out;
}
function pagesSection(): string {
  const tabs = PAGES.map((p, i) => `<button type="button" role="tab" id="pg-tab-${p.id}" aria-controls="pg-panel" aria-selected="${i === 0}" data-page="${p.id}"><b>${esc(p.zh)}</b><span>${esc(p.en)}</span></button>`).join("");
  return `<section class="sc-section" id="pages">
<div class="sc-head"><span class="sc-latin">PAGES</span><h2>页面</h2><p class="sc-lede">西顶的三个介绍页面，由仓库里的 <code>src/</code> 构建（<code>npm run build</code>），在这里现场打开。每页右上角都有自己的语言切换；导出按钮在这里没有文件可下载，请到已发布的页面导出。</p></div>
<div class="sc-pages" role="tablist" aria-label="页面">${tabs}</div>
${PAGES.map((p, i) => `<p class="sc-pagenote" data-note="${p.id}"${i === 0 ? "" : " hidden"}>${esc(p.note)} <span class="sc-muted">${p.w} × ${p.h}</span></p>`).join("")}
<div class="sc-pageframe" id="pg-panel" role="tabpanel" aria-labelledby="pg-tab-${PAGES[0]?.id ?? "intro"}"><p class="sc-frame__wait">正在打开页面</p></div>
</section>`;
}

function ipSection(X: XidingAPI): string {
  const levels = ["整体", "牌子", "板块"];
  const brand = (b: Brand) => `<li class="sc-brand"><b>${esc(b.zh)}</b>${b.en ? `<span>${esc(b.en)}</span>` : ""}${b.settled ? "" : `<em class="sc-chip">英文名待确认</em>`}</li>`;
  const tree = levels.map((lv) => {
    const bs = X.BRANDS.filter((b) => b.level === lv);
    return bs.length ? `<div class="sc-tier"><span class="sc-tier__label">${lv}</span><ul>${bs.map(brand).join("")}</ul></div>` : "";
  }).join("");
  const pillars = X.PILLARS.map((p) => `<article class="sc-pillar sc-pillar--${p.id}">
  <i class="sc-pillar__stone" aria-hidden="true"></i>
  <div class="sc-pillar__head"><h4>${esc(p.zh)}</h4><span class="sc-pillar__word">${esc(p.word)}</span><span class="sc-latin">${esc(p.en.toUpperCase())}</span></div>
  <p class="sc-pillar__sentence">${esc(p.sentence)}</p>
  <p class="sc-pillar__meta">${esc(p.motto)} · 板块 ${esc(p.line)}</p>
</article>`).join("");
  const scenes = X.SCENES.map((s) => `<tr><th scope="row"><i class="xd-dot xd-dot--${s.id}"></i>${esc(s.pillar)}</th><td>${s.scenes.map((x) => `<span class="sc-scene">${esc(x)}</span>`).join("")}</td><td class="sc-muted">${esc(s.use)}</td></tr>`).join("");
  const steps = X.STEPS.map((st) => `<li>${st.map(esc).join("")}</li>`).join("");
  const brandCards = X.BRAND_DETAILS.map((b, i) => `<article class="sc-brand">
  <p class="sc-brand__field"><span>${esc(b.field)}</span><span>${i + 1} / ${X.BRAND_DETAILS.length}</span></p>
  <h4>${esc(b.zh)}</h4><p class="sc-latin">${esc(b.latin)} · ${esc(b.en)}</p>
  <ul class="sc-brand__services">${b.services.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
  <p class="sc-brand__lines">${b.lines.map(esc).join("<br>")}</p>
</article>`).join("");
  const arch = (theme: string) => X.toSVG(X.art.architecture(theme));
  return `<section class="sc-section" id="ip">
<div class="sc-head"><span class="sc-latin">IP SYSTEM</span><h2>IP 体系</h2><p class="sc-lede">一套班子，三个牌子，三个板块；三柱立在一条价值线上。以下全部读自 <code>Xiding.PILLARS</code>、<code>BRANDS</code>、<code>SCENES</code>、<code>STEPS</code>。</p></div>
<h3 class="sc-sub">西顶文化 · ${esc(X.TAGLINE)} · 三个牌子</h3>
<div class="sc-brands">${brandCards}</div>
<p class="sc-valueline">${esc(X.LINE)}</p>
<div class="sc-ip-grid">
  <div class="sc-panel"><h3>品牌架构</h3><p class="sc-root">根 <b>${esc(X.ROOT.zh)}</b> <span class="sc-muted">${esc(X.ROOT.en)} · 西顶庙</span></p>${tree}</div>
  <div class="sc-panel sc-arch"><h3>架构图</h3><div class="sc-only-light">${arch("light")}</div><div class="sc-only-dark">${arch("dark")}</div></div>
</div>
<h3 class="sc-sub">三柱 · 大美 大智 大礼</h3>
<div class="sc-pillars">${pillars}</div>
<div class="sc-ip-grid">
  <div class="sc-panel"><h3>场景</h3><div class="sc-scroll"><table class="sc-table"><thead><tr><th>柱</th><th>场景</th><th>用处</th></tr></thead><tbody>${scenes}</tbody></table></div></div>
  <div class="sc-panel"><h3>${"一二三四五六"[X.STEPS.length - 1] ?? ""}步</h3><ol class="sc-steps">${steps}</ol></div>
</div>
<p class="sc-facts"><span>官网 <code>${esc(X.SITE)}</code></span><span>地址 ${esc(X.ADDRESS)}</span></p>
</section>`;
}

function tokenSection(t: Tokens): string {
  const { raw, resolve } = resolver(t);
  const themes = t.color.themes.map((x) => x.id);
  const colorRows = t.color.tokens.map((tok) => {
    const cells = themes.map((th) => {
      const v = raw(tok, th), r = resolve(tok.name, th);
      const alias = /^\{(.+)\}$/.exec(v);
      return `<td><span class="sc-sw" style="background:${esc(r)}"></span><code>${esc(r)}</code>${alias ? `<small>= ${esc(alias[1] ?? "")}</small>` : ""}</td>`;
    }).join("");
    const contrast = themes.map((th) => {
      const c = resolve(tok.name, th);
      return `<span>${th === "light" ? "浅" : "深"} ${ratio(c, resolve("paper", th))} · ${ratio(c, resolve("surface", th))}</span>`;
    }).join("");
    return `<tr><th scope="row"><code>${esc(tok.name)}</code></th>${cells}<td class="sc-contrast">${contrast}</td><td class="sc-usage">${inline(tok.usage ?? "")}</td></tr>`;
  }).join("");
  const typeGroups = t.type.groups.map((g) => `<div class="sc-typegroup"><h4>${esc(g.name)} <span class="sc-muted">${esc(g.family)}</span></h4>${g.note ? `<p class="sc-muted">${inline(g.note)}</p>` : ""}
${g.styles.map((s) => `<div class="sc-type"><div class="sc-type__meta"><code>${esc(s.name)}</code><span>${esc(String(s.fontSize))} / ${esc(String(s.lineHeight ?? ""))} · ${esc(String(s.fontWeight ?? ""))}${s.letterSpacing ? ` · ${esc(s.letterSpacing)}` : ""}</span><span class="sc-muted">${inline(s.usage ?? "")}</span></div><div class="sc-type__sample"><span class="${esc(s.name)}">${esc(s.sample ?? s.name)}</span></div></div>`).join("")}</div>`).join("");
  const fams = Object.entries(t).filter(([k, v]) => k !== "color" && k !== "type" && typeof v === "object" && v !== null && Array.isArray((v as Family).tokens)) as [string, Family][];
  const famBlock = ([k, f]: [string, Family]) => {
    const val = (tok: Token) => (typeof tok.value === "string" ? tok.value : Object.entries(tok.value).map(([a, b]) => `${a}: ${b}`).join(" · "));
    const viz = (tok: Token) => {
      const v = val(tok);
      if (k === "spacing") return `<span class="sc-spacebar" style="width:${esc(v)}"></span>`;
      if (k === "radius") return `<span class="sc-rad" style="border-radius:${esc(v)}"></span>`;
      if (k === "shadow") return `<span class="sc-shadow" style="box-shadow:var(--${esc(tok.name)})"></span>`;
      return "";
    };
    return `<div class="sc-panel"><h4>${esc(k)} <span class="sc-muted">${f.tokens.length}</span></h4>${f.note ? `<p class="sc-muted">${inline(f.note)}</p>` : ""}<div class="sc-scroll"><table class="sc-table sc-table--fam"><tbody>${f.tokens.map((tok) => `<tr><th scope="row"><code>${esc(tok.name)}</code></th><td>${viz(tok)}<code>${esc(val(tok))}</code></td><td class="sc-usage">${inline(tok.usage ?? "")}</td></tr>`).join("")}</tbody></table></div></div>`;
  };
  const count = t.color.tokens.length + t.type.groups.reduce((n, g) => n + g.styles.length, 0) + fams.reduce((n, [, f]) => n + f.tokens.length, 0);
  return `<section class="sc-section" id="tokens">
<div class="sc-head"><span class="sc-latin">TOKENS</span><h2>令牌</h2><p class="sc-lede">${count} 个令牌，读自 <code>tokens.json</code>。颜色按主题列出，别名已解开；对比度为在 <code>paper</code> · <code>surface</code> 上的比值。</p></div>
<h3 class="sc-sub">颜色 <span class="sc-muted">${t.color.tokens.length}</span></h3>
${t.color.note ? `<p class="sc-muted sc-narrow">${inline(t.color.note)}</p>` : ""}
<div class="sc-scroll"><table class="sc-table sc-table--color"><thead><tr><th>令牌</th>${themes.map((th) => `<th>${esc(t.color.themes.find((x) => x.id === th)?.name ?? th)}</th>`).join("")}<th>对比度</th><th>用法</th></tr></thead><tbody>${colorRows}</tbody></table></div>
<h3 class="sc-sub">字体 <span class="sc-muted">${t.type.groups.reduce((n, g) => n + g.styles.length, 0)}</span></h3>
<p class="sc-families">${Object.entries(t.type.families).map(([k, v]) => `<span><code>--font-${esc(k)}</code> ${esc(v)}</span>`).join("")}</p>
${typeGroups}
<h3 class="sc-sub">其余令牌</h3>
<div class="sc-fams">${fams.map(famBlock).join("")}</div>
</section>`;
}

function componentSection(cs: Card[]): string {
  const groups = [...new Set(cs.map((c) => c.group))].sort((a, b) => (a === "Cover" ? -1 : b === "Cover" ? 1 : a.localeCompare(b)));
  const card = (c: Card) => {
    const md = markdown(c.readme.replace(/^#\s.*\n/, ""), `c-${slug(c.name)}-`);
    const summary = /^(.+?[。.])(\s|$)/.exec(c.readme.replace(/^#\s.*\n+/, "").trim())?.[1] ?? "";
    return `<article class="sc-comp" id="c-${slug(c.name)}">
<header><h4>${esc(c.name)}</h4><span class="sc-chip">${esc(c.group)}</span><span class="sc-muted sc-dim">${c.width} × ${c.height}</span></header>
${summary ? `<p class="sc-comp__sum">${inline(summary)}</p>` : ""}
<div class="sc-frame" data-card="${esc(c.name)}" style="--w:${c.width};--h:${c.height}"><p class="sc-frame__wait">正在绘制 ${esc(c.name)}</p></div>
${c.readme ? `<details><summary>使用说明</summary><div class="sc-md">${md.html}</div></details>` : ""}
</article>`;
  };
  return `<section class="sc-section" id="components">
<div class="sc-head"><span class="sc-latin">COMPONENTS</span><h2>组件</h2><p class="sc-lede">${cs.length} 个组件，每个都由仓库里的 <code>preview.html</code> 现场绘制，跟随本页的浅色与深色。</p></div>
<nav class="sc-index" aria-label="组件索引">${groups.map((g) => `<div><b>${esc(g)}</b>${cs.filter((c) => c.group === g).map((c) => `<a href="#c-${slug(c.name)}">${esc(c.name)}</a>`).join("")}</div>`).join("")}</nav>
${groups.map((g) => `<h3 class="sc-sub">${esc(g)}</h3><div class="sc-comps">${cs.filter((c) => c.group === g).map(card).join("")}</div>`).join("")}
</section>`;
}

function assetSection(idx: Index): string {
  const dataURI = (p: string, type: string) => `data:${type};base64,${readFileSync(p).toString("base64")}`;
  const groupBlocks = idx.groups.map((g) => {
    const ag = idx.assetGroups[g];
    const readme = join(DS, "assets", g, "README.md");
    const extra = existsSync(join(DS, "assets", g)) ? readdirSync(join(DS, "assets", g)).filter((n) => n !== "README.md" && !(ag && n in ag.files)).sort() : [];
    const tiles = (ag?.order ?? []).map((n) => {
      const f = ag?.files[n];
      if (!f) return "";
      const p = join(DS, "assets", g, f.name);
      const dark = /night|white/.test(f.name);
      return `<figure class="sc-asset${dark ? " sc-asset--dark" : ""}"><div class="sc-asset__img"><img src="${dataURI(p, f.type)}" alt="${esc(f.name)}" loading="lazy"></div><figcaption><code>${esc(f.name)}</code><span>${(f.size / 1024).toFixed(1)} KB</span></figcaption></figure>`;
    }).join("");
    const others = extra.map((n) => `<li><code>${esc(n)}</code> <span class="sc-muted">${(statSync(join(DS, "assets", g, n)).size / 1024).toFixed(1)} KB</span></li>`).join("");
    return `<div class="sc-assetgroup" id="a-${slug(g)}"><h3 class="sc-sub">${esc(g)} <span class="sc-muted">${ag ? ag.order.length : 0}</span></h3>
${existsSync(readme) ? `<details><summary>说明</summary><div class="sc-md">${markdown(readFileSync(readme, "utf8").replace(/^#\s.*\n/, ""), `a-${slug(g)}-`).html}</div></details>` : ""}
${tiles ? `<div class="sc-assets">${tiles}</div>` : ""}${others ? `<ul class="sc-files">${others}</ul>` : ""}</div>`;
  }).join("");
  const total = Object.values(idx.assetGroups).reduce((n, g) => n + g.order.length, 0);
  return `<section class="sc-section" id="assets">
<div class="sc-head"><span class="sc-latin">ASSETS</span><h2>资产</h2><p class="sc-lede">${total} 个文件，按 <code>design-system.json</code> 的分组与顺序排列。</p></div>
${groupBlocks}
</section>`;
}

function bookSection(): string {
  const parts: [string, string][] = [["README.md", "总览"], ["intro.md", ""], ["voice.md", ""], ["decisions.md", ""], ["references.md", ""]];
  const docs = parts.filter(([f]) => existsSync(join(DS, f))).map(([f, title], i) => {
    const src = read(f);
    const md = markdown(title ? `# ${title}\n\n${src}` : src, `b${i}-`);
    return { md, title: md.headings[0]?.text ?? f, id: md.headings[0]?.id ?? `b${i}` };
  });
  return `<section class="sc-section" id="book">
<div class="sc-head"><span class="sc-latin">BRAND BOOK</span><h2>品牌手册</h2><p class="sc-lede">品牌手册全文，读自 <code>README.md</code> 与各章节文件。</p></div>
<div class="sc-book">
<nav class="sc-toc" aria-label="手册目录">${docs.map((d) => `<div><a href="#${d.id}"><b>${inline(d.title)}</b></a>${d.md.headings.filter((h) => h.level === 2).map((h) => `<a href="#${h.id}">${inline(h.text)}</a>`).join("")}</div>`).join("")}</nav>
<div class="sc-md sc-md--book">${docs.map((d) => `<article>${d.md.html}</article>`).join("")}</div>
</div>
</section>`;
}

// ---------- the page ----------
const PAGE_CSS = `
/* Layout: a single column under a sticky bar; sections open with a tracked Latin label and a Songti title;
   the system's own tokens colour everything, so the page is itself a specimen. */
:root { --sc-max: 1180px; --sc-bar: 52px; }
* { box-sizing: border-box; }
html { scroll-behavior: smooth; scroll-padding-top: calc(var(--sc-bar) + env(safe-area-inset-top, 0px) + 16px); }
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
body { margin: 0; background: var(--paper); color: var(--ink); font: 400 15px/1.6 var(--font-sans); -webkit-font-smoothing: antialiased; }
body::before { content: ""; position: fixed; inset: 0 0 auto; height: env(safe-area-inset-top, 0px); z-index: 10; background: var(--paper); }
a { color: var(--teal-text); }
a:focus-visible, button:focus-visible, summary:focus-visible { outline: 2px solid var(--focus); outline-offset: 3px; }
code { font: 400 12.5px/1.5 var(--font-mono); background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-sm); padding: 0 4px; overflow-wrap: anywhere; }
.sc-wrap { max-width: var(--sc-max); margin: 0 auto; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }
.sc-latin { font: 500 11px/1 var(--font-sans); letter-spacing: .42em; text-transform: uppercase; color: var(--muted); }
.sc-muted { color: var(--muted); font-weight: 400; }
.sc-chip { display: inline-block; padding: 2px 8px; border: 1px solid var(--line); border-radius: var(--radius-sm); font: 500 12px/1.5 var(--font-sans); font-style: normal; color: var(--muted); white-space: nowrap; }

/* bar */
.sc-bar { position: sticky; top: env(safe-area-inset-top, 0px); z-index: 9; background: var(--paper); border-bottom: 1px solid var(--line); }
.sc-bar .sc-wrap { display: flex; align-items: center; gap: 16px; height: var(--sc-bar); }
.sc-bar__brand { display: flex; align-items: center; gap: 8px; font: 700 18px/1 var(--font-serif); letter-spacing: .06em; color: var(--ink); text-decoration: none; flex: none; }
.sc-bar__brand svg { height: 30px; width: auto; }
.sc-nav { display: flex; gap: 4px; overflow-x: auto; min-width: 0; flex: 1; scrollbar-width: none; }
.sc-nav a { padding: 6px 10px; border-radius: var(--radius-sm); color: var(--ink); text-decoration: none; font: 600 14px/1 var(--font-serif); letter-spacing: .08em; white-space: nowrap; }
.sc-nav a:hover { background: var(--surface); }
.sc-theme { display: flex; border: 1px solid var(--line); border-radius: var(--radius-sm); flex: none; }
.sc-theme button { border: 0; background: transparent; color: var(--muted); font: 500 12px/1 var(--font-sans); padding: 7px 9px; cursor: pointer; }
.sc-theme button[aria-pressed="true"] { background: var(--ink); color: var(--surface); }

/* hero */
.sc-hero { display: grid; gap: 24px; padding-block: 24px 40px; }
.sc-hero__art { margin: 0 calc(-1 * max(16px, env(safe-area-inset-left, 0px))); color: var(--teal); overflow: hidden; }
.sc-hero__art svg { width: 100%; height: auto; display: block; }
.sc-hero__words { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; }
.sc-hero__name h1 { margin: 0; font: 700 clamp(72px, 14vw, 168px)/.95 var(--font-serif); letter-spacing: .02em; }
.sc-hero__name .sc-latin { display: block; margin-top: 14px; color: var(--ink); letter-spacing: .62em; }
.sc-hero__line { font-size: clamp(18px, 2.4vw, 26px); color: var(--ink); flex: none; }
.sc-hero__note { max-width: 62ch; margin: 0; color: var(--muted); }
.sc-stats { display: flex; flex-wrap: wrap; gap: 12px 40px; margin: 0; padding-top: 16px; border-top: 2px solid var(--ink); }
.sc-stats div { display: grid; gap: 4px; }
.sc-stats dt { font: 500 11px/1 var(--font-sans); letter-spacing: .3em; color: var(--muted); text-transform: uppercase; }
.sc-stats dd { margin: 0; font: 700 32px/1 var(--font-serif); font-variant-numeric: tabular-nums; }
.sc-stats dd small { font: 500 12px/1 var(--font-sans); color: var(--muted); letter-spacing: 0; }

/* sections */
.sc-section { padding-block: 56px; border-top: 1px solid var(--line); display: grid; gap: 24px; }
.sc-head { display: grid; gap: 10px; }
.sc-head h2 { margin: 0; font: 700 clamp(40px, 6vw, 64px)/1.05 var(--font-serif); letter-spacing: .04em; text-wrap: balance; }
.sc-lede { margin: 0; max-width: 64ch; color: var(--muted); }
.sc-sub { margin: 24px 0 0; padding-top: 12px; border-top: 2px solid var(--ink); font: 700 24px/1.25 var(--font-serif); letter-spacing: .04em; }
.sc-sub .sc-muted { font: 500 13px/1 var(--font-sans); letter-spacing: 0; }
.sc-narrow { max-width: 72ch; margin: 0; }
.sc-panel { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-md); padding: 20px; min-width: 0; display: grid; gap: 12px; align-content: start; }
.sc-panel h3, .sc-panel h4 { margin: 0; font: 700 20px/1.3 var(--font-serif); letter-spacing: .04em; }
.sc-panel p { margin: 0; }
.sc-scroll { overflow-x: auto; min-width: 0; }

/* IP */
.sc-valueline { margin: 0; font: 700 clamp(28px, 4.4vw, 52px)/1.3 var(--font-serif); letter-spacing: .06em; text-wrap: balance; }
.sc-ip-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr)); gap: 16px; }
.sc-root { font-size: 15px; }
.sc-tier { display: grid; grid-template-columns: 48px minmax(0, 1fr); gap: 12px; padding-top: 12px; border-top: 1px solid var(--line); }
.sc-tier__label { font: 600 14px/1.6 var(--font-serif); letter-spacing: .2em; color: var(--muted); }
.sc-tier ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.sc-brand { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 10px; }
.sc-brand b { font: 700 18px/1.3 var(--font-serif); letter-spacing: .08em; }
.sc-brand span { color: var(--muted); font-size: 13px; }
.sc-arch svg { width: 100%; height: auto; display: block; }
.sc-only-dark { display: none; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .sc-only-dark { display: block; } :root:not([data-theme="light"]) .sc-only-light { display: none; } }
:root[data-theme="dark"] .sc-only-dark { display: block; }
:root[data-theme="dark"] .sc-only-light { display: none; }
.sc-pillars { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); gap: 16px; }
.sc-pillar { display: grid; gap: 12px; align-content: start; padding: 20px 0; }
.sc-pillar__stone { display: block; border-radius: var(--radius-full); width: 96px; height: 96px; }
.sc-pillar--mei .sc-pillar__stone { background: var(--pillar-mei); width: 120px; height: 120px; }
.sc-pillar--zhi .sc-pillar__stone { background: var(--pillar-zhi); }
.sc-pillar--li .sc-pillar__stone { background: var(--pillar-li); box-shadow: inset 0 0 0 1.5px var(--ink); width: 72px; height: 72px; }
.sc-pillar__head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 14px; }
.sc-pillar h4 { margin: 0; font: 700 40px/1 var(--font-serif); letter-spacing: .04em; }
.sc-pillar__word { font: 600 20px/1 var(--font-serif); letter-spacing: .3em; }
.sc-pillar__sentence { margin: 0; font: 500 18px/1.6 var(--font-serif); max-width: 24em; }
.sc-pillar__meta { margin: 0; color: var(--muted); font-size: 13px; }
.sc-scene { display: inline-block; margin: 2px 6px 2px 0; padding: 2px 8px; border: 1px solid var(--line); border-radius: var(--radius-sm); font: 600 14px/1.5 var(--font-serif); }
.sc-steps { margin: 0; padding-left: 1.6em; display: grid; gap: 10px; font: 500 16px/1.6 var(--font-serif); }
.sc-steps li::marker { color: var(--teal-text); font: 700 16px var(--font-sans); }
.sc-facts { display: flex; flex-wrap: wrap; gap: 8px 24px; margin: 0; color: var(--muted); }
.xd-dot { margin-right: 8px; vertical-align: -1px; }

/* tables */
.sc-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
.sc-table th, .sc-table td { text-align: left; vertical-align: top; padding: 10px 12px 10px 0; border-bottom: 1px solid var(--line); }
.sc-table thead th { font: 600 12px/1.4 var(--font-sans); letter-spacing: .08em; color: var(--muted); border-bottom: 2px solid var(--ink); }
.sc-table tbody th { font-weight: 600; white-space: nowrap; }
.sc-table--color { min-width: 920px; }
.sc-table--color td small { display: block; color: var(--muted); }
.sc-sw { display: inline-block; width: 22px; height: 22px; border-radius: var(--radius-full); box-shadow: inset 0 0 0 1px var(--line); vertical-align: middle; margin-right: 8px; }
.sc-contrast { font-variant-numeric: tabular-nums; white-space: nowrap; }
.sc-contrast span { display: block; }
.sc-usage { color: var(--muted); max-width: 52ch; }
.sc-families { display: grid; gap: 4px; margin: 0; color: var(--muted); font-size: 13px; }
.sc-typegroup { display: grid; gap: 0; }
.sc-typegroup h4 { margin: 16px 0 4px; font: 700 18px/1.3 var(--font-serif); letter-spacing: .04em; }
.sc-typegroup > p { margin: 0 0 8px; font-size: 13px; }
.sc-type { display: grid; grid-template-columns: minmax(0, 260px) minmax(0, 1fr); gap: 8px 24px; padding: 14px 0; border-bottom: 1px solid var(--line); align-items: center; }
.sc-type__meta { display: grid; gap: 4px; font-size: 12.5px; min-width: 0; }
.sc-type__meta span:first-of-type { font-variant-numeric: tabular-nums; }
.sc-type__sample { min-width: 0; overflow-x: auto; white-space: nowrap; }
@media (max-width: 720px) { .sc-type { grid-template-columns: minmax(0, 1fr); } }
.sc-fams { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 460px), 1fr)); gap: 16px; }
.sc-table--fam td:nth-child(2) { white-space: nowrap; }
.sc-spacebar { display: inline-block; height: 12px; background: var(--teal); margin-right: 8px; vertical-align: middle; }
.sc-rad { display: inline-block; width: 28px; height: 28px; background: var(--teal); margin-right: 8px; vertical-align: middle; }
.sc-shadow { display: inline-block; width: 48px; height: 30px; background: var(--surface); margin: 6px 12px 6px 0; vertical-align: middle; }

/* source and checks */
.sc-swatch { display: inline-block; width: 14px; height: 14px; margin-right: 8px; vertical-align: -2px; border-radius: 50%; box-shadow: inset 0 0 0 1px var(--line); }
.sc-go { color: var(--teal-text); font-weight: 600; text-decoration: underline; text-underline-offset: 4px; }
/* the three brands */
.sc-brands { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0 24px; margin: 8px 0 32px; }
.sc-brand { display: grid; align-content: start; gap: 8px; padding-top: 16px; border-top: 2px solid var(--ink); }
.sc-brand h4 { margin: 0; font: 700 30px/1.15 var(--font-serif); letter-spacing: .08em; }
.sc-brand__field { display: flex; justify-content: space-between; margin: 0; font: 500 10px/1.4 var(--font-sans); letter-spacing: .28em; color: var(--teal-text); }
.sc-brand__services { margin: 6px 0 0; padding: 0; list-style: none; border-top: 1px solid var(--line); }
.sc-brand__services li { padding: 8px 0; border-bottom: 1px solid var(--line); font: 600 15px/1.4 var(--font-serif); letter-spacing: .1em; }
.sc-brand__lines { margin: 6px 0 0; font: 600 15px/1.8 var(--font-serif); letter-spacing: .06em; }
@media (max-width: 760px) { .sc-brands { grid-template-columns: minmax(0, 1fr); gap: 24px; } }
/* pages */
.sc-pages { display: flex; flex-wrap: wrap; gap: 0; border-bottom: 2px solid var(--ink); }
.sc-pages button { display: grid; gap: 4px; justify-items: start; padding: 12px 18px 12px 0; margin-right: 18px; border: 0; border-bottom: 3px solid transparent; margin-bottom: -2px; background: transparent; color: var(--muted); cursor: pointer; text-align: left; }
.sc-pages button b { font: 700 22px/1 var(--font-serif); letter-spacing: .06em; color: inherit; }
.sc-pages button span { font: 500 11px/1 var(--font-sans); letter-spacing: .24em; text-transform: uppercase; }
.sc-pages button:hover { color: var(--ink); }
.sc-pages button[aria-selected="true"] { color: var(--ink); border-bottom-color: var(--teal); }
.sc-pagenote { margin: 0; color: var(--muted); font-size: 13.5px; }
.sc-pageframe { position: relative; width: 100%; overflow: hidden; background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-md); min-height: 120px; }
.sc-pageframe iframe { display: block; margin: 0 auto; border: 0; transform-origin: 0 0; background: #FFFFFF; }

/* components */
.sc-index { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr)); gap: 12px 24px; font-size: 13.5px; }
.sc-index div { display: flex; flex-wrap: wrap; gap: 2px 12px; align-content: start; }
.sc-index b { width: 100%; font: 600 12px/1.6 var(--font-sans); letter-spacing: .2em; color: var(--muted); text-transform: uppercase; }
.sc-comps { display: grid; gap: 24px; }
.sc-comp { display: grid; gap: 10px; min-width: 0; }
.sc-comp header { display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px 12px; }
.sc-comp h4 { margin: 0; font: 700 22px/1.2 var(--font-sans); letter-spacing: .01em; }
.sc-dim { font-size: 12px; font-variant-numeric: tabular-nums; }
.sc-comp__sum { margin: 0; max-width: 72ch; color: var(--muted); }
.sc-frame { position: relative; width: 100%; max-width: calc(var(--w) * 1px); max-height: 760px; overflow: auto; background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-md); }
.sc-frame__wait { margin: 0; padding: 20px; color: var(--muted); font-size: 13px; }
.sc-frame iframe { display: block; border: 0; transform-origin: 0 0; background: transparent; }
details { border-top: 1px solid var(--line); }
details summary { cursor: pointer; padding: 10px 0; font: 600 14px/1.4 var(--font-sans); color: var(--teal-text); }

/* assets */
.sc-assets { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 180px), 1fr)); gap: 12px; }
.sc-asset { margin: 0; display: grid; gap: 6px; min-width: 0; }
.sc-asset__img { display: grid; place-items: center; aspect-ratio: 1; max-width: 100%; padding: 14px; background: #FFFFFF; border: 1px solid var(--line); border-radius: var(--radius-md); }
.sc-asset--dark .sc-asset__img { background: #000000; }
.sc-asset img { max-height: 100%; object-fit: contain; }
.sc-asset figcaption { display: grid; gap: 2px; font-size: 12px; color: var(--muted); }
.sc-asset figcaption code { background: none; border: 0; padding: 0; color: var(--ink); }
.sc-files { margin: 8px 0 0; padding-left: 1.2em; font-size: 13px; }

/* markdown */
.sc-md { max-width: 74ch; min-width: 0; }
.sc-md h1 { font: 700 34px/1.2 var(--font-serif); letter-spacing: .04em; margin: 40px 0 12px; }
.sc-md h2 { font: 700 24px/1.3 var(--font-serif); letter-spacing: .04em; margin: 32px 0 8px; padding-top: 12px; border-top: 2px solid var(--ink); }
.sc-md h3 { font: 700 18px/1.4 var(--font-serif); margin: 24px 0 6px; }
.sc-md p, .sc-md li { line-height: 1.75; }
.sc-md ul, .sc-md ol { padding-left: 1.3em; }
.sc-md li::marker { color: var(--teal-text); }
.sc-md blockquote { margin: 16px 0; padding-left: 16px; border-left: 2px solid var(--teal); color: var(--muted); }
.sc-md pre { overflow-x: auto; background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-md); padding: 12px; }
.sc-md pre code { border: 0; padding: 0; background: none; }
.sc-md .md-table { overflow-x: auto; margin: 12px 0; }
.sc-md table { border-collapse: collapse; font-size: 13.5px; min-width: 100%; }
.sc-md th, .sc-md td { text-align: left; vertical-align: top; padding: 8px 12px 8px 0; border-bottom: 1px solid var(--line); }
.sc-md th { border-bottom: 2px solid var(--ink); font-weight: 600; }
.sc-book { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: 40px; align-items: start; }
.sc-toc { position: sticky; top: calc(var(--sc-bar) + env(safe-area-inset-top, 0px) + 16px); display: grid; gap: 16px; font-size: 13px; max-height: calc(100vh - 120px); overflow-y: auto; }
.sc-toc div { display: grid; gap: 4px; }
.sc-toc a { color: var(--muted); text-decoration: none; }
.sc-toc a b { color: var(--ink); font: 700 15px/1.4 var(--font-serif); }
.sc-toc a:hover { color: var(--teal-text); }
.sc-md--book article:first-child h1 { margin-top: 0; }
@media (max-width: 860px) { .sc-book { grid-template-columns: minmax(0, 1fr); } .sc-toc { position: static; max-height: none; } }

.sc-foot { padding-block: 32px 48px; border-top: 2px solid var(--ink); display: grid; gap: 8px; color: var(--muted); font-size: 13px; }
.sc-foot p { margin: 0; max-width: 80ch; }
`;

const PAGE_JS = `
(function () {
  var data = JSON.parse(document.getElementById('sc-data').textContent);
  var root = document.documentElement;
  function theme() {
    var t = root.getAttribute('data-theme');
    if (t === 'light' || t === 'dark') return t;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function srcdoc(html, th) {
    var pre = '<style>' + data.tokensCSS + '\\n' + data.bundleCSS + '</style><script>' + data.bundleJS + '<\\/script>' +
      (data.people ? '<script>window.Xiding.setPeople(' + JSON.stringify(data.people).replace(/</g, '\\\\u003c') + ')<\\/script>' : '');
    return html.replace(/<html([^>]*)>/i, '<html$1 data-theme="' + th + '">').replace(/<head>/i, '<head>' + pre);
  }
  var frames = [];
  function fit(f) {
    var box = f.box, w = f.card.width, h = f.card.height;
    var s = Math.min(1, box.clientWidth / w);
    f.el.style.width = w + 'px'; f.el.style.height = h + 'px';
    f.el.style.transform = 'scale(' + s + ')';
    box.style.height = Math.ceil(h * s) + 2 + 'px';
  }
  function draw(f) {
    var th = theme();
    if (f.theme === th) return;
    f.theme = th;
    if (!f.el) {
      f.el = document.createElement('iframe');
      f.el.title = f.card.name + ' preview';
      f.el.setAttribute('loading', 'lazy');
      f.box.textContent = '';
      f.box.appendChild(f.el);
    }
    f.el.srcdoc = srcdoc(f.card.html, th);
    fit(f);
  }
  document.querySelectorAll('.sc-frame[data-card]').forEach(function (box) {
    var card = data.cards[box.getAttribute('data-card')];
    if (card) frames.push({ box: box, card: card, el: null, theme: null, seen: false });
  });
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      var f = frames.filter(function (x) { return x.box === e.target; })[0];
      if (f) { f.seen = true; draw(f); io.unobserve(e.target); }
    });
  }, { rootMargin: '800px 0px' }) : null;
  frames.forEach(function (f) { if (io) io.observe(f.box); else { f.seen = true; draw(f); } });
  function redraw() { frames.forEach(function (f) { if (f.seen) draw(f); }); syncButtons(); }
  window.addEventListener('resize', function () { frames.forEach(function (f) { if (f.el) fit(f); }); });
  if (window.matchMedia) { var mq = window.matchMedia('(prefers-color-scheme: dark)'); if (mq.addEventListener) mq.addEventListener('change', redraw); }
  new MutationObserver(redraw).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  var buttons = document.querySelectorAll('.sc-theme button');
  function syncButtons() {
    var t = root.getAttribute('data-theme') || 'system';
    buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.value === t)); });
  }
  buttons.forEach(function (b) {
    b.addEventListener('click', function () {
      if (b.value === 'system') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', b.value);
      try { localStorage.setItem('xd-showcase-theme', b.value); } catch (e) {}
    });
  });
  try { var saved = localStorage.getItem('xd-showcase-theme'); if (saved === 'light' || saved === 'dark') root.setAttribute('data-theme', saved); } catch (e) {}
  syncButtons();

  // pages: one frame, three pages behind tabs; #intro, #overview, #site open one directly
  var pages = data.pages || [], pbox = document.getElementById('pg-panel'), pframe = null, current = null;
  var tabs = document.querySelectorAll('.sc-pages [data-page]');
  function fitPage() {
    if (!pframe || !current) return;
    var s = Math.min(1, pbox.clientWidth / current.w);
    pframe.style.width = current.w + 'px'; pframe.style.height = current.h + 'px';
    pframe.style.transform = 'scale(' + s + ')';
    pbox.style.height = Math.ceil(current.h * s) + 2 + 'px';
  }
  function hookLinks() {
    var doc; try { doc = pframe.contentDocument; } catch (e) { return; }
    if (!doc) return;
    doc.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!a) return;
      var href = a.getAttribute('href') || '';
      var hit = pages.filter(function (p) { return href.indexOf(p.dir + '/') >= 0 || href.indexOf(p.dir + '.html') >= 0; })[0];
      if (hit) { e.preventDefault(); openPage(hit.id, true); }
    }, true);
  }
  function openPage(id, scroll) {
    var p = pages.filter(function (x) { return x.id === id; })[0];
    if (!p) return;
    current = p;
    tabs.forEach(function (t) { t.setAttribute('aria-selected', String(t.getAttribute('data-page') === id)); });
    document.querySelectorAll('[data-note]').forEach(function (n) { n.hidden = n.getAttribute('data-note') !== id; });
    pbox.setAttribute('aria-labelledby', 'pg-tab-' + id);
    if (!pframe) { pframe = document.createElement('iframe'); pbox.textContent = ''; pbox.appendChild(pframe); pframe.addEventListener('load', hookLinks); }
    pframe.title = p.id + ' page';
    pframe.srcdoc = p.html;
    fitPage();
    if (scroll) document.getElementById('pages').scrollIntoView();
  }
  tabs.forEach(function (t) { t.addEventListener('click', function () { openPage(t.getAttribute('data-page'), false); }); });
  window.addEventListener('resize', fitPage);
  function fromHash() {
    var id = (location.hash || '').slice(1);
    if (pages.some(function (p) { return p.id === id; })) { openPage(id, true); return true; }
    return false;
  }
  window.addEventListener('hashchange', fromHash);
  if (pages.length && !fromHash()) {
    if ('IntersectionObserver' in window) {
      var pio = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) { pio.disconnect(); if (!current) openPage(pages[0].id, false); } }, { rootMargin: '600px 0px' });
      pio.observe(pbox);
    } else openPage(pages[0].id, false);
  }
})();
`;

// ---------- source and checks: where every part comes from, whether this copy is current, what is defined twice ----------

/** The commit a published copy was made from. Only the published page carries it: the repository's own copy cannot
    name the commit that contains it. */
export interface Source { repo: string; commit: string; tree: string; date: string }
const REPO = "ksamint/dsys_xiding01";
const SOURCES: [string, string, string[]][] = [
  ["pages", "页面 · 介绍、总览、官网", ["src/shared/content.ts", "src/deck/", "src/onepager/", "src/site/", "scripts/build.ts"]],
  ["ip", "IP 体系 · 三个牌子、三柱、架构", ["design-system/components/src/xiding.ts", "design-system/intro.md", "src/shared/content.ts"]],
  ["tokens", "令牌 · 颜色、字体、尺寸", ["design-system/tokens.json"]],
  ["components", "组件", ["design-system/components/", "design-system/components/bundle.css"]],
  ["assets", "资产", ["design-system/assets/", "design-system/design-system.json"]],
  ["book", "品牌手册", ["design-system/README.md", "design-system/intro.md", "design-system/voice.md", "design-system/decisions.md", "design-system/references.md"]],
  ["vi", "源 VI · 西頂廣仁宮", ["brand/xiding-guangren-vi/"]],
];
function sourceSection(t: Tokens, hash: string, src?: Source): string {
  const at = (path: string): string => {
    const code = `<code>${esc(path)}</code>`;
    if (!src) return code;
    const kind = path.endsWith("/") ? "tree" : "blob";
    return `<a href="https://github.com/${src.repo}/${kind}/${src.commit}/${encodeURI(path.replace(/\/$/, ""))}" target="_blank" rel="noopener">${code}</a>`;
  };
  const rows = SOURCES.map(([id, what, paths]) => `<tr><th scope="row">${id === "vi" ? esc(what) : `<a href="#${id}">${esc(what)}</a>`}</th><td>${paths.map(at).join(" ")}</td></tr>`).join("");
  const fresh = src
    ? `<p>本页由 <code>${esc(src.repo)}</code> 的 <code>main</code> 生成：提交 <code>${esc(src.commit.slice(0, 7))}</code>（${esc(src.date)}），树 <code>${esc(src.tree.slice(0, 12))}</code>，输入指纹 <code>${esc(hash.slice(0, 16))}</code>。</p>
<p><a class="sc-go" href="https://github.com/${src.repo}/compare/${src.commit}...main" target="_blank" rel="noopener">对比 main：本页之后有没有新提交</a>（GitHub 显示没有可比较的内容，就说明本页仍是最新）。代理核对：把本页存下来，运行 <code>npm run showcase:verify -- &lt;文件&gt;</code>。</p>`
    : `<p>本页由仓库里的文件生成，输入指纹 <code>${esc(hash.slice(0, 16)) }</code>。<code>npm run check</code> 在本页比文件旧时失败；发布到 claude.ai 的那一份另带提交号和对比链接。</p>`;
  const same = sameValues(t);
  const copies = copiesIn(readFileSync(join(ROOT, "src/shared/base.css"), "utf8"), t);
  const drift = copies.filter((c) => c.tokens !== null && !c.same);
  const pageOnly = copies.filter((c) => c.tokens === null);
  const sameRows = same.map((d) => `<tr><td><span class="sc-swatch" style="background:${esc(d.value)}"></span><code>${esc(d.value)}</code></td><td>${d.theme === "light" ? "浅" : "深"}</td><td>${d.names.map((n) => `<code>${esc(n)}</code>`).join("、")}</td></tr>`).join("");
  const driftRows = drift.map((c) => `<tr><td><code>--${esc(c.name)}</code></td><td>${c.theme === "light" ? "浅" : "深"}</td><td><code>${esc(c.here)}</code></td><td><code>${esc(c.tokens ?? "")}</code></td></tr>`).join("");
  return `<section class="sc-section" id="source">
<div class="sc-head"><span class="sc-latin">SOURCE</span><h2>来源与核对</h2><p class="sc-lede">本页每一部分都读自 <code>${REPO}</code> 里的一份文件；这里列出是哪一份，本页是否还是最新，哪些值写了两遍。</p></div>
<div class="sc-ip-grid">
  <div class="sc-panel"><h3>每一部分的来源</h3><div class="sc-scroll"><table class="sc-table"><tbody>${rows}</tbody></table></div></div>
  <div class="sc-panel"><h3>是否最新</h3>${fresh}</div>
</div>
<div class="sc-ip-grid">
  <div class="sc-panel"><h3>同一个颜色值，不同的名字（${same.length}）</h3><p class="sc-muted">别名（如 <code>{brand-teal}</code>）是引用，不算重复；这里只列出把同一个值各写一遍的令牌。合并与否待定。</p><div class="sc-scroll"><table class="sc-table"><thead><tr><th>值</th><th>主题</th><th>令牌</th></tr></thead><tbody>${sameRows}</tbody></table></div></div>
  <div class="sc-panel"><h3>页面里的副本（${copies.length}）</h3><p><code>src/shared/base.css</code> 为三个介绍页再写了一遍 ${copies.length} 个令牌：${copies.length - drift.length - pageOnly.length} 个与 <code>tokens.json</code> 一致，${drift.length} 个不一致${pageOnly.length ? `，${pageOnly.length} 个只属于页面（${pageOnly.map((c) => `<code>--${esc(c.name)}</code>`).join("、")}）` : ""}。不一致时 <code>npm run check</code> 失败。</p>${drift.length ? `<div class="sc-scroll"><table class="sc-table"><thead><tr><th>属性</th><th>主题</th><th>页面</th><th>tokens.json</th></tr></thead><tbody>${driftRows}</tbody></table></div>` : ""}</div>
</div>
</section>`;
}

export interface Built { doc: string; fragment: string; hash: string }

/** Real people for the cards, read only when a build asks for them (the published page); repository builds keep the samples. */
export function buildShowcase(peopleFile?: string, src?: Source): Built {
  const inputs = files(DS);
  const h = createHash("sha256");
  for (const p of inputs) { h.update(relative(DS, p)); h.update("\0"); h.update(readFileSync(p)); h.update("\0"); }
  const pages = readPages();
  for (const p of PAGES) { h.update(`dist/${p.dir}/index.html`); h.update("\0"); h.update(pages[p.id] ?? ""); h.update("\0"); }
  // What draws the page is an input too: a change to the generator or to the files it reads changes the page.
  for (const f of ["tools/showcase.ts", "tools/tokens.ts", "tools/markdown.ts", "src/shared/base.css"]) { h.update(f); h.update("\0"); h.update(readFileSync(join(ROOT, f))); h.update("\0"); }
  const hash = h.digest("hex");

  const t = loadTokens(join(DS, "tokens.json"));
  const bundleJS = read("components/bundle.js");
  const bundleCSS = read("components/bundle.css");
  const X = loadBundle(bundleJS);
  const idx = JSON.parse(read("design-system.json")) as Index;
  const cs = cards();
  const nAssets = Object.values(idx.assetGroups).reduce((n, g) => n + g.order.length, 0);
  const nTokens = t.color.tokens.length + t.type.groups.reduce((n, g) => n + g.styles.length, 0) +
    Object.entries(t).filter(([k, v]) => k !== "color" && k !== "type" && typeof v === "object" && v !== null && Array.isArray((v as Family).tokens))
      .reduce((n, [, v]) => n + (v as Family).tokens.length, 0);
  const stats = [["Tokens", String(nTokens)], ["Components", String(cs.length)], ["Assets", String(nAssets)], ["Pages", String(PAGES.length)], ["Pillars", String(X.PILLARS.length)], ["Bundle", `v${X.version}`]]
    .map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v ?? "")}</dd></div>`).join("");

  const data = JSON.stringify({
    tokensCSS: toCSS(t), bundleCSS, bundleJS,
    cards: Object.fromEntries(cs.map((c) => [c.name, { name: c.name, width: c.width, height: c.height, html: c.html }])),
    pages: PAGES.map((p) => ({ id: p.id, dir: p.dir, w: p.w, h: p.h, html: pages[p.id] ?? "" })),
    people: peopleFile && existsSync(peopleFile) ? JSON.parse(readFileSync(peopleFile, "utf8")) as unknown : null,
  }).replace(/</g, "\\u003c");

  const markSVG = X.mark({ ink: "currentColor", ground: "none", title: "西顶" });
  const fonts = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Instrument+Sans:wght@400;500;600&family=Noto+Sans+SC:wght@400;500&family=Noto+Sans+TC:wght@400;500&family=Noto+Serif+SC:wght@500;600;700&family=Noto+Serif+TC:wght@500;600;700&display=swap">`;
  const style = `<style>\n${toCSS(t, true)}\n${bundleCSS}\n${PAGE_CSS}</style>`;
  const body = `<div class="sc-bar"><div class="sc-wrap">
<a class="sc-bar__brand" href="#top">${markSVG}西顶</a>
<nav class="sc-nav" aria-label="章节"><a href="#pages">页面</a><a href="#ip">IP 体系</a><a href="#tokens">令牌</a><a href="#components">组件</a><a href="#assets">资产</a><a href="#book">品牌手册</a><a href="#source">来源</a></nav>
<div class="sc-theme" role="group" aria-label="主题"><button type="button" value="system" id="sc-theme-system">系统</button><button type="button" value="light" id="sc-theme-light">浅</button><button type="button" value="dark" id="sc-theme-dark">深</button></div>
</div></div>
<main class="sc-wrap">
${hero(X, idx, t, stats)}
${pagesSection()}
${ipSection(X)}
${tokenSection(t)}
${componentSection(cs)}
${assetSection(idx)}
${bookSection()}
${sourceSection(t, hash, src)}
<footer class="sc-foot">
<p>由 <code>npm run showcase</code> 从 <code>design-system/</code> 生成。每次提交时 <code>.githooks/pre-commit</code> 重新生成本页，<code>npm run check</code> 在本页与文件不一致时失败。</p>
<p>输入指纹 <code>${hash.slice(0, 16)}</code> · ${inputs.length} 个系统文件 + ${PAGES.length} 个页面 · 组件包 v${esc(X.version)}${idx.lastChange ? ` · 最近改动 ${esc(idx.lastChange.at)}（${esc(idx.lastChange.by)}）` : ""}</p>
</footer>
</main>
<script type="application/json" id="sc-data">${data}</script>
<script>${PAGE_JS}</script>`;
  const provenance = src ? `\n<meta name="xd-source" content="${esc(JSON.stringify({ repo: src.repo, commit: src.commit, tree: src.tree, date: src.date, inputs: hash }))}">` : "";
  const head = `<title>西顶设计系统</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n<meta name="xd-showcase-inputs" content="${hash}">${provenance}`;
  const fragment = `${head}\n${fonts}\n${style}\n${body}\n`;
  const doc = `<!doctype html>\n<html lang="zh-Hans">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n${head}\n${fonts}\n${style}\n</head>\n<body>\n${body}\n</body>\n</html>\n`;
  return { doc, fragment, hash };
}

// ---------- command line ----------
function serve(port: number): void {
  let page = buildShowcase().doc;
  const clients = new Set<ServerResponse>();
  const reload = `<script>new EventSource('/__events').onmessage = function () { location.reload(); };</script>`;
  createServer((req, res) => {
    if (req.url === "/__events") {
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
      res.write(": connected\n\n");
      clients.add(res);
      req.on("close", () => clients.delete(res));
      return;
    }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(page.replace("</body>", `${reload}\n</body>`));
  }).listen(port, () => console.log(`showcase on http://localhost:${port} — rebuilds on every change under design-system/ and dist/`));
  let timer: ReturnType<typeof setTimeout> | undefined;
  const onChange = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        const b = buildShowcase();
        page = b.doc;
        writeFileSync(OUT, b.doc);
        console.log(`rebuilt ${b.hash.slice(0, 12)}`);
        clients.forEach((c) => c.write("data: reload\n\n"));
      } catch (e) { console.error(`build failed: ${(e as Error).message}`); }
    }, 150);
  };
  watch(DS, { recursive: true }, onChange);
  if (existsSync(DIST)) watch(DIST, { recursive: true }, onChange);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  if (args.includes("--serve")) {
    const p = Number(args[args.indexOf("--serve") + 1]);
    serve(Number.isFinite(p) && p > 0 ? p : 4173);
  } else {
    const b = buildShowcase();
    if (args.includes("--check")) {
      const current = existsSync(OUT) ? readFileSync(OUT, "utf8") : "";
      if (current !== b.doc) { console.error("showcase/index.html is out of date: run `npm run showcase`"); process.exit(1); }
      console.log(`showcase/index.html matches design-system/ (${b.hash.slice(0, 12)})`);
    } else if (args.includes("--verify")) {
      // Is a saved copy of the published page still what main builds? Exit 0 if so, 1 if not.
      const file = args[args.indexOf("--verify") + 1];
      if (!file || !existsSync(file)) { console.error("usage: showcase.ts --verify <saved page.html>"); process.exit(2); }
      const m = /<meta name="xd-source" content="([^"]+)">/.exec(readFileSync(file, "utf8"));
      if (!m) { console.error(`${file}: no source record (xd-source); it was not built by --artifact`); process.exit(1); }
      const rec = JSON.parse((m[1] ?? "").replace(/&quot;/g, '"').replace(/&amp;/g, "&")) as Source & { inputs: string };
      const git = (...a: string[]): string => { try { return execFileSync("git", a, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return ""; } };
      const head = git("rev-parse", "HEAD"), main = git("rev-parse", "origin/main");
      const dirty = git("status", "--porcelain", "--untracked-files=no") !== "";
      const sameInputs = rec.inputs === b.hash;
      console.log(`published:     ${rec.repo} ${rec.commit.slice(0, 7)} (${rec.date}), inputs ${rec.inputs.slice(0, 12)}`);
      console.log(`this checkout: ${head.slice(0, 7)}${dirty ? " with uncommitted changes" : ""}${main && main !== head ? ` (origin/main is ${main.slice(0, 7)}: check on a clean main to compare with main)` : ""}, inputs ${b.hash.slice(0, 12)}`);
      if (sameInputs) { console.log(rec.commit === head ? "up to date: built from this commit" : "up to date: commits came after it, but nothing the page shows changed"); process.exit(0); }
      // What differs between the published commit and this checkout, uncommitted changes included.
      const known = git("cat-file", "-t", rec.commit) === "commit";
      const changed = known ? git("diff", "--name-only", rec.commit, "--", "design-system", "src", "scripts", "brand", "tools").split("\n").filter(Boolean) : [];
      console.log(`stale: this checkout builds a different page. ${known ? `Changed since ${rec.commit.slice(0, 7)}:${changed.length ? "\n  " + changed.join("\n  ") : " only built files (dist/): run npm run build"}` : `Commit ${rec.commit.slice(0, 7)} is not in this clone: git fetch origin to list the files.`}`);
      console.log("republish: npm run build && npm run showcase:artifact, then publish out/showcase-artifact.html to the same link");
      process.exit(1);
    } else if (args.includes("--artifact")) {
      const out = args[args.indexOf("--artifact") + 1];
      if (args.includes("--people")) { console.error("--people is refused: the published page carries the sample people only (AGENTS.md)"); process.exit(1); }
      const git = (...a: string[]): string => execFileSync("git", a, { cwd: ROOT, encoding: "utf8" }).trim();
      if (git("status", "--porcelain", "--untracked-files=no")) { console.error("the working tree has changes: publish only from a clean checkout of main"); process.exit(1); }
      const commit = git("rev-parse", "HEAD");
      let main = "";
      try { main = git("rev-parse", "origin/main"); } catch { /* no remote here */ }
      if (main && main !== commit) console.warn(`warning: HEAD ${commit.slice(0, 7)} is not origin/main ${main.slice(0, 7)}; the page will say it was built from ${commit.slice(0, 7)}`);
      const src: Source = { repo: REPO, commit, tree: git("rev-parse", "HEAD^{tree}"), date: git("show", "-s", "--format=%cs", "HEAD") };
      const ab = buildShowcase(undefined, src);
      if (!out || extname(out) !== ".html") { console.error("--artifact needs an .html path"); process.exit(1); }
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, ab.fragment);
      console.log(`artifact page written to ${out}`);
    } else {
      mkdirSync(dirname(OUT), { recursive: true });
      writeFileSync(OUT, b.doc);
      console.log(`showcase/index.html written (${(b.doc.length / 1024).toFixed(0)} KB, inputs ${b.hash.slice(0, 12)})`);
    }
  }
}
