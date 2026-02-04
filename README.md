# Genetics Map App

A React + TypeScript app for displaying genetic professionals worldwide.

## 🌍 What is this?
This app provides an interactive map and directory of genetic professionals from around the world. You can browse, search, and explore the data in a user-friendly interface.

## ✨ Features
- Interactive world map of genetic professionals
- Search and filter by region or specialty
- Simple CSV-based data import with automatic encryption
- Clean, approachable interface
- Secure authentication via URL key

## 🧩 Tech Stack
- React
- TypeScript
- PapaParse (for CSV parsing)
- CryptoJS (for AES encryption)

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

### Initial Setup

1. Install Git hooks:
```bash
npm run setup:hooks
```

This installs:
- **Pre-commit hook**: Automatically encrypts `data.csv` into `src/secureDataBlob.ts` when you commit changes
- **Pre-push hook**: Automatically syncs `.secret_env` key to GitHub Secrets

### Working with Data

1. Edit `data.csv` locally (this file is gitignored)
2. Commit your changes - the pre-commit hook automatically:
   - Encrypts `data.csv` using the key from `.secret_env`
   - Generates `src/secureDataBlob.ts` with the encrypted data
   - Stages the encrypted blob for commit
3. Push to GitHub - the pre-push hook automatically:
   - Reads `REACT_APP_SECRET_KEY` from `.secret_env`
   - Updates the GitHub repository secret via GitHub CLI

### Manual Operations

**Manually encrypt data:**
```bash
npm run encrypt-data
```

**Manually sync GitHub secrets:**
```bash
npm run sync-secrets
```
Requires:
- GitHub CLI (`gh`) to be installed
- Authentication with GitHub CLI (`gh auth login`)

**Prepare everything locally:**
```bash
npm run prepare-local
```

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

When you push to `main`:
1. GitHub Actions checkout the repository (with pre-encrypted `src/secureDataBlob.ts`)
2. Generates the SECRET_HASH from the GitHub Secret
3. Updates `App.tsx` with the hash
4. Builds the React app
5. Deploys to GitHub Pages

No sensitive data (CSV or secret key) is exposed - only the encrypted blob and hash are in the deployed app.

## 🗺️ Architecture diagram

See `docs/architecture.md` for a graphical view of the full pipeline (Excel/Sheets ingestion → cleaning/geocoding → encryption → CI build → GitHub Pages) and the runtime auth/decryption flow.

---

This project was created in Cursor as a way to learn React and TypeScript from scratch. While it may not be perfect, it represents a genuine effort to make genetic professional data more accessible and visually engaging.