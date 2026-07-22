import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = (path) => readFileSync(resolve(root, path), "utf8");

test("product-level shop the look is wired end-to-end", () => {
  assert.match(src("src/api/stores.ts"), /setProjectProducts/);
  assert.match(src("src/api/projects.ts"), /project_products/);
  assert.match(src("src/types.ts"), /productIds\?:/);
  assert.match(src("src/appModel.ts"), /productIds: string\[\]/);
  const detail = src("src/pages/ProjectDetailPage.tsx");
  assert.match(detail, /shop-look-product-picker/);
  assert.match(detail, /explicitProductIds/);
  assert.match(src("src/pages/JournalPage.tsx"), /journal-shop-look-products/);
  assert.match(src("src/app/AppShell.tsx"), /setProjectProducts/);
});
