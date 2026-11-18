import { setPhotoSources } from "./photo";

/** The build lists the pictures it found on the page's root element; register them before the first draw. */
export function loadPhotoSources(root: HTMLElement | null): void {
  try {
    const map: unknown = JSON.parse(root?.dataset["photos"] ?? "{}");
    if (map && typeof map === "object") setPhotoSources(map as Record<string, string>);
  } catch {
    /* no pictures listed: every slot draws its placeholder */
  }
}
