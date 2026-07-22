import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = (p) => readFileSync(resolve(root, p), "utf8");

test("first-time help coach + recall are wired", () => {
  const lib = src("src/lib/helpTips.ts");
  assert.match(lib, /HELP_TIPS/);
  assert.match(lib, /needle-point-project:helpTips/);
  assert.match(lib, /resetHelpTipsPrefs/);
  assert.match(lib, /markHelpTipsCompleted/);
  assert.match(lib, /nav-more/);
  assert.match(lib, /guestOk: true/);

  assert.match(src("src/context/HelpTipsContext.tsx"), /HelpTipsProvider/);
  assert.match(src("src/context/HelpTipsContext.tsx"), /startTour/);
  assert.match(src("src/context/HelpTipsContext.tsx"), /forceMoreOpen/);

  assert.match(src("src/components/HelpCoach.tsx"), /help-coach/);
  assert.match(src("src/components/HelpCoach.tsx"), /Skip tips/);
  assert.match(src("src/components/HelpCoach.tsx"), /help-coach-next/);

  assert.match(src("src/components/HelpTipsRecallPanel.tsx"), /Show help tips again/);
  assert.match(src("src/components/HelpTipsRecallPanel.tsx"), /help-tips-restart/);

  assert.match(src("src/app/providers.tsx"), /HelpTipsProvider/);
  assert.match(src("src/app/AppLayout.tsx"), /HelpCoach/);

  assert.match(src("src/pages/AuthPage.tsx"), /HelpTipsRecallPanel/);
  assert.match(src("src/pages/AuthPage.tsx"), /Show navigation tips/);

  assert.match(src("src/components/Sidebar.tsx"), /Help tips/);
  assert.match(src("src/components/Sidebar.tsx"), /startTour/);
  assert.match(src("src/components/Sidebar.tsx"), /data-help-anchor/);
  assert.match(src("src/components/Sidebar.tsx"), /nav-more/);

  assert.match(src("src/components/ReportControl.tsx"), /help-report/);
  assert.match(src("src/styles.css"), /\.help-coach-card/);
  assert.match(src("src/styles.css"), /\.help-coach-spotlight/);
});
