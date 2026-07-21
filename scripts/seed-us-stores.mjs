#!/usr/bin/env node
/**
 * Upsert expanded US store catalog into Supabase (service role).
 * Usage: node scripts/seed-us-stores.mjs
 * Does NOT reset ownership/products on existing protected shops.
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

for (const file of [".env", ".env.local"]) {
  const p = join(root, file);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...valueParts] = trimmed.split("=");
    if (process.env[key]) continue;
    process.env[key] = valueParts.join("=").replace(/^['"]|['"]$/g, "");
  }
}

// Also try Hermes home env for gateway deploys
const hermesEnv = "/opt/data/.env";
if (existsSync(hermesEnv)) {
  for (const line of readFileSync(hermesEnv, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...valueParts] = trimmed.split("=");
    if (process.env[key]) continue;
    process.env[key] = valueParts.join("=").replace(/^['"]|['"]$/g, "");
  }
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const catalogPath = join(__dirname, "data", "us-store-catalog.json");
if (!existsSync(catalogPath)) {
  console.error("Missing catalog. Run: python3 scripts/generate-us-store-catalog.py");
  process.exit(1);
}

const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
const stores = catalog.stores || [];
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PROTECTED = new Set(["canopycanvas", "threadandtonic", "bookshopwindows", "needleneststudio"]);

function rowFrom(store) {
  return {
    name: store.name,
    handle: store.handle,
    store_type: store.store_type,
    description: store.description || "",
    avatar_url: store.avatar_url || "",
    cover_image_url: store.cover_image_url || "",
    website_url: store.website_url || "",
    location: store.location || "",
    city: store.city || "",
    region: store.region || "",
    country: store.country || "US",
    postal_code: store.postal_code || "",
    ships_nationwide: Boolean(store.ships_nationwide),
    specialties: store.specialties || [],
    latitude: store.latitude ?? null,
    longitude: store.longitude ?? null,
    updated_at: new Date().toISOString(),
  };
}

let inserted = 0;
let updated = 0;
let skipped = 0;

for (const store of stores) {
  const base = rowFrom(store);
  const { data: existing, error: selErr } = await supabase
    .from("stores")
    .select("id, owner_user_id, handle")
    .eq("handle", store.handle)
    .maybeSingle();
  if (selErr) throw new Error(`select ${store.handle}: ${selErr.message}`);

  if (existing) {
    // Never wipe ownership; still refresh catalog fields for discoverability
    const { error } = await supabase.from("stores").update(base).eq("id", existing.id);
    if (error) throw new Error(`update ${store.handle}: ${error.message}`);
    updated += 1;
  } else {
    const insert = { ...base };
    // New catalog shops stay unclaimed (claim flow later)
    const { error } = await supabase.from("stores").insert(insert);
    if (error) throw new Error(`insert ${store.handle}: ${error.message}`);
    inserted += 1;
  }
  if (PROTECTED.has(store.handle)) skipped += 0; // keep lint quiet
}

const { count, error: countErr } = await supabase.from("stores").select("*", { count: "exact", head: true });
if (countErr) throw new Error(countErr.message);

// Coverage check
const { data: regions, error: regErr } = await supabase.from("stores").select("region, city");
if (regErr) throw new Error(regErr.message);
const byRegion = new Map();
for (const r of regions || []) {
  const reg = (r.region || "").trim();
  if (!reg) continue;
  byRegion.set(reg, (byRegion.get(reg) || 0) + 1);
}
const thin = [...byRegion.entries()].filter(([, n]) => n < 2).map(([r, n]) => `${r}:${n}`);

console.log(JSON.stringify({ catalog: stores.length, inserted, updated, totalInDb: count, thinRegions: thin }, null, 2));
