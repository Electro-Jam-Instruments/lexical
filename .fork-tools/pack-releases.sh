#!/bin/bash
# Script to build and pack all Lexical packages for GitHub release

set -e

echo "========================================"
echo "Lexical Accessibility Fork - Build & Pack"
echo "========================================"

# Step 1: Clean stale dist folders and bundle files that cause TS errors
# These accumulate and cause "inaccessible 'this' type" errors during build
echo ""
echo "Step 1: Cleaning stale build artifacts..."
rm -rf packages/lexical-extension/dist packages/lexical-list/dist packages/lexical-overflow/dist
# Clean stale bundle files from lexical-list (common source of TS2527 errors)
rm -f packages/lexical-list/*.dev.js packages/lexical-list/*.prod.js
rm -f packages/lexical-list/*.dev.mjs packages/lexical-list/*.prod.mjs

# Step 2: Run production build
echo ""
echo "Step 2: Running production build..."
npm run build -- --prod --release

# Step 3: Copy dist files to package roots (required for npm pack)
echo ""
echo "Step 3: Copying dist files to package roots..."

PACKAGES=(
  "lexical"
  "lexical-accessibility"
  "lexical-clipboard"
  "lexical-code"
  "lexical-history"
  "lexical-html"
  "lexical-image"
  "lexical-link"
  "lexical-list"
  "lexical-markdown"
  "lexical-offset"
  "lexical-react"
  "lexical-rich-text"
  "lexical-selection"
  "lexical-table"
  "lexical-text"
  "lexical-utils"
)

for pkg in "${PACKAGES[@]}"; do
  PKG_DIR="packages/$pkg"
  if [ -d "$PKG_DIR/dist" ]; then
    echo "  Copying dist files for $pkg..."
    cp -r "$PKG_DIR/dist/"* "$PKG_DIR/"
  fi
done

# Step 3b: Resolve workspace:* in package.json dependencies
# npm pack does NOT resolve workspace:* protocol - consuming projects
# outside the monorepo will get EUNSUPPORTEDPROTOCOL errors.
# Read the monorepo version and replace all workspace:* references.
echo ""
echo "Step 3b: Resolving workspace:* dependencies..."
MONOREPO_VERSION=$(node -e "console.log(require('./package.json').version)")
echo "  Monorepo version: $MONOREPO_VERSION"

for pkg in "${PACKAGES[@]}"; do
  PKG_JSON="packages/$pkg/package.json"
  if [ -f "$PKG_JSON" ]; then
    if grep -q '"workspace:\*"' "$PKG_JSON"; then
      echo "  Resolving workspace:* in $pkg -> $MONOREPO_VERSION"
      sed -i 's/"workspace:\*"/"'"$MONOREPO_VERSION"'"/g' "$PKG_JSON"
    fi
  fi
done

# Step 4: Pack all packages
echo ""
echo "Step 4: Packing packages..."
RELEASE_DIR="releases"
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"

for pkg in "${PACKAGES[@]}"; do
  PKG_DIR="packages/$pkg"
  if [ -d "$PKG_DIR" ]; then
    echo "  Packing $pkg..."
    cd "$PKG_DIR"
    npm pack --pack-destination "../../$RELEASE_DIR" 2>/dev/null
    cd ../..
  else
    echo "  WARNING: $PKG_DIR not found, skipping"
  fi
done

# Step 5: Restore workspace:* in package.json files
# Undo the version resolution so source files stay clean for git
echo ""
echo "Step 5: Restoring workspace:* in package.json files..."
for pkg in "${PACKAGES[@]}"; do
  PKG_JSON="packages/$pkg/package.json"
  if [ -f "$PKG_JSON" ]; then
    git checkout -- "$PKG_JSON" 2>/dev/null || true
  fi
done

echo ""
echo "========================================"
echo "Build & Pack Complete!"
echo "========================================"
echo ""
echo "Packed files:"
ls -la "$RELEASE_DIR"/*.tgz

echo ""
echo "Total packages: $(ls "$RELEASE_DIR"/*.tgz | wc -l)"
echo ""
echo "Next steps:"
echo "1. Delete old release: gh release delete v0.38.2-a11y.1 --repo Electro-Jam-Instruments/lexical -y"
echo "2. Create new release: gh release create v0.38.2-a11y.2 --title \"...\" --notes \"...\" --repo Electro-Jam-Instruments/lexical releases/*.tgz"
