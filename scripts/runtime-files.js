'use strict';

const path = require('path');
const Runtime = require('../runtime-modules');
const { listFiles } = require('./files');

const SOURCE_ROOT = path.resolve(__dirname, '..');
const RUNTIME_FILES = Runtime.buildPackageFiles(directory =>
  listFiles(path.join(SOURCE_ROOT, directory))
    .filter(file => /\.(png|jpe?g|webp|gif|svg|json)$/i.test(file))
    .map(file => directory + '/' + file));

module.exports = { SOURCE_ROOT, RUNTIME_FILES };
