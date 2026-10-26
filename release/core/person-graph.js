/*
 * person-graph.js —— 关系网 + 资格闸门（对标原版 getpe / cans）
 *
 * getpe：展开 person.kin（fa/mo/par/frs/ens），与原版字段网一致。
 * cans：存活 + 非幼童 + 在玩家 getpe 内 + 当日配额未满。
 *
 * 对标口径：刷新圈子 = 纯 getpe，不再并入 edges/bonds/metPlayer 超集。
 * metPlayer 仅作「已结识」痕迹；进圈前会 sync 进 frs（与 befriend 同构）。
 */
(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports
    ? factory(require('./dns.js'), require('./person-factory.js'))
    : factory(root && root.Dns, root && root.PersonFactory);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.PersonGraph = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  Dns,
  PersonFactory
) {
  'use strict';

  const PLAYER = 'player';

  function recordsOf(state) {
    return state && state.systems && state.systems.npcs &&
      state.systems.npcs.records;
  }

  function ensureKin(person) {
    if (PersonFactory && typeof PersonFactory.ensureKin === 'function') {
      return PersonFactory.ensureKin(person);
    }
    if (!person || typeof person !== 'object') {
      return { fa: null, mo: null, par: null, frs: [], ens: [] };
    }
    if (!person.kin || typeof person.kin !== 'object') {
      person.kin = { fa: null, mo: null, par: null, frs: [], ens: [] };
    }
    return person.kin;
  }

  function addUnique(list, id) {
    if (!id || list.indexOf(id) >= 0) return;
    list.push(id);
  }

  // 把已结识（metPlayer）但尚未写入 getpe 的人补进 frs，避免旧档掉出刷新圈。
  function syncMetPlayerIntoGetpe(state, playerId) {
    playerId = playerId || PLAYER;
    const player = playerId === PLAYER
      ? state && state.player
      : (recordsOf(state) || {})[playerId];
    if (!player) return;
    const kin = ensureKin(player);
    const records = recordsOf(state);
    if (!records) return;
    Object.keys(records).forEach(function (id) {
      if (id === playerId) return;
      const person = records[id];
      if (!person || person.metPlayer !== true) return;
      if ((kin.ens || []).indexOf(id) >= 0) return;
      if ((kin.frs || []).indexOf(id) >= 0) return;
      if (PersonFactory && typeof PersonFactory.befriend === 'function') {
        PersonFactory.befriend(state, playerId, id);
        return;
      }
      addUnique(kin.frs, id);
      addUnique(ensureKin(person).frs, playerId);
    });
  }

  // 对标 getpe：只读 kin 字段网，不含 edges/bonds/metPlayer 超集。
  function relatedToPlayer(state, playerId) {
    playerId = playerId || PLAYER;
    const set = new Set();
    if (PersonFactory && typeof PersonFactory.getpe === 'function') {
      PersonFactory.getpe(state, playerId).forEach(function (id) {
        set.add(id);
      });
    } else {
      const person = playerId === PLAYER
        ? state && state.player
        : (recordsOf(state) || {})[playerId];
      const kin = ensureKin(person);
      if (kin.fa) set.add(kin.fa);
      if (kin.mo) set.add(kin.mo);
      if (kin.par) set.add(kin.par);
      (kin.frs || []).forEach(function (id) { if (id) set.add(id); });
      (kin.ens || []).forEach(function (id) { if (id) set.add(id); });
    }
    set.delete(playerId);
    return set;
  }

  function quotaFor(person, npcId) {
    if (!Dns) return 1;
    if (npcId === PLAYER) {
      return typeof Dns.act4day === 'number' ? Dns.act4day : 30;
    }
    const table = Dns.famiAct1day;
    const fami = person && typeof person.fami === 'number'
      ? person.fami
      : (person && typeof person._fami === 'number' ? person._fami : null);
    if (Array.isArray(table) && fami != null && fami >= 0 && fami < table.length) {
      return table[fami] | 0;
    }
    // 兼容旧的 { sectId: n, __default: n } 写法
    if (table && typeof table === 'object' && !Array.isArray(table)) {
      const sect = person && person.sectId;
      if (sect != null && typeof table[sect] === 'number') return table[sect];
      if (typeof table.__default === 'number') return table.__default;
    }
    return typeof Dns.famiAct1dayDefault === 'number' ? Dns.famiAct1dayDefault : 30;
  }

  function personOf(state, npcId) {
    if (npcId === PLAYER) return state && state.player;
    const records = recordsOf(state);
    return records ? records[npcId] : null;
  }

  function cans(state, npcId, playerId) {
    playerId = playerId || PLAYER;
    const person = personOf(state, npcId);
    if (!person) return false;
    if (person.status && person.status !== 'living') return false;
    if (person.lifeStage === 'child') return false;
    if (npcId !== playerId) {
      const related = relatedToPlayer(state, playerId);
      if (!related.has(npcId)) return false;
    }
    const used = typeof person.act1day === 'number' ? person.act1day : 0;
    return used < quotaFor(person, npcId);
  }

  function markActed(state, npcId) {
    const person = personOf(state, npcId);
    if (!person) return;
    person.act1day = (typeof person.act1day === 'number' ? person.act1day : 0) + 1;
  }

  function resetDaily(state) {
    const records = recordsOf(state);
    if (records) {
      Object.keys(records).forEach(function (id) {
        if (records[id]) records[id].act1day = 0;
      });
    }
    if (state && state.player) state.player.act1day = 0;
  }

  return Object.freeze({
    relatedToPlayer: relatedToPlayer,
    syncMetPlayerIntoGetpe: syncMetPlayerIntoGetpe,
    cans: cans,
    markActed: markActed,
    resetDaily: resetDaily,
    quotaFor: quotaFor
  });
});
