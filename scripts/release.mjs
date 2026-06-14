#!/usr/bin/env node
/**
 * ZbxWizz release helper — version bumps, git tags, GitHub releases, deploy zip.
 *
 * Usage:
 *   node scripts/release.mjs status
 *   node scripts/release.mjs bump patch|minor|major|1.2.3
 *   node scripts/release.mjs tag [--sign] [--yes]
 *   node scripts/release.mjs push [--yes]
 *   node scripts/release.mjs package
 *   node scripts/release.mjs notes
 *   node scripts/release.mjs github [--yes]     # gh release create + upload zip
 *   node scripts/release.mjs publish patch      # bump → package → tag → push → github
 *
 * Options (global): --yes  skip confirmation prompts
 *                   --allow-dirty  allow uncommitted changes
 *                   --no-package   skip zip step in publish
 *                   --no-push      skip git push in publish
 *                   --no-github    skip gh release in publish
 */

import { execSync, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const VERSION_FILE = join(ROOT, 'VERSION');
const PACKAGE_JSON = join(ROOT, 'package.json');
const STATIC_PKG = join(ROOT, 'static', 'package.json');
const VERSIONS_JSON = join(ROOT, 'static', 'assets', 'vendor', 'versions.json');
const DIST_DIR = join(ROOT, 'dist');

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith('--')));
const args = argv.filter((a) => !a.startsWith('--'));

const YES = flags.has('--yes');
const ALLOW_DIRTY = flags.has('--allow-dirty');
const NO_PACKAGE = flags.has('--no-package');
const NO_PUSH = flags.has('--no-push');
const NO_GITHUB = flags.has('--no-github');
const SIGN_TAG = flags.has('--sign');

function run(cmd, opts = {}) {
  return execSync(cmd, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: opts.silent ? 'pipe' : 'inherit',
    ...opts,
  });
}

function runSilent(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch {
    return '';
  }
}

function die(msg) {
  console.error(`Error: ${msg}`);
  process.exit(1);
}

function parseSemver(v) {
  const m = String(v).trim().match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/);
  if (!m) die(`Invalid semver: ${v}`);
  return {
    major: +m[1],
    minor: +m[2],
    patch: +m[3],
    prerelease: m[4] || '',
    build: m[5] || '',
  };
}

function formatSemver({ major, minor, patch, prerelease, build }) {
  let v = `${major}.${minor}.${patch}`;
  if (prerelease) v += `-${prerelease}`;
  if (build) v += `+${build}`;
  return v;
}

function bumpSemver(current, kind) {
  const s = parseSemver(current);
  if (/^\d+\.\d+\.\d+/.test(kind)) {
    return kind.trim();
  }
  switch (kind) {
    case 'major':
      return formatSemver({ major: s.major + 1, minor: 0, patch: 0 });
    case 'minor':
      return formatSemver({ major: s.major, minor: s.minor + 1, patch: 0 });
    case 'patch':
      return formatSemver({ major: s.major, minor: s.minor, patch: s.patch + 1 });
    default:
      die(`Unknown bump kind "${kind}". Use patch, minor, major, or x.y.z`);
  }
}

function readVersion() {
  if (!existsSync(VERSION_FILE)) die(`Missing ${VERSION_FILE}`);
  return readFileSync(VERSION_FILE, 'utf8').trim();
}

