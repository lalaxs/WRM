'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createServer } = require('./preview');
const { packageH5 } = require('./package-h5');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

async function main() {
  const result = packageH5();
  const evidence = path.resolve('dist/qa');
  fs.mkdirSync(evidence, { recursive: true });
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({
    headless: true, channel: process.env.BROWSER_CHANNEL || 'chrome'
  });
  const results = [];
  try {
    for (const [label, prefix] of [['source', '/'], ['package', '/dist/h5/xiuxian-idle-h5/']]) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await context.newPage();
      const errors = [];
      const scripts = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', request => {
        if (request.resourceType() === 'script') scripts.push(new URL(request.url()).pathname);
      });
      await page.goto(origin + prefix);
      await page.waitForFunction(() => window.GameAPI && !GameAPI.queries.persistence().locked);
      assert.strictEqual(await page.evaluate(() => GameAPI.queries.app().phase), 'create');
      await page.getByRole('button', { name: '确认创建 · 开始修行' }).click();
      await page.waitForFunction(() => GameAPI.queries.app().phase === 'game' && XiuxianUi.__pagesReady);
      const navigation = await page.evaluate(() => GameAPI.queries.navigation().items.map(item => item.label));
      for (const name of navigation) {
        await page.locator('.nav-item').getByText(name, { exact: true }).click();
        if (name === '设置') {
          await page.getByRole('button', { name: '保存并返回' }).click();
        } else {
          await page.waitForFunction(label => GameAPI.queries.navigation().items.some(item =>
            item.label === label && item.active), name);
        }
      }
      await page.locator('.nav-item').getByText('采药', { exact: true }).click();
      await page.locator('.explore-card:visible').click();
      await page.locator('.skill-action-btn-wrap .action-start:visible').click();
      await page.waitForFunction(() => GameAPI.queries.gatherPage('采药').resources.length > 0);
      assert(await page.evaluate(() => GameAPI.commands.stopAction().ok));
      const checkpoint = await page.evaluate(() => JSON.parse(localStorage.getItem('cloud_save_v1')));
      assert(checkpoint && checkpoint.schemaVersion === 5);
      await page.reload();
      await page.waitForFunction(() => window.GameAPI && GameAPI.queries.app().phase === 'game' &&
        !GameAPI.queries.persistence().locked && XiuxianUi.__pagesReady);
      const reopened = await page.evaluate(() => JSON.parse(localStorage.getItem('cloud_save_v1')));
      assert.strictEqual(reopened.rngState, checkpoint.rngState);
      assert.deepStrictEqual(reopened.player.inventory, checkpoint.player.inventory);
      await page.locator('.nav-item').getByText('战斗', { exact: true }).click();
      await page.waitForFunction(() => !!window.Stage3Rules);
      await page.screenshot({ path: path.join(evidence, label + '-desktop.png') });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: path.join(evidence, label + '-mobile.png') });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        'mobile viewport has no body horizontal overflow');
      assert.deepStrictEqual(errors, [], label + ': ' + errors.join('\n'));
      if (label === 'package') {
        for (const bundle of ['boot', 'pages', 'combat']) {
          const hits = scripts.filter(src => new RegExp('/' + bundle + '\\.[a-f0-9]+\\.js$').test(src));
          // Boot and pages execute once per navigation (initial and reload).
          assert.strictEqual(hits.length, 2, bundle + ' bundle load count');
        }
      }
      results.push({ label, pages: navigation.length, errors: errors.length, viewport: '390x844' });
      await context.close();
    }

    // Critical data failure cannot turn an existing save into a new empty game.
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(origin + '/');
    await page.waitForFunction(() => window.GameAPI && !GameAPI.queries.persistence().locked);
    await page.getByRole('button', { name: '确认创建 · 开始修行' }).click();
    await page.waitForFunction(() => GameAPI.queries.app().phase === 'game');
    const original = await page.evaluate(() => localStorage.getItem('cloud_save_v1'));
    await page.addInitScript(() => {
      window.__qaSaveBeforeBoot = localStorage.getItem('cloud_save_v1');
    });
    await page.route('**/content/herblore-parity.json', route => route.abort());
    await page.reload();
    await page.waitForFunction(() => window.GameAPI && GameAPI.queries.persistence().canRetry);
    assert.strictEqual(await page.evaluate(() => GameAPI.queries.persistence().kind), 'content');
    assert(await page.evaluate(() => localStorage.getItem('cloud_save_v1') === window.__qaSaveBeforeBoot),
      'failed critical data loading never writes the pre-boot save');
    assert.strictEqual(await page.getByRole('button', { name: '确认创建 · 开始修行' }).isEnabled(), false);
    await page.unroute('**/content/herblore-parity.json');
    await page.getByRole('button', { name: '重试', exact: true }).click();
    await page.waitForFunction(() => GameAPI.queries.app().phase === 'game' &&
      !GameAPI.queries.persistence().locked);
    assert.strictEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('cloud_save_v1')).player.name),
      JSON.parse(original).player.name);
    await page.evaluate(() => LazyContent.ensureCombatRuntime());
    const combatKey = 'combat:region:qingyunOutskirts:thornHare';
    assert(await page.evaluate(key => GameAPI.commands.startAction({ key }).ok, combatKey));
    await page.route('**/core/team-combat-engine.js', route => route.abort());
    await page.reload();
    await page.waitForFunction(() => window.GameAPI && GameAPI.queries.persistence().canRetry);
    assert.strictEqual(await page.evaluate(() => GameAPI.queries.persistence().kind), 'content');
    assert(await page.evaluate(() => localStorage.getItem('cloud_save_v1') === window.__qaSaveBeforeBoot),
      'failed combat warmup cannot consume progress or rewrite an active session');
    await page.unroute('**/core/team-combat-engine.js');
    await page.getByRole('button', { name: '重试', exact: true }).click();
    await page.waitForFunction(() => GameAPI.queries.app().phase === 'game' &&
      !GameAPI.queries.persistence().locked && !!window.Stage3Rules);
    assert(await page.evaluate(() => !!GameAPI.queries.home().current));
    assert(await page.evaluate(() => GameAPI.commands.stopAction().ok));
    await context.close();
    results.push({ criticalDataFailure: 'save preserved; explicit retry restored game' });
    results.push({ combatWarmupFailure: 'active session preserved; explicit retry restored combat' });
    fs.writeFileSync(path.join(evidence, 'browser-results.json'), JSON.stringify(results, null, 2));
    console.log(JSON.stringify({ zip: result.zipFile, results }, null, 2));
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
