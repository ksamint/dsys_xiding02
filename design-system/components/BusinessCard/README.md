# BusinessCard

The 90 × 54 mm card, front and back, laid out by the mark studio's own rules. `Xiding.card({ side, person, front, back, frontLayout, backLayout, orientation, brands, guides, bleed })` returns one side as SVG in millimetres.

**You provide** the person (`nameZh`, `nameEn`, `titleZh`, `titleEn`, `phone`, `email`, `web`, `address`). An empty string hides that line. `Xiding.PEOPLE` holds three cards with the fictional samples 张三 (首席执行官 CEO), 李四 (院长 Dean) and 王小五 (董事 Director). The real people stay in `private/people.json`; a private build swaps them in with `Xiding.setPeople()` (the published showcase does, through `tools/showcase.ts --people`).

- **Sizes** — trim `card-width` × `card-height`, `card-bleed` on every side, `card-safe` inside. One margin for everything: `card-margin`.
- **Type** — the Chinese name at `card-name`, serif bold; a two-character name is opened to the width of three. Every other line at `card-small` on a `card-lead` leading. Contact lines carry one-letter labels (M, E, W, A) in `teal-text` on white.
- **Front** — the mark alone over the brand row (default), or the mark with 西顶, XIDING and the brand row, each line of type resting on a row of dots.
- **Back** — white with a teal mark (default), black, or teal; left aligned or centred. Centred, the phone and email share a line joined by the pair dot.
- **Address lines** break at 区, 街道 or 路 into two balanced lines, so no line is left with a stray character or two.
- For print, pass `bleed: true` and convert text to outlines. `guides: true` draws the trim in `guide-trim` and the safe area in `guide-safe`.

On the teal front the brand row is 2.2 mm white type on `brand-teal` (3.6:1). It is kept as the studio draws it; where the row has to be read at a glance, use the white or black front.
