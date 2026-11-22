import { t } from "./l10n";
import type { Activity, ActivityCategory, ActivityFormat, Appearance, Ask, Benefit, EventKind, InterestId, Person, Programme, RegistrationMode, Space, Tag, Tier, Zone } from "./ontology";
import { LEDGER } from "./spaces-ledger";
import type { L } from "./l10n";
import type { PhotoId } from "./photo";

/* Sample records for every category in the ontology. Every one is a SAMPLE, marked as such wherever it is shown,
   until the service that holds the one source of truth serves the real ones. The calendar (events.ts) is drawn from
   ACTIVITIES, so the member page, the site and the programme pages always agree. People are placeholders, not real
   people: replace each with the person's own words and consent. */

/** Names and uses in English and Traditional Chinese for the ledger's spaces, by ledger code. The Simplified name and
 *  use come from the ledger itself; a test fails when the ledger renames a space and this list falls behind. */
const SPACE_WORDS: Readonly<Record<string, { name: L; use: L; photo: PhotoId; glyph: string }>> = {
  C1: { name: t("South Square", "南廣場", "南广场"), use: t("Openings, outdoor dinners, markets, group photographs", "開幕、戶外晚宴、市集、合影", "开幕、户外晚宴、市集、合影"), photo: "site-courtyard", glyph: "廣" },
  N1: { name: t("Main Hall Foyer", "大殿前廳", "大殿前厅"), use: t("Arrivals, tea breaks, small displays, breakout", "簽到、茶歇、小型展陳、分會場", "签到、茶歇、小型展陈、分会场"), photo: "space-ops", glyph: "廳" },
  N2: { name: t("Foyer West Room", "前廳西屋", "前厅西屋"), use: t("Speakers' room, board meetings, small groups", "講者備場、董事會、小組討論", "讲者备场、董事会、小组讨论"), photo: "course-consult", glyph: "議" },
  N3: { name: t("Foyer East Room", "前廳東屋", "前厅东屋"), use: t("Meetings and small groups, at a ten-seat table", "會議、小組討論（圖中已有 10 人會議桌）", "会议、小组讨论（图中已有 10 人会议桌）"), photo: "course-consult", glyph: "會" },
  N4: { name: t("Main Hall", "大殿中區", "大殿中区"), use: t("Lectures, launches, opening ceremonies, annual gatherings", "主講座、發布、開班典禮、年會", "主讲座、发布、开班典礼、年会"), photo: "space-venue", glyph: "殿" },
  N8: { name: t("Main Hall Passage", "大殿過道", "大殿过道"), use: t("Displays, and the way through", "展陳、動線", "展陈、动线"), photo: "cover-exhibition", glyph: "廊" },
  N9: { name: t("Elephant Hall", "大象殿", "大象殿"), use: t("Dinners, performances, salons", "晚宴、演出、沙龍", "晚宴、演出、沙龙"), photo: "member-tailor", glyph: "象" },
  W1: { name: t("West Side Hall", "西配殿", "西配殿"), use: t("Courses, workshops, gatherings in an old hall", "課程、工作坊、雅集（古建多功能）", "课程、工作坊、雅集（古建多功能）"), photo: "course-training", glyph: "西" },
  W2: { name: t("Old Tree Court", "大樹中庭", "大树中庭"), use: t("Outdoor tea, gatherings, small receptions, under a great tree", "戶外茶歇、雅集、小型酒會（露天，有大樹）", "户外茶歇、雅集、小型酒会（露天，有大树）"), photo: "cover-guqin-night", glyph: "樹" },
  W3: { name: t("L Gallery", "L 展廊", "L 展廊"), use: t("Art shows and opening receptions", "藝術展陳、開幕酒會", "艺术展陈、开幕酒会"), photo: "cover-exhibition", glyph: "展" },
  W7: { name: t("Art Room", "藝空間", "艺空间"), use: t("Courses, workshops, displays", "課程、工作坊、展陳（多功能）", "课程、工作坊、展陈（多功能）"), photo: "cover-calligraphy", glyph: "藝" },
  W8: { name: t("Hall of Fortune", "財神殿", "财神殿"), use: t("Private gatherings, small salons", "私享會、小型雅集", "私享会、小型雅集"), photo: "cover-salon", glyph: "財" },
  W10: { name: t("West Tea Room", "西茶室", "西茶室"), use: t("Tea, one-to-one sessions, small meetings", "茶會、1 對 1 陪跑、小會", "茶会、1 对 1 陪跑、小会"), photo: "cover-tea", glyph: "茶" },
  S9: { name: t("Southeast Tea Room", "東南茶室", "东南茶室"), use: t("Tea and small meetings, at a six-seat table", "茶會、小會（圖中有 6 人桌）", "茶会、小会（图中有 6 人桌）"), photo: "cover-tea", glyph: "茗" },
  E1: { name: t("East Side Hall", "東配殿", "东配殿"), use: t("Courses, workshops, breakout", "課程、工作坊、分會場", "课程、工作坊、分会场"), photo: "course-training", glyph: "東" },
  E2: { name: t("Hall of the Medicine King", "藥王殿", "药王殿"), use: t("Small gatherings, displays", "小型雅集、展陳", "小型雅集、展陈"), photo: "member-art", glyph: "藥" },
  E7: { name: t("East Tea Room", "東茶室", "东茶室"), use: t("Tea, small meetings", "茶會、小會", "茶会、小会"), photo: "cover-tea", glyph: "品" },
  E8: { name: t("East Tea Hall", "東茶廳", "东茶厅"), use: t("Tea, small classes", "茶會、小班課", "茶会、小班课"), photo: "cover-tea", glyph: "飲" },
};

