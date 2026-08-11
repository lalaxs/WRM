'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'assets', 'combat-areas');

const REGIONS = [
  ['qingyunOutskirts', '青云山麓', '#7BAF7B', '#D8E8C8', '#5C8A5C', 'mountain'],
  ['blackIronRidge', '玄铁岭', '#6B7280', '#D1D5DB', '#374151', 'ridge'],
  ['redSandValley', '赤砂谷', '#C47A4A', '#F0D2B0', '#8B4513', 'valley'],
  ['mistSoulMarsh', '雾魂泽', '#7A6BA8', '#D8D0EC', '#4A3F6B', 'marsh'],
  ['thunderPeak', '雷霆峰', '#4A7AB5', '#C8DCF0', '#1E3A5F', 'peak'],
  ['voidRift', '虚空裂谷', '#5B4A7A', '#B8A8D0', '#2A1F3D', 'rift'],
  ['starfallAbyss', '星落渊', '#3A4A7A', '#A8B8E0', '#1A2040', 'abyss'],
  ['mahayanaAbyss', '大乘天渊', '#A86840', '#F0D8B0', '#6B3010', 'abyss'],
  ['ascensionTerrace', '飞升台', '#C8A858', '#F8F0D0', '#8A7030', 'terrace']
];

const DUNGEONS = [
  ['breathCave', '聚气洞', '#6B9A7B', '#C8E0D0', '#3F6B4F', 'cave'],
  ['foundationAltar', '筑基坛', '#7A7A8A', '#D8D8E0', '#404050', 'altar'],
  ['goldCoreRuins', '金丹遗府', '#B07A40', '#F0DCC0', '#6B4018', 'ruins'],
  ['nascentSoulTower', '元婴塔', '#6A5A98', '#D0C8E8', '#3A2F5A', 'tower'],
  ['spiritTransformationPeak', '化神天阶', '#3A6A9A', '#B8D0E8', '#1A3050', 'stairs'],
  ['voidRefiningRift', '炼虚裂境', '#4A3A6A', '#A898C0', '#201830', 'rift'],
  ['bodyIntegrationPalace', '合体古殿', '#4A5A8A', '#B0C0E0', '#202848', 'palace'],
  ['mahayanaTrial', '大乘道场', '#A06038', '#E8D0B0', '#5A3010', 'trial'],
  ['ascensionTrial', '飞升天关', '#B89848', '#F4E8C0', '#705820', 'gate']
];

function motif(kind, accent, dark) {
  if (kind === 'mountain' || kind === 'ridge' || kind === 'peak' || kind === 'terrace') {
    return (
      '<path fill="' + dark + '" opacity=".55" d="M0 88 L48 28 L96 88 Z"/>' +
      '<path fill="' + accent + '" opacity=".7" d="M40 88 L110 36 L160 88 Z"/>' +
      '<path fill="' + dark + '" opacity=".35" d="M120 88 L180 44 L240 88 Z"/>'
    );
  }
  if (kind === 'valley' || kind === 'marsh') {
    return (
      '<ellipse cx="80" cy="78" rx="70" ry="18" fill="' + dark + '" opacity=".35"/>' +
      '<ellipse cx="160" cy="82" rx="55" ry="14" fill="' + accent + '" opacity=".45"/>' +
      '<path fill="' + dark + '" opacity=".4" d="M20 70 Q60 40 100 68 T180 72 L180 90 L20 90Z"/>'
    );
  }
  if (kind === 'abyss' || kind === 'rift') {
    return (
      '<path fill="' + dark + '" opacity=".5" d="M40 20 L70 90 L20 90Z"/>' +
      '<path fill="' + accent + '" opacity=".55" d="M120 10 L160 90 L90 90Z"/>' +
      '<path fill="' + dark + '" opacity=".4" d="M190 30 L230 90 L160 90Z"/>' +
      '<circle cx="170" cy="36" r="4" fill="#fff" opacity=".55"/>' +
      '<circle cx="96" cy="28" r="3" fill="#fff" opacity=".4"/>'
    );
  }
  if (kind === 'cave') {
    return (
      '<path fill="' + dark + '" opacity=".55" d="M40 90 V48 Q80 18 120 48 V90Z"/>' +
      '<path fill="' + accent + '" opacity=".45" d="M70 90 V58 Q100 38 130 58 V90Z"/>'
    );
  }
  if (kind === 'altar' || kind === 'ruins' || kind === 'palace' || kind === 'trial' || kind === 'gate') {
    return (
      '<rect x="70" y="42" width="100" height="48" rx="4" fill="' + dark + '" opacity=".45"/>' +
      '<rect x="90" y="28" width="60" height="18" rx="3" fill="' + accent + '" opacity=".55"/>' +
      '<rect x="108" y="18" width="24" height="14" fill="' + dark + '" opacity=".5"/>'
    );
  }
  if (kind === 'tower' || kind === 'stairs') {
    return (
      '<rect x="100" y="20" width="40" height="70" fill="' + dark + '" opacity=".5"/>' +
      '<rect x="90" y="40" width="60" height="12" fill="' + accent + '" opacity=".45"/>' +
      '<rect x="85" y="58" width="70" height="12" fill="' + accent + '" opacity=".4"/>' +
      '<rect x="80" y="76" width="80" height="14" fill="' + dark + '" opacity=".45"/>'
    );
  }
  return '';
}

function svg(name, base, light, dark, kind) {
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="120" viewBox="0 0 240 90" role="img" aria-label="' + name + '">',
    '  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="' + light + '"/><stop offset="100%" stop-color="' + base + '"/></linearGradient></defs>',
    '  <rect width="240" height="90" fill="url(#g)"/>',
    '  <rect width="240" height="90" fill="' + base + '" opacity=".12"/>',
    '  ' + motif(kind, light, dark),
    '  <rect y="62" width="240" height="28" fill="#1A1520" opacity=".28"/>',
    '</svg>',
    ''
  ].join('\n');
}

fs.mkdirSync(DIR, { recursive: true });
REGIONS.concat(DUNGEONS).forEach(function (row) {
  const id = row[0];
  const name = row[1];
  const base = row[2];
  const light = row[3];
  const dark = row[4];
  const kind = row[5];
  fs.writeFileSync(path.join(DIR, id + '.svg'), svg(name, base, light, dark, kind));
});

console.log('wrote', REGIONS.length + DUNGEONS.length, 'svgs to', DIR);
