import type { Store } from "../types";
import {
  formatDistanceMiles,
  haversineMiles,
  isLocalCapable,
  isOnlineCapable,
  isOnlineOnly,
  LOCAL_DRIVING_RADIUS_MILES,
  type GeoPoint,
  type RankedStore,
} from "./geo";

/** Allowed radius choices for V4 expand-area flow. */
export const DISCOVERY_RADIUS_OPTIONS = [60, 100, 150] as const;
export type DiscoveryRadiusMiles = (typeof DISCOVERY_RADIUS_OPTIONS)[number];

/** Max online shops shown in fallback rails (browse + zero-local). */
export const DISCOVERY_ONLINE_FALLBACK_CAP = 12;
/** Max city cards on the default /stores browse grid. */
export const BROWSE_CITY_CARD_CAP = 36;
/** Page size for shop result grids (show more). */
export const STORE_LIST_PAGE_SIZE = 24;

export type StoreDiscoveryMode = "zip" | "city" | "point" | "browse";

export type StoreDiscoveryInput =
  | { mode: "zip"; zip: string; radiusMiles?: DiscoveryRadiusMiles }
  | { mode: "city"; city: string; region?: string; country?: string; radiusMiles?: DiscoveryRadiusMiles }
  | {
      mode: "point";
      lat: number;
      lng: number;
      radiusMiles?: DiscoveryRadiusMiles;
      source: "location" | "map" | "city-geocode";
      displayLabel?: string;
    }
  | { mode: "browse"; cityKey?: string };

export type CityCandidate = {
  city: string;
  region: string;
  country: string;
  displayLabel: string;
  center?: GeoPoint;
  shopCount?: number;
  key: string;
};

export type StoreDiscoveryListItem = RankedStore & {
  detailUrl: string;
  proximityRank: "nearby" | "online" | "far";
};

export type StoreDiscoveryMapPin = {
  storeId: string;
  handle: string;
  name: string;
  lat: number;
  lng: number;
  proximityRank: "nearby" | "far" | "online";
  distanceMiles?: number | null;
  detailUrl: string;
};

export type StoreDiscoveryResponse = {
  query: {
    mode: StoreDiscoveryMode;
    displayLabel: string;
    zip?: string;
    city?: string;
    region?: string;
    country?: string;
    center?: GeoPoint;
    radiusMiles: number;
    expandedFromRadiusMiles?: number;
    source?: "location" | "map" | "city-geocode";
  };
  status: "ok" | "invalid-input" | "ambiguous-city" | "zero-local" | "geocode-unavailable";
  message?: string;
  cityCandidates?: CityCandidate[];
  list: StoreDiscoveryListItem[];
  mapPins: StoreDiscoveryMapPin[];
  onlineFallback: StoreDiscoveryListItem[];
  counts: {
    totalList: number;
    localWithinRadius: number;
    localOutsideRadius: number;
    onlineFallback: number;
    mapPins: number;
  };
};

export type CityBrowseCard = CityCandidate & {
  specialties: string[];
  exampleShops: { id: string; name: string; handle: string }[];
};

/** Static beta seed centers when backend geocoding is not available. */
const ZIP_CENTER_SEED: Record<string, GeoPoint & { label: string }> = {
  "78701": { lat: 30.2711286, lng: -97.7436995, label: "78701 · Austin, TX" },
  "78702": { lat: 30.2607, lng: -97.7144, label: "78702 · Austin, TX" },
  "78704": { lat: 30.243, lng: -97.7697, label: "78704 · Austin, TX" },
  "97205": { lat: 45.5202471, lng: -122.674194, label: "97205 · Portland, OR" },
  "97209": { lat: 45.5301, lng: -122.685, label: "97209 · Portland, OR" },
  "97214": { lat: 45.514, lng: -122.644, label: "97214 · Portland, OR" },
  "10001": { lat: 40.7506, lng: -73.9971, label: "10001 · New York, NY" },
  "94102": { lat: 37.7793, lng: -122.4193, label: "94102 · San Francisco, CA" },
  "60601": { lat: 41.8857, lng: -87.6225, label: "60601 · Chicago, IL" },
  "02108": { lat: 42.3588, lng: -71.0707, label: "02108 · Boston, MA" },
  "98101": { lat: 47.6101, lng: -122.3344, label: "98101 · Seattle, WA" },
  "80202": { lat: 39.7525, lng: -104.9995, label: "80202 · Denver, CO" },
  "33131": { lat: 25.765, lng: -80.19, label: "33131 · Miami, FL" },
  "75201": { lat: 32.787, lng: -96.799, label: "75201 · Dallas, TX" },
  "85004": { lat: 33.451, lng: -112.07, label: "85004 · Phoenix, AZ" },
  "04101": { lat: 43.6591, lng: -70.2568, label: "04101 · Portland, ME" },
};

