'use strict';

const path = require('path');
const { removeGenerated } = require('./files');
const root = path.resolve(__dirname, '..');
for (const name of ['dist', 'release']) removeGenerated(root, name);
console.log('Generated build outputs removed');
