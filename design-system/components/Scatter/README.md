# Scatter

The mark whole in a flat field. `Xiding.scatter({ width, height, x, y, size, field, fieldFill, ink, fieldInk, title, spread: 0 })` returns SVG: the mark at `x`, `y` and `size`, standing in `field`, its dots in `fieldInk` inside the field and in `ink` outside it.

**Retired on 2026-11-18 by the owner: the dots no longer drift.** Every composition keeps the mark whole, so call it with `spread: 0` and no `strays` (the previews, Cover, Hero, the H5 screens and the showcase all do). The drift options (`spread` above 0, `hold`, `angle`, `strays`, `seed`, `avoid`, `breathe`) stay in the code so older pages still draw, but they are not used.

**You provide** the size of the drawing, where the mark stands and how tall, and the field it stands in.

- **The mark stays the mark.** All 40 dots keep the measured geometry; nothing is carried off the mark.
- **Dots change ink at the field's edge.** Inside `field` they are `fieldInk` (white on temple teal, teal on black); outside they take `ink`, by default the surrounding `color`. A mark placed across the field's edge is cropped by colour, not moved.
- In the dark theme a `#000000` field is lifted to `surface` with a `line` edge, so it does not vanish into the page.
- Use it once per view, for covers, heroes, the first screen of a page and objects such as the membership card. With `Xiding.assemble()` the mark may assemble once, dot by dot; after that it holds still.
