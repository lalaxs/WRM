'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const { Script } = require('vm');
const { packageH5, PACKAGE_FOLDER_NAME } = require('../scripts/package-h5');
const { removeGenerated } = require('../scripts/files');
const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'wrm-package-'));
const outputRoot = path.join(parent, '构建验证');

try {
  const result = packageH5({ outputRoot });
  const zip = fs.readFileSync(result.zipFile);
  const names = [];
  let offset = 0;
  while (zip.readUInt32LE(offset) === 0x04034B50) {
    const method = zip.readUInt16LE(offset + 8);
    const size = zip.readUInt32LE(offset + 18);
    const nameLength = zip.readUInt16LE(offset + 26);
    const extraLength = zip.readUInt16LE(offset + 28);
    const name = zip.toString('utf8', offset + 30, offset + 30 + nameLength);
    assert(name.startsWith(PACKAGE_FOLDER_NAME + '/'));
    const relative = name.slice(PACKAGE_FOLDER_NAME.length + 1);
    const start = offset + 30 + nameLength + extraLength;
    const bytes = zip.subarray(start, start + size);
    const raw = method === 8 ? zlib.inflateRawSync(bytes) : bytes;
    assert.strictEqual(zip.readUInt32LE(offset + 14), zlib.crc32(raw));
    assert(raw.equals(fs.readFileSync(path.join(result.packageRoot, relative))));
    assert(!/^(?:tests|tools|docs|scripts|release)\//.test(relative));
    names.push(relative);
    offset = start + size;
  }
  assert.deepStrictEqual(names.sort(), result.files.slice().sort());
  assert.strictEqual(zip.readUInt32LE(zip.length - 22), 0x06054B50);
  assert.strictEqual(zip.readUInt16LE(zip.length - 12), names.length);
  for (const file of new Set(Object.values(result.assetManifest))) {
    assert(fs.existsSync(path.join(result.packageRoot, file)));
    if (file.endsWith('.js')) new Script(fs.readFileSync(path.join(result.packageRoot, file), 'utf8'));
  }
  assert(!result.files.includes('game.js'), 'bundled sources are not duplicated in the package');
  assert(!fs.existsSync(path.resolve(__dirname, '../release')), 'packaging needs no source mirror');
  fs.writeFileSync(path.join(result.packageRoot, 'obsolete.txt'), 'stale');
  const repeated = packageH5({ outputRoot });
  assert(!fs.existsSync(path.join(repeated.packageRoot, 'obsolete.txt')));
  assert(fs.readFileSync(repeated.zipFile).equals(zip), 'repeat builds produce the same archive');
  console.log('H5 references, archive CRC/content and repeat build passed: ' + names.length + ' files');
} finally {
  removeGenerated(os.tmpdir(), path.basename(parent));
}
