'use strict';

const fs = require('fs');
const path = require('path');

const SOURCE_ROOT = path.resolve(__dirname, '..');
const RELEASE_ROOT = path.resolve(SOURCE_ROOT, 'release');
const RuntimeModules = require('../runtime-modules.js');
const PACKAGE_ASSET_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.svg',
  '.json'
]);
const GENERATED_DIRECTORIES = Object.freeze([
  'core',
  'content',
  'ui',
  'NIE',
  'assets'
]);

function compareNames(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function listRelativeRegularFiles(root, relativeDirectory = '') {
  const directory = relativeDirectory ? path.join(root, relativeDirectory) : root;
  const entries = fs.readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => compareNames(left.name, right.name));
  const files = [];

  for (const entry of entries) {
    const relativePath = relativeDirectory
      ? path.join(relativeDirectory, entry.name)
      : entry.name;
    const absolutePath = path.join(root, relativePath);
    const stat = fs.lstatSync(absolutePath);
    if (stat.isSymbolicLink()) {
      throw new Error(`source runtime symlink is forbidden: ${relativePath}`);
    }
    if (stat.isDirectory()) {
      files.push(...listRelativeRegularFiles(root, relativePath));
    } else if (stat.isFile()) {
      files.push(relativePath.split(path.sep).join('/'));
    } else {
      throw new Error(`unsupported source runtime entry: ${relativePath}`);
    }
  }

  return files;
}

function listPackageAssetFiles(relativeRoot) {
  const root = resolveGuardedRelative(SOURCE_ROOT, relativeRoot);
  return listRelativeRegularFiles(root)
    .filter((relativePath) =>
      PACKAGE_ASSET_EXTENSIONS.has(path.extname(relativePath).toLowerCase())
    )
    .map((relativePath) =>
      path.join(relativeRoot, relativePath).split(path.sep).join('/')
    )
    .sort(compareNames);
}

const RUNTIME_FILES = RuntimeModules.buildPackageFiles(listPackageAssetFiles);

function resolveGuardedRelative(root, relativePath) {
  if (typeof relativePath !== 'string' || relativePath.length === 0) {
    throw new Error('runtime path must be a non-empty relative path');
  }
  if (path.isAbsolute(relativePath)) {
    throw new Error(`runtime path must not be absolute: ${relativePath}`);
  }

  const segments = relativePath.split(/[\\/]+/);
  if (segments.some((segment) => segment === '' || segment === '.')) {
    throw new Error(`runtime path contains an empty or dot segment: ${relativePath}`);
  }
  if (segments.some((segment) => segment === '..')) {
    throw new Error(`runtime path contains a dotdot segment: ${relativePath}`);
  }

  const resolvedRoot = path.resolve(root);
  const resolvedPath = path.resolve(resolvedRoot, relativePath);
  if (
    resolvedPath === resolvedRoot ||
    !resolvedPath.startsWith(resolvedRoot + path.sep)
  ) {
    throw new Error(`runtime path escaped its root: ${relativePath}`);
  }
  return resolvedPath;
}

function assertRegularFile(file, label) {
  const stat = fs.lstatSync(file);
  if (!stat.isFile()) {
    throw new Error(`${label} is not a regular file: ${file}`);
  }
}

function lstatIfPresent(file) {
  try {
    return fs.lstatSync(file);
  } catch (error) {
    if (error && error.code === 'ENOENT') return null;
    throw error;
  }
}

function ensureDirectoryRoot(directory, label) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory);
    return;
  }
  const stat = fs.lstatSync(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error(`${label} is not a real directory: ${directory}`);
  }
}

function ensureRelativeDirectory(root, relativeDirectory) {
  const segments = relativeDirectory.split(/[\\/]+/);
  let currentRelative = '';
  for (const segment of segments) {
    currentRelative = currentRelative
      ? path.join(currentRelative, segment)
      : segment;
    const directory = resolveGuardedRelative(root, currentRelative);
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory);
      continue;
    }
    const stat = fs.lstatSync(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      throw new Error(`target parent is not a real directory: ${directory}`);
    }
  }
}

function assertInsideGeneratedDirectory(candidate, generatedRoot) {
  const resolvedCandidate = path.resolve(candidate);
  const resolvedGeneratedRoot = path.resolve(generatedRoot);
  if (
    resolvedCandidate !== resolvedGeneratedRoot &&
    !resolvedCandidate.startsWith(resolvedGeneratedRoot + path.sep)
  ) {
    throw new Error(`prune target escaped generated directory: ${candidate}`);
  }
}

