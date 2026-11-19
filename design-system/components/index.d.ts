// 西顶 XIDING — window.Xiding. Every function returns a string of SVG or HTML: set it as innerHTML, or save it as a file.
/** The three brands, which are also the three inks. */
export type BrandId = 'arts' | 'academy' | 'lifestyle';
export type Colorway = 'teal' | 'ink' | 'night' | 'tealInk';
export type MarkStyle = 'dot' | 'ring' | 'point';
export type Geometry = 'extracted' | 'trued';

/** Xiding.mark(props) → SVG. The mark alone, or in the studio's stacked or wide lockup. */
export interface MarkProps {
  /** teal: white on temple teal. ink: black on white. night: white on black. tealInk: teal on white. Default teal. */
  colorway?: Colorway;
  /** dot (filled, r 26), ring (the "Circle" style, line weight `ring`), point (r 4). Default dot. */
  style?: MarkStyle;
  /** mark, stacked (mark over 西顶 over XIDING) or horizontal (mark beside 西顶 and XIDING). Default mark. */
  lockup?: 'mark' | 'stacked' | 'horizontal';
  /** extracted: the points as measured from the logo. trued: mirrored about x = 600 and rounded. Default extracted. */
  geometry?: Geometry;
  /** Dot scale, 0.3 to 1.4. Default 1. */
  size?: number;
  /** Circle line weight, 1 to 16. Default 6. */
  ring?: number;
  /** Leave out the background field. */
  transparent?: boolean;
  /** Override the mark colour with any CSS colour, e.g. 'currentColor' or 'var(--ink)'. */
  ink?: string;
  /** Override the field colour, or 'none'. */
  ground?: string;
  /** Add width and height attributes in source pixels (for saved files). */
  sized?: boolean;
  /** Accessible name. Default "Xiding mark". */
  title?: string;
}

/** Xiding.subBrand(props) → SVG. The master lockup with a sub-brand named on the brand row. */
export interface SubBrandProps extends MarkProps {
  /** wide: 西顶 spans dot rows B–E, the Latin line sits on row G, the brand row on row H. stacked: brand row under the Latin line. Default wide. */
  layout?: 'stacked' | 'wide';
  /** The Latin line. Default "XIDING"; "XIDING ACADEMY" is fitted to the width of 西顶. */
  latin?: string;
  /** Sub-brand names in Chinese, joined by the pair dot: ['西顶学院'] or ['西顶艺术', '西顶学院', '西顶时光']. */
  brands?: string[];
}

/** Xiding.scatter(props): sizes in px of the drawing. */
export interface ScatterProps {
  width: number; height: number;
  /** Where the mark would stand (top-left) and how tall. */
  x: number; y: number; size: number;
  /** 0 keeps the mark; 1 lets the leading dots travel about one mark-height. Default 0.5. */
  spread?: number;
  /** Share of the mark, from the trailing side, that stays exactly in place. Default 0.5. */
  hold?: number;
  /** Drift direction in degrees, 0 right, 90 down. Default -20. */
  angle?: number;
  /** Extra smaller dots further along the drift. */
  strays?: number;
  seed?: number;
  field?: { x: number; y: number; w: number; h: number };
  fieldFill?: string; ink?: string; fieldInk?: string;
  /** Each dot drifts slowly back and forth; still with reduced motion. */
  breathe?: boolean;
  /** Boxes the drifting dots must not land in: the words of the composition. */
  avoid?: { x: number; y: number; w: number; h: number }[];
  title?: string;
}
/** Xiding.brandRow(parts, props) → HTML. Names joined by the pair dot, in the surrounding text colour. */
export interface BrandRowProps {
  /** CSS font size. Default: inherited. */
  size?: string;
  /** CSS colour. Default: inherited. */
  color?: string;
}

/** One generated asset: a box, a pixel width for PNG, and a list of shapes and type. `fonts` says what is needed to draw it exactly. */
export interface Art {
  name: string; label: string; group: string;
  fonts: 'none' | 'serif' | 'mixed';
  x: number; y: number; w: number; h: number; px: number;
  prims: object[];
}

export interface Person {
  nameZh: string; nameEn: string; titleZh: string; titleEn: string;
  phone: string; email: string; web: string; address: string;
}

