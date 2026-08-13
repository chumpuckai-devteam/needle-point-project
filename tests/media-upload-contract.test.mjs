import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const images = readFileSync(join(root, "src/api/images.ts"), "utf8");
const journal = readFileSync(join(root, "src/pages/JournalPage.tsx"), "utf8");
const migration = readFileSync(
  join(root, "supabase/migrations/20260813090000_project_video_url_and_media_limits.sql"),
  "utf8",
);

test("media limits match Instagram-style caps", () => {
  assert.match(images, /MAX_IMAGE_BYTES = 8 \* 1024 \* 1024/);
  assert.match(images, /MAX_VIDEO_BYTES = 100 \* 1024 \* 1024/);
  assert.match(images, /uploadProjectVideo/);
  assert.match(images, /validateVideoFile/);
});

test("journal uses upload dropzones without URL fields", () => {
  assert.match(journal, /journal-photo-upload/);
  assert.match(journal, /journal-video-upload/);
  assert.doesNotMatch(journal, /Or image URL/);
  assert.doesNotMatch(journal, /Video URL/);
  assert.match(journal, /type=\"file\"/);
});

test("migration adds video_url and 100MB bucket", () => {
  assert.match(migration, /video_url/);
  assert.match(migration, /104857600/);
  assert.match(migration, /video\/mp4/);
});
