import { type L, t } from "./l10n";
import type { PhotoId } from "./photo";
import type { Setup } from "./setups";

/* The ontology of Xiding's programmes and activities: what each kind of thing is, which fields it carries and how
   the kinds link to each other. The types are what the pages are built from; SCHEMA below says the same in words,
   in three languages, so the framework can be reviewed and exported for the future service that
   will hold the one source of truth (真知). A test keeps every sample record and SCHEMA in step. */

/** The three pillars, by the keys the calendar has always used: 1 space, 2 courses, 3 membership. */
export type EventKind = "space" | "academy" | "member";
export type InterestId = "art" | "guqin" | "exhibit" | "ai" | "consult" | "table" | "space";

// ── Places and people ────────────────────────────────────────────────────────────────────────────────────────────

export type SpaceKind = "hall" | "room" | "gallery" | "courtyard";
/** Where a space sits on the site, as the space ledger names its zones. */
export type Zone = "C" | "N" | "W" | "S" | "E";
/** A bookable space, as the space ledger (空间台账) holds it: its code is the ledger's. */
export interface Space {
  readonly id: string;
  readonly name: L;
  readonly kind: SpaceKind;
  readonly zone: Zone;
  /** Floor area in m². */
  readonly area: number;
  /** The floor its seats are counted from, in m². */
  readonly floor: number;
  /** Its usual set-up, as the ledger has it. */
  readonly setup: Setup;
  /** People it seats in its usual set-up, by the ledger's rule. */
  readonly capacity: number;
  readonly use: L;
  readonly photo: PhotoId;
  /** The one character that stands for it until its photograph arrives (Traditional; shown Simplified where read so). */
  readonly glyph: string;
}

/** A kind of activity, managed in one list: its name, its character and its place in the order. */
export interface ActivityCategory {
  readonly id: ActivityFormat;
  readonly name: L;
  readonly glyph: string;
  readonly order: number;
}

/** A tag an activity, a course or a person can carry; the member's interests are chosen from the same list. */
export interface Tag {
  readonly id: InterestId;
  readonly name: L;
}

export type Role = "lecturer" | "speaker" | "artist" | "expert" | "host" | "participant";
/** Who may see a person's introduction. A participant is shown only with their consent. */
export type Consent = "public" | "members" | "private";
export interface Person {
  readonly id: string;
  readonly name: L;
  readonly roles: readonly Role[];
  readonly headline: L;
  readonly bio: L;
  readonly fields: readonly InterestId[];
  readonly consent: Consent;
  readonly sample: boolean;
}

/** A person in a role at one activity or programme. */
export interface Appearance {
  readonly person: string;
  readonly role: Role;
}

// ── Courses and admission ────────────────────────────────────────────────────────────────────────────────────────

export type AdmissionMode = "open" | "application" | "invitation";
export type AdmissionStep = "apply" | "interview" | "offer" | "enrol";
export interface Admission {
  readonly mode: AdmissionMode;
  readonly cohort: number;
  readonly intake: L;
  /** Last day to apply, YYYY-MM-DD. */
  readonly deadline: string;
  readonly steps: readonly AdmissionStep[];
  readonly requirements: readonly L[];
  readonly fee: L;
}

export type ProgrammeFormat = "course" | "series" | "consulting";
export interface Programme {
  readonly id: string;
  readonly pillar: EventKind;
  readonly format: ProgrammeFormat;
  readonly title: L;
  readonly summary: L;
  readonly outcomes: readonly L[];
  readonly audience: L;
  readonly sessions: number;
  readonly length: L;
  readonly faculty: readonly Appearance[];
  readonly admission: Admission;
  readonly photo: PhotoId;
  readonly tags: readonly InterestId[];
  readonly sample: boolean;
}

// ── Activities and registration ──────────────────────────────────────────────────────────────────────────────────

export type RegistrationMode = "open" | "members" | "invitation";
/** What the registration form asks. */
export type Ask = "name" | "phone" | "guests" | "note";
export interface RegistrationRule {
  readonly mode: RegistrationMode;
  readonly capacity: number;
  readonly taken: number;
  readonly member: L;
  readonly guest: L;
  /** Last day to register, YYYY-MM-DD. */
  readonly closes: string;
  readonly asks: readonly Ask[];
  readonly cancel: L;
}