/** Xiding.card(props) → SVG. One side of the 90 × 54 mm business card. */
export interface BusinessCardProps {
  /** Default front. */
  side?: 'front' | 'back';
  /** The person on the back; missing fields fall back to Xiding.PEOPLE[0]. An empty string hides a line. */
  person?: Partial<Person>;
  /** Front colourway. Default teal. */
  front?: Colorway;
  /** Back colour. Default paper (white, teal mark). */
  back?: 'paper' | 'ink' | 'teal';
  /** Default landscape. */
  orientation?: 'landscape' | 'portrait';
  /** mark: mark over the brand row. lockup: mark with 西顶, XIDING and the brand row. Default mark. */
  frontLayout?: 'mark' | 'lockup';
  /** Default left. */
  backLayout?: 'left' | 'center';
  /** Sub-brands under the logo, separated by spaces. Default "西顶艺术　西顶学院　西顶时光"; empty hides the row. */
  brands?: string;
  /** Show the trim and 4 mm safe-area guides. */
  guides?: boolean;
  /** Include the 2 mm bleed and millimetre dimensions (for print files). */
  bleed?: boolean;
  style?: MarkStyle; geometry?: Geometry; size?: number; ring?: number;
}

declare global {
  interface Window {
    Xiding: {
      version: string;
      mark(props?: MarkProps): string;
      subBrand(props?: SubBrandProps): string;
      brandRow(parts: string[], props?: BrandRowProps): string;
      /** Lets every mark under scope assemble once, dot by dot (CSS class xd-assemble). Respects reduced motion. */
      assemble(scope: ParentNode, stagger?: number): void;
      /** 散点: the mark's own dots carried off by a wind, as SVG. Dots inside `field` take fieldInk, the rest ink. */
      scatter(props: ScatterProps): string;
      card(props?: BusinessCardProps): string;
      /** The 32 marks: id (A1…H4), x, y, and half (the pair offset, 0 for a single). */
      points(geometry?: Geometry): { id: string; row: number; col: number; x: number; y: number; half: number }[];
      /** The 40 circles. */
      circles(geometry?: Geometry): { id: string; cx: number; cy: number }[];
      /** Dot radius in source units: the Dot style, and the outer radius of the Circle style (tokens: mark-dot). */
      R: number;
      /** The centre of the field the mark is drawn in. */
      CENTER: { x: number; y: number };
      /** The mark's ink box in source units (tokens: mark-width, mark-height). */
      BOUNDS: { left: number; right: number; top: number; bottom: number };
      /** Clear space on every side of the mark, in source units (tokens: mark-clear). */
      PAD: number;
      COLORWAYS: Record<Colorway, { name: string; bg: string; fg: string }>;
      PRESETS: [Colorway, MarkStyle][];
      /** The people on the cards: fictional samples in this repository; a private build swaps in the real ones with setPeople(). */
      PEOPLE: Person[];
      /** Replaces the people on the cards in place, so kit() and card() follow. */
      setPeople(list: Partial<Person>[]): void;
      /** The cultural root: 广仁宫. */
      ROOT: { zh: string; en: string };
      /** The brand architecture: 西顶文化 and its three brands, with their English names. */
      BRANDS: { zh: string; en: string; level: string; settled: boolean }[];
      /** The three brands as the public introduction sets them: id (also the ink: ink-arts, ink-academy, ink-lifestyle), names, the brand's word in the tagline, field, three services, three lines. */
      BRAND_DETAILS: { id: BrandId; zh: string; en: string; latin: string; word: string; field: string; services: string[]; lines: string[] }[];
      /** 西顶文化 in three words: 艺术 · 教育 · 生活方式. */
      TAGLINE: string;
      /** The scene menu by brand, as the IP document lists it; the last row (担当) stands on the ground ink, id root. */
      SCENES: { brand: string; id: BrandId | 'root'; scenes: string[]; use: string }[];
      /** The steps of the introduction, as lines of text. */
      STEPS: string[][];
      /** The website, as printed on the card. */
      SITE: string;
      /** Every asset the system generates, in display order. */
      kit(): Art[];
      /** An Art as an SVG string with live text. */
      toSVG(art: Art): string;
      /** An Art as a PNG, drawn with the page's fonts. Browser only. */
      toPNG(art: Art, widthPx?: number): Promise<Blob>;
      /** Builders for single assets. Each returns an Art. */
      art: {
        mark(props?: MarkProps): Art;
        subBrand(props?: SubBrandProps, slug?: string): Art;
        card(props?: BusinessCardProps, slug?: string): Art;
        wordmark(text: string, kind: 'wordmark' | 'row', ink: 'black' | 'white' | 'teal', slug: string): Art;
        /** The three brands as three pillars on one base. */
        pillars(theme?: 'light' | 'dark'): Art;
        /** One brand's square plate on its ink. */
        pillarPlate(id: BrandId): Art;
        architecture(theme?: 'light' | 'dark'): Art;
        steps(theme?: 'light' | 'dark'): Art;
        avatar(colorway?: Colorway): Art;
      };
      ADDRESS: string;
    };
  }
}
