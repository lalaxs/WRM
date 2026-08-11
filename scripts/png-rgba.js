'use strict';

const fs = require('fs');
const zlib = require('zlib');

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a
]);

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let index = 0; index < buffer.length; index++) {
    crc ^= buffer[index];
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function paeth(left, up, upperLeft) {
  const estimate = left + up - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= upDistance && leftDistance <= upperLeftDistance) {
    return left;
  }
  return upDistance <= upperLeftDistance ? up : upperLeft;
}

function sourceBytesPerPixel(colorType) {
  if (colorType === 0 || colorType === 3) return 1;
  if (colorType === 2) return 3;
  if (colorType === 4) return 2;
  if (colorType === 6) return 4;
  throw new Error('unsupported PNG color type: ' + colorType);
}

function channelsForColorType(colorType) {
  if (colorType === 0 || colorType === 3) return 1;
  if (colorType === 2) return 3;
  if (colorType === 4) return 2;
  if (colorType === 6) return 4;
  throw new Error('unsupported PNG color type: ' + colorType);
}

function unfilter(scanlines, width, height, bytesPerPixel, rowBytes) {
  const rows = [];
  let offset = 0;
  let previous = Buffer.alloc(rowBytes);
  for (let y = 0; y < height; y++) {
    const filter = scanlines[offset++];
    const encoded = scanlines.subarray(offset, offset + rowBytes);
    offset += rowBytes;
    const row = Buffer.alloc(rowBytes);
    for (let x = 0; x < rowBytes; x++) {
      const raw = encoded[x];
      const left = x >= bytesPerPixel ? row[x - bytesPerPixel] : 0;
      const up = previous[x];
      const upperLeft = x >= bytesPerPixel
        ? previous[x - bytesPerPixel]
        : 0;
      let value;
      if (filter === 0) value = raw;
      else if (filter === 1) value = raw + left;
      else if (filter === 2) value = raw + up;
      else if (filter === 3) value = raw + Math.floor((left + up) / 2);
      else if (filter === 4) value = raw + paeth(left, up, upperLeft);
      else throw new Error('unsupported PNG filter: ' + filter);
      row[x] = value & 0xff;
    }
    rows.push(row);
    previous = row;
  }
  return rows;
}

function readPngRgba(filePath) {
  const source = fs.readFileSync(filePath);
  if (!source.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error('not a PNG file: ' + filePath);
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  let palette = null;
  let transparency = null;
  const idat = [];

  while (offset < source.length) {
    const length = source.readUInt32BE(offset);
    offset += 4;
    const type = source.toString('ascii', offset, offset + 4);
    offset += 4;
    const data = source.subarray(offset, offset + length);
    offset += length;
    offset += 4;

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'PLTE') {
      palette = data;
    } else if (type === 'tRNS') {
      transparency = data;
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }

  if (bitDepth !== 8 || interlace !== 0) {
    throw new Error('unsupported PNG format: ' + filePath);
  }

  const channels = channelsForColorType(colorType);
  const bytesPerPixel = sourceBytesPerPixel(colorType);
  const rowBytes = width * channels;
  const inflated = zlib.inflateSync(Buffer.concat(idat));
  const rows = unfilter(inflated, width, height, bytesPerPixel, rowBytes);
  const rgba = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y++) {
    const row = rows[y];
    for (let x = 0; x < width; x++) {
      const sourceIndex = x * channels;
      const targetIndex = (y * width + x) * 4;
      if (colorType === 0) {
        const gray = row[sourceIndex];
        rgba[targetIndex] = gray;
        rgba[targetIndex + 1] = gray;
        rgba[targetIndex + 2] = gray;
        rgba[targetIndex + 3] = 255;
      } else if (colorType === 2) {
        rgba[targetIndex] = row[sourceIndex];
        rgba[targetIndex + 1] = row[sourceIndex + 1];
        rgba[targetIndex + 2] = row[sourceIndex + 2];
        rgba[targetIndex + 3] = 255;
      } else if (colorType === 3) {
        if (!palette) throw new Error('indexed PNG missing palette');
        const paletteIndex = row[sourceIndex] * 3;
        rgba[targetIndex] = palette[paletteIndex] || 0;
        rgba[targetIndex + 1] = palette[paletteIndex + 1] || 0;
        rgba[targetIndex + 2] = palette[paletteIndex + 2] || 0;
        rgba[targetIndex + 3] = transparency &&
          row[sourceIndex] < transparency.length
          ? transparency[row[sourceIndex]]
          : 255;
      } else if (colorType === 4) {
        const gray = row[sourceIndex];
        rgba[targetIndex] = gray;
        rgba[targetIndex + 1] = gray;
        rgba[targetIndex + 2] = gray;
        rgba[targetIndex + 3] = row[sourceIndex + 1];
      } else if (colorType === 6) {
        rgba[targetIndex] = row[sourceIndex];
        rgba[targetIndex + 1] = row[sourceIndex + 1];
        rgba[targetIndex + 2] = row[sourceIndex + 2];
        rgba[targetIndex + 3] = row[sourceIndex + 3];
      }
    }
  }

  return { width, height, data: rgba };
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const payload = data || Buffer.alloc(0);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(payload.length, 0);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, payload])), 0);
  return Buffer.concat([length, typeBuffer, payload, checksum]);
}

function writePngRgba(filePath, image) {
  const width = image.width;
  const height = image.height;
  const rgba = Buffer.from(image.data);
  if (!Number.isSafeInteger(width) ||
      !Number.isSafeInteger(height) ||
      rgba.length !== width * height * 4) {
    throw new Error('invalid RGBA image');
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }

  const output = Buffer.concat([
    PNG_SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND')
  ]);
  fs.writeFileSync(filePath, output);
}

function alphaBounds(image, minimumAlpha) {
  const threshold = minimumAlpha == null ? 8 : minimumAlpha;
  let minX = image.width;
  let minY = image.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const alpha = image.data[(y * image.width + x) * 4 + 3];
      if (alpha > threshold) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  return maxX >= minX ? { minX, minY, maxX, maxY } : null;
}

module.exports = Object.freeze({
  readPngRgba,
  writePngRgba,
  alphaBounds
});
