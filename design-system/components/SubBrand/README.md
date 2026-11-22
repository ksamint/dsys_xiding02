# SubBrand

A sub-brand is named on the brand row of the master lockup, under the one mark. `Xiding.subBrand({ layout, latin, brands, colorway })`.

**You provide** the sub-brand names in Chinese (`brands`), and optionally the Latin line (`latin`).

- **西顶教育 · XIDING EDUCATION** — `subBrand({ latin: 'XIDING EDUCATION', brands: ['西顶教育'] })`. The Latin line is fitted to the width of 西顶.
- **西顶艺术 · XIDING ARTS** — `subBrand({ latin: 'XIDING ARTS', brands: ['西顶艺术'] })`.
- **西顶时光 · XIDING LIFESTYLE** — `subBrand({ latin: 'XIDING LIFESTYLE', brands: ['西顶时光'] })`.
- **All three** — `subBrand({ brands: ['西顶艺术', '西顶教育', '西顶时光'] })`, joined by the pair dot, as on the business card.
- **Wide** follows the card front: 西顶 spans dot rows B to E, the Latin line sits on row G, the brand row on row H, so every line of type rests on a row of dots. **Stacked** puts the brand row one step under the Latin line.
- The brand row is `brand-row`: serif semibold, tracked 0.28em.

The wide layout is the studio's own card front. The stacked layout and the fitted "XIDING EDUCATION" line are additions made for the Academy: confirm them before print.
