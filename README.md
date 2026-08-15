# Genetics Map App

A React + TypeScript app for displaying genetic professionals worldwide.

## 🌍 What is this?
This app provides an interactive map and directory of genetic professionals from around the world. You can browse, search, and explore the data in a user-friendly interface.

## ✨ Features
- Interactive world map of genetic professionals
- Search and filter by region or specialty
- Google Sheet as data source; GitHub Actions for promote, clean, encrypt, deploy
- Clean, approachable interface
- Secure authentication via URL key

## 🧩 Tech Stack
- React
- TypeScript
- PapaParse (for CSV parsing)
- CryptoJS (for AES encryption)

## 📁 Project Structure

```
├── data/           # CSV inputs (data.csv), Excel exports
├── docs/            # _AUTOMATION_PLAN, SETUP, ADMIN_GUIDE, REFERENCE
├── scripts/         # Build scripts (process-data, hash-secret, etc.)
├── src/             # React app source
└── public/          # Static assets
```

## 🔐 Authentication & Security

This app uses a key-based authentication system to protect the genetic counselor data:

### Accessing the App

**Local Development:**
```
http://localhost:3000?key=YOUR_SECRET_KEY
```

**GitHub Pages (Production):**
```
https://boscacci.github.io/genetics-map-app?key=YOUR_SECRET_KEY
```

Replace `YOUR_SECRET_KEY` with the actual key from your `.secret_env` file. The key in the URL is hashed with SHA-256 and compared against a stored hash. If it matches, the key is used to decrypt the AES-encrypted data blob.

## 🔄 Development Workflow

**Pipeline runs only in GitHub Actions** (no local Node for scripts/deploy). See `docs/SETUP.md`.

- **Data entry:** Google Sheet Working Copy tab
- **Automatic data publish:** Refresh Map Data workflow (every 4 hours or manual trigger)
- **Application release:** SemVer tag, CI provenance check, and production approval

### Secret Management

The `.secret_env` file contains your authentication key:
```
REACT_APP_SECRET_KEY=your-secret-passphrase-here
```

This file is:
- Gitignored for security
- Used locally to encrypt/decrypt data
- Automatically synced to GitHub Secrets on push
- Used by GitHub Actions to generate the authentication hash

## 🚀 Deployment

Code merged to `main` is validated but not published directly. A SemVer release tag selects the tested commit, and the protected Sync and Deploy workflow waits for production approval before publishing it.

Sheet edits follow a separate data-only path. Refresh Map Data runs every four hours (or on demand), geocodes and validates Working Copy, promotes it to Production, and rebuilds only with the exact application release already deployed to Pages. It will not pull unreleased code from `main`.

No sensitive data (CSV or secret key) is exposed - only the encrypted blob and hash are in the deployed app.

## 🗺️ Architecture diagram

See `docs/REFERENCE.md` for pipeline overview, secrets, and architecture.

---

This project was created in Cursor as a way to learn React and TypeScript from scratch. While it may not be perfect, it represents a genuine effort to make genetic professional data more accessible and visually engaging.
