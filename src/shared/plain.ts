import { brand, brands, closing, ecosystem, foundation, pillars, system, thesis, who } from "./content";
import { type L, type Locale, t, tr } from "./l10n";

/* The 1 – 2 – 3 – X introduction as plain text in one language, to paste into a message. */

export const copyUi = {
  label: t("Copy text", "複製文字", "复制文字"),
  copied: t("Copied", "已複製", "已复制"),
  failed: t("Could not copy", "沒有複製", "没有复制"),
};

const key = (locale: Locale): "en" | "hant" | "hans" => (locale === "en" ? "en" : locale === "zh-Hant" ? "hant" : "hans");

export function introText(locale: Locale, eventsUrl = ""): string {
  const en = locale === "en";
  const gap = en ? "  " : "　";
  const list = en ? ", " : "、";
  const colon = en ? ": " : "：";
  const s = (l: L): string => tr(l, locale);
  const fig = (n: string | number, l: L): string => `${n}${gap}${s(l)}`;
  const base = [foundation.truth, foundation.paradigm, foundation.platform].map((b) => `${s(b.name)}${gap}${s(b.line)}`);
  const blocks = [
    [s(brand.name), s(thesis.line)],
    [fig(1, who.label), `${s(brand.name)}${gap}${s(who.verse)}`],
    [fig(2, brands.label), brands.items.map((b) => s(b.name)).join(gap)],
    [fig(3, pillars.label), ...pillars.items.map((p) => fig(p.n, p.name))],
    [
      fig("X", ecosystem.label),
      s(foundation.native),
      `${s(system.eco.name)}${colon}${ecosystem.members.map(s).join(list)}`,
      `${s(system.solutions.name)}${colon}`,
      ...pillars.items.map((p) => `${fig(p.n, p.name)}${colon}${p.modules.map((m) => s(m.name)).join(list)}`),
      `${s(system.base.name)}${colon}`,
      ...base,
      foundation.more.map(s).join(gap),
    ],
    [...closing.headline[key(locale)], brand.web, ...(eventsUrl ? [`${s(closing.events)}${gap}${eventsUrl}`] : [])],
  ];
  const text = blocks.map((b) => b.join("\n")).join("\n\n");
  // English keeps plain spaces; no line ends in a space.
  return `${(en ? text.replaceAll("　", "  ") : text).replace(/[ \t]+$/gm, "")}\n`;
}

/** The copy button for a page's bottom bar. */
export function copyButton(locale: Locale): string {
  return `<button type="button" class="xd-export__btn xd-copy" id="copy-text" data-act="copy">${tr(copyUi.label, locale)}</button>`;
}

/** Puts text on the clipboard; falls back to a selected text area where the clipboard API is not allowed. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* blocked in this frame: try the old way */
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.append(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  area.remove();
  return ok;
}
