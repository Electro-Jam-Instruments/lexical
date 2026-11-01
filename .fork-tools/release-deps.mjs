/**
 * Rewrites lexical workspace dependencies to this release's tarball URLs,
 * and checks the packed tarballs still point only at those files.
 *
 * Usage:
 *   node release-deps.mjs rewrite <tag> <version> <package.json>
 *   node release-deps.mjs check <tag> <version> <releases-dir>
 */

import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const [command, tag, version, target] = process.argv.slice(2);
const prefix = `https://github.com/Electro-Jam-Instruments/lexical/releases/download/${tag}/`;

function tarballName(depName) {
  if (depName === 'lexical') {
    return `lexical-${version}.tgz`;
  }
  if (depName.startsWith('@lexical/')) {
    return `lexical-${depName.slice('@lexical/'.length)}-${version}.tgz`;
  }
  return null;
}

function expectedUrl(depName) {
  const file = tarballName(depName);
  return file === null ? null : prefix + file;
}

function eachLexicalDep(pkg, visit) {
  for (const section of [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
  ]) {
    const deps = pkg[section];
    if (deps == null) {
      continue;
    }
    for (const [name, spec] of Object.entries(deps)) {
      const url = expectedUrl(name);
      if (url !== null) {
        visit(section, name, spec, url);
      }
    }
  }
}

function rewrite(pkgJsonPath) {
  const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
  let changed = 0;
  eachLexicalDep(pkg, (section, name, spec, url) => {
    if (spec === url) {
      return;
    }
    if (typeof spec === 'string' && spec.startsWith('workspace:')) {
      pkg[section][name] = url;
      changed += 1;
      return;
    }
    console.error(
      `${pkgJsonPath} ${section} ${name} is "${spec}", not a workspace spec`,
    );
    process.exitCode = 1;
  });
  if (process.exitCode) {
    return;
  }
  if (changed > 0) {
    fs.writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2) + '\n');
  }
  console.log(`  ${path.basename(path.dirname(pkgJsonPath))}: ${changed} urls`);
}

function check(releaseDir) {
  const tarballs = new Set(
    fs.readdirSync(releaseDir).filter(name => name.endsWith('.tgz')),
  );
  let packagesChecked = 0;
  let depsChecked = 0;
  for (const file of tarballs) {
    const json = execFileSync(
      'tar',
      ['-xOf', path.join(releaseDir, file), 'package/package.json'],
      {encoding: 'utf8'},
    );
    const pkg = JSON.parse(json);
    packagesChecked += 1;
    eachLexicalDep(pkg, (section, name, spec, url) => {
      depsChecked += 1;
      const fileName = url.slice(prefix.length);
      if (spec !== url) {
        console.error(`${file} ${section} ${name} is "${spec}"`);
        process.exitCode = 1;
        return;
      }
      if (!tarballs.has(fileName)) {
        console.error(`${file} points at ${fileName}, which is not in releases/`);
        process.exitCode = 1;
      }
    });
  }
  if (process.exitCode) {
    return;
  }
  console.log(
    `Checked ${packagesChecked} tarballs, ${depsChecked} lexical dependencies, all on ${tag}.`,
  );
}

if (command === 'rewrite') {
  rewrite(target);
} else if (command === 'check') {
  check(target);
} else {
  console.error('Usage: release-deps.mjs rewrite|check <tag> <version> <path>');
  process.exit(1);
}
if (process.exitCode) {
  process.exit(process.exitCode);
}
