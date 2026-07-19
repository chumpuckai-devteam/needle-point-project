import { FormEvent, useCallback, useEffect, useId, useMemo, useRef, useState, type MutableRefObject } from "react";
import { useSearchParams } from "react-router-dom";
import { MapPin, Navigation, Search } from "lucide-react";
import type { Store } from "../types";
import type { View } from "../appModel";
import {
  isGeolocationSupported,
  isLocationRequestError,
  queryGeolocationPermission,
  requestBrowserLocation,
  type GeoPoint,
  type LocationRequestErrorKind,
} from "../lib/geo";
import {
  buildCityBrowseCards,
  clampDiscoveryRadius,
  formatDistanceMiles,
  nextExpandRadius,
  parseDiscoverySearchText,
  searchStoreDiscovery,
  storeTypeLabel,
  type CityCandidate,
  type DiscoveryRadiusMiles,
  type StoreDiscoveryListItem,
  type StoreDiscoveryMapPin,
  type StoreDiscoveryResponse,
} from "../lib/storeDiscovery";
import { EmptyState, SectionHeader, SectionTitle } from "../components/ui";

type LocationUiStatus = "idle" | "loading" | "ready" | "denied" | "error" | "unsupported";

/** Near You surface states from docs/near-you-location-empty-states.md */
type NearYouCoachState =
  | "permission_not_asked"
  | "requesting_location"
  | "location_ready_nearby"
  | "location_ready_empty_nearby"
  | "location_denied_first_time"
  | "location_denied_persistent"
  | "location_unavailable_timeout"
  | "location_unavailable_unsupported";

const ONLINE_HEADING_ID = "online-shops-heading";

type CoachAction =
  | "use_location"
  | "retry_location"
  | "settings_retry"
  | "refresh_location"
  | "browse_online"
  | "browse_all"
  | "browse_search"
  | "noop";

type CoachModel = {
  headline: string;
  body: string;
  helper?: string;
  primary?: { label: string; action: CoachAction };
  secondary?: { label: string; action: CoachAction };
  tertiary?: { label: string; action: CoachAction };
  helpToggle?: boolean;
  loadingPrimary?: boolean;
};

function buildCoachModel(
  state: NearYouCoachState,
  opts: { nearbyCount: number; radius: number; hasOnline: boolean; helpOpen: boolean },
): CoachModel {
  const { nearbyCount, radius, hasOnline, helpOpen } = opts;
  /** Spec: hide online CTA when no online-capable shops exist. */
  const onlineCta = hasOnline
    ? ({ label: "Browse online shops", action: "browse_online" } as const)
    : undefined;
  const allShopsCta = { label: "Browse all shops", action: "browse_all" } as const;
  const recoverySecondary = onlineCta ?? allShopsCta;

  switch (state) {
    case "permission_not_asked":
      return {
        headline: "Want shops near you?",
        body: "Share your location to sort local needlepoint shops within 60 miles. You can keep browsing by city or online shops without sharing.",
        helper: "Location is only used for this search and is not shown on your profile.",
        primary: { label: "Use my location", action: "use_location" },
        secondary: recoverySecondary,
      };
    case "requesting_location":
      return {
        headline: "Finding shops near you…",
        body: "Checking for local needlepoint shops within 60 miles. Online shops are still available below.",
        primary: { label: "Locating…", action: "noop" },
        secondary: recoverySecondary,
        loadingPrimary: true,
      };
    case "location_ready_nearby":
      return {
        headline: nearbyCount === 1 ? `1 shop within ${radius} mi` : `${nearbyCount} shops within ${radius} mi`,
        body: "Sorted by distance from your location. You can refresh location or browse online shops that ship.",
        primary: { label: "Refresh location", action: "refresh_location" },
        secondary: recoverySecondary,
      };
    case "location_ready_empty_nearby":
      return {
        headline: `No local shops within ${radius} mi`,
        body: hasOnline
          ? "We couldn't find a local needlepoint shop close by yet. Here are online shops that ship so you can keep stitching."
          : "We couldn't find a nearby local shop, and online shop profiles are not available yet. Try browsing all shops or check back soon.",
        primary: hasOnline
          ? { label: "Browse online shops", action: "browse_online" }
          : allShopsCta,
        secondary: hasOnline ? allShopsCta : { label: "Refresh location", action: "refresh_location" },
        tertiary: hasOnline ? { label: "Refresh location", action: "refresh_location" } : undefined,
      };
    case "location_denied_first_time":
      return {
        headline: "Location is off for Needlepoint",
        body: "No worries — you can try again, or browse online shops that ship without sharing location.",
        primary: { label: "Try location again", action: "retry_location" },
        secondary: recoverySecondary,
        helpToggle: true,
        helper: helpOpen
          ? "If your browser asks again, choose Allow. If it does not ask, use the site settings in your browser to allow Location for Needlepoint."
          : undefined,
      };
    case "location_denied_persistent":
      return {
        headline: "Location is blocked in your browser",
        body: "Your browser is not allowing Needlepoint to check nearby shops. You can change site settings, then come back and try again.",
        primary: recoverySecondary,
        secondary: { label: "I changed settings — try again", action: "settings_retry" },
        helper:
          "Look for the lock or site settings icon in your browser. On iPhone or Android, open browser settings, allow Location for Needlepoint, then return here.",
      };
    case "location_unavailable_timeout":
      return {
        headline: "We couldn't get your location",
        body: "The request timed out or your device could not share location. Try again, or browse online shops that ship.",
        primary: { label: "Try again", action: "retry_location" },
        secondary: recoverySecondary,
      };
    case "location_unavailable_unsupported":
      return {
        headline: "Location is not available here",
        body: "This browser or device cannot share location with Needlepoint. You can still browse by city or shop online.",
        primary: recoverySecondary,
        secondary: allShopsCta,
      };
    default:
      return {
        headline: "Want shops near you?",
        body: "Share your location to sort local needlepoint shops within 60 miles.",
        primary: { label: "Use my location", action: "use_location" },
        secondary: recoverySecondary,
      };
  }
}

