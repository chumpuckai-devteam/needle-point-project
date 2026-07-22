import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = (p) => readFileSync(resolve(root, p), "utf8");

test("multi-SAL list filters, templates, and host tools are wired", () => {
  const page = src("src/pages/StitchAlongPage.tsx");
  assert.match(page, /FLAGSHIP_TEMPLATES/);
  assert.match(page, /sal-filter-row/);
  assert.match(page, /sal-host-tools/);
  assert.match(page, /End stitch-along/);
  assert.match(page, /type="date"/);
  const api = src("src/api/stitchAlongs.ts");
  assert.match(api, /updateStitchAlongOnline/);
  assert.match(api, /participantUserIds/);
  assert.match(src("src/app/AppShell.tsx"), /endStitchAlong/);
});
