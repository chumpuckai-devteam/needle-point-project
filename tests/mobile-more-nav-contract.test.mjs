import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = (p) => readFileSync(resolve(root, p), "utf8");

test("mobile nav exposes More sheet with Saved boards", () => {
  const side = src("src/components/Sidebar.tsx");
  assert.match(side, /mobile-more-nav/);
  assert.match(side, /Saved boards/);
  assert.match(side, /mobile-more-sheet/);
  const css = src("src/styles.css");
  assert.match(css, /sidebar-nav-mobile/);
  assert.match(css, /mobile-more-sheet\[hidden\]/);
  assert.match(src("src/pages/AuthPage.tsx"), /account-quick-links/);
});
