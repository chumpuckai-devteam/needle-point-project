import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GeoPoint } from "../lib/geo";
import { formatDistanceMiles, type StoreDiscoveryMapPin } from "../lib/storeDiscovery";

const OSM_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>';

function pinDivIcon(selected: boolean) {
  return L.divIcon({
    className: `np-leaflet-pin${selected ? " is-selected" : ""}`,
    html: `<span class="np-leaflet-pin-dot" aria-hidden="true"></span>`,
    iconSize: [22, 28],
    iconAnchor: [11, 26],
    popupAnchor: [0, -22],
  });
}

const centerDivIcon = L.divIcon({
  className: "np-leaflet-center",
  html: `<span class="np-leaflet-center-dot" aria-hidden="true"></span>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

/**
 * Real basemap (OpenStreetMap tiles via Leaflet) with shop pins.
 * Replaces the old schematic grid that only showed floating pins.
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
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const centerMarkerRef = useRef<L.Marker | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const boundsKey = useMemo(
    () =>
      pins
        .map((p) => `${p.storeId}:${p.lat.toFixed(5)},${p.lng.toFixed(5)}`)
        .sort()
        .join("|") + (center ? `|c:${center.lat.toFixed(5)},${center.lng.toFixed(5)}` : ""),
    [pins, center],
  );

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
    mapRef.current = map;

    const onResize = () => map.invalidateSize();
    window.addEventListener("resize", onResize);
    // Leaflet needs a tick after layout
    const t = window.setTimeout(() => map.invalidateSize(), 50);

    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", onResize);
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
      centerMarkerRef.current = null;
    };
  }, []);

  // Sync pins + fit bounds
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // clear old shop markers
    for (const marker of markersRef.current.values()) {
      marker.remove();
    }
    markersRef.current.clear();

    const latLngs: L.LatLngExpression[] = [];

    for (const pin of pins) {
      if (!Number.isFinite(pin.lat) || !Number.isFinite(pin.lng)) continue;
      const ll: L.LatLngExpression = [pin.lat, pin.lng];
      latLngs.push(ll);
      const marker = L.marker(ll, {
        icon: pinDivIcon(false),
        title: pin.name,
        keyboard: true,
      });
      const miles =
        pin.distanceMiles != null ? ` · ${formatDistanceMiles(pin.distanceMiles)}` : "";
      marker.bindTooltip(`${pin.name}${miles}`, { direction: "top", offset: [0, -18] });
      marker.on("click", () => onSelectRef.current(pin));
      marker.addTo(map);
      markersRef.current.set(pin.storeId, marker);
    }

    if (centerMarkerRef.current) {
      centerMarkerRef.current.remove();
      centerMarkerRef.current = null;
    }
    if (center && Number.isFinite(center.lat) && Number.isFinite(center.lng)) {
      const cll: L.LatLngExpression = [center.lat, center.lng];
      latLngs.push(cll);
      const cm = L.marker(cll, { icon: centerDivIcon, interactive: false, keyboard: false });
      cm.bindTooltip("Search center", { direction: "top", offset: [0, -10] });
      cm.addTo(map);
      centerMarkerRef.current = cm;
    }

    if (latLngs.length === 1) {
      map.setView(latLngs[0], 12);
    } else if (latLngs.length > 1) {
      const b = L.latLngBounds(latLngs);
      map.fitBounds(b.pad(0.18), { maxZoom: 13, animate: false });
    } else {
      map.setView([39.5, -98.35], 3);
    }

    window.setTimeout(() => map.invalidateSize(), 30);
  }, [boundsKey, pins, center]);

  // Update selected icon styling without full rebuild when only selection changes
  useEffect(() => {
    for (const [id, marker] of markersRef.current) {
      marker.setIcon(pinDivIcon(id === selectedId));
      if (id === selectedId) {
        marker.setZIndexOffset(500);
      } else {
        marker.setZIndexOffset(0);
      }
    }
  }, [selectedId]);

  return (
    <section className="store-pin-map panel" aria-label={`Map of shops near ${label}`}>
      <div className="store-pin-map-header">
        <strong>Map</strong>
        <span>
          {pins.length} pin{pins.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="store-pin-map-leaflet-wrap">
        <div ref={containerRef} className="store-pin-map-leaflet" role="application" aria-label="Interactive shop map" />
      </div>
      <p className="store-pin-map-hint">
        Tap a pin to highlight the matching shop card. Streets from OpenStreetMap.
      </p>
    </section>
  );
}
