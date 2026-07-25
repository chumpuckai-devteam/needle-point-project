#!/usr/bin/env python3
"""DEPRECATED: synthetic density fakes. Prefer scripts/data/real-lns-catalog.json + npm run seed:stores."""
"""Generate US needlepoint shop catalog: >=2 per state, >=5 per major metro."""
from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "scripts" / "data" / "us-store-catalog.json"

STATES = {
    "AL": [("Birmingham", 33.5186, -86.8104, "35203"), ("Mobile", 30.6954, -88.0399, "36602")],
    "AK": [("Anchorage", 61.2181, -149.9003, "99501"), ("Fairbanks", 64.8378, -147.7164, "99701")],
    "AZ": [("Phoenix", 33.4484, -112.0740, "85004"), ("Tucson", 32.2226, -110.9747, "85701")],
    "AR": [("Little Rock", 34.7465, -92.2896, "72201"), ("Fayetteville", 36.0626, -94.1574, "72701")],
    "CA": [("Los Angeles", 34.0522, -118.2437, "90012"), ("San Diego", 32.7157, -117.1611, "92101")],
    "CO": [("Denver", 39.7392, -104.9903, "80202"), ("Colorado Springs", 38.8339, -104.8214, "80903")],
    "CT": [("Hartford", 41.7658, -72.6734, "06103"), ("New Haven", 41.3083, -72.9279, "06510")],
    "DE": [("Wilmington", 39.7391, -75.5398, "19801"), ("Dover", 39.1582, -75.5244, "19901")],
    "FL": [("Miami", 25.7617, -80.1918, "33130"), ("Tampa", 27.9506, -82.4572, "33602")],
    "GA": [("Atlanta", 33.7490, -84.3880, "30303"), ("Savannah", 32.0809, -81.0912, "31401")],
    "HI": [("Honolulu", 21.3069, -157.8583, "96813"), ("Hilo", 19.7074, -155.0885, "96720")],
    "ID": [("Boise", 43.6150, -116.2023, "83702"), ("Coeur dAlene", 47.6777, -116.7805, "83814")],
    "IL": [("Chicago", 41.8781, -87.6298, "60601"), ("Springfield", 39.7817, -89.6501, "62701")],
    "IN": [("Indianapolis", 39.7684, -86.1581, "46204"), ("Fort Wayne", 41.0793, -85.1394, "46802")],
    "IA": [("Des Moines", 41.5868, -93.6250, "50309"), ("Iowa City", 41.6611, -91.5302, "52240")],
    "KS": [("Wichita", 37.6872, -97.3301, "67202"), ("Kansas City", 39.1141, -94.6275, "66101")],
    "KY": [("Louisville", 38.2527, -85.7585, "40202"), ("Lexington", 38.0406, -84.5037, "40507")],
    "LA": [("New Orleans", 29.9511, -90.0715, "70112"), ("Baton Rouge", 30.4515, -91.1871, "70802")],
    "ME": [("Portland", 43.6591, -70.2568, "04101"), ("Bangor", 44.8016, -68.7712, "04401")],
    "MD": [("Baltimore", 39.2904, -76.6122, "21202"), ("Annapolis", 38.9784, -76.4922, "21401")],
    "MA": [("Boston", 42.3601, -71.0589, "02108"), ("Worcester", 42.2626, -71.8023, "01608")],
    "MI": [("Detroit", 42.3314, -83.0458, "48226"), ("Grand Rapids", 42.9634, -85.6681, "49503")],
    "MN": [("Minneapolis", 44.9778, -93.2650, "55401"), ("Saint Paul", 44.9537, -93.0900, "55101")],
    "MS": [("Jackson", 32.2988, -90.1848, "39201"), ("Gulfport", 30.3674, -89.0928, "39501")],
    "MO": [("St Louis", 38.6270, -90.1994, "63101"), ("Kansas City", 39.0997, -94.5786, "64106")],
    "MT": [("Billings", 45.7833, -108.5007, "59101"), ("Missoula", 46.8721, -113.9940, "59802")],
    "NE": [("Omaha", 41.2565, -95.9345, "68102"), ("Lincoln", 40.8136, -96.7026, "68508")],
    "NV": [("Las Vegas", 36.1699, -115.1398, "89101"), ("Reno", 39.5296, -119.8138, "89501")],
    "NH": [("Manchester", 42.9956, -71.4548, "03101"), ("Portsmouth", 43.0718, -70.7626, "03801")],
    "NJ": [("Newark", 40.7357, -74.1724, "07102"), ("Princeton", 40.3573, -74.6672, "08540")],
    "NM": [("Albuquerque", 35.0844, -106.6504, "87102"), ("Santa Fe", 35.6870, -105.9378, "87501")],
    "NY": [("New York", 40.7128, -74.0060, "10001"), ("Buffalo", 42.8864, -78.8784, "14202")],
    "NC": [("Charlotte", 35.2271, -80.8431, "28202"), ("Raleigh", 35.7796, -78.6382, "27601")],
    "ND": [("Fargo", 46.8772, -96.7898, "58102"), ("Bismarck", 46.8083, -100.7837, "58501")],
    "OH": [("Columbus", 39.9612, -82.9988, "43215"), ("Cleveland", 41.4993, -81.6944, "44113")],
    "OK": [("Oklahoma City", 35.4676, -97.5164, "73102"), ("Tulsa", 36.1540, -95.9928, "74103")],
    "OR": [("Portland", 45.5152, -122.6784, "97205"), ("Eugene", 44.0521, -123.0868, "97401")],
    "PA": [("Philadelphia", 39.9526, -75.1652, "19102"), ("Pittsburgh", 40.4406, -79.9959, "15222")],
    "RI": [("Providence", 41.8240, -71.4128, "02903"), ("Newport", 41.4901, -71.3128, "02840")],
    "SC": [("Charleston", 32.7765, -79.9311, "29401"), ("Greenville", 34.8526, -82.3940, "29601")],
    "SD": [("Sioux Falls", 43.5446, -96.7311, "57104"), ("Rapid City", 44.0805, -103.2310, "57701")],
    "TN": [("Nashville", 36.1627, -86.7816, "37203"), ("Memphis", 35.1495, -90.0490, "38103")],
    "TX": [("Austin", 30.2672, -97.7431, "78701"), ("Dallas", 32.7767, -96.7970, "75201")],
    "UT": [("Salt Lake City", 40.7608, -111.8910, "84101"), ("Provo", 40.2338, -111.6585, "84601")],
    "VT": [("Burlington", 44.4759, -73.2121, "05401"), ("Montpelier", 44.2601, -72.5754, "05602")],
    "VA": [("Richmond", 37.5407, -77.4360, "23219"), ("Virginia Beach", 36.8529, -75.9780, "23451")],
    "WA": [("Seattle", 47.6062, -122.3321, "98101"), ("Spokane", 47.6588, -117.4260, "99201")],
    "WV": [("Charleston", 38.3498, -81.6326, "25301"), ("Morgantown", 39.6295, -79.9559, "26505")],
    "WI": [("Milwaukee", 43.0389, -87.9065, "53202"), ("Madison", 43.0731, -89.4012, "53703")],
    "WY": [("Cheyenne", 41.1400, -104.8202, "82001"), ("Jackson", 43.4799, -110.7624, "83001")],
    "DC": [("Washington", 38.9072, -77.0369, "20001")],
}

