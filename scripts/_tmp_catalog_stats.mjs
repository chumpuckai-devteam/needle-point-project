import catalog from "../src/data/us-store-catalog.json" with { type: "json" };

const stores = catalog.stores;
console.log("total", stores.length);

const byCity = {};
for (const s of stores) {
  const k = s.city || "(online)";
  byCity[k] = (byCity[k] || 0) + 1;
}
console.log(
  "top cities",
  Object.entries(byCity)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20),
);

const online = stores.filter((s) => s.store_type === "online" || (!s.city && s.ships_nationwide));
console.log(
  "online",
  online.map((s) => s.handle),
);

const specialties = new Map();
for (const s of stores) {
  const key = (s.specialties || []).join("|");
  specialties.set(key, (specialties.get(key) || 0) + 1);
}
console.log(
  "specialty patterns",
  [...specialties.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12),
);

// Flagship candidates: first local/both shop per major metro + online
const majors = [
  "Brooklyn",
  "New York",
  "Chicago",
  "Boston",
  "Denver",
  "Seattle",
  "Los Angeles",
  "Atlanta",
  "Miami",
  "Nashville",
  "Austin",
  "Portland",
  "San Francisco",
  "Philadelphia",
  "Dallas",
  "Houston",
];
for (const city of majors) {
  const hits = stores.filter((s) => s.city === city).slice(0, 3);
  console.log(
    city,
    hits.map((s) => `${s.handle} [${(s.specialties || []).join(",")}]`),
  );
}
