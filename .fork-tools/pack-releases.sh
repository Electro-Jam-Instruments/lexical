#!/bin/bash
# Script to build and pack all Lexical packages for GitHub release
#
# LAYOUT NOTE (v0.49.0+):
# Upstream PR #8554 ("Publish packages from their root directory") changed the
# publish layout. Packages now ship their build output in `dist/`, and each
# package.json points `main`/`module`/`exports` at `./dist/...` with a
# `files: ["dist", "src", ...]` allowlist. The old Step 3 that copied
# `dist/*` up into the package root is therefore GONE — doing that now would
# duplicate every bundle into the tarball.

set -e

TAG="$1"
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "a11y-ship" ]; then
  echo "Refusing to pack from '$BRANCH'."
  echo "Check out a11y-ship. That is the only branch we publish."
  exit 1
fi
if [ -z "$TAG" ]; then
  echo "Usage: bash .fork-tools/pack-releases.sh <release-tag>"
  echo "Example: bash .fork-tools/pack-releases.sh v0.53.0-a11y.2"
  exit 1
fi

echo "========================================"
echo "Lexical ship branch - Build & Pack"
echo "========================================"

# Packages shipped in our releases: the transitive closure of everything the
# consuming project pulls in via @lexical/accessibility and @lexical/image.
PACKAGES=(
  "lexical"
  "lexical-a11y"
  "lexical-accessibility"
  "lexical-clipboard"
  "lexical-code"
  "lexical-code-core"
  "lexical-code-prism"
  "lexical-code-shiki"
  "lexical-devtools-core"
  "lexical-dragon"
  "lexical-extension"
  "lexical-hashtag"
  "lexical-history"
  "lexical-html"
  "lexical-image"
  "lexical-internal"
  "lexical-link"
  "lexical-list"
  "lexical-mark"
  "lexical-markdown"
  "lexical-offset"
  "lexical-overflow"
  "lexical-plain-text"
  "lexical-react"
  "lexical-rich-text"
  "lexical-selection"
  "lexical-table"
  "lexical-text"
  "lexical-utils"
  "lexical-yjs"
)

restore_packages() {
  for pkg in "${PACKAGES[@]}"; do
    git checkout -- "packages/$pkg/package.json" 2>/dev/null || true
  done
}
trap restore_packages EXIT

# Step 1: Clean stale build artifacts
# Stale dist folders and leftover root-level bundles from the pre-v0.49 flat
# layout cause "inaccessible 'this' type" (TS2527) errors during the build.
echo ""
echo "Step 1: Cleaning stale build artifacts..."
for pkg in "${PACKAGES[@]}"; do
  PKG_DIR="packages/$pkg"
  [ -d "$PKG_DIR" ] || continue
  rm -rf "$PKG_DIR/dist"
  # Leftovers from the old flat layout (pre-v0.49.0) sitting at the package root.
  # Guarded by git: only remove what is NOT tracked, so we never delete the
  # committed CommonJS entry shim (e.g. packages/lexical/Lexical.js).
  for f in "$PKG_DIR"/*.dev.js "$PKG_DIR"/*.prod.js "$PKG_DIR"/*.dev.mjs \
           "$PKG_DIR"/*.prod.mjs "$PKG_DIR"/*.node.mjs "$PKG_DIR"/*.d.ts; do
    [ -e "$f" ] || continue
    git ls-files --error-unmatch "$f" >/dev/null 2>&1 || rm -f "$f"
  done
done

# Step 2: Run production build
echo ""
echo "Step 2: Running production build..."
npm run build -- --prod --release

# Step 3: Point lexical dependencies at this release.
# A plain version such as "0.53.0" is fetched from the public registry.
# The URL has to be the tarball in the tag we are about to publish.
echo ""
echo "Step 3: Pointing lexical dependencies at $TAG..."
MONOREPO_VERSION=$(node -e "console.log(require('./package.json').version)")
echo "  Monorepo version: $MONOREPO_VERSION"

for pkg in "${PACKAGES[@]}"; do
  PKG_JSON="packages/$pkg/package.json"
  if [ -f "$PKG_JSON" ]; then
    node .fork-tools/release-deps.mjs rewrite "$TAG" "$MONOREPO_VERSION" "$PKG_JSON"
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
    if [ ! -d "$PKG_DIR/dist" ]; then
      echo "  ERROR: $PKG_DIR/dist missing - build did not produce output for $pkg"
      exit 1
    fi
    echo "  Packing $pkg..."
    (cd "$PKG_DIR" && npm pack --pack-destination "../../$RELEASE_DIR" >/dev/null)
  else
    echo "  WARNING: $PKG_DIR not found, skipping"
  fi
done

# The packed package.json must not still name a public lexical version,
# and every URL must be a tarball this run just wrote.
echo ""
echo "Step 4b: Checking packed dependencies..."
node .fork-tools/release-deps.mjs check "$TAG" "$MONOREPO_VERSION" "$RELEASE_DIR"

# Step 5: Restore workspace:* in package.json files
# Undo the URL rewrite so source files stay clean for git
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
echo "Next steps (see .fork-tools/PUBLISHING.md):"
echo "  gh release create $TAG \\"
echo "    --repo Electro-Jam-Instruments/lexical \\"
echo "    --target a11y-ship \\"
echo "    --title \"Lexical $TAG\" \\"
echo "    releases/*.tgz"