METROS = [
    ("New York", "NY", 40.7128, -74.0060, "100"),
    ("Los Angeles", "CA", 34.0522, -118.2437, "900"),
    ("Chicago", "IL", 41.8781, -87.6298, "606"),
    ("Houston", "TX", 29.7604, -95.3698, "770"),
    ("Phoenix", "AZ", 33.4484, -112.0740, "850"),
    ("Philadelphia", "PA", 39.9526, -75.1652, "191"),
    ("San Antonio", "TX", 29.4241, -98.4936, "782"),
    ("San Diego", "CA", 32.7157, -117.1611, "921"),
    ("Dallas", "TX", 32.7767, -96.7970, "752"),
    ("San Jose", "CA", 37.3382, -121.8863, "951"),
    ("Austin", "TX", 30.2672, -97.7431, "787"),
    ("Jacksonville", "FL", 30.3322, -81.6557, "322"),
    ("Fort Worth", "TX", 32.7555, -97.3308, "761"),
    ("Columbus", "OH", 39.9612, -82.9988, "432"),
    ("Charlotte", "NC", 35.2271, -80.8431, "282"),
    ("Indianapolis", "IN", 39.7684, -86.1581, "462"),
    ("San Francisco", "CA", 37.7749, -122.4194, "941"),
    ("Seattle", "WA", 47.6062, -122.3321, "981"),
    ("Denver", "CO", 39.7392, -104.9903, "802"),
    ("Boston", "MA", 42.3601, -71.0589, "021"),
    ("Nashville", "TN", 36.1627, -86.7816, "372"),
    ("Detroit", "MI", 42.3314, -83.0458, "482"),
    ("Portland", "OR", 45.5152, -122.6784, "972"),
    ("Las Vegas", "NV", 36.1699, -115.1398, "891"),
    ("Memphis", "TN", 35.1495, -90.0490, "381"),
    ("Louisville", "KY", 38.2527, -85.7585, "402"),
    ("Baltimore", "MD", 39.2904, -76.6122, "212"),
    ("Milwaukee", "WI", 43.0389, -87.9065, "532"),
    ("Albuquerque", "NM", 35.0844, -106.6504, "871"),
    ("Tucson", "AZ", 32.2226, -110.9747, "857"),
    ("Atlanta", "GA", 33.7490, -84.3880, "303"),
    ("Miami", "FL", 25.7617, -80.1918, "331"),
    ("Minneapolis", "MN", 44.9778, -93.2650, "554"),
    ("Cleveland", "OH", 41.4993, -81.6944, "441"),
    ("New Orleans", "LA", 29.9511, -90.0715, "701"),
    ("Tampa", "FL", 27.9506, -82.4572, "336"),
    ("Orlando", "FL", 28.5383, -81.3792, "328"),
    ("Raleigh", "NC", 35.7796, -78.6382, "276"),
    ("Salt Lake City", "UT", 40.7608, -111.8910, "841"),
    ("Richmond", "VA", 37.5407, -77.4360, "232"),
    ("Birmingham", "AL", 33.5186, -86.8104, "352"),
    ("Oklahoma City", "OK", 35.4676, -97.5164, "731"),
    ("Omaha", "NE", 41.2565, -95.9345, "681"),
    ("Kansas City", "MO", 39.0997, -94.5786, "641"),
    ("Brooklyn", "NY", 40.6782, -73.9442, "112"),
]

