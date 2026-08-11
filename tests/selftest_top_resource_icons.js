'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  alphaBounds,
  readPngRgba
} = require('../scripts/png-rgba.js');

const ROOT = path.join(__dirname, '..');
const IDS = ['lingshi', 'jingqi', 'mood', 'shengwang', 'shouyuan'];

function centeredOffset(image, bounds) {
  return {
    x: Math.abs((image.width - 1) / 2 - (bounds.minX + bounds.maxX) / 2),
    y: Math.abs((image.height - 1) / 2 - (bounds.minY + bounds.maxY) / 2)
  };
}

let checked = 0;
[100, 50].forEach(function (size) {
  IDS.forEach(function (id) {
    const relative = path.join(
      'assets',
      'resource-icons',
      String(size),
      id + '.png'
    );
    const absolute = path.join(ROOT, relative);
    assert(fs.existsSync(absolute), relative + ' must exist');
    const image = readPngRgba(absolute);
    assert.strictEqual(image.width, size, relative + ' width');
    assert.strictEqual(image.height, size, relative + ' height');
    const cornerIndexes = [
      3,
      (size - 1) * 4 + 3,
      ((size - 1) * size) * 4 + 3,
      (size * size - 1) * 4 + 3
    ];
    assert(
      cornerIndexes.every(function (index) {
        return image.data[index] <= 8;
      }),
      relative + ' must have transparent corners'
    );
    const bounds = alphaBounds(image, 8);
    assert(bounds, relative + ' must contain visible icon pixels');
    const offset = centeredOffset(image, bounds);
    const tolerance = size === 50 ? 1.5 : 2.5;
    assert(
      offset.x <= tolerance && offset.y <= tolerance,
      relative + ' must be centered; offset=' +
        offset.x.toFixed(2) + ',' + offset.y.toFixed(2)
    );
    checked++;
  });
});

assert.strictEqual(checked, 10, 'all resource icon sizes are checked');
console.log('Top resource icon self-test passed: ' + checked);