const CITY_CENTER_SEED: Record<string, GeoPoint> = {
  "austin|tx|us": { lat: 30.2672, lng: -97.7431 },
  "portland|or|us": { lat: 45.5152, lng: -122.6784 },
  "portland|me|us": { lat: 43.6591, lng: -70.2568 },
  "new york|ny|us": { lat: 40.7128, lng: -74.006 },
  "san francisco|ca|us": { lat: 37.7749, lng: -122.4194 },
  "chicago|il|us": { lat: 41.8781, lng: -87.6298 },
  "seattle|wa|us": { lat: 47.6062, lng: -122.3321 },
  "denver|co|us": { lat: 39.7392, lng: -104.9903 },
  "miami|fl|us": { lat: 25.7617, lng: -80.1918 },
  "dallas|tx|us": { lat: 32.7767, lng: -96.797 },
  "phoenix|az|us": { lat: 33.4484, lng: -112.074 },
  "boston|ma|us": { lat: 42.3601, lng: -71.0589 },
};

export function clampDiscoveryRadius(value?: number | null): DiscoveryRadiusMiles {
  if (value === 100 || value === 150) return value;
  return 60;
}

export function cityKey(city: string, region = "", country = "US"): string {
  return [city.trim().toLowerCase(), region.trim().toLowerCase(), (country || "US").trim().toLowerCase()].join("|");
}

