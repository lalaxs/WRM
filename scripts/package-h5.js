'use strict';

const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

const {
  RELEASE_ROOT,
  RUNTIME_FILES,
  SOURCE_ROOT,
  syncRelease
} = require('./sync-release.js');

const PACKAGE_FOLDER_NAME = 'xiuxian-idle-h5';
const MAX_PACKAGE_BYTES = 60 * 1024 * 1024;
const DEFAULT_OUTPUT_ROOT = path.join(SOURCE_ROOT, 'dist', 'h5');
const DEFAULT_ZIP_NAME = `${PACKAGE_FOLDER_NAME}.zip`;

function compareNames(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function assertSafeName(name, label) {
  if (!/^[A-Za-z0-9._-]+$/.test(name)) {
    throw new Error(`${label} must use only ASCII letters, numbers, dot, underscore, and dash`);
  }
}

function assertInside(root, candidate, label) {
  const resolvedRoot = path.resolve(root);
  const resolvedCandidate = path.resolve(candidate);
  if (
    resolvedCandidate !== resolvedRoot &&
    !resolvedCandidate.startsWith(resolvedRoot + path.sep)
  ) {
    throw new Error(`${label} escaped its root: ${candidate}`);
  }
}

function assertOwnedRemoval(root, candidate, label) {
  assertInside(root, candidate, label);
  const resolvedRoot = path.resolve(root);
  const resolvedCandidate = path.resolve(candidate);
  if (resolvedCandidate === resolvedRoot) {
    throw new Error(`${label} must not remove its root`);
  }
}

function ensureRealDirectory(directory, label) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
    return;
  }
  const stat = fs.lstatSync(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error(`${label} is not a real directory: ${directory}`);
  }
}

function listFiles(root, relativeDirectory = '') {
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
      throw new Error(`package symlink is forbidden: ${relativePath}`);
    }
    if (stat.isDirectory()) {
      files.push(...listFiles(root, relativePath));
    } else if (stat.isFile()) {
      files.push(relativePath.split(path.sep).join('/'));
    } else {
      throw new Error(`unsupported package entry: ${relativePath}`);
    }
  }

  return files;
}

function packagePathIsForbidden(relativePath) {
  const normalized = relativePath.split(path.sep).join('/');
  const parts = normalized.split('/');
  const base = parts[parts.length - 1];
  return normalized.endsWith('.import') ||
    base === '.DS_Store' ||
    normalized.startsWith('__MACOSX/') ||
    normalized.startsWith('.git/') ||
    normalized.startsWith('node_modules/') ||
    normalized.startsWith('docs/') ||
    normalized.startsWith('scripts/') ||
    normalized.startsWith('logs/') ||
    normalized.startsWith('test-fixtures/') ||
    normalized.startsWith('features/') ||
    normalized.startsWith('selftest') ||
    normalized.includes('/selftest');
}

