import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GeoPoint } from "../lib/geo";
import { formatDistanceMiles, type StoreDiscoveryMapPin } from "../lib/storeDiscovery";

const OSM_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>';

export type MapPinFilter = "all" | "nearby" | "local" | "online";

export type MapCluster = {
  id: string;
  lat: number;
  lng: number;
  count: number;
  pins: StoreDiscoveryMapPin[];
};

/** Grid cell size in degrees — larger cells at lower zoom (more clustering). */
export function clusterCellSizeDegrees(zoom: number): number {
  if (zoom >= 13) return 0; // no clustering
  if (zoom >= 11) return 0.04;
  if (zoom >= 9) return 0.12;
  if (zoom >= 7) return 0.35;
  return 0.9;
}

/** Pure clustering for tests + map render. */
export function clusterMapPins(pins: StoreDiscoveryMapPin[], zoom: number): Array<StoreDiscoveryMapPin | MapCluster> {
  const cell = clusterCellSizeDegrees(zoom);
  if (cell <= 0 || pins.length <= 1) return pins;

  const buckets = new Map<string, StoreDiscoveryMapPin[]>();
  for (const pin of pins) {
    if (!Number.isFinite(pin.lat) || !Number.isFinite(pin.lng)) continue;
    const key = `${Math.floor(pin.lat / cell)}:${Math.floor(pin.lng / cell)}`;
    const list = buckets.get(key) ?? [];
    list.push(pin);
    buckets.set(key, list);
  }

  const out: Array<StoreDiscoveryMapPin | MapCluster> = [];
  for (const [key, group] of buckets) {
    if (group.length === 1) {
      out.push(group[0]);
      continue;
    }
    const lat = group.reduce((s, p) => s + p.lat, 0) / group.length;
    const lng = group.reduce((s, p) => s + p.lng, 0) / group.length;
    out.push({ id: `c:${key}`, lat, lng, count: group.length, pins: group });
  }
  return out;
}

export function filterMapPins(pins: StoreDiscoveryMapPin[], filter: MapPinFilter): StoreDiscoveryMapPin[] {
  if (filter === "all") return pins;
  if (filter === "nearby") return pins.filter((p) => p.proximityRank === "nearby");
  if (filter === "local") return pins.filter((p) => p.proximityRank === "nearby" || p.proximityRank === "far");
  return pins.filter((p) => p.proximityRank === "online");
}

function isCluster(item: StoreDiscoveryMapPin | MapCluster): item is MapCluster {
  return "count" in item && "pins" in item;
}

function pinDivIcon(selected: boolean, rank?: StoreDiscoveryMapPin["proximityRank"]) {
  const rankClass = rank ? ` rank-${rank}` : "";
  return L.divIcon({
    className: `np-leaflet-pin${selected ? " is-selected" : ""}${rankClass}`,
    html: `<span class="np-leaflet-pin-dot" aria-hidden="true"></span>`,
    iconSize: [22, 28],
    iconAnchor: [11, 26],
    popupAnchor: [0, -22],
  });
}

