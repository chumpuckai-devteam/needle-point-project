import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

// profiles.ts is TS — load via dynamic import of built? Prefer source regex + eval sanitize via vite-node if available.
// Contract: source must not select * for public profiles and must export sanitize.

const profilesSrc = readFileSync(join(root, "src/api/profiles.ts"), "utf8");
const shellSrc = readFileSync(join(root, "src/app/AppShell.tsx"), "utf8");
const migration = readFileSync(
  join(root, "supabase/migrations/20260812120000_profile_privacy_https_links_strip_fakes.sql"),
  "utf8",
);

test("public profile select omits email and star", () => {
  assert.match(profilesSrc, /PUBLIC_PROFILE_COLUMNS/);
  assert.doesNotMatch(profilesSrc, /\.from\("profiles"\)\.select\("\*"\)/);
  assert.match(profilesSrc, /sanitizeProfileUrl/);
  assert.match(profilesSrc, /fetchFollowedCreatorIds/);
});

test("sanitizeProfileUrl rules encoded in source", () => {
  assert.match(profilesSrc, /protocol !== "http:"/);
  assert.match(profilesSrc, /javascript:/);
});

test("AppShell hydrates creator follows and returns comment promise", () => {
  assert.match(shellSrc, /fetchFollowedCreatorIds/);
  assert.match(shellSrc, /setFollowedCreators\(remoteCreatorFollows\)/);
  assert.match(shellSrc, /return addCommentOnline/);
  assert.match(shellSrc, /fetchProjectStoreLinksMap/);
});

test("migration revokes email and strips fakes", () => {
  assert.match(migration, /revoke select \(email\)/i);
  assert.match(migration, /profile_links_url_http_check/);
  assert.match(migration, /example\.com/);
  assert.match(migration, /canopycanvas/);
});
