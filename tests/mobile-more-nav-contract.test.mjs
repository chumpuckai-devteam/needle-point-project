import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = (p) => readFileSync(resolve(root, p), "utf8");

test("mobile nav is 4 slots with contrast-safe More sheet", () => {
  const side = src("src/components/Sidebar.tsx");
  assert.match(side, /exactly 4 slots|Studio, Discover, Shops, More/);
  assert.match(side, /mobile-more-nav/);
  assert.match(side, /Saved boards/);
  // New post is in More, not primary bottom bar
  assert.match(side, /id: "journal"/);
  const css = src("src/styles.css");
  assert.match(css, /repeat\(4, 1fr\)/);
  assert.match(css, /\.mobile-more-item[\s\S]*color: #1f2a24/);
  assert.match(css, /\.mobile-more-sheet[\s\S]*color: #1f2a24/);
});
