# Genetics Map: Reference

Pipeline overview, secrets, backup, and cost transfer checklist.

---

## Pipeline Flow

```
Google Sheet (Working Copy + Production)
    ↓ Geocode (fill missing lat/lng)
    ↓ Promote (WC → Production, name/phone cleanup)
    ↓ Clean & validate (pandas, writes back to Production)
    ↓ Backup (3 Drive sheets: 2d, 1w, 3w)
    ↓ Encrypt (AES → secureDataBlob.ts)
    ↓ Build (React)
    ↓ Deploy (GitHub Pages)
→ Live map
```

**Workflows:** **Promote Only** runs steps 1–4 (Geocode through Backup); Production is updated but no deploy. **Sync and Deploy** runs the full pipeline and publishes to the live site (scheduled every 4h or manual).

| Step | Script | Input | Output |
|------|--------|-------|--------|
| Geocode | `geocode_working_copy.py` | Working Copy | lat/lng/city/country to WC |
| Promote | `promote-to-production.js` | WC, Production | Production |
| Clean | `clean_and_validate.py` | Production | Production + CSV |
| Backup | `backup-production.js` | Production | 3 Drive sheets |
| Encrypt | `process-data.js` | CSV | secureDataBlob.ts |
| Build | react-scripts | source + blob | build/ |
| Deploy | gh-pages | build/ | GitHub Pages |

---

## Secrets

| Secret | Purpose |
|--------|---------|
| `GCP_SA_KEY` | Base64 of service account JSON (Sheets + Drive) |
| `SHEET_ID` | Google Sheet ID |
| `REACT_APP_SECRET_KEY` | AES key; must match `?key=` in map URL |
| `BACKUP_FOLDER_ID` | Drive folder for backup sheets. Optional. |
| `GEOCODING_API_KEY` | Geocoding API. Optional. |
| `SMTP_USERNAME`, `SMTP_PASSWORD` | Failure email notifications. Optional. |

---

## Backup

Three separate Google Sheet files in a Drive folder:

| File | Refresh |
|------|---------|
| Genetics Map Backup (2 days ago) | Every run |
| Genetics Map Backup (1 week ago) | Every 7th run |
| Genetics Map Backup (3 weeks ago) | Every 21st run |

---

## Data Model (Production)

Columns: name_first, name_last, email, phone_work, work_website, work_institution, work_address, language_spoken, uses_interpreters, specialties, Latitude, Longitude, City, Country, credential_link. Public CSV excludes `credential_link`.

---

## Cost Transfer Checklist

**Purpose:** Transfer operational costs and document ownership.

### Items to transfer

1. **Squarespace** — Identify plan/cost; transfer billing and admin login
2. **Domain** — Registrar, renewal date; transfer or update billing
3. **Google Cloud (Geocoding API)** — ~$0.05–0.25/mo; transfer billing; service account stays

### Logins & access

| System | Action |
|--------|--------|
| GitHub repo | Add collaborator if needed for Run workflow |
| Google Sheet | No change (Monisha + service account) |
| GCP Console | Document or transfer ownership |
| Squarespace, Domain | Transfer |

### Handoff notes

- Two-week monitoring and email support post-launch
- Promote Only: stage changes without publishing
- Sync and Deploy: publish to live site
