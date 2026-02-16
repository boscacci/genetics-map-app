#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
HOOKS_DIR="$REPO_ROOT_DIR/.git/hooks"
PRE_COMMIT_HOOK="$HOOKS_DIR/pre-commit"
PRE_PUSH_HOOK="$HOOKS_DIR/pre-push"

mkdir -p "$HOOKS_DIR"

# Install pre-commit hook to encrypt data.csv and verify sync
cat > "$PRE_COMMIT_HOOK" <<'HOOK'
#!/bin/sh

# Check if data/data.csv is staged for commit
if git diff --cached --name-only | grep -q "^data/data.csv$"; then
  echo "[pre-commit] data/data.csv changed - encrypting to src/secureDataBlob.ts"
  
  node scripts/process-data.js
  status=$?
  if [ $status -ne 0 ]; then
    echo "[pre-commit] Data encryption failed (exit $status); aborting commit."
    exit $status
  fi
  
  # Stage the updated encrypted blob
  git add src/secureDataBlob.ts
  echo "[pre-commit] Encrypted data staged for commit"
fi

# Check if .secret_env changed - update hash in App.tsx
if git diff --cached --name-only | grep -q "^.secret_env$"; then
  echo "[pre-commit] .secret_env changed - updating hash in App.tsx"
  
  node scripts/hash-secret.js && node scripts/update-app-hash.js
  status=$?
  if [ $status -ne 0 ]; then
    echo "[pre-commit] Hash update failed (exit $status); aborting commit."
    exit $status
  fi
  
  git add src/App.tsx .env.generated
  echo "[pre-commit] Updated hash staged for commit"
fi

# Always verify sync before commit
echo "[pre-commit] Verifying all systems in sync..."
node scripts/verify-sync.js
status=$?
if [ $status -ne 0 ]; then
  echo "[pre-commit] Verification failed (exit $status); aborting commit."
  echo "Run: npm run full-sync"
  exit $status
fi

exit 0
HOOK

chmod +x "$PRE_COMMIT_HOOK"

# Install pre-push hook to sync GitHub secrets
cat > "$PRE_PUSH_HOOK" <<'HOOK'
#!/bin/sh

echo "[pre-push] Syncing GitHub secrets from .secret_env via scripts/sync-secrets.js"

node scripts/sync-secrets.js
status=$?
if [ $status -ne 0 ]; then
  echo "[pre-push] Secret sync failed (exit $status); aborting push."
  exit $status
fi

exit 0
HOOK

chmod +x "$PRE_PUSH_HOOK"

# Install post-merge hook to warn about sync
POST_MERGE_HOOK="$HOOKS_DIR/post-merge"
cat > "$POST_MERGE_HOOK" <<'HOOK'
#!/bin/sh

echo "[post-merge] Verifying system sync after merge..."
node scripts/verify-sync.js 2>/dev/null
status=$?
if [ $status -ne 0 ]; then
  echo ""
  echo "⚠️  WARNING: System out of sync after merge!"
  echo "   Run: npm run full-sync"
  echo ""
fi

exit 0
HOOK

chmod +x "$POST_MERGE_HOOK"

echo "Installed pre-commit hook at $PRE_COMMIT_HOOK"
echo "Installed pre-push hook at $PRE_PUSH_HOOK"
echo "Installed post-merge hook at $POST_MERGE_HOOK"


