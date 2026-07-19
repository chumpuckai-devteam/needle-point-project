import { expect, test } from "@playwright/test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";

const root = cwd();
const migrationsDir = join(root, "supabase", "migrations");

function readMigrations(): string {
  return readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => readFileSync(join(migrationsDir, name), "utf8"))
    .join("\n");
}

function readOptional(path: string): string {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

test.describe("multi stitch-along backend contract", () => {
  test("schema supports public/private host-created SAL rows without single-SAL assumptions", () => {
    const sql = readMigrations();

    expect(sql).toContain("add column if not exists is_public boolean not null default true");
    expect(sql).toContain("create index if not exists stitch_alongs_public_window_idx");
    expect(sql).toContain("create index if not exists stitch_along_joins_user_idx");
    expect(sql).toContain("create index if not exists stitch_along_submissions_user_idx");
    expect(sql).toContain("comment on table public.stitch_alongs is 'First-class multi-event stitch-alongs hosted by authenticated users.'");
  });

  test("RLS exposes discoverable SALs publicly and limits writes to host or service role", () => {
    const sql = readMigrations();

    expect(sql).toContain("drop policy if exists \"Stitch alongs public read\" on public.stitch_alongs");
    expect(sql).toContain("create policy \"stitch_alongs_public_or_host_read\" on public.stitch_alongs");
    expect(sql).toContain("using (is_public or host_user_id = (select auth.uid()) or (select auth.role()) = 'service_role')");
    expect(sql).toContain("create policy \"stitch_alongs_host_insert\" on public.stitch_alongs");
    expect(sql).toContain("with check (host_user_id = (select auth.uid()))");
    expect(sql).toContain("create policy \"stitch_alongs_host_or_service_update\" on public.stitch_alongs");
    expect(sql).toContain("create policy \"stitch_alongs_host_or_service_delete\" on public.stitch_alongs");
    expect(sql).toContain("exists (select 1 from public.stitch_alongs sa where sa.id = stitch_along_id and sa.is_public)");
    expect(sql).toContain("exists (select 1 from public.projects p where p.id = project_id and p.user_id = (select auth.uid()) and p.visibility = 'public')");
    expect(sql).toContain("p.visibility = 'public'");
  });

  test("client API lists public SALs, fetches detail by id, creates as current host, and scopes join/submit to sal_id", () => {
    const api = readOptional(join(root, "src", "api", "stitchAlongs.ts"));
    // AppShell holds dual-mode SAL wiring after App entry split (routes/layout modules).
    const appShell = readFileSync(join(root, "src", "app", "AppShell.tsx"), "utf8");
    const types = readFileSync(join(root, "src", "types.ts"), "utf8");

    expect(types).toContain("isPublic: boolean");
    expect(types).toContain("startDate: string");
    expect(types).toContain("endDate: string");
    expect(api).toContain("export type StitchAlongInput");
    expect(api).toContain("export async function listPublicStitchAlongsOnline");
    expect(api).toContain("export async function getStitchAlongOnline");
    expect(api).toContain("export async function createStitchAlongOnline");
    expect(api).toContain("export async function joinStitchAlongOnline(stitchAlongId: string, userId: string");
    expect(api).toContain("export async function submitToStitchAlongOnline(stitchAlongId: string, projectId: string, userId: string");
    expect(api).toContain(".eq(\"stitch_along_id\", stitchAlongId)");
    expect(api).toContain("Only public projects can be submitted.");
    expect(api).toContain("host_user_id: userId");
    expect(appShell).toContain("listPublicStitchAlongsOnline");
    expect(appShell).toContain("getStitchAlongOnline");
    expect(appShell).toContain("joinStitchAlongOnline(current.id, user.id");
    expect(appShell).toContain("submitToStitchAlongOnline(current.id, projectId, user.id");
  });
});