export type ActivityFormat = "salon" | "concert" | "exhibition" | "tea" | "dinner" | "open-day" | "lecture" | "consulting";
export interface Activity {
  readonly id: string;
  readonly pillar: EventKind;
  readonly format: ActivityFormat;
  readonly title: L;
  readonly summary: L;
  /** Local date at 西顶庙, YYYY-MM-DD. */
  readonly date: string;
  /** Local start time, HH:MM. */
  readonly time: string;
  readonly minutes: number;
  readonly space: string;
  readonly people: readonly Appearance[];
  /** The programme this is a session of, if any. */
  readonly programme?: string;
  readonly registration: RegistrationRule;
  readonly tags: readonly InterestId[];
  readonly photo: PhotoId;
  readonly sample: boolean;
}

// ── Membership ───────────────────────────────────────────────────────────────────────────────────────────────────

export interface Benefit {
  readonly id: string;
  readonly pillar: EventKind;
  readonly name: L;
  readonly line: L;
}

/** What one tier has of one benefit: a word or a measure, such as "✓", "3 days ahead", "Once a season". */
export interface Entitlement {
  readonly benefit: string;
  readonly level: L;
}

export interface Tier {
  readonly id: string;
  /** 1 is the first step in; each tier holds everything of the one before it, and more. */
  readonly rank: number;
  readonly name: L;
  /** One line on who it is for. */
  readonly line: L;
  readonly how: L;
  /** How long it lasts; none for a tier that does not lapse. */
  readonly term?: L;
  /** What it costs; none for a tier without a fee. */
  readonly fee?: L;
  /** How many places the tier has in all, when it is kept small. */
  readonly limit?: number;
  readonly entitlements: readonly Entitlement[];
  readonly steps: readonly L[];
}

// ── What people send: the records the service will keep ──────────────────────────────────────────────────────────

export type RegistrationStatus = "confirmed" | "waitlisted" | "attended" | "cancelled";
export interface RegistrationRecord {
  readonly id: string;
  readonly activity: string;
  readonly name: string;
  readonly phone: string;
  readonly guests: number;
  readonly note: string;
  readonly status: RegistrationStatus;
  readonly at: string;
  /** When staff checked the ticket at the door (核销); empty until then. */
  readonly checkedInAt: string;
}

/** A member's own introduction (自我介绍). Seen by the member, and by people checked in at the same session when
    `share` is on. Only the latest counts. */
export interface ProfileRecord {
  readonly id: string;
  readonly name: string;
  readonly headline: string;
  readonly bio: string;
  readonly tags: readonly string[];
  readonly share: boolean;
  readonly at: string;
}

export type ApplicationStatus = "submitted" | "interview" | "offered" | "enrolled" | "declined";
export interface ApplicationRecord {
  readonly id: string;
  readonly programme: string;
  readonly name: string;
  readonly phone: string;
  readonly note: string;
  readonly status: ApplicationStatus;
  readonly at: string;
}

export type InvitationStatus = "requested" | "invited" | "member" | "declined";
export interface InvitationRecord {
  readonly id: string;
  readonly tier: string;
  readonly name: string;
  readonly phone: string;
  readonly note: string;
  readonly status: InvitationStatus;
  readonly at: string;
}

/** Who is asking for a space. */
export type BookerRole = "staff" | "partner";
export type BookingStatus = "submitted" | "approved" | "declined";
/** A request to use a space, set up one way, for one slot: sent by staff or a partner, decided by an admin. */
export interface SpaceBooking {
  readonly id: string;
  readonly space: string;
  readonly date: string;
  readonly start: string;
  readonly end: string;
  readonly setup: Setup;
  readonly headcount: number;
  readonly purpose: string;
  readonly org: string;
  readonly role: BookerRole;
  readonly name: string;
  readonly phone: string;
  readonly status: BookingStatus;
  readonly note: string;
  readonly at: string;
  readonly decidedAt: string;
}

/** Who manages a page of their own: a lecturer (their introduction) or a partner (brand, company, products). */
export type IdentityKind = "lecturer" | "partner";
export type IdentityStatus = "submitted" | "verified" | "declined";
/** Proof of who someone is, before they may manage a page: phone and WeChat, confirmed by an admin. */
export interface IdentityRecord {
  readonly id: string;
  readonly kind: IdentityKind;
  /** For a lecturer: the person on the calendar they are. */
  readonly person: string;
  /** For a partner: the organisation. */
  readonly org: string;
  readonly name: string;
  readonly phone: string;
  readonly wechat: string;
  readonly status: IdentityStatus;
  readonly note: string;
  readonly at: string;
  readonly decidedAt: string;
}

