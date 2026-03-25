# Publishing the Lexical Accessibility Fork

This document explains how we publish our accessibility-enhanced Lexical fork and why we chose this approach.

## Why GitHub Releases (Not npm Registry)

We chose GitHub Releases with tarballs instead of publishing to npm because:

1. **No token setup required** - Collaborators don't need npm tokens or registry configuration
2. **Simple installation** - Anyone clones the project, runs `npm install`, and it just works
3. **No registry conflicts** - We don't risk name collisions with the official Lexical packages
4. **Easy to share** - Just update package.json URLs, no authentication needed
5. **Quick setup** - We can publish immediately without npm organization setup

### Trade-offs

- **Manual URL updates** - When we release a new version, consuming projects must update their package.json URLs
- **No semver resolution** - npm won't automatically pick compatible versions; URLs are explicit
- **Larger package.json** - Full URLs instead of version strings

## Versioning Scheme

Format: `v{upstream-version}-a11y.{increment}`

Example: `v0.38.2-a11y.2`

- `0.38.2` - The upstream Lexical version we forked from (important for compatibility)
- `-a11y` - Identifies this as the accessibility fork
- `.1` - Our increment number (bump to `.2`, `.3` as we make updates)

### When to bump versions

- `.1` → `.2` - New accessibility features or bug fixes
- `0.38.2` → `0.39.0` - When rebasing to a newer upstream Lexical version

## How to Publish a New Release

### Prerequisites

- GitHub CLI (`gh`) installed and authenticated with workflow scope
- Node.js and npm installed

### Step 1: Build and Pack (Single Command)

Run the pack script from the lexical-fork root:

```bash
bash pack-releases.sh
```

This script does everything:
1. Cleans stale build artifacts (prevents TS errors)
2. Runs production build (`npm run build -- --prod --release`)
3. Copies dist files to package roots (required for npm pack)
4. Creates .tgz files in the `releases/` directory

**Important:** The script handles the build - you don't need to run `npm run build` separately.

### Step 2: Delete Old Release (if updating same version)

```bash
gh release delete v0.38.2-a11y.2 --repo Electro-Jam-Instruments/lexical -y
```

### Step 3: Create the GitHub Release

```bash
gh release create v0.38.2-a11y.2 \
  --title "Lexical v0.38.2 - Accessibility Fork #1" \
  --notes "Description of changes" \
  --repo Electro-Jam-Instruments/lexical \
  releases/*.tgz
```

### Step 4: Update consuming projects

Update the package.json in projects that use this fork (see URL format below).

Then in the consuming project:
```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### Step 5: Verify installation

After installing in consuming projects, verify the versions are correct:
```bash
bash verify-lexical-versions.sh v0.38.2-a11y.12
```

See the "Verifying Installed Versions" section below for details.

## PR Description Best Practices

When creating PRs to update consuming projects to a new fork version, include these details:

### Required in PR Title
```
Update Lexical fork to v0.38.2-a11y.X
```

### Required in PR Body
```markdown
## Version Update
- **Previous version:** v0.38.2-a11y.X
- **New version:** v0.38.2-a11y.Y
- **Release URL:** https://github.com/Electro-Jam-Instruments/lexical/releases/tag/v0.38.2-a11y.Y

## Changes in This Release
- [List key changes from the release notes]

## Verification Checklist
- [ ] All package.json URLs updated to new version tag
- [ ] Clean install completed (rm -rf node_modules && npm install)
- [ ] Ran `bash verify-lexical-versions.sh v0.38.2-a11y.Y`
- [ ] App builds without errors
- [ ] App runs and accessibility features work

## Files Changed
- package.json (updated X lexical package URLs)
```

### Why This Matters
- Explicit version changes prevent confusion about what's being updated
- Release URL makes it easy to review what's new
- Verification checklist ensures the update was applied correctly
- Future developers can trace back to specific releases

## Verifying Installed Versions

After updating consuming projects, verify the installation is correct.

### Quick Verification
Check that package.json URLs all point to the same version tag:
```bash
grep "lexical/releases/download" package.json | head -5
```

All URLs should show the same version (e.g., `v0.38.2-a11y.12`).

### Automated Verification Script

Copy `verify-lexical-versions.sh` to your consuming project and run:
```bash
bash verify-lexical-versions.sh v0.38.2-a11y.12
```

The script checks:
1. All package.json URLs use the expected version tag
2. All node_modules packages are actually installed
3. Package versions in node_modules match expectations

### Manual Verification
```bash
# Check installed package version
cat node_modules/lexical/package.json | grep version

