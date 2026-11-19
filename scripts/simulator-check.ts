// Opens the built simulator in Chromium at a phone and a desktop width, in both themes, works every control, and
// fails on a script error, a page wider than the screen, a mark that does not have its 40 circles, a saved SVG that
// is not the bundle's, or a token that disagrees with the bundle.
// Usage: tsx scripts/simulator-check.ts [dist/simulator/index.html]
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Page } from "playwright";

const file = process.argv[2] ?? join(process.cwd(), "dist/simulator/index.html");
const failures: string[] = [];
let checks = 0;
const expect = (ok: boolean, what: string): void => { checks++; if (!ok) failures.push(what); };

async function circlesInMark(p: Page): Promise<number> {
  return p.evaluate(() => document.querySelectorAll("#stage svg svg circle").length);
}
async function pick(p: Page, name: string, value: string): Promise<void> {
  await p.locator(`#controls input[name="${name}"][value="${value}"]`).check({ force: true });
}

const browser = await chromium.launch();
for (const [width, scheme] of [[390, "light"], [1280, "dark"]] as const) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: scheme });
  const p = await ctx.newPage();
  const errors: string[] = [];
  p.on("pageerror", (e) => errors.push(String(e)));
  p.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await p.goto(pathToFileURL(file).href);
  await p.waitForSelector("#stage svg");
  const at = `${width}px ${scheme}`;
  const overflow = async (): Promise<number> => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

  expect(await circlesInMark(p) === 40, `${at}: the mark has 40 circles`);
  expect(await p.locator("#f-ring").isHidden(), `${at}: line weight is hidden outside the Circle style`);
  for (const style of ["ring", "point", "dot"]) {
    await pick(p, "style", style);
    expect(await circlesInMark(p) === 40, `${at}: ${style}: 40 circles`);
  }
  await pick(p, "style", "ring");
  expect(await p.locator("#f-ring").isVisible(), `${at}: line weight shows in the Circle style`);
  const strokes = await p.evaluate(() => [...document.querySelectorAll("#stage svg svg circle")].every((c) => c.getAttribute("fill") === "none" && c.getAttribute("stroke-width") === "6"));
  expect(strokes, `${at}: Circle style draws 6-unit rings`);
  await pick(p, "style", "dot");
  for (const lockup of ["stacked", "horizontal", "mark"]) {
    await pick(p, "lockup", lockup);
    expect(await circlesInMark(p) === 40, `${at}: ${lockup}: 40 circles`);
    expect(await overflow() <= 0, `${at}: ${lockup}: no sideways scroll`);
  }
  for (const cw of ["ink", "night", "tealInk", "custom", "teal"]) await pick(p, "colorway", cw);
  for (const g of ["trued", "extracted"]) await pick(p, "geometry", g);
  for (const k of ["grid", "centres"]) await p.locator(`#controls input[name="show"][value="${k}"]`).check({ force: true });
  expect(await p.locator("#stage .sim-guides text").count() > 40, `${at}: guides carry their labels`);
  expect(await p.locator("#measures tr").count() >= 10, `${at}: the measures table is filled`);
  expect(await p.locator("#rows tr").count() === 8, `${at}: eight rows`);
  expect(await p.locator("#circles tr").count() === 40, `${at}: forty circle centres`);
  expect(await p.locator("#agree .sim-bad").count() === 0, `${at}: every mark-* token agrees with the bundle`);
  await p.fill('#controls input[name="height"]', "60");
  expect((await p.locator("#unit-h").textContent()) === "60 mm", `${at}: the output size follows the input`);
  const heightMm = await p.locator("#measures tr").nth(1).locator("td").nth(1).textContent();
  expect(heightMm === "60", `${at}: mark height converts to 60 mm (got ${heightMm})`);
  const same = await p.evaluate(() => {
    const X = window.Xiding;
    return X.mark({ colorway: "teal", style: "dot", lockup: "mark", geometry: "extracted", size: 1, ring: 6, transparent: false, sized: true, title: "西顶 Xiding" }).includes("<circle");
  });
  expect(same, `${at}: the bundle draws the mark the page saves`);
  expect(await overflow() <= 0, `${at}: no sideways scroll at the end`);
  expect(errors.length === 0, `${at}: no script errors (${errors.join(" | ")})`);
  await ctx.close();
}
await browser.close();
if (failures.length) { for (const f of failures) console.log(`FAIL  ${f}`); console.log(`\nsimulator-check: ${failures.length} of ${checks} failed`); process.exit(1); }
console.log(`simulator-check: ${checks} checks passed (2 widths × 2 themes)`);
