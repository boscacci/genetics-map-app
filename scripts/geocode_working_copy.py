#!/usr/bin/env python3
"""
Geocode records in the Working Copy tab using the Google Geocoding API.
Replicates the logic from scripts/geocoding.gs.

Default: only geocode rows missing Latitude/Longitude.
--backfill-all-records: re-run geocoding on every record (overwrite existing).

Usage: python scripts/geocode_working_copy.py [--backfill-all-records]
       (requires: pip install -r requirements.txt)
"""

import argparse
import re
import sys
import time
from pathlib import Path

# Force line buffering so progress appears when run under conda run / non-TTY
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(line_buffering=True)

import requests
from google.oauth2 import service_account
from googleapiclient.discovery import build

# Paths
SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
CREDENTIALS_PATH = REPO_ROOT / ".gcp-credentials" / "genetics-map-sa-key.json"
SHEET_ID_PATH = REPO_ROOT / ".gcp-credentials" / "sheet-id.txt"
API_KEY_PATH = REPO_ROOT / ".gcp-credentials" / "geocoding-api-key.txt"

# Column indices (0-based) per HEADERS
WORK_INSTITUTION_COL = 5
WORK_ADDRESS_COL = 6
LAT_COL = 10
LNG_COL = 11
CITY_COL = 12
COUNTRY_COL = 13

# Rate limiting (seconds between API calls)
DELAY_BETWEEN_ROWS = 0.25
DELAY_BETWEEN_ATTEMPTS = 0.5

# Terms that indicate a string is NOT a valid city name
REJECT_TERMS = [
    "usa", "united states", "canada", "uk", "united kingdom", "australia",
    "india", "pakistan", "south africa", "new zealand", "ireland", "germany",
    "france", "spain", "italy", "brazil", "china", "japan", "korea",
    "street", "st", "avenue", "ave", "road", "rd", "drive", "dr",
    "boulevard", "blvd", "lane", "ln", "way", "place", "pl", "court", "ct",
    "hospital", "medical center", "clinic", "center", "centre", "university",
    "college", "school", "institute", "foundation", "building", "tower",
    "box", "po box", "p.o. box", "suite", "unit", "floor", "level",
    "north", "south", "east", "west", "central", "western", "eastern",
    "northern", "southern", "upper", "lower",
    "ny", "ca", "tx", "fl", "il", "pa", "oh", "ga", "nc", "mi",  # State abbrevs
]
# Expand state abbrevs / bad city values to proper city names
CITY_ALIASES = {
    "ny": "New York City",
    "nyc": "New York City",
}

# Lat/lng bounds for NYC metro; when coords in range and city empty, use this
NYC_BOUNDS = (40.5, 40.95, -74.25, -73.7)


def _coords_in_nyc(lat: float, lng: float) -> bool:
    try:
        la, ln = float(lat), float(lng)
        return NYC_BOUNDS[0] <= la <= NYC_BOUNDS[1] and NYC_BOUNDS[2] <= ln <= NYC_BOUNDS[3]
    except (ValueError, TypeError):
        return False


def is_empty_or_nan(value):
    if value is None: return True
    s = str(value).strip().lower()
    return s in ("", "nan", "null", "undefined")


def is_valid_city(city: str) -> bool:
    if not city or len(city) < 2 or len(city) > 50:
        return False
    if re.match(r"^\d+$", city):
        return False
    lower = city.lower()
    for term in REJECT_TERMS:
        if re.search(r"\b" + re.escape(term) + r"\b", lower):
            return False
    if re.search(r"\d", city):
        return False
    if re.search(r"\b\d{5}(-\d{4})?\b|\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b", city, re.I):
        return False
    return True


def extract_city_from_address(address: str) -> str:
    if not address or is_empty_or_nan(address):
        return ""
    parts = [p.strip() for p in address.split(",") if p.strip()]
    # Strategy 1: from end
    for i in range(len(parts) - 1, -1, -1):
        if is_valid_city(parts[i]):
            return parts[i]
    # Strategy 2: from middle
    for i in range(1, len(parts) - 1):
        if is_valid_city(parts[i]):
            return parts[i]
    # Strategy 3: whole thing
    if "," not in address and is_valid_city(address.strip()):
        return address.strip()
    return ""