function pruneStaleEntries(relativeRoot) {
  const generatedRoot = resolveGuardedRelative(RELEASE_ROOT, relativeRoot);
  const allowedFiles = new Set(
    RUNTIME_FILES.filter((relativePath) =>
      relativePath.startsWith(relativeRoot + '/')
    ).map((relativePath) => relativePath.split('/').join(path.sep))
  );

  function visit(relativeDirectory) {
    const absoluteDirectory = resolveGuardedRelative(
      RELEASE_ROOT,
      relativeDirectory
    );
    assertInsideGeneratedDirectory(absoluteDirectory, generatedRoot);
    const directoryStat = fs.lstatSync(absoluteDirectory);
    if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink()) {
      throw new Error(
        `generated runtime path is not a real directory: ${relativeDirectory}`
      );
    }

    const entries = fs.readdirSync(absoluteDirectory, { withFileTypes: true })
      .sort((left, right) => compareNames(left.name, right.name));
    for (const entry of entries) {
      const relativePath = path.join(relativeDirectory, entry.name);
      const absolutePath = resolveGuardedRelative(RELEASE_ROOT, relativePath);
      assertInsideGeneratedDirectory(absolutePath, generatedRoot);
      const stat = fs.lstatSync(absolutePath);
      if (stat.isSymbolicLink()) {
        throw new Error(`generated runtime symlink is forbidden: ${relativePath}`);
      }
      if (stat.isDirectory()) {
        visit(relativePath);
      } else if (stat.isFile()) {
        if (!allowedFiles.has(relativePath)) {
          fs.unlinkSync(absolutePath);
        }
      } else {
        throw new Error(`unsupported generated runtime entry: ${relativePath}`);
      }
    }

    if (
      relativeDirectory !== relativeRoot &&
      fs.readdirSync(absoluteDirectory).length === 0
    ) {
      assertInsideGeneratedDirectory(absoluteDirectory, generatedRoot);
      fs.rmdirSync(absoluteDirectory);
    }
  }

  visit(relativeRoot);
}

function copyRuntimeFile(relativePath) {
  const source = resolveGuardedRelative(SOURCE_ROOT, relativePath);
  const target = resolveGuardedRelative(RELEASE_ROOT, relativePath);
  assertRegularFile(source, 'source runtime path');
  const targetParent = path.dirname(relativePath);
  if (targetParent !== '.') {
    ensureRelativeDirectory(RELEASE_ROOT, targetParent);
  }
  const targetStat = lstatIfPresent(target);
  if (targetStat && (
    !targetStat.isFile() ||
    targetStat.isSymbolicLink()
  )) {
    throw new Error(`target runtime path is not a regular file: ${target}`);
  }
  fs.copyFileSync(source, target);
}

function syncRelease(destination = RELEASE_ROOT) {
  const resolvedDestination = path.resolve(destination);
  if (resolvedDestination !== RELEASE_ROOT) {
    throw new Error(
      `refusing release destination: expected ${RELEASE_ROOT}, got ` +
      resolvedDestination
    );
  }

  for (const relativePath of RUNTIME_FILES) {
    const source = resolveGuardedRelative(SOURCE_ROOT, relativePath);
    assertRegularFile(source, 'source runtime path');
  }

  ensureDirectoryRoot(RELEASE_ROOT, 'release target');

  for (const relativeDirectory of GENERATED_DIRECTORIES) {
    ensureRelativeDirectory(RELEASE_ROOT, relativeDirectory);
    pruneStaleEntries(relativeDirectory);
  }

  for (const relativePath of RUNTIME_FILES) {
    copyRuntimeFile(relativePath);
  }

  return {
    copiedFiles: RUNTIME_FILES.length,
    generatedDirectoryFiles: RUNTIME_FILES.filter((relativePath) =>
      GENERATED_DIRECTORIES.some((directory) =>
        relativePath.startsWith(directory + '/')
      )
    ).length,
    rootFiles: RUNTIME_FILES.filter((relativePath) =>
      !relativePath.includes('/')
    ).length
  };
}

if (require.main === module) {
  try {
    const result = syncRelease();
    console.log(
      `release runtime synchronized: ${result.copiedFiles} files ` +
      `(${result.rootFiles} root, ` +
      `${result.generatedDirectoryFiles} generated-directory)`
    );
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    process.exitCode = 1;
  }
}

module.exports = {
  GENERATED_DIRECTORIES,
  RELEASE_ROOT,
  RUNTIME_FILES,
  SOURCE_ROOT,
  resolveGuardedRelative,
  syncRelease
};
