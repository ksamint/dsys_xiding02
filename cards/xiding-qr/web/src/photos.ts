// The photo library: pictures of 西顶广仁宫, kept beside the page in photos/. A card that shows a photo either names
// one, or takes one by its address, so each card has its own and keeps it. 随机 picks another.

export interface Photo {
  id: string;
  name: string;
  src: string;
  /** Where to keep in view when the frame crops, 0–1 across and down. */
  focus: [number, number];
}

export const PHOTOS: Photo[] = [
  { id: "bell", name: "铃", src: "photos/bell.jpg", focus: [0.3, 0.5] },
  { id: "ridge", name: "脊", src: "photos/ridge.jpg", focus: [0.62, 0.6] },
  { id: "plaque", name: "匾", src: "photos/plaque.jpg", focus: [0.67, 0.48] },
  { id: "ginkgo", name: "银杏", src: "photos/ginkgo.jpg", focus: [0.4, 0.5] },
  { id: "hall", name: "殿", src: "photos/hall.jpg", focus: [0.555, 0.55] },
];

/** No photo. */
export const NO_PHOTO = "none";
/** The id of a photo the person added for this visit (see custom.ts). */
export const CUSTOM_PHOTO = "custom";
let customPhoto: Photo | null = null;
/** Use this picture (a data URL) as the added photo; it replaces any earlier one. */
export function setCustomPhoto(src: string): Photo {
  cache.delete(CUSTOM_PHOTO);
  customPhoto = { id: CUSTOM_PHOTO, name: "自选", src, focus: [0.5, 0.5] };
  return customPhoto;
}
export function getCustomPhoto(): Photo | null { return customPhoto; }

const cache = new Map<string, HTMLImageElement>();

/** The image when it has loaded; else starts loading it and returns null (a redraw follows on `xd-photo`). */
export function photoImage(p: Photo): HTMLImageElement | null {
  let img = cache.get(p.id);
  if (!img) {
    img = new Image();
    img.decoding = "async";
    img.addEventListener("load", () => window.dispatchEvent(new Event("xd-photo")));
    img.src = p.src;
    cache.set(p.id, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

/** Resolves when the photo has loaded (or failed), so a saved PNG never has an empty frame. */
export function photoReady(p: Photo | null): Promise<void> {
  if (!p) return Promise.resolve();
  photoImage(p);
  const img = cache.get(p.id)!;
  if (img.complete) return Promise.resolve();
  return new Promise((res) => {
    img.addEventListener("load", () => res(), { once: true });
    img.addEventListener("error", () => res(), { once: true });
  });
}

/** A card's photo: the one it names, else one taken from its address so the same card always gets the same. */
export function photoFor(chosen: string | undefined, text: string): Photo | null {
  if (chosen === NO_PHOTO) return null;
  if (chosen === CUSTOM_PHOTO && customPhoto) return customPhoto;
  const named = PHOTOS.find((p) => p.id === chosen);
  if (named) return named;
  let h = 2166136261;
  for (const ch of text || "西顶") h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return PHOTOS[(h >>> 0) % PHOTOS.length];
}

/** Any photo but the one shown. */
export function otherPhoto(current: string | undefined): string {
  const pool = PHOTOS.filter((p) => p.id !== current);
  return pool[Math.floor(Math.random() * pool.length)].id;
}

/** Draws the photo to cover the box, cropping round its focus. */
export function drawPhoto(ctx: CanvasRenderingContext2D, p: Photo, x: number, y: number, w: number, h: number, wait: string): void {
  const img = photoImage(p);
  if (!img) {
    ctx.fillStyle = wait;
    ctx.fillRect(x, y, w, h);
    return;
  }
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const k = Math.max(w / iw, h / ih);
  const sw = w / k;
  const sh = h / k;
  const sx = Math.min(iw - sw, Math.max(0, p.focus[0] * iw - sw / 2));
  const sy = Math.min(ih - sh, Math.max(0, p.focus[1] * ih - sh / 2));
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}
