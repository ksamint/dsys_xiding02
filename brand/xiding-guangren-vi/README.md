# Extracted PDF assets

Source: 品牌形象-5.pdf (2 pages).

- `brand-assets/`: reusable SVG and 600 dpi transparent PNG crops of the symbol, Chinese/English wordmarks, complete lockup and palette. Crops are from physical page 1; coordinates are in `brand-assets.json`.
- `pages/`: complete SVG pages, 300 dpi PNGs, preview JPEGs, native text/layout, raw text spans, vector drawing paths, annotations and Chinese/English OCR (TXT, TSV, hOCR).
- `content.md`: combined page text. Page 1 uses OCR because its lettering is outlined artwork.
- `palette.json`: colors of the visible palette swatches; `colors.json`: all extracted vector colors. RGB/hex values are PDF-renderer conversions, not independently specified Pantone or CMYK standards.
- `fonts/` and `fonts.json`: available embedded font programs and inventory. Font licensing is not established by extraction.
- `original/`: exact original PDF bytes, content-addressed by SHA-256.
- `fileye.json`, `manifest.json`: source identity, page mapping, asset inventory and hashes.

No embedded raster images or attachments were found. Vector logos and outlined lettering are provided as SVG. OCR is uncorrected; original PDF is authoritative. SVG exports may normalize PDF effects; original bytes retain all PDF content. Text within outlined wordmarks is not editable as live type.

## In these repositories

The embedded font programs (`fonts/`) are not kept: their licences are not established. In the private repository
the original PDF sits at `品牌形象-5.pdf`. The public copy (`dsys_xiding02`) leaves out the PDF, until the licences of
its embedded fonts (Times New Roman, Adobe Song Std) are confirmed, and `manifest.json` and `fileye.json`, which
record local file paths. See `docs/adr/0001-private-and-public-repositories.md`.
