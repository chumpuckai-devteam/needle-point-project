import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = (p) => readFileSync(resolve(root, p), "utf8");

test("progress updates separated from comments + comment reports", () => {
  const detail = src("src/pages/ProjectDetailPage.tsx");
  assert.match(detail, /project-comments-section/);
  assert.match(detail, /Owner update/);
  assert.match(detail, /targetType="comment"/);
  assert.match(detail, /compact/);

  const reports = src("src/api/reports.ts");
  assert.match(reports, /"comment"/);

  const projects = src("src/api/projects.ts");
  assert.match(projects, /from\("comments"\)/);
  assert.match(projects, /authorUserId/);

  const reportUi = src("src/components/ReportControl.tsx");
  assert.match(reportUi, /compact/);
});