export function StoresView({ stores, setView }: { stores: Store[]; setView: (view: View) => void }) {
  const searchFieldId = useId();
  const resultsHeadingId = useId();
  const onlineSectionRef = useRef<HTMLElement | null>(null);
  const listRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(() => searchParams.get("zip") || searchParams.get("city") || "");
  const [radiusMiles, setRadiusMiles] = useState<DiscoveryRadiusMiles>(() => clampDiscoveryRadius(Number(searchParams.get("radius") || 60)));
  const [discovery, setDiscovery] = useState<StoreDiscoveryResponse>(() => searchStoreDiscovery(stores, { mode: "browse" }));
  const [searchError, setSearchError] = useState("");
  const [searchBusy, setSearchBusy] = useState(false);
  const [locationStatus, setLocationStatus] = useState<LocationUiStatus>("idle");
  const [userPoint, setUserPoint] = useState<GeoPoint | null>(null);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [cityCandidates, setCityCandidates] = useState<CityCandidate[] | null>(null);
  const [denyCount, setDenyCount] = useState(0);
  const [permissionDeniedPersistent, setPermissionDeniedPersistent] = useState(false);
  const [locationErrorKind, setLocationErrorKind] = useState<LocationRequestErrorKind | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const cityCards = useMemo(() => buildCityBrowseCards(stores), [stores]);

  // Permissions probe only — never auto-call getCurrentPosition on mount.
  useEffect(() => {
    let cancelled = false;
    if (!isGeolocationSupported()) {
      setLocationErrorKind("unsupported");
      setLocationStatus("unsupported");
      return;
    }
    void queryGeolocationPermission().then((state) => {
      if (cancelled) return;
      if (state === "denied") {
        setPermissionDeniedPersistent(true);
        setLocationErrorKind("denied");
        setLocationStatus("denied");
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const applyResponse = useCallback((response: StoreDiscoveryResponse, options?: { preservePriorOnInvalid?: boolean }) => {
    if (response.status === "invalid-input") {
      setSearchError(response.message || "Enter a ZIP or city to search.");
      if (!options?.preservePriorOnInvalid) {
        // keep prior discovery
      }
      return;
    }
    if (response.status === "ambiguous-city") {
      setCityCandidates(response.cityCandidates ?? []);
      setSearchError("");
      setDiscovery((prev) => ({
        ...prev,
        status: "ambiguous-city",
        message: response.message,
        cityCandidates: response.cityCandidates,
        query: response.query,
        onlineFallback: response.onlineFallback.length ? response.onlineFallback : prev.onlineFallback,
      }));
      return;
    }
    setCityCandidates(null);
    setSearchError("");
    setDiscovery(response);
    setSelectedPinId(null);
  }, []);

  const syncUrl = useCallback(
    (response: StoreDiscoveryResponse) => {
      const next = new URLSearchParams();
      const q = response.query;
      if (q.mode === "zip" && q.zip) {
        next.set("zip", q.zip);
      } else if (q.mode === "city") {
        if (q.city) next.set("city", q.city);
        if (q.region) next.set("region", q.region);
        if (q.country) next.set("country", q.country);
      } else if (q.mode === "point" && q.center && q.source === "location") {
        next.set("lat", String(Number(q.center.lat.toFixed(5))));
        next.set("lng", String(Number(q.center.lng.toFixed(5))));
        next.set("source", "location");
      }
      if (q.mode !== "browse" && q.radiusMiles && q.radiusMiles !== 60) {
        next.set("radius", String(q.radiusMiles));
      }
      setSearchParams(next, { replace: true });
    },
    [setSearchParams],
  );

  const runDiscovery = useCallback(
    (response: StoreDiscoveryResponse, options?: { skipUrl?: boolean }) => {
      applyResponse(response, { preservePriorOnInvalid: true });
      if (response.status !== "invalid-input" && response.status !== "ambiguous-city" && !options?.skipUrl) {
        syncUrl(response);
      }
      if (response.status === "ok" || response.status === "zero-local" || response.status === "geocode-unavailable") {
        setRadiusMiles(clampDiscoveryRadius(response.query.radiusMiles));
      }
    },
    [applyResponse, syncUrl],
  );

  // Hydrate from URL once stores are available — never request geolocation on mount.
  useEffect(() => {
    const zip = searchParams.get("zip")?.trim() || "";
    const city = searchParams.get("city")?.trim() || "";
    const region = searchParams.get("region")?.trim() || "";
    const country = searchParams.get("country")?.trim() || "US";
    const lat = Number(searchParams.get("lat"));
    const lng = Number(searchParams.get("lng"));
    const source = searchParams.get("source");
    const radius = clampDiscoveryRadius(Number(searchParams.get("radius") || 60));
    setRadiusMiles(radius);

    if (zip) {
      setSearchInput(zip);
      runDiscovery(searchStoreDiscovery(stores, { mode: "zip", zip, radiusMiles: radius }), { skipUrl: true });
      return;
    }
    if (city) {
      setSearchInput(region ? `${city}, ${region}` : city);
      runDiscovery(searchStoreDiscovery(stores, { mode: "city", city, region, country, radiusMiles: radius }), { skipUrl: true });
      return;
    }
    if (source === "location" && Number.isFinite(lat) && Number.isFinite(lng)) {
      setUserPoint({ lat, lng });
      setLocationStatus("ready");
      runDiscovery(
        searchStoreDiscovery(stores, {
          mode: "point",
          lat,
          lng,
          radiusMiles: radius,
          source: "location",
          displayLabel: "your location",
        }),
        { skipUrl: true },
      );
      return;
    }
    runDiscovery(searchStoreDiscovery(stores, { mode: "browse" }), { skipUrl: true });
    // Intentionally only when the store catalog identity changes — URL edits re-run via search actions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stores]);

  function onSearchSubmit(event: FormEvent) {
    event.preventDefault();
    setSearchBusy(true);
    setLocationStatus((status) => (status === "loading" ? status : status === "ready" && userPoint ? "ready" : "idle"));
    try {
      const parsed = parseDiscoverySearchText(searchInput);
      if (!parsed.ok) {
        setSearchError(parsed.message);
        return;
      }
      const response = searchStoreDiscovery(stores, { ...parsed.input, radiusMiles });
      if (response.status !== "invalid-input") {
        setUserPoint(null);
        setLocationStatus("idle");
      }
      runDiscovery(response);
    } finally {
      setSearchBusy(false);
    }
  }

  function onSelectCityCard(card: CityCandidate) {
    setSearchInput(card.region ? `${card.city}, ${card.region}` : card.city);
    setUserPoint(null);
    setLocationStatus("idle");
    const response = searchStoreDiscovery(stores, {
      mode: "city",
      city: card.city,
      region: card.region,
      country: card.country || "US",
      radiusMiles,
    });
    runDiscovery(response);
  }

  function onSelectCityCandidate(candidate: CityCandidate) {
    onSelectCityCard(candidate);
  }

  function clearSearch() {
    setSearchInput("");
    setSearchError("");
    setCityCandidates(null);
    setUserPoint(null);
    setLocationStatus("idle");
    setRadiusMiles(60);
    setSelectedPinId(null);
    runDiscovery(searchStoreDiscovery(stores, { mode: "browse" }));
  }

  async function requestUserLocation() {
    setLocationStatus("loading");
    setLocationErrorKind(null);
    setCityCandidates(null);
    try {
      const point = await requestBrowserLocation();
      setUserPoint(point);
      setLocationStatus("ready");
      setDenyCount(0);
      setPermissionDeniedPersistent(false);
      setHelpOpen(false);
      setLocationErrorKind(null);
      setSearchInput("");
      const response = searchStoreDiscovery(stores, {
        mode: "point",
        lat: point.lat,
        lng: point.lng,
        radiusMiles,
        source: "location",
        displayLabel: "your location",
      });
      runDiscovery(response);
    } catch (error) {
      setUserPoint(null);
      if (isLocationRequestError(error)) {
        setLocationErrorKind(error.kind);
        if (error.kind === "denied") {
          setLocationStatus("denied");
          setDenyCount((count) => {
            const next = count + 1;
            if (next >= 2) setPermissionDeniedPersistent(true);
            return next;
          });
          void queryGeolocationPermission().then((state) => {
            if (state === "denied") setPermissionDeniedPersistent(true);
          });
        } else if (error.kind === "unsupported") {
          setLocationStatus("unsupported");
        } else {
          setLocationStatus("error");
        }
      } else {
        setLocationErrorKind("unavailable");
        setLocationStatus("error");
      }
    }
  }

  function expandRadius() {
    const next = nextExpandRadius(discovery.query.radiusMiles || radiusMiles);
    if (!next) return;
    setRadiusMiles(next);
    const q = discovery.query;
    let response: StoreDiscoveryResponse;
    if (q.mode === "zip" && q.zip) {
      response = searchStoreDiscovery(stores, { mode: "zip", zip: q.zip, radiusMiles: next });
    } else if (q.mode === "city" && q.city) {
      response = searchStoreDiscovery(stores, {
        mode: "city",
        city: q.city,
        region: q.region,
        country: q.country,
        radiusMiles: next,
      });
    } else if (q.mode === "point" && q.center) {
      response = searchStoreDiscovery(stores, {
        mode: "point",
        lat: q.center.lat,
        lng: q.center.lng,
        radiusMiles: next,
        source: q.source || "location",
        displayLabel: q.displayLabel,
      });
    } else {
      return;
    }
    response = {
      ...response,
      query: {
        ...response.query,
        expandedFromRadiusMiles: q.radiusMiles,
        radiusMiles: next,
      },
    };
    runDiscovery(response);
  }

  function onPinSelect(pin: StoreDiscoveryMapPin) {
    setSelectedPinId(pin.storeId);
    const node = listRefs.current[pin.storeId];
    if (node) {
      node.focus({ preventScroll: true });
      node.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function scrollToOnline() {
    const heading = document.getElementById(ONLINE_HEADING_ID);
    if (heading instanceof HTMLElement) {
      heading.scrollIntoView({ behavior: "smooth", block: "start" });
      heading.focus({ preventScroll: true });
      return;
    }
    onlineSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function focusSearchField() {
    document.getElementById(searchFieldId)?.focus();
  }

  const isBrowse = discovery.query.mode === "browse";
  const showDistance = discovery.list.some((store) => store.distanceMiles != null);
  const hasActiveSearch = !isBrowse;
  const expandTo = nextExpandRadius(discovery.query.radiusMiles || radiusMiles);
  const hasOnline = discovery.onlineFallback.length > 0;
  const isGeoPoint = discovery.query.mode === "point" && discovery.query.source === "location";
  const radiusForCopy = discovery.query.radiusMiles || radiusMiles || 60;

  const coachState: NearYouCoachState = (() => {
    if (locationStatus === "loading") return "requesting_location";
    if (locationStatus === "ready" && isGeoPoint) {
      return discovery.list.length > 0 ? "location_ready_nearby" : "location_ready_empty_nearby";
    }
    if (permissionDeniedPersistent || denyCount >= 2) return "location_denied_persistent";
    if (locationStatus === "denied" || denyCount === 1 || locationErrorKind === "denied") {
      return "location_denied_first_time";
    }
    if (locationStatus === "unsupported" || locationErrorKind === "unsupported") {
      return "location_unavailable_unsupported";
    }
    if (locationStatus === "error" || locationErrorKind === "timeout" || locationErrorKind === "unavailable") {
      return "location_unavailable_timeout";
    }
    return "permission_not_asked";
  })();

  const placeSearchCoaching =
    !cityCandidates?.length &&
    hasActiveSearch &&
    !isGeoPoint &&
    (discovery.status === "zero-local" || discovery.status === "geocode-unavailable");

  const coach = buildCoachModel(coachState, {
    nearbyCount: discovery.list.length,
    radius: radiusForCopy,
    hasOnline,
    helpOpen,
  });

  const statusHeadline = (() => {
    if (cityCandidates?.length) return discovery.message || "Which city did you mean?";
    if (placeSearchCoaching) {
      return discovery.message || `No local shops within ${radiusForCopy} miles`;
    }
    if (hasActiveSearch && discovery.list.length && !isGeoPoint) {
      return `${discovery.list.length} shop${discovery.list.length === 1 ? "" : "s"} near ${discovery.query.displayLabel}`;
    }
    return coach.headline;
  })();

  const statusDetail = (() => {
    if (cityCandidates?.length) return `Choose a city so we can show shops within about ${radiusMiles} miles.`;
    if (placeSearchCoaching) {
      return "We're still growing the shop directory. You can widen the search or browse online shops that ship nationwide.";
    }
    if (hasActiveSearch && discovery.status === "ok" && !isGeoPoint) {
      return `Local shops within about ${radiusForCopy} miles, then online shops that ship.`;
    }
    return coach.body;
  })();

  function runCoachAction(action: CoachAction) {
    switch (action) {
      case "use_location":
      case "retry_location":
      case "settings_retry":
      case "refresh_location":
        void requestUserLocation();
        break;
      case "browse_online":
        scrollToOnline();
        break;
      case "browse_all":
        clearSearch();
        break;
      case "browse_search":
        focusSearchField();
        break;
      case "noop":
      default:
        break;
    }
  }

  const mapPins = discovery.mapPins;
  const listMissingPins = discovery.list.length > 0 && mapPins.length < discovery.list.length;

  return (
    <section className="page stores-discovery-page">
      <SectionHeader eyebrow="Shops" title="Local shops near you" />
      <p className="lede">
        Search by ZIP or city, browse the city directory, or use your location. Needlepoint links you out to each shop&apos;s own
        site — checkout happens there.
      </p>

      <form className="store-discovery-search panel" onSubmit={onSearchSubmit} noValidate>
        <div className="store-discovery-search-intro">
          <Search size={18} aria-hidden />
          <div>
            <strong>Search shops</strong>
            <p>Enter a ZIP or city. Try 78701, Austin, TX, or Portland.</p>
          </div>
        </div>

        <div className="store-discovery-search-row">
          <label htmlFor={searchFieldId} className="store-discovery-search-field">
            <span className="label-text">ZIP or city</span>
            <input
              id={searchFieldId}
              name="q"
              autoComplete="postal-code"
              placeholder="Enter a ZIP or city"
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value);
                if (searchError) setSearchError("");
              }}
              maxLength={80}
              enterKeyHint="search"
              aria-invalid={Boolean(searchError)}
              aria-describedby={searchError ? `${searchFieldId}-error` : undefined}
            />
          </label>
          <div className="store-discovery-search-actions">
            <button className="primary" type="submit" disabled={searchBusy || locationStatus === "loading"}>
              {searchBusy ? "Searching…" : "Find shops"}
            </button>
            <button
              className="secondary"
              type="button"
              onClick={() => void requestUserLocation()}
              disabled={locationStatus === "loading" || searchBusy}
            >
              <Navigation size={16} aria-hidden />
              {locationStatus === "loading" ? "Locating…" : userPoint ? "Refresh location" : "Use my location"}
            </button>
            {hasActiveSearch || searchInput ? (
              <button className="secondary" type="button" onClick={clearSearch} disabled={searchBusy}>
                Clear
              </button>
            ) : null}
          </div>
        </div>

        {searchError ? (
          <p id={`${searchFieldId}-error`} className="store-location-search-error" role="alert">
            {searchError}
          </p>
        ) : null}
      </form>

      <div
        className="store-location-bar panel store-location-coaching"
        data-location-status={locationStatus}
        data-coach-state={coachState}
        aria-live="polite"
      >
        <div className="store-location-copy">
          <MapPin size={18} aria-hidden />
          <div>
            <strong id={resultsHeadingId}>{statusHeadline}</strong>
            <p>{statusDetail}</p>
            {coach.helper && !placeSearchCoaching ? <p className="store-location-helper">{coach.helper}</p> : null}
          </div>
        </div>
        {placeSearchCoaching ? (
          <div className="store-location-actions store-discovery-coach-actions">
            {expandTo ? (
              <button className="primary" type="button" onClick={expandRadius}>
                Expand to {expandTo} miles
              </button>
            ) : null}
            <button className="secondary" type="button" onClick={focusSearchField}>
              Try a city or ZIP
            </button>
            {hasOnline ? (
              <button className="secondary" type="button" onClick={scrollToOnline}>
                Browse online shops
              </button>
            ) : null}
          </div>
        ) : (
          <div className="store-location-actions store-discovery-coach-actions">
            {coach.primary ? (
              <button
                className="primary"
                type="button"
                onClick={() => runCoachAction(coach.primary!.action)}
                disabled={
                  locationStatus === "loading" ||
                  searchBusy ||
                  Boolean(coach.loadingPrimary) ||
                  coach.primary.action === "noop"
                }
              >
                {coach.primary.label}
              </button>
            ) : null}
            {coach.secondary ? (
              <button
                className="secondary"
                type="button"
                onClick={() => runCoachAction(coach.secondary!.action)}
                disabled={locationStatus === "loading" || searchBusy}
              >
                {coach.secondary.label}
              </button>
            ) : null}
            {coach.tertiary ? (
              <button
                className="secondary"
                type="button"
                onClick={() => runCoachAction(coach.tertiary!.action)}
                disabled={locationStatus === "loading" || searchBusy}
              >
                {coach.tertiary.label}
              </button>
            ) : null}
            {coach.helpToggle ? (
              <button
                className="text-button store-location-help-toggle"
                type="button"
                aria-expanded={helpOpen}
                onClick={() => setHelpOpen((open) => !open)}
              >
                How to enable location
              </button>
            ) : null}
          </div>
        )}
      </div>

      {cityCandidates?.length ? (
        <div className="store-city-ambiguity panel" role="region" aria-label="Choose a city">
          <strong>{discovery.message || "Which city did you mean?"}</strong>
          <p>Choose a city so we can show shops within about {radiusMiles} miles.</p>
          <div className="store-city-ambiguity-list">
            {cityCandidates.map((candidate) => (
              <button key={candidate.key} type="button" className="secondary" onClick={() => onSelectCityCandidate(candidate)}>
                {candidate.displayLabel}
                {typeof candidate.shopCount === "number" ? ` — ${candidate.shopCount} shop${candidate.shopCount === 1 ? "" : "s"}` : ""}
              </button>
            ))}
          </div>
          <div className="store-discovery-coach-actions">
            <button className="text-button" type="button" onClick={() => document.getElementById(searchFieldId)?.focus()}>
              Search by ZIP instead
            </button>
            <button className="text-button" type="button" onClick={() => setCityCandidates(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {isBrowse && cityCards.length > 0 ? (
        <section className="store-city-browse" aria-label="Browse by city">
          <SectionTitle title="Browse by city" />
          <div className="store-city-grid">
            {cityCards.map((card) => (
              <button key={card.key} type="button" className="store-city-card panel" onClick={() => onSelectCityCard(card)}>
                <strong>{card.displayLabel}</strong>
                <span className="store-city-count">
                  {card.shopCount} shop{card.shopCount === 1 ? "" : "s"}
                </span>
                {card.specialties.length ? (
                  <div className="tag-row">
                    {card.specialties.map((specialty) => (
                      <span key={specialty}>{specialty}</span>
                    ))}
                  </div>
                ) : null}
                {card.exampleShops.length ? (
                  <p className="store-city-examples">{card.exampleShops.map((shop) => shop.name).join(" · ")}</p>
                ) : null}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {!stores.length ? (
        <EmptyState
          title="No shops yet"
          body="Shop profiles will appear here once they are seeded or claimed."
          cta={
            <div className="store-location-actions store-discovery-coach-actions">
              <button className="primary" type="button" disabled>
                Check back soon
              </button>
              <button className="secondary" type="button" onClick={() => setView({ name: "home" })}>
                Back to Studio
              </button>
            </div>
          }
        />
      ) : (
        <div className="store-discovery-results">
          {mapPins.length > 0 ? (
            <StorePinMap
              pins={mapPins}
              selectedId={selectedPinId}
              onSelect={onPinSelect}
              center={discovery.query.center}
              label={discovery.query.displayLabel}
            />
          ) : null}

          {listMissingPins ? (
            <p className="store-map-note">Some shops don&apos;t have map pins yet, but they&apos;re included in the list.</p>
          ) : null}

          {discovery.list.length > 0 ? (
            <>
              <SectionTitle
                title={
                  hasActiveSearch
                    ? discovery.query.mode === "point"
                      ? "Near you"
                      : `Near ${discovery.query.displayLabel}`
                    : "Local & hybrid shops"
                }
              />
              <StoreCardGrid
                stores={discovery.list}
                setView={setView}
                showDistance={showDistance}
                selectedId={selectedPinId}
                listRefs={listRefs}
                onHighlight={setSelectedPinId}
              />
            </>
          ) : hasActiveSearch && discovery.status !== "ambiguous-city" ? (
            <div className="store-local-empty panel" data-empty-slot="local-zero">
              <strong>
                {isGeoPoint
                  ? `No local shops within ${radiusForCopy} mi`
                  : discovery.message || "No local shops in this area"}
              </strong>
              <p>
                {isGeoPoint
                  ? hasOnline
                    ? "We couldn't find a local needlepoint shop close by yet. Here are online shops that ship so you can keep stitching."
                    : "We couldn't find a nearby local shop, and online shop profiles are not available yet. Try browsing all shops or check back soon."
                  : "Widen the search, try another place, or browse online shops that ship needlepoint supplies."}
              </p>
              <div className="store-location-actions store-discovery-coach-actions">
                {isGeoPoint ? (
                  <>
                    {hasOnline ? (
                      <button className="primary" type="button" onClick={scrollToOnline}>
                        Browse online shops
                      </button>
                    ) : (
                      <button className="primary" type="button" onClick={clearSearch}>
                        Browse all shops
                      </button>
                    )}
                    {hasOnline ? (
                      <button className="secondary" type="button" onClick={clearSearch}>
                        Browse all shops
                      </button>
                    ) : null}
                    <button
                      className="secondary"
                      type="button"
                      onClick={() => void requestUserLocation()}
                      disabled={locationStatus === "loading"}
                    >
                      Refresh location
                    </button>
                  </>
                ) : (
                  <>
                    {expandTo ? (
                      <button className="primary" type="button" onClick={expandRadius}>
                        Expand to {expandTo} miles
                      </button>
                    ) : null}
                    <button className="secondary" type="button" onClick={clearSearch}>
                      Reset browse
                    </button>
                    {hasOnline ? (
                      <button className="secondary" type="button" onClick={scrollToOnline}>
                        Browse online shops
                      </button>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          ) : null}

          {discovery.onlineFallback.length > 0 ? (
            <section ref={onlineSectionRef} className="store-online-fallback" aria-label="Online shops that ship">
              <SectionTitle headingId={ONLINE_HEADING_ID} title="Online shops that ship" />
              <p className="store-online-fallback-copy store-online-helper">
                Shop profiles link out to each shop&apos;s own site. Needlepoint does not handle checkout.
              </p>
              <StoreCardGrid stores={discovery.onlineFallback} setView={setView} showDistance={false} listRefs={listRefs} />
            </section>
          ) : null}
        </div>
      )}
    </section>
  );
}
function StoreCardGrid({
  stores,
  setView,
  showDistance = false,
  selectedId = null,
  listRefs,
  onHighlight,
}: {
  stores: StoreDiscoveryListItem[];
  setView: (view: View) => void;
  showDistance?: boolean;
  selectedId?: string | null;
  listRefs: MutableRefObject<Record<string, HTMLButtonElement | null>>;
  onHighlight?: (id: string | null) => void;
}) {
  return (
    <div className="store-grid">
      {stores.map((store) => (
        <button
          key={store.id}
          type="button"
          className={`store-card panel${selectedId === store.id ? " is-selected" : ""}`}
          ref={(node) => {
            listRefs.current[store.id] = node;
          }}
          onClick={() => setView({ name: "store", handle: store.handle })}
          onFocus={() => onHighlight?.(store.id)}
          data-store-id={store.id}
        >
          <img className="store-card-cover" src={store.coverImage || store.avatar} alt="" />
          <div className="store-card-body">
            <img className="store-card-avatar" src={store.avatar} alt="" />
            <strong>{store.name}</strong>
            <small>@{store.handle}</small>
            <p>{store.location || store.description || "Needlepoint supplier"}</p>
            <div className="tag-row">
              <span>{storeTypeLabel(store.storeType)}</span>
              {showDistance && store.distanceMiles != null ? (
                <span className="distance-tag">{formatDistanceMiles(store.distanceMiles)}</span>
              ) : null}
              {store.shipsNationwide ? <span>Ships nationwide</span> : null}
              {(store.specialties ?? []).slice(0, 3).map((specialty) => (
                <span key={specialty}>{specialty}</span>
              ))}
              {store.projectCount > 0 ? <span>{store.projectCount} projects</span> : null}
              {typeof store.followerCount === "number" && store.followerCount > 0 ? (
                <span>
                  {store.followerCount} follower{store.followerCount === 1 ? "" : "s"}
                </span>
              ) : null}
            </div>
            <span className="store-card-cta">View shop</span>
          </div>
        </button>
      ))}
    </div>
  );
}

function StorePinMap({
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
  const bounds = useMemo(() => {
    const lats = pins.map((p) => p.lat);
    const lngs = pins.map((p) => p.lng);
    if (center) {
      lats.push(center.lat);
      lngs.push(center.lng);
    }
    let minLat = Math.min(...lats);
    let maxLat = Math.max(...lats);
    let minLng = Math.min(...lngs);
    let maxLng = Math.max(...lngs);
    // pad single-point / tight clusters
    if (maxLat - minLat < 0.08) {
      const mid = (maxLat + minLat) / 2;
      minLat = mid - 0.04;
      maxLat = mid + 0.04;
    }
    if (maxLng - minLng < 0.08) {
      const mid = (maxLng + minLng) / 2;
      minLng = mid - 0.04;
      maxLng = mid + 0.04;
    }
    const latPad = (maxLat - minLat) * 0.12;
    const lngPad = (maxLng - minLng) * 0.12;
    return {
      minLat: minLat - latPad,
      maxLat: maxLat + latPad,
      minLng: minLng - lngPad,
      maxLng: maxLng + lngPad,
    };
  }, [pins, center]);

  function project(lat: number, lng: number) {
    const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100;
    const y = (1 - (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 100;
    return { x: Math.min(96, Math.max(4, x)), y: Math.min(92, Math.max(8, y)) };
  }

  return (
    <section className="store-pin-map panel" aria-label={`Map of shops near ${label}`}>
      <div className="store-pin-map-header">
        <strong>Map preview</strong>
        <span>
          {pins.length} pin{pins.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="store-pin-map-canvas" role="list">
        <div className="store-pin-map-grid" aria-hidden />
        {center ? (
          <span
            className="store-pin-map-center"
            style={{ left: `${project(center.lat, center.lng).x}%`, top: `${project(center.lat, center.lng).y}%` }}
            title="Search center"
          />
        ) : null}
        {pins.map((pin) => {
          const { x, y } = project(pin.lat, pin.lng);
          const selected = selectedId === pin.storeId;
          return (
            <button
              key={pin.storeId}
              type="button"
              role="listitem"
              className={`store-pin-map-pin${selected ? " is-selected" : ""}`}
              style={{ left: `${x}%`, top: `${y}%` }}
              title={`${pin.name}${pin.distanceMiles != null ? ` · ${formatDistanceMiles(pin.distanceMiles)}` : ""}`}
              aria-label={`${pin.name}${pin.distanceMiles != null ? `, ${formatDistanceMiles(pin.distanceMiles)}` : ""}. Highlight in list.`}
              aria-pressed={selected}
              onClick={() => onSelect(pin)}
            >
              <span className="store-pin-map-dot" />
              <span className="store-pin-map-label">{pin.name}</span>
            </button>
          );
        })}
      </div>
      <p className="store-pin-map-hint">Select a pin to highlight the matching shop card. List stays fully usable without the map.</p>
    </section>
  );
}

export { StoresView as StoresPage };