export function titleCaseCity(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function formatCityLabel(city: string, region?: string, country?: string): string {
  const c = titleCaseCity(city);
  const r = (region ?? "").trim().toUpperCase();
  if (c && r) return `${c}, ${r}`;
  if (c) return c;
  if (r) return r;
  return (country ?? "US").toUpperCase();
}

function onlineScore(store: Store): number {
  return (store.projectCount ?? 0) * 10 + (store.shipsNationwide ? 5 : 0) + (store.products?.length ?? 0);
}

function toListItem(store: RankedStore, rank: "nearby" | "online" | "far"): StoreDiscoveryListItem {
  return {
    ...store,
    proximityRank: rank,
    detailUrl: `/stores/${store.handle}`,
  };
}

function pinsFromList(items: StoreDiscoveryListItem[]): StoreDiscoveryMapPin[] {
  return items
    .filter((store) => store.latitude != null && store.longitude != null && Number.isFinite(store.latitude) && Number.isFinite(store.longitude))
    .map((store) => ({
      storeId: store.id,
      handle: store.handle,
      name: store.name,
      lat: store.latitude as number,
      lng: store.longitude as number,
      proximityRank: store.proximityRank,
      distanceMiles: store.distanceMiles,
      detailUrl: store.detailUrl,
    }));
}

function sortOnline(stores: Store[]): StoreDiscoveryListItem[] {
  return [...stores]
    .filter(isOnlineOnly)
    .sort((a, b) => {
      const scoreDiff = onlineScore(b) - onlineScore(a);
      if (scoreDiff !== 0) return scoreDiff;
      return a.name.localeCompare(b.name);
    })
    .map((store) => toListItem({ ...store, distanceMiles: null, proximityRank: "online" }, "online"));
}

function emptyResponse(
  partial: Partial<StoreDiscoveryResponse> & Pick<StoreDiscoveryResponse, "query" | "status">,
): StoreDiscoveryResponse {
  return {
    message: partial.message,
    cityCandidates: partial.cityCandidates,
    list: partial.list ?? [],
    mapPins: partial.mapPins ?? [],
    onlineFallback: partial.onlineFallback ?? [],
    counts: partial.counts ?? {
      totalList: 0,
      localWithinRadius: 0,
      localOutsideRadius: 0,
      onlineFallback: 0,
      mapPins: 0,
    },
    query: partial.query,
    status: partial.status,
  };
}

function rankAroundPoint(
  stores: Store[],
  center: GeoPoint,
  radiusMiles: number,
  queryMeta: StoreDiscoveryResponse["query"],
): StoreDiscoveryResponse {
  const withDistance: StoreDiscoveryListItem[] = stores.map((store) => {
    if (isLocalCapable(store) && store.latitude != null && store.longitude != null) {
      const distanceMiles = haversineMiles(center, { lat: store.latitude, lng: store.longitude });
      const proximityRank = distanceMiles <= radiusMiles ? "nearby" : "far";
      return toListItem({ ...store, distanceMiles, proximityRank }, proximityRank);
    }
    if (isOnlineCapable(store)) {
      return toListItem({ ...store, distanceMiles: null, proximityRank: "online" }, "online");
    }
    return toListItem({ ...store, distanceMiles: null, proximityRank: "far" }, "far");
  });

  const nearby = withDistance
    .filter((store) => store.proximityRank === "nearby")
    .sort((a, b) => (a.distanceMiles ?? Number.POSITIVE_INFINITY) - (b.distanceMiles ?? Number.POSITIVE_INFINITY));

  const farLocal = withDistance.filter((store) => store.proximityRank === "far" && isLocalCapable(store));
  const onlineFallback = sortOnline(stores)
    .filter((store) => !nearby.some((near) => near.id === store.id))
    .slice(0, DISCOVERY_ONLINE_FALLBACK_CAP);
  const mapPins = pinsFromList([
    ...nearby,
    ...farLocal.filter((s) => s.distanceMiles != null && s.distanceMiles <= radiusMiles * 1.5),
  ]).slice(0, 40);

  if (nearby.length === 0) {
    return {
      query: { ...queryMeta, center, radiusMiles },
      status: "zero-local",
      message: `No local shops within ${radiusMiles} miles of ${queryMeta.displayLabel}`,
      list: [],
      mapPins: pinsFromList(farLocal).slice(0, 12),
      onlineFallback,
      counts: {
        totalList: 0,
        localWithinRadius: 0,
        localOutsideRadius: farLocal.length,
        onlineFallback: onlineFallback.length,
        mapPins: Math.min(12, pinsFromList(farLocal).length),
      },
    };
  }

  return {
    query: { ...queryMeta, center, radiusMiles },
    status: "ok",
    list: nearby,
    mapPins,
    onlineFallback,
    counts: {
      totalList: nearby.length,
      localWithinRadius: nearby.length,
      localOutsideRadius: farLocal.length,
      onlineFallback: onlineFallback.length,
      mapPins: mapPins.length,
    },
  };
}

/** Build city directory cards from local/hybrid shops. */
export function buildCityBrowseCards(stores: Store[]): CityBrowseCard[] {
  const groups = new Map<string, { card: CityBrowseCard; locals: Store[] }>();

  for (const store of stores) {
    if (!isLocalCapable(store)) continue;
    const city = (store.city || "").trim();
    if (!city) continue;
    const region = (store.region || "").trim();
    const country = (store.country || "US").trim() || "US";
    const key = cityKey(city, region, country);
    const existing = groups.get(key);
    if (existing) {
      existing.locals.push(store);
      continue;
    }
    const center =
      store.latitude != null && store.longitude != null
        ? { lat: store.latitude, lng: store.longitude }
        : CITY_CENTER_SEED[key];
    groups.set(key, {
      locals: [store],
      card: {
        key,
        city,
        region,
        country,
        displayLabel: formatCityLabel(city, region, country),
        center,
        shopCount: 0,
        specialties: [],
        exampleShops: [],
      },
    });
  }

  const cards: CityBrowseCard[] = [];
  for (const { card, locals } of groups.values()) {
    const specialtyCounts = new Map<string, number>();
    for (const store of locals) {
      for (const specialty of store.specialties ?? []) {
        const name = specialty.trim();
        if (!name) continue;
        specialtyCounts.set(name, (specialtyCounts.get(name) ?? 0) + 1);
      }
    }
    const specialties = [...specialtyCounts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 3)
      .map(([name]) => name);

    // Prefer centroid of shops with coords when multiple
    const withCoords = locals.filter((s) => s.latitude != null && s.longitude != null);
    let center = card.center;
    if (withCoords.length) {
      center = {
        lat: withCoords.reduce((sum, s) => sum + (s.latitude as number), 0) / withCoords.length,
        lng: withCoords.reduce((sum, s) => sum + (s.longitude as number), 0) / withCoords.length,
      };
    }

    cards.push({
      ...card,
      center,
      shopCount: locals.length,
      specialties,
      exampleShops: locals
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 2)
        .map((s) => ({ id: s.id, name: s.name, handle: s.handle })),
    });
  }

  return cards.sort((a, b) => {
    const countDiff = (b.shopCount ?? 0) - (a.shopCount ?? 0);
    if (countDiff !== 0) return countDiff;
    return a.displayLabel.localeCompare(b.displayLabel);
  });
}

