// Temporary replacements, kept in memory for this visit only (nothing is saved or sent): another photo for the 空
// composition, another mark, another 西頂廣仁宮. A reload goes back to the 西顶 originals. The card draws a replaced
// mark or name inside the box the original would take, kept whole and centred.

export type CustomKind = "photo" | "mark" | "word";
const logos: Record<"mark" | "word", HTMLImageElement | null> = { mark: null, word: null };
const MAX_SIDE = 2400;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => res(img);
    img.onerror = () => rej(new Error("这张图片打不开 · The image could not be read."));
    img.src = url;
  });
}

/** An SVG with no width and height has no size to draw at: give it its viewBox's. */
async function svgUrl(file: File): Promise<string> {
  let text = await file.text();
  const head = /<svg\b[^>]*>/i.exec(text)?.[0] ?? "";
  if (head && !/\swidth=/.test(head) && !/\sheight=/.test(head)) {
    const vb = /viewBox="\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)\s*"/i.exec(head);
    if (vb) text = text.replace(head, head.replace(/<svg\b/i, `<svg width="${vb[1]}" height="${vb[2]}"`));
  }
  return URL.createObjectURL(new Blob([text], { type: "image/svg+xml" }));
}

/** A photo, brought down to at most 2400 px on its long side and kept as a JPEG data URL for the card. */
export async function photoData(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const k = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(img.naturalWidth * k));
    c.height = Math.max(1, Math.round(img.naturalHeight * k));
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("no canvas");
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.9);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Use an image file for the mark or the name until the page is closed. */
export async function setLogo(kind: "mark" | "word", file: File): Promise<void> {
  const url = file.type === "image/svg+xml" || /\.svg$/i.test(file.name) ? await svgUrl(file) : URL.createObjectURL(file);
  logos[kind] = await loadImage(url);
  window.dispatchEvent(new Event("xd-photo"));
}
export function clearLogo(kind: "mark" | "word"): void {
  logos[kind] = null;
  window.dispatchEvent(new Event("xd-photo"));
}
export function customLogo(kind: "mark" | "word"): HTMLImageElement | null {
  const img = logos[kind];
  return img && img.naturalWidth > 0 && img.naturalHeight > 0 ? img : null;
}

/** An image kept whole in a box and centred in it. */
export function drawContain(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number): void {
  const k = Math.min(w / img.naturalWidth, h / img.naturalHeight);
  const iw = img.naturalWidth * k, ih = img.naturalHeight * k;
  ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
}
