import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = (p) => readFileSync(resolve(root, p), "utf8");

test("map depth: filters, clusters, and UI wired", () => {
  const map = src("src/components/StorePinMap.tsx");
  assert.match(map, /export function clusterMapPins/);
  assert.match(map, /export function filterMapPins/);
  assert.match(map, /store-map-filters/);
  assert.match(map, /np-leaflet-cluster/);
  assert.match(map, /map-filter-\$\{item\.id\}/);
  assert.match(src("src/styles.css"), /np-leaflet-cluster-dot/);
});
