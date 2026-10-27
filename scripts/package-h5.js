'use strict';

const fs = require('fs');
const path = require('path');
const { writeZip } = require('./zip');
const { buildWebAssets } = require('./build-web-assets');
const { listFiles, removeGenerated } = require('./files');
const { SOURCE_ROOT, RUNTIME_FILES } = require('./runtime-files');

const PACKAGE_FOLDER_NAME = 'xiuxian-idle-h5';
const MAX_PACKAGE_BYTES = 60 * 1024 * 1024;
const DEFAULT_OUTPUT_ROOT = path.join(SOURCE_ROOT, 'dist/h5');
const DEFAULT_ZIP_NAME = PACKAGE_FOLDER_NAME + '.zip';

function htmlReferences(packageRoot) {
  return Array.from(fs.readFileSync(path.join(packageRoot, 'index.html'), 'utf8')
    .matchAll(/(?:src|href)="([^"]+)"/g), match => match[1].split(/[?#]/)[0])
    .filter(file => file && !/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(file));
}

function validatePackageDirectory(packageRoot) {
  const files = listFiles(packageRoot);
  for (const required of ['index.html', 'game.json', 'project.config.json']) {
    if (!files.includes(required)) {
      throw new Error('Missing H5 file: ' + required);
    }
  }
  for (const file of htmlReferences(packageRoot)) {
    if (!files.includes(file)) throw new Error('Missing HTML asset: ' + file);
  }
  const totalBytes = files.reduce((sum, file) => sum + fs.statSync(path.join(packageRoot, file)).size, 0);
  if (totalBytes > MAX_PACKAGE_BYTES) throw new Error('H5 package exceeds 60 MiB');
  return { files, totalBytes };
}

function packageH5({ outputRoot = DEFAULT_OUTPUT_ROOT, zipName = DEFAULT_ZIP_NAME } = {}) {
  outputRoot = path.resolve(outputRoot);
  if (path.basename(zipName) !== zipName || !zipName.endsWith('.zip')) {
    throw new Error('zipName must be a ZIP filename');
  }
  fs.mkdirSync(outputRoot, { recursive: true });
  removeGenerated(outputRoot, PACKAGE_FOLDER_NAME);
  removeGenerated(outputRoot, zipName);
  const packageRoot = path.join(outputRoot, PACKAGE_FOLDER_NAME);
  fs.mkdirSync(packageRoot);
  for (const file of RUNTIME_FILES) {
    const target = path.join(packageRoot, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(SOURCE_ROOT, file), target);
  }
  const assetManifest = buildWebAssets(packageRoot);
  const validation = validatePackageDirectory(packageRoot);
  const zipFile = path.join(outputRoot, zipName);
  writeZip(packageRoot, validation.files, PACKAGE_FOLDER_NAME, zipFile);
  return { packageFolderName: PACKAGE_FOLDER_NAME, stagingRoot: outputRoot,
    packageRoot, zipFile, assetManifest, ...validation };
}

if (require.main === module) {
  const result = packageH5();
  console.log('H5 package created: ' + path.relative(SOURCE_ROOT, result.zipFile) +
    ' (' + result.files.length + ' files, ' + result.totalBytes + ' bytes)');
}

module.exports = { DEFAULT_OUTPUT_ROOT, DEFAULT_ZIP_NAME, MAX_PACKAGE_BYTES,
  PACKAGE_FOLDER_NAME, htmlReferences, packageH5, validatePackageDirectory };
