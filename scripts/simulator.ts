// Builds the 西顶 pillar simulator: one self-contained page that draws the mark with the design system's own bundle
// and measures it from the bundle's geometry and the mark-* tokens.
// Usage: tsx scripts/simulator.ts [--out dist/simulator/index.html] [--artifact <file>]
//   --artifact writes the page without its document skeleton (the claude.ai viewer adds one), for publishing.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { loadTokens, toCSS } from "../tools/tokens";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DS = join(ROOT, "design-system");
const args = process.argv.slice(2);
const opt = (name: string): string | undefined => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const out = opt("--out") ?? join(ROOT, "dist/simulator/index.html");
const artifact = opt("--artifact");

const git = (...a: string[]): string => {
  try { return execFileSync("git", a, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return ""; }
};
/** owner/name from the origin remote, whatever host or proxy it goes through. */
function repoName(): string {
  const url = git("remote", "get-url", "origin").replace(/\.git$/, "");
  const m = /([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/.exec(url);
  return m ? `${m[1]}/${m[2]}` : "";
}

const tokens = loadTokens(join(DS, "tokens.json"));
const markFamily = (tokens as unknown as Record<string, { tokens?: { name: string; value: unknown }[] }>)["mark"];
const mark: Record<string, number> = {};
for (const tk of markFamily?.tokens ?? []) mark[tk.name] = Number(tk.value);
for (const k of ["mark-width", "mark-height", "mark-dot", "mark-point", "mark-ring", "mark-pair", "mark-clear"])
  if (!Number.isFinite(mark[k])) throw new Error(`tokens.json: ${k} is missing or not a number`);

const source = { repo: repoName(), commit: git("rev-parse", "HEAD"), date: git("log", "-1", "--format=%cs"), dirty: git("status", "--porcelain", "--untracked-files=no") !== "" };
const bundleJS = readFileSync(join(DS, "components/bundle.js"), "utf8");
const bundleCSS = readFileSync(join(DS, "components/bundle.css"), "utf8");
const pageCSS = readFileSync(join(ROOT, "src/simulator/simulator.css"), "utf8");
const app = await build({ entryPoints: [join(ROOT, "src/simulator/main.ts")], bundle: true, write: false, format: "iife", target: "es2020", minify: true, legalComments: "none" });
const appJS = app.outputFiles[0]?.text ?? "";
const json = (v: unknown): string => JSON.stringify(v).replace(/</g, "\\u003c");
const noClose = (s: string): string => s.replace(/<\/script/gi, "<\\/script");

const FONTS = "https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&family=Noto+Sans+SC:wght@400;500&family=Noto+Serif+SC:wght@500;600;700&display=swap";
const head = `<title>Xiding Pillar Simulator</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="西顶标识模拟器：实点、圆圈、细点与配色，比例、间距与留白都按源单位标出。">
<meta name="xd-source" content="${json(source).replace(/"/g, "&quot;")}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<style>
${toCSS(tokens, true)}
${bundleCSS}
${pageCSS}
</style>`;

const body = `<div class="sim-wrap">
<header class="sim-head">
  <div><span class="sim-latin">Xiding Pillar Simulator</span><h1>西顶标识模拟器</h1>
  <p class="sim-lede">标识由 8 行、32 个点位、40 个圆组成。在这里换样式、配色、点径与组合，看它按源单位（u）量出的比例、间距与留白，并换算成毫米与像素。所有数字读自设计系统，不在本页另写。</p></div>
  <div class="sim-theme" id="theme" role="group" aria-label="主题"><button type="button" data-theme="" aria-pressed="true">系统</button><button type="button" data-theme="light" aria-pressed="false">浅</button><button type="button" data-theme="dark" aria-pressed="false">深</button></div>
</header>
<main class="sim">
  <form class="xd-panel sim-controls" id="controls" aria-label="设置"></form>
  <section class="sim-view" aria-label="标识">
    <div class="sim-stage" id="stage"></div>
    <div class="sim-actions">
      <button type="button" class="xd-btn xd-btn--primary" id="b-copy">复制 SVG</button>
      <button type="button" class="xd-btn" id="b-save">保存 SVG</button>
      <button type="button" class="xd-btn" id="b-json">复制规格 JSON</button>
      <button type="button" class="xd-btn" id="b-reset">恢复规范</button>
      <span class="sim-status" id="status" role="status" aria-live="polite"></span>
    </div>
    <textarea class="sim-fallback" id="fallback" hidden readonly aria-label="复制用的文本"></textarea>
    <div class="sim-cards">
      <figure class="sim-card sim-detail"><h2>双点细部</h2><div id="detail"></div></figure>
      <div class="sim-card"><h2>比例与单位</h2><dl class="sim-ratio" id="ratio"></dl></div>
    </div>
  </section>
</main>
<section class="sim-tables" aria-label="规格">
  <div><h2>尺寸 <small>标识高 <span id="unit-h"></span></small></h2>
  <p>u 是源单位，标识外框高 ${mark["mark-height"]} u。毫米、像素与磅按左侧「输出尺寸」换算。</p>
  <div class="xd-table-scroll"><table class="xd-table"><thead><tr><th>量</th><th>u</th><th>mm</th><th>px</th><th>pt</th><th>说明 · 出处</th></tr></thead><tbody id="measures"></tbody></table></div></div>
  <div class="sim-two">
    <div><h2>行</h2><p>每行圆心的 y 与到下一行的距离（行距）。</p>
    <div class="xd-table-scroll"><table class="xd-table"><thead><tr><th>行</th><th>y (u)</th><th>行距 (u)</th><th>点位</th><th>圆</th><th>y (mm)</th></tr></thead><tbody id="rows"></tbody></table></div></div>
    <div><h2>列</h2><p>同一组行共用的圆心 x 与列距；± 是双点的半距。</p>
    <div class="xd-table-scroll"><table class="xd-table"><thead><tr><th>行</th><th>x (u)</th><th>列距 (u)</th></tr></thead><tbody id="cols"></tbody></table></div></div>
  </div>
  <details class="sim-more"><summary>40 个圆的圆心</summary>
    <div class="xd-table-scroll"><table class="xd-table"><thead><tr><th>编号</th><th>cx (u)</th><th>cy (u)</th><th>距外框左 (mm)</th><th>距外框上 (mm)</th></tr></thead><tbody id="circles"></tbody></table></div></details>
  <div><h2>同一个数，两处写</h2><p><code>tokens.json</code> 的 mark-* 令牌与 bundle 里的常数应当相同；不一致时这里标红，<code>npm run check</code> 也会失败。</p>
  <div class="xd-table-scroll"><table class="xd-table"><thead><tr><th>令牌</th><th>tokens.json</th><th>bundle</th><th>bundle 中的位置</th><th></th></tr></thead><tbody id="agree"></tbody></table></div></div>
</section>
<footer class="sim-foot" id="source"></footer>
</div>
<script type="application/json" id="xd-sim-data">${json({ tokens: mark, source })}</script>
<script>${noClose(bundleJS)}</script>
<script>${noClose(appJS)}</script>`;

const doc = `<!doctype html>
<html lang="zh-Hans">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${head}
</head>
<body>
${body}
</body>
</html>
`;
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, doc);
console.log(`simulator: ${out} (${Math.round(doc.length / 1024)} KB, ${source.commit.slice(0, 7) || "no commit"}${source.dirty ? ", uncommitted changes" : ""})`);
if (artifact) {
  mkdirSync(dirname(artifact), { recursive: true });
  writeFileSync(artifact, `${head}\n${body}\n`);
  console.log(`simulator artifact: ${artifact}`);
}
