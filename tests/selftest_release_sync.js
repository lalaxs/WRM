'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');

const sourceRoot = path.join(__dirname, '..');
const releaseRoot = path.join(sourceRoot, 'release');
const packageAssetExtensions = new Set([
  '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.json'
]);
const runtimeFiles = [
  'index.html',
  'game.json',
  'project.config.json',
  'platform.js',
  'AdManager.js',
  'game.js',
  'ui.js',
  'styles.css',
  'nie-manifest.js',
  'content/herblore-parity.js',
  'content/item-art.js',
  'content/materials.js',
  'content/combat-lexicon.js',
  'content/equipment.js',
  'content/items.js',
  'content/life-skills.js',
  'content/gathering.js',
  'content/recipes.js',
  'content/homestead.js',
  'content/combat.js',
  'content/techniques.js',
  'content/realms.js',
  'content/regions.js',
  'content/sects.js',
  'content/npc-generation.js',
  'content/social-interactions.js',
  'content/event-templates.js',
  'content/lifecycle.js',
  'core/stage2-state.js',
  'core/stage3-state.js',
  'core/npc-generator.js',
  'core/npc-roster.js',
  'core/stage4-state.js',
  'core/relationships.js',
  'core/npc-combat-config.js',
  'core/combat-party.js',
  'core/random.js',
  'core/equipment.js',
  'core/inventory.js',
  'core/skill-progression.js',
  'core/social.js',
  'core/event-engine.js',
  'core/npc-simulation.js',
  'core/sect-simulation.js',
  'core/gathering.js',
  'core/production.js',
  'core/farm.js',
  'core/formations.js',
  'core/spirit-beasts.js',
  'core/combat-loadouts.js',
  'core/techniques.js',
  'core/combat-stats.js',
  'core/combat-engine.js',
  'core/team-combat-snapshot.js',
  'core/team-combat-engine.js',
  'core/team-combat-consequences.js',
  'core/combat-rewards.js',
  'core/combat-progress.js',
  'core/breakthrough.js',
  'core/save-system.js',
  'core/simulation-report.js',
  'core/state-model.js',
  'core/simulation.js',
  'core/game-rules.js',
  'core/stage2-rules.js',
  'core/stage3-rules.js',
  'core/stage4-rules.js',
  'core/lineage.js',
  'core/inheritance-hall.js',
  'core/legacy-transition.js',
  'core/stage5-rules.js',
  ...listPackageAssetFiles('NIE'),
  ...listPackageAssetFiles('assets')
];
const generatedDirectories = ['core', 'content', 'NIE', 'assets'];
const exactAllowlist = runtimeFiles;

