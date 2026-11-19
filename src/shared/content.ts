import { type L, t } from "./l10n";
import type { PhotoId } from "./photo";

/** A text being redrafted (2026-11-19): every slot that waits for its new words shows this, in the reader's language. */
export const TBD: L = t("TBD", "待填寫", "待填写");

/* The Xiding introduction, written once: 1 place, 2 brands, 3 pillars, X modules.
   The deck and the website both read from this file, so the three languages cannot drift apart.
   Voice follows the 西顶 XIDING design system: say what is here and what happens here, end on the fact,
   no exclamation marks. Traditional copy uses 「」; Simplified copy uses “”. */

/** One ink per line of work: temple teal, black, and white drawn with an ink hairline. */
export type Ink = "mei" | "zhi" | "li";

export const brand = {
  name: t("Xiding", "西頂", "西顶"),
  latin: "XIDING",
  /** 西顶文化: the one short name Xiding goes by to the outside, over its three brands. In English, Xiding. */
  org: t("Xiding", "西頂文化", "西顶文化"),
  arts: t("Xiding Arts", "西頂藝術", "西顶艺术"),
  academy: t("Xiding Academy", "西頂學院", "西顶学院"),
  /** 西顶时光 (Xiding Lifestyle): the third brand, membership and the life around it. */
  lifestyle: t("Xiding Lifestyle", "西頂時光", "西顶时光"),
  /** The three brands in three words. */
  tagline: t("Art · Education · Lifestyle", "藝術 · 教育 · 生活方式", "艺术 · 教育 · 生活方式"),
  address: t(
    "西顶庙, Xiding Road, Shuguang Subdistrict, Haidian District, Beijing",
    "北京市海淀區曙光街道西頂路西頂廟",
    "北京市海淀区曙光街道西顶路西顶庙",
  ),
  web: "xidingmiao.com",
  year: "2026",
} as const;

/** The opening: the name, and the one line that says what it is. */
export const thesis = {
  name: brand.name,
  line: TBD,
} as const;

export interface Figure {
  readonly figure: string;
  readonly label: L;
  readonly line: L;
}

export const overview = {
  label: TBD,
  index: TBD,
  /** 1 who we are, 2 what we do, 3 how we do it, X the Xiding ecosystem. */
  figures: [
    { figure: "1", label: TBD, line: TBD },
    { figure: "2", label: TBD, line: TBD },
    { figure: "3", label: TBD, line: TBD },
    { figure: "X", label: TBD, line: TBD },
  ] satisfies readonly Figure[],
} as const;

/* 1 — Who we are: one place. */
export const who = {
  label: TBD,
  verse: TBD,
  photo: "site-gate" as PhotoId,
} as const;

export interface Value {
  readonly id: "legacy" | "beauty";
  readonly name: L;
  /** The name in the other script, set small beside it. */
  readonly alt: L;
  readonly ink: Ink;
  readonly focus?: boolean;
}

export const values = {
  label: TBD,
  items: [
    {
      id: "legacy",
      name: TBD,
      alt: TBD,
      ink: "zhi",
      focus: true,
    },
    {
      id: "beauty",
      name: TBD,
      alt: TBD,
      ink: "mei",
    },
  ] satisfies readonly Value[],
} as const;

/* 2 — what we do: the three brands, in the words of the public introduction
   (https://claude.ai/artifact/EmhEzgmXoCQuTV1GL5VRHV, built from the member-app repository's about page). */
export interface Brand {
  readonly id: "arts" | "academy" | "lifestyle";
  readonly name: L;
  readonly latin: string;
  /** The field the brand works in, as a small Latin line: ART / CULTURE. */
  readonly field: string;
  readonly ink: Ink;
  /** Three services. */
  readonly services: readonly [L, L, L];
  /** Three lines, one sentence over three. */
  readonly lines: readonly [L, L, L];
}

