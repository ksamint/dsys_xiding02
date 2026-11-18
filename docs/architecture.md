# Xiding introduction: architecture

Status: agreed for now on 2026-11-14; the brands updated on 2026-11-17. The place is about legacy and beauty; 人生 (life) was removed on 2026-11-13. The words live in `src/shared/content.ts`; this note explains the shape.

## The opening

Only two things: 西顶, and 一方传承大美的自在天地 (English: "A world at ease, of legacy and beauty"). The same lockup
opens the deck (slide 2), the site and the overview.

## 1 – 2 – 3 – X

| Count | What | 简体 | English |
| --- | --- | --- | --- |
| 1 | Who we are | 我们是谁：西顶，春秋百载，贯通东西 | Who we are |
| 2 | What we do: the two brands | 我们做什么：西顶艺术、西顶学院 | What we do |
| 3 | How we do it: the three pillars | 我们怎么做：空间 × 活动、课程 × 服务、会员 × 定制 | How we do it |
| X | The Xiding ecosystem: modules, ecosystem, foundation | 西顶生态 | Xiding ecosystem |

### 1: who we are

西顶，春秋百载，贯通东西。Then the two values: 传承 (the centre) and 大美.

### 2: what we do

西顶文化 is the one short name Xiding uses to the outside (Xiding in English). It has two institutions, one team and two
brands. The two brands stand side by side, a hairline between them: 西顶艺术 (XIDING ARTS) and 西顶学院 (XIDING ACADEMY).
The site's footer names 西顶文化 and the two brands.

西顶时光 (Xiding Lifestyle) is the name of membership, on the member card in the member app. It used to be the first
brand, which is now 西顶艺术.

### 3: the pillars, and their modules under X

| Pillar | Ink | Core modules |
| --- | --- | --- |
| 1 空间 × 活动 Space × Events | Temple teal | 场地服务; 活动策划与执行; 主题活动; 预约与现场运营 |
| 2 课程 × 服务 Courses × Services | Black | 课程与培训; 顾问咨询; 落地陪跑; 方案库与 AI 应用 |
| 3 会员 × 定制 Members × Tailor-made | White, ink hairline | 会籍与邀请制; 大美艺术分享; 定制活动; 会员专属服务 |

Each pillar's slide shows its four modules side by side: a picture each, the module's name and one line, joined by
one rail that runs on X (运行于真知与范式). The member calendar uses the same three names and inks.

### X: the Xiding ecosystem

3 names the three pillars. X shows the whole system in one picture, after the design system's 一底三柱: the
ecosystem across the top (members, experts, artists, spaces, partners, one agent each), the three pillars standing
with their twelve modules, and the foundation (底座) as the base; then one slide per pillar shows its four modules
with a picture each. Headline: AI原生　西顶先行.

- **真知 Truth**: 唯一事实源　分账系统, the single source of truth and the revenue split.
- **范式 Paradigm**: 专家认知与传承的协作范式, how expert knowledge and legacy work together.
- **分账协同 Revenue sharing**: 智能体之间对接、交付、分账, agents match, deliver and split revenue.
- Under the three, one more row: **开源知识库** (open-source knowledge base) and **A2A智能体生态** (A2A agent ecosystem).

## The logo

The logo is the mark and 西顶 from the design system's wide lockup, 西顶 spanning dot rows B to E. Nothing else
sits with it at the top of a page: on the deck's cover, the site's opening and the overview it is the logo and at
most one line, 一方传承大美的自在天地. The full lockup (XIDING on row G, the brand row on row H) stays available in
`lockupSvg`. The logo is artwork: it keeps 西顶 in every language.

The overview's head pairs the logo and its one line on the left margin with the mark large in the design system's
open-ring style on the right (its style for large, quiet uses), both centred on the band's height. Every closing names the place as 西顶庙 alone.

The deck's and the overview's bottom bars, and the site's footer, have 复制文字 (Copy text): one click puts the whole 1 – 2 – 3 – X introduction
on the clipboard as plain text, in the language on screen (`src/shared/plain.ts`).

In X, the foundation's second row (开源知识库, A2A智能体生态) is set at the same size as 真知, 范式 and 分账协同.

## Open points

- "UCE" in "A2A UCE future" is not spelled out yet, so it does not appear on any page.
- The QR code leads to xidingmiao.com, which did not answer when checked on 2026-11-13. Publish the member calendar there (it is built with the member app), or set `XIDING_EVENTS_URL`, before printing.
- The modules are a first list. Rename, strike or add in `src/shared/content.ts`.
- The design system's own introduction (西顶是什么) still describes the earlier three lines of work, 智行、美成、礼遇, on the base 大美、大智、大礼. This repository follows the plan above. One of the two should be updated.
- 春秋百载 reads as "a hundred years"; the design system dates the temple to the Ming dynasty, about four hundred years.
- The roles of the two brands (which looks after people, which after content) were taken out on 2026-11-17, to be written again.

## Components and their languages

| Component | Language |
| --- | --- |
| Deck, site, overview | Strict TypeScript, rendered to self-contained HTML by `scripts/build.ts` |
| Catalogue, calendar and space ledger (`src/shared`) | TypeScript, the samples the site's calendar shows |
| Build, tests, render check, PDF and PNG export | TypeScript (`tsx`, `esbuild`, Playwright) |

The member app (时光 · 课程 · 我的), the member page, the service (API, PostgreSQL, MCP) and the media server are
developed in a separate repository since 2026-11-18 (ADR 0002, kept in the private repository).

## Design

The direction is quiet: one picture or one field, and one line, per view. Black and paper carry the pages; temple
teal opens and closes them and appears once in the middle, for the first pillar. Display type is set at a medium
weight with wide tracking; labels, counters and captions are small tracked capitals. A slide carries at most 32
English words or 64 Chinese characters, and a test holds that line. On the site, a module shows its name; its one
sentence opens when a reader asks.

Tokens and the mark come from the 西顶 XIDING design system: three inks (temple teal, black, white),
Noto Serif for what is said aloud, Instrument Sans for what is read, nearly square corners and 1px hairlines.
Two additions to it: Noto Serif TC for Traditional Chinese, and Cormorant Garamond for the figures 1, 2, 3, X and for
English display lines.

Pictures are slots (`src/shared/photo.ts`). The briefs and the prompts follow the design system's rule: the site,
straight on, in daylight, with people doing something, and none of the stock temple pictures.
