import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = (path) => readFileSync(resolve(root, path), "utf8");

test("multi-board save picker is wired on project detail + collections remove", () => {
  const detail = src("src/pages/ProjectDetailPage.tsx");
  assert.match(detail, /project-board-picker/);
  assert.match(detail, /onSetProjectInCollection/);
  assert.match(detail, /Save to board/);
  const shell = src("src/app/AppShell.tsx");
  assert.match(shell, /setProjectInCollection/);
  assert.match(shell, /addProjectToCollectionOnline/);
  const collections = src("src/pages/CollectionsPage.tsx");
  assert.match(collections, /onRemoveProjectFromCollection/);
  assert.match(collections, /Remove/);
  const rank = src("src/lib/interestRank.ts");
  assert.match(rank, /rankProjectsByInterest/);
  const app = src("src/app/AppShell.tsx");
  assert.match(app, /rankProjectsByInterest|composeStudioFeed/);
});