export const brands = {
  /** 2: what we do. */
  label: TBD,
  /** How the brands are introduced. */
  lead: t("Three brands", "旗下設立三大業務品牌", "旗下设立三大业务品牌"),
  /** What 西顶文化 is, before the three brands. */
  intro: t(
    "Xiding is grounded in culture, driven by education and connected through lifestyle. It brings art, scholarship, business and partners from other fields together in one place for cultural experience, learning, business development and quality of life.",
    "西頂以文化為底蘊，以教育為動力，以生活方式為連接，整合藝術、學術、商業與跨界資源，構建集文化體驗、知識成長、企業賦能與品質生活於一體的多元平台。",
    "西顶以文化为底蕴，以教育为动力，以生活方式为连接，整合艺术、学术、商业与跨界资源，构建集文化体验、知识成长、企业赋能与品质生活于一体的多元平台。",
  ),
  items: [
    {
      id: "arts",
      name: brand.arts,
      latin: "XIDING ARTS",
      field: "ART / CULTURE",
      ink: "mei",
      services: [t("Art and cultural curation", "藝術策展", "艺术策展"), t("Brand collaboration", "品牌共創", "品牌共创"), t("Bespoke experiences", "私享訂製", "私享定制")],
      lines: [
        t("Art that connects cultures.", "以藝術連接文化，", "以艺术连接文化，"),
        t("Creativity that strengthens brands.", "以創意賦能品牌，", "以创意赋能品牌，"),
        t("Experiences that create value.", "以體驗創造價值。", "以体验创造价值。"),
      ],
    },
    {
      id: "academy",
      name: brand.academy,
      latin: "XIDING ACADEMY",
      field: "EDUCATION / LEARNING",
      ink: "zhi",
      services: [t("Learning and executive education", "課程研修", "课程研修"), t("Strategy consulting", "戰略諮詢", "战略咨询"), t("Talent development", "人才發展", "人才发展")],
      lines: [
        t("Education that opens minds.", "以教育啟發認知，", "以教育启发认知，"),
        t("Consulting that drives change.", "以諮詢推動變革，", "以咨询推动变革，"),
        t("Talent that shapes the future.", "以人才驅動未來。", "以人才驱动未来。"),
      ],
    },
    {
      id: "lifestyle",
      name: brand.lifestyle,
      latin: "XIDING LIFESTYLE",
      field: "LIFESTYLE / MEMBERSHIP",
      ink: "li",
      services: [t("Membership", "會員生活", "会员生活"), t("Social gatherings", "品質社交", "品质社交"), t("Curated experiences", "精緻體驗", "精致体验")],
      lines: [
        t("Time that deepens value.", "以時光沉澱價值，", "以时光沉淀价值，"),
        t("Taste that brings people together.", "以品味連接彼此，", "以品味连接彼此，"),
        t("Community that enriches life.", "以社群豐富生活。", "以社群丰富生活。"),
      ],
    },
  ] satisfies readonly Brand[],
} as const;

/* 3 — What we do: three pillars, four modules each. X — the ecosystem and the AI-native solutions they run on. */
export interface Module {
  readonly name: L;
  readonly line: L;
  readonly photo: PhotoId;
}

export interface Pillar {
  readonly id: "space" | "courses" | "membership";
  readonly n: 1 | 2 | 3;
  readonly ink: Ink;
  readonly name: L;
  readonly modules: readonly Module[];
}

export const pillars = {
  /** 3: how we do it. */
  label: TBD,
  modulesLabel: TBD,
  items: [
    {
      id: "space",
      n: 1,
      ink: "mei",
      name: TBD,
      modules: [
        {
          name: TBD,
          line: TBD,
          photo: "space-venue",
        },
        {
          name: TBD,
          line: TBD,
          photo: "space-planning",
        },
        {
          name: TBD,
          line: TBD,
          photo: "space-themed",
        },
        {
          name: TBD,
          line: TBD,
          photo: "space-ops",
        },
      ],
    },
    {
      id: "courses",
      n: 2,
      ink: "zhi",
      name: TBD,
      modules: [
        {
          name: TBD,
          line: TBD,
          photo: "course-training",
        },
        {
          name: TBD,
          line: TBD,
          photo: "course-consult",
        },
        {
          name: TBD,
          line: TBD,
          photo: "course-delivery",
        },
        {
          name: TBD,
          line: TBD,
          photo: "course-library",
        },
      ],
    },
    {
      id: "membership",
      n: 3,
      ink: "li",
      name: TBD,
      modules: [
        {
          name: TBD,
          line: TBD,
          photo: "member-invite",
        },
        {
          name: TBD,
          line: TBD,
          photo: "member-art",
        },
        {
          name: TBD,
          line: TBD,
          photo: "member-tailor",
        },
        {
          name: TBD,
          line: TBD,
          photo: "member-service",
        },
      ],
    },
  ] satisfies readonly Pillar[],
} as const;

/* X — the ecosystem and the AI-native solutions under all three pillars. */
export const ecosystem = {
  label: TBD,
  name: TBD,
  /** Who is in it. Each has an agent, and the agents deal with each other (A2A). */
  members: [TBD, TBD, TBD, TBD, TBD],
} as const;

export const foundation = {
  label: TBD,
  truth: { name: TBD, line: TBD },
  paradigm: { name: TBD, line: TBD },
  platform: { name: TBD, line: TBD },
  /** Under the three: what the foundation is built from. */
  more: [TBD, TBD],
  native: TBD,
  /** The modules of each pillar run on this foundation. */
  runsOn: TBD,
} as const;

export const closing = {
  headline: {
    en: ["西顶庙"],
    hant: ["西頂廟"],
    hans: ["西顶庙"],
  } as Readonly<Record<"en" | "hant" | "hans", readonly string[]>>,
  label: TBD,
  events: TBD,
} as const;

/** X as one picture, 一底三柱: the ecosystem on top, the three pillars and their modules standing, the foundation under them. */
export const system = {
  eco: { name: TBD },
  solutions: { name: TBD },
  base: { name: TBD },
} as const;

/** Words the pages share. */
export const common = {
  language: t("Language", "語言", "语言"),
  sample: t("Sample", "範例", "示例"),
  byInvitation: t("By invitation", "邀請制", "邀请制"),
} as const;
