#!/usr/bin/env node
/**
 * Replace synthetic US density catalog with curated real LNS rows.
 *
 * 1) Delete demo/fake stores (example.com websites + known seed handles)
 *    — preserves owned shops listed with preserve_owned in the real catalog
 * 2) Upsert scripts/data/real-lns-catalog.json
 *
 * Usage: node scripts/replace-demo-stores-with-real-lns.mjs
 * Requires: SUPABASE_URL (or VITE_) + SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

for (const file of [join(root, ".env"), join(root, ".env.local"), "/opt/data/.env"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const eq = trimmed.indexOf("=");
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const catalogPath = join(__dirname, "data", "real-lns-catalog.json");
if (!existsSync(catalogPath)) {
  console.error("Missing", catalogPath);
  process.exit(1);
}

const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
const realStores = catalog.stores || [];
const preserveHandles = new Set(
  realStores.filter((s) => s.preserve_owned || s.handle === "needlepointcom-raleigh").map((s) => s.handle),
);

/** Known first-wave demo handles from seed.mjs / generator */
const DEMO_HANDLES = new Set([
  "canopycanvas",
  "threadandtonic",
  "bookshopwindows",
  "needleneststudio",
]);

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function rowFrom(store) {
  return {
    name: store.name,
    handle: store.handle,
    store_type: store.store_type || "local",
    description: store.description || "",
    avatar_url: store.avatar_url || "/assets/needlepoint-hero.png",
    cover_image_url: store.cover_image_url || "/assets/needlepoint-hero.png",
    website_url: store.website_url || "",
    location: store.location || [store.city, store.region].filter(Boolean).join(", "),
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

// --- 1) Load all stores
const { data: existing, error: listErr } = await supabase.from("stores").select("id, handle, website_url, owner_user_id, name");
if (listErr) throw new Error(`list stores: ${listErr.message}`);
console.log(`Loaded ${existing.length} stores`);

const toDelete = [];
for (const row of existing) {
  const handle = (row.handle || "").toLowerCase();
  const web = (row.website_url || "").toLowerCase();
  const isDemoHandle = DEMO_HANDLES.has(handle);
  const isExampleWeb = web.includes("example.com");
  const isOwned = Boolean(row.owner_user_id);
  const mustPreserve = preserveHandles.has(handle) && isOwned;

  if (mustPreserve) continue;

  // Remove synthetic density catalog + classic demo shops.
  // Keep non-example owned shops even if not in new catalog.
  if (isDemoHandle || isExampleWeb) {
    // Drop demo-owned canopy etc.; keep only explicitly preserved owned handles
    if (isOwned && !isDemoHandle && !isExampleWeb) continue;
    if (isOwned && preserveHandles.has(handle)) continue;
    // Owned + example.com but not preserve → delete (demo claim shells)
    toDelete.push(row);
  }
}

console.log(`Deleting ${toDelete.length} demo/fake stores…`);
const deleteIds = toDelete.map((r) => r.id);
// Batch delete
for (let i = 0; i < deleteIds.length; i += 80) {
  const chunk = deleteIds.slice(i, i + 80);
  const { error } = await supabase.from("stores").delete().in("id", chunk);
  if (error) throw new Error(`delete chunk: ${error.message}`);
}
console.log(`Deleted ${deleteIds.length}`);

// --- 2) Upsert real catalog
let inserted = 0;
let updated = 0;
for (const store of realStores) {
  const base = rowFrom(store);
  const { data: found, error: selErr } = await supabase
    .from("stores")
    .select("id, owner_user_id")
    .eq("handle", store.handle)
    .maybeSingle();
  if (selErr) throw new Error(`select ${store.handle}: ${selErr.message}`);

  if (found) {
    const { error } = await supabase.from("stores").update(base).eq("id", found.id);
    if (error) throw new Error(`update ${store.handle}: ${error.message}`);
    updated += 1;
  } else {
    const { error } = await supabase.from("stores").insert({
      ...base,
      follower_count: 0,
      created_at: new Date().toISOString(),
    });
    if (error) throw new Error(`insert ${store.handle}: ${error.message}`);
    inserted += 1;
  }
}

const { count } = await supabase.from("stores").select("id", { count: "exact", head: true });
console.log(JSON.stringify({ deleted: deleteIds.length, inserted, updated, remaining: count }, null, 2));
console.log("Done. Real LNS catalog is live.");
