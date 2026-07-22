import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = (p) => readFileSync(resolve(root, p), "utf8");

test("mobile nav is 4 always-visible slots; More sheet has dark text", () => {
  const side = src("src/components/Sidebar.tsx");
  assert.match(side, /exactly 4 slots/);
  assert.match(side, /mobile-more-nav/);
  assert.match(side, /Saved boards/);
  const css = src("src/styles.css");
  assert.match(css, /repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(css, /Never horizontal-scroll the bottom bar/);
  assert.match(css, /overflow-x: hidden !important/);
  assert.match(css, /\.mobile-more-item[\s\S]*color: #1f2a24/);
});
