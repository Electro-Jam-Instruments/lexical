# Publishing the Lexical ship branch

The apps install one set of packages, from one branch.

## What lives where

- Feature work stays on its own branch off current Lexical, and goes upstream as its own pull request.
- `a11y-ship` is the only branch we pack. It is current Lexical, plus the pull requests that are not merged yet, plus the two packages that are ours: `@lexical/accessibility` and `@lexical/image`.
- `@lexical/accessibility` is the package we keep. The other private packages go away once those pull requests are in an official Lexical release and the apps can depend on normal version numbers.
- The old lines `a11y-on-v0.42.0` and `a11y-on-v0.49.0` are history. Do not pack them.

## Version

The tag is `v{Lexical version}-a11y.{n}`.

The first pack of Lexical 0.53.0 is `v0.53.0-a11y.1`. The next pack of the same Lexical version is `v0.53.0-a11y.2`.

## Pack

From `a11y-ship`:

```bash
bash .fork-tools/pack-releases.sh
```

The script refuses to run on any other branch. It builds, writes tarballs into `releases/`, and puts `workspace:*` back so the branch stays clean.

`gh` needs the workflow scope.

```bash
gh release create v0.53.0-a11y.1 \
  --repo Electro-Jam-Instruments/lexical \
  --title "Lexical v0.53.0 accessibility" \
  --notes "What this pack adds." \
  releases/*.tgz
```

Push `a11y-ship` to `origin` (Electro-Jam-Instruments/lexical) before the release. Do not push it to upstream.

## Point an app at the pack

Every `@lexical/*` and `lexical` dependency uses the same tag:

```
https://github.com/Electro-Jam-Instruments/lexical/releases/download/v0.53.0-a11y.1/lexical-0.53.0.tgz
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
