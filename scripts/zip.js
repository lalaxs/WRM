'use strict';

// Small, deterministic ZIP writer for the bounded H5 package. Uses only Node
// built-ins so packaging works identically on Windows, macOS and Linux.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) {
    value = value & 1 ? 0xEDB88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(bytes) {
  let value = 0xFFFFFFFF;
  for (const byte of bytes) value = crcTable[(value ^ byte) & 255] ^ (value >>> 8);
  return (value ^ 0xFFFFFFFF) >>> 0;
}

function writeZip(root, files, prefix, destination) {
  if (files.length > 65535) throw new Error('ZIP entry limit exceeded');
  const fd = fs.openSync(destination, 'wx');
  const central = [];
  let offset = 0;
  let succeeded = false;
  try {
    for (const relative of files.slice().sort()) {
      const name = Buffer.from(prefix + '/' + relative, 'utf8');
      const raw = fs.readFileSync(path.join(root, relative));
      const deflated = zlib.deflateRawSync(raw);
      const compressed = deflated.length < raw.length;
      const body = compressed ? deflated : raw;
      const checksum = crc32(raw);
      if (name.length > 65535 || offset + body.length > 0xFFFFFFFF) {
        throw new Error('ZIP64 is not supported by the H5 package writer');
      }
      const local = Buffer.alloc(30);
      local.writeUInt32LE(0x04034B50, 0);
      local.writeUInt16LE(20, 4);
      local.writeUInt16LE(0x0800, 6); // UTF-8 filenames
      local.writeUInt16LE(compressed ? 8 : 0, 8);
      local.writeUInt16LE(0x2821, 12); // fixed 2000-01-01
      local.writeUInt32LE(checksum, 14);
      local.writeUInt32LE(body.length, 18);
      local.writeUInt32LE(raw.length, 22);
      local.writeUInt16LE(name.length, 26);

      const entry = Buffer.alloc(46);
      entry.writeUInt32LE(0x02014B50, 0);
      entry.writeUInt16LE(20, 4);
      local.copy(entry, 6, 4, 30);
      entry.writeUInt32LE(offset, 42);
      central.push(entry, name);
      for (const part of [local, name, body]) {
        fs.writeSync(fd, part);
        offset += part.length;
      }
    }
    const centralStart = offset;
    for (const part of central) {
      fs.writeSync(fd, part);
      offset += part.length;
    }
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054B50, 0);
    end.writeUInt16LE(files.length, 8);
    end.writeUInt16LE(files.length, 10);
    end.writeUInt32LE(offset - centralStart, 12);
    end.writeUInt32LE(centralStart, 16);
    fs.writeSync(fd, end);
    succeeded = true;
  } finally {
    fs.closeSync(fd);
    if (!succeeded && fs.existsSync(destination)) fs.unlinkSync(destination);
  }
}

module.exports = { writeZip };