function compareNames(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function isRealDirectoryStat(stat) {
  return stat.isDirectory() && !stat.isSymbolicLink();
}

function isRegularFileStat(stat) {
  return stat.isFile() && !stat.isSymbolicLink();
}

function isRealDirectory(directory) {
  if (!fs.existsSync(directory)) return false;
  return isRealDirectoryStat(fs.lstatSync(directory));
}

function isRegularFile(file) {
  if (!fs.existsSync(file)) return false;
  return isRegularFileStat(fs.lstatSync(file));
}

function listRegularFiles(directory, relativeDirectory = '') {
  const current = path.join(directory, relativeDirectory);
  const entries = fs.readdirSync(current, { withFileTypes: true })
    .sort((left, right) => compareNames(left.name, right.name));
  const files = [];

  for (const entry of entries) {
    const relativePath = relativeDirectory
      ? path.join(relativeDirectory, entry.name)
      : entry.name;
    if (entry.isDirectory()) {
      files.push(...listRegularFiles(directory, relativePath));
    } else if (entry.isFile()) {
      files.push(relativePath.split(path.sep).join('/'));
    } else {
      throw new Error(`unsupported runtime entry: ${relativePath}`);
    }
  }

  return files;
}

function listPackageAssetFiles(relativeDirectory) {
  const directory = path.join(sourceRoot, relativeDirectory);
  return listRegularFiles(directory)
    .filter((relativePath) =>
      packageAssetExtensions.has(path.extname(relativePath).toLowerCase())
    )
    .map((relativePath) =>
      path.join(relativeDirectory, relativePath).split(path.sep).join('/')
    )
    .sort(compareNames);
}

function verifyReleaseMirror() {
  const errors = [];
  if (!isRealDirectory(releaseRoot)) {
    return ['release root must be a real directory'];
  }

  for (const relativePath of runtimeFiles) {
    const source = path.join(sourceRoot, relativePath);
    const target = path.join(releaseRoot, relativePath);
    if (!isRegularFile(source)) {
      errors.push(`source runtime path is not a regular file: ${relativePath}`);
    } else if (!isRegularFile(target)) {
      errors.push(`release path is not a regular file: ${relativePath}`);
    } else if (sha256(source) !== sha256(target)) {
      errors.push(`release hash drift: ${relativePath}`);
    }
  }

  for (const relativeDirectory of generatedDirectories) {
    const targetDirectory = path.join(releaseRoot, relativeDirectory);
    if (!isRealDirectory(targetDirectory)) {
      errors.push(
        `release path is not a real directory: ${relativeDirectory}`
      );
      continue;
    }

    const targetFiles = listRegularFiles(targetDirectory);
    const expectedFiles = runtimeFiles
      .filter((relativePath) =>
        relativePath.startsWith(relativeDirectory + '/')
      )
      .map((relativePath) =>
        relativePath.slice(relativeDirectory.length + 1)
      )
      .sort(compareNames);
    if (JSON.stringify(expectedFiles) !== JSON.stringify(targetFiles)) {
      errors.push(
        `release file-list drift: ${relativeDirectory}\n` +
        `    manifest: ${JSON.stringify(expectedFiles)}\n` +
        `    release: ${JSON.stringify(targetFiles)}`
      );
    }
  }

  return errors;
}

function verifySymlinkGuards() {
  const fixtureRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'nie-release-sync-symlink-')
  );
  const realDirectory = path.join(fixtureRoot, 'real-directory');
  const realFile = path.join(fixtureRoot, 'real-file.js');
  const directoryLink = path.join(fixtureRoot, 'directory-link');
  const fileLink = path.join(fixtureRoot, 'file-link.js');
  let directoryLinkCreated = false;
  let fileLinkCreated = false;

  try {
    fs.mkdirSync(realDirectory);
    fs.writeFileSync(realFile, 'module.exports = true;\n');

    try {
      fs.symlinkSync(realDirectory, directoryLink, 'junction');
      directoryLinkCreated = true;
      assert.strictEqual(
        isRealDirectory(directoryLink),
        false,
        'directory junctions must not pass the real-directory guard'
      );
    } catch (error) {
      if (!['EACCES', 'EPERM', 'ENOSYS'].includes(error.code)) throw error;
      assert.strictEqual(
        isRealDirectoryStat({
          isDirectory: () => true,
          isSymbolicLink: () => true
        }),
        false,
        'a controlled directory-link stat must be rejected'
      );
    }

    try {
      fs.symlinkSync(realFile, fileLink, 'file');
      fileLinkCreated = true;
      assert.strictEqual(
        isRegularFile(fileLink),
        false,
        'file symlinks must not pass the regular-file guard'
      );
    } catch (error) {
      if (!['EACCES', 'EPERM', 'ENOSYS'].includes(error.code)) throw error;
      assert.strictEqual(
        isRegularFileStat({
          isFile: () => true,
          isSymbolicLink: () => true
        }),
        false,
        'a controlled file-link stat must be rejected'
      );
    }
  } finally {
    if (fileLinkCreated && fs.existsSync(fileLink)) fs.unlinkSync(fileLink);
    if (directoryLinkCreated && fs.existsSync(directoryLink)) {
      fs.unlinkSync(directoryLink);
    }
    if (fs.existsSync(realFile)) fs.unlinkSync(realFile);
    if (fs.existsSync(realDirectory)) fs.rmdirSync(realDirectory);
    if (fs.existsSync(fixtureRoot)) fs.rmdirSync(fixtureRoot);
  }
}

