#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
HOOKS_DIR="$REPO_ROOT_DIR/.git/hooks"
PRE_COMMIT_HOOK="$HOOKS_DIR/pre-commit"
PRE_PUSH_HOOK="$HOOKS_DIR/pre-push"

mkdir -p "$HOOKS_DIR"

# Install pre-commit hook to encrypt data.csv
cat > "$PRE_COMMIT_HOOK" <<'HOOK'
#!/bin/sh

# Check if data.csv is staged for commit
if git diff --cached --name-only | grep -q "^data.csv$"; then
  echo "[pre-commit] data.csv changed - encrypting to src/secureDataBlob.ts"
  
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

echo "Installed pre-commit hook at $PRE_COMMIT_HOOK"
echo "Installed pre-push hook at $PRE_PUSH_HOOK"


