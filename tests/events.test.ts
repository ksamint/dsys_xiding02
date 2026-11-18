import assert from "node:assert/strict";
import { test } from "node:test";
import { EVENTS, dateParts, monthName, pickFor, todayAtSite, upcoming, weekdayName, whenLine } from "../src/shared/events";

test("the calendar is well formed", () => {
  const ids = EVENTS.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length, "ids are unique");
  for (const e of EVENTS) {
    assert.doesNotThrow(() => dateParts(e.date));
    assert.match(e.time, /^([01]\d|2[0-3]):[0-5]\d$/);
    assert.ok(e.tags.length > 0, `${e.id} has a tag`);
    assert.equal(e.sample, true, `${e.id} must be marked as a sample until real sessions replace the list`);
  }
  const order = EVENTS.map((e) => e.date + e.time);
  assert.deepEqual(order, [...order].sort(), "events are listed in date order");
});

test("weekdays come from the date, never from a typed label", () => {
  assert.equal(dateParts("2026-11-14").weekday, 6);
  assert.equal(weekdayName("2026-11-14", "en"), "Sat");
  assert.equal(weekdayName("2026-11-14", "zh-Hant"), "週六");
  assert.equal(weekdayName("2026-11-19", "zh-Hans"), "周四");
  assert.equal(weekdayName("2027-01-09", "en"), "Sat");
  assert.equal(monthName("2026-11", "en"), "November 2026");
  assert.equal(monthName("2027-01", "zh-Hans"), "2027 年一月");
  const first = EVENTS.find((e) => e.id === "e01");
  assert.ok(first);
  assert.equal(whenLine(first, "en"), "Sat 14 Nov, 15:00");
  assert.equal(whenLine(first, "zh-Hans"), "11 月 14 日 周六 15:00");
});

test("today is counted at the site, UTC+8", () => {
  assert.equal(todayAtSite(new Date("2026-11-13T15:59:00Z")), "2026-11-13");
  assert.equal(todayAtSite(new Date("2026-11-13T16:00:00Z")), "2026-11-14");
});

test("picks follow what the member cares about, skip full and past sessions, and stop at three", () => {
  const today = "2026-11-13";
  const byDefault = pickFor([], today);
  assert.deepEqual(byDefault.map((p) => p.id), ["e12", "e01", "e13"], "the next three on the calendar, in time order");
  assert.ok(byDefault.every((p) => p.because === null));

  const ai = pickFor(["ai"], today);
  assert.equal(ai.length, 3);
  assert.deepEqual(ai.filter((p) => p.because === "ai").map((p) => p.id), ["e14", "e20", "e04"]);

  const guqin = pickFor(["guqin"], today);
  assert.ok(!guqin.some((p) => p.id === "e03"), "the guqin session is full, so it is never picked");
  assert.deepEqual(guqin.filter((p) => p.because === "guqin").map((p) => p.id), ["e13", "e23"]);

  const late = pickFor(["table"], "2026-12-20");
  assert.ok(late.every((p) => p.id > "e07"), "past sessions are never picked");
  assert.equal(pickFor(["art"], "2028-01-01").length, 0);
  assert.equal(upcoming("2027-01-10").length, 1);
});