function htmlReferences(packageRoot) {
  const html = fs.readFileSync(path.join(packageRoot, 'index.html'), 'utf8');
  return [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((reference) =>
      !/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(reference)
    )
    .map((reference) => reference.split('#')[0].split('?')[0])
    .filter(Boolean);
}

function validatePackageDirectory(packageRoot, options = {}) {
  const maxBytes = options.maxBytes || MAX_PACKAGE_BYTES;
  ensureRealDirectory(packageRoot, 'package root');

  const files = listFiles(packageRoot);
  const fileSet = new Set(files);
  const errors = [];
  let totalBytes = 0;

  for (const file of files) {
    if (packagePathIsForbidden(file)) {
      errors.push(`forbidden package file: ${file}`);
    }
    totalBytes += fs.statSync(path.join(packageRoot, file)).size;
  }

  for (const required of ['index.html', 'AdManager.js', 'game.json', 'project.config.json']) {
    if (!fileSet.has(required)) {
      errors.push(`missing required H5 package file: ${required}`);
    }
  }

  for (const runtimeFile of RUNTIME_FILES) {
    if (!fileSet.has(runtimeFile)) {
      errors.push(`missing synchronized runtime file: ${runtimeFile}`);
    }
  }

  for (const reference of htmlReferences(packageRoot)) {
    if (!fileSet.has(reference)) {
      errors.push(`missing index.html reference: ${reference}`);
    }
  }

  if (!files.some((file) => file.startsWith('NIE/') && file.endsWith('.png'))) {
    errors.push('missing browser image assets under NIE/');
  }

  if (totalBytes > maxBytes) {
    errors.push(`H5 package is ${totalBytes} bytes, over ${maxBytes} bytes`);
  }

  if (errors.length) {
    throw new Error(errors.join('\n'));
  }

  return Object.freeze({ files, totalBytes });
}

function copyDirectory(source, target) {
  ensureRealDirectory(source, 'copy source');
  ensureRealDirectory(target, 'copy target');

  const entries = fs.readdirSync(source, { withFileTypes: true })
    .sort((left, right) => compareNames(left.name, right.name));
  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    const stat = fs.lstatSync(sourcePath);
    if (stat.isSymbolicLink()) {
      throw new Error(`source package symlink is forbidden: ${sourcePath}`);
    }
    if (stat.isDirectory()) {
      fs.mkdirSync(targetPath);
      copyDirectory(sourcePath, targetPath);
    } else if (stat.isFile()) {
      fs.copyFileSync(sourcePath, targetPath);
    } else {
      throw new Error(`unsupported source package entry: ${sourcePath}`);
    }
  }
}

function createZip(outputRoot, zipFile) {
  const result = childProcess.spawnSync(
    'zip',
    ['-X', '-q', '-r', zipFile, PACKAGE_FOLDER_NAME],
    {
      cwd: outputRoot,
      encoding: 'utf8'
    }
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `zip failed with status ${result.status}\n` +
      `${result.stdout || ''}${result.stderr || ''}`
    );
  }
}

function packageH5(options = {}) {
  const outputRoot = path.resolve(options.outputRoot || DEFAULT_OUTPUT_ROOT);
  const zipName = options.zipName || DEFAULT_ZIP_NAME;
  assertSafeName(PACKAGE_FOLDER_NAME, 'package folder name');
  assertSafeName(zipName, 'zip file name');

  syncRelease();
  validatePackageDirectory(RELEASE_ROOT);

  ensureRealDirectory(outputRoot, 'H5 package output root');
  const packageRoot = path.join(outputRoot, PACKAGE_FOLDER_NAME);
  const zipFile = path.join(outputRoot, zipName);
  assertOwnedRemoval(outputRoot, packageRoot, 'package root cleanup');
  assertOwnedRemoval(outputRoot, zipFile, 'package zip cleanup');

  fs.rmSync(packageRoot, { recursive: true, force: true });
  fs.rmSync(zipFile, { force: true });
  fs.mkdirSync(packageRoot);
  copyDirectory(RELEASE_ROOT, packageRoot);

  const validation = validatePackageDirectory(packageRoot);
  createZip(outputRoot, zipFile);

  return Object.freeze({
    packageFolderName: PACKAGE_FOLDER_NAME,
    stagingRoot: outputRoot,
    packageRoot,
    zipFile,
    files: validation.files,
    totalBytes: validation.totalBytes
  });
}

if (require.main === module) {
  try {
    const result = packageH5();
    console.log(
      `H5 package created: ${path.relative(SOURCE_ROOT, result.zipFile)} ` +
      `(${result.files.length} files, ${result.totalBytes} bytes)`
    );
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    process.exitCode = 1;
  }
}

module.exports = {
  DEFAULT_OUTPUT_ROOT,
  DEFAULT_ZIP_NAME,
  MAX_PACKAGE_BYTES,
  PACKAGE_FOLDER_NAME,
  htmlReferences,
  packageH5,
  validatePackageDirectory
};