export type ContentSection = "intro" | "brand" | "company" | "products";
export type ContentStatus = "submitted" | "live" | "declined";
/** One update to a page, which goes live only once an admin approves it. */
export interface ContentRecord {
  readonly id: string;
  readonly identity: string;
  readonly section: ContentSection;
  readonly fields: Readonly<Record<string, string>>;
  readonly status: ContentStatus;
  readonly note: string;
  readonly at: string;
  readonly decidedAt: string;
}

// ── Words for the enumerations ───────────────────────────────────────────────────────────────────────────────────

export const ROLE: Readonly<Record<Role, L>> = {
  lecturer: t("Lecturer", "講師", "讲师"),
  speaker: t("Speaker", "主講", "主讲"),
  artist: t("Artist", "藝術家", "艺术家"),
  expert: t("Expert", "專家", "专家"),
  host: t("Host", "主持", "主持"),
  participant: t("Participant", "參與者", "参与者"),
};

export const ACTIVITY_FORMAT: Readonly<Record<ActivityFormat, L>> = {
  salon: t("Salon", "沙龍", "沙龙"),
  concert: t("Concert", "演出", "演出"),
  exhibition: t("Exhibition", "展覽", "展览"),
  tea: t("Tea", "茶敘", "茶叙"),
  dinner: t("Dinner", "私宴", "私宴"),
  "open-day": t("Open day", "開放日", "开放日"),
  lecture: t("Lecture", "講座", "讲座"),
  consulting: t("Consulting", "諮詢", "咨询"),
};

export const PROGRAMME_FORMAT: Readonly<Record<ProgrammeFormat, L>> = {
  course: t("Course", "課程", "课程"),
  series: t("Series", "系列", "系列"),
  consulting: t("Consulting", "顧問陪跑", "顾问陪跑"),
};

export const ADMISSION_MODE: Readonly<Record<AdmissionMode, L>> = {
  open: t("Open enrolment", "公開報名", "公开报名"),
  application: t("By application", "申請制", "申请制"),
  invitation: t("By invitation", "邀請制", "邀请制"),
};

export const ADMISSION_STEP: Readonly<Record<AdmissionStep, L>> = {
  apply: t("Apply", "申請", "申请"),
  interview: t("Conversation", "面談", "面谈"),
  offer: t("Offer", "錄取", "录取"),
  enrol: t("Enrol", "入學", "入学"),
};

export const REGISTRATION_MODE: Readonly<Record<RegistrationMode, L>> = {
  open: t("Open to all", "公開報名", "公开报名"),
  members: t("Members", "會員報名", "会员报名"),
  invitation: t("By invitation", "邀請制", "邀请制"),
};

export const SPACE_KIND: Readonly<Record<SpaceKind, L>> = {
  hall: t("Halls", "殿堂", "殿堂"),
  room: t("Rooms", "房間", "房间"),
  gallery: t("Galleries", "展廊", "展廊"),
  courtyard: t("Open air", "露天", "露天"),
};

export const ZONE: Readonly<Record<Zone, L>> = {
  C: t("Centre", "中", "中"),
  N: t("North", "北", "北"),
  W: t("West", "西", "西"),
  S: t("South", "南", "南"),
  E: t("East", "東", "东"),
};

export const REGISTRATION_STATUS: Readonly<Record<RegistrationStatus, L>> = {
  confirmed: t("Confirmed", "已確認", "已确认"),
  waitlisted: t("On the waiting list", "候補中", "候补中"),
  attended: t("Checked in", "已簽到", "已签到"),
  cancelled: t("Cancelled", "已取消", "已取消"),
};

export const APPLICATION_STATUS: Readonly<Record<ApplicationStatus, L>> = {
  submitted: t("Received", "已收到", "已收到"),
  interview: t("Conversation", "面談", "面谈"),
  offered: t("Offered", "已錄取", "已录取"),
  enrolled: t("Enrolled", "已入學", "已入学"),
  declined: t("Not this time", "未錄取", "未录取"),
};

export const INVITATION_STATUS: Readonly<Record<InvitationStatus, L>> = {
  requested: t("Requested", "已申請", "已申请"),
  declined: t("Not this time", "未通過", "未通过"),
  invited: t("Invited", "已邀請", "已邀请"),
  member: t("Member", "會員", "会员"),
};

