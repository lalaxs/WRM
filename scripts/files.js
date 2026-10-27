'use strict';

const fs = require('fs');
const path = require('path');

function listFiles(root, directory = '') {
  return fs.readdirSync(path.join(root, directory), { withFileTypes: true })
    .sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)
    .flatMap(entry => {
      const relative = path.posix.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error('Runtime symlink: ' + relative);
      return entry.isDirectory() ? listFiles(root, relative) : [relative];
    });
}

// Delete only a named child of the explicitly supplied build directory. Never
// follow symlinks; unlink/rmdir also work with Unicode paths on Windows.
function removeGenerated(root, name) {
  const base = path.resolve(root);
  const target = path.resolve(base, name);
  if (path.dirname(target) !== base) throw new Error('Invalid generated path: ' + name);
  function remove(file) {
    if (!fs.existsSync(file)) return;
    const stat = fs.lstatSync(file);
    if (stat.isDirectory() && !stat.isSymbolicLink()) {
      for (const entry of fs.readdirSync(file)) remove(path.join(file, entry));
      fs.rmdirSync(file);
    } else fs.unlinkSync(file);
  }
  remove(target);
}

module.exports = { listFiles, removeGenerated };
