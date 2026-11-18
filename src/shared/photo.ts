import { type L, type Locale, esc, t, tr } from "./l10n";
import { markSvg } from "./mark";

/* Every photograph on the deck, the site and the member pages is a named slot.
   To place a picture: save it as public/photos/<slot id>.jpg (or .png, .webp) and build. The media server writes there too.
   Until then the slot draws a quiet field with a line saying what the picture should show.
   The briefs follow the design system's imagery rule: the real site, straight on, in daylight, with people doing something. */

export interface PhotoSlot {
  /** Width over height, as CSS aspect-ratio. */
  readonly ratio: string;
  /** What the photograph should show. */
  readonly brief: L;
  /** Path or data URI of the real photograph. Leave undefined to show the placeholder. */
  readonly src?: string;
}

export const PHOTOS = {
  "site-gate": {
    ratio: "4 / 5",
    brief: t("The gate of 西顶庙, straight on, in daylight.", "西頂廟山門，正面，白天。", "西顶庙山门，正面，白天。"),
  },
  "site-courtyard": {
    ratio: "16 / 10",
    brief: t("A courtyard with people arriving.", "院子，有人正走進來。", "院子，有人正走进来。"),
  },
  "space-venue": {
    ratio: "1 / 1",
    brief: t("A hall set up for an event.", "為一場活動佈置好的殿內。", "为一场活动布置好的殿内。"),
  },
  "space-planning": {
    ratio: "1 / 1",
    brief: t("Two staff walk through the plan at a table.", "兩位工作人員在桌前過流程。", "两位工作人员在桌前过流程。"),
  },
  "space-themed": {
    ratio: "1 / 1",
    brief: t("A guqin player before an audience in the hall.", "殿裡，古琴演奏者面對聽眾。", "殿里，古琴演奏者面对听众。"),
  },
  "space-ops": {
    ratio: "1 / 1",
    brief: t("Guests arriving at the gate, met by staff.", "工作人員在門口接待來賓。", "工作人员在门口接待来宾。"),
  },
  "member-invite": {
    ratio: "1 / 1",
    brief: t("A host welcomes two invited guests.", "主人迎接兩位受邀嘉賓。", "主人迎接两位受邀嘉宾。"),
  },
  "member-art": {
    ratio: "1 / 1",
    brief: t("An artist shares a work with members.", "藝術家向會員分享一件作品。", "艺术家向会员分享一件作品。"),
  },
  "member-tailor": {
    ratio: "1 / 1",
    brief: t("A private dinner at one round table.", "一張圓桌上的私宴。", "一张圆桌上的私宴。"),
  },
  "member-service": {
    ratio: "1 / 1",
    brief: t("Staff walk a member to a reserved room.", "工作人員領會員走向預留的房間。", "工作人员领会员走向预留的房间。"),
  },
  "course-training": {
    ratio: "1 / 1",
    brief: t("A workshop at long tables, a facilitator walking.", "長桌工作坊，引導者在桌間走動。", "长桌工作坊，引导者在桌间走动。"),
  },
  "course-consult": {
    ratio: "1 / 1",
    brief: t("An expert and a team at one table.", "專家和一個團隊同坐一桌。", "专家和一个团队同坐一桌。"),
  },
  "course-library": {
    ratio: "1 / 1",
    brief: t("Archive shelves of plain grey boxes.", "一排排素灰檔案盒的架子。", "一排排素灰档案盒的架子。"),
  },
  "course-delivery": {
    ratio: "1 / 1",
    brief: t("An expert works beside a team at their tables.", "專家在團隊的桌邊一起做事。", "专家在团队的桌边一起做事。"),
  },
  /* Covers in the H5 app: one picture for each kind of session that had none of its own. */
  "cover-tea": {
    ratio: "1 / 1",
    brief: t("Morning tea at a long low table by a lattice window.", "格子窗邊長矮桌上的晨間茶敘。", "格子窗边长矮桌上的晨间茶叙。"),
  },
  "cover-guqin-night": {
    ratio: "1 / 1",
    brief: t("A guqin under the old tree at dusk, stools in an arc.", "黃昏老樹下的古琴，素凳圍成弧形。", "黄昏老树下的古琴，素凳围成弧形。"),
  },
  "cover-exhibition": {
    ratio: "1 / 1",
    brief: t("Five framed works on a plaster wall.", "素牆上五件裝框作品。", "素墙上五件装框作品。"),
  },
  "cover-calligraphy": {
    ratio: "1 / 1",
    brief: t("A long table of sheets, each with one large character.", "長桌上一排大紙，各寫一個大字。", "长桌上一排大纸，各写一个大字。"),
  },
  "cover-salon": {
    ratio: "1 / 1",
    brief: t("A circle of chairs, an open book on one.", "一圈素椅，一把椅上放著打開的書。", "一圈素椅，一把椅上放着打开的书。"),
  },
} as const satisfies Record<string, PhotoSlot>;

export type PhotoId = keyof typeof PHOTOS;

const LABEL = t("Image", "影像", "影像");

/* Real files, found at build time under public/photos/<slot>.(jpg|png|webp), are registered here before anything is drawn. */
const sources: Partial<Record<PhotoId, string>> = {};

export function setPhotoSources(map: Readonly<Record<string, string>>): void {
  for (const id of Object.keys(PHOTOS) as PhotoId[]) {
    const src = map[id];
    if (src) sources[id] = src;
    else delete sources[id];
  }
}

/** The real photograph for a slot, when there is one. */
export function photoSrc(id: PhotoId): string | undefined {
  const slot: PhotoSlot = PHOTOS[id];
  return sources[id] ?? slot.src;
}

export function photo(id: PhotoId, locale: Locale, className = ""): string {
  const slot: PhotoSlot = PHOTOS[id];
  const cls = `xd-photo${className ? ` ${className}` : ""}`;
  const brief = tr(slot.brief, locale);
  const src = sources[id] ?? slot.src;
  if (src) {
    return `<figure class="${cls} xd-photo--filled" data-photo-slot="${id}" style="aspect-ratio:${slot.ratio}"><img src="${esc(src)}" alt="${esc(brief)}" loading="lazy"></figure>`;
  }
  return `<figure class="${cls}" data-photo-slot="${id}" style="aspect-ratio:${slot.ratio}">${markSvg({ style: "ring" })}<figcaption>${tr(LABEL, locale)}　${esc(brief)}</figcaption></figure>`;
}