/** The bookable spaces: the ledger's figures, with the words above. */
export const SPACES: readonly Space[] = LEDGER.filter((r) => r.code in SPACE_WORDS).map((r) => {
  const w = SPACE_WORDS[r.code] as { name: L; use: L; photo: PhotoId; glyph: string };
  return { id: r.code, name: w.name, kind: r.kind, zone: r.zone as Zone, area: r.area, floor: r.floor, setup: r.layout, capacity: r.capacity, use: w.use, photo: w.photo, glyph: w.glyph };
});

/** Ledger names and uses, for the test that keeps the words above in step with the ledger. */
export const LEDGER_NAMES: Readonly<Record<string, { name: string; use: string }>> = Object.fromEntries(LEDGER.map((r) => [r.code, { name: r.name, use: r.use }]));

/** The kinds of activity, in one list: managed here, read everywhere. */
export const CATEGORIES: readonly ActivityCategory[] = [
  { id: "tea", name: t("Tea", "茶敘", "茶叙"), glyph: "茶", order: 1 },
  { id: "concert", name: t("Music", "雅樂", "雅乐"), glyph: "琴", order: 2 },
  { id: "exhibition", name: t("Exhibitions", "展覽", "展览"), glyph: "觀", order: 3 },
  { id: "salon", name: t("Salons", "沙龍", "沙龙"), glyph: "談", order: 4 },
  { id: "lecture", name: t("Classes", "課堂", "课堂"), glyph: "學", order: 5 },
  { id: "consulting", name: t("Consulting", "諮詢", "咨询"), glyph: "問", order: 6 },
  { id: "dinner", name: t("Dinners", "宴", "宴"), glyph: "宴", order: 7 },
  { id: "open-day", name: t("Open days", "開放日", "开放日"), glyph: "院", order: 8 },
];

/** The tags: what activities, courses and people are about. Members choose their interests from this list. */
export const TAGS: readonly Tag[] = [
  { id: "art", name: t("Art sharing", "藝術分享", "艺术分享") },
  { id: "guqin", name: t("Guqin", "古琴", "古琴") },
  { id: "exhibit", name: t("Exhibitions and viewing", "策展與鑑賞", "策展与鉴赏") },
  { id: "ai", name: t("AI courses", "AI 課程", "AI 课程") },
  { id: "consult", name: t("Consulting", "顧問諮詢", "顾问咨询") },
  { id: "table", name: t("Tea and private dinners", "下午茶與私宴", "下午茶与私宴") },
  { id: "space", name: t("Booking the space", "預約空間", "预约空间") },
];

export const categoryOf = (id: ActivityFormat): ActivityCategory => CATEGORIES.find((c) => c.id === id) ?? { id, name: t(id, id, id), glyph: "西", order: 99 };

export const PEOPLE: readonly Person[] = [
  {
    id: "p-host",
    name: t("Xiding host", "西頂主理人", "西顶主理人"),
    roles: ["host"],
    headline: t("Keeps the halls and the calendar", "照看殿院與日曆", "照看殿院与日历"),
    bio: t("Hosts the members' evenings and welcomes every guest at the gate.", "主持會員之夜，在山門迎每一位客人。", "主持会员之夜，在山门迎每一位客人。"),
    fields: ["table", "space"],
    consent: "public",
    sample: true,
  },
  {
    id: "p-guqin",
    name: t("Ms Lin", "林老師", "林老师"),
    roles: ["artist"],
    headline: t("Guqin player", "古琴演奏者", "古琴演奏者"),
    bio: t("Plays the old pieces slowly, and tells the hall where each one comes from.", "慢慢彈老曲子，也講每一首從哪裡來。", "慢慢弹老曲子，也讲每一首从哪里来。"),
    fields: ["guqin"],
    consent: "public",
    sample: true,
  },
  {
    id: "p-curator",
    name: t("Mr Zhou", "周老師", "周老师"),
    roles: ["expert", "host"],
    headline: t("Curator", "策展人", "策展人"),
    bio: t("Hangs the shows in the side hall and walks visitors through them.", "在配殿策展，也帶客人一件一件看。", "在配殿策展，也带客人一件一件看。"),
    fields: ["exhibit", "art"],
    consent: "public",
    sample: true,
  },
  {
    id: "p-artist",
    name: t("Ms Xu", "許老師", "许老师"),
    roles: ["artist", "speaker"],
    headline: t("Painter", "畫家", "画家"),
    bio: t("Brings one work each month and talks about how it was made.", "每月帶來一件作品，講它是怎麼做出來的。", "每月带来一件作品，讲它是怎么做出来的。"),
    fields: ["art"],
    consent: "public",
    sample: true,
  },
  {
    id: "p-ai",
    name: t("Mr Chen", "陳老師", "陈老师"),
    roles: ["lecturer", "speaker"],
    headline: t("AI course lecturer", "AI 課程講師", "AI 课程讲师"),
    bio: t("Teaches founders to hand a team's routine work to AI, one workflow at a time.", "教創始人把團隊的日常活交給 AI，一次一個工作流。", "教创始人把团队的日常活交给 AI，一次一个工作流。"),
    fields: ["ai"],
    consent: "public",
    sample: true,
  },
  {
    id: "p-consult",
    name: t("Ms Wang", "王老師", "王老师"),
    roles: ["expert", "lecturer"],
    headline: t("Consultant", "顧問", "顾问"),
    bio: t("Stays with a project from the plan to the day it runs.", "從方案到落地，陪一個項目做完。", "从方案到落地，陪一个项目做完。"),
    fields: ["consult", "ai"],
    consent: "public",
    sample: true,
  },
  {
    id: "p-member",
    name: t("Ms Li", "李女士", "李女士"),
    roles: ["participant"],
    headline: t("Member since 2026", "2026 年入會", "2026 年入会"),
    bio: t("Came for the guqin, stayed for the courses.", "為古琴而來，因課程留下。", "为古琴而来，因课程留下。"),
    fields: ["guqin", "ai"],
    consent: "members",
    sample: true,
  },
];

