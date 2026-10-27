'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Runtime = require('../runtime-modules.js');

// Build the distributable directly from the canonical source order.
function buildWebAssets(packageRoot) {
  const output = path.join(packageRoot, 'bundles');
  fs.mkdirSync(output, { recursive: true });
  const manifest = {};
  function emit(label, extension, bytes) {
    const hash = crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 16);
    const relative = 'bundles/' + label + '.' + hash + extension;
    fs.writeFileSync(path.join(packageRoot, relative), bytes);
    return relative;
  }
  function bundle(label, files) {
    const bytes = "'use strict';\n" + files.map(file =>
      '\n// ' + file + '\n' + fs.readFileSync(path.join(packageRoot, file), 'utf8') + '\n;'
    ).join('\n');
    const relative = emit(label, '.js', bytes);
    files.forEach(file => { manifest[file] = relative; });
    return relative;
  }
  const boot = bundle('boot', Runtime.BOOT_SCRIPTS);
  bundle('pages', Runtime.UI_PAGE_SCRIPTS);
  bundle('combat', Runtime.COMBAT_RUNTIME_SCRIPTS);
  for (const css of ['styles-shell.css', 'styles-game.css']) {
    manifest[css] = emit(css.replace('.css', ''), '.css',
      fs.readFileSync(path.join(packageRoot, css)));
  }
  let html = fs.readFileSync(path.join(packageRoot, 'index.html'), 'utf8');
  let inserted = false;
  html = html.replace(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>\s*<\/script>/gi,
    function (tag, src) {
      if (!Runtime.BOOT_SCRIPTS.includes(src.split('?')[0])) return tag;
      if (inserted) return '';
      inserted = true;
      return '<script>window.__H5_ASSETS__=' + JSON.stringify(manifest) + ';</script>\n' +
        '  <script defer src="' + boot + '"></script>';
    });
  if (!inserted) throw new Error('No canonical boot scripts found for bundling');
  html = html.replace(/href="styles-shell\.css(?:\?[^"\s]*)?"/g,
    'href="' + manifest['styles-shell.css'] + '"');
  fs.writeFileSync(path.join(packageRoot, 'index.html'), html);
  fs.writeFileSync(path.join(packageRoot, 'asset-manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n');
  // Bundled originals are development sources, not shipping assets.
  for (const file of Object.keys(manifest)) {
    fs.unlinkSync(path.join(packageRoot, file));
  }
  return manifest;
}

module.exports = { buildWebAssets };
