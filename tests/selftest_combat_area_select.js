'use strict';

const fs = require('fs');
const path = require('path');

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assert failed');
}

const ROOT = path.join(__dirname, '..');
const Combat = require('../content/combat.js');

assert(Object.keys(Combat.REGIONS).length === 9, '9 regions');
assert(Object.keys(Combat.DUNGEONS).length === 9, '9 dungeons');

Object.values(Combat.REGIONS).forEach(function (region) {
  assert(typeof region.bannerSrc === 'string' && region.bannerSrc, region.id + ' bannerSrc');
  assert(fs.existsSync(path.join(ROOT, region.bannerSrc)), region.bannerSrc + ' exists');
});

Object.values(Combat.DUNGEONS).forEach(function (dungeon) {
  assert(typeof dungeon.bannerSrc === 'string' && dungeon.bannerSrc, dungeon.id + ' bannerSrc');
  assert(fs.existsSync(path.join(ROOT, dungeon.bannerSrc)), dungeon.bannerSrc + ' exists');
});

const progressSrc = fs.readFileSync(path.join(ROOT, 'core/combat-progress.js'), 'utf8');
assert(progressSrc.includes("bannerSrc: dataValue(region, 'bannerSrc')"), 'queryRegions exposes bannerSrc');
assert(progressSrc.includes("bannerSrc: dataValue(dungeon, 'bannerSrc')"), 'queryDungeons exposes bannerSrc');

Object.values(Combat.ENEMIES).forEach(function (enemy) {
  assert(typeof enemy.portraitSrc === 'string' && enemy.portraitSrc, enemy.id + ' portraitSrc');
  assert(fs.existsSync(path.join(ROOT, enemy.portraitSrc)), enemy.portraitSrc + ' exists');
});

const uiSrc = require('./ui_scripts').readUiSource();
assert(uiSrc.includes('combat-entry-grid'), 'shared combat entry grid used');
assert(uiSrc.includes('openRegionDetailModal'), 'region detail modal exists');
assert(uiSrc.includes('openDungeonDetailModal'), 'dungeon detail modal exists');
assert(uiSrc.includes('regionDetail'), 'regionDetail modal registered');
assert(uiSrc.includes('dungeonDetail'), 'dungeonDetail modal registered');
assert(uiSrc.includes('region-enemy-art'), 'region enemy art image class');
assert(!uiSrc.includes("'首通奖励：' + rewardRowsText"), 'dungeon cards no longer use raw reward text');

const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
assert(css.includes('.combat-entry-grid'), 'combat entry grid styles');
assert(css.includes('.drop-icon-chip'), 'drop chip styles');
assert(css.includes('grid-template-columns: repeat(3'), 'three-column entry grid');

console.log('OK: combat area select smoke passed');