function resolveZipCenter(zip: string, stores: Store[]): { center: GeoPoint; label: string } | null {
  const seed = ZIP_CENTER_SEED[zip];
  if (seed) return { center: { lat: seed.lat, lng: seed.lng }, label: seed.label };

  const matches = stores.filter(
    (store) => isLocalCapable(store) && (store.postalCode || "").trim() === zip && store.latitude != null && store.longitude != null,
  );
  if (matches.length) {
    const center = {
      lat: matches.reduce((sum, s) => sum + (s.latitude as number), 0) / matches.length,
      lng: matches.reduce((sum, s) => sum + (s.longitude as number), 0) / matches.length,
    };
    const sample = matches[0];
    const place = formatCityLabel(sample.city, sample.region, sample.country);
    return { center, label: place ? `${zip} · ${place}` : zip };
  }

  // 3-digit prefix fallback against known seeds / store postal prefixes
  const prefix = zip.slice(0, 3);
  const prefixSeed = Object.entries(ZIP_CENTER_SEED).find(([code]) => code.startsWith(prefix));
  if (prefixSeed) {
    const [, point] = prefixSeed;
    return { center: { lat: point.lat, lng: point.lng }, label: `${zip} (near ${point.label})` };
  }

  const prefixStores = stores.filter(
    (store) =>
      isLocalCapable(store) &&
      (store.postalCode || "").trim().startsWith(prefix) &&
      store.latitude != null &&
      store.longitude != null,
  );
  if (prefixStores.length) {
    const center = {
      lat: prefixStores.reduce((sum, s) => sum + (s.latitude as number), 0) / prefixStores.length,
      lng: prefixStores.reduce((sum, s) => sum + (s.longitude as number), 0) / prefixStores.length,
    };
    return { center, label: zip };
  }

  return null;
}

function cityCandidatesFromStores(city: string, region: string | undefined, country: string | undefined, stores: Store[]): CityCandidate[] {
  const cityNorm = city.trim().toLowerCase();
  const regionNorm = (region ?? "").trim().toLowerCase();
  const countryNorm = (country ?? "US").trim().toLowerCase() || "us";
  const cards = buildCityBrowseCards(stores);
  let matches = cards.filter((card) => card.city.trim().toLowerCase() === cityNorm);

  if (regionNorm) {
    matches = matches.filter((card) => card.region.trim().toLowerCase() === regionNorm);
  }
  if (countryNorm) {
    matches = matches.filter((card) => (card.country || "US").trim().toLowerCase() === countryNorm);
  }

  // Seed-only cities (no shops yet) still useful for radius search
  if (!matches.length && !regionNorm) {
    const seedMatches = Object.entries(CITY_CENTER_SEED)
      .filter(([key]) => key.startsWith(`${cityNorm}|`))
      .map(([key, center]) => {
        const [c, r, co] = key.split("|");
        return {
          key,
          city: titleCaseCity(c),
          region: (r || "").toUpperCase(),
          country: (co || "US").toUpperCase(),
          displayLabel: formatCityLabel(c, r, co),
          center,
          shopCount: 0,
        } satisfies CityCandidate;
      });
    if (seedMatches.length) return seedMatches;
  }

  if (!matches.length && regionNorm) {
    const seedKey = cityKey(cityNorm, regionNorm, countryNorm);
    const seed = CITY_CENTER_SEED[seedKey];
    if (seed) {
      return [
        {
          key: seedKey,
          city: titleCaseCity(city),
          region: regionNorm.toUpperCase(),
          country: countryNorm.toUpperCase(),
          displayLabel: formatCityLabel(city, regionNorm, countryNorm),
          center: seed,
          shopCount: 0,
        },
      ];
    }
  }

  return matches.map((card) => ({
    key: card.key,
    city: card.city,
    region: card.region,
    country: card.country,
    displayLabel: card.displayLabel,
    center: card.center,
    shopCount: card.shopCount,
  }));
}

