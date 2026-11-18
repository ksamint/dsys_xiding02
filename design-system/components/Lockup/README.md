# Lockup

The mark with 西顶 and XIDING: stacked (mark over the names) or wide (mark beside them). `Xiding.mark({ lockup: 'stacked' | 'horizontal', colorway, style })`.

**You provide** the lockup and a colourway. The words are fixed.

- 西顶 is `wordmark-zh`: Noto Serif SC Bold, opened 0.06em stacked and 0.04em wide. XIDING is `wordmark-latin`: Instrument Sans Medium, capitals, tracked 0.42em. Each line keeps its own face. XIDING is one word in capitals.
- **Stacked** for square and tall spaces (signage, a title page). **Wide** for headers, footers and anything short.
- The lockup needs both web fonts. In a file that will leave the browser (print, a deck for someone else's machine), convert the text to outlines first.
- The mark can stand alone. The names appear with the mark.
