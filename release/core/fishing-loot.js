(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else if (root) {
    root.FishingLoot = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function own(value, key) {
    return Object.prototype.hasOwnProperty.call(value, key);
  }

  function isPlainRecord(value) {
    try {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return false;
      }
      const prototype = Object.getPrototypeOf(value);
      return prototype === null || prototype === Object.prototype;
    } catch (error) {
      return false;
    }
  }

  function loadParity() {
    if (typeof globalThis !== 'undefined' && globalThis.FishingParityContent) {
      return globalThis.FishingParityContent;
    }
    if (typeof require === 'function') {
      try {
        return require('../content/fishing-parity.js');
      } catch (err) {
        return null;
      }
    }
    return null;
  }

  function pickWeighted(entries, rollValue) {
    const total = entries.reduce(function (sum, entry) {
      return sum + entry.w;
    }, 0);
    const target = rollValue * total;
    let cumulative = 0;
    let selected = entries[entries.length - 1];
    for (let i = 0; i < entries.length; i++) {
      cumulative += entries[i].w;
      if (target < cumulative) {
        selected = entries[i];
        break;
      }
    }
    return selected;
  }

  function nextRandom(rngState) {
    const Random = (typeof globalThis !== 'undefined' && globalThis.GameRandom)
      ? globalThis.GameRandom
      : (typeof require === 'function' ? require('./random.js') : null);
    if (!Random || typeof Random.next !== 'function') {
      return { ok: false };
    }
    try {
      const drawn = Random.next(rngState);
      if (!drawn || typeof drawn.value !== 'number') return { ok: false };
      return { ok: true, value: drawn.value, rngState: drawn.seed };
    } catch (err) {
      return { ok: false };
    }
  }

  function openTable(model, tableKind, rngState) {
    const parity = loadParity();
    if (!parity || !isPlainRecord(model) || !isPlainRecord(model.player)) {
      return { ok: false, code: 'invalid_model' };
    }
    const Inventory = (typeof globalThis !== 'undefined' && globalThis.Inventory)
      ? globalThis.Inventory
      : (typeof require === 'function' ? require('./inventory.js') : null);
    if (!Inventory || typeof Inventory.apply !== 'function') {
      return { ok: false, code: 'unavailable' };
    }

    const table = tableKind === 'tackle'
      ? parity.TACKLE_LOOT
      : parity.CASKET_LOOT;
    if (!Array.isArray(table) || !table.length) {
      return { ok: false, code: 'invalid_table' };
    }

    let rng = rngState;
    const roll = nextRandom(rng);
    if (!roll.ok) return { ok: false, code: 'invalid_rng' };
    rng = roll.rngState;
    const picked = pickWeighted(table, roll.value);
    const delta = {};
    let granted = null;

    if (tableKind === 'tackle' || picked.itemId) {
      const itemId = picked.itemId;
      delta[itemId] = 1;
      granted = { itemId: itemId, quantity: 1 };
    } else if (picked.kind === 'junk') {
      const junkRoll = nextRandom(rng);
      if (!junkRoll.ok) return { ok: false, code: 'invalid_rng' };
      rng = junkRoll.rngState;
      const junk = pickWeighted(parity.JUNK_POOL, junkRoll.value);
      delta[junk.itemId] = 1;
      granted = { itemId: junk.itemId, quantity: 1 };
    } else if (picked.kind === 'gem' || picked.kind === 'bar') {
      const list = picked.itemIds || [];
      const idxRoll = nextRandom(rng);
      if (!idxRoll.ok) return { ok: false, code: 'invalid_rng' };
      rng = idxRoll.rngState;
      const itemId = list[Math.floor(idxRoll.value * list.length)] || list[0];
      delta[itemId] = 1;
      granted = { itemId: itemId, quantity: 1 };
    } else if (picked.kind === 'lingshi') {
      delta.lingshi = picked.quantity || 5;
      granted = { itemId: 'lingshi', quantity: picked.quantity || 5 };
    } else if (picked.kind === 'item') {
      delta[picked.itemId] = 1;
      granted = { itemId: picked.itemId, quantity: 1 };
    } else {
      return { ok: false, code: 'invalid_table' };
    }

    const applied = Inventory.apply(model.player.inventory, delta);
    if (!applied || applied.ok !== true) {
      return {
        ok: false,
        code: applied && applied.code ? applied.code : 'invalid_inventory'
      };
    }
    model.player.inventory = applied.value;
    return {
      ok: true,
      code: 'ok',
      rngState: rng,
      granted: granted
    };
  }

  function unlockFlag(model, flag) {
    if (!isPlainRecord(model) ||
        !isPlainRecord(model.systems) ||
        !isPlainRecord(model.systems.gathering)) {
      return { ok: false, code: 'invalid_model' };
    }
    const gathering = model.systems.gathering;
    if (!isPlainRecord(gathering.fishingUnlocks)) {
      gathering.fishingUnlocks = {};
    }
    gathering.fishingUnlocks[flag] = true;
    return { ok: true, code: 'ok', flag: flag };
  }

  return Object.freeze({
    openSunkenCasket: function (model, rngState) {
      return openTable(model, 'casket', rngState);
    },
    openLostTackleBox: function (model, rngState) {
      return openTable(model, 'tackle', rngState);
    },
    unlockSecretCove: function (model) {
      return unlockFlag(model, 'secretCove');
    },
    unlockBerserkShoal: function (model) {
      return unlockFlag(model, 'berserkShoal');
    }
  });
});
