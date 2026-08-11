'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const sourceRoot = path.join(__dirname, '..');
const packageJson = JSON.parse(
  fs.readFileSync(path.join(sourceRoot, 'package.json'), 'utf8')
);

assert.strictEqual(
  packageJson.scripts['package:h5'],
  'node scripts/package-h5.js',
  'package.json must expose the H5 packaging command'
);

const {
  PACKAGE_FOLDER_NAME,
  MAX_PACKAGE_BYTES,
  htmlReferences,
  packageH5
} = require('../scripts/package-h5.js');

assert.strictEqual(
  PACKAGE_FOLDER_NAME,
  'xiuxian-idle-h5',
  'H5 zip must contain one ASCII top-level folder'
);
assert.strictEqual(
  MAX_PACKAGE_BYTES,
  60 * 1024 * 1024,
  'H5 package budget must match TapTap first-package guidance'
);
assert.strictEqual(typeof packageH5, 'function');

const fixtureRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), 'xiuxian-h5-package-')
);

function listFiles(root, relativeDirectory = '') {
  const directory = relativeDirectory ? path.join(root, relativeDirectory) : root;
  const entries = fs.readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name));
  const files = [];
  for (const entry of entries) {
    const relativePath = relativeDirectory
      ? path.join(relativeDirectory, entry.name)
      : entry.name;
    if (entry.isDirectory()) {
      files.push(...listFiles(root, relativePath));
    } else if (entry.isFile()) {
      files.push(relativePath.split(path.sep).join('/'));
    }
  }
  return files;
}

try {
  const result = packageH5({
    outputRoot: fixtureRoot,
    zipName: 'fixture-h5.zip'
  });

  assert.strictEqual(result.packageFolderName, PACKAGE_FOLDER_NAME);
  assert(fs.existsSync(result.packageRoot), 'staged package root must exist');
  assert(fs.existsSync(result.zipFile), 'H5 zip must be created');
  assert(result.totalBytes > 0, 'package size must be measured');
  assert(
    result.totalBytes <= MAX_PACKAGE_BYTES,
    'package must stay within the configured H5 size budget'
  );

  const stagingEntries = fs.readdirSync(result.stagingRoot)
    .filter((entry) => entry !== path.basename(result.zipFile));
  assert.deepStrictEqual(
    stagingEntries,
    [PACKAGE_FOLDER_NAME],
    'zip staging area must contain exactly one top-level game folder'
  );

  const files = listFiles(result.packageRoot);
  const references = htmlReferences(result.packageRoot);
  assert(files.includes('index.html'), 'H5 package must include index.html');
  assert(files.includes('AdManager.js'), 'H5 package must include ad bridge');
  assert(files.includes('game.json'), 'H5 package must include game metadata');
  assert(
    files.includes('project.config.json'),
    'H5 package must include project metadata'
  );
  assert(
    files.some((file) => file.startsWith('NIE/') && file.endsWith('.png')),
    'H5 package must include browser image assets'
  );
  assert(
    references.includes('styles.css') && references.includes('ui.js'),
    'H5 validation must resolve cache-busted local references to package files'
  );
  assert(
    !references.some((reference) => reference.includes('?')),
    'H5 validation references must not include query strings'
  );
  assert(
    !files.some((file) =>
      file.endsWith('.import') ||
      file.startsWith('docs/') ||
      file.startsWith('scripts/') ||
      file.startsWith('selftest') ||
      file.includes('/selftest') ||
      file === '.DS_Store' ||
      file.startsWith('__MACOSX/')
    ),
    'H5 package must exclude editor metadata, tests, tools, and macOS cruft'
  );

  console.log(
    '\n=== H5 打包自测通过：' +
    `${files.length} 个文件 / ${result.totalBytes} 字节 ===`
  );
} finally {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
}
