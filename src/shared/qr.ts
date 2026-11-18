import qrcode from "qrcode-generator";
import { esc } from "./l10n";

/** A QR code as SVG: black modules on a white plate with its quiet zone, whatever the page's theme, so every phone reads it. */
export function qrSvg(text: string, label: string): string {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const quiet = 4;
  let d = "";
  for (let row = 0; row < n; row += 1) {
    for (let col = 0; col < n; col += 1) {
      if (qr.isDark(row, col)) d += `M${col + quiet} ${row + quiet}h1v1h-1z`;
    }
  }
  const size = n + quiet * 2;
  return `<svg class="xd-qr" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" role="img" aria-label="${esc(label)}"><rect width="${size}" height="${size}" fill="#FFFFFF"/><path d="${d}" fill="#000000"/></svg>`;
}
