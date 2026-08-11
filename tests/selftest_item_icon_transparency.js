'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { alphaBounds, readPngRgba } = require('../scripts/png-rgba.js');

const ROOT = path.join(__dirname, '..');
const ICON_DIRS = [
  path.join(ROOT, 'assets/item-icons/50'),
  path.join(ROOT, 'assets/item-icons/100')
];

function pngFiles(directory) {
  return fs.readdirSync(directory)
    .filter((entry) => entry.endsWith('.png'))
    .map((entry) => path.join(directory, entry))
    .sort();
}

function cornerAlphas(image) {
  const coords = [
    [0, 0],
    [image.width - 1, 0],
    [0, image.height - 1],
    [image.width - 1, image.height - 1]
  ];
  return coords.map(([x, y]) =>
    image.data[(y * image.width + x) * 4 + 3]
  );
}

function centerOffset(image, bounds) {
  const canvasCenterX = (image.width - 1) / 2;
  const canvasCenterY = (image.height - 1) / 2;
  const iconCenterX = (bounds.minX + bounds.maxX) / 2;
  const iconCenterY = (bounds.minY + bounds.maxY) / 2;
  return {
    x: Math.abs(canvasCenterX - iconCenterX),
    y: Math.abs(canvasCenterY - iconCenterY)
  };
}

let checked = 0;
ICON_DIRS.forEach((directory) => {
  pngFiles(directory).forEach((filePath) => {
    const image = readPngRgba(filePath);
    const alphas = cornerAlphas(image);
    assert(
      alphas.every((alpha) => alpha <= 8),
      path.relative(ROOT, filePath) +
        ' must have transparent PNG corners, got alpha ' +
        alphas.join(',')
    );

    const bounds = alphaBounds(image, 8);
    assert(bounds, path.relative(ROOT, filePath) + ' must contain icon pixels');
    const offset = centerOffset(image, bounds);
    const tolerance = image.width <= 50 ? 1.5 : 2.5;
    assert(
      offset.x <= tolerance && offset.y <= tolerance,
      path.relative(ROOT, filePath) +
        ' icon body must be centered, offset=' +
        offset.x.toFixed(2) + ',' + offset.y.toFixed(2)
    );
    checked++;
  });
});

assert(checked > 0, 'item icon PNG transparency selftest must scan PNG assets');
console.log('Item icon transparency self-test passed: ' + checked);
