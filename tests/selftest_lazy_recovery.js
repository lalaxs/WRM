'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function environment() {
  const scripts = [];
  const state = { fail: true, attempts: 0 };
  const context = { console, Promise, URL,
    // Accelerate backoff in this network-state test, retaining task boundaries.
    setTimeout: (fn, ms) => setTimeout(fn, ms === 15000 ? ms : 0), clearTimeout,
    RuntimeModules: { UI_PAGE_SCRIPTS: ['ui/one.js', 'ui/two.js'],
      COMBAT_RUNTIME_SCRIPTS: ['core/combat.js'] },
    XiuxianUi: {},
    document: { currentScript: { src: 'https://game.invalid/core/lazy-content.js' },
      querySelector(selector) {
        const match = /="([^"]+)"/.exec(selector);
        return scripts.find(node => match &&
          node.getAttribute('data-lazy-src') === match[1]) || null;
      },
      createElement() {
        const attributes = {};
        return { setAttribute(key, value) { attributes[key] = value; },
          getAttribute: key => attributes[key], addEventListener() {} };
      },
      head: { appendChild(node) {
        scripts.push(node);
        node.parentNode = { removeChild(target) {
          scripts.splice(scripts.indexOf(target), 1);
          target.parentNode = null;
        } };
        state.attempts++;
        queueMicrotask(() => {
          if (state.fail) node.onerror();
          else {
            ['CombatStats', 'CombatEngine', 'CombatRewards', 'CombatProgress',
              'Stage3Rules'].forEach(key => { context[key] = {}; });
            node.onload();
          }
        });
      } }
    }
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../core/lazy-content.js'), 'utf8'), context);
  return { context, state, scripts };
}

(async function () {
  for (const operation of ['ensureUiPages', 'ensureCombatRuntime']) {
    const { context, state, scripts } = environment();
    const first = context.LazyContent[operation]();
    assert.strictEqual(first, context.LazyContent[operation](),
      'concurrent consumers share one in-flight load');
    await assert.rejects(first, /Failed to load/);
    assert.strictEqual(state.attempts, 3, 'automatic retries have a fixed upper bound');
    assert.strictEqual(scripts.length, 0, 'failed script elements are removed');
    state.fail = false;
    const retry = context.LazyContent[operation]();
    assert.notStrictEqual(retry, first);
    await retry;
    assert(scripts.every(node => node.getAttribute('data-lazy-loaded') === '1'));
  }
  const bundled = environment();
  bundled.state.fail = false;
  bundled.context.__H5_ASSETS__ = {
    'ui/one.js': 'bundles/pages.123.js',
    'ui/two.js': 'bundles/pages.123.js'
  };
  await bundled.context.LazyContent.ensureUiPages();
  assert.strictEqual(bundled.state.attempts, 1,
    'a mapped page bundle executes once for all source modules');
  console.log('Lazy load failure, retry limit and recovery self-test passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
