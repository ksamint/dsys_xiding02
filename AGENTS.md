# AGENTS.md: instructions for every agent working in dsys_xiding02

Read this file before anything else. It applies to every coding agent (Claude Code, Codex, Cursor and others) and to
people.

## This repository is generated

`ksamint/dsys_xiding02` is the **public, non-sensitive copy** of the private repository `ksamint/dsys_xiding01`, made
by that repository's `tools/public-sync.ts`. `PUBLIC_EXPORT.json` names the private commit each copy came from. Why it
works this way: [docs/adr/0001](docs/adr/0001-private-and-public-repositories.md).

- **Do not edit, commit or push here by hand.** The next sync replaces every file with the export, so a change made
  here is lost.
- **To change something:** if you can work in `dsys_xiding01`, make the change there (follow its `AGENTS.md`) and
  publish it with a sync. Otherwise open an issue here describing the change; it is made in the private repository
  and arrives with the next sync.
- **A sync arrives as a pull request** from a `sync/<private sha>` branch. Before merging one: in a clean checkout of
  that branch run `npm ci` and `npm run check`, and record the commands, results and `git rev-parse HEAD^{tree}` in
  the pull request. Never push to `main` directly.

## What is here and what is not

Here: the 西顶 XIDING design system (`design-system/`, `showcase/`), the brand files of 西頂廣仁宮 (`brand/`), the
business-card editor with fictional people (`cards/`), the introduction pages and the pillar simulator (`src/`,
`scripts/`), docs, tools and tests.

Not here, on purpose: real people's details, the original brand-book PDF, files that record local paths, and the
member app. Never add personal data (names with phone numbers or emails of real people, mainland mobile numbers,
staff emails) to anything in or about this repository.

Names: 西顶文化 (Xiding) is the one short name used to the outside: 艺术 · 教育 · 生活方式. Its three brands are
西顶艺术 (Xiding Arts), 西顶教育 (Xiding Education) and 西顶时光 (Xiding Lifestyle). The public introduction:
https://claude.ai/artifact/EmhEzgmXoCQuTV1GL5VRHV

## Licence

Code is Apache-2.0 (`LICENSE`). The brand, names, marks, design-system content, showcase and the introduction's words
and artwork are all rights reserved (`NOTICE`): they may be read here, not reused. Do not relicense anything.

## Build and check

```bash
npm ci
```

```bash
npm run check
```

It needs Node 22.13+, `cargo` with the `wasm32-unknown-unknown` target, and Playwright's Chromium. No CI runs here:
checks run locally.
