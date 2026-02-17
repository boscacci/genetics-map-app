#!/usr/bin/env python3
"""
Clean and validate provider data. Logic originally from notebooks/process_excel_data.ipynb (removed).
Reads Production tab from Google Sheets, applies cleaning, writes back to Production.
No local CSV. For CI: --output-stdout prints cleaned CSV for encrypt step.
Run: python scripts/clean_and_validate.py [--output-stdout]
"""

import argparse
import csv
import io
import re
import sys
from pathlib import Path

import pandas as pd
from google.oauth2 import service_account
from googleapiclient.discovery import build

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
CREDENTIALS_PATH = REPO_ROOT / ".gcp-credentials" / "genetics-map-sa-key.json"
SHEET_ID_PATH = REPO_ROOT / ".gcp-credentials" / "sheet-id.txt"

# credential_link is admin-only; never in public CSV
SHEET_HEADERS = [
    "name_first",
    "name_last",
    "email",
    "phone_work",
    "work_website",
    "work_institution",
    "work_address",
    "language_spoken",
    "uses_interpreters",
    "specialties",
    "Latitude",
    "Longitude",
    "City",
    "Country",
    "credential_link",
]
PUBLIC_HEADERS = [h for h in SHEET_HEADERS if h != "credential_link"]

try:
    import validators
    HAS_VALIDATORS = True
except ImportError:
    HAS_VALIDATORS = False


def _first_valid_email(cell):
    if pd.isnull(cell) or str(cell).strip() == "":
        return None
    for e in str(cell).split(";"):
        e = e.strip().lower().replace(",", "").replace(" ", "")
        if not e:
            continue
        if HAS_VALIDATORS:
            try:
                if validators.email(e):
                    return e
            except Exception:
                continue
        elif "@" in e and "." in e:
            return e
    return None


def clean_emails(df: pd.DataFrame) -> pd.DataFrame:
    emails = (
        df["email"]
        .astype(str)
        .str.strip()
        .str.lower()
        .str.replace(",", "", regex=False)
        .str.replace(" ", "", regex=False)
    )
    df = df.copy()
    df["email"] = emails.apply(_first_valid_email)
    return df


CITY_ALIASES = {"ny": "New York City", "nyc": "New York City"}


def _strip_comment(val) -> str:
    """Remove inline comments (e.g. 'Mexico# Test comment' -> 'Mexico')."""
    if pd.isnull(val):
        return ""
    s = str(val).strip()
    i = s.find("#")
    return s[:i].strip() if i >= 0 else s


def clean_fields(df: pd.DataFrame) -> pd.DataFrame:
    fields = ["name_first", "name_last", "work_institution", "work_address"]
    df = df.copy()
    for col in fields:
        if col not in df.columns:
            continue
        s = df[col].astype(str).str.strip().str.replace(r"\s+", " ", regex=True)
        if col == "work_address":
            s = s.str.replace(r"\n+", ", ", regex=True)
        if col == "name_first":
            s = s.str.replace(".", "", regex=False)
        df[col] = s
    # Country: strip inline comments (e.g. "Mexico# Test" -> "Mexico")
    if "Country" in df.columns:
        df["Country"] = df["Country"].astype(str).apply(_strip_comment)
    # City: NY -> New York City; strip comments
    if "City" in df.columns:
        df["City"] = df["City"].astype(str).apply(_strip_comment)
        df["City"] = df["City"].apply(
            lambda v: CITY_ALIASES.get(v.lower().strip(), v) if v else v
        )
    return df


NON_URL_RESPONSES = {
    "prefer not to say", "not available", "i do not have a work website",
    "none", "na", "n/a", "", "being updated", "retired", "n.a.", "n.a",
}


