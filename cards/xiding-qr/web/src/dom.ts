// Small DOM helpers. Everything is built with DOM calls, never HTML strings, so the page runs under a strict CSP.

type Attrs = Record<string, string | number | boolean | undefined>;
type Kid = Node | string | null | undefined | false;

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...kids: Kid[]): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k === "class") node.className = String(v);
    else node.setAttribute(k, v === true ? "" : String(v));
  }
  for (const kid of kids) if (kid) node.append(kid);
  return node;
}

export const SVG_NS = "http://www.w3.org/2000/svg";

export function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Attrs = {}): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== false) node.setAttribute(k, String(v));
  return node;
}

/** The pair dot: two overlapping dots that join names, and end a call to act. */
export function pairDot(cls = "pair"): SVGSVGElement {
  const s = svgEl("svg", { class: cls, viewBox: "0 0 26 15", "aria-hidden": "true", focusable: "false" });
  s.append(svgEl("circle", { cx: 7.5, cy: 7.5, r: 7 }), svgEl("circle", { cx: 18.5, cy: 7.5, r: 7 }));
  return s;
}

export function reducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