function browseDefault(stores: Store[]): StoreDiscoveryResponse {
  // City-first browse: do not dump every national shop as a card/pin.
  // Guests pick a city, ZIP, or Use my location for a focused list.
  const localCount = stores.filter(isLocalCapable).length;
  const onlineFallback = sortOnline(stores).slice(0, DISCOVERY_ONLINE_FALLBACK_CAP);

  return {
    query: {
      mode: "browse",
      displayLabel: "All shops",
      radiusMiles: LOCAL_DRIVING_RADIUS_MILES,
    },
    status: localCount || onlineFallback.length ? "ok" : "zero-local",
    message:
      localCount > 0
        ? `Browse ${localCount} local shops by city, or search a ZIP near you.`
        : onlineFallback.length
          ? "Browse online shops, or search a city when local listings land."
          : "No shops yet",
    list: [],
    mapPins: [],
    onlineFallback,
    counts: {
      totalList: 0,
      localWithinRadius: localCount,
      localOutsideRadius: 0,
      onlineFallback: onlineFallback.length,
      mapPins: 0,
    },
  };
}

/**
 * Client-side local discovery against the V4 response contract.
 * Replace internals with search_stores RPC when backend geocoding lands.
 */
export function searchStoreDiscovery(stores: Store[], input: StoreDiscoveryInput): StoreDiscoveryResponse {
  const radiusMiles = clampDiscoveryRadius("radiusMiles" in input ? input.radiusMiles : undefined);

  if (input.mode === "browse") {
    if (input.cityKey) {
      const [city = "", region = "", country = "US"] = input.cityKey.split("|");
      return searchStoreDiscovery(stores, {
        mode: "city",
        city,
        region,
        country,
        radiusMiles,
      });
    }
    return browseDefault(stores);
  }

  if (input.mode === "zip") {
    const zipMatch = input.zip.trim().match(/^(\d{5})(?:-?\d{4})?$/);
    if (!zipMatch) {
      return emptyResponse({
        status: "invalid-input",
        message: "Enter a 5-digit ZIP, or try a city like Austin, TX.",
        query: { mode: "zip", displayLabel: input.zip.trim(), zip: input.zip.trim(), radiusMiles },
        onlineFallback: sortOnline(stores),
      });
    }
    const zip = zipMatch[1];
    const resolved = resolveZipCenter(zip, stores);
    if (!resolved) {
      return emptyResponse({
        status: "geocode-unavailable",
        message: "We couldn't place that search on the map",
        query: { mode: "zip", displayLabel: zip, zip, radiusMiles },
        onlineFallback: sortOnline(stores),
        counts: {
          totalList: 0,
          localWithinRadius: 0,
          localOutsideRadius: 0,
          onlineFallback: sortOnline(stores).length,
          mapPins: 0,
        },
      });
    }
    return rankAroundPoint(stores, resolved.center, radiusMiles, {
      mode: "zip",
      displayLabel: resolved.label,
      zip,
      center: resolved.center,
      radiusMiles,
    });
  }

  if (input.mode === "city") {
    const city = input.city.trim();
    if (!city) {
      return emptyResponse({
        status: "invalid-input",
        message: "Enter a 5-digit ZIP, or try a city like Austin, TX.",
        query: { mode: "city", displayLabel: "", radiusMiles },
        onlineFallback: sortOnline(stores),
      });
    }
    const candidates = cityCandidatesFromStores(city, input.region, input.country, stores);
    if (!candidates.length) {
      return emptyResponse({
        status: "geocode-unavailable",
        message: "We couldn't place that search on the map",
        query: {
          mode: "city",
          displayLabel: formatCityLabel(city, input.region, input.country),
          city,
          region: input.region,
          country: input.country ?? "US",
          radiusMiles,
        },
        onlineFallback: sortOnline(stores),
        counts: {
          totalList: 0,
          localWithinRadius: 0,
          localOutsideRadius: 0,
          onlineFallback: sortOnline(stores).length,
          mapPins: 0,
        },
      });
    }
    if (candidates.length > 1 && !(input.region && input.region.trim())) {
      return emptyResponse({
        status: "ambiguous-city",
        message: `Which ${titleCaseCity(city)} did you mean?`,
        cityCandidates: candidates,
        query: {
          mode: "city",
          displayLabel: titleCaseCity(city),
          city,
          country: input.country ?? "US",
          radiusMiles,
        },
        onlineFallback: sortOnline(stores),
        counts: {
          totalList: 0,
          localWithinRadius: 0,
          localOutsideRadius: 0,
          onlineFallback: sortOnline(stores).length,
          mapPins: 0,
        },
      });
    }

    const chosen = candidates[0];
    const center = chosen.center;
    if (!center) {
      // Directory match without coords — filter by city fields
      const locals = stores
        .filter(
          (store) =>
            isLocalCapable(store) &&
            (store.city || "").trim().toLowerCase() === chosen.city.trim().toLowerCase() &&
            (!chosen.region || (store.region || "").trim().toLowerCase() === chosen.region.trim().toLowerCase()),
        )
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((store) => toListItem({ ...store, distanceMiles: null, proximityRank: "nearby" }, "nearby"));
      const onlineFallback = sortOnline(stores).filter((s) => !locals.some((l) => l.id === s.id));
      return {
        query: {
          mode: "city",
          displayLabel: chosen.displayLabel,
          city: chosen.city,
          region: chosen.region,
          country: chosen.country,
          radiusMiles,
        },
        status: locals.length ? "ok" : "zero-local",
        message: locals.length ? undefined : `No shops listed in ${chosen.displayLabel} yet`,
        list: locals,
        mapPins: pinsFromList(locals),
        onlineFallback,
        counts: {
          totalList: locals.length,
          localWithinRadius: locals.length,
          localOutsideRadius: 0,
          onlineFallback: onlineFallback.length,
          mapPins: pinsFromList(locals).length,
        },
      };
    }

    return rankAroundPoint(stores, center, radiusMiles, {
      mode: "city",
      displayLabel: chosen.displayLabel,
      city: chosen.city,
      region: chosen.region,
      country: chosen.country,
      center,
      radiusMiles,
    });
  }

  // point mode
  const { lat, lng, source } = input;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return emptyResponse({
      status: "invalid-input",
      message: "That location looks invalid. Try a ZIP or city instead.",
      query: {
        mode: "point",
        displayLabel: "your location",
        radiusMiles,
        source,
      },
      onlineFallback: sortOnline(stores),
    });
  }

  return rankAroundPoint(stores, { lat, lng }, radiusMiles, {
    mode: "point",
    displayLabel: input.displayLabel || "your location",
    center: { lat, lng },
    radiusMiles,
    source,
  });
}