def clean_website(val):
    if pd.isnull(val):
        return None
    s = str(val).strip().lower().rstrip(" .,/;:\n\t")
    if s in NON_URL_RESPONSES:
        return None
    if ";" in s or "\n" in s:
        s = re.split(r"[;\n]", s)[0].strip().rstrip(" .,/;:\n\t")
    if s in NON_URL_RESPONSES:
        return None
    url_match = re.findall(r"((?:https?://|www\.)[^\s,;]+)", s)
    if url_match:
        url = url_match[0].rstrip(" .,/;:\n\t")
        if url.startswith("www."):
            url = "https://" + url
        return url.rstrip("/")
    domain_pattern = r"^[A-Za-z0-9\-\.]+\.[A-Za-z]{2,}([/\w\-\.\?\=\&\%]*)?$"
    if "." in s and " " not in s:
        if s.startswith(("http://", "https://")):
            return s.rstrip("/")
        if re.match(domain_pattern, s, re.IGNORECASE):
            return "https://" + s.rstrip("/")
    return s if s else None


def clean_phone(val):
    if pd.isnull(val):
        return None
    val_str = str(val).strip()
    if val_str.lower() in ("prefer not to say", "") or val_str.upper() == "#ERROR!":
        return None
    if "/" in val_str:
        parts = [p.strip() for p in val_str.split("/")]
        for part in parts:
            if re.search(r"(\+?\d[\d\s\-\(\)]{5,})", part):
                val_str = part
                break
    val_str = re.sub(r" {2,}", " ", val_str.strip())
    return val_str if val_str else None


INTERPRETER_PATTERNS = [
    r"interpret(er|ation)( services| present| available)?",
    r"with use of", r"with provided interpreter",
    r"others? with (provided )?interpreter( services)?",
    r"all other languages with interpretation services",
    r"we also use interpreters?", r"globo interpreter",
    r"translation", r"interpreter present",
    r"other languages with an interpreter present",
]

LANG_IGNORE = {
    "other", "others", "interpreter", "interpreter present",
    "interpretation", "translation", "services", "provided",
    "available", "languages", "with", "an", "present", "some",
}


def uses_interpreters_func(val):
    if pd.isnull(val):
        return False
    val_str = str(val).lower()
    for pat in INTERPRETER_PATTERNS:
        if re.search(pat, val_str):
            return True
    return False


def clean_languages(val):
    if pd.isnull(val):
        return None
    val = str(val).strip()
    val = re.sub(r"\([^)]*\)", "", val)
    if re.search(r"prefer not to say", val, re.IGNORECASE):
        return None
    val = re.sub(
        r"(all other languages with interpretation services|others? with (provided )?interpreter( services)?|interpretation services available|we also use interpreters?|limited [a-z]+|with use of [A-Za-z ]+|other languages with an interpreter present|interpreter present|translation|globo interpreter)",
        "", val, flags=re.IGNORECASE,
    )
    val = val.strip()
    val = re.sub(r"[;|/]", ",", val).replace("\n", ",")
    val = re.sub(r"(\s+and\s+|\s+&\s+|^and\s+|\s+and$|^&\s+|\s+&$)", ",", val, flags=re.IGNORECASE)
    val = re.sub(r"\.", "", val)
    val = re.sub(r"[^a-zA-Z,\s]", "", val)
    val = re.sub(r"\s+", " ", val)
    val = re.sub(r",+", ",", val).strip(",").strip()
    langs = []
    for chunk in val.split(","):
        chunk = chunk.strip()
        if not chunk:
            continue
        words = chunk.split()
        if len(words) > 1:
            langs.extend(words)
        else:
            langs.append(chunk)
    langs = [l for l in langs if l.lower() not in LANG_IGNORE and l.strip()]
    langs = [l.strip().capitalize() for l in langs]
    seen = set()
    langs_clean = []
    for l in langs:
        if l.lower() not in seen:
            langs_clean.append(l)
            seen.add(l.lower())
    langs_clean = sorted(langs_clean, key=lambda x: x.lower())
    return ", ".join(langs_clean) if langs_clean else None