export const BOOKING_STATUS: Readonly<Record<BookingStatus, L>> = {
  submitted: t("Waiting for review", "待審批", "待审批"),
  approved: t("Approved", "已批准", "已批准"),
  declined: t("Declined", "未批准", "未批准"),
};

export const IDENTITY_KIND: Readonly<Record<IdentityKind, L>> = {
  lecturer: t("Lecturer", "講師", "讲师"),
  partner: t("Partner", "合作夥伴", "合作伙伴"),
};

export const IDENTITY_STATUS: Readonly<Record<IdentityStatus, L>> = {
  submitted: t("Waiting for an admin", "待管理員確認", "待管理员确认"),
  verified: t("Verified", "已認證", "已认证"),
  declined: t("Not confirmed", "未通過", "未通过"),
};

export const CONTENT_SECTION: Readonly<Record<ContentSection, L>> = {
  intro: t("My introduction", "個人介紹", "个人介绍"),
  brand: t("My brand", "我的品牌", "我的品牌"),
  company: t("My company", "我的企業", "我的企业"),
  products: t("My products and services", "我的產品服務", "我的产品服务"),
};

export const CONTENT_STATUS: Readonly<Record<ContentStatus, L>> = {
  submitted: t("Waiting for approval", "待審批", "待审批"),
  live: t("Live", "已上線", "已上线"),
  declined: t("Not approved", "未通過", "未通过"),
};

export const BOOKER_ROLE: Readonly<Record<BookerRole, L>> = {
  staff: t("Staff", "員工", "员工"),
  partner: t("Partner", "合作夥伴", "合作伙伴"),
};

export const ASK: Readonly<Record<Ask, L>> = {
  name: t("Name", "姓名", "姓名"),
  phone: t("Phone", "電話", "电话"),
  guests: t("Guests", "同行人數", "同行人数"),
  note: t("Note", "備註", "备注"),
};

// ── The framework in words ───────────────────────────────────────────────────────────────────────────────────────

export type CategoryId =
  | "activity"
  | "registration"
  | "registration-record"
  | "programme"
  | "admission"
  | "application-record"
  | "person"
  | "appearance"
  | "tier"
  | "benefit"
  | "entitlement"
  | "invitation-record"
  | "space"
  | "activity-category"
  | "tag"
  | "space-booking"
  | "identity"
  | "page-content";

export interface FieldDef {
  readonly key: string;
  readonly label: L;
  /** Plain type: text, date, time, number, enum, → Category, list. Language-neutral. */
  readonly type: string;
  readonly required: boolean;
}

export interface Category {
  readonly id: CategoryId;
  readonly name: L;
  readonly purpose: L;
  readonly fields: readonly FieldDef[];
  /** States a record moves through, in order. */
  readonly lifecycle?: readonly L[];
}

const f = (key: string, label: L, type: string, required = true): FieldDef => ({ key, label, type, required });
const names = (m: Readonly<Record<string, L>>): string => Object.keys(m).join(" | ");

const TEXT3 = "text · en / 繁 / 简";

