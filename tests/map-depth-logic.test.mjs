import assert from "node:assert/strict";
import test from "node:test";

/** Mirror of StorePinMap helpers for unit tests */
function clusterCellSizeDegrees(zoom) {
  if (zoom >= 13) return 0;
  if (zoom >= 11) return 0.04;
  if (zoom >= 9) return 0.12;
  if (zoom >= 7) return 0.35;
  return 0.9;
}

function clusterMapPins(pins, zoom) {
  const cell = clusterCellSizeDegrees(zoom);
  if (cell <= 0 || pins.length <= 1) return pins;
  const buckets = new Map();
  for (const pin of pins) {
    const key = `${Math.floor(pin.lat / cell)}:${Math.floor(pin.lng / cell)}`;
    const list = buckets.get(key) ?? [];
    list.push(pin);
    buckets.set(key, list);
  }
  const out = [];
  for (const [key, group] of buckets) {
    if (group.length === 1) out.push(group[0]);
    else {
      const lat = group.reduce((s, p) => s + p.lat, 0) / group.length;
      const lng = group.reduce((s, p) => s + p.lng, 0) / group.length;
      out.push({ id: `c:${key}`, lat, lng, count: group.length, pins: group });
    }
  }
  return out;
}

function filterMapPins(pins, filter) {
  if (filter === "all") return pins;
  if (filter === "nearby") return pins.filter((p) => p.proximityRank === "nearby");
  if (filter === "local") return pins.filter((p) => p.proximityRank === "nearby" || p.proximityRank === "far");
  return pins.filter((p) => p.proximityRank === "online");
}

const pins = [
  { storeId: "a", lat: 40.7, lng: -74.0, proximityRank: "nearby" },
  { storeId: "b", lat: 40.71, lng: -74.01, proximityRank: "nearby" },
  { storeId: "c", lat: 34.0, lng: -118.2, proximityRank: "far" },
  { storeId: "d", lat: 41.0, lng: -87.6, proximityRank: "online" },
];

test("filterMapPins by proximity", () => {
  assert.equal(filterMapPins(pins, "all").length, 4);
  assert.equal(filterMapPins(pins, "nearby").length, 2);
  assert.equal(filterMapPins(pins, "local").length, 3);
  assert.equal(filterMapPins(pins, "online").length, 1);
});

test("clusterMapPins collapses nearby at low zoom", () => {
  const high = clusterMapPins(pins, 14);
  assert.equal(high.length, 4);
  const low = clusterMapPins(pins, 6);
  const clusters = low.filter((x) => x.count);
  assert.ok(clusters.length >= 1);
  const nyc = clusters.find((c) => c.pins?.some((p) => p.storeId === "a"));
  assert.ok(nyc);
  assert.ok(nyc.count >= 2);
});