NAME_TEMPLATES = [
    "{city} Canvas and Thread",
    "{city} Needlepoint Co",
    "The Stitch Room {city}",
    "{city} Painted Canvas",
    "Linen and Lattice {city}",
    "{city} Basketweave House",
    "Harbor Stitch {city}",
    "{city} Finishing Studio",
    "Needle and Nest {city}",
    "{city} Open Stitch Shop",
]

SPECIALTIES = [
    ["painted canvases", "threads", "finishing"],
    ["classes", "beginner kits", "open stitch"],
    ["custom finishing", "belts", "ornaments"],
    ["silk", "metallic", "kits"],
    ["local pickup", "classes", "threads"],
    ["pillows", "stockings", "heirloom"],
]

AVATAR = "/assets/needlepoint-hero.png"
COVERS = [
    "/assets/persimmon-garden-pillow.jpg",
    "/assets/bookshop-door-canvas.jpg",
    "/assets/blue-hydrangea-belt.jpg",
    "/assets/tiny-ski-lodge-ornament.jpg",
]


def slugify(s: str) -> str:
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "", s)
    return (s[:40] or "shop")


def main() -> None:
    protected = {
        "canopycanvas": {
            "name": "Canopy Canvas",
            "handle": "canopycanvas",
            "store_type": "both",
            "description": "Local needlepoint shop with painted canvases, threads, and finishing.",
            "avatar_url": AVATAR,
            "cover_image_url": "/assets/persimmon-garden-pillow.jpg",
            "website_url": "https://example.com/canopy",
            "location": "Portland, OR",
            "city": "Portland",
            "region": "OR",
            "postal_code": "97205",
            "ships_nationwide": True,
            "specialties": ["painted canvases", "finishing", "threads"],
            "latitude": 45.5202471,
            "longitude": -122.674194,
            "country": "US",
            "protected": True,
        },
        "threadandtonic": {
            "name": "Thread & Tonic",
            "handle": "threadandtonic",
            "store_type": "online",
            "description": "Online specialty threads and silk blends for advanced stitchers.",
            "avatar_url": AVATAR,
            "cover_image_url": "/assets/blue-hydrangea-belt.jpg",
            "website_url": "https://example.com/threadtonic",
            "location": "Ships nationwide",
            "city": "",
            "region": "",
            "postal_code": "",
            "ships_nationwide": True,
            "specialties": ["silk", "metallic", "kits"],
            "latitude": None,
            "longitude": None,
            "country": "US",
            "protected": True,
        },
        "bookshopwindows": {
            "name": "Bookshop Windows LNS",
            "handle": "bookshopwindows",
            "store_type": "local",
            "description": "Neighborhood LNS hosting stitch-alongs and custom finishing.",
            "avatar_url": AVATAR,
            "cover_image_url": "/assets/bookshop-door-canvas.jpg",
            "website_url": "https://example.com/bookshop",
            "location": "Austin, TX",
            "city": "Austin",
            "region": "TX",
            "postal_code": "78701",
            "ships_nationwide": False,
            "specialties": ["local pickup", "classes", "finishing"],
            "latitude": 30.2711286,
            "longitude": -97.7436995,
            "country": "US",
            "protected": True,
        },
        "needleneststudio": {
            "name": "Needle Nest Studio",
            "handle": "needleneststudio",
            "store_type": "local",
            "description": "Small teaching studio with beginner canvases and monthly finish-it nights.",
            "avatar_url": AVATAR,
            "cover_image_url": "/assets/tiny-ski-lodge-ornament.jpg",
            "website_url": "https://example.com/needle-nest",
            "location": "Brooklyn, NY",
            "city": "Brooklyn",
            "region": "NY",
            "postal_code": "11201",
            "ships_nationwide": False,
            "specialties": ["beginner classes", "ornaments", "open stitch"],
            "latitude": 40.6943,
            "longitude": -73.9866,
            "country": "US",
            "protected": True,
        },
    }

    handles = set(protected.keys())
    shops = list(protected.values())
    state_count: dict[str, int] = defaultdict(int)
    metro_count: dict[str, int] = defaultdict(int)

    def metro_key_for(city: str, region: str) -> str | None:
        for mcity, mst, *_ in METROS:
            if region != mst:
                continue
            if city.lower() == mcity.lower():
                return f"{mcity}|{mst}"
            if city.lower() == "brooklyn" and mcity == "Brooklyn":
                return f"{mcity}|{mst}"
            if city.lower() == "new york" and mcity == "New York":
                return f"{mcity}|{mst}"
        return None

    for p in protected.values():
        if p["region"]:
            state_count[p["region"]] += 1
        mk = metro_key_for(p["city"], p["region"]) if p["city"] else None
        if mk:
            metro_count[mk] += 1

    def add_shop(
        name: str,
        city: str,
        region: str,
        lat: float | None,
        lng: float | None,
        zipc: str,
        store_type: str = "local",
        ships: bool = False,
        metro_key: str | None = None,
    ) -> None:
        base_handle = slugify(name)
        handle = base_handle
        i = 2
        while handle in handles:
            handle = f"{base_handle}{i}"
            i += 1
        handles.add(handle)
        idx = len(shops)
        specialties = SPECIALTIES[idx % len(SPECIALTIES)]
        cover = COVERS[idx % len(COVERS)]
        j = (idx % 7) * 0.004
        k = ((idx // 7) % 5) * 0.004
        shops.append(
            {
                "name": name,
                "handle": handle,
                "store_type": store_type,
                "description": (
                    f"Independent needlepoint shop in {city}, {region} — canvases, threads, "
                    "and friendly stitch advice for the local community."
                ),
                "avatar_url": AVATAR,
                "cover_image_url": cover,
                "website_url": f"https://example.com/shops/{handle}",
                "location": f"{city}, {region}",
                "city": city,
                "region": region,
                "postal_code": zipc,
                "ships_nationwide": ships,
                "specialties": specialties,
                "latitude": None if lat is None else round(lat + j * (1 if idx % 2 == 0 else -1), 6),
                "longitude": None if lng is None else round(lng + k * (1 if idx % 3 == 0 else -1), 6),
                "country": "US",
                "protected": False,
            }
        )
        if region:
            state_count[region] += 1
        if metro_key:
            metro_count[metro_key] += 1

    for st, cities in STATES.items():
        while state_count[st] < 2:
            n = state_count[st]
            city, lat, lng, z = cities[min(n, len(cities) - 1)]
            tmpl = NAME_TEMPLATES[n % len(NAME_TEMPLATES)]
            name = tmpl.format(city=city)
            if any(s["name"] == name for s in shops):
                name = f"{city} Stitch Atelier"
            mk = metro_key_for(city, st)
            add_shop(name, city, st, lat, lng, z, metro_key=mk)

    for city, st, lat, lng, zpref in METROS:
        key = f"{city}|{st}"
        while metro_count[key] < 5:
            n = metro_count[key]
            variants = [
                NAME_TEMPLATES[n % len(NAME_TEMPLATES)].format(city=city),
                f"{city} Thread Parlor",
                f"{city} Canvas Loft",
                f"Eastside Stitch {city}",
                f"{city} Heirloom LNS",
            ]
            name = variants[n % len(variants)]
            if any(s["name"] == name and s["region"] == st for s in shops):
                name = f"{city} Needle Guild Shop {n + 1}"
            zipc = f"{zpref}{10 + n:02d}"
            zipc = re.sub(r"[^0-9]", "", zipc)[:5].ljust(5, "0")
            add_shop(name, city, st, lat, lng, zipc, metro_key=key)

    for i, name in enumerate(
        [
            "Silk Road Threads Online",
            "Mesh and Melody",
            "Canvas Cloud Supply",
            "Nationwide Needle Kit Co",
            "Stitch Mail Order House",
        ]
    ):
        h = slugify(name)
        if h in handles:
            continue
        handles.add(h)
        shops.append(
            {
                "name": name,
                "handle": h,
                "store_type": "online",
                "description": "Online needlepoint supply shop shipping nationwide — threads, canvases, and kits.",
                "avatar_url": AVATAR,
                "cover_image_url": COVERS[i % len(COVERS)],
                "website_url": f"https://example.com/shops/{h}",
                "location": "Ships nationwide",
                "city": "",
                "region": "",
                "postal_code": "",
                "ships_nationwide": True,
                "specialties": ["kits", "threads", "online"],
                "latitude": None,
                "longitude": None,
                "country": "US",
                "protected": False,
            }
        )

    missing_states = [st for st in STATES if state_count[st] < 2]
    thin_metros = [k for k, v in metro_count.items() if v < 5]
    assert not missing_states, missing_states
    assert not thin_metros, thin_metros

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps({"version": 1, "generated": "2026-07-21", "stores": shops}, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"wrote {OUT} total={len(shops)}")
    print(f"state min={min(state_count[s] for s in STATES)} metro min={min(metro_count.values())}")


if __name__ == "__main__":
    main()
