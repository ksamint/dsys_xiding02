# Scatter

散点: the mark's own 40 dots carried off by a wind, out of a flat field and across the paper. `Xiding.scatter({ width, height, x, y, size, spread, hold, angle, strays, seed, field, fieldFill, ink, fieldInk, avoid, breathe })` returns SVG.

**You provide** the size of the drawing, where the mark stands and how tall, the field it stands in, and the boxes your words occupy (`avoid`).

- **The mark stays the mark.** The trailing `hold` share of it (default half) keeps the measured geometry exactly; only past that line do the dots drift, further the further ahead they sit. Use `spread: 0` where the mark itself is meant.
- **Dots change ink at the field's edge.** Inside `field` they are `fieldInk` (white on temple teal, teal on black); outside they take `ink`, by default the surrounding `color` (set `teal` on the stage). One dot that crosses the edge while breathing changes colour as it goes.
- **Words come first.** Pass every block of type as an `avoid` box: no drifted dot or stray settles there. Held dots are never removed, so place the mark clear of the type.
- **Breathing.** With `breathe`, each drifted dot (never a held one) drifts back and forth on its own slow period (5–12 s, about one radius). With reduced motion set, every dot stands still.
- **Seeds.** The same `seed` always draws the same scatter, so a layout can be approved and reproduced. Change the seed, not the code, for a new arrangement.
- In the dark theme a `#000000` field is lifted to `surface` with a `line` edge, so it does not vanish into the page.
- Use it once per view, for covers, heroes, the first screen of a page and objects such as the membership card. Lists, forms and tables stay still.