def _get_sheets_client():
    if not CREDENTIALS_PATH.exists() or not SHEET_ID_PATH.exists():
        raise SystemExit("Need .gcp-credentials/genetics-map-sa-key.json and sheet-id.txt")
    creds = service_account.Credentials.from_service_account_file(
        str(CREDENTIALS_PATH),
        scopes=["https://www.googleapis.com/auth/spreadsheets"],
    )
    return build("sheets", "v4", credentials=creds)


def _read_production_from_sheet(sheets, spreadsheet_id):
    res = sheets.spreadsheets().values().get(
        spreadsheetId=spreadsheet_id,
        range="'Production'!A:O",
    ).execute()
    rows = res.get("values", [])
    if len(rows) < 2:
        return None, pd.DataFrame()
    header_row = rows[0]
    data_rows = rows[1:]
    # Map by position: col i = SHEET_HEADERS[i]
    data = []
    for row in data_rows:
        obj = {}
        for i, h in enumerate(SHEET_HEADERS):
            obj[h] = row[i] if i < len(row) else ""
        data.append(obj)
    df = pd.DataFrame(data, columns=SHEET_HEADERS)
    return header_row, df


def _write_to_production(sheets, spreadsheet_id, header_row, df):
    header = list(header_row) if header_row else SHEET_HEADERS
    while len(header) < len(SHEET_HEADERS):
        header.append("")
    rows = [header]
    for _, r in df.iterrows():
        row = [str(r.get(h, "")) for h in SHEET_HEADERS]
        rows.append(row)
    sheets.spreadsheets().values().update(
        spreadsheetId=spreadsheet_id,
        range="'Production'!A1",
        valueInputOption="USER_ENTERED",
        body={"values": rows},
    ).execute()


def _df_to_csv_string(df):
    """Output CSV for public encrypt step—excludes credential_link (admin-only)."""
    buf = io.StringIO()
    df[PUBLIC_HEADERS].to_csv(buf, index=False, quoting=csv.QUOTE_ALL)
    return buf.getvalue()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-stdout", action="store_true", help="Print cleaned CSV to stdout for encrypt step")
    args = parser.parse_args()

    if not CREDENTIALS_PATH.exists() or not SHEET_ID_PATH.exists():
        print("Error: Need .gcp-credentials/ (workflow creates these from secrets)", file=sys.stderr)
        sys.exit(1)

    creds = service_account.Credentials.from_service_account_file(
        str(CREDENTIALS_PATH),
        scopes=["https://www.googleapis.com/auth/spreadsheets"],
    )
    sheets = build("sheets", "v4", credentials=creds)
    spreadsheet_id = SHEET_ID_PATH.read_text().strip()

    header_row, df = _read_production_from_sheet(sheets, spreadsheet_id)
    if df.empty:
        if args.output_stdout:
            buf = io.StringIO()
            pd.DataFrame(columns=PUBLIC_HEADERS).to_csv(buf, index=False, quoting=csv.QUOTE_ALL)
            sys.stdout.write(buf.getvalue())
        print("Production has no data rows.", file=sys.stderr)
        sys.exit(0)

    for col in SHEET_HEADERS:
        if col not in df.columns:
            df[col] = ""

    df = clean_emails(df)
    df = clean_fields(df)
    if "work_website" in df.columns:
        df["work_website"] = df["work_website"].apply(clean_website)
    if "phone_work" in df.columns:
        df["phone_work"] = df["phone_work"].apply(clean_phone)
    if "language_spoken" in df.columns:
        df["uses_interpreters"] = df["language_spoken"].apply(
            lambda v: "TRUE" if uses_interpreters_func(v) else "FALSE"
        )
        df["language_spoken"] = df["language_spoken"].apply(clean_languages)

    df = df[[c for c in SHEET_HEADERS if c in df.columns]]
    header_for_sheet = header_row if header_row else SHEET_HEADERS
    _write_to_production(sheets, spreadsheet_id, header_for_sheet, df)

    print(f"✅ Cleaned and validated {len(df)} rows → Production tab", file=sys.stderr)

    if args.output_stdout:
        csv_str = _df_to_csv_string(df)
        sys.stdout.write(csv_str)


if __name__ == "__main__":
    main()