def extract_location_data(result: dict) -> dict:
    lat = lng = city = country = ""
    if result.get("geometry", {}).get("location"):
        loc = result["geometry"]["location"]
        lat = loc.get("lat", "")
        lng = loc.get("lng", "")
    for comp in result.get("address_components", []):
        types = comp.get("types", [])
        if "locality" in types:
            city = comp.get("long_name", "")
        elif "sublocality" in types and not city:
            city = comp.get("long_name", "")
        elif "sublocality_level_1" in types and not city:
            city = comp.get("long_name", "")
        elif "administrative_area_level_2" in types and not city:
            if is_valid_city(comp.get("long_name", "")):
                city = comp["long_name"]
        elif "administrative_area_level_1" in types and not city:
            if is_valid_city(comp.get("long_name", "")):
                city = comp["long_name"]
        elif "country" in types:
            country = comp.get("long_name", "")
    if city and not is_valid_city(city):
        city = ""
    if city:
        city = CITY_ALIASES.get(city.lower().strip(), city)
    return {"lat": lat, "lng": lng, "city": city, "country": country}


def is_complete_data(data: dict) -> bool:
    return bool(data.get("lat") and data.get("lng") and data.get("city") and data.get("country"))


def geocode_address(address: str, api_key: str) -> dict | None:
    """Call Google Geocoding API. Returns first result or None."""
    if not address.strip():
        return None
    url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {"address": address, "key": api_key, "language": "en"}
    try:
        r = requests.get(url, params=params, timeout=10)
        r.raise_for_status()
        data = r.json()
        if data.get("status") == "OK" and data.get("results"):
            return data["results"][0]
    except Exception as e:
        print(f"  Geocode error: {e}", file=sys.stderr)
    return None


def reverse_geocode_language(lat: float, lng: float, api_key: str, language: str = "en") -> dict | None:
    """Reverse geocode lat,lng to get address components in specified language."""
    url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {"latlng": f"{lat},{lng}", "key": api_key, "language": language}
    try:
        r = requests.get(url, params=params, timeout=10)
        r.raise_for_status()
        data = r.json()
        if data.get("status") == "OK" and data.get("results"):
            return data["results"][0]
    except Exception:
        pass
    return None


def _city_has_non_ascii(s: str) -> bool:
    return any(ord(c) > 127 for c in s)


def _resolve_city_to_english(city: str, lat: float, lng: float, api_key: str) -> str:
    """If city has non-ASCII chars, reverse geocode to get English locality."""
    if not city or not _city_has_non_ascii(city):
        return city
    result = reverse_geocode_language(lat, lng, api_key, "en")
    if not result:
        return city
    for comp in result.get("address_components", []):
        if "locality" in comp.get("types", []):
            return comp.get("long_name", city)
        if "sublocality" in comp.get("types", []) and not any("locality" in t for t in comp.get("types", [])):
            return comp.get("long_name", city)
        if "administrative_area_level_1" in comp.get("types", []):
            return comp.get("long_name", city)
    return city


