西顶 (Xiding) takes its name from 西顶庙 in Haidian, Beijing, a Ming temple known since 1712 as 广仁宫.

西顶文化 is the one short name Xiding goes by to the outside; in English it is Xiding. It is one team with three brands, 西顶艺术 (Xiding Arts), 西顶教育 (Xiding Education) and 西顶时光 (Xiding Lifestyle): art, education and lifestyle (艺术 · 教育 · 生活方式). Membership runs across all three.

The identity is three inks and a field of dots: temple teal, black, white, and a mark of 40 circles. The three inks stand for the three brands.

Read **西顶是什么** for the full introduction and the names, and **文案 · Voice** before writing a word for 西顶.

## Voice

- Say what is here and what happens here.
- Every public line names two of four things: a place (处), a time (时), a person (人), an act (事). If the sentence could not be photographed, rewrite it.
- Cut category words and self-praise: 文化生态, 平台, 体系, 赋能, 打造, 引领, 高端, 顶级, 唯一.
- Cut these sentence patterns: 「不……只……」, 「不是……而是……」, 「至少……」, and "not X but Y" or "at least" in English. Keep the positive half of the sentence.
- Cut slogan endings such as 「今天还开课」. A sentence stops on its fact.
- Headlines state a fact or an act, in one or two lines, broken at a comma. A last line holds three characters or more.
- Sentences end with a full stop. The system uses no exclamation marks and no emoji.
- The name is 西顶 in Chinese and Xiding in English text: one word, capital X. The Latin line of a lockup is set in capitals: XIDING, XIDING ARTS, XIDING EDUCATION, XIDING LIFESTYLE. The site is 西顶庙.
- 西顶文化 is Xiding, 西顶艺术 is Xiding Arts, 西顶教育 is Xiding Education and 西顶时光 is Xiding Lifestyle.
- Tone: restrained, concrete, sourced (克制、具体、有出处). Business results stay in case studies; every figure carries its source.
- Interface text is plain sentence case, verb first: "Download SVG", "Show construction lines", "Leave empty to hide".

## The three brands

- Each brand has one ink: 西顶艺术 is `ink-arts` (temple teal), 西顶教育 is `ink-academy` (black), 西顶时光 is `ink-lifestyle` (white, drawn with an `ink` hairline). Text on them is `on-ink-arts`, `on-ink-academy`, `on-ink-lifestyle`. Colour here tells the brands apart; the brand's name is written beside it every time.
- Use `Xiding.BRAND_DETAILS` for each brand's id (also its ink), names, its word in the tagline (艺术, 教育, 生活方式), field, services and lines, and `Xiding.TAGLINE` for 艺术 · 教育 · 生活方式.
- The three brands may stand as three pillars on one base: use the Pillars component for it, and PillarCard for slice titles and quote cards.
- Retired on 2026-11-19: the three lines of work under the brands, the three pillars they stood on and the value line made of their mottos.

## Colour

- Three brand inks stay the same in both themes: `brand-teal` (Temple teal), `brand-black`, `brand-white`. They are the whole brand palette.
- Four colourways for the mark and for any brand field: white on `brand-teal` (first choice), black on white, white on black, teal on white.
- Pages sit on `paper`, panels and cards on `surface`, text in `ink`, secondary text in `muted`, hairlines in `line`.
- Teal as text is `teal-text`. `teal` is for shapes and for type at 24px and above.
- `brand-black` type may sit on `brand-teal` (5.8:1) where the teal is a dot or a button: a chosen day, the one teal action dot on a screen, the teal call to act. Text on a teal field stays `brand-white`.
- The mark and large type sit on `brand-teal` in `brand-white`. Small text goes on `paper`, `surface`, white or black.
- Keyboard focus is a solid 2px `focus` outline, offset 3px.
- `guide-trim` and `guide-safe` are for print proofs.

## Type