export const SCHEMA: readonly Category[] = [
  {
    id: "activity",
    name: t("Activity", "活動", "活动"),
    purpose: t("One session on one day: what, when, where, who.", "一天裡的一場：做什麼、何時、何地、誰。", "一天里的一场：做什么、何时、何地、谁。"),
    fields: [
      f("id", t("ID", "編號", "编号"), "id"),
      f("pillar", t("Pillar", "支柱", "支柱"), "enum: space | academy | member"),
      f("format", t("Type", "分類", "分类"), "→ activity-category"),
      f("title", t("Title", "標題", "标题"), TEXT3),
      f("summary", t("One line", "一句話", "一句话"), TEXT3),
      f("date", t("Date", "日期", "日期"), "date"),
      f("time", t("Start", "開始", "开始"), "time"),
      f("minutes", t("Length", "時長", "时长"), "number · minutes"),
      f("space", t("Space", "空間", "空间"), "→ space"),
      f("people", t("People", "人物", "人物"), "list → appearance"),
      f("programme", t("Programme", "課程", "课程"), "→ programme", false),
      f("registration", t("Registration", "報名", "报名"), "→ registration"),
      f("tags", t("Tags", "標籤", "标签"), "list → tag"),
      f("photo", t("Photo", "照片", "照片"), "photo slot"),
      f("sample", t("Sample", "範例", "示例"), "yes / no"),
    ],
  },
  {
    id: "registration",
    name: t("Registration", "報名規則", "报名规则"),
    purpose: t("Who may come, how many, at what price, until when.", "誰能來、幾位、什麼價、到哪天。", "谁能来、几位、什么价、到哪天。"),
    fields: [
      f("mode", t("Who may register", "報名方式", "报名方式"), `enum: ${names(REGISTRATION_MODE)}`),
      f("capacity", t("Places", "名額", "名额"), "number"),
      f("taken", t("Taken", "已報", "已报"), "number"),
      f("member", t("Member price", "會員價", "会员价"), TEXT3),
      f("guest", t("Guest price", "非會員價", "非会员价"), TEXT3),
      f("closes", t("Closes", "截止", "截止"), "date"),
      f("asks", t("Form asks", "表單欄位", "表单栏位"), `list · enum: ${names(ASK)}`),
      f("cancel", t("Cancellation", "取消規則", "取消规则"), TEXT3),
    ],
  },
  {
    id: "registration-record",
    name: t("Registration record", "報名記錄", "报名记录"),
    purpose: t("What one person sent for one activity.", "一個人為一場活動送出的報名。", "一个人为一场活动送出的报名。"),
    fields: [
      f("id", t("ID", "編號", "编号"), "id"),
      f("activity", t("Activity", "活動", "活动"), "→ activity"),
      f("name", ASK.name, "text"),
      f("phone", ASK.phone, "text"),
      f("guests", ASK.guests, "number"),
      f("note", ASK.note, "text", false),
      f("status", t("Status", "狀態", "状态"), `enum: ${names(REGISTRATION_STATUS)}`),
      f("at", t("Sent", "送出時間", "送出时间"), "date-time"),
      f("checkedInAt", t("Checked in", "簽到時間", "签到时间"), "date-time", false),
    ],
    lifecycle: [REGISTRATION_STATUS.confirmed, REGISTRATION_STATUS.waitlisted, REGISTRATION_STATUS.attended, REGISTRATION_STATUS.cancelled],
  },
  {
    id: "programme",
    name: t("Programme", "課程", "课程"),
    purpose: t("A course or series over several sessions, with its faculty and admission.", "跨多次的課程或系列，帶講師與招生。", "跨多次的课程或系列，带讲师与招生。"),
    fields: [
      f("id", t("ID", "編號", "编号"), "id"),
      f("pillar", t("Pillar", "支柱", "支柱"), "enum: space | academy | member"),
      f("format", t("Format", "形式", "形式"), `enum: ${names(PROGRAMME_FORMAT)}`),
      f("title", t("Title", "標題", "标题"), TEXT3),
      f("summary", t("One line", "一句話", "一句话"), TEXT3),
      f("outcomes", t("What you leave with", "收穫", "收获"), "list · text"),
      f("audience", t("For", "適合", "适合"), TEXT3),
      f("sessions", t("Sessions", "次數", "次数"), "number"),
      f("length", t("Length", "時長", "时长"), TEXT3),
      f("faculty", t("Faculty", "講師", "讲师"), "list → appearance"),
      f("admission", t("Admission", "招生", "招生"), "→ admission"),
      f("photo", t("Photo", "照片", "照片"), "photo slot"),
      f("tags", t("Interests", "興趣", "兴趣"), "list · enum"),
      f("sample", t("Sample", "範例", "示例"), "yes / no"),
    ],
  },
  {
    id: "admission",
    name: t("Admission", "招生", "招生"),
    purpose: t("How one joins a programme: mode, cohort, steps, deadline.", "怎麼進一門課：方式、人數、步驟、截止。", "怎么进一门课：方式、人数、步骤、截止。"),
    fields: [
      f("mode", t("Mode", "方式", "方式"), `enum: ${names(ADMISSION_MODE)}`),
      f("cohort", t("Cohort", "每期人數", "每期人数"), "number"),
      f("intake", t("Intake", "期別", "期别"), TEXT3),
      f("deadline", t("Deadline", "截止", "截止"), "date"),
      f("steps", t("Steps", "步驟", "步骤"), `list · enum: ${names(ADMISSION_STEP)}`),
      f("requirements", t("Requirements", "要求", "要求"), "list · text"),
      f("fee", t("Fee", "學費", "学费"), TEXT3),
    ],
  },
  {
    id: "application-record",
    name: t("Application record", "申請記錄", "申请记录"),
    purpose: t("What one person sent to join one programme.", "一個人為一門課送出的申請。", "一个人为一门课送出的申请。"),
    fields: [
      f("id", t("ID", "編號", "编号"), "id"),
      f("programme", t("Programme", "課程", "课程"), "→ programme"),
      f("name", ASK.name, "text"),
      f("phone", ASK.phone, "text"),
      f("note", t("About you", "關於你", "关于你"), "text", false),
      f("status", t("Status", "狀態", "状态"), `enum: ${names(APPLICATION_STATUS)}`),
      f("at", t("Sent", "送出時間", "送出时间"), "date-time"),
    ],
    lifecycle: [APPLICATION_STATUS.submitted, APPLICATION_STATUS.interview, APPLICATION_STATUS.offered, APPLICATION_STATUS.enrolled],
  },
  {
    id: "person",
    name: t("Person", "人物", "人物"),
    purpose: t("Lecturers, speakers, artists, experts, hosts and participants.", "講師、主講、藝術家、專家、主持與參與者。", "讲师、主讲、艺术家、专家、主持与参与者。"),
    fields: [
      f("id", t("ID", "編號", "编号"), "id"),
      f("name", ASK.name, TEXT3),
      f("roles", t("Roles", "角色", "角色"), `list · enum: ${names(ROLE)}`),
      f("headline", t("Headline", "頭銜", "头衔"), TEXT3),
      f("bio", t("Introduction", "介紹", "介绍"), TEXT3),
      f("fields", t("Fields", "領域", "领域"), "list · enum"),
      f("consent", t("Shown to", "公開範圍", "公开范围"), "enum: public | members | private"),
      f("sample", t("Sample", "範例", "示例"), "yes / no"),
    ],
  },
  {
    id: "appearance",
    name: t("Appearance", "出場", "出场"),
    purpose: t("One person in one role at one activity or programme.", "一個人在一場活動或一門課裡的角色。", "一个人在一场活动或一门课里的角色。"),
    fields: [f("person", t("Person", "人物", "人物"), "→ person"), f("role", t("Role", "角色", "角色"), `enum: ${names(ROLE)}`)],
  },
  {
    id: "tier",
    name: t("Membership", "會籍", "会籍"),
    purpose: t("One tier of membership: who it is for, how one joins, and what it holds.", "一級會籍：為誰、怎麼加入、有什麼。", "一级会籍：为谁、怎么加入、有什么。"),
    fields: [
      f("id", t("ID", "編號", "编号"), "id"),
      f("name", t("Name", "名稱", "名称"), TEXT3),
      f("how", t("How to join", "加入方式", "加入方式"), TEXT3),
      f("term", t("Term", "期限", "期限"), TEXT3, false),
      f("fee", t("Fee", "會費", "会费"), TEXT3, false),
      f("rank", t("Rank", "等級", "等级"), "number"),
      f("line", t("Who it is for", "為誰", "为谁"), TEXT3),
      f("limit", t("Places in all", "總名額", "总名额"), "number", false),
      f("entitlements", t("Benefits", "權益", "权益"), "list → entitlement"),
      f("steps", t("Steps", "步驟", "步骤"), "list · text"),
    ],
  },
  {
    id: "benefit",
    name: t("Benefit", "權益", "权益"),
    purpose: t("One thing a member has, under one pillar.", "會員擁有的一項，歸於一根支柱。", "会员拥有的一项，归于一根支柱。"),
    fields: [
      f("id", t("ID", "編號", "编号"), "id"),
      f("pillar", t("Pillar", "支柱", "支柱"), "enum: space | academy | member"),
      f("name", t("Name", "名稱", "名称"), TEXT3),
      f("line", t("One line", "一句話", "一句话"), TEXT3),
    ],
  },
  {
    id: "entitlement",
    name: t("Entitlement", "權益等級", "权益等级"),
    purpose: t("What one tier has of one benefit.", "某一級會籍擁有某項權益的程度。", "某一级会籍拥有某项权益的程度。"),
    fields: [f("benefit", t("Benefit", "權益", "权益"), "→ benefit"), f("level", t("Level", "程度", "程度"), TEXT3)],
  },
  {
    id: "invitation-record",
    name: t("Invitation request", "邀請申請", "邀请申请"),
    purpose: t("One person asking to join a tier.", "一個人申請加入某級會籍。", "一个人申请加入某级会籍。"),
    fields: [
      f("id", t("ID", "編號", "编号"), "id"),
      f("tier", t("Tier", "會籍等級", "会籍等级"), "→ tier"),
      f("name", ASK.name, "text"),
      f("phone", ASK.phone, "text"),
      f("note", t("Who introduced you", "引薦人", "引荐人"), "text", false),
      f("status", t("Status", "狀態", "状态"), `enum: ${names(INVITATION_STATUS)}`),
      f("at", t("Sent", "送出時間", "送出时间"), "date-time"),
    ],
    lifecycle: [INVITATION_STATUS.requested, INVITATION_STATUS.invited, INVITATION_STATUS.member],
  },
  {
    id: "space",
    name: t("Space", "空間", "空间"),
    purpose: t("A bookable hall, room, gallery or courtyard, as the space ledger holds it.", "可預約的殿、房間、展廊或露天場地，以空間台賬為準。", "可预约的殿、房间、展廊或露天场地，以空间台账为准。"),
    fields: [
      f("id", t("Ledger code", "台賬編號", "台账编号"), "id · C1, N4, W2 …"),
      f("name", t("Name", "名稱", "名称"), TEXT3),
      f("kind", t("Kind", "類別", "类别"), `enum: ${names(SPACE_KIND)}`),
      f("zone", t("Zone", "方位", "方位"), `enum: ${names(ZONE)}`),
      f("area", t("Area", "面積", "面积"), "number · m²"),
      f("floor", t("Seating floor", "計座面積", "计座面积"), "number · m²"),
      f("setup", t("Usual set-up", "常用佈置", "常用布置"), "enum: theatre | classroom | banquet | reception | board | tea | gallery"),
      f("capacity", t("Capacity", "容納", "容纳"), "number"),
      f("use", t("Use", "用途", "用途"), TEXT3),
      f("photo", t("Photo", "照片", "照片"), "photo slot"),
      f("glyph", t("Character", "代表字", "代表字"), "text · one character"),
    ],
  },
  {
    id: "space-booking",
    name: t("Space booking", "場地預約", "场地预约"),
    purpose: t("Staff or a partner asks to use a space, set up one way, for one slot; an admin approves or declines.", "員工或合作夥伴申請在某個時段以某種佈置使用空間；管理員批准或不批准。", "员工或合作伙伴申请在某个时段以某种布置使用空间；管理员批准或不批准。"),
    fields: [
      f("id", t("ID", "編號", "编号"), "id"),
      f("space", t("Space", "空間", "空间"), "→ space"),
      f("date", t("Date", "日期", "日期"), "date"),
      f("start", t("From", "開始", "开始"), "time"),
      f("end", t("To", "結束", "结束"), "time"),
      f("setup", t("Set-up", "佈置", "布置"), "enum: theatre | classroom | banquet | reception | board | tea | gallery"),
      f("headcount", t("People", "人數", "人数"), "number · up to the set-up's capacity"),
      f("purpose", t("Purpose", "用途", "用途"), "text"),
      f("org", t("Organisation", "單位", "单位"), "text", false),
      f("role", t("Asked by", "申請方", "申请方"), "enum: staff | partner"),
      f("name", ASK.name, "text"),
      f("phone", ASK.phone, "text"),
      f("status", t("Status", "狀態", "状态"), `enum: ${names(BOOKING_STATUS)}`),
      f("note", t("Admin's note", "審批備註", "审批备注"), "text", false),
      f("at", t("Sent", "送出時間", "送出时间"), "date-time"),
      f("decidedAt", t("Decided", "審批時間", "审批时间"), "date-time", false),
    ],
    lifecycle: [BOOKING_STATUS.submitted, BOOKING_STATUS.approved],
  },
  {
    id: "identity",
    name: t("Identity check", "身份認證", "身份认证"),
    purpose: t("A lecturer or partner proves who they are with phone and WeChat; an admin confirms before they may manage a page.", "講師或合作夥伴以手機號與微信號證明身份，管理員確認後方可管理主頁。", "讲师或合作伙伴以手机号与微信号证明身份，管理员确认后方可管理主页。"),
    fields: [
      f("id", t("ID", "編號", "编号"), "id"),
      f("kind", t("As", "身份", "身份"), `enum: ${names(IDENTITY_KIND)}`),
      f("person", t("Lecturer", "講師", "讲师"), "→ person", false),
      f("org", t("Organisation", "單位", "单位"), "text", false),
      f("name", ASK.name, "text"),
      f("phone", ASK.phone, "text"),
      f("wechat", t("WeChat ID", "微信號", "微信号"), "text"),
      f("status", t("Status", "狀態", "状态"), `enum: ${names(IDENTITY_STATUS)}`),
      f("note", t("Admin's note", "審批備註", "审批备注"), "text", false),
      f("at", t("Sent", "送出時間", "送出时间"), "date-time"),
      f("decidedAt", t("Decided", "審批時間", "审批时间"), "date-time", false),
    ],
    lifecycle: [IDENTITY_STATUS.submitted, IDENTITY_STATUS.verified],
  },
  {
    id: "page-content",
    name: t("Page update", "主頁內容", "主页内容"),
    purpose: t("One update to a lecturer's introduction or a partner's brand, company or products; live only once an admin approves it.", "講師個人介紹或合作夥伴品牌、企業、產品服務的一次更新；管理員審批後上線。", "讲师个人介绍或合作伙伴品牌、企业、产品服务的一次更新；管理员审批后上线。"),
    fields: [
      f("id", t("ID", "編號", "编号"), "id"),
      f("identity", t("By", "提交人", "提交人"), "→ identity"),
      f("section", t("Section", "欄目", "栏目"), `enum: ${names(CONTENT_SECTION)}`),
      f("fields", t("Content", "內容", "内容"), "map · text"),
      f("status", t("Status", "狀態", "状态"), `enum: ${names(CONTENT_STATUS)}`),
      f("note", t("Admin's note", "審批備註", "审批备注"), "text", false),
      f("at", t("Sent", "送出時間", "送出时间"), "date-time"),
      f("decidedAt", t("Decided", "審批時間", "审批时间"), "date-time", false),
    ],
    lifecycle: [CONTENT_STATUS.submitted, CONTENT_STATUS.live],
  },
  {
    id: "activity-category",
    name: t("Activity type", "活動分類", "活动分类"),
    purpose: t("The kinds of activity, kept in one list so they are named and ordered the same everywhere.", "活動的種類，統一在一張表裡管理，各處名稱與順序一致。", "活动的种类，统一在一张表里管理，各处名称与顺序一致。"),
    fields: [f("id", t("ID", "編號", "编号"), `enum: ${names(ACTIVITY_FORMAT)}`), f("name", t("Name", "名稱", "名称"), TEXT3), f("glyph", t("Character", "代表字", "代表字"), "text · one character"), f("order", t("Order", "順序", "顺序"), "number")],
  },
  {
    id: "tag",
    name: t("Tag", "標籤", "标签"),
    purpose: t("Tags for activities, courses and people; members choose their interests from the same list.", "活動、課程與人物的標籤；會員的興趣也從這張表裡選。", "活动、课程与人物的标签；会员的兴趣也从这张表里选。"),
    fields: [f("id", t("ID", "編號", "编号"), "id"), f("name", t("Name", "名稱", "名称"), TEXT3)],
  },
];

