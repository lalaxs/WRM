'use strict';

// Current native-DOM contract. Specialized equipment, party, farm and item-tip
// suites cover their interaction details; this exercises the production shell,
// canonical skill dialogs, isolation, recovery and reload lifecycle together.
const assert = require('assert');
const fs = require('fs');
const { createRuntime, byClass, allText, firstClass } = require('./dom-harness');
const NOW = 1735689600000;
const controls = { saveMode: 'ok', saveAttempts: 0 };
const store = {};
const runtime = createRuntime(store, NOW, controls, true);
const { api, ui, root } = runtime;

assert.deepStrictEqual(Object.keys(api).sort(), ['commands', 'queries', 'render']);
for (const surface of [api, api.queries, api.commands, api.render]) assert(Object.isFrozen(surface));
assert.deepStrictEqual(Object.keys(api.render).sort(),
  ['drawCharacter', 'drawCharacterAppearance', 'randomNieParts']);
assert.strictEqual(api.queries.app().phase, 'create');
assert(api.commands.confirmCreate().ok);
ui.renderGame(true);
assert.strictEqual(api.queries.app().phase, 'game');
assert.strictEqual(byClass(root, 'cave-card').length, 5);
const indices = api.queries.app().appearance.indices;
assert(Object.isFrozen(indices));
assert.throws(() => { indices.cloth = 999; }, TypeError);

const globals = createRuntime({}, NOW, null, false, {
  browserTopology: true, captureFrames: true, interceptRenderer: true,
  requestTestHarness: true
});
for (const key of ['state', 'save', 'persist', 'applyModelToRuntime', 'setCurrent',
  'tryBreakthrough', 'confirmCreate', 'randomize', 'stepPart', '__GameTestHarness']) {
  assert(!(key in globals.sandbox), key + ' is private to the composition');
}
assert(globals.scheduledFrames.length > 0);
globals.scheduledFrames[0]();
assert.strictEqual(globals.rendererCalls[0].length, 0);

function navigate(label) {
  const items = api.queries.navigation().items;
  const index = items.findIndex(item => item.label === label);
  assert(index >= 0, label + ' exists in navigation');
  assert(api.commands.switchNav({ index }).ok);
  ui.renderGame(true);
  if (api.queries.app().phase === 'edit') {
    assert(api.commands.saveAppearance().ok);
    ui.renderGame(true);
  }
}

// Every shipped page can render using only the real frozen GameAPI surface.
for (const item of api.queries.navigation().items) {
  navigate(item.label);
  assert(allText(root).length > 0, item.label + ' renders');
}
navigate('洞府');
assert.strictEqual(byClass(root, 'cave-card').length, 5);
firstClass(root, 'cave-card').click();
assert.strictEqual(byClass(root, 'plot-card').length, 3);
navigate('背包');
navigate('洞府');
assert.strictEqual(byClass(root, 'plot-card').length, 3,
  'cached home page retains the selected subpage');
firstClass(root, 'cave-back').click();
assert.strictEqual(byClass(root, 'cave-card').length, 5);

// Tile selection opens a detail dialog; starting/stopping uses its canonical key.
navigate('采药');
function activePage() {
  const current = runtime.sandbox.window.XiuxianUi.contentState;
  return current.pages[current.key].host;
}
const exploreTile = firstClass(activePage(), 'explore-card');
assert(byClass(activePage(), 'explore-card').length === 1);
exploreTile.click();
const skillModal = runtime.sandbox.window.XiuxianUi.modals.skillAction;
assert.strictEqual(skillModal.root.style.display, 'flex');
firstClass(skillModal.root, 'action-start').click();
ui.renderGame(true);
assert.strictEqual(api.queries.gatherPage('采药').explore.active, true);
assert.strictEqual(firstClass(activePage(), 'explore-card'), exploreTile,
  'progress-only updates preserve the interactive tile');
for (let index = 0; index < 3; index++) ui.renderGame(true);
assert.strictEqual(firstClass(activePage(), 'explore-card'), exploreTile);
firstClass(activePage(), 'explore-card').click();
firstClass(skillModal.root, 'action-stop').click();
assert.strictEqual(api.queries.gatherPage('采药').explore.active, false);

// A failed save is visible and locks further mutations until explicit retry.
controls.saveMode = 'false';
firstClass(activePage(), 'explore-card').click();
firstClass(skillModal.root, 'action-start').click();
ui.renderGame(true);
assert(api.queries.persistence().locked);
assert(allText(root).includes('保存失败'));
const beforeRetry = controls.saveAttempts;
ui.renderGame(true);
ui.renderGame(true);
assert.strictEqual(controls.saveAttempts, beforeRetry);
controls.saveMode = 'ok';
assert(api.commands.retryPersistence().ok);
assert.strictEqual(api.queries.persistence().locked, false);
assert(api.commands.stopAction().ok);

// Reopening at the same watermark never duplicates saved rewards or reports.
const saved = JSON.parse(store.cloud_save_v1);
const reopened = createRuntime(store, NOW, null, true);
reopened.ui.renderGame(true);
assert.strictEqual(reopened.api.queries.app().phase, 'game');
const afterReload = JSON.parse(store.cloud_save_v1);
assert.deepStrictEqual(afterReload.player.inventory, saved.player.inventory);
assert.strictEqual(afterReload.rngState, saved.rngState);
assert.deepStrictEqual(afterReload.reportArchive, saved.reportArchive);

const uiSource = require('./ui_scripts').readUiSource();
assert(!/GameAPI\.(state|data|persist)|\ba\.state\b/.test(uiSource));
const css = require('./ui_scripts').readStylesSource();
assert(/overflow-x\s*:\s*hidden/.test(css));
assert(/@media\s*\([^)]*max-width\s*:\s*520px/.test(css));
console.log('Native DOM shell, all pages, skill dialogs, ownership and save recovery passed');
