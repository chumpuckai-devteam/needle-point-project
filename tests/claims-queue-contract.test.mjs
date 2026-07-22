import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = (p) => readFileSync(resolve(root, p), "utf8");

test("shop claim queue UI + API + routes wired", () => {
  assert.match(src("src/api/stores.ts"), /fetchStoreClaimQueueOnline/);
  assert.match(src("src/api/stores.ts"), /approveStoreClaimRequestOnline/);
  assert.match(src("src/api/stores.ts"), /denyStoreClaimRequestOnline/);
  assert.match(src("src/pages/ClaimsQueuePage.tsx"), /claims-queue/);
  assert.match(src("src/pages/ClaimsQueuePage.tsx"), /Approve owner/);
  assert.match(src("src/app/AppRoutes.tsx"), /path="\/claims"/);
  assert.match(src("src/pages/AuthPage.tsx"), /\/claims/);
  assert.match(src("supabase/migrations/20260722140000_store_claim_moderator_queue.sql"), /list_store_claim_queue/);
});