export const PROGRAMMES: readonly Programme[] = [
  {
    id: "g-ai",
    pillar: "academy",
    format: "course",
    title: t("Using AI well", "用好 AI", "用好 AI"),
    summary: t("Four sessions to fit a team's work into one person's workflow.", "四次課，把一個團隊的活裝進一個人的工作流。", "四次课，把一个团队的活装进一个人的工作流。"),
    outcomes: [
      t("One workflow of your own, running", "一個屬於你、已經在跑的工作流", "一个属于你、已经在跑的工作流"),
      t("A library of prompts you can reuse", "一套能反覆用的提示詞", "一套能反复用的提示词"),
      t("A plan for your team's next three", "團隊接下來三件事的方案", "团队接下来三件事的方案"),
    ],
    audience: t("Founders and team leads", "創始人與團隊負責人", "创始人与团队负责人"),
    sessions: 4,
    length: t("Three hours each", "每次三小時", "每次三小时"),
    faculty: [
      { person: "p-ai", role: "lecturer" },
      { person: "p-consult", role: "expert" },
    ],
    admission: {
      mode: "application",
      cohort: 20,
      intake: t("Spring 2027", "2027 春季", "2027 春季"),
      deadline: "2027-01-31",
      steps: ["apply", "interview", "offer", "enrol"],
      requirements: [t("A short note about you", "一段簡短的自我介紹", "一段简短的自我介绍"), t("One thing you want AI to do", "一件你想用 AI 做成的事", "一件你想用 AI 做成的事")],
      fee: t("On request", "學費另詢", "学费另询"),
    },
    photo: "course-training",
    tags: ["ai"],
    sample: true,
  },
  {
    id: "g-consult",
    pillar: "academy",
    format: "consulting",
    title: t("Hands-on consulting", "顧問陪跑", "顾问陪跑"),
    summary: t("From the plan to the day it runs, one consultant with you.", "從方案到落地，一位顧問陪你做完。", "从方案到落地，一位顾问陪你做完。"),
    outcomes: [
      t("A plan you can act on", "一份能照著做的方案", "一份能照着做的方案"),
      t("The first result, delivered", "第一個成果，交付到手", "第一个成果，交付到手"),
    ],
    audience: t("Teams with one project to land", "有一個項目要落地的團隊", "有一个项目要落地的团队"),
    sessions: 6,
    length: t("Three months", "三個月", "三个月"),
    faculty: [{ person: "p-consult", role: "expert" }],
    admission: {
      mode: "application",
      cohort: 6,
      intake: t("All year", "全年", "全年"),
      deadline: "2027-03-31",
      steps: ["apply", "interview", "offer", "enrol"],
      requirements: [t("The project, in one page", "一頁紙寫清項目", "一页纸写清项目")],
      fee: t("On request", "費用另詢", "费用另询"),
    },
    photo: "course-delivery",
    tags: ["consult"],
    sample: true,
  },
  {
    id: "g-art",
    pillar: "member",
    format: "series",
    title: t("Art sharing", "藝術分享", "艺术分享"),
    summary: t("One artist and one work, each month.", "每月一位藝術家，一件作品。", "每月一位艺术家，一件作品。"),
    outcomes: [
      t("Twelve works, seen up close", "十二件作品，近看", "十二件作品，近看"),
      t("An evening with each artist", "與每位藝術家的一個晚上", "与每位艺术家的一个晚上"),
    ],
    audience: t("Members and their guests", "會員與其客人", "会员与其客人"),
    sessions: 12,
    length: t("One evening a month", "每月一晚", "每月一晚"),
    faculty: [
      { person: "p-artist", role: "artist" },
      { person: "p-curator", role: "host" },
    ],
    admission: {
      mode: "invitation",
      cohort: 40,
      intake: t("2027", "2027 年", "2027 年"),
      deadline: "2027-12-31",
      steps: ["apply", "offer"],
      requirements: [t("Membership", "會籍", "会籍")],
      fee: t("Included in membership", "含於會籍", "含于会籍"),
    },
    photo: "member-art",
    tags: ["art", "exhibit"],
    sample: true,
  },
];