- Songti for what is said aloud, sans for what is read. `--font-serif` is Noto Serif SC (500, 600, 700); `--font-sans` is Instrument Sans (400, 500, 600). Both are hosted on Google Fonts: load them with a stylesheet link, and convert lockups to outlines before print.
- 西顶 is set in `wordmark-zh`; XIDING in `wordmark-latin`, capitals tracked 0.42em. Sub-brand names are `brand-row`, tracked 0.28em.
- One idea per screen: large type and shapes first, few notes, generous empty space.
- One `hero` or `display` line per view. Section headings are `title`. Running text is `body`; the line under a title is `lede` in `muted`.
- Labels are `label`, buttons `ui`, hints and captions `caption` in `muted`, SVG and point data `code`.
- Chinese text is opened with letter-spacing. A two-character personal name on a card is opened to the width of three.
- Figures in tables and readouts use tabular numerals.

## The mark

- Use the files in Logos, or `Xiding.mark()`. The point data is in `assets/Logos/xiding-mark-points-extracted.json`; draw from it and leave the mark as it is.
- `dot` is the logo. `ring` and `point` are for large, quiet uses: a pattern, a watermark, a cover.
- Keep `mark-clear` free on every side. Smallest size: 9.5 mm tall in print, 24px on screen.
- Lockups: mark alone, stacked, or wide. A sub-brand is named on the brand row of the master lockup, under the one mark.
- Line type up with the dots. In the wide lockup 西顶 spans dot rows B to E, the Latin line rests on row G and the brand row on row H.
- Names or facts on one line are joined by the pair dot (two overlapping dots).

## 自在 · The art layer

Covers, heroes and the first screen of every page are composed like a hanging scroll, not a form.

- **Hang the words.** Titles and the tagline may be set vertically (`xd-vert`, right to left): page titles at 88px against the right edge, the tagline in three columns.
- **Leave the space empty.** A composition holds one field, one block of words and the mark. Nothing fills the rest.
- **Keep the mark whole.** In its field the mark stands as drawn, all 40 dots in place, drawn large and cropped by the field's edge where the layout wants it. Dots never drift out of the mark or scatter across the paper (decided by the owner on 2026-11-18): call `Xiding.scatter()` with `spread: 0` and no `strays`, or use `Xiding.mark()`.
- Forms, rows of facts and buttons stay plain and level: the art is in the composition, never in the controls.

## Layout, space and edges

- Spacing steps are `space-8`, `space-12`, `space-16`, `space-20`, `space-24`, `space-40`, `space-72`. Panels pad `space-20`; tiles sit `space-12` apart; sections sit `space-40` to `space-72` apart.
- Corners are nearly square: `radius-sm` on controls, `radius-md` on panels, tiles and tables. `radius-full` is for dots and swatches.
- Edges are 1px `line` hairlines. The interface is flat. `shadow-card` and `shadow-thumb` lift a printed card in a mockup.
- Selection is shown by an `ink` fill or an `ink` border.
- Compose in flat rectangular fields of teal, black and white, like the colourway tiles. One field per view carries the mark.
- On screens, fields run edge to edge. The mark in a field is drawn large (about 400px tall on a 375px screen) and cropped by the field's edge, clear of the headline. Lists are ruled rows on the page, not boxed cards.

## Imagery

- The system ships without photographs. When they arrive, they show the real site: its gate, halls and courtyards, straight on, in daylight, with people doing something.
- Guest portraits for the programme are shot in the same room, from the same camera position, in the same light, so every guest belongs to one series.
- The root is 广仁宫 and the expression is contemporary. Leave out imitation-antique styling.
- Leave out stock pictures of tea, incense, hands and calligraphy brushes. Leave out 祥云, 回纹, 水墨晕染, 朱红描金, seals, lanterns and roof silhouettes. Leave out glow, particles and gradients.
- The mark sits on a flat field beside a photograph.

## Iconography

