/* 西顶 XIDING — asset build. Run with Node after compiling xiding.ts:
     tsc src/xiding.ts src/build-assets.ts --target ES2019 --lib es2019,dom --outDir build && node build/build-assets.js out
   It asks the bundle for the whole kit and writes one SVG and one JSON drawing list per asset.
   Assets marked "serif" or "none" can then be outlined with the Noto Serif SC font files and uploaded;
   assets marked "mixed" also need Instrument Sans, so they are exported from the AssetKit page in a browser. */
declare const require: any;
declare const process: any;
const fs = require("fs");
const path = require("path");
require("./xiding.js");
const X = (globalThis as any).Xiding;
const out: string = process.argv[2] || "out";
fs.mkdirSync(out, { recursive: true });
const index: { name: string; group: string; fonts: string; label: string; width: number; height: number }[] = [];
for (const a of X.kit()) {
  fs.writeFileSync(path.join(out, a.name + ".svg"), X.toSVG(a));
  fs.writeFileSync(path.join(out, a.name + ".json"), JSON.stringify(a));
  index.push({ name: a.name, group: a.group, fonts: a.fonts, label: a.label, width: a.w, height: a.h });
}
fs.writeFileSync(path.join(out, "kit.json"), JSON.stringify({ version: X.version, assets: index }, null, 1));
console.log(index.length + " assets written to " + out);