function writeVersion(version) {
  writeFileSync(VERSION_FILE, `${version}\n`, 'utf8');

  if (existsSync(PACKAGE_JSON)) {
    const pkg = JSON.parse(readFileSync(PACKAGE_JSON, 'utf8'));
    pkg.version = version;
    writeFileSync(PACKAGE_JSON, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  }

  if (existsSync(STATIC_PKG)) {
    const pkg = JSON.parse(readFileSync(STATIC_PKG, 'utf8'));
    if ('version' in pkg) {
      pkg.version = version;
      writeFileSync(STATIC_PKG, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    }
  }

  if (existsSync(VERSIONS_JSON)) {
    const data = JSON.parse(readFileSync(VERSIONS_JSON, 'utf8'));
    data.zbxwizz = version;
    data.updated = new Date().toISOString().slice(0, 10);
    writeFileSync(VERSIONS_JSON, JSON.stringify(data, null, 2) + '\n', 'utf8');
  }
}

function tagName(version) {
  return `v${version}`;
}

function latestTag() {
  const tags = runSilent('git tag -l "v*" --sort=-v:refname');
  return tags.split('\n').filter(Boolean)[0] || '';
}

function commitsSince(ref) {
  const range = ref ? `${ref}..HEAD` : 'HEAD';
  const log = runSilent(`git log ${range} --pretty=format:%h %s`);
  return log ? log.split('\n').filter(Boolean) : [];
}

function ensureGitRepo() {
  if (!runSilent('git rev-parse --git-dir')) die('Not a git repository');
}

function ensureClean() {
  if (ALLOW_DIRTY) return;
  const status = runSilent('git status --porcelain');
  if (status) die('Working tree has uncommitted changes. Commit or pass --allow-dirty');
}

function ensureBranch() {
  const branch = runSilent('git branch --show-current');
  if (!branch) return;
  if (!['main', 'master'].includes(branch) && !ALLOW_DIRTY) {
    console.warn(`Warning: not on main/master (on "${branch}")`);
  }
}

async function confirm(message) {
  if (YES) return true;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((resolve) => {
    rl.question(`${message} [y/N] `, resolve);
  });
  rl.close();
  return /^y(es)?$/i.test(answer.trim());
}

function cmdStatus() {
  ensureGitRepo();
  const version = readVersion();
  const tag = latestTag();
  const branch = runSilent('git branch --show-current');
  const remote = runSilent('git remote get-url origin');

  console.log('ZbxWizz release status');
  console.log('──────────────────────');
  console.log(`VERSION file:     ${version}`);
  console.log(`Latest git tag:   ${tag || '(none)'}`);
  console.log(`Current branch:   ${branch || '(detached)'}`);
  console.log(`Origin:           ${remote || '(none)'}`);

  const since = tag || '';
  const commits = commitsSince(since);
  console.log(`Commits since tag: ${commits.length}`);
  if (commits.length) {
    console.log('');
    commits.slice(0, 15).forEach((line) => console.log(`  ${line}`));
    if (commits.length > 15) console.log(`  … and ${commits.length - 15} more`);
  }

  const nextTag = tagName(version);
  if (runSilent(`git rev-parse -q --verify refs/tags/${nextTag}`)) {
    console.log(`\nNote: tag ${nextTag} already exists locally.`);
  }
}

function cmdBump(kind) {
  if (!kind) die('Usage: release.mjs bump patch|minor|major|x.y.z');
  const current = readVersion();
  const next = bumpSemver(current, kind);
  if (next === current) die('Version unchanged');
  writeVersion(next);
  console.log(`Bumped ${current} → ${next}`);
  console.log('Updated: VERSION, package.json, static/assets/vendor/versions.json');
  console.log('Commit these changes before tagging.');
}

function cmdTag() {
  ensureGitRepo();
  ensureClean();
  ensureBranch();

  const version = readVersion();
  const name = tagName(version);

  if (runSilent(`git rev-parse -q --verify refs/tags/${name}`)) {
    die(`Tag ${name} already exists`);
  }

  const signFlag = SIGN_TAG ? '-s' : '';
  const msg = `Release ${name}`;

  console.log(`Creating annotated tag ${name} …`);
  run(`git tag ${signFlag} -a ${name} -m "${msg.replace(/"/g, '\\"')}"`);
  console.log(`Created ${name}`);
  console.log(`Push with: node scripts/release.mjs push`);
}

function cmdPush() {
  ensureGitRepo();
  const branch = runSilent('git branch --show-current');
  if (!branch) die('Cannot push: detached HEAD');

  console.log(`Pushing ${branch} and tags to origin …`);
  run(`git push origin ${branch}`);
  run('git push origin --tags');
  console.log('Done.');
}

function zipExcludeArgs() {
  return [
    '-x', 'node_modules/*',
    '-x', 'scripts/screenshots/*',
    '-x', '*.zip',
    '-x', '.idea/*',
    '-x', 'tmp*.*',
  ];
}

function cmdPackage() {
  const version = readVersion();
  mkdirSync(DIST_DIR, { recursive: true });
  const out = join(DIST_DIR, `zbxwizz-${version}.zip`);
  const staticDir = join(ROOT, 'static');

  if (!existsSync(staticDir)) die('static/ directory not found');

  const exclude = zipExcludeArgs();
  const zipArgs = ['-r', out, '.', ...exclude];

  console.log(`Packaging static/ → ${out}`);
  const result = spawnSync('zip', zipArgs, { cwd: staticDir, stdio: 'inherit' });
  if (result.status !== 0) {
    die('zip failed (install zip package if missing)');
  }

  const size = runSilent(`du -h "${out}" | cut -f1`);
  console.log(`Created ${out} (${size})`);
  return out;
}

function cmdNotes() {
  const tag = latestTag();
  const commits = commitsSince(tag);
  if (!commits.length) {
    console.log('No commits since last tag.');
    return;
  }
  console.log(commits.map((c) => `- ${c}`).join('\n'));
}

function hasGh() {
  return !!runSilent('command -v gh');
}

function cmdGithub() {
  ensureGitRepo();
  const version = readVersion();
  const name = tagName(version);

  if (!runSilent(`git rev-parse -q --verify refs/tags/${name}`)) {
    die(`Tag ${name} does not exist. Run: node scripts/release.mjs tag`);
  }

  if (!hasGh()) {
    die('GitHub CLI (gh) not found. Install it or create the release manually.');
  }

  if (!runSilent('gh auth status')) {
    die('gh is not authenticated. Run: gh auth login');
  }

  const zipPath = join(DIST_DIR, `zbxwizz-${version}.zip`);
  if (!existsSync(zipPath)) {
    console.log('Deploy zip not found; building …');
    cmdPackage();
  }

  const notesFile = join(DIST_DIR, `RELEASE_NOTES-${version}.md`);
  const prevTag = runSilent(`git describe --tags --abbrev=0 ${name}^ 2>/dev/null`);
  const commits = commitsSince(prevTag);
  const body = commits.length
    ? `## Changes\n\n${commits.map((c) => `- ${c}`).join('\n')}\n\n## Install\n\nCopy the contents of the zip to your Zabbix web root (see docs/installation.md).`
    : `Release ${name}`;
  writeFileSync(notesFile, body, 'utf8');

  if (runSilent(`gh release view ${name} 2>/dev/null`)) {
    die(`GitHub release ${name} already exists`);
  }

  console.log(`Creating GitHub release ${name} …`);
  run(
    `gh release create ${name} "${zipPath}" --title "${name}" --notes-file "${notesFile}"`
  );
  console.log(`GitHub release published: ${name}`);
}

async function cmdPublish(kind) {
  if (!kind) die('Usage: release.mjs publish patch|minor|major|x.y.z');

  ensureGitRepo();
  ensureClean();
  ensureBranch();

  const current = readVersion();
  const next = bumpSemver(current, kind);
  console.log(`Publishing ${tagName(next)} …`);

  if (!(await confirm(`Bump ${current} → ${next} and release?`))) {
    console.log('Aborted.');
    process.exit(0);
  }

  writeVersion(next);

  if (!NO_PACKAGE) cmdPackage();

  const files = [
    VERSION_FILE,
    existsSync(PACKAGE_JSON) ? PACKAGE_JSON : null,
    existsSync(VERSIONS_JSON) ? VERSIONS_JSON : null,
  ].filter(Boolean);

  run(`git add ${files.map((f) => `"${f}"`).join(' ')}`);
  run(`git commit -m "chore(release): ${tagName(next)}"`);

  const signFlag = SIGN_TAG ? '-s' : '';
  run(`git tag ${signFlag} -a ${tagName(next)} -m "Release ${tagName(next)}"`);

  if (!NO_PUSH) cmdPush();

  if (!NO_GITHUB) cmdGithub();

  console.log(`\nRelease ${tagName(next)} complete.`);
}

function usage() {
  console.log(`
ZbxWizz release manager

  node scripts/release.mjs status
  node scripts/release.mjs bump <patch|minor|major|x.y.z>
  node scripts/release.mjs tag [--sign] [--yes]
  node scripts/release.mjs push [--yes]
  node scripts/release.mjs package
  node scripts/release.mjs notes
  node scripts/release.mjs github [--yes]
  node scripts/release.mjs publish <patch|minor|major|x.y.z> [--yes]

Flags: --yes --allow-dirty --no-package --no-push --no-github --sign
`);
}

async function main() {
  const cmd = args[0];
  const rest = args.slice(1);

  switch (cmd) {
    case 'status':
      cmdStatus();
      break;
    case 'bump':
      cmdBump(rest[0]);
      break;
    case 'tag':
      cmdTag();
      break;
    case 'push':
      cmdPush();
      break;
    case 'package':
      cmdPackage();
      break;
    case 'notes':
      cmdNotes();
      break;
    case 'github':
      cmdGithub();
      break;
    case 'publish':
      await cmdPublish(rest[0]);
      break;
    case undefined:
    case 'help':
    case '-h':
    case '--help':
      usage();
      break;
    default:
      die(`Unknown command: ${cmd}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
