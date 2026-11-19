# AssetKit

Every asset the system generates, drawn at the moment the page opens: lockups, sub-brand lockups, wordmarks, the three brands as pillars and the business cards. `Xiding.kit()` returns the list; `Xiding.toSVG(art)` and `Xiding.toPNG(art)` turn one entry into a file.

**You provide** nothing. To add an asset, add it to `kit()` in `components/src/xiding.ts`; it then appears here and in the build.

- **One source.** Each asset is a list of shapes and type made by the bundle from the mark's points, the brand inks and `Xiding.BRAND_DETAILS`, `Xiding.BRANDS` and `Xiding.PEOPLE`. Change a name, a word or a card detail there and every tile follows.
- **PNG** is drawn on a canvas with the page's own fonts, so the type is exact. Lockups export at their source size, cards at 300 dpi with bleed.
- **SVG** keeps live text and needs Noto Serif SC and Instrument Sans where it is opened.
- **Files in Assets.** Assets that use the serif alone are also stored as outlined SVG files under Wordmarks, Pillars and Cards. They are produced by `components/src/build-assets.ts` from this same list. Assets that carry the Latin line need Instrument Sans, so they are saved from this page.
- Save buttons appear where the page is allowed to save files.