/** The five things the pages show, and the categories each one is built from. */
export interface Showcase {
  readonly id: "admission" | "registration" | "people" | "course" | "benefits" | "booking" | "pages";
  readonly name: L;
  readonly route: string;
  readonly categories: readonly CategoryId[];
}

export const SHOWCASES: readonly Showcase[] = [
  { id: "admission", name: t("Admission", "招生", "招生"), route: "#programme/g-ai", categories: ["programme", "admission", "application-record"] },
  { id: "registration", name: t("Event registration", "活動報名", "活动报名"), route: "#activity/e04", categories: ["activity", "activity-category", "tag", "registration", "registration-record", "space"] },
  { id: "people", name: t("Lecturers, speakers and participants", "講師、主講與參與者", "讲师、主讲与参与者"), route: "#person/p-ai", categories: ["person", "appearance"] },
  { id: "course", name: t("Course introduction", "課程介紹", "课程介绍"), route: "#courses", categories: ["programme", "appearance", "activity"] },
  { id: "benefits", name: t("Member benefits", "會員權益", "会员权益"), route: "#me/benefits", categories: ["tier", "entitlement", "benefit", "invitation-record"] },
  { id: "booking", name: t("Space bookings", "場地預約", "场地预约"), route: "#me/admin", categories: ["space-booking", "space"] },
  { id: "pages", name: t("Lecturers' and partners' pages", "講師與合作夥伴主頁", "讲师与合作伙伴主页"), route: "#me/home", categories: ["identity", "page-content", "person"] },
];

export function category(id: CategoryId): Category {
  const c = SCHEMA.find((x) => x.id === id);
  if (!c) throw new Error(`No category ${id}`);
  return c;
}
