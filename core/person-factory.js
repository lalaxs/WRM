/*
 * person-factory.js —— 对标原版 creatperson*：按关系造人，不先铺全图陌生人池。
 *
 * 原版人物挂在关系字段上：
 *   fa / mo / par（单 id）· frs / ens（集合）
 * 玩家圈子 = getpe(玩家) = 这些字段展开；事件只刷圈子 ∩ cans。
 */
(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports
    ? factory(
      require('./npc-generator.js'),
      require('../content/npc-generation.js'),
      require('../content/regions.js'),
      require('../content/sects.js'),
      require('../content/sect-offices.js'),
      require('./random.js'),
      require('./dns.js')
    )
    : factory(
      root && root.NpcGenerator,
      root && root.NpcGenerationContent,
      root && root.RegionContent,
      root && root.SectContent,
      root && root.SectOfficeContent,
      root && root.GameRandom,
      root && root.Dns
    );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.PersonFactory = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  NpcGenerator,
  NpcGenerationContent,
  RegionContent,
  SectContent,
  SectOfficeContent,
  GameRandom,
  Dns
) {
  'use strict';

  const PLAYER = 'player';

  function resolveFami(sectId) {
    const map = Dns && Dns.sectFami;
    if (sectId && map && typeof map[sectId] === 'number') return map[sectId];
    return Dns && typeof Dns.rogueFami === 'number' ? Dns.rogueFami : 20;
  }

  function resolveJob(officeSlotId) {
    if (Dns && typeof Dns.jobForSlotId === 'function') {
      return Dns.jobForSlotId(officeSlotId);
    }
    const map = Dns && Dns.officeJob;
    if (!officeSlotId || !map) return 0;
    let key = officeSlotId;
    if (typeof key === 'string' && key.indexOf('hall') === 0) key = 'hall';
    return typeof map[key] === 'number' ? map[key] : 0;
  }

  function isRecord(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function validSeed(value) {
    return Number.isInteger(value) && value > 0 && value <= 0xFFFFFFFF;
  }

  function emptyKin() {
    return {
      fa: null,
      mo: null,
      par: null,
      frs: [],
      ens: []
    };
  }

  function ensureKin(person) {
    if (!isRecord(person)) return emptyKin();
    if (!isRecord(person.kin)) person.kin = emptyKin();
    const kin = person.kin;
    if (typeof kin.fa !== 'string' || !kin.fa) kin.fa = null;
    if (typeof kin.mo !== 'string' || !kin.mo) kin.mo = null;
    if (typeof kin.par !== 'string' || !kin.par) kin.par = null;
    if (!Array.isArray(kin.frs)) kin.frs = [];
    if (!Array.isArray(kin.ens)) kin.ens = [];
    return kin;
  }

  function pairKey(leftId, rightId) {
    return leftId < rightId
      ? leftId + '|' + rightId
      : rightId + '|' + leftId;
  }

  function affinityKey(sourceId, targetId) {
    return sourceId + '>' + targetId;
  }

  function ensureRelationships(model) {
    if (!isRecord(model.systems)) model.systems = {};
    if (!isRecord(model.systems.relationships)) {
      model.systems.relationships = {
        edges: {},
        bonds: {},
        restrictions: {},
        npcAffinities: {},
        tags: {},
        arcs: {}
      };
    }
    const rels = model.systems.relationships;
    if (!isRecord(rels.edges)) rels.edges = {};
    if (!isRecord(rels.bonds)) rels.bonds = {};
    if (!isRecord(rels.restrictions)) rels.restrictions = {};
    if (!isRecord(rels.npcAffinities)) rels.npcAffinities = {};
    if (!isRecord(rels.tags)) rels.tags = {};
    if (!isRecord(rels.arcs)) rels.arcs = {};
    return rels;
  }

  function ensureNpcShell(model) {
    if (!isRecord(model.systems)) model.systems = {};
    if (!isRecord(model.systems.npcs)) {
      model.systems.npcs = {
        nextId: 1,
        activeTarget: 40,
        records: {},
        activeIds: [],
        backgroundIds: [],
        backgroundCursor: 0
      };
    }
    const npcs = model.systems.npcs;
    if (!isRecord(npcs.records)) npcs.records = {};
    if (!Array.isArray(npcs.activeIds)) npcs.activeIds = [];
    if (!Array.isArray(npcs.backgroundIds)) npcs.backgroundIds = [];
    if (!Number.isFinite(npcs.nextId) || npcs.nextId < 1) npcs.nextId = 1;
    return npcs;
  }

  function addUnique(list, id) {
    if (!id || list.indexOf(id) >= 0) return;
    list.push(id);
  }

  function addTag(rels, leftId, rightId, tag) {
    const key = pairKey(leftId, rightId);
    const current = Array.isArray(rels.tags[key]) ? rels.tags[key].slice() : [];
    if (current.indexOf(tag) < 0) current.push(tag);
    rels.tags[key] = current;
  }

  function bumpEdge(rels, sourceId, targetId, amount) {
    // NPC↔NPC：只写单维好感；玩家↔NPC：写 8 维。
    if (sourceId !== 'player' && targetId !== 'player') {
      const key = affinityKey(sourceId, targetId);
      const value = Math.max(-100, Math.min(100, amount | 0));
      if (!isRecord(rels.npcAffinities)) rels.npcAffinities = {};
      if (value === 0) delete rels.npcAffinities[key];
      else rels.npcAffinities[key] = value;
      return;
    }
    const key = affinityKey(sourceId, targetId);
    const edge = isRecord(rels.edges[key]) ? rels.edges[key] : {
      affection: 0,
      trust: 0,
      romanticAttachment: 0,
      closeness: 0,
      dependence: 0,
      loyalty: 0,
      jealousy: 0,
      desire: 0,
      lastChangedAt: 0
    };
    const base = Math.max(0, Math.min(100, amount | 0));
    edge.affection = Math.max(edge.affection | 0, base);
    edge.trust = Math.max(edge.trust | 0, base);
    edge.closeness = Math.max(edge.closeness | 0, Math.max(0, base - 6));
    edge.loyalty = Math.max(edge.loyalty | 0, Math.max(0, base - 10));
    rels.edges[key] = edge;
  }

  function contentBundle() {
    return Object.freeze({
      regions: RegionContent,
      sects: SectContent,
      generation: NpcGenerationContent
    });
  }

  function usedNamesOf(model) {
    const records = model.systems.npcs.records;
    const names = [];
    Object.keys(records).forEach(function (id) {
      const person = records[id];
      if (person && person.identity && person.identity.name) {
        names.push(person.identity.name);
      }
    });
    return names;
  }

  function personOf(model, id) {
    if (id === PLAYER) return model.player;
    const records = model.systems && model.systems.npcs &&
      model.systems.npcs.records;
    return records ? records[id] : null;
  }

  function draw(model) {
    const seed = validSeed(model.rngState)
      ? model.rngState
      : (GameRandom && GameRandom.DEFAULT_SEED) || 0x6D2B79F5;
    if (!GameRandom || typeof GameRandom.next !== 'function') {
      return { value: 0.5, rngState: seed };
    }
    const next = GameRandom.next(seed);
    if (!next || !validSeed(next.seed)) {
      return { value: 0.5, rngState: seed };
    }
    model.rngState = next.seed;
    return { value: next.value, rngState: next.seed };
  }

  function rollInt(model, min, max) {
    const low = Math.min(min, max);
    const high = Math.max(min, max);
    const rolled = draw(model);
    return low + Math.floor(rolled.value * (high - low + 1));
  }

  // 对标 creatperson：生成一个永久人物并写入 records。
  function createPerson(model, options) {
    if (!NpcGenerator || typeof NpcGenerator.generateOne !== 'function') {
      return null;
    }
    const opts = options || {};
    const npcs = ensureNpcShell(model);
    const generated = NpcGenerator.generateOne({
      nextId: npcs.nextId,
      rngState: validSeed(model.rngState)
        ? model.rngState
        : (GameRandom && GameRandom.DEFAULT_SEED) || 0x6D2B79F5,
      usedNames: usedNamesOf(model),
      content: contentBundle()
    });
    if (!generated || !generated.npc) return null;
    const npc = generated.npc;
    npc.kin = emptyKin();
    npc.lifeStage = 'adult';
    npc.metPlayer = opts.metPlayer === true;
    npc.activityStatus = 'normal';
    if (typeof opts.gender === 'string') npc.identity.gender = opts.gender;
    if (Number.isFinite(opts.ageYears)) {
      npc.ageYears = Math.max(18, Math.floor(opts.ageYears));
    }
    if (typeof opts.regionId === 'string') npc.regionId = opts.regionId;
    if (opts.sectId === null || typeof opts.sectId === 'string') {
      npc.sectId = opts.sectId;
    }
    if (typeof opts.familyId === 'string') npc.familyId = opts.familyId;
    if (Number.isFinite(opts.realmStage)) {
      npc.realmStage = Math.max(0, Math.floor(opts.realmStage));
    } else if (opts.acquaintance === true || opts.relativeToPlayer === true) {
      npc.realmStage = rollAcquaintanceRealm(model, opts);
    }
    // 对标 creatperson：expsx = Random.Range(0.9, 1.4)；lg 来自灵根。
    if (Number.isFinite(opts.expsx)) {
      npc.expsx = Math.max(0.1, Number(opts.expsx));
    } else {
      npc.expsx = 0.9 + draw(model).value * 0.5;
    }
    if (Number.isFinite(opts.lg) || Number.isFinite(opts.linggen)) {
      npc.lg = Math.max(
        0,
        Math.min(7, Math.floor(Number(opts.lg != null ? opts.lg : opts.linggen)))
      );
    } else if (Dns && typeof Dns.resolveLgIndex === 'function') {
      npc.lg = Dns.resolveLgIndex(npc);
    } else {
      npc.lg = 3;
    }
    npc.linggen = npc.lg;
    if (Dns && typeof Dns.syncLevelAliases === 'function') {
      Dns.syncLevelAliases(npc);
    }
    if (Dns && typeof Dns.getexps === 'function') {
      npc.exps = Dns.getexps(npc);
    }
    // 对标 person._fami：配额/家族表下标。
    if (Number.isFinite(opts.fami)) {
      npc.fami = Math.max(0, Math.floor(opts.fami));
    } else {
      npc.fami = resolveFami(npc.sectId);
    }
    // 对标 retjob / creatpersonwithm：造人时定职。
    // 显式 officeSlotId（含 null=散修）优先；否则按境界粗表。
    if (SectOfficeContent &&
        typeof SectOfficeContent.assignJobByRealm === 'function') {
      const jobOpts = {};
      if (Object.prototype.hasOwnProperty.call(opts, 'officeSlotId')) {
        if (opts.officeSlotId === null || opts.sectId === null) {
          jobOpts.forceRogue = true;
        } else if (typeof opts.officeSlotId === 'string') {
          jobOpts.officeSlotId = opts.officeSlotId;
        }
      } else if (opts.sectId === null) {
        jobOpts.forceRogue = true;
      }
      SectOfficeContent.assignJobByRealm(npc, jobOpts);
    } else {
      if (opts.officeSlotId === null ||
          typeof opts.officeSlotId === 'string') {
        npc.officeSlotId = opts.officeSlotId;
      }
      if (opts.sectId === null) npc.officeSlotId = null;
    }
    npc.job = resolveJob(npc.officeSlotId);
    if (!Array.isArray(npc.history)) npc.history = [];
    npcs.records[npc.id] = npc;
    npcs.nextId = generated.nextId;
    model.rngState = generated.rngState;
    // 热路径立刻进活跃层，避免未 normalize 前关系页看不到新人。
    if (npcs.activeIds.indexOf(npc.id) < 0 &&
        npcs.backgroundIds.indexOf(npc.id) < 0) {
      const target = Math.max(1, Math.floor(Number(npcs.activeTarget) || 40));
      if (npcs.activeIds.length < target) npcs.activeIds.push(npc.id);
      else npcs.backgroundIds.push(npc.id);
    }
    return npc;
  }

  function syncBloodParents(child, faId, moId) {
    const parents = [];
    if (faId) parents.push(faId);
    if (moId) parents.push(moId);
    child.parentIds = parents.slice(0, 2);
  }

  // 对标 creatpersonm：为锚点建母亲，并挂 mo。
  function createMother(model, anchorId, options) {
    const anchor = personOf(model, anchorId);
    if (!anchor) return null;
    const kin = ensureKin(anchor);
    if (kin.mo && personOf(model, kin.mo)) {
      return personOf(model, kin.mo);
    }
    kin.mo = null;
    const regionId = (anchor.regionId ||
      (model.player && model.player.regionId) ||
      'qinglan-town');
    const mother = createPerson(model, Object.assign({
      gender: 'female',
      ageYears: Math.max(
        36,
        ((anchor.ageYears | 0) || 18) + 18 + rollInt(model, 0, 8)
      ),
      regionId: regionId,
      familyId: anchor.familyId || ('family-' + anchorId),
      metPlayer: anchorId === PLAYER
    }, options || {}));
    if (!mother) return null;
    kin.mo = mother.id;
    const motherKin = ensureKin(mother);
    addUnique(motherKin.frs, anchorId);
    if (anchorId === PLAYER) mother.metPlayer = true;
    const rels = ensureRelationships(model);
    addTag(rels, anchorId, mother.id, 'blood');
    addTag(rels, anchorId, mother.id, 'acquainted');
    rels.restrictions[pairKey(anchorId, mother.id)] = 'blood';
    bumpEdge(rels, anchorId, mother.id, 42);
    bumpEdge(rels, mother.id, anchorId, 42);
    if (anchorId !== PLAYER) {
      syncBloodParents(anchor, kin.fa, kin.mo);
    } else if (model.player) {
      model.player.parentIds = [kin.fa, kin.mo].filter(Boolean).slice(0, 2);
    }
    return mother;
  }

  // 对标 creatperson 指定 faid：为锚点建父亲。
  function createFather(model, anchorId, options) {
    const anchor = personOf(model, anchorId);
    if (!anchor) return null;
    const kin = ensureKin(anchor);
    if (kin.fa && personOf(model, kin.fa)) {
      return personOf(model, kin.fa);
    }
    kin.fa = null;
    const regionId = (anchor.regionId ||
      (model.player && model.player.regionId) ||
      'qinglan-town');
    const father = createPerson(model, Object.assign({
      gender: 'male',
      ageYears: Math.max(
        36,
        ((anchor.ageYears | 0) || 18) + 18 + rollInt(model, 0, 10)
      ),
      regionId: regionId,
      familyId: anchor.familyId || ('family-' + anchorId),
      metPlayer: anchorId === PLAYER
    }, options || {}));
    if (!father) return null;
    kin.fa = father.id;
    const fatherKin = ensureKin(father);
    addUnique(fatherKin.frs, anchorId);
    if (anchorId === PLAYER) father.metPlayer = true;
    const rels = ensureRelationships(model);
    addTag(rels, anchorId, father.id, 'blood');
    addTag(rels, anchorId, father.id, 'acquainted');
    rels.restrictions[pairKey(anchorId, father.id)] = 'blood';
    bumpEdge(rels, anchorId, father.id, 40);
    bumpEdge(rels, father.id, anchorId, 40);
    if (anchorId !== PLAYER) {
      syncBloodParents(anchor, kin.fa, kin.mo);
    } else if (model.player) {
      model.player.parentIds = [kin.fa, kin.mo].filter(Boolean).slice(0, 2);
    }
    return father;
  }

  // 父母互为道侣（par）。
  function linkDaoCompanions(model, leftId, rightId) {
    const left = personOf(model, leftId);
    const right = personOf(model, rightId);
    if (!left || !right) return false;
    ensureKin(left).par = rightId;
    ensureKin(right).par = leftId;
    const rels = ensureRelationships(model);
    const key = pairKey(leftId, rightId);
    addTag(rels, leftId, rightId, 'lover');
    addTag(rels, leftId, rightId, 'partner');
    addTag(rels, leftId, rightId, 'acquainted');
    rels.bonds[key] = {
      stage: 'partner',
      changedByEventId: null,
      changedAt: 0
    };
    bumpEdge(rels, leftId, rightId, 55);
    bumpEdge(rels, rightId, leftId, 55);
    return true;
  }

  // 玩家自行结识/偶遇造人：境界相对玩家压低（对标原版不易随便识高境）。
  function playerRealmStage(model) {
    const player = model && model.player;
    if (!player) return 0;
    if (Number.isFinite(player.realmStage)) {
      return Math.max(0, Math.floor(player.realmStage));
    }
    if (player.breakthrough &&
        typeof player.breakthrough.realmId === 'string' &&
        Number.isFinite(player.breakthrough.realmIndex)) {
      return Math.max(0, Math.floor(player.breakthrough.realmIndex));
    }
    return 0;
  }

  function rollAcquaintanceRealm(model, options) {
    const opts = options || {};
    const player = playerRealmStage(model);
    const hardCap = Math.max(
      0,
      player + (opts.allowPlusOne === true ? 1 : 0)
    );
    const softCap = Math.max(0, Math.min(hardCap, player));
    const roll = draw(model).value;
    // ~55% 炼气低档；~30% 不超过玩家的中低档；~12% 贴近玩家；~3% 触顶
    if (roll < 0.55) {
      return Math.min(softCap, rollInt(model, 0, Math.min(1, softCap)));
    }
    if (roll < 0.85) {
      return Math.min(softCap, rollInt(model, 0, Math.min(2, softCap)));
    }
    if (roll < 0.97) {
      return Math.min(softCap, rollInt(model, 0, Math.max(0, softCap)));
    }
    return hardCap;
  }

  function pickPreferLowerRealm(ids, records, playerRealm, random) {
    if (!ids || !ids.length) return null;
    let total = 0;
    const weights = ids.map(function (id) {
      const person = records[id];
      const realm = Math.max(0, Math.floor(Number(person && person.realmStage) || 0));
      const over = Math.max(0, realm - playerRealm);
      let weight = 1;
      if (over === 0) weight = 12;
      else if (over === 1) weight = 3;
      else if (over === 2) weight = 0.4;
      else weight = 0.05;
      total += weight;
      return weight;
    });
    if (total <= 0) return ids[Math.floor(random() * ids.length)];
    let cursor = random() * total;
    for (let i = 0; i < ids.length; i++) {
      cursor -= weights[i];
      if (cursor <= 0) return ids[i];
    }
    return ids[ids.length - 1];
  }

  function listSectIds() {
    if (SectContent && typeof SectContent.list === 'function') {
      return SectContent.list().map(function (row) { return row.id; });
    }
    if (SectContent && Array.isArray(SectContent.SECTS)) {
      return SectContent.SECTS.map(function (row) { return row.id; });
    }
    return [];
  }

  function rollOpeningPeerProfile(model, regionId) {
    const roll = draw(model).value;
    const home = regionId || 'qinglan-town';
    // 约 50% 散修、50% 门人弟子；境界压在炼气，高职靠显式任命/retjob。
    if (roll < 0.50) {
      return {
        regionId: home,
        sectId: null,
        officeSlotId: null,
        realmStage: rollInt(model, 0, 1),
        ageYears: 18 + rollInt(model, 0, 14)
      };
    }
    const sectIds = listSectIds();
    const sectId = sectIds.length
      ? sectIds[rollInt(model, 0, sectIds.length - 1)]
      : null;
    if (!sectId || roll < 0.80) {
      return {
        regionId: home,
        sectId: sectId,
        officeSlotId: sectId ? 'disciple' : null,
        realmStage: rollInt(model, 0, 1),
        ageYears: 18 + rollInt(model, 0, 16)
      };
    }
    return {
      regionId: home,
      sectId: sectId,
      officeSlotId: 'disciple',
      realmStage: 1,
      ageYears: 18 + rollInt(model, 2, 18)
    };
  }

  function sectForFami(fami) {
    const map = Dns && Dns.sectFami;
    if (!map) return null;
    const keys = Object.keys(map);
    for (let i = 0; i < keys.length; i++) {
      if (map[keys[i]] === fami) return keys[i];
    }
    return null;
  }

  // 原版大境界 levelmin → H5 细档 realmStage（与 npc-simulation.majorLevel 互逆粗映射）。
  function realmFromMajor(levelmin) {
    const major = Math.max(0, Math.floor(Number(levelmin) || 0));
    if (major <= 8) return major;
    return Math.min(16, 8 + (major - 8) * 2);
  }

  // 对标 creatpersonf(tfami, levelmin=0, ltype=0, hpar=true)：按家族造人。
  function createFamilyMember(model, tfami, levelmin, ltype, hpar, options) {
    const opts = options || {};
    const fami = Math.max(0, Math.floor(Number(tfami) || 0));
    const sectId = Object.prototype.hasOwnProperty.call(opts, 'sectId')
      ? opts.sectId
      : sectForFami(fami);
    const npc = createPerson(model, Object.assign({}, opts, {
      fami: fami,
      sectId: sectId,
      realmStage: Number.isFinite(opts.realmStage)
        ? opts.realmStage
        : realmFromMajor(levelmin),
      officeSlotId: Object.prototype.hasOwnProperty.call(opts, 'officeSlotId')
        ? opts.officeSlotId
        : (sectId ? 'disciple' : null)
    }));
    if (!npc) return null;
    npc.fami = fami;
    // ltype：等级/类型变体占位，先落字段供后续接线。
    if (Number.isFinite(ltype)) npc.ltype = Math.floor(Number(ltype));
    if (hpar !== false) {
      const kin = ensureKin(npc);
      if (typeof opts.faid === 'string' && opts.faid) {
        kin.fa = opts.faid;
      }
      if (typeof opts.moid === 'string' && opts.moid) {
        kin.mo = opts.moid;
      }
      syncBloodParents(npc, kin.fa, kin.mo);
    }
    return npc;
  }

  // 对标 creatpersonfr：为锚点建朋友，写入双方 frs。
  function createFriend(model, anchorId, options) {
    const anchor = personOf(model, anchorId);
    if (!anchor) return null;
    const kin = ensureKin(anchor);
    const regionId = (anchor.regionId ||
      (model.player && model.player.regionId) ||
      'qinglan-town');
    const opts = Object.assign({
      regionId: regionId,
      ageYears: 18 + rollInt(model, 0, 20),
      metPlayer: anchorId === PLAYER,
      // 默认按玩家境界压低；显式 realmStage / acquaintance:false 可覆盖。
      acquaintance: true
    }, options || {});
    if (Object.prototype.hasOwnProperty.call(opts, 'realmStage')) {
      opts.acquaintance = false;
    }
    const friend = createPerson(model, opts);
    if (!friend) return null;
    addUnique(kin.frs, friend.id);
    addUnique(ensureKin(friend).frs, anchorId);
    if (anchorId === PLAYER) friend.metPlayer = true;
    const rels = ensureRelationships(model);
    addTag(rels, anchorId, friend.id, 'friend');
    addTag(rels, anchorId, friend.id, 'acquainted');
    bumpEdge(rels, anchorId, friend.id, 28);
    bumpEdge(rels, friend.id, anchorId, 26);
    return friend;
  }

  // 对标 creatpersonen：为锚点建敌人。
  function createEnemy(model, anchorId, options) {
    const anchor = personOf(model, anchorId);
    if (!anchor) return null;
    const kin = ensureKin(anchor);
    const regionId = (anchor.regionId ||
      (model.player && model.player.regionId) ||
      'qinglan-town');
    const enemy = createPerson(model, Object.assign({
      regionId: regionId,
      metPlayer: anchorId === PLAYER
    }, options || {}));
    if (!enemy) return null;
    addUnique(kin.ens, enemy.id);
    addUnique(ensureKin(enemy).ens, anchorId);
    if (anchorId === PLAYER) enemy.metPlayer = true;
    const rels = ensureRelationships(model);
    addTag(rels, anchorId, enemy.id, 'enemy');
    bumpEdge(rels, anchorId, enemy.id, 8);
    bumpEdge(rels, enemy.id, anchorId, 6);
    return enemy;
  }

  // 把已存在的人挂进锚点朋友圈（偶遇扩圈用）。
  function befriend(model, anchorId, otherId) {
    const anchor = personOf(model, anchorId);
    const other = personOf(model, otherId);
    if (!anchor || !other) return false;
    addUnique(ensureKin(anchor).frs, otherId);
    addUnique(ensureKin(other).frs, anchorId);
    if (anchorId === PLAYER) other.metPlayer = true;
    if (otherId === PLAYER) anchor.metPlayer = true;
    const rels = ensureRelationships(model);
    addTag(rels, anchorId, otherId, 'friend');
    addTag(rels, anchorId, otherId, 'acquainted');
    bumpEdge(rels, anchorId, otherId, 18);
    bumpEdge(rels, otherId, anchorId, 16);
    return true;
  }

  // NPC↔NPC 首次结识：只进双方 frs + acquainted，不抬朋友标签/8 维。
  function acquaint(model, leftId, rightId) {
    if (!leftId || !rightId || leftId === rightId) return false;
    if (leftId === PLAYER || rightId === PLAYER) {
      return befriend(
        model,
        PLAYER,
        leftId === PLAYER ? rightId : leftId
      );
    }
    const left = personOf(model, leftId);
    const right = personOf(model, rightId);
    if (!left || !right) return false;
    addUnique(ensureKin(left).frs, rightId);
    addUnique(ensureKin(right).frs, leftId);
    const rels = ensureRelationships(model);
    addTag(rels, leftId, rightId, 'acquainted');
    return true;
  }

  function livingAdult(person) {
    return !!(person &&
      person.status === 'living' &&
      person.lifeStage !== 'child');
  }

  // 为玩家结识准备候选人：圈外已有人 > 友人的友人 > 按关系新造。
  // 返回 { npcId, introducedBy }；introducedBy 为引见友人（可空）。
  function expandForPlayerMeeting(model, options) {
    if (!isRecord(model) || !isRecord(model.player)) return null;
    ensureNpcShell(model);
    ensureRelationships(model);
    const opts = options || {};
    const regionId = typeof opts.regionId === 'string' && opts.regionId
      ? opts.regionId
      : (model.player.regionId || 'qinglan-town');
    const random = typeof opts.random === 'function' ? opts.random : Math.random;
    const records = model.systems.npcs.records;
    const circle = new Set();
    getpe(model, PLAYER).forEach(function (id) { circle.add(id); });
    Object.keys(records).forEach(function (id) {
      if (records[id] && records[id].metPlayer === true) circle.add(id);
    });

    function knownToPlayer(id) {
      if (!id || id === PLAYER) return true;
      if (circle.has(id)) return true;
      const person = records[id];
      return !!(person && person.metPlayer === true);
    }

    function sameRegion(person) {
      return !person || person.regionId === regionId;
    }

    // 1) 世界里已有、同城、尚未结识的人（偏好不高于玩家太多）。
    const strangers = Object.keys(records).filter(function (id) {
      const person = records[id];
      return livingAdult(person) &&
        sameRegion(person) &&
        !knownToPlayer(id);
    });
    if (strangers.length) {
      const pick = pickPreferLowerRealm(
        strangers,
        records,
        playerRealmStage(model),
        random
      );
      return pick ? { npcId: pick, introducedBy: null } : null;
    }

    // 2) 已识友人名下、玩家尚未结识的友人（同城优先）；结识文案仍是自己遇见。
    const hosts = Array.from(circle).filter(function (id) {
      return livingAdult(records[id]);
    });
    const fof = [];
    hosts.forEach(function (hostId) {
      const host = records[hostId];
      const frs = host && host.kin && Array.isArray(host.kin.frs)
        ? host.kin.frs
        : [];
      frs.forEach(function (fid) {
        const friend = records[fid];
        if (!livingAdult(friend) || knownToPlayer(fid)) return;
        fof.push(fid);
      });
    });
    if (fof.length) {
      const local = fof.filter(function (id) {
        return sameRegion(records[id]);
      });
      const pool = local.length ? local : fof;
      const pick = pickPreferLowerRealm(
        pool,
        records,
        playerRealmStage(model),
        random
      );
      if (pick) {
        const person = records[pick];
        if (person && !sameRegion(person)) person.regionId = regionId;
        return { npcId: pick, introducedBy: null };
      }
    }

    // 3) 按关系造人：可挂在友人朋友圈，但玩家侧按自己偶遇结识。
    const cap = Math.max(
      12,
      Math.floor(Number(model.systems.npcs.activeTarget) || 40)
    );
    if (Object.keys(records).length >= cap) return null;

    if (hosts.length) {
      const hostId = hosts[Math.floor(random() * hosts.length)];
      const created = createFriend(model, hostId, {
        regionId: regionId,
        metPlayer: false,
        acquaintance: true
      });
      if (created) {
        created.metPlayer = false;
        return { npcId: created.id, introducedBy: null };
      }
    }
    const stranger = createPerson(model, {
      regionId: regionId,
      metPlayer: false,
      ageYears: 18 + rollInt(model, 0, 20),
      acquaintance: true
    });
    if (!stranger) return null;
    return { npcId: stranger.id, introducedBy: null };
  }

  function ensurePlayerKin(model) {
    if (!isRecord(model.player)) return null;
    return ensureKin(model.player);
  }

  // 从 NPC 侧 frs / 关系边恢复玩家友人列表（修复旧档 kin 被 normalize 清掉的情况）。
  function recoverPlayerFriends(model) {
    if (!isRecord(model) || !isRecord(model.player)) return [];
    const kin = ensureKin(model.player);
    const npcs = ensureNpcShell(model);
    const seen = {};
    const friends = [];
    function add(id) {
      if (!id || id === PLAYER || seen[id]) return;
      const person = npcs.records[id];
      if (!person || person.status === 'dead' || person.status === 'ascended') {
        return;
      }
      seen[id] = true;
      friends.push(person);
      addUnique(kin.frs, id);
    }
    (kin.frs || []).forEach(add);
    Object.keys(npcs.records).forEach(function (id) {
      const person = npcs.records[id];
      if (!person) return;
      const otherKin = ensureKin(person);
      if ((otherKin.frs || []).indexOf(PLAYER) >= 0) add(id);
    });
    const rels = model.systems && model.systems.relationships;
    const tags = rels && isRecord(rels.tags) ? rels.tags : null;
    if (tags) {
      Object.keys(tags).forEach(function (key) {
        const sep = key.indexOf('|');
        if (sep < 0) return;
        const a = key.slice(0, sep);
        const b = key.slice(sep + 1);
        const bag = tags[key];
        const hasFriend = Array.isArray(bag)
          ? bag.indexOf('friend') >= 0
          : !!(bag && bag.friend === true);
        if (!hasFriend) return;
        if (a === PLAYER) add(b);
        else if (b === PLAYER) add(a);
      });
    }
    return friends;
  }

  function openingJourneyNarrative(playerName) {
    return '自此，' + (playerName || '无名') + '正式踏入修仙旅途。';
  }

  // 踏入旅途条：只写玩家，不点名友人（结识已各自成条）。
  function scrubOpeningJourneyEvent(model) {
    const world = ensureWorldShell(model);
    const playerName = model.player && typeof model.player.name === 'string'
      ? String(model.player.name).trim()
      : '';
    const label = playerName || '无名';
    const journeyText = openingJourneyNarrative(label);
    let found = false;
    world.worldEvents.forEach(function (ev) {
      if (!ev || !Array.isArray(ev.tags)) return;
      if (ev.tags.indexOf('opening_meet') >= 0) return;
      if (ev.tags.indexOf('opening') < 0 && ev.tags.indexOf('prologue') < 0) {
        return;
      }
      if (!/踏入修仙旅途/.test(ev.narrative || '')) return;
      ev.narrative = journeyText;
      ev.participants = ['player'];
      ev.category = 'cultivation';
      found = true;
    });
    if (!found) {
      pushWorldEvent(model, {
        type: 'character_beat',
        participants: ['player'],
        location: (model.player && model.player.regionId) || 'qinglan-town',
        narrative: journeyText,
        category: 'cultivation',
        tags: ['prologue', 'opening', 'character_beat']
      });
    }
  }

  // 已有友人但缺结识见闻时补写（旧档只有「踏入旅途」一条也会被补齐）。
  // 不把中途结识（leap/befriend）当成开局友人重写「自幼相识」。
  function ensureOpeningMeetStories(model) {
    if (!isRecord(model) || !isRecord(model.player)) return model;
    const friends = recoverPlayerFriends(model);
    if (!friends.length) return model;
    const world = ensureWorldShell(model);
    const events = world.worldEvents;
    const meetCount = events.filter(function (ev) {
      return ev && Array.isArray(ev.tags) &&
        ev.tags.indexOf('opening_meet') >= 0;
    }).length;
    const hasNonOpening = events.some(function (ev) {
      if (!ev) return false;
      const tags = Array.isArray(ev.tags) ? ev.tags : [];
      return tags.indexOf('opening') < 0 && tags.indexOf('prologue') < 0;
    });
    // 已有非开局见闻：开局补写窗口已过（存档 roundtrip / 中途结识不得再灌童年故事）。
    if (hasNonOpening) {
      if (meetCount > 0) scrubOpeningJourneyEvent(model);
      return model;
    }
    const playerName = typeof model.player.name === 'string'
      ? String(model.player.name).trim()
      : '';
    const regionId = model.player.regionId || 'qinglan-town';
    if (meetCount >= friends.length) {
      scrubOpeningJourneyEvent(model);
      return model;
    }
    const covered = {};
    events.forEach(function (ev) {
      if (!ev || !Array.isArray(ev.tags) ||
          ev.tags.indexOf('opening_meet') < 0) {
        return;
      }
      (ev.participants || []).forEach(function (id) {
        if (id && id !== PLAYER) covered[id] = true;
      });
    });
    const missing = friends.filter(function (friend) {
      return friend && friend.id && !covered[friend.id];
    });
    if (!missing.length && meetCount > 0) {
      scrubOpeningJourneyEvent(model);
      return model;
    }
    // 缺多人结识时：清掉旧的单条开场，按友人全量重写，避免只剩「踏入旅途」。
    if (meetCount === 0) {
      world.worldEvents = events.filter(function (ev) {
        return !(ev && Array.isArray(ev.tags) &&
          ev.tags.indexOf('opening') >= 0);
      });
      writeOpeningMeetEvents(
        model,
        friends,
        playerName || '无名',
        regionId
      );
      return model;
    }
    missing.forEach(function (friend, index) {
      const friendName = friend.identity && friend.identity.name
        ? friend.identity.name
        : '故人';
      pushWorldEvent(model, {
        type: 'character_beat',
        participants: ['player', friend.id],
        location: regionId,
        narrative: openingMeetNarrative(
          meetCount + index,
          playerName || '无名',
          friendName
        ),
        category: 'social',
        tags: ['prologue', 'opening', 'opening_meet', 'character_beat']
      });
    });
    scrubOpeningJourneyEvent(model);
    return model;
  }

  // 开局/转世：玩家无父母；约 3 名旧友，每人一条结识见闻，并写入踏入旅途。
  function seedOpeningWorld(model, options) {
    if (!isRecord(model) || !isRecord(model.player)) return model;
    const npcs = ensureNpcShell(model);
    if (Object.keys(npcs.records).length > 0) {
      return ensureOpeningMeetStories(model);
    }
    ensureRelationships(model);
    // 转世清空人物后可能残留旧 kin 指针，开局前强制归零。
    model.player.kin = emptyKin();
    model.player.parentIds = [];
    const regionId = model.player.regionId || 'qinglan-town';
    model.player.regionId = regionId;
    model.player.familyId = model.player.familyId || 'family-player';

    const friendCount = Math.max(
      2,
      Math.min(4, (options && options.friendCount) || 3)
    );
    const friends = [];
    for (let i = 0; i < friendCount; i++) {
      const profile = rollOpeningPeerProfile(model, regionId);
      const friend = createFriend(model, PLAYER, profile);
      if (friend) friends.push(friend);
    }
    if (!friends.length) return model;

    // 开局三人只与玩家为友，彼此默认不认识；日后同城再自然结识。

    const playerName = typeof model.player.name === 'string'
      ? String(model.player.name).trim()
      : '';
    writeOpeningMeetEvents(
      model,
      friends,
      playerName || '无名',
      regionId
    );
    return model;
  }

  function ensureWorldShell(model) {
    if (!isRecord(model.systems)) model.systems = {};
    if (!isRecord(model.systems.world)) {
      model.systems.world = {
        elapsedSeconds: 0,
        nextWorldEventId: 1,
        worldEvents: [],
        calendar: {
          year: 1,
          month: 1,
          monthAccumulator: 0,
          yearEventBudget: 36,
          yearEventsCreated: 0,
          monthEventsCreated: 0,
          npcYearAppearances: {},
          playerLeapLastMonth: {}
        }
      };
    }
    const world = model.systems.world;
    if (!Array.isArray(world.worldEvents)) world.worldEvents = [];
    if (!isRecord(world.calendar)) {
      world.calendar = {
        year: 1,
        month: 1,
        monthAccumulator: 0,
        yearEventBudget: 36,
        yearEventsCreated: 0,
        monthEventsCreated: 0,
        npcYearAppearances: {},
        playerLeapLastMonth: {}
      };
    }
    return world;
  }

  function pushWorldEvent(model, entry) {
    const world = ensureWorldShell(model);
    const nextId = Math.max(1, Math.floor(Number(world.nextWorldEventId) || 1));
    world.nextWorldEventId = nextId + 1;
    const month = 1;
    world.worldEvents.push({
      id: 'we-' + nextId,
      month: month,
      visibleFromMonth: month,
      type: entry.type || 'character_beat',
      participants: Array.isArray(entry.participants)
        ? entry.participants.slice(0, 3)
        : [],
      location: entry.location || 'qinglan-town',
      narrative: entry.narrative || '',
      source: 'world',
      category: entry.category || 'social',
      tags: Array.isArray(entry.tags) ? entry.tags.slice() : []
    });
    world.calendar.yearEventsCreated =
      Math.max(0, Math.floor(Number(world.calendar.yearEventsCreated) || 0)) + 1;
    world.calendar.monthEventsCreated =
      Math.max(0, Math.floor(Number(world.calendar.monthEventsCreated) || 0)) + 1;
  }

  function openingMeetNarrative(index, playerName, friendName) {
    const you = playerName || '无名';
    const other = friendName || '故人';
    const templates = [
      you + '与' + other + '自幼在青岚镇相识，一同长大，早把对方当作可托付的故人。',
      you + '与' + other + '曾在采药归途中结伴同行，风餐露宿几日，就此熟识。',
      you + '与' + other + '在坊市帮工时日日碰面，闲谈渐多，慢慢成了彼此能说上话的人。',
      you + '与' + other + '曾在山门外避雨同处一檐下，聊起修仙志向，此后常有来往。'
    ];
    return templates[index % templates.length];
  }

  function writeOpeningMeetEvents(model, friends, playerName, regionId) {
    const list = Array.isArray(friends) ? friends : [];
    list.forEach(function (friend, index) {
      if (!friend || !friend.id) return;
      const friendName = friend.identity && friend.identity.name
        ? friend.identity.name
        : '故人';
      pushWorldEvent(model, {
        type: 'character_beat',
        participants: ['player', friend.id],
        location: regionId || 'qinglan-town',
        narrative: openingMeetNarrative(index, playerName, friendName),
        category: 'social',
        tags: ['prologue', 'opening', 'opening_meet', 'character_beat']
      });
    });
    if (!list.length) return;
    pushWorldEvent(model, {
      type: 'character_beat',
      participants: ['player'],
      location: regionId || 'qinglan-town',
      narrative: openingJourneyNarrative(playerName),
      category: 'cultivation',
      tags: ['prologue', 'opening', 'character_beat']
    });
  }

  // getpe 等价：展开一人的 fa/mo/par/frs/ens。
  function getpe(model, personId) {
    const person = personOf(model, personId || PLAYER);
    const set = new Set();
    if (!person) return set;
    const kin = ensureKin(person);
    if (kin.fa) set.add(kin.fa);
    if (kin.mo) set.add(kin.mo);
    if (kin.par) set.add(kin.par);
    (kin.frs || []).forEach(function (id) { if (id) set.add(id); });
    (kin.ens || []).forEach(function (id) { if (id) set.add(id); });
    set.delete(personId || PLAYER);
    return set;
  }

  // 世界事件 459：产下一子，挂血缘；不做玩家传承仪式。
  function createChild(model, parentAId, parentBId, options) {
    const opts = options || {};
    const parentA = personOf(model, parentAId);
    if (!parentA) return null;
    const parentB = parentBId ? personOf(model, parentBId) : null;
    const regionId = opts.regionId || parentA.regionId ||
      (parentB && parentB.regionId) ||
      (model.player && model.player.regionId) ||
      'qinglan-town';
    const gender = opts.gender === 'male' || opts.gender === 'female'
      ? opts.gender
      : (draw(model).value < 0.5 ? 'male' : 'female');
    const child = createPerson(model, {
      gender: gender,
      ageYears: 18,
      regionId: regionId,
      sectId: null,
      officeSlotId: null,
      familyId: parentA.familyId ||
        (parentB && parentB.familyId) ||
        ('family-' + parentAId),
      metPlayer: !!(parentA.metPlayer || (parentB && parentB.metPlayer) ||
        parentAId === PLAYER || parentBId === PLAYER),
      realmStage: 0,
      acquaintance: false
    });
    if (!child) return null;
    child.lifeStage = 'child';
    child.ageYears = 0;
    child.ageRemainderSeconds = 0;
    child.sectId = null;
    child.officeSlotId = null;
    child.rogueTitleId = null;
    child.job = 0;
    if (typeof opts.name === 'string' && opts.name.trim()) {
      if (!child.identity) child.identity = {};
      child.identity.name = opts.name.trim();
    }
    const aGender = parentA.identity && parentA.identity.gender;
    const bGender = parentB && parentB.identity && parentB.identity.gender;
    let faId = null;
    let moId = null;
    if (aGender === 'male') faId = parentAId;
    else if (aGender === 'female') moId = parentAId;
    if (parentB) {
      if (bGender === 'male' && !faId) faId = parentBId;
      else if (bGender === 'female' && !moId) moId = parentBId;
      else if (!faId) faId = parentBId;
      else if (!moId) moId = parentBId;
    }
    if (!faId && !moId) {
      faId = parentAId;
    }
    const kin = ensureKin(child);
    kin.fa = faId || null;
    kin.mo = moId || null;
    syncBloodParents(child, kin.fa, kin.mo);

    const rels = ensureRelationships(model);
    [faId, moId].forEach(function (pid) {
      if (!pid) return;
      const parent = personOf(model, pid);
      if (!parent) return;
      addTag(rels, child.id, pid, 'blood');
      addTag(rels, child.id, pid, 'acquainted');
      rels.restrictions[pairKey(child.id, pid)] = 'blood';
      bumpEdge(rels, child.id, pid, 48);
      bumpEdge(rels, pid, child.id, 48);
      addUnique(ensureKin(parent).frs, child.id);
      addUnique(kin.frs, pid);
    });
    if (faId && moId && faId !== moId) {
      linkDaoCompanions(model, faId, moId);
    }
    const npcs = ensureNpcShell(model);
    if (Array.isArray(npcs.activeIds)) {
      npcs.activeIds = npcs.activeIds.filter(function (id) {
        return id !== child.id;
      });
    }
    if (Array.isArray(npcs.backgroundIds) &&
        npcs.backgroundIds.indexOf(child.id) < 0) {
      npcs.backgroundIds.push(child.id);
    }
    return child;
  }

  return Object.freeze({
    PLAYER: PLAYER,
    emptyKin: emptyKin,
    ensureKin: ensureKin,
    createPerson: createPerson,
    createFamilyMember: createFamilyMember,
    createMother: createMother,
    createFather: createFather,
    createChild: createChild,
    createFriend: createFriend,
    rollAcquaintanceRealm: rollAcquaintanceRealm,
    pickPreferLowerRealm: pickPreferLowerRealm,
    createEnemy: createEnemy,
    linkDaoCompanions: linkDaoCompanions,
    befriend: befriend,
    acquaint: acquaint,
    expandForPlayerMeeting: expandForPlayerMeeting,
    seedOpeningWorld: seedOpeningWorld,
    ensureOpeningMeetStories: ensureOpeningMeetStories,
    recoverPlayerFriends: recoverPlayerFriends,
    rollOpeningPeerProfile: rollOpeningPeerProfile,
    getpe: getpe
  });
});