const FREE = t("Free", "免費", "免费");
const MEMBERS_ONLY = t("Members only", "僅限會員", "仅限会员");
const INCLUDED = t("Included", "含於會籍", "含于会籍");
const CANCEL = t("Cancel up to a day before", "最遲提前一天取消", "最迟提前一天取消");

const LISTED: readonly Activity[] = [
  {
    id: "e01",
    pillar: "member",
    format: "tea",
    title: t("Afternoon tea", "下午茶", "下午茶"),
    summary: t("Tea in the side hall, for members and one guest each.", "配殿裡的下午茶，每位會員可帶一位客人。", "配殿里的下午茶，每位会员可带一位客人。"),
    date: "2026-11-14",
    time: "15:00",
    minutes: 120,
    space: "W2",
    people: [{ person: "p-host", role: "host" }],
    registration: { mode: "members", capacity: 16, taken: 9, member: INCLUDED, guest: MEMBERS_ONLY, closes: "2026-11-13", asks: ["name", "phone", "guests"], cancel: CANCEL },
    tags: ["table"],
    photo: "cover-tea",
    sample: true,
  },
  {
    id: "e02",
    pillar: "member",
    format: "salon",
    title: t("Art sharing: one artist, one work", "藝術分享：一位藝術家，一件作品", "艺术分享：一位艺术家，一件作品"),
    summary: t("The artist brings one work and talks about how it was made.", "藝術家帶來一件作品，講它是怎麼做出來的。", "艺术家带来一件作品，讲它是怎么做出来的。"),
    date: "2026-11-19",
    time: "19:30",
    minutes: 90,
    space: "N9",
    people: [
      { person: "p-artist", role: "speaker" },
      { person: "p-curator", role: "host" },
    ],
    programme: "g-art",
    registration: { mode: "members", capacity: 40, taken: 22, member: INCLUDED, guest: MEMBERS_ONLY, closes: "2026-11-18", asks: ["name", "phone", "guests"], cancel: CANCEL },
    tags: ["art"],
    photo: "member-art",
    sample: true,
  },
  {
    id: "e03",
    pillar: "space",
    format: "concert",
    title: t("Guqin in the hall", "殿裡聽古琴", "殿里听古琴"),
    summary: t("An afternoon of old pieces in the main hall.", "大殿裡，一個下午的老曲子。", "大殿里，一个下午的老曲子。"),
    date: "2026-11-22",
    time: "15:00",
    minutes: 90,
    space: "N4",
    people: [
      { person: "p-guqin", role: "artist" },
      { person: "p-member", role: "participant" },
    ],
    registration: { mode: "open", capacity: 60, taken: 60, member: FREE, guest: t("¥280", "¥280", "¥280"), closes: "2026-11-21", asks: ["name", "phone", "guests"], cancel: CANCEL },
    tags: ["guqin"],
    photo: "space-themed",
    sample: true,
  },
  {
    id: "e04",
    pillar: "academy",
    format: "lecture",
    title: t("Using AI well: the first session", "用好 AI 的第一課", "用好 AI 的第一课"),
    summary: t("The open first session of the course: what to hand to AI, and what to keep.", "課程的公開第一課：什麼交給 AI，什麼留給自己。", "课程的公开第一课：什么交给 AI，什么留给自己。"),
    date: "2026-11-28",
    time: "14:00",
    minutes: 180,
    space: "N4",
    people: [{ person: "p-ai", role: "lecturer" }],
    programme: "g-ai",
    registration: { mode: "open", capacity: 40, taken: 31, member: FREE, guest: t("¥300", "¥300", "¥300"), closes: "2026-11-27", asks: ["name", "phone", "note"], cancel: CANCEL },
    tags: ["ai"],
    photo: "course-training",
    sample: true,
  },
  {
    id: "e05",
    pillar: "space",
    format: "exhibition",
    title: t("Exhibition walk-through", "策展導覽", "策展导览"),
    summary: t("The curator walks the side hall, one work at a time.", "策展人帶著看配殿，一件一件。", "策展人带着看配殿，一件一件。"),
    date: "2026-12-05",
    time: "10:00",
    minutes: 60,
    space: "W3",
    people: [{ person: "p-curator", role: "speaker" }],
    registration: { mode: "open", capacity: 20, taken: 12, member: FREE, guest: t("¥120", "¥120", "¥120"), closes: "2026-12-04", asks: ["name", "phone", "guests"], cancel: CANCEL },
    tags: ["exhibit"],
    photo: "cover-exhibition",
    sample: true,
  },
  {
    id: "e06",
    pillar: "academy",
    format: "lecture",
    title: t("Fitting a team's work into one person's workflow", "把一個團隊的活裝進一個人的工作流", "把一个团队的活装进一个人的工作流"),
    summary: t("The second session: build one workflow, end to end.", "第二課：從頭到尾搭一個工作流。", "第二课：从头到尾搭一个工作流。"),
    date: "2026-12-12",
    time: "14:00",
    minutes: 180,
    space: "N4",
    people: [
      { person: "p-ai", role: "lecturer" },
      { person: "p-member", role: "participant" },
    ],
    programme: "g-ai",
    registration: { mode: "open", capacity: 40, taken: 8, member: FREE, guest: t("¥300", "¥300", "¥300"), closes: "2026-12-11", asks: ["name", "phone", "note"], cancel: CANCEL },
    tags: ["ai"],
    photo: "course-training",
    sample: true,
  },
  {
    id: "e07",
    pillar: "member",
    format: "dinner",
    title: t("Private dinner", "私宴", "私宴"),
    summary: t("Twelve seats at one table in the courtyard.", "院子裡一張桌，十二個座位。", "院子里一张桌，十二个座位。"),
    date: "2026-12-19",
    time: "18:30",
    minutes: 150,
    space: "N9",
    people: [{ person: "p-host", role: "host" }],
    registration: { mode: "invitation", capacity: 12, taken: 6, member: INCLUDED, guest: MEMBERS_ONLY, closes: "2026-12-15", asks: ["name", "phone"], cancel: CANCEL },
    tags: ["table"],
    photo: "member-tailor",
    sample: true,
  },
  {
    id: "e08",
    pillar: "space",
    format: "open-day",
    title: t("Open afternoon: see the halls and courtyards", "空間開放日：看殿裡和院子", "空间开放日：看殿里和院子"),
    summary: t("Walk the halls and courtyards, and ask about holding your own event.", "走一遍殿與院，也問問怎麼辦你的活動。", "走一遍殿与院，也问问怎么办你的活动。"),
    date: "2026-12-27",
    time: "14:00",
    minutes: 180,
    space: "C1",
    people: [{ person: "p-host", role: "host" }],
    registration: { mode: "open", capacity: 120, taken: 40, member: FREE, guest: FREE, closes: "2026-12-26", asks: ["name", "phone", "guests"], cancel: CANCEL },
    tags: ["space"],
    photo: "space-ops",
    sample: true,
  },
  {
    id: "e09",
    pillar: "member",
    format: "exhibition",
    title: t("Art viewing", "藝術鑑賞", "艺术鉴赏"),
    summary: t("A private hour with the month's work.", "與本月作品的一個小時。", "与本月作品的一个小时。"),
    date: "2027-01-09",
    time: "15:00",
    minutes: 60,
    space: "W3",
    people: [
      { person: "p-artist", role: "artist" },
      { person: "p-curator", role: "host" },
    ],
    programme: "g-art",
    registration: { mode: "members", capacity: 20, taken: 5, member: INCLUDED, guest: MEMBERS_ONLY, closes: "2027-01-08", asks: ["name", "phone", "guests"], cancel: CANCEL },
    tags: ["art", "exhibit"],
    photo: "member-art",
    sample: true,
  },
  {
    id: "e10",
    pillar: "academy",
    format: "consulting",
    title: t("Consulting hours", "顧問諮詢開放時段", "顾问咨询开放时段"),
    summary: t("Bring one question; leave with a next step.", "帶一個問題來，帶一個下一步走。", "带一个问题来，带一个下一步走。"),
    date: "2027-01-16",
    time: "14:00",
    minutes: 120,
    space: "W10",
    people: [{ person: "p-consult", role: "expert" }],
    programme: "g-consult",
    registration: { mode: "open", capacity: 8, taken: 3, member: FREE, guest: t("¥500", "¥500", "¥500"), closes: "2027-01-15", asks: ["name", "phone", "note"], cancel: CANCEL },
    tags: ["consult"],
    photo: "course-consult",
    sample: true,
  },
];


