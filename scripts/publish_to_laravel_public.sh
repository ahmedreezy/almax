#!/usr/bin/env bash
set -euo pipefail

TARGET_PUBLIC_DIR="${1:-}"
if [[ -z "$TARGET_PUBLIC_DIR" ]]; then
  echo "Usage: $0 /home/farmsnva/almaxpredictions.com/almaxapi/public"
  exit 1
fi

if [[ ! -d "$TARGET_PUBLIC_DIR" ]]; then
  echo "[error] Target public directory not found: $TARGET_PUBLIC_DIR"
  exit 1
fi

echo ""
echo "=========================================="
echo " Vue publish to Laravel public: $(date)"
echo "=========================================="

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

echo "[1/5] Installing Node dependencies..."
npm ci

echo "[2/5] Building production assets..."
npm run build

DIST_DIR="$APP_DIR/dist"
if [[ ! -f "$DIST_DIR/index.html" ]]; then
  echo "[error] Build did not produce dist/index.html"
  exit 1
fi

BACKUP_DIR="$TARGET_PUBLIC_DIR/.frontend_backup_$(date +%Y%m%d_%H%M%S)"
echo "[3/5] Backing up current frontend files to $BACKUP_DIR ..."
mkdir -p "$BACKUP_DIR"
if [[ -f "$TARGET_PUBLIC_DIR/index.html" ]]; then cp "$TARGET_PUBLIC_DIR/index.html" "$BACKUP_DIR/"; fi
if [[ -d "$TARGET_PUBLIC_DIR/js" ]]; then cp -R "$TARGET_PUBLIC_DIR/js" "$BACKUP_DIR/"; fi
if [[ -d "$TARGET_PUBLIC_DIR/css" ]]; then cp -R "$TARGET_PUBLIC_DIR/css" "$BACKUP_DIR/"; fi
if [[ -d "$TARGET_PUBLIC_DIR/img" ]]; then cp -R "$TARGET_PUBLIC_DIR/img" "$BACKUP_DIR/"; fi
if [[ -d "$TARGET_PUBLIC_DIR/fonts" ]]; then cp -R "$TARGET_PUBLIC_DIR/fonts" "$BACKUP_DIR/"; fi
if [[ -d "$TARGET_PUBLIC_DIR/assets" ]]; then cp -R "$TARGET_PUBLIC_DIR/assets" "$BACKUP_DIR/"; fi

echo "[4/5] Copying new dist files into Laravel public ..."
rm -rf "$TARGET_PUBLIC_DIR/js" "$TARGET_PUBLIC_DIR/css" "$TARGET_PUBLIC_DIR/img" "$TARGET_PUBLIC_DIR/fonts" "$TARGET_PUBLIC_DIR/assets"
rm -f "$TARGET_PUBLIC_DIR/index.html" "$TARGET_PUBLIC_DIR/favicon.ico"
cp -R "$DIST_DIR"/* "$TARGET_PUBLIC_DIR"/

echo "[5/5] Publish complete."
echo ""
echo "Next: run backend deploy script so Laravel caches are warm:"
echo "  bash /home/farmsnva/almaxpredictions.com/almaxapi/scripts/deploy_cpanel.sh"
echo "=========================================="
