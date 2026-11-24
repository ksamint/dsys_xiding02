# 西顶 · 二维码

Type an address, get a 西顶 share card (1080 × 1440 PNG) with its QR code. One static page, TypeScript only,
built from this repository (and so also in dsys_xiding02).

```
web/src/qr.ts       QR encoder, byte mode UTF-8, ECC M, versions 1–40, no dependencies
web/src/card.ts     the card: 立轴 (field two thirds, mark whole, name hung vertically, code at the foot) or 横卷; 4 colourways
web/src/wordmark-data.ts  西頂廣仁宮 calligraphy paths, from dsys_xiding02 assets/VI/chinese-wordmark-teal.svg
web/src/editor.ts   移动与缩放: select, drag with snapping, corner or pinch to resize, keyboard nudges
web/src/history.ts  history in localStorage (this browser only, 40 entries)
web/src/save.ts     PNG save: claude.ai `downloads` capability, else a download link
web/src/main.ts     the page
../../tests/qr.test.ts  encodes 9 cases (v1–v25, Chinese, long), reads them back with jsQR, and checks the mark and wordmark against the design system
```

```bash
npm run build:qr   # writes dist/qr/index.html
npm run check      # the repository check: typecheck, tests (the QR decode test too), builds, showcase
```

`npm run build:qr` writes `dist/qr/index.html`, self-contained, the photos included: put it on any static host. `?url=` fills the address.

- A bare domain gets `https://`. Anything else is encoded as typed.
- Everything on screen (address, name, every adjustment and move) saves itself as you work and comes back on reload (saved at once when the page is hidden or closed);
  a history entry for the same address takes the latest look. 存为默认 keeps the current style as your own default:
  复位 and new cards start from it. All of it stays in this browser.
- History is kept on save, on copy, and on Enter, with the card's adjustments, up to 200 entries. A second tap on 清空 confirms.
- Each entry has an ID (XD-0001, XD-0002 …) given once and never reused, even after a delete; entries from before IDs
  get theirs oldest first. 标签: type them split by commas, 、 or spaces (# allowed), up to 8. 说明: a free description.
  Tags and description save with the entry, and edits to the current entry update it as you type.
- Above the list: a search (ID, name, address, tags, description) and tag filters, most used first.
- Browsers start with space.apuch.cn/home/xiding (扫码登陆, 方 · 空, 匾), xiding.apuch.cn and show01.opcglobal.cn/xiding
  (`SEEDS` in history.ts). Each link is added once, so a deleted one stays deleted; a link added later reaches every
  browser and opens first on its next visit.
- 版式 立轴 (default), 横卷, 门牌 (the banner), or 方 (1:1, 1440 × 1440) in three 构图, all from one idea — the mark is forty dots and the code is dots:
  点 (default) the mark drawn huge on its field, cropped by the field's edges, over an ivory rail where 西頂廣仁宮,
  the name and the code share one baseline; 空 emptiness after Kenya Hara — a small mark top left, the name hung at
  the right edge, the code and 西頂廣仁宮 on the foot line, and between them a photo of the temple in a window from
  the mark's top to the code's top; 印 the code as the image, large,
  with a narrow column of mark, name and 西頂廣仁宮 beside it. Ground is the VI's ivory (#F3F1E8). 门牌: the temple's nameplate (2560 × 640) — the mark in a VI-teal square, then one
  VI-charcoal panel to the right end with 西頂廣仁宮, Xiding Guangren Temple, and the code with its label (名称, e.g.
  网上预约), justified to the code: the first character's ink on its left edge, the last one's on its right
  edge (to the white tile in 白底). 二维码 (门牌 only): 反白, white on the charcoal (WeChat and the iPhone camera read it; some older Android
  scanners do not), or 白底, black on a white tile inside the panel.
- 照片 (空): five photos of 西顶广仁宫 in `web/photos/` (`PHOTOS` in photos.ts, each with the point its crop keeps).
  A card takes one by its address, so each card has its own and keeps it; tap a thumbnail to choose, 随机 for another,
  无 for none. The photo moves and sizes like the other objects. Add a photo: put the JPEG in `web/photos/` and a line
  in `PHOTOS`; the build puts it inside the page.
- 边框 (per layout): on 立轴 and 横卷 a white mat round the card; on 门牌 the white margin and the gap after the square. Where 边框 is
  narrower than four modules, the code steps in by that much, so it always keeps its quiet zone.
- 白边 有 / 无: with 无 the white round the outside goes and the picture runs to its edges — on 门牌 the square and
  the panel reach the image's edges while the gap between them stays (still set by 边框); on 立轴 and 横卷 the mat
  goes. Save the PNG in either state.
- On 门牌, 字号 sizes the label, 位置 slides the name along the panel, 缩放 sizes the code.
- 配色 青 (white on temple teal), 墨 (white on black), 白 (black on white), 青白 (teal on white).
- 点阵 圆 draws the modules as dots, echoing the mark; the three finder squares stay square. Codes with modules under
  7 px are drawn square, and no code goes under 5 px a module. Checked with OpenCV at 1080, 540 and 360 px wide.
- 字号 48–120; 位置 slides the name along its line; 缩放 60–130%. 复位 returns to 88 / 0% / 100%, 立轴, 青, 圆.
- Chinese stands upright in the vertical name; Latin words and figures run sideways.
- 移动与缩放 (under the card): tap the mark, the name, the code or 西頂廣仁宮 to select it; drag to move, drag a
  corner or pinch to resize (30%–300%). Moves snap within 7 screen px to the margins, the centre lines, the field's
  edge, and the other things' edges and centres; a guide shows the line. Hold Alt to move freely. Arrow keys nudge
  (Shift ×10), + and − resize, Esc deselects. 还原此项 puts one thing back; 复位 clears all. Edits are kept per layout
  and saved with the history entry. The code is redrawn at its new size, never stretched, so it stays sharp.
- The code is black on white with a 4-module quiet zone and nothing over it, as the design system specifies.
- In WeChat, downloads are blocked: long-press the card to save it.
- Fonts load after first paint and the card redraws when they arrive; Songti stands in until then.

Brand, marks, photographs and design-system content: © 西顶文化, all rights reserved (`NOTICE`). The page is also the fourth tab of the showcase's 页面 section.

- 更换 (this visit only; nothing is saved or sent, and a reload goes back to the 西顶 originals): 照片 上传 puts your own
  picture in the 空 composition (kept to 2400 px on its long side); 换标志 and 换西頂廣仁宮 take a PNG, JPG or SVG in place
  of the mark or the name, kept whole and centred in the box the original takes; 还原 brings the originals back.
  The code is in `web/src/custom.ts`.
