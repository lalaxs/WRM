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
  const valid = loaded.source === 'snapshot' &&
    !loaded.migrated &&
    !loaded.needsRepair &&
    snapshot.schemaVersion === 3 &&
    snapshot.created === true &&
    snapshot.player.name === '工程验收' &&
    snapshot.player.inventory.stacks.gatheringFormation === 1 &&
    !snapshot.player.inventory.bindings.gatheringFormation &&
    snapshot.systems.homestead.formations.slots[0] === null &&
    snapshot.systems.homestead.formations.owned.includes(
      'gatheringFormation'
    ) &&
    snapshot.systems.homestead.beasts.activeIds.length === 0 &&
    snapshot.systems.homestead.beasts.roster.length === 1 &&
    snapshot.systems.homestead.beasts.roster[0].id === 'beast-1' &&
    snapshot.current &&
    snapshot.current.key === 'gather:collect:herb:parityHerb1' &&
    snapshot.current.mode === 'repeat' &&
    snapshot.systems.gathering.spots.herb.remaining === 25;
  if (!valid) {
    stop('工程验收存档未通过正式 SaveSystem 回读校验。');
  }

  status.textContent = '存档已就绪，正在进入正式页面……';
  status.dataset.state = 'ready';
  root.location.replace('../index.html');
})(typeof globalThis !== 'undefined' ? globalThis : this);