# Check @lexical/accessibility has expected exports
ls node_modules/@lexical/accessibility/

# Test import works
node -e "const lex = require('lexical'); console.log('lexical loaded')"
```

## Troubleshooting

### GitHub CLI Auth Errors

If you get "workflow scope may be required":

```bash
gh auth logout
gh auth login -h github.com -p https -w
```

Follow the browser prompts to authorize with workflow scope.

### TypeScript Build Errors

If you see TS errors about "inaccessible 'this' type" in dist files, these are stale build artifacts. The pack script cleans known problem directories, but if you see new ones:

```bash
rm -rf packages/PACKAGE_NAME/dist
rm -f packages/PACKAGE_NAME/*.dev.js packages/PACKAGE_NAME/*.prod.js
```

Then run `bash pack-releases.sh` again.

### Missing Files in Packages

The Lexical build outputs to `packages/*/dist/` but package.json expects files in the package root. The pack script handles this by copying dist contents to the package root before packing.

If packages are missing `.dev.mjs`, `.prod.mjs`, or `.d.ts` files, the build didn't complete or copy step failed.

## Package.json URL Format

Replace `v0.38.2-a11y.6` with your release tag:

```json
{
  "dependencies": {
    "lexical": "https://github.com/Electro-Jam-Instruments/lexical/releases/download/v0.38.2-a11y.6/lexical-0.38.2.tgz",
    "@lexical/accessibility": "https://github.com/Electro-Jam-Instruments/lexical/releases/download/v0.38.2-a11y.6/lexical-accessibility-0.38.2.tgz",
    "@lexical/react": "https://github.com/Electro-Jam-Instruments/lexical/releases/download/v0.38.2-a11y.6/lexical-react-0.38.2.tgz",
    "@lexical/rich-text": "https://github.com/Electro-Jam-Instruments/lexical/releases/download/v0.38.2-a11y.6/lexical-rich-text-0.38.2.tgz",
    "@lexical/table": "https://github.com/Electro-Jam-Instruments/lexical/releases/download/v0.38.2-a11y.6/lexical-table-0.38.2.tgz",
    "@lexical/selection": "https://github.com/Electro-Jam-Instruments/lexical/releases/download/v0.38.2-a11y.6/lexical-selection-0.38.2.tgz",
    "@lexical/utils": "https://github.com/Electro-Jam-Instruments/lexical/releases/download/v0.38.2-a11y.6/lexical-utils-0.38.2.tgz",
    "@lexical/clipboard": "https://github.com/Electro-Jam-Instruments/lexical/releases/download/v0.38.2-a11y.6/lexical-clipboard-0.38.2.tgz",
    "@lexical/code": "https://github.com/Electro-Jam-Instruments/lexical/releases/download/v0.38.2-a11y.6/lexical-code-0.38.2.tgz",
    "@lexical/history": "https://github.com/Electro-Jam-Instruments/lexical/releases/download/v0.38.2-a11y.6/lexical-history-0.38.2.tgz",
    "@lexical/html": "https://github.com/Electro-Jam-Instruments/lexical/releases/download/v0.38.2-a11y.6/lexical-html-0.38.2.tgz",
    "@lexical/image": "https://github.com/Electro-Jam-Instruments/lexical/releases/download/v0.38.2-a11y.6/lexical-image-0.38.2.tgz",
    "@lexical/link": "https://github.com/Electro-Jam-Instruments/lexical/releases/download/v0.38.2-a11y.6/lexical-link-0.38.2.tgz",
    "@lexical/list": "https://github.com/Electro-Jam-Instruments/lexical/releases/download/v0.38.2-a11y.6/lexical-list-0.38.2.tgz",
    "@lexical/markdown": "https://github.com/Electro-Jam-Instruments/lexical/releases/download/v0.38.2-a11y.6/lexical-markdown-0.38.2.tgz",
    "@lexical/offset": "https://github.com/Electro-Jam-Instruments/lexical/releases/download/v0.38.2-a11y.6/lexical-offset-0.38.2.tgz",
    "@lexical/text": "https://github.com/Electro-Jam-Instruments/lexical/releases/download/v0.38.2-a11y.6/lexical-text-0.38.2.tgz"
  }
}
```

## Packages Included

All 17 packages (15 core + 2 accessibility):

| Package | Description |
|---------|-------------|
| lexical | Core editor |
| @lexical/accessibility | Screen reader announcements, format detection |
| @lexical/image | ImageNode, ImagesPlugin, DragDropPastePlugin |
| @lexical/react | React bindings |
| @lexical/rich-text | Rich text support |
| @lexical/table | Table support (with a11y enhancements) |
| @lexical/selection | Selection utilities |
| @lexical/utils | General utilities |
| @lexical/clipboard | Clipboard handling |
| @lexical/code | Code block support |
| @lexical/history | Undo/redo |
| @lexical/html | HTML import/export |
| @lexical/link | Link support |
| @lexical/list | List support |
| @lexical/markdown | Markdown support |
| @lexical/offset | Offset utilities |
| @lexical/text | Text utilities |

## Release History

| Version | Date | Changes |
|---------|------|---------|
| v0.42.0-a11y.1 | 2026-03-25 | Upstream rebase to Lexical 0.42.0. Shared navigation flag in LexicalUpdateTags blocks ALL selection overwrites during arrow nav (fixes React re-render bypass). AccessibleTextNode transform guard during navigation. |
| v0.40.0-a11y.6 | 2026-03-01 | MutationObserver flushMutations guard: prevent selection revert during arrow navigation. Reverted a11y.5 format preservation (caused timebomb). |
| v0.40.0-a11y.5 | 2026-03-01 | Format/style preservation during arrow navigation (REVERTED in a11y.6 — created deferred format mismatch) |
| v0.40.0-a11y.4 | 2026-03-01 | IP bounce fix: arrow key flag persists across transform-triggered re-commits via setTimeout, added SKIP_SCROLL_INTO_VIEW_TAG |
| v0.40.0-a11y.3 | 2026-02-28 | IP jumping fixes: selectionchange two-stage writeback prevention, SKIP_DOM_SELECTION_TAG for L/R arrows, table exit rect detection improvement |
| v0.40.0-a11y.2 | 2026-02-23 | Upstream rebase to Lexical 0.40.0 |
| v0.40.0-a11y.1 | 2026-02-22 | Initial 0.40.0 accessibility fork |
| v0.39.0-a11y.1 | 2026-01-19 | Upstream rebase to Lexical 0.39.0 |
| v0.38.2-a11y.12 | 2024-12-13 | Built-in emoji list (100 common emojis), EmojiPickerPlugin works out of box |
| v0.38.2-a11y.11 | 2024-12-13 | EmojiNode, EmojisPlugin, EmojiPickerPlugin moved to accessibility package |
| v0.38.2-a11y.6 | 2024-12-09 | ACCESSIBILITY_TRANSFORMERS with HR support, SUPPRESS_A11Y_ANNOUNCEMENTS_TAG for bulk operations, documentation updates |
| v0.38.2-a11y.5 | 2024-12-07 | Smart paste-as-markdown with content preservation, cursor positioning at end of paste, @lexical/image package |
| v0.38.2-a11y.4 | 2024-12-07 | @lexical/image package added, image paste handling |
| v0.38.2-a11y.3 | 2024-12-07 | Paste fix: preserve existing content when pasting markdown |
| v0.38.2-a11y.2 | 2024-12-06 | Initial release: Table context menu keyboard accessibility, dropdown submenu navigation, @lexical/accessibility package |

## Future Considerations

If this fork becomes widely used, we may consider:

1. **Private npm registry** - For better version management
2. **Scoped npm packages** - e.g., `@electro-jam/lexical`
3. **Upstream contribution** - Submit PRs to official Lexical repo
