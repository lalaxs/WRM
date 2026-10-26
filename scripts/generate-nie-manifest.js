'use strict';

const fs = require('fs');
const path = require('path');

function sortByParenNumber(a, b) {
  const na = parseInt((a.match(/\((\d+)\)/) || [])[1] || '0', 10);
  const nb = parseInt((b.match(/\((\d+)\)/) || [])[1] || '0', 10);
  return na - nb;
}

function listFiles(dir, prefix) {
  return fs.readdirSync(dir)
    .filter(function (f) { return f.startsWith(prefix) && f.endsWith('.png'); })
    .sort(sortByParenNumber);
}

function buildCloth(dir, sectSuffix) {
  const generic = listFiles(dir, 'cloth (');
  const sects = ['baicao', 'lingshou', sectSuffix, 'taixuan', 'tiangong'];
  const out = generic.slice();
  sects.forEach(function (s) {
    listFiles(dir, 'cloth_' + s + ' (').forEach(function (f) { out.push(f); });
  });
  return out;
}

function listFaces(dir) {
  const files = fs.readdirSync(dir).filter(function (f) {
    return f.endsWith('.png') && (
      f === 'girl_face.png' ||
      f === 'boy_face.png' ||
      f.startsWith('face (') ||
      f.startsWith('face_') ||
      /_(face|body)\.png$/i.test(f)
    );
  });
  const numbered = files.filter(function (f) {
    return /\(\d+\)/.test(f) || /_\d+\.png$/i.test(f);
  }).sort(sortByParenNumber);
  const singles = files.filter(function (f) {
    return numbered.indexOf(f) < 0;
  }).sort();
  return numbered.concat(singles);
}

function buildGender(folder, sectCloth) {
  const dir = path.join('NIE', folder);
  return {
    hair_hou: listFiles(dir, 'hair_hou ('),
    cloth: buildCloth(dir, sectCloth),
    body: listFaces(dir),
    mouth: listFiles(dir, 'mouse ('),
    nose: listFiles(dir, 'nose ('),
    eyes: listFiles(dir, 'eye ('),
    hair_qian: listFiles(dir, 'hair_qian ('),
    deco: listFiles(dir, 'deco (')
  };
}

const manifest = {
  b: buildGender('boy', 'qinggong'),
  g: buildGender('girl', 'qingyin')
};

const outPath = path.join(__dirname, '..', 'nie-manifest.js');
const lines = [
  '(function(root, factory){',
  '  const m = factory();',
  '  if (typeof module !== \'undefined\' && module.exports) module.exports = m;',
  '  else root.NIE_MANIFEST = m;',
  '})(typeof globalThis !== \'undefined\' ? globalThis : this, function(){',
  '  return ' + JSON.stringify(manifest, null, 1) + ';',
  '});',
  ''
];

fs.writeFileSync(outPath, lines.join('\n'));
console.log('Wrote', outPath);