/** A session that recurs or needs little said: the same rule, written once. */
function session(o: {
  id: string;
  pillar: EventKind;
  format: ActivityFormat;
  title: L;
  summary: L;
  date: string;
  time: string;
  minutes: number;
  space: string;
  people: readonly Appearance[];
  programme?: string;
  mode: RegistrationMode;
  capacity: number;
  taken: number;
  member: L;
  guest: L;
  tags: readonly InterestId[];
  photo: PhotoId;
}): Activity {
  const asks: readonly Ask[] = o.mode === "invitation" ? ["name", "phone"] : ["name", "phone", "guests"];
  return {
    id: o.id,
    pillar: o.pillar,
    format: o.format,
    title: o.title,
    summary: o.summary,
    date: o.date,
    time: o.time,
    minutes: o.minutes,
    space: o.space,
    people: o.people,
    ...(o.programme ? { programme: o.programme } : {}),
    registration: { mode: o.mode, capacity: o.capacity, taken: o.taken, member: o.member, guest: o.guest, closes: o.date, asks, cancel: CANCEL },
    tags: o.tags,
    photo: o.photo,
    sample: true,
  };
}

const MORNING_TEA = { title: t("Morning tea", "晨間茶敘", "晨间茶叙"), summary: t("An hour of tea before the day starts.", "一天開始前，一個小時的茶。", "一天开始前，一个小时的茶。") };
const VIEWING = { title: t("Viewing in the side hall", "配殿看展", "配殿看展"), summary: t("The month's show, at an easy pace.", "本月的展，慢慢看。", "本月的展，慢慢看。") };
const ONE_TO_ONE = { title: t("One-to-one consulting", "顧問一對一", "顾问一对一"), summary: t("An hour with a consultant on your one question.", "一個小時，一位顧問，談你的一個問題。", "一个小时，一位顾问，谈你的一个问题。") };
const GUQIN_CIRCLE = { title: t("Guqin gathering", "古琴雅集", "古琴雅集"), summary: t("Players and listeners, one afternoon.", "彈的人與聽的人，一個下午。", "弹的人与听的人，一个下午。") };

