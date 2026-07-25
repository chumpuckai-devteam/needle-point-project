#!/usr/bin/env node
/**
 * Validate real-lns-catalog.json before seed.
 * Exit 1 on fake/incomplete rows.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const path = join(root, "scripts", "data", "real-lns-catalog.json");
if (!existsSync(path)) {
  console.error("Missing", path);
  process.exit(1);
}

const { stores } = JSON.parse(readFileSync(path, "utf8"));
const errors = [];
const handles = new Set();
const names = new Set();
const localKeys = new Set(); // name|city|region for brick-and-mortar uniqueness

for (const [i, s] of (stores || []).entries()) {
  const label = s.handle || s.name || `#${i}`;
  if (!s.name?.trim()) errors.push(`${label}: missing name`);
  if (!s.handle?.trim()) errors.push(`${label}: missing handle`);
  if (handles.has(s.handle)) errors.push(`${label}: duplicate handle`);
  handles.add(s.handle);
  const nameKey = String(s.name || "").toLowerCase().trim();
  if (nameKey && names.has(nameKey)) errors.push(`${label}: duplicate name "${s.name}"`);
  names.add(nameKey);
  if (s.store_type !== "online") {
    const lk = `${nameKey}|${String(s.city || "").toLowerCase()}|${String(s.region || "").toLowerCase()}`;
    if (localKeys.has(lk)) errors.push(`${label}: duplicate local place ${lk}`);
    localKeys.add(lk);
  }
  const web = String(s.website_url || "").toLowerCase();
  if (!web.startsWith("http")) errors.push(`${label}: website_url must be http(s)`);
  if (web.includes("example.com")) errors.push(`${label}: example.com is forbidden`);
  if (!["local", "online", "both"].includes(s.store_type)) errors.push(`${label}: bad store_type`);
  if (s.store_type !== "online") {
    if (!s.city?.trim() && !s.location?.trim()) errors.push(`${label}: local/both needs city or location`);
    if (s.latitude == null || s.longitude == null) {
      errors.push(`${label}: local/both should have lat/lng (map + nearby)`);
    }
  }
  const fakeName = /canvas loft|thread & tonic|canopy canvas|bookshop windows/i.test(s.name || "");
  if (fakeName) errors.push(`${label}: looks like a retired demo name`);
}

if (errors.length) {
  console.error("Catalog validation failed:");
  for (const e of errors) console.error(" -", e);
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, stores: stores.length, handles: [...handles].sort() }, null, 2));
