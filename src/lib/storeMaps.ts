/** Build Apple Maps / Google Maps deep links for a shop place. */

export type StoreMapTarget = {
  name: string;
  location?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  storeType?: string | null;
};

function clean(value?: string | null): string {
  return (value ?? "").trim();
}

/** Prefer coordinates when present and finite. */
export function storeMapCoords(store: StoreMapTarget): { lat: number; lng: number } | null {
  const lat = store.latitude;
  const lng = store.longitude;
  if (lat == null || lng == null) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  // Basic sanity (reject 0,0 placeholders)
  if (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

/**
 * Human place query for map search when coords are missing.
 * Includes shop name so Apple/Google can disambiguate.
 */
export function buildStoreMapQuery(store: StoreMapTarget): string {
  const name = clean(store.name);
  const location = clean(store.location);
  const city = clean(store.city);
  const region = clean(store.region);
  const postal = clean(store.postalCode);
  const country = clean(store.country) || "US";

  const locality = [city, region, postal].filter(Boolean).join(", ");
  // If location already looks complete, use it; still prefix name when useful.
  if (location) {
    const lower = location.toLowerCase();
    if (name && !lower.includes(name.toLowerCase())) {
      return `${name}, ${location}`;
    }
    return location;
  }
  if (locality) {
    return name ? `${name}, ${locality}, ${country}` : `${locality}, ${country}`;
  }
  return name;
}

/** True when we can open a maps app to a place (not pure online-only with no address). */
export function storeHasMappablePlace(store: StoreMapTarget): boolean {
  if (storeMapCoords(store)) return true;
  const q = buildStoreMapQuery(store);
  if (q.length < 3) return false;
  // Online-only "Ships nationwide" is not a place
  const loc = clean(store.location).toLowerCase();
  if (!clean(store.city) && !clean(store.region) && (loc.includes("ships nationwide") || loc === "online")) {
    return false;
  }
  if (store.storeType === "online" && !clean(store.city) && !clean(store.region) && !storeMapCoords(store)) {
    return false;
  }
  return true;
}

export function appleMapsUrl(store: StoreMapTarget): string | null {
  if (!storeHasMappablePlace(store)) return null;
  const coords = storeMapCoords(store);
  const name = clean(store.name) || "Shop";
  if (coords) {
    // ll = center, q = label
    return `https://maps.apple.com/?ll=${coords.lat},${coords.lng}&q=${encodeURIComponent(name)}`;
  }
  const q = buildStoreMapQuery(store);
  if (!q) return null;
  return `https://maps.apple.com/?q=${encodeURIComponent(q)}`;
}

export function googleMapsUrl(store: StoreMapTarget): string | null {
  if (!storeHasMappablePlace(store)) return null;
  const coords = storeMapCoords(store);
  const name = clean(store.name) || "Shop";
  if (coords) {
    // Name @ lat,lng helps Google show a labeled pin
    const query = `${name}@${coords.lat},${coords.lng}`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }
  const q = buildStoreMapQuery(store);
  if (!q) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export function storeMapLinks(store: StoreMapTarget): { apple: string; google: string } | null {
  const apple = appleMapsUrl(store);
  const google = googleMapsUrl(store);
  if (!apple || !google) return null;
  return { apple, google };
}