def smart_geocode(inst: str, addr: str, api_key: str) -> dict:
    valid_inst = "" if is_empty_or_nan(inst) else str(inst).strip()
    valid_addr = "" if is_empty_or_nan(addr) else str(addr).strip()
    attempts = [
        ", ".join(filter(None, [valid_inst, valid_addr])),
        valid_addr,
        valid_inst,
    ]
    attempts = [a for a in attempts if a]
    best = {"lat": "", "lng": "", "city": "", "country": ""}
    best_score = 0.0
    for i, query in enumerate(attempts):
        if not query:
            continue
        result = geocode_address(query, api_key)
        if result:
            data = extract_location_data(result)
            score = 0.0
            if data["lat"] and data["lng"]:
                score += 2.0
            if data["city"]:
                score += 1.0
            if data["country"]:
                score += 1.0
            if i == 0:
                score += 0.5
            if i == 1 and valid_addr:
                score += 0.3
            if data["lat"] and data["lng"] and not data["city"] and valid_addr:
                extracted = extract_city_from_address(valid_addr)
                if extracted:
                    data["city"] = extracted
                    score += 1.0
            if score > best_score:
                best = data.copy()
                best_score = score
            if is_complete_data(data):
                best = data.copy()
                break
        time.sleep(DELAY_BETWEEN_ATTEMPTS)
    if best["lat"] and best["lng"] and not best["city"] and valid_addr:
        extracted = extract_city_from_address(valid_addr)
        if extracted:
            best["city"] = CITY_ALIASES.get(extracted.lower().strip(), extracted)
    if best["lat"] and best["lng"] and not best["city"]:
        if _coords_in_nyc(best["lat"], best["lng"]):
            best["city"] = "New York City"
    if best["city"] and _city_has_non_ascii(best["city"]) and best["lat"] and best["lng"]:
        try:
            lat_f, lng_f = float(best["lat"]), float(best["lng"])
            best["city"] = _resolve_city_to_english(best["city"], lat_f, lng_f, api_key)
        except (ValueError, TypeError):
            pass
    if best["city"]:
        best["city"] = CITY_ALIASES.get(best["city"].lower().strip(), best["city"])
    return best


def normalize_cities(data_rows: list) -> int:
    """Apply CITY_ALIASES and NYC_BOUNDS to all rows. Returns count of rows changed."""
    changed = 0
    for row in data_rows:
        while len(row) <= CITY_COL:
            row.append("")
        city = row[CITY_COL].strip() if len(row) > CITY_COL else ""
        lat = row[LAT_COL] if len(row) > LAT_COL else ""
        lng = row[LNG_COL] if len(row) > LNG_COL else ""
        if city:
            fixed = CITY_ALIASES.get(city.lower().strip(), city)
            if fixed != city:
                row[CITY_COL] = fixed
                changed += 1
        elif lat and lng and _coords_in_nyc(lat, lng):
            row[CITY_COL] = "New York City"
            changed += 1
    return changed


def _has_geocoding(row: list) -> bool:
    """True if row already has valid lat and lng."""
    while len(row) <= max(LAT_COL, LNG_COL):
        row.append("")
    lat = row[LAT_COL] if len(row) > LAT_COL else ""
    lng = row[LNG_COL] if len(row) > LNG_COL else ""
    if is_empty_or_nan(lat) or is_empty_or_nan(lng):
        return False
    try:
        float(str(lat).strip())
        float(str(lng).strip())
        return True
    except (ValueError, TypeError):
        return False


