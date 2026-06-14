#!/usr/bin/env node
/**
 * Copy pinned npm packages into assets/vendor/ for offline deployment.
 * Run from static/: npm run vendor
 */
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const nm = join(root, 'node_modules');

const ACE_FILES = [
  'ace.js',
  'ext-language_tools.js',
  'mode-javascript.js',
  'theme-tomorrow.js',
  'worker-javascript.js',
];

function copyAce() {
  const srcDir = join(nm, 'ace-builds', 'src-noconflict');
  const dest = join(root, 'assets', 'vendor', 'ace');
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  mkdirSync(join(dest, 'snippets'), { recursive: true });

  for (const file of ACE_FILES) {
    cpSync(join(srcDir, file), join(dest, file));
  }
  cpSync(
    join(srcDir, 'snippets', 'javascript.js'),
    join(dest, 'snippets', 'javascript.js')
  );
}

function copyFontAwesome() {
  const src = join(nm, 'font-awesome');
  const dest = join(root, 'assets', 'vendor', 'font-awesome');
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  cpSync(join(src, 'css'), join(dest, 'css'), { recursive: true });
  cpSync(join(src, 'fonts'), join(dest, 'fonts'), { recursive: true });
}

function copyXlsx() {
  const destDir = join(root, 'assets', 'vendor', 'xlsx');
  rmSync(destDir, { recursive: true, force: true });
  mkdirSync(destDir, { recursive: true });
  cpSync(
    join(nm, 'xlsx', 'dist', 'xlsx.full.min.js'),
    join(destDir, 'xlsx.full.min.js')
  );
}

function copyJsonEditorIcons() {
  const destDir = join(root, 'assets', 'css', 'img');
  mkdirSync(destDir, { recursive: true });
  cpSync(
    join(root, 'lib', 'img', 'jsoneditor-icons.svg'),
    join(destDir, 'jsoneditor-icons.svg')
  );
}

function writeVersions() {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const versions = {
    updated: new Date().toISOString().slice(0, 10),
    vendoredViaNpm: {},
    bundledInAssets: {
      jquery: '3.7.1',
      jqueryui: '1.11.1',
      bootstrap: '3.x',
      select2: '4.x',
      papaparse: '5.x',
      jsoneditor: '10.1.0',
      colResizable: '1.6',
    },
  };

  for (const [name, version] of Object.entries(pkg.devDependencies || {})) {
    try {
      const libPkg = JSON.parse(
        readFileSync(join(nm, name, 'package.json'), 'utf8')
      );
      versions.vendoredViaNpm[name] = libPkg.version;
    } catch {
      versions.vendoredViaNpm[name] = version;
    }
  }

  writeFileSync(
    join(root, 'assets', 'vendor', 'versions.json'),
    JSON.stringify(versions, null, 2) + '\n'
  );
}

for (const dep of ['ace-builds', 'font-awesome', 'xlsx']) {
  try {
    readFileSync(join(nm, dep, 'package.json'));
  } catch {
    console.error(`Missing ${dep}. Run: npm install`);
    process.exit(1);
  }
}

copyAce();
copyFontAwesome();
copyXlsx();
copyJsonEditorIcons();
writeVersions();
console.log('Vendored ace-builds, font-awesome, and xlsx into assets/vendor/');
