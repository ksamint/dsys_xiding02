# ColorwayTile

A pressable tile showing one approved colourway and style of the mark, with its name underneath. Class `xd-tile`; put `Xiding.mark(...)` and a `<span>` inside a `<button>`.

**You provide** the colourway, the style and the caption ("Temple teal, dot").

- Lay tiles four across with `space-12` between them, two across on a phone.
- The chosen tile takes `aria-pressed="true"`: an `ink` border, doubled by an inset line. The border carries the selection.
- Captions are `caption` size, sentence case, colourway first: "Black on white, circle".