const MORE: readonly Activity[] = [
  session({ id: "e11", pillar: "member", format: "tea", ...MORNING_TEA, date: "2026-11-12", time: "10:00", minutes: 90, space: "E8", people: [{ person: "p-host", role: "host" }], mode: "members", capacity: 12, taken: 7, member: INCLUDED, guest: MEMBERS_ONLY, tags: ["table"], photo: "cover-tea" }),
  session({ id: "e12", pillar: "space", format: "exhibition", ...VIEWING, date: "2026-11-14", time: "10:00", minutes: 60, space: "W3", people: [{ person: "p-curator", role: "host" }], mode: "open", capacity: 20, taken: 10, member: FREE, guest: t("¥80", "¥80", "¥80"), tags: ["exhibit"], photo: "cover-exhibition" }),
  session({
    id: "e13",
    pillar: "space",
    format: "concert",
    title: t("Guqin by night", "院中夜琴", "院中夜琴"),
    summary: t("The courtyard after dark, one player, old pieces.", "入夜的院子，一位琴人，幾首老曲。", "入夜的院子，一位琴人，几首老曲。"),
    date: "2026-11-14",
    time: "19:00",
    minutes: 90,
    space: "W2",
    people: [{ person: "p-guqin", role: "artist" }],
    mode: "open",
    capacity: 20,
    taken: 14,
    member: FREE,
    guest: t("¥280", "¥280", "¥280"),
    tags: ["guqin"],
    photo: "cover-guqin-night",
  }),
  session({
    id: "e14",
    pillar: "academy",
    format: "lecture",
    title: t("AI tools, open hour", "AI 工具開放課", "AI 工具开放课"),
    summary: t("Bring a laptop; leave with one tool set up.", "帶上電腦，走時裝好一個工具。", "带上电脑，走时装好一个工具。"),
    date: "2026-11-15",
    time: "14:00",
    minutes: 120,
    space: "E1",
    people: [{ person: "p-ai", role: "lecturer" }],
    mode: "open",
    capacity: 30,
    taken: 18,
    member: FREE,
    guest: t("¥200", "¥200", "¥200"),
    tags: ["ai"],
    photo: "course-training",
  }),
  session({
    id: "e15",
    pillar: "space",
    format: "open-day",
    title: t("Walk the halls", "空間導覽", "空间导览"),
    summary: t("Thirty minutes through the halls and courtyards.", "三十分鐘，走一遍殿與院。", "三十分钟，走一遍殿与院。"),
    date: "2026-11-15",
    time: "14:30",
    minutes: 60,
    space: "C1",
    people: [{ person: "p-host", role: "host" }],
    mode: "open",
    capacity: 20,
    taken: 6,
    member: FREE,
    guest: FREE,
    tags: ["space"],
    photo: "space-ops",
  }),
  session({ id: "e16", pillar: "academy", format: "consulting", ...ONE_TO_ONE, date: "2026-11-17", time: "15:00", minutes: 60, space: "W10", people: [{ person: "p-consult", role: "expert" }], programme: "g-consult", mode: "open", capacity: 1, taken: 0, member: FREE, guest: t("¥500", "¥500", "¥500"), tags: ["consult"], photo: "course-consult" }),
  session({ id: "e17", pillar: "member", format: "tea", ...MORNING_TEA, date: "2026-11-19", time: "10:00", minutes: 90, space: "E8", people: [{ person: "p-host", role: "host" }], mode: "members", capacity: 12, taken: 4, member: INCLUDED, guest: MEMBERS_ONLY, tags: ["table"], photo: "cover-tea" }),
  session({
    id: "e18",
    pillar: "space",
    format: "salon",
    title: t("One character, written", "寫一個字", "写一个字"),
    summary: t("Brush, ink and one character, slowly.", "筆、墨，慢慢寫一個字。", "笔、墨，慢慢写一个字。"),
    date: "2026-11-21",
    time: "10:00",
    minutes: 120,
    space: "W7",
    people: [{ person: "p-artist", role: "artist" }],
    mode: "open",
    capacity: 16,
    taken: 11,
    member: FREE,
    guest: t("¥260", "¥260", "¥260"),
    tags: ["art"],
    photo: "cover-calligraphy",
  }),
  session({
    id: "e19",
    pillar: "member",
    format: "dinner",
    title: t("Sunday supper", "週日家宴", "周日家宴"),
    summary: t("One long table, food of the season.", "一張長桌，當季的菜。", "一张长桌，当季的菜。"),
    date: "2026-11-22",
    time: "18:30",
    minutes: 150,
    space: "W2",
    people: [{ person: "p-host", role: "host" }],
    mode: "invitation",
    capacity: 12,
    taken: 8,
    member: INCLUDED,
    guest: MEMBERS_ONLY,
    tags: ["table"],
    photo: "member-tailor",
  }),
  session({
    id: "e20",
    pillar: "academy",
    format: "lecture",
    title: t("AI reading circle", "AI 讀書會", "AI 读书会"),
    summary: t("One chapter, one evening, one question each.", "一章，一晚，每人一個問題。", "一章，一晚，每人一个问题。"),
    date: "2026-11-24",
    time: "19:00",
    minutes: 90,
    space: "W7",
    people: [{ person: "p-ai", role: "host" }],
    mode: "open",
    capacity: 20,
    taken: 9,
    member: FREE,
    guest: t("¥100", "¥100", "¥100"),
    tags: ["ai"],
    photo: "cover-salon",
  }),
  session({ id: "e21", pillar: "member", format: "tea", ...MORNING_TEA, date: "2026-11-26", time: "10:00", minutes: 90, space: "E8", people: [{ person: "p-host", role: "host" }], mode: "members", capacity: 12, taken: 3, member: INCLUDED, guest: MEMBERS_ONLY, tags: ["table"], photo: "cover-tea" }),
  session({ id: "e22", pillar: "space", format: "exhibition", ...VIEWING, date: "2026-11-28", time: "10:00", minutes: 60, space: "W3", people: [{ person: "p-curator", role: "host" }], mode: "open", capacity: 20, taken: 5, member: FREE, guest: t("¥80", "¥80", "¥80"), tags: ["exhibit"], photo: "cover-exhibition" }),
  session({ id: "e23", pillar: "space", format: "concert", ...GUQIN_CIRCLE, date: "2026-11-29", time: "15:00", minutes: 120, space: "N9", people: [{ person: "p-guqin", role: "artist" }], mode: "open", capacity: 40, taken: 14, member: FREE, guest: t("¥180", "¥180", "¥180"), tags: ["guqin"], photo: "space-themed" }),
  session({ id: "e24", pillar: "academy", format: "consulting", ...ONE_TO_ONE, date: "2026-12-01", time: "15:00", minutes: 60, space: "W10", people: [{ person: "p-consult", role: "expert" }], programme: "g-consult", mode: "open", capacity: 1, taken: 0, member: FREE, guest: t("¥500", "¥500", "¥500"), tags: ["consult"], photo: "course-consult" }),
  session({ id: "e25", pillar: "member", format: "tea", ...MORNING_TEA, date: "2026-12-03", time: "10:00", minutes: 90, space: "E8", people: [{ person: "p-host", role: "host" }], mode: "members", capacity: 12, taken: 2, member: INCLUDED, guest: MEMBERS_ONLY, tags: ["table"], photo: "cover-tea" }),
  session({
    id: "e26",
    pillar: "member",
    format: "salon",
    title: t("Members' salon: one book", "會員沙龍：一本書", "会员沙龙：一本书"),
    summary: t("One member brings one book and why it mattered.", "一位會員帶一本書，講它為什麼重要。", "一位会员带一本书，讲它为什么重要。"),
    date: "2026-12-06",
    time: "14:00",
    minutes: 90,
    space: "E1",
    people: [
      { person: "p-member", role: "speaker" },
      { person: "p-host", role: "host" },
    ],
    mode: "members",
    capacity: 24,
    taken: 9,
    member: INCLUDED,
    guest: MEMBERS_ONLY,
    tags: ["art"],
    photo: "cover-salon",
  }),
];

