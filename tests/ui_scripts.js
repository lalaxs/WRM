'use strict';

/**
 * Ordered UI script list — sourced from runtime-modules.js (single source of truth).
 */

const fs = require('fs');
const path = require('path');
const RuntimeModules = require('../runtime-modules.js');

const ROOT = path.join(__dirname, '..');

const UI_BOOT_SCRIPT_FILES = RuntimeModules.UI_BOOT_SCRIPTS;
const UI_PAGE_SCRIPT_FILES = RuntimeModules.UI_PAGE_SCRIPTS;
const UI_SCRIPT_FILES = RuntimeModules.UI_TEST_SCRIPTS;

function uiScriptPaths() {
  return UI_SCRIPT_FILES.map((rel) => path.join(ROOT, rel));
}

function readUiSource() {
  return UI_SCRIPT_FILES.map((rel) =>
    fs.readFileSync(path.join(ROOT, rel), 'utf8')
  ).join('\n');
}

function loadUiScripts(vm, sandbox, options) {
  const opts = options || {};
  UI_SCRIPT_FILES.forEach((rel) => {
    const file = path.join(ROOT, rel);
    vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, {
      filename: opts.filename || rel
    });
  });
}

module.exports = {
  UI_SCRIPT_FILES,
  UI_BOOT_SCRIPT_FILES,
  UI_PAGE_SCRIPT_FILES,
  uiScriptPaths,
  readUiSource,
  loadUiScripts
};
