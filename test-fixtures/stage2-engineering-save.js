(function (root) {
  'use strict';

  const status = root.document.getElementById('fixture-status');

  function stop(message) {
    status.textContent = message;
    status.dataset.state = 'error';
    throw new Error(message);
  }

  if (!root.Stage2State || !root.SaveSystem) {
    stop('正式 Stage 2 存档模块未加载，验收存档未写入。');
  }

  const now = root.Date.now();
  const defaults = root.Stage2State.createDefaults();
  defaults.player.name = '工程验收';
  defaults.player.inventory.stacks.gatheringFormation = 1;
  defaults.systems.homestead.formations.owned = [
    'gatheringFormation'
  ];
  defaults.systems.homestead.beasts.roster = [{
    id: 'beast-1',
    speciesId: 'spiritFox',
    level: 3,
    xp: 0,
    traitId: 'keenNose',
    growthId: 'steady'
  }];
  defaults.systems.gathering.nextSpotId = 2;
  defaults.systems.gathering.spots.herb = {
    entryId: 'parityHerb1',
    instanceId: 'spot-1',
    quality: 'common',
    capacity: 25,
    remaining: 25
  };

  const input = {
    created: true,
    appearance: { parts: {} },
    player: defaults.player,
    systems: defaults.systems,
    current: {
      key: 'gather:collect:herb:parityHerb1',
      mode: 'repeat',
      count: 0,
      done: 0,
      elapsed: 0,
      elapsedAnchorMs: null,
      elapsedBaseSeconds: null,
      stalled: false
    },
    rngState: 0x12345678,
    processedThroughMs: now,
    pendingOfflineReports: [],
    reportArchive: []
  };

  const adapter = {
    load(key) {
      const encoded = root.localStorage.getItem(key);
      return encoded ? JSON.parse(encoded) : null;
    },
    save(key, value) {
      root.localStorage.setItem(key, JSON.stringify(value));
      return true;
    }
  };

  root.localStorage.removeItem(root.SaveSystem.SNAPSHOT_KEY);
  root.localStorage.removeItem(root.SaveSystem.BACKUP_KEY);
  if (!root.SaveSystem.save(adapter, input, now)) {
    stop('正式 SaveSystem 拒绝写入工程验收存档。');
  }

  const loaded = root.SaveSystem.load(adapter, now);
  const snapshot = loaded.snapshot;
  // 首轮 createSnapshot 可能把 worldEvents.eventId 的 null 规范成 0；再存一轮得到无修复字节。
  if (loaded.needsRepair) {
    if (!root.SaveSystem.save(adapter, snapshot, snapshot.savedAt)) {
      stop('工程验收存档无法完成同版本规范修复写入。');
    }
  }
  const reloaded = root.SaveSystem.load(adapter, now);
  const canonical = reloaded.snapshot;
  const herbSpot = Array.isArray(canonical.systems.gathering.spots.herb)
    ? canonical.systems.gathering.spots.herb[0]
    : canonical.systems.gathering.spots.herb;
  const formationOwned = canonical.systems.homestead.formations.owned.includes(
    'gatheringFormation'
  );
  const formationReady =
    (canonical.player.inventory.stacks.gatheringFormation === 1 ||
      formationOwned) &&
    !canonical.player.inventory.bindings.gatheringFormation;
  const valid = reloaded.source === 'snapshot' &&
    !reloaded.migrated &&
    !reloaded.needsRepair &&
    canonical.schemaVersion === 5 &&
    canonical.created === true &&
    canonical.player.name === '工程验收' &&
    formationReady &&
    canonical.systems.homestead.formations.slots[0] === null &&
    formationOwned &&
    canonical.systems.homestead.beasts.activeIds.length === 0 &&
    canonical.systems.homestead.beasts.roster.length === 1 &&
    canonical.systems.homestead.beasts.roster[0].id === 'beast-1' &&
    canonical.current &&
    canonical.current.key === 'gather:collect:herb:parityHerb1' &&
    canonical.current.mode === 'repeat' &&
    herbSpot &&
    herbSpot.remaining === 25;
  if (!valid) {
    stop('工程验收存档未通过正式 SaveSystem 回读校验。');
  }

  status.textContent = '存档已就绪，正在进入正式页面……';
  status.dataset.state = 'ready';
  root.location.replace('../index.html');
})(typeof globalThis !== 'undefined' ? globalThis : this);