/** Every session, in date and time order. */
export const ACTIVITIES: readonly Activity[] = [...LISTED, ...MORE].sort((x, y) => (x.date + x.time).localeCompare(y.date + y.time));

export const BENEFITS: readonly Benefit[] = [
  { id: "b-calendar", pillar: "space", name: t("The calendar", "活動日曆", "活动日历"), line: t("See every session; join the open ones.", "看到每一場，參加公開的。", "看到每一场，参加公开的。") },
  { id: "b-priority", pillar: "space", name: t("Early registration", "優先報名", "优先报名"), line: t("Register before the calendar opens to all.", "在公開報名之前先報。", "在公开报名之前先报。") },
  { id: "b-guests", pillar: "space", name: t("Guests", "同行客人", "同行客人"), line: t("Bring guests to members' sessions.", "帶客人參加會員活動。", "带客人参加会员活动。") },
  { id: "b-space", pillar: "space", name: t("The halls", "預約殿院", "预约殿院"), line: t("Hold your own gathering in the halls and courtyards.", "在殿與院裡辦你自己的聚會。", "在殿与院里办你自己的聚会。") },
  { id: "b-course", pillar: "academy", name: t("Courses", "課程禮遇", "课程礼遇"), line: t("Open sessions and our education courses.", "公開課與教育課程。", "公开课与教育课程。") },
  { id: "b-consult", pillar: "academy", name: t("Consulting hours", "顧問時段", "顾问时段"), line: t("Time with a consultant on your own question.", "與顧問談你自己的問題。", "与顾问谈你自己的问题。") },
  { id: "b-art", pillar: "member", name: t("Art sharing", "藝術分享", "艺术分享"), line: t("One artist and one work, each month.", "每月一位藝術家，一件作品。", "每月一位艺术家，一件作品。") },
  { id: "b-tailor", pillar: "member", name: t("Tailor-made", "訂製活動", "定制活动"), line: t("An evening made for your family or guests.", "為你的家人或客人訂製一場。", "为你的家人或客人定制一场。") },
  { id: "b-service", pillar: "member", name: t("Personal service", "專屬服務", "专属服务"), line: t("Someone who knows your calendar.", "有人記得你的日程。", "有人记得你的日程。") },
  { id: "b-agent", pillar: "member", name: t("Your agent", "你的智能體", "你的智能体"), line: t("Keeps your calendar and what you like.", "記得你的日程與喜好。", "记得你的日程与喜好。") },
  { id: "b-legacy", pillar: "member", name: t("The Legacy book", "傳承錄", "传承录"), line: t("Your name kept at Xiding.", "你的名字留在西頂。", "你的名字留在西顶。") },
];