def main():
    parser = argparse.ArgumentParser(description="Geocode Working Copy records via Google Geocoding API")
    parser.add_argument(
        "--backfill-all-records",
        action="store_true",
        help="Re-run geocoding on every record (overwrite existing). Default: only fill missing lat/lng.",
    )
    parser.add_argument(
        "--fix-cities-only",
        action="store_true",
        help="Only apply city alias lookup (NY→New York City, etc.) and NYC coords fallback. No geocoding.",
    )
    args = parser.parse_args()
    backfill_all = args.backfill_all_records
    fix_cities_only = args.fix_cities_only

    if not CREDENTIALS_PATH.exists():
        print("Error: Service account key not found at", CREDENTIALS_PATH, file=sys.stderr)
        sys.exit(1)
    if not SHEET_ID_PATH.exists():
        print("Error: Sheet ID not found at", SHEET_ID_PATH, file=sys.stderr)
        sys.exit(1)
    if not fix_cities_only and not API_KEY_PATH.exists():
        print("Error: Geocoding API key not found at", API_KEY_PATH, file=sys.stderr)
        sys.exit(1)
    api_key = API_KEY_PATH.read_text().strip() if not fix_cities_only else ""
    spreadsheet_id = SHEET_ID_PATH.read_text().strip()

    creds = service_account.Credentials.from_service_account_file(
        str(CREDENTIALS_PATH),
        scopes=["https://www.googleapis.com/auth/spreadsheets"],
    )
    sheets = build("sheets", "v4", credentials=creds)

    print("Reading Working Copy...", flush=True)
    result = sheets.spreadsheets().values().get(
        spreadsheetId=spreadsheet_id,
        range="'Working Copy'!A:N",
    ).execute()
    rows = result.get("values", [])
    if len(rows) < 2:
        print("No data rows in Working Copy.")
        return

    header = rows[0]
    data_rows = rows[1:]
    n_cols = max(len(r) for r in rows) if rows else 14
    for row in data_rows:
        while len(row) < n_cols:
            row.append("")

    if fix_cities_only:
        print("Applying city alias lookup and NYC fallback...", flush=True)
        changed = normalize_cities(data_rows)
        out_rows = [header] + data_rows
        for row in out_rows:
            while len(row) < n_cols:
                row.append("")
        print("Writing to Working Copy...", flush=True)
        sheets.spreadsheets().values().update(
            spreadsheetId=spreadsheet_id,
            range="'Working Copy'!A1:N",
            valueInputOption="USER_ENTERED",
            body={"values": out_rows},
        ).execute()
        print(f"Done. Fixed {changed} city values.", flush=True)
        return

    # Determine which rows to process
    to_process = []
    for i, row in enumerate(data_rows):
        if is_empty_or_nan(row[WORK_INSTITUTION_COL]) and is_empty_or_nan(row[WORK_ADDRESS_COL]):
            continue
        if backfill_all or not _has_geocoding(row):
            to_process.append(i)

    if not to_process:
        print("No rows need geocoding. (All have lat/lng; use --backfill-all-records to re-run.)")
        return

    mode = "backfill (all records)" if backfill_all else "fill missing only"
    print(f"Geocoding {len(to_process)} rows [{mode}]...", flush=True)
    processed = 0
    skipped = 0
    total = len(to_process)

    bar_width = 30
    for idx, i in enumerate(to_process):
        row = data_rows[i]
        while len(row) <= COUNTRY_COL:
            row.append("")
        inst = row[WORK_INSTITUTION_COL] if len(row) > WORK_INSTITUTION_COL else ""
        addr = row[WORK_ADDRESS_COL] if len(row) > WORK_ADDRESS_COL else ""
        if is_empty_or_nan(inst) and is_empty_or_nan(addr):
            skipped += 1
            continue

        pct = 100 * (idx + 1) / total if total else 0
        filled = int(bar_width * (idx + 1) / total) if total else 0
        bar = "=" * filled + "-" * (bar_width - filled)
        progress = f"[{bar}] {pct:5.1f}% ({idx + 1}/{total})"
        print(f"  {progress} Row {i + 2}...", end=" ", flush=True)
        geo = smart_geocode(inst, addr, api_key)
        row[LAT_COL] = str(geo["lat"]) if geo["lat"] else ""
        row[LNG_COL] = str(geo["lng"]) if geo["lng"] else ""
        row[CITY_COL] = geo["city"]
        row[COUNTRY_COL] = geo["country"]
        processed += 1
        print(f"({geo['lat']}, {geo['lng']}) {geo['city']}, {geo['country']}", flush=True)
        time.sleep(DELAY_BETWEEN_ROWS)

    # Apply city fixes to ALL rows before persist (handles stale "NY" etc. even when not re-geocoded)
    normalize_cities(data_rows)

    # Persist: write entire sheet back (header + data)
    out_rows = [header] + data_rows
    # Pad rows to same length
    for row in out_rows:
        while len(row) < n_cols:
            row.append("")

    print("Writing to Working Copy...")
    sheets.spreadsheets().values().update(
        spreadsheetId=spreadsheet_id,
        range="'Working Copy'!A1:N",
        valueInputOption="USER_ENTERED",
        body={"values": out_rows},
    ).execute()
    print(f"Done. Geocoded {processed} rows, skipped {skipped} empty rows.")


if __name__ == "__main__":
    main()
