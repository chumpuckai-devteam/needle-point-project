import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Contract tests for B5 outbound click analytics (no-PII).
 */
test.describe("outbound click analytics contract", () => {
  test("migration is write-only insert with host-only destination", () => {
    const sql = fs.readFileSync(
      path.join(process.cwd(), "supabase/migrations/20260719210000_outbound_click_events.sql"),
      "utf8",
    );
    expect(sql).toContain("create table if not exists public.outbound_click_events");
    expect(sql).toContain("destination_host");
    expect(sql).toContain("shop_link_click");
    expect(sql).toContain("store_website_click");
    expect(sql).toContain("grant insert on public.outbound_click_events");
    expect(sql).toContain("outbound_click_event_counts");
    // No client SELECT on raw rows
    expect(sql).not.toMatch(/for select[\s\S]*outbound_click_events/i);
  });

  test("client API normalizes host and never stores full URL field", () => {
    const api = fs.readFileSync(path.join(process.cwd(), "src/api/clickEvents.ts"), "utf8");
    expect(api).toContain("normalizeDestinationHost");
    expect(api).toContain("destination_host");
    expect(api).toContain("recordOutboundClickEvent");
    expect(api).not.toMatch(/destination_url\s*:/);
  });

  test("store + project detail instrument outbound links", () => {
    const store = fs.readFileSync(path.join(process.cwd(), "src/pages/StoreDetailPage.tsx"), "utf8");
    const project = fs.readFileSync(path.join(process.cwd(), "src/pages/ProjectDetailPage.tsx"), "utf8");
    expect(store).toContain("recordOutboundClickEvent");
    expect(store).toContain("store_website_click");
    expect(store).toContain("shop_link_click");
    expect(project).toContain("shop_the_look");
    expect(project).toContain("recordOutboundClickEvent");
  });
});
