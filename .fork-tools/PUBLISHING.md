# Publishing the Lexical ship branch

The apps install one set of packages, from one branch.

## What lives where

- Feature work stays on its own branch off current Lexical, and goes upstream as its own pull request.
- `a11y-ship` is the only branch we pack. It is current Lexical, plus the pull requests that are not merged yet, plus the two packages that are ours: `@lexical/accessibility` and `@lexical/image`.
- `@lexical/accessibility` is the package we keep. The other private packages go away once those pull requests are in an official Lexical release and the apps can depend on normal version numbers.
- The old lines `a11y-on-v0.42.0` and `a11y-on-v0.49.0` are history. Do not pack them.

## Version

The tag is `v{Lexical version}-a11y.{n}`.

`v0.53.0-a11y.1` still sends unnamed packages to the public registry. Do not point an app at it. `v0.53.0-a11y.2` is the first pack where every Lexical dependency is a file in that same release.

## Pack

From `a11y-ship`, pass the tag you are about to create:

```bash
bash .fork-tools/pack-releases.sh v0.53.0-a11y.2
```

The script refuses to run on any other branch. It writes each `lexical` and `@lexical/*` dependency as a tarball URL for that tag, packs, checks those URLs, then puts `workspace:*` back.

```bash
gh release create v0.53.0-a11y.2 \
  --repo Electro-Jam-Instruments/lexical \
  --target a11y-ship \
  --title "Lexical v0.53.0-a11y.2" \
  releases/*.tgz
```

Push `a11y-ship` to `origin` (Electro-Jam-Instruments/lexical) before the release. Do not push it to upstream.

## Point an app at the pack

An app lists only the packages it imports. The rest follow this release, because each tarball depends on the other tarballs in the same tag.

```
https://github.com/Electro-Jam-Instruments/lexical/releases/download/v0.53.0-a11y.2/lexical-0.53.0.tgz
```

The tarball name is the package directory name plus the version. `@lexical/accessibility` is `lexical-accessibility-0.53.0.tgz`.

Then, in the app:

```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

Windows npm can hide an `EUNSUPPORTEDPROTOCOL` error. If install fails, try one tarball on its own before changing the app.

## When a pull request merges

Rebase `a11y-ship` onto the new Lexical, drop the patch that merged, and pack the next tag. When nothing of ours is left except `@lexical/accessibility` and `@lexical/image`, the apps can take official Lexical from npm and those two packages from us.
