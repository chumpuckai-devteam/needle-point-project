import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = (p) => readFileSync(resolve(root, p), "utf8");

test("reporting polish: friendly errors, my reports, mod queue, review RPC", () => {
  const api = src("src/api/reports.ts");
  assert.match(api, /friendlyReportError/);
  assert.match(api, /reviewReportOnline/);
  assert.match(api, /fetchMyReportsOnline/);
  assert.match(api, /userIsModerator/);
  assert.match(src("src/components/ReportControl.tsx"), /report-thanks/);
  assert.match(src("src/components/MyReportsPanel.tsx"), /my-reports-panel/);
  assert.match(src("src/pages/ModerationPage.tsx"), /moderation-queue/);
  assert.match(src("src/pages/AuthPage.tsx"), /MyReportsPanel/);
  assert.match(src("src/app/AppRoutes.tsx"), /\/moderation/);
});