- The dot is the pictogram. The system has no icon set and no emoji.
- Brand tags are round dots of the brand's ink. On screens, a row's action is a 56px dot carrying a one-word verb (报名, 预约); a call to act ends on the pair dot.
- Contact lines use one-letter labels (M, E, W, A) in `teal-text`.
- Colour choices are shown with an `xd-swatch` dot beside the colour's name.

## Motion

- The mark may assemble once, dot by dot, when it first appears: `Xiding.assemble(el)` staggers the dots row by row, top first. Dots respond to a pointer with a 0.18s ease-out scale.
- Fields change colour over 0.35s; controls over 0.15s.
- After it has assembled the mark holds still. Dots do not drift or breathe.
- With reduced motion set, everything appears in place.

## Using the files

- `components/bundle.js` is one classic script that sets `window.Xiding`. It needs no framework. `Xiding.mark()`, `Xiding.subBrand()`, `Xiding.brandRow()` and `Xiding.card()` return strings of SVG or HTML: set them as `innerHTML` or save them as files. Types are in `components/index.d.ts`; the TypeScript source is `components/src/xiding.ts`.
- `components/bundle.css` holds the `xd-` classes for the controls, the brand row and the hero. It reads the token variables, so load the tokens first.
- `Xiding.kit()` lists every generated asset as a drawing; `Xiding.toSVG(art)` and `Xiding.toPNG(art)` turn one into a file. The AssetKit page draws the whole kit live and saves files from it. `components/src/build-assets.ts` writes the same kit to disk for outlining.
- Assets holds the files: Logos (the mark, avatars, PNG), Wordmarks (names), Pillars (the three brands as pillars, and their plates), Intro (the architecture and four-step diagrams), Cards (the card front) and Reference (`links.json`).
- 参考 · References keeps Xiding's links, the benchmarks, the sources for the facts and the system's own measured figures.
- Each component's README says what you provide and when to use it.

## Intentional additions

These were added to the mark studio's inventory so XIDING EDUCATION material can be made from this system:

- The `hero` type style and the Hero layout.
- Retired on 2026-11-19 by the owner: the six H5 screens (首页, 会员, 预约空间, 学院, 展览, 全年日历), FieldBlock, the `h5-*` tokens and every part only they used (the brand band, lists, calls to act, tab bar, membership card, detail rows, pickers, calendar, stones, loose list, poem, held card).
- VideoCover, Subtitle, Slide, DoorPlate and SceneMenu: the layouts the IP document lists as still to be specified, drawn with the existing inks and type.
- The brand inks: one identifying colour per brand and a neutral base; this system assigns the three existing inks and uses `paper` as the base (until 2026-11-19 they were the three pillar inks).
- The stacked sub-brand lockup and the fitted "XIDING EDUCATION" Latin line in SubBrand.
- Button hover in `teal-text`, so the label holds 4.5:1.
- v1.8: the source VI of 西頂廣仁宮 (`brand/xiding-guangren-vi/`, 品牌形象-5): its six swatches as `vi-*` tokens, its 13 logo files as the VI asset group, and its nameplate as TempleSign. The brand teal is an open decision (see 尚未统一 · Open decisions).
- v1.7: the page kit the five live Xiding pages share (Ink, LockupMotion, Photo, Whisper, Export, Go, Lang, Ecosystem; FieldBlock was retired with the H5 screens), Cormorant Garamond figures (`--font-figure`), CJK sans fallbacks, and font swaps for `<html lang="en">` and `lang="zh-Hant"`. `.xd-field` is the form Field's alone.
- 2026-11-18: the mark stays whole. The drifting, scattered dots of v1.6 are retired from every composition (Cover, Hero, the showcase); `scatter()` keeps its options for compatibility, and every composition calls it with `spread: 0`.
- The art layer (v1.6): vertical type, `Xiding.scatter()` with `hold`, `avoid` and breathing, and the Cover and Hero recomposed on it.
- The expressive mobile layer (v1.5): `brand-black` on `brand-teal` for dots and buttons, round brand dots, and `Xiding.assemble()`. No hue was added. Its mobile screens were retired on 2026-11-19.
