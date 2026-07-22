import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = (p) => readFileSync(resolve(root, p), "utf8");

test("feed comment bubble opens X-style text composer", () => {
  const feed = src("src/components/feed.tsx");
  assert.match(feed, /feed-comment-btn/);
  assert.match(feed, /CommentComposerDialog/);
  assert.match(feed, /setCommentOpen\(true\)/);
  assert.doesNotMatch(feed, /onClick=\{\(\) => setView\(\{ name: "project".*aria-label="Comment"/s);

  const dialog = src("src/components/CommentComposerDialog.tsx");
  assert.match(dialog, /Post your reply/);
  assert.match(dialog, /comment-composer-input/);
  assert.match(dialog, /text comment/i);

  const routes = src("src/app/AppRoutes.tsx");
  assert.match(routes, /onAddComment=\{props\.addComment\}/);

  const shell = src("src/app/AppShell.tsx");
  assert.match(shell, /function addComment\(projectId: string, bodyOverride\?: string\)/);
});
