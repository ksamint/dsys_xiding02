import { type L, t } from "./l10n";
import type { Space, SpaceKind } from "./ontology";

/* How a space is set up for a use, and how many it then holds. The figures are the space ledger's own defaults
   (西顶庙 · 空间台账与坪效): the area one person needs in each set-up, and the share of a floor that can be used. */

export type Setup = "theatre" | "classroom" | "banquet" | "reception" | "board" | "tea" | "gallery";

/** m² per person. */
export const DENSITY: Readonly<Record<Setup, number>> = { theatre: 0.75, classroom: 1.6, banquet: 1.1, reception: 0.7, board: 3.5, tea: 2.5, gallery: 3.0 };

/** The usable share of the floor, by kind of space. */
export const USABLE: Readonly<Record<SpaceKind, number>> = { hall: 0.75, room: 0.85, gallery: 0.7, courtyard: 0.7 };

export const SETUP: Readonly<Record<Setup, L>> = {
  theatre: t("Theatre", "劇院式", "剧院式"),
  classroom: t("Classroom", "課桌式", "课桌式"),
  banquet: t("Banquet", "宴會式", "宴会式"),
  reception: t("Reception", "酒會式", "酒会式"),
  board: t("Boardroom", "會議式", "会议式"),
  tea: t("Tea tables", "茶席", "茶席"),
  gallery: t("Exhibition", "展陳", "展陈"),
};

/** The set-ups each kind of space takes. */
export const SETUPS_FOR: Readonly<Record<SpaceKind, readonly Setup[]>> = {
  hall: ["theatre", "classroom", "banquet", "reception", "board", "tea"],
  room: ["board", "classroom", "tea"],
  gallery: ["gallery", "reception"],
  courtyard: ["reception", "banquet", "tea", "theatre"],
};

export const SETUP_IDS = Object.keys(SETUP) as Setup[];

/** How many a space holds in a set-up, by the ledger's rule: the floor its seats are counted from, times the usable
 *  share for its kind, over the area one person needs. 0 when the space does not take that set-up. */
export function capacityFor(space: Space, setup: Setup): number {
  if (!setupsOf(space).includes(setup)) return 0;
  return Math.floor((space.floor * USABLE[space.kind]) / DENSITY[setup]);
}

/** The set-ups a space takes: those of its kind, and always its usual one. */
export function setupsOf(space: Space): Setup[] {
  const list = [...SETUPS_FOR[space.kind]];
  return list.includes(space.setup) ? list : [space.setup, ...list];
}
