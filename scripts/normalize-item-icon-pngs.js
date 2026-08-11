'use strict';

const fs = require('fs');
const path = require('path');
const {
  alphaBounds,
  readPngRgba,
  writePngRgba
} = require('./png-rgba.js');

const ROOT = path.resolve(__dirname, '..');
const ICON_DIRS = [
  path.join(ROOT, 'assets/item-icons/50'),
  path.join(ROOT, 'assets/item-icons/100')
];

function listPngFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory)
    .filter((entry) => entry.endsWith('.png'))
    .map((entry) => path.join(directory, entry))
    .sort();
}

function pixel(image, x, y) {
  const offset = (y * image.width + x) * 4;
  return [
    image.data[offset],
    image.data[offset + 1],
    image.data[offset + 2],
    image.data[offset + 3]
  ];
}

function median(values) {
  if (!values.length) return 255;
  const sorted = values.slice().sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
}

function estimateBackground(image) {
  const red = [];
  const green = [];
  const blue = [];
  function add(x, y) {
    const [r, g, b, a] = pixel(image, x, y);
    if (a >= 180) {
      red.push(r);
      green.push(g);
      blue.push(b);
    }
  }
  for (let x = 0; x < image.width; x++) {
    add(x, 0);
    add(x, image.height - 1);
  }
  for (let y = 1; y < image.height - 1; y++) {
    add(0, y);
    add(image.width - 1, y);
  }
  return {
    r: median(red),
    g: median(green),
    b: median(blue)
  };
}

function isNearWhiteBackground(image, x, y, background) {
  const [r, g, b, a] = pixel(image, x, y);
  if (a < 180) return false;
  const brightest = Math.max(r, g, b);
  const darkest = Math.min(r, g, b);
  const maxBackgroundDelta = Math.max(
    Math.abs(r - background.r),
    Math.abs(g - background.g),
    Math.abs(b - background.b)
  );
  return darkest >= 238 &&
    brightest - darkest <= 18 &&
    maxBackgroundDelta <= 24;
}

function edgeConnectedBackgroundMask(image) {
  const background = estimateBackground(image);
  const total = image.width * image.height;
  const visited = new Uint8Array(total);
  const queue = [];

  function push(x, y) {
    if (x < 0 || y < 0 || x >= image.width || y >= image.height) return;
    const index = y * image.width + x;
    if (visited[index]) return;
    if (!isNearWhiteBackground(image, x, y, background)) return;
    visited[index] = 1;
    queue.push(index);
  }

  for (let x = 0; x < image.width; x++) {
    push(x, 0);
    push(x, image.height - 1);
  }
  for (let y = 1; y < image.height - 1; y++) {
    push(0, y);
    push(image.width - 1, y);
  }

  for (let head = 0; head < queue.length; head++) {
    const index = queue[head];
    const x = index % image.width;
    const y = Math.floor(index / image.width);
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  return visited;
}

function removeBackground(image) {
  const mask = edgeConnectedBackgroundMask(image);
  let removed = 0;
  const next = Buffer.from(image.data);
  for (let index = 0; index < mask.length; index++) {
    if (!mask[index]) continue;
    const offset = index * 4;
    next[offset] = 0;
    next[offset + 1] = 0;
    next[offset + 2] = 0;
    next[offset + 3] = 0;
    removed++;
  }
  return {
    width: image.width,
    height: image.height,
    data: next,
    removed
  };
}

function centeredImage(image) {
  const bounds = alphaBounds(image, 8);
  if (!bounds) return { image, dx: 0, dy: 0 };
  const bodyWidth = bounds.maxX - bounds.minX + 1;
  const bodyHeight = bounds.maxY - bounds.minY + 1;
  const targetMinX = Math.round((image.width - bodyWidth) / 2);
  const targetMinY = Math.round((image.height - bodyHeight) / 2);
  const dx = targetMinX - bounds.minX;
  const dy = targetMinY - bounds.minY;
  if (dx === 0 && dy === 0) return { image, dx, dy };

  const next = Buffer.alloc(image.width * image.height * 4);
  for (let y = bounds.minY; y <= bounds.maxY; y++) {
    for (let x = bounds.minX; x <= bounds.maxX; x++) {
      const source = (y * image.width + x) * 4;
      const alpha = image.data[source + 3];
      if (alpha <= 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= image.width || ny >= image.height) {
        continue;
      }
      const target = (ny * image.width + nx) * 4;
      next[target] = image.data[source];
      next[target + 1] = image.data[source + 1];
      next[target + 2] = image.data[source + 2];
      next[target + 3] = alpha;
    }
  }

  return {
    image: {
      width: image.width,
      height: image.height,
      data: next
    },
    dx,
    dy
  };
}

function normalizeFile(filePath, dryRun) {
  const original = readPngRgba(filePath);
  const withoutBackground = removeBackground(original);
  const centered = centeredImage(withoutBackground);
  const changed = !original.data.equals(centered.image.data);
  if (changed && !dryRun) writePngRgba(filePath, centered.image);
  return {
    filePath,
    changed,
    removed: withoutBackground.removed,
    dx: centered.dx,
    dy: centered.dy
  };
}

function run(options) {
  const dryRun = options && options.dryRun;
  const files = ICON_DIRS.flatMap(listPngFiles);
  const results = files.map((filePath) => normalizeFile(filePath, dryRun));
  const changed = results.filter((result) => result.changed);
  return {
    scanned: files.length,
    changed: changed.length,
    results
  };
}

if (require.main === module) {
  const result = run({ dryRun: process.argv.includes('--check') });
  console.log(
    'item icon PNG normalization: scanned=' + result.scanned +
      ' changed=' + result.changed
  );
  result.results
    .filter((row) => row.changed)
    .slice(0, 12)
    .forEach((row) => {
      console.log(
        '  ' + path.relative(ROOT, row.filePath) +
          ' removed=' + row.removed +
          ' shift=' + row.dx + ',' + row.dy
      );
    });
}

module.exports = Object.freeze({
  run,
  normalizeFile
});
