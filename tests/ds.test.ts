// The design system's own tools: the token rules keep the showcase's stylesheet plain, and the preview rule finds
// every way a preview could load from another host.
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTokens, validate } from "../tools/tokens.ts";

test("tokens: a value that could close a rule, a comment or the <style> is refused", () => {
  const good = loadTokens("design-system/tokens.json");
  assert.deepEqual(validate(good), []);
  const bad = structuredClone(good) as unknown as Record<string, { tokens: { value: unknown }[] }> & { type: { families: Record<string, string>; groups: { styles: Record<string, unknown>[] }[] }; name: string };
  bad["shadow"]!.tokens[0]!.value = "0 0 1px red}</style><script>alert(1)</script><style>";
  const fam = Object.keys(bad.type.families)[0]!;
  bad.type.families[fam] = "serif}</style><img src=x onerror=alert(1)>";
  bad.type.groups[0]!.styles[0]!["letterSpacing"] = "0.1em; } body { display: none";
  bad.name = "x */ </style>";
  const errs = validate(bad as never).join("\n");
  assert.match(errs, /shadow: .* CSS cannot take as written/);
  assert.match(errs, /family .* CSS cannot take as written/);
  assert.match(errs, /letterSpacing/);
  assert.match(errs, /cannot sit in a CSS comment/);
});
