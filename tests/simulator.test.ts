// The pillar simulator's measurements, against the design system's bundle and tokens.json.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import { agreement, columns, inkExtent, measures, pairs, perUnit, radius, ratio, rows, type Geometry, type MarkData } from "../src/simulator/spec";

interface Bundle { R: number; PAD: number; BOUNDS: MarkData["BOUNDS"]; points(g?: Geometry): MarkData["points"]; circles(g?: Geometry): MarkData["circles"] }
const sandbox: { Xiding?: Bundle } = {};
vm.runInNewContext(readFileSync("design-system/components/bundle.js", "utf8"), sandbox);
const X = sandbox.Xiding!;
const plain = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T; // the bundle's objects come from another realm
const tokens = Object.fromEntries((JSON.parse(readFileSync("design-system/tokens.json", "utf8")) as { mark: { tokens: { name: string; value: string }[] } }).mark.tokens.map((t) => [t.name, Number(t.value)]));
const data = (g: Geometry): MarkData => plain({ R: X.R, PAD: X.PAD, BOUNDS: X.BOUNDS, points: X.points(g), circles: X.circles(g), tokens });

test("the mark-* tokens say what the bundle draws", () => {
  for (const g of ["extracted", "trued"] as const) {
    const a = agreement(data(g));
    assert.deepEqual(a.filter((x) => x.level === "differs"), [], g);
    assert.ok(a.filter((x) => x.token !== "mark-pair").every((x) => x.level === "same"), `${g}: width, height, dot and clear are exact`);
  }
  assert.equal(agreement(data("trued")).find((x) => x.token === "mark-pair")?.level, "same", "the trued pairs sit exactly 2 × mark-pair apart");
});

test("8 rows, 32 marks, 40 circles, and the ink box is the bounds", () => {
  const d = data("extracted");
  const rs = rows(d);
  assert.equal(rs.length, 8);
  assert.deepEqual(rs.map((r) => r.label).join(""), "ABCDEFGH");
  assert.equal(rs.reduce((n, r) => n + r.marks, 0), 32);
  assert.equal(rs.reduce((n, r) => n + r.circles, 0), 40);
  assert.equal(rs.at(-1)?.pitch, null);
  const ink = inkExtent(d, { style: "dot", size: 1, ring: 6 });
  for (const k of ["left", "right", "top", "bottom"] as const) assert.ok(Math.abs(ink[k] - d.BOUNDS[k]) <= 0.5, `${k}: ${ink[k]} vs ${d.BOUNDS[k]}`);
  assert.deepEqual(columns(d).map((c) => c.rows), ["ABH", "CDEF", "G"]);
  assert.deepEqual(columns(data("trued")).map((c) => c.rows), ["ABGH", "CDEF"], "trued, the outer rows share one set of columns");
});

test("ratio, pairs, radius and units", () => {
  const d = data("trued");
  const r = ratio(d.BOUNDS);
  assert.deepEqual([r.w, r.h], [tokens["mark-width"], tokens["mark-height"]]);
  assert.deepEqual(r.reduced, [211, 339]);
  assert.equal(radius(d, { style: "dot", size: 1, ring: 6 }), tokens["mark-dot"]);
  assert.equal(radius(d, { style: "point", size: 1, ring: 6 }), tokens["mark-point"]);
  assert.equal(radius(d, { style: "dot", size: 0.5, ring: 6 }), tokens["mark-dot"]! / 2);
  const ps = pairs(d, { style: "dot", size: 1, ring: 6 });
  assert.equal(ps.length, 8);
  assert.ok(ps.every((p) => p.distance === 2 * tokens["mark-pair"]! && p.overlap === 2 * tokens["mark-dot"]! - 2 * tokens["mark-pair"]!));
  const mm = perUnit(d, { height: 30, unit: "mm", dpi: 300 });
  assert.ok(Math.abs(mm.mm * tokens["mark-height"]! - 30) < 1e-9);
  const px = perUnit(d, { height: 300, unit: "px", dpi: 150 });
  assert.ok(Math.abs(px.px * tokens["mark-height"]! - 300) < 1e-9);
  const m = Object.fromEntries(measures(d, { style: "dot", size: 1, ring: 6 }).map((x) => [x.key, x.u]));
  assert.equal(m["clear"], tokens["mark-clear"]);
  assert.equal(m["artW"], tokens["mark-width"]! + 2 * tokens["mark-clear"]!);
  assert.equal(m["artH"], tokens["mark-height"]! + 2 * tokens["mark-clear"]!);
});
