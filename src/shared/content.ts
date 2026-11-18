import { type L, t } from "./l10n";
import type { PhotoId } from "./photo";

/* The Xiding introduction, written once: 1 place, 2 brands, 3 pillars, X modules.
   The deck and the website both read from this file, so the three languages cannot drift apart.
   Voice follows the 西顶 XIDING design system: say what is here and what happens here, end on the fact,
   no exclamation marks. Traditional copy uses 「」; Simplified copy uses “”. */

/** One ink per line of work: temple teal, black, and white drawn with an ink hairline. */
export type Ink = "mei" | "zhi" | "li";

export const brand = {
  name: t("Xiding", "西頂", "西顶"),
  latin: "XIDING",
  /** 西顶文化: the one short name Xiding goes by to the outside, over its two brands. In English, Xiding. */
  org: t("Xiding", "西頂文化", "西顶文化"),
  arts: t("Xiding Arts", "西頂藝術", "西顶艺术"),
  academy: t("Xiding Academy", "西頂學院", "西顶学院"),
  /** 西顶时光 (Xiding Lifestyle) is the name of membership. */
  membership: t("Xiding Lifestyle", "西頂時光", "西顶时光"),
  address: t(
    "西顶庙, north side of Xiding Road, Shuguang Subdistrict, Haidian District, Beijing",
    "北京市海淀區曙光街道西頂路北側，西頂廟",
    "北京市海淀区曙光街道西顶路北侧，西顶庙",
  ),
  place: t("西顶庙, Haidian, Beijing", "北京海淀，西頂廟", "北京海淀，西顶庙"),
  web: "xidingmiao.com",
  year: "2026",
} as const;

/** The opening: the name, and the one line that says what it is. */
export const thesis = {
  name: brand.name,
  line: t("A world at ease, of legacy and beauty", "一方傳承大美的自在天地", "一方传承大美的自在天地"),
} as const;

export interface Figure {
  readonly figure: string;
  readonly label: L;
  readonly line: L;
}

export const overview = {
  label: t("Introduction", "介紹", "介绍"),
  index: t("Contents", "目錄", "目录"),
  /** 1 who we are, 2 what we do, 3 how we do it, X the Xiding ecosystem. */
  figures: [
    { figure: "1", label: t("Who we are", "我們是誰", "我们是谁"), line: t("Xiding", "西頂", "西顶") },
    { figure: "2", label: t("What we do", "我們做什麼", "我们做什么"), line: t("Arts, Academy", "藝術、學院", "艺术、学院") },
    { figure: "3", label: t("How we do it", "我們怎麼做", "我们怎么做"), line: t("Space, Courses, Members", "空間、課程、會員", "空间、课程、会员") },
    { figure: "X", label: t("Xiding ecosystem", "西頂生態", "西顶生态"), line: t("Modules, ecosystem, foundation", "模組、生態、底座", "模块、生态、底座") },
  ] satisfies readonly Figure[],
} as const;

/* 1 — Who we are: one place. */
export const who = {
  label: t("Who we are", "我們是誰", "我们是谁"),
  verse: t("A hundred springs and autumns, linking East and West.", "春秋百載，貫通東西。", "春秋百载，贯通东西。"),
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
  label: t("Legacy and beauty", "傳承與大美", "传承与大美"),
  items: [
    {
      id: "legacy",
      name: t("Legacy", "傳承", "传承"),
      alt: t("传承", "Legacy", "Legacy"),
      ink: "zhi",
      focus: true,
    },
    {
      id: "beauty",
      name: t("Beauty", "大美", "大美"),
      alt: t("大美", "Beauty", "Beauty"),
      ink: "mei",
    },
  ] satisfies readonly Value[],
} as const;

/* 2 — what we do: the two brands. */
export interface Brand {
  readonly id: "arts" | "academy";
  readonly name: L;
  readonly latin: string;
}

