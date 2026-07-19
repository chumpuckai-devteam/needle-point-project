import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const migration = readFileSync(
  path.join(root, "supabase/migrations/20260719204500_followed_stores_feed_rpc.sql"),
  "utf8",
);
const storesApi = readFileSync(path.join(root, "src/api/stores.ts"), "utf8");

test.describe("followed stores backend contract", () => {
  test("RPC returns only the authenticated user's followed stores in rail order", () => {
    expect(migration).toContain("create or replace function public.my_followed_stores");
    expect(migration).toContain("raise exception 'Authentication required.'");
    expect(migration).toContain("where sf.follower_id = (select auth.uid())");
    expect(migration).toContain("order by sf.created_at desc");
    expect(migration).toContain("revoke all on function public.my_followed_stores() from public");
    expect(migration).toContain("grant execute on function public.my_followed_stores() to authenticated");
    expect(migration).toContain("followed_at timestamptz");
    expect(migration).toContain("follower_count bigint");
  });

  test("frontend API exposes documented followed store shape and rejects anonymous callers", () => {
    expect(storesApi).toContain("export type FollowedStore");
    expect(storesApi).toContain("FOLLOWED_STORES_QUERY_KEY");
    expect(storesApi).toContain('client.rpc("my_followed_stores")');
    expect(storesApi).toContain('throw new Error("Sign in to load followed shops.")');
    expect(storesApi).toContain("followedAt: row.followed_at");
  });
});