const YES = t("✓", "✓", "✓");
const MEMBER_RATE = t("Member rate", "會員價", "会员价");
const ONE_YEAR = t("One year", "一年", "一年");
const ON_REQUEST = t("On request", "會費另詢", "会费另询");
const BY_INVITATION = t("By invitation", "邀請制", "邀请制");
const has = (benefit: string, level: L = YES): { benefit: string; level: L } => ({ benefit, level });

/** Four tiers, each holding everything of the one before it, and more. A DRAFT for the owners to confirm. */
export const TIERS: readonly Tier[] = [
  {
    id: "friend",
    rank: 1,
    name: t("Friend of Xiding", "西頂之友", "西顶之友"),
    line: t("For anyone curious about Xiding.", "給對西頂好奇的人。", "给对西顶好奇的人。"),
    how: t("Open to apply", "開放申請", "开放申请"),
    entitlements: [has("b-calendar"), has("b-course", t("Open sessions", "公開課", "公开课"))],
    steps: [t("Leave your name", "留下姓名", "留下姓名"), t("Join at once", "即刻加入", "即刻加入")],
  },
  {
    id: "member",
    rank: 2,
    name: t("Member", "會員", "会员"),
    line: t("For those who keep coming back.", "給常回來的人。", "给常回来的人。"),
    how: BY_INVITATION,
    term: ONE_YEAR,
    fee: ON_REQUEST,
    entitlements: [
      has("b-calendar"),
      has("b-priority", t("3 days ahead", "提前 3 天", "提前 3 天")),
      has("b-guests", t("1 guest", "1 位", "1 位")),
      has("b-space", MEMBER_RATE),
      has("b-course", MEMBER_RATE),
      has("b-art"),
      has("b-service", t("Service desk", "服務台", "服务台")),
      has("b-agent"),
    ],
    steps: [t("Be introduced, or ask", "經引薦，或申請邀請", "经引荐，或申请邀请"), t("Visit Xiding once", "來西頂一次", "来西顶一次"), t("Become a member", "成為會員", "成为会员")],
  },
  {
    id: "kindred",
    rank: 3,
    name: t("Kindred", "知音", "知音"),
    line: t("For close friends of the house.", "給西頂的老朋友。", "给西顶的老朋友。"),
    how: BY_INVITATION,
    term: ONE_YEAR,
    fee: ON_REQUEST,
    limit: 200,
    entitlements: [
      has("b-calendar"),
      has("b-priority", t("7 days ahead", "提前 7 天", "提前 7 天")),
      has("b-guests", t("2 guests", "2 位", "2 位")),
      has("b-space", t("2 days a year", "每年 2 天", "每年 2 天")),
      has("b-course", t("1 course a year", "每年 1 門", "每年 1 门")),
      has("b-consult", t("Once a season", "每季 1 次", "每季 1 次")),
      has("b-art"),
      has("b-tailor", t("1 a year", "每年 1 場", "每年 1 场")),
      has("b-service", t("Your own host", "專屬管家", "专属管家")),
      has("b-agent"),
    ],
    steps: [t("Be a member", "先成為會員", "先成为会员"), t("Introduced by two members", "兩位會員引薦", "两位会员引荐"), t("A talk with the host", "與主理人面談", "与主理人面谈")],
  },
  {
    id: "legacy",
    rank: 4,
    name: t("Legacy", "傳承", "传承"),
    line: t("For those who keep Xiding going.", "給讓西頂傳下去的人。", "给让西顶传下去的人。"),
    how: t("By invitation only", "僅限受邀", "仅限受邀"),
    term: t("Three years", "三年", "三年"),
    fee: ON_REQUEST,
    limit: 50,
    entitlements: [
      has("b-calendar"),
      has("b-priority", t("14 days ahead", "提前 14 天", "提前 14 天")),
      has("b-guests", t("4 guests", "4 位", "4 位")),
      has("b-space", t("6 days a year", "每年 6 天", "每年 6 天")),
      has("b-course", t("Every course", "全部課程", "全部课程")),
      has("b-consult", t("Once a month", "每月 1 次", "每月 1 次")),
      has("b-art"),
      has("b-tailor", t("2 a year", "每年 2 場", "每年 2 场")),
      has("b-service", t("Host and founder", "管家與主理人", "管家与主理人")),
      has("b-agent"),
      has("b-legacy"),
    ],
    steps: [t("Be Kindred", "先成為知音", "先成为知音"), t("Invited by the founder", "由創辦人邀請", "由创办人邀请")],
  },
];

// ── Lookups ──────────────────────────────────────────────────────────────────────────────────────────────────────

const find = <T extends { readonly id: string }>(list: readonly T[], id: string): T | undefined => list.find((x) => x.id === id);
export const spaceById = (id: string): Space | undefined => find(SPACES, id);
export const personById = (id: string): Person | undefined => find(PEOPLE, id);
export const programmeById = (id: string): Programme | undefined => find(PROGRAMMES, id);
export const activityById = (id: string): Activity | undefined => find(ACTIVITIES, id);
export const benefitById = (id: string): Benefit | undefined => find(BENEFITS, id);
export const tierById = (id: string): Tier | undefined => find(TIERS, id);
