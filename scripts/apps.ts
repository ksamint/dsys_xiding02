import { renderDeck } from "../src/deck/render";
import { renderOnepager } from "../src/onepager/render";
import { EVENTS } from "../src/shared/events";
import { renderSite } from "../src/site/render";

/** The day the pages are first drawn on, before their scripts redraw them on the reader's own day. It is fixed, so the
    same sources always build the same pages (the showcase and its check depend on that): the first day in the sample
    calendar, or XIDING_BUILD_DATE (YYYY-MM-DD). */
export const PRERENDER_DAY: string = (() => {
  const v = (process.env["XIDING_BUILD_DATE"] ?? "").trim();
  if (v) {
    const real = /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v;
    if (!real) throw new Error("XIDING_BUILD_DATE must be a real day, YYYY-MM-DD");
    return v;
  }
  const first = EVENTS.map((e) => e.date).sort()[0];
  if (!first) throw new Error("the sample calendar is empty");
  return first;
})();

/** Where the pages find each other. An empty string hides the link. The member calendar and the H5 app live in
    the member-app repository; these pages only link to them. */
export interface Links {
  readonly deck: string;
  readonly site: string;
  readonly members: string;
  readonly programmes: string;
  /** Where the QR code for the latest events leads: the member calendar. */
  readonly events: string;
}

export interface AppSpec {
  readonly id: "deck" | "site" | "onepager";
  /** File name of the Artifact preview, without extension. */
  readonly artifact: string;
  readonly title: string;
  readonly description: string;
  readonly entry: string;
  readonly css: readonly string[];
  readonly rootClass: string;
  /** Lengths written `Nu` in this app's own stylesheet are slide pixels. */
  readonly slideUnits?: boolean;
  /** The page as first drawn, in English; the script redraws it in the reader's language. */
  readonly prerender: (links: Links) => string;
}

export const APPS: readonly AppSpec[] = [
  {
    id: "deck",
    artifact: "xiding-introduction",
    title: "Xiding Introduction",
    description: "The official introduction to Xiding: one place, three brands, three pillars and their core modules.",
    entry: "src/deck/client.ts",
    css: ["src/shared/base.css", "src/shared/system.css", "src/deck/deck.css"],
    rootClass: "deck",
    slideUnits: true,
    prerender: (links) => renderDeck("en", 1, links.events),
  },
  {
    id: "site",
    artifact: "xiding-official-site",
    title: "Xiding Official Site",
    description: "Xiding, a place of legacy and beauty at 西顶庙 in Haidian, Beijing: three brands, three pillars and how each one works.",
    entry: "src/site/client.ts",
    css: ["src/shared/base.css", "src/shared/system.css", "src/site/site.css"],
    rootClass: "site",
    prerender: (links) => renderSite("en", links, PRERENDER_DAY),
  },
  {
    id: "onepager",
    artifact: "xiding-overview",
    title: "Xiding Overview",
    description: "Xiding on one portrait page: the place, three brands, three pillars and their modules, and the foundation, to share as a PDF or an image.",
    entry: "src/onepager/client.ts",
    css: ["src/shared/base.css", "src/shared/system.css", "src/onepager/onepager.css"],
    rootClass: "onepager",
    slideUnits: true,
    prerender: (links) => renderOnepager("en", links.events),
  },
];
