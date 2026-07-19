import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = new URL("..", import.meta.url).pathname;
const migrationsDir = join(root, "supabase", "migrations");
const reportsMigrationName = readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql"))
  .sort()
  .find((name) => name.endsWith("_reports_queue.sql"));

const reportsMigration = reportsMigrationName
  ? readFileSync(join(migrationsDir, reportsMigrationName), "utf8")
  : "";
const reportsApi = readFileSync(join(root, "src", "api", "reports.ts"), "utf8");

test("reports migration creates a validated queue with duplicate and rate-limit controls", () => {
  assert.ok(reportsMigrationName, "reports queue migration should exist");
  assert.match(reportsMigration, /create type public\.report_target_type as enum \('project', 'profile', 'store'\)/i);
  assert.match(reportsMigration, /create table if not exists public\.reports/i);
  assert.match(reportsMigration, /reason text not null/i);
  assert.match(reportsMigration, /notes text not null default ''/i);
  assert.match(reportsMigration, /target_label text not null default ''/i);
  assert.match(reportsMigration, /reports_one_open_per_reporter_target_idx/i);
  assert.match(reportsMigration, /create or replace function public\.enforce_report_insert_rules/i);
  assert.match(reportsMigration, /new\.reporter_id := v_actor/i);
  assert.match(reportsMigration, /create trigger reports_enforce_insert_rules/i);
  assert.match(reportsMigration, /create or replace function public\.submit_report/i);
  assert.match(reportsMigration, /Authentication required\./i);
  assert.match(reportsMigration, /already submitted an open report/i);
  assert.match(reportsMigration, /Please wait before submitting another report\./i);
  assert.match(reportsMigration, /grant execute on function public\.submit_report/i);
});

test("reports RLS keeps rows private to reporters and admins while blocking normal edits", () => {
  assert.match(reportsMigration, /alter table public\.reports enable row level security/i);
  assert.match(reportsMigration, /create policy "reports_insert_own_via_rpc"/i);
  assert.match(reportsMigration, /create policy "reports_select_own_or_admin"/i);
  assert.match(reportsMigration, /create policy "reports_admin_update"/i);
  assert.match(reportsMigration, /public\.is_admin_or_moderator\(\)/i);
  assert.doesNotMatch(reportsMigration, /for delete to authenticated/i);
  assert.doesNotMatch(reportsMigration, /using \(true\)/i);
});

test("client report API submits through the RPC and never sends reporter_id", () => {
  assert.match(reportsApi, /export type ReportTargetType/i);
  assert.match(reportsApi, /export type ReportReason/i);
  assert.match(reportsApi, /export function validateReportInput/i);
  assert.match(reportsApi, /export async function submitReportOnline/i);
  assert.match(reportsApi, /client\.rpc\("submit_report"/i);
  assert.match(reportsApi, /p_target_type/i);
  assert.match(reportsApi, /p_target_id/i);
  assert.match(reportsApi, /p_reason/i);
  assert.match(reportsApi, /p_notes/i);
  assert.doesNotMatch(reportsApi, /reporter_id/i);
});