/** Parse a free-text "ZIP or city" field into a discovery input (without executing). */
export function parseDiscoverySearchText(raw: string):
  | { ok: true; input: Extract<StoreDiscoveryInput, { mode: "zip" | "city" }> }
  | { ok: false; message: string } {
  const text = raw.trim();
  if (!text) return { ok: false, message: "Enter a 5-digit ZIP, or try a city like Austin, TX." };

  if (/^\d{5}(?:-?\d{4})?$/.test(text)) {
    return { ok: true, input: { mode: "zip", zip: text } };
  }

  // Reject pure non-zip numeric garbage
  if (/^\d+$/.test(text)) {
    return { ok: false, message: "Enter a 5-digit ZIP, or try a city like Austin, TX." };
  }

  let city = text;
  let region = "";
  if (text.includes(",")) {
    const [left, ...rest] = text.split(",");
    city = (left ?? "").trim();
    region = rest.join(",").trim();
  }

  if (!city) return { ok: false, message: "Enter a 5-digit ZIP, or try a city like Austin, TX." };

  return {
    ok: true,
    input: {
      mode: "city",
      city,
      region: region || undefined,
      country: "US",
    },
  };
}

export function nextExpandRadius(current: number): DiscoveryRadiusMiles | null {
  const clamped = clampDiscoveryRadius(current);
  if (clamped === 60) return 100;
  if (clamped === 100) return 150;
  return null;
}

export { formatDistanceMiles };

export function storeTypeLabel(storeType: Store["storeType"]): string {
  if (storeType === "local") return "Local";
  if (storeType === "both") return "Local + ships";
  return "Online";
}
