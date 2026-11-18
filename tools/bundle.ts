/* Builds design-system/components/bundle.js from components/src/xiding.ts:
   tsc with comments removed, then the one-line header. `--check` fails if the
   committed bundle differs from a fresh build. */
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = new URL("../design-system/components/", import.meta.url).pathname;
const HEADER = "/* 西顶 XIDING bundle — window.Xiding. Built from components/src/xiding.ts with tsc; no framework, no network. */\n";

export function buildBundle(): string {
  const out = mkdtempSync(join(tmpdir(), "xd-bundle-"));
  try {
    const tsc = new URL("../node_modules/.bin/tsc", import.meta.url).pathname;
    const project = new URL("../tsconfig.bundle.json", import.meta.url).pathname;
    execFileSync(tsc, ["-p", project, "--outDir", out], { stdio: "inherit" });
    return HEADER + readFileSync(join(out, "xiding.js"), "utf8");
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const built = buildBundle();
  const target = join(ROOT, "bundle.js");
  if (process.argv.includes("--check")) {
    if (readFileSync(target, "utf8") !== built) {
      console.error("bundle.js is out of date: run `npm run build`");
      process.exit(1);
    }
    console.log("bundle.js matches components/src/xiding.ts");
  } else {
    writeFileSync(target, built);
    console.log("bundle.js written");
  }
}