function clusterDivIcon(count: number) {
  const size = count >= 20 ? 44 : count >= 8 ? 38 : 32;
  return L.divIcon({
    className: "np-leaflet-cluster",
    html: `<span class="np-leaflet-cluster-dot" aria-hidden="true">${count}</span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const centerDivIcon = L.divIcon({
  className: "np-leaflet-center",
  html: `<span class="np-leaflet-center-dot" aria-hidden="true"></span>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

/**
 * Real basemap (OpenStreetMap tiles via Leaflet) with shop pins,
 * zoom-based clusters, and proximity filters.
 */
export function StorePinMap({
  pins,
  selectedId,
  onSelect,
  center,
  label,
}: {
  pins: StoreDiscoveryMapPin[];
  selectedId: string | null;
  onSelect: (pin: StoreDiscoveryMapPin) => void;
  center?: GeoPoint;
  label: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const centerMarkerRef = useRef<L.Marker | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const [filter, setFilter] = useState<MapPinFilter>("all");
  const [zoom, setZoom] = useState(10);

  const filteredPins = useMemo(() => filterMapPins(pins, filter), [pins, filter]);
  const clustered = useMemo(() => clusterMapPins(filteredPins, zoom), [filteredPins, zoom]);

  const boundsKey = useMemo(
    () =>
      filteredPins
        .map((p) => `${p.storeId}:${p.lat.toFixed(5)},${p.lng.toFixed(5)}`)
        .sort()
        .join("|") +
      `|f:${filter}` +
      (center ? `|c:${center.lat.toFixed(5)},${center.lng.toFixed(5)}` : ""),
    [filteredPins, filter, center],
  );

  const filterCounts = useMemo(() => {
    return {
      all: pins.length,
      nearby: pins.filter((p) => p.proximityRank === "nearby").length,
      local: pins.filter((p) => p.proximityRank === "nearby" || p.proximityRank === "far").length,
      online: pins.filter((p) => p.proximityRank === "online").length,
    };
  }, [pins]);

  // Create map once
  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const map = L.map(el, {
      scrollWheelZoom: false,
      attributionControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: OSM_ATTR,
      maxZoom: 19,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setZoom(map.getZoom());

    const onZoom = () => setZoom(map.getZoom());
    map.on("zoomend", onZoom);

    const onResize = () => map.invalidateSize();
    window.addEventListener("resize", onResize);
    const t = window.setTimeout(() => map.invalidateSize(), 50);

    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", onResize);
      map.off("zoomend", onZoom);
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      markersRef.current.clear();
      centerMarkerRef.current = null;
    };
  }, []);

  // Fit bounds when pin set / filter changes (not on every zoom cluster recompute)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const latLngs: L.LatLngExpression[] = [];
    for (const pin of filteredPins) {
      if (!Number.isFinite(pin.lat) || !Number.isFinite(pin.lng)) continue;
      latLngs.push([pin.lat, pin.lng]);
    }
    if (center && Number.isFinite(center.lat) && Number.isFinite(center.lng)) {
      latLngs.push([center.lat, center.lng]);
    }

    if (latLngs.length === 1) {
      map.setView(latLngs[0], Math.max(map.getZoom(), 11));
    } else if (latLngs.length > 1) {
      const b = L.latLngBounds(latLngs);
      map.fitBounds(b.pad(0.18), { maxZoom: 13, animate: false });
    } else {
      map.setView([39.5, -98.35], 3);
    }
    setZoom(map.getZoom());
    window.setTimeout(() => map.invalidateSize(), 30);
  }, [boundsKey, filteredPins, center]);

  // Draw markers / clusters
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    markersRef.current.clear();

    if (centerMarkerRef.current) {
      centerMarkerRef.current.remove();
      centerMarkerRef.current = null;
    }
    if (center && Number.isFinite(center.lat) && Number.isFinite(center.lng)) {
      const cm = L.marker([center.lat, center.lng], {
        icon: centerDivIcon,
        interactive: false,
        keyboard: false,
      });
      cm.bindTooltip("Search center", { direction: "top", offset: [0, -10] });
      cm.addTo(layer);
      centerMarkerRef.current = cm;
    }

    for (const item of clustered) {
      if (isCluster(item)) {
        const marker = L.marker([item.lat, item.lng], {
          icon: clusterDivIcon(item.count),
          title: `${item.count} shops`,
          keyboard: true,
        });
        marker.bindTooltip(`${item.count} shops — tap to zoom`, { direction: "top", offset: [0, -8] });
        marker.on("click", () => {
          const b = L.latLngBounds(item.pins.map((p) => [p.lat, p.lng] as L.LatLngTuple));
          map.fitBounds(b.pad(0.35), { maxZoom: 14, animate: true });
        });
        marker.addTo(layer);
        continue;
      }

      const pin = item;
      const marker = L.marker([pin.lat, pin.lng], {
        icon: pinDivIcon(pin.storeId === selectedId, pin.proximityRank),
        title: pin.name,
        keyboard: true,
      });
      const miles = pin.distanceMiles != null ? ` · ${formatDistanceMiles(pin.distanceMiles)}` : "";
      const rankLabel =
        pin.proximityRank === "nearby" ? "Nearby" : pin.proximityRank === "far" ? "Local" : "Online";
      marker.bindTooltip(`${pin.name}${miles} · ${rankLabel}`, { direction: "top", offset: [0, -18] });
      marker.on("click", () => onSelectRef.current(pin));
      marker.addTo(layer);
      markersRef.current.set(pin.storeId, marker);
    }
  }, [clustered, selectedId, center]);

  // Selection styling
  useEffect(() => {
    for (const [id, marker] of markersRef.current) {
      const pin = filteredPins.find((p) => p.storeId === id);
      marker.setIcon(pinDivIcon(id === selectedId, pin?.proximityRank));
      marker.setZIndexOffset(id === selectedId ? 500 : 0);
    }
  }, [selectedId, filteredPins]);

  const filters: { id: MapPinFilter; label: string; count: number }[] = [
    { id: "all", label: "All", count: filterCounts.all },
    { id: "nearby", label: "Nearby", count: filterCounts.nearby },
    { id: "local", label: "Local", count: filterCounts.local },
    { id: "online", label: "Online", count: filterCounts.online },
  ];

  return (
    <section className="store-pin-map panel" aria-label={`Map of shops near ${label}`} data-testid="store-pin-map">
      <div className="store-pin-map-header">
        <strong>Map</strong>
        <span>
          {filteredPins.length} pin{filteredPins.length === 1 ? "" : "s"}
          {clustered.some(isCluster) ? " · clustered" : ""}
        </span>
      </div>

      <div className="store-map-filters" role="toolbar" aria-label="Filter map pins">
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            className={filter === item.id ? "secondary selected" : "secondary"}
            aria-pressed={filter === item.id}
            disabled={item.count === 0 && item.id !== "all"}
            onClick={() => setFilter(item.id)}
            data-testid={`map-filter-${item.id}`}
          >
            {item.label}
            <span className="store-map-filter-count">{item.count}</span>
          </button>
        ))}
      </div>

      <div className="store-pin-map-leaflet-wrap">
        <div ref={containerRef} className="store-pin-map-leaflet" role="application" aria-label="Interactive shop map" />
      </div>
      <p className="store-pin-map-hint">
        Tap a pin to highlight the shop card. Zoom out to cluster pins; tap a cluster to zoom in. Streets from
        OpenStreetMap.
      </p>
      {filteredPins.length === 0 ? (
        <p className="store-map-note" role="status">
          No pins match this map filter. Try All or another filter.
        </p>
      ) : null}
    </section>
  );
}