function loadSynchronizerForFixture(fixtureRoot, fsModule) {
  const scriptPath = path.join(sourceRoot, 'scripts', 'sync-release.js');
  const source = fs.readFileSync(scriptPath, 'utf8');
  const fixtureFilename = path.join(
    fixtureRoot,
    'scripts',
    'sync-release.js'
  );
  const fixtureModule = { exports: {} };
  const wrapped = vm.runInNewContext(
    `(function (require, module, exports, __filename, __dirname) {\n` +
    `${source}\n})`,
    {},
    { filename: fixtureFilename }
  );
  const fixtureRequire = function (id) {
    if (id === 'fs') return fsModule;
    if (id === 'path') return path;
    throw new Error(`unexpected fixture dependency: ${id}`);
  };
  fixtureRequire.main = null;
  wrapped(
    fixtureRequire,
    fixtureModule,
    fixtureModule.exports,
    fixtureFilename,
    path.dirname(fixtureFilename)
  );
  return fixtureModule.exports;
}

function removeOwnedTempRoot(fixtureRoot, expectedPrefix) {
  const tempRoot = path.resolve(os.tmpdir());
  const resolvedFixture = path.resolve(fixtureRoot);
  assert(
    resolvedFixture.startsWith(tempRoot + path.sep) &&
      path.basename(resolvedFixture).startsWith(expectedPrefix),
    'temporary cleanup must stay inside its owned prefixed root'
  );
  fs.rmSync(resolvedFixture, { recursive: true, force: true });
}

function verifyDanglingTargetSymlinkRejected() {
  const fixturePrefix = 'nie-release-sync-dangling-';
  const fixtureRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), fixturePrefix)
  );
  const fixtureRelease = path.join(fixtureRoot, 'release');
  const fixtureNie = path.join(fixtureRelease, 'NIE');
  const danglingTarget = path.join(fixtureNie, 'injected.js');
  const danglingLink = path.join(fixtureRelease, 'game.js');
  let fixtureFs = fs;

  try {
    fs.mkdirSync(path.join(fixtureRoot, 'scripts'));
    fs.mkdirSync(path.join(fixtureRoot, 'core'));
    fs.mkdirSync(path.join(fixtureRoot, 'content'));
    fs.mkdirSync(fixtureRelease);
    fs.mkdirSync(fixtureNie);
    for (const relativePath of runtimeFiles) {
      fs.mkdirSync(path.dirname(path.join(fixtureRoot, relativePath)), {
        recursive: true
      });
      fs.writeFileSync(
        path.join(fixtureRoot, relativePath),
        `fixture:${relativePath}\n`
      );
    }
    fs.writeFileSync(path.join(fixtureRoot, 'core', 'runtime.js'), 'core\n');
    fs.writeFileSync(
      path.join(fixtureRoot, 'content', 'runtime.js'),
      'content\n'
    );

    try {
      fs.symlinkSync(danglingTarget, danglingLink, 'file');
    } catch (error) {
      if (!['EACCES', 'EPERM', 'ENOSYS'].includes(error.code)) throw error;
      const realFs = fs;
      const danglingKey = path.resolve(danglingLink);
      fixtureFs = Object.assign({}, realFs, {
        existsSync(candidate) {
          return path.resolve(candidate) === danglingKey
            ? false
            : realFs.existsSync(candidate);
        },
        lstatSync(candidate) {
          if (path.resolve(candidate) === danglingKey) {
            return {
              isDirectory: () => false,
              isFile: () => false,
              isSymbolicLink: () => true
            };
          }
          return realFs.lstatSync(candidate);
        },
        copyFileSync(sourceFile, targetFile) {
          if (path.resolve(targetFile) === danglingKey) {
            realFs.copyFileSync(sourceFile, danglingTarget);
            return;
          }
          realFs.copyFileSync(sourceFile, targetFile);
        }
      });
    }

    const fixtureSync = loadSynchronizerForFixture(
      fixtureRoot,
      fixtureFs
    );
    assert.throws(
      () => fixtureSync.syncRelease(fixtureRelease),
      /target runtime path is not a regular file/i,
      'real synchronizer path must reject a dangling target symlink'
    );
    assert(
      !fs.existsSync(danglingTarget),
      'dangling release symlink target must never be created'
    );
  } finally {
    removeOwnedTempRoot(fixtureRoot, fixturePrefix);
  }
}

