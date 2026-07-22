import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = (path) => readFileSync(resolve(root, path), "utf8");
const migrations = readdirSync(resolve(root, "supabase/migrations"))
  .filter((name) => name.endsWith(".sql"))
  .map((name) => src(`supabase/migrations/${name}`))
  .join("\n");

test("DM depth migration adds group participants, attachments, storage, and realtime publication", () => {
  assert.match(migrations, /create table if not exists public\.dm_thread_members/i);
  assert.match(migrations, /create table if not exists public\.dm_message_attachments/i);
  assert.match(migrations, /kind.*group|group.*kind/is);
  assert.match(migrations, /create or replace function public\.create_group_dm_thread/i);
  assert.match(migrations, /alter publication supabase_realtime add table public\.dm_messages/i);
  assert.match(migrations, /alter publication supabase_realtime add table public\.dm_thread_reads/i);
  assert.match(migrations, /'dm-attachments'/i);
  assert.match(migrations, /storage\.objects[\s\S]+dm-attachments/i);
});

test("DM API exposes realtime subscriptions, group creation, and attachment upload/send", () => {
  const dmsApi = src("src/api/dms.ts");
  assert.match(dmsApi, /subscribeToDmEventsOnline/);
  assert.match(dmsApi, /createGroupDmThreadOnline/);
  assert.match(dmsApi, /uploadDmAttachmentOnline/);
  assert.match(dmsApi, /p_attachments/);
  assert.match(dmsApi, /DmAttachment/);
});

test("Messages UI renders group composer and attachment controls", () => {
  const page = src("src/pages/MessagesPage.tsx");
  assert.match(page, /New group/);
  assert.match(page, /Attach file/);
  assert.match(page, /dm-attachment-list/);
  assert.match(page, /onCreateGroup/);
});
