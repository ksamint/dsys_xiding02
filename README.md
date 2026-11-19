# dsys_xiding02: 西顶 XIDING design system (public copy)

> This repository is generated. It is the public, non-sensitive copy of the private repository `dsys_xiding01`,
> where every change is made. Do not commit here: each sync replaces these files. `PUBLIC_EXPORT.json` names the
> private commit this copy was made from. Why it works this way: [docs/adr/0001](docs/adr/0001-private-and-public-repositories.md).

## What is here

| Folder | What it is |
| --- | --- |
| `design-system/` | The 西顶 XIDING design system (v1.8): tokens, components with previews, the component bundle (`components/bundle.js`, built from `components/src/xiding.ts`), assets, the brand book (`intro.md`, `voice.md`) and open decisions |
| `showcase/` | One self-contained page showing the whole system and the three introduction pages; open `showcase/index.html` |
| `brand/` | The source visual identity of 西頂廣仁宮: logos (SVG, PNG), palette, the brand-book pages as images, and the text taken from it |
| `cards/` | The business-card editor (TypeScript, with a Rust snap engine built to WebAssembly). The people on the cards are fictional samples |
| `src/`, `scripts/` | The introduction to Xiding: a 12-slide deck, the official site and a one-page overview, in English, Traditional and Simplified Chinese; and the pillar simulator (`src/simulator/`), which draws the mark in each style and colour with its ratio, spacing and clear space measured |
| `docs/` | The content architecture and the decision records |
| `tools/`, `tests/` | Builds and checks |

The names: 西顶文化 (Xiding) is the one short name used to the outside: 艺术 · 教育 · 生活方式. Its three brands are
西顶艺术 (Xiding Arts), 西顶学院 (Xiding Academy) and 西顶时光 (Xiding Lifestyle). The public introduction:
https://claude.ai/artifact/EmhEzgmXoCQuTV1GL5VRHV

## What is not here

The real people on the business cards, the original brand-book PDF (until the licences of its embedded fonts are
confirmed), and the member app and its service, which are developed elsewhere.

## Build and check

Node 22.13 or later, Rust with the `wasm32-unknown-unknown` target, and Playwright's Chromium.

```bash
npm ci
```

```bash
npm run check
```

`npm run build` writes the introduction pages to `dist/`; `npm run showcase` rebuilds `showcase/index.html`;
`npm run build:card:public` writes the card editor to `out/xiding-card.public.html`; `npm run build:simulator` writes the
pillar simulator to `dist/simulator/index.html`.

## Contributing

Issues are welcome here. Changes are made in the private repository and arrive with the next sync, so a pull request
opened here is read, and its change is made there.

## Licence

The code is licensed under the Apache License 2.0 (`LICENSE`). The brand and content are not: the names and marks
(西顶, Xiding, 西顶文化, 西顶艺术, 西顶学院, 西顶时光, 西頂廣仁宮 and the dot mark), `brand/`, the design system's
tokens, assets and brand book, `showcase/`, and the introduction's words and artwork are all rights reserved, and may be
read here but not reused. `NOTICE` lists exactly what is which.

## For agents

Read `AGENTS.md` first (Claude Code reads it through `CLAUDE.md`). In short: this repository is generated; do not
edit it by hand.