function main() {
  const mirrorErrors = verifyReleaseMirror();
  if (mirrorErrors.length) {
    for (const error of mirrorErrors) console.error(`  ✗ ${error}`);
    console.error(
      `\n=== 发布同步自测失败：${mirrorErrors.length} 个镜像差异 ===`
    );
    process.exit(1);
  }

  const {
    GENERATED_DIRECTORIES,
    RUNTIME_FILES,
    syncRelease
  } = require('../scripts/sync-release.js');

  assert.deepStrictEqual(
    RUNTIME_FILES,
    exactAllowlist,
    'synchronizer must expose the exact ordered runtime file allowlist'
  );
  assert.deepStrictEqual(
    GENERATED_DIRECTORIES,
    generatedDirectories,
    'synchronizer may prune only its generated runtime directories'
  );
  assert(
    !exactAllowlist.some((entry) =>
      entry.endsWith('.import') ||
      /^(?:docs|scripts|tests?|config)(?:\/|$)/i.test(entry) ||
      /^selftest/i.test(entry)
    ),
    'allowlist must exclude editor imports and non-runtime metadata'
  );
  assert(
    exactAllowlist.includes('AdManager.js') &&
      exactAllowlist.includes('game.json') &&
      exactAllowlist.includes('project.config.json'),
    'allowlist must include H5 package root runtime and metadata files'
  );
  assert(
    exactAllowlist.some((entry) =>
      entry.startsWith('NIE/') && entry.endsWith('.png')
    ),
    'allowlist must include browser image assets under NIE'
  );
  assert(
    exactAllowlist.includes('content/item-art.js') &&
      exactAllowlist.some((entry) =>
        entry.startsWith('assets/item-icons/') &&
        (entry.endsWith('.png') || entry.endsWith('.svg'))
      ),
    'allowlist must include generated item icon assets'
  );

  const alternateDestination = path.join(
    os.tmpdir(),
    `nie-release-sync-alternate-${process.pid}-${Date.now()}`
  );
  assert(
    !fs.existsSync(alternateDestination),
    'alternate destination probe must not pre-exist'
  );
  assert.throws(
    () => syncRelease(alternateDestination),
    /refusing release destination/i,
    'synchronizer must reject every alternate destination'
  );
  assert(
    !fs.existsSync(alternateDestination),
    'destination rejection must happen before mutation'
  );

  verifySymlinkGuards();
  verifyDanglingTargetSymlinkRejected();

  const packageJson = JSON.parse(
    fs.readFileSync(path.join(sourceRoot, 'package.json'), 'utf8')
  );
  assert.strictEqual(
    packageJson.scripts['sync-release'],
    'node scripts/sync-release.js',
    'package must expose the sole release synchronizer as sync-release'
  );
  assert(
    !Object.prototype.hasOwnProperty.call(
      packageJson.scripts,
      'release:sync'
    ),
    'the superseded release:sync command must not remain as an alias'
  );

  console.log(
    '\n=== 发布同步自测：' +
    `${runtimeFiles.length} 个运行时文件 / ` +
    `${generatedDirectories.length} 个精确目录通过 ===`
  );
}

main();
