# Mark

The dot mark: 32 marks in 8 rows, 40 circles, mirrored about a centre axis. `Xiding.mark({ colorway, style })` returns it as SVG; the files in Logos are the same drawings.

**You provide** a colourway and a style.

- **Colourways** — `teal` (white on `brand-teal`, the default and the first choice), `ink` (black on white), `night` (white on black), `tealInk` (teal on white). These four are the whole set.
- **Styles** — `dot` is the logo. `ring` (the studio calls it Circle) and `point` are the same points drawn lighter: use them large, as a pattern or a watermark.
- **The eight approved pairs** are in `Xiding.PRESETS`: teal dot, black dot, white dot, black circle, black point, white circle, teal circle on white, white point.
- **Clear space** — keep `mark-clear` (140 of the mark's 1356 units, about a tenth of its height) free on every side. The exported files already include it.
- **Smallest size** — 9.5 mm tall in print (the centred card back), 24 px on screen in `dot`. Below that the paired dots close up.
- On a colour of your own, pass `ink` and `ground`: `Xiding.mark({ ink: 'currentColor', ground: 'none' })`.

Leave the mark as drawn: upright, whole, in one ink, on a flat field, with its clear space empty.