export const brands = {
  /** 2: what we do. */
  label: t("What we do", "我們做什麼", "我们做什么"),
  items: [
    { id: "arts", name: brand.arts, latin: "XIDING ARTS" },
    { id: "academy", name: brand.academy, latin: "XIDING ACADEMY" },
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
  label: t("How we do it", "我們怎麼做", "我们怎么做"),
  modulesLabel: t("Core modules", "核心模組", "核心模块"),
  items: [
    {
      id: "space",
      n: 1,
      ink: "mei",
      name: t("Space × Events", "空間 × 活動", "空间 × 活动"),
      modules: [
        {
          name: t("Venue service", "場地服務", "场地服务"),
          line: t("Halls and courtyards, booked by scene.", "殿裡、院子，按場景預約。", "殿里、院子，按场景预约。"),
          photo: "space-venue",
        },
        {
          name: t("Event planning and delivery", "活動策劃與執行", "活动策划与执行"),
          line: t("One team, from the run sheet to the day.", "從流程到現場，一個團隊做完。", "从流程到现场，一个团队做完。"),
          photo: "space-planning",
        },
        {
          name: t("Themed events", "主題活動", "主题活动"),
          line: t(
            "Hosted by Xiding: guqin, art viewing, exhibitions.",
            "西頂自辦：古琴、藝術鑑賞、策展。",
            "西顶自办：古琴、艺术鉴赏、策展。",
          ),
          photo: "space-themed",
        },
        {
          name: t("Booking and on-site operations", "預約與現場營運", "预约与现场运营"),
          line: t("Agents match requests, schedule and confirm.", "智能體對接需求、排期和確認。", "智能体对接需求、排期和确认。"),
          photo: "space-ops",
        },
      ],
    },
    {
      id: "courses",
      n: 2,
      ink: "zhi",
      name: t("Courses × Services", "課程 × 服務", "课程 × 服务"),
      modules: [
        {
          name: t("Programmes and training", "課程與培訓", "课程与培训"),
          line: t("Teaching people to use AI well and to direct it.", "教人用好 AI、駕馭 AI。", "教人用好 AI、驾驭 AI。"),
          photo: "course-training",
        },
        {
          name: t("Consulting", "顧問諮詢", "顾问咨询"),
          line: t("From diagnosis to a plan.", "從診斷到方案。", "从诊断到方案。"),
          photo: "course-consult",
        },
        {
          name: t("Hands-on delivery", "落地陪跑", "落地陪跑"),
          line: t("Working beside the team until it runs.", "陪著團隊做，直到跑起來。", "陪着团队做，直到跑起来。"),
          photo: "course-delivery",
        },
        {
          name: t("Solution library and AI apps", "方案庫與 AI 應用", "方案库与 AI 应用"),
          line: t(
            "Finished solutions kept as a library, with AI apps ready to use.",
            "做過的方案留成庫，含拿來就能用的 AI 應用。",
            "做过的方案留成库，含拿来就能用的 AI 应用。",
          ),
          photo: "course-library",
        },
      ],
    },
    {
      id: "membership",
      n: 3,
      ink: "li",
      name: t("Members × Tailor-made", "會員 × 訂製", "会员 × 定制"),
      modules: [
        {
          name: t("Membership by invitation", "會籍與邀請制", "会籍与邀请制"),
          line: t("Entry is by invitation, with review.", "入會靠邀請，加審核。", "入会靠邀请，加审核。"),
          photo: "member-invite",
        },
        {
          name: t("Art sharing", "大美藝術分享", "大美艺术分享"),
          line: t(
            "Artists and industry experts lead members in taste and choice.",
            "請藝術家和行業專家，帶會員練品味與取捨。",
            "请艺术家和行业专家，带会员练品味与取舍。",
          ),
          photo: "member-art",
        },
        {
          name: t("Tailor-made activities", "訂製活動", "定制活动"),
          line: t(
            "Birthdays, afternoon tea and private dinners, made for the person.",
            "生日、下午茶、私宴，按人來辦。",
            "生日、下午茶、私宴，按人来办。",
          ),
          photo: "member-tailor",
        },
        {
          name: t("Member service", "會員專屬服務", "会员专属服务"),
          line: t(
            "Each member has an agent that keeps their calendar and preferences.",
            "每位會員一個智能體，記得你的日曆和偏好。",
            "每位会员一个智能体，记得你的日历和偏好。",
          ),
          photo: "member-service",
        },
      ],
    },
  ] satisfies readonly Pillar[],
} as const;

/* X — the ecosystem and the AI-native solutions under all three pillars. */
export const ecosystem = {
  label: t("Xiding ecosystem", "西頂生態", "西顶生态"),
  name: t("Ecosystem", "生態", "生态"),
  /** Who is in it. Each has an agent, and the agents deal with each other (A2A). */
  members: [t("Members", "會員", "会员"), t("Experts", "專家", "专家"), t("Artists", "藝術家", "艺术家"), t("Spaces", "空間", "空间"), t("Partners", "夥伴", "伙伴")],
} as const;

export const foundation = {
  label: t("AI-native solutions", "AI原生方案", "AI原生方案"),
  truth: { name: t("Truth", "真知", "真知"), line: t("Single source of truth　Revenue split", "唯一事實源　分賬系統", "唯一事实源　分账系统") },
  paradigm: { name: t("Paradigm", "範式", "范式"), line: t("How expert knowledge and legacy work together", "專家認知與傳承的協作範式", "专家认知与传承的协作范式") },
  platform: { name: t("Revenue sharing", "分賬協同", "分账协同"), line: t("Agents match, deliver and split revenue", "智能體之間對接、交付、分賬", "智能体之间对接、交付、分账") },
  /** Under the three: what the foundation is built from. */
  more: [t("Open-source knowledge base", "開源知識庫", "开源知识库"), t("A2A agent ecosystem", "A2A智能體生態", "A2A智能体生态")],
  native: t("AI-native　Xiding leads", "AI原生　西頂先行", "AI原生　西顶先行"),
  /** The modules of each pillar run on this foundation. */
  runsOn: t("Runs on Truth and Paradigm", "運行於真知與範式", "运行于真知与范式"),
} as const;

export const closing = {
  headline: {
    en: ["西顶庙"],
    hant: ["西頂廟"],
    hans: ["西顶庙"],
  } as Readonly<Record<"en" | "hant" | "hans", readonly string[]>>,
  label: t("Find us", "地址", "地址"),
  events: t("Latest events", "最新活動", "最新活动"),
} as const;

/** X as one picture, 一底三柱: the ecosystem on top, the three pillars and their modules standing, the foundation under them. */
export const system = {
  eco: { name: t("Ecosystem", "生態", "生态") },
  solutions: { name: t("Solutions", "方案", "方案") },
  base: { name: t("Foundation", "底座", "底座") },
} as const;

/** Words the pages share. */
export const common = {
  language: t("Language", "語言", "语言"),
  sample: t("Sample", "範例", "示例"),
  byInvitation: t("By invitation", "邀請制", "邀请制"),
} as const;
