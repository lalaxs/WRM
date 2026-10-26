(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports
    ? factory(
      require('../content/sect-offices.js'),
      require('../content/sects.js'),
      require('./person-factory.js'),
      require('./dns.js')
    )
    : factory(
      root && root.SectOfficeContent,
      root && root.SectContent,
      root && root.PersonFactory,
      root && root.Dns
    );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.SectOffices = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  SectOfficeContent,
  SectContent,
  PersonFactory,
  DnsArg
) {
  'use strict';

  function resolveDns() {
    if (DnsArg) return DnsArg;
    if (typeof globalThis !== 'undefined' && globalThis.Dns) {
      return globalThis.Dns;
    }
    if (typeof require === 'function') {
      try { return require('./dns.js'); } catch (e) { /* ignore */ }
    }
    return null;
  }
  // 兼容旧闭包写法：本文件内统一用 Dns 局部变量（每次取最新）。
  var Dns = resolveDns();

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function livingMembers(records, sectId) {
    return Object.keys(records || {}).map(function (id) {
      return records[id];
    }).filter(function (person) {
      return person &&
        person.status === 'living' &&
        person.lifeStage !== 'child' &&
        person.sectId === sectId;
    }).sort(compareMembers);
  }

  function compareMembers(left, right) {
    const realm = (Number(right.realmStage) || 0) -
      (Number(left.realmStage) || 0);
    if (realm) return realm;
    const cultivation = (Number(right.cultivation) || 0) -
      (Number(left.cultivation) || 0);
    if (cultivation) return cultivation;
    return String(left.id).localeCompare(String(right.id));
  }

  function hashString(text) {
    let hash = 2166136261;
    const source = String(text || '');
    for (let index = 0; index < source.length; index++) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function pickRogueTitleId(npcId, realmStage) {
    if (SectOfficeContent &&
        typeof SectOfficeContent.pickRogueTitleId === 'function') {
      return SectOfficeContent.pickRogueTitleId(npcId, realmStage);
    }
    const realm = Math.max(0, Math.floor(Number(realmStage) || 0));
    const pool = (SectOfficeContent.ROGUE_TITLES || []).filter(function (row) {
      return realm >= row.minRealm && realm <= row.maxRealm;
    });
    const rows = pool.length > 0 ? pool : SectOfficeContent.ROGUE_TITLES;
    if (!rows || rows.length === 0) return null;
    let total = 0;
    rows.forEach(function (row) {
      total += Math.max(1, Number(row.weight) || 1);
    });
    let cursor = hashString(npcId + ':rogue-title') % total;
    for (let index = 0; index < rows.length; index++) {
      cursor -= Math.max(1, Number(rows[index].weight) || 1);
      if (cursor < 0) return rows[index].id;
    }
    return rows[rows.length - 1].id;
  }

  function assignJobByRealm(person, options) {
    if (SectOfficeContent &&
        typeof SectOfficeContent.assignJobByRealm === 'function') {
      return SectOfficeContent.assignJobByRealm(person, options);
    }
    return person;
  }

  function emptyHolders(slots) {
    const holders = {};
    (slots || []).forEach(function (row) {
      holders[row.id] = [];
    });
    return holders;
  }

  function ensureSectRecord(systems, sectId) {
    if (!systems.records) systems.records = {};
    if (!systems.records[sectId]) {
      systems.records[sectId] = {
        id: sectId,
        leaderId: null,
        roleByNpcId: {},
        officeHolders: {},
        power: 1,
        reputation: 0,
        lastChangedAt: 0
      };
    }
    if (!systems.records[sectId].officeHolders ||
        typeof systems.records[sectId].officeHolders !== 'object') {
      systems.records[sectId].officeHolders = {};
    }
    if (!systems.records[sectId].roleByNpcId ||
        typeof systems.records[sectId].roleByNpcId !== 'object') {
      systems.records[sectId].roleByNpcId = {};
    }
    return systems.records[sectId];
  }

  function clearNpcOffice(person) {
    person.officeSlotId = null;
  }

  function assignRogue(person) {
    assignJobByRealm(person, { forceRogue: true });
  }

  function slotCapacity(slotDef, sectId) {
    Dns = resolveDns();
    if (!slotDef) return 0;
    if (slotDef.pool) return Number.MAX_SAFE_INTEGER;
    // 峰主：对标 jobmax[fami]
    if (slotDef.id === 'peak' && Dns && Array.isArray(Dns.jobmax)) {
      const fami = Dns.sectFami && typeof Dns.sectFami[sectId] === 'number'
        ? Dns.sectFami[sectId]
        : 0;
      const max = Dns.jobmax[fami] | 0;
      if (max > 0) return max;
    }
    // 掌门/名号：唯一席
    if (slotDef.id === 'leader' || slotDef.id === 'honor') {
      return Math.max(1, Math.floor(Number(slotDef.capacity) || 1));
    }
    return Math.max(1, Math.floor(Number(slotDef.capacity) || 1));
  }

  function meetsRealm(person, slotDef) {
    return (Number(person.realmStage) || 0) >=
      (Number(slotDef && slotDef.minRealm) || 0);
  }

  function isValidHeldSlot(sectId, slotId, person) {
    const slotDef = SectOfficeContent.getSlot(sectId, slotId);
    if (!slotDef) return false;
    if (slotDef.pool) return true;
    // 对标 retjob：境界不够不能继续占高职。
    return meetsRealm(person, slotDef);
  }

  function canonicalizePersonSlot(person, sectId) {
    if (!person || typeof person.officeSlotId !== 'string') return;
    const slot = SectOfficeContent.getSlot(sectId, person.officeSlotId);
    if (slot) {
      person.officeSlotId = slot.id;
      if (typeof person.job !== 'number') {
        person.job = typeof slot.job === 'number'
          ? slot.job
          : (Dns && Dns.jobForSlotId ? Dns.jobForSlotId(slot.id) : 0);
      }
    } else {
      person.officeSlotId = null;
    }
  }

  // 对标原版：校验既有任职 + 无职者按 retjob 定职；
  // 高职空缺可由达标者升迁（带编制上下文），不每天洗牌已任职者。
  function fillSect(sectId, members, record, playerOffice) {
    Dns = resolveDns();
    const canonicalSlots = SectOfficeContent.listSlots(sectId);
    const holders = emptyHolders(canonicalSlots);
    const assigned = new Set();
    const roleByNpcId = {};
    const fami = Dns && Dns.sectFami && typeof Dns.sectFami[sectId] === 'number'
      ? Dns.sectFami[sectId]
      : 0;
    const playerJob = playerOffice && playerOffice.sectId === sectId
      ? (typeof playerOffice.job === 'number'
        ? playerOffice.job
        : (Dns && Dns.jobForSlotId
          ? Dns.jobForSlotId(
            playerOffice.officeSlotId || playerOffice.discipleRank
          )
          : 0))
      : -1;

    function occupy(person, slotDef) {
      person.officeSlotId = slotDef.id;
      person.rogueTitleId = null;
      person.job = typeof slotDef.job === 'number'
        ? slotDef.job
        : (Dns && Dns.jobForSlotId ? Dns.jobForSlotId(slotDef.id) : 0);
      person.fami = fami;
      holders[slotDef.id].push(person.id);
      assigned.add(person.id);
      roleByNpcId[person.id] = slotDef.title;
    }

    function peakCount() {
      return (holders.peak || []).length + (playerJob === 2 ? 1 : 0);
    }
    function leaderTaken() {
      return (holders.leader || []).length > 0 || playerJob === 3;
    }
    function honorTaken() {
      return (holders.honor || []).length > 0 || playerJob === 4;
    }

    // 1) 保留仍然合法的既有任职（含显式高职），避免每天洗牌。
    members.forEach(function (person) {
      if (typeof person.fami !== 'number') person.fami = fami;
      canonicalizePersonSlot(person, sectId);
      const slotId = person.officeSlotId;
      if (typeof slotId !== 'string') return;
      const slotDef = SectOfficeContent.getSlot(sectId, slotId);
      if (!slotDef || !isValidHeldSlot(sectId, slotId, person)) {
        clearNpcOffice(person);
        return;
      }
      if (!slotDef.pool &&
          holders[slotId].length >= slotCapacity(slotDef, sectId)) {
        clearNpcOffice(person);
        return;
      }
      occupy(person, slotDef);
    });

    // 1b) 对标 changejob：已任职者可按 retjob 升迁（只升不降），编制满则跳过。
    members.forEach(function (person) {
      if (!assigned.has(person.id)) return;
      const currentJob = typeof person.job === 'number'
        ? person.job
        : (Dns && Dns.jobForSlotId
          ? Dns.jobForSlotId(person.officeSlotId)
          : 0);
      if (currentJob >= 4) return;
      const level = Dns && Dns.majorLevel
        ? Dns.majorLevel(person.realmStage)
        : 0;
      const nextJob = Dns && Dns.retjob
        ? Dns.retjob(level, fami, {
          peakCount: peakCount(),
          leaderTaken: leaderTaken(),
          honorTaken: honorTaken(),
          random: function () {
            return (hashString(person.id + ':changejob') % 1000) / 1000;
          }
        })
        : currentJob;
      if (nextJob <= currentJob) return;
      let nextSlot = Dns && Dns.slotIdForJob
        ? Dns.slotIdForJob(nextJob)
        : null;
      let slotDef = nextSlot
        ? SectOfficeContent.getSlot(sectId, nextSlot)
        : null;
      if (!slotDef && nextJob >= 2) {
        slotDef = SectOfficeContent.getSlot(sectId, 'elder');
      }
      if (!slotDef || slotDef.id === person.officeSlotId) return;
      if (!slotDef.pool &&
          (holders[slotDef.id] || []).length >= slotCapacity(slotDef, sectId)) {
        return;
      }
      // 从旧席移出再占新席
      const oldId = person.officeSlotId;
      if (oldId && Array.isArray(holders[oldId])) {
        holders[oldId] = holders[oldId].filter(function (id) {
          return id !== person.id;
        });
      }
      occupy(person, slotDef);
    });

    // 2) 无职门人：按境界排序后走 retjob（含编制），高境优先占峰主/掌门空缺。
    const pending = members.filter(function (person) {
      return !assigned.has(person.id);
    }).sort(compareMembers);

    pending.forEach(function (person) {
      assignJobByRealm(person, {
        retjobCtx: {
          peakCount: peakCount(),
          leaderTaken: leaderTaken(),
          honorTaken: honorTaken(),
          random: function () {
            return (hashString(person.id + ':retjob') % 1000) / 1000;
          }
        }
      });
      let slotId = person.officeSlotId;
      let slotDef = slotId
        ? SectOfficeContent.getSlot(sectId, slotId)
        : null;
      if (!slotDef) {
        clearNpcOffice(person);
        return;
      }
      if (!slotDef.pool &&
          holders[slotId].length >= slotCapacity(slotDef, sectId)) {
        // 编制已满：降为长老或弟子池
        const level = Dns && Dns.majorLevel
          ? Dns.majorLevel(person.realmStage)
          : 0;
        slotDef = level > 5
          ? (SectOfficeContent.getSlot(sectId, 'elder') ||
            SectOfficeContent.getSlot(sectId, 'disciple'))
          : SectOfficeContent.getSlot(sectId, 'disciple');
        if (!slotDef) {
          clearNpcOffice(person);
          return;
        }
        slotId = slotDef.id;
      }
      occupy(person, slotDef);
    });

    record.officeHolders = holders;
    const sortedRoles = {};
    Object.keys(roleByNpcId).sort().forEach(function (npcId) {
      sortedRoles[npcId] = roleByNpcId[npcId];
    });
    record.roleByNpcId = sortedRoles;
    const leaderHolders = holders.leader || [];
    record.leaderId = leaderHolders.length > 0 ? leaderHolders[0] : null;
  }

  function sectHomeRegion(sectId) {
    if (SectContent && typeof SectContent.get === 'function') {
      const sect = SectContent.get(sectId);
      if (sect && sect.homeRegionId) return sect.homeRegionId;
    }
    const list = SectContent && SectContent.SECTS;
    if (Array.isArray(list)) {
      for (let i = 0; i < list.length; i++) {
        if (list[i] && list[i].id === sectId && list[i].homeRegionId) {
          return list[i].homeRegionId;
        }
      }
    }
    return 'qinglan-town';
  }

  // 对标 creatpersonwithm：门内有人却无人达境时，按需造高境宗主，
  // 而不是提拔弟子；空门派不硬造，以免开局抢占人物池。
  function ensureQualifiedLeader(state, sectId, record) {
    Dns = resolveDns();
    if (record.leaderId) return;
    const members = livingMembers(
      state.systems && state.systems.npcs && state.systems.npcs.records,
      sectId
    );
    if (!members.length) return;
    const slotDef = SectOfficeContent.getSlot(sectId, 'leader');
    if (!slotDef) return;
    if (!PersonFactory ||
        (typeof PersonFactory.createFamilyMember !== 'function' &&
         typeof PersonFactory.createPerson !== 'function')) {
      return;
    }
    // 原版掌门门槛 level_l==8 → H5 realmStage>=8；略抬到 10 保持「高境宗主」叙事。
    const minRealm = Math.max(8, Math.floor(Number(slotDef.minRealm) || 8));
    const spawnRealm = Math.max(10, minRealm);
    const fami = Dns && Dns.sectFami && typeof Dns.sectFami[sectId] === 'number'
      ? Dns.sectFami[sectId]
      : 0;
    const leaderOpts = {
      sectId: sectId,
      regionId: sectHomeRegion(sectId),
      realmStage: spawnRealm,
      officeSlotId: 'leader',
      ageYears: 48 + (hashString(sectId) % 30),
      metPlayer: false
    };
    // 对标 creatpersonf / creatpersonwithm：按家族造高境宗主。
    const leader = typeof PersonFactory.createFamilyMember === 'function'
      ? PersonFactory.createFamilyMember(state, fami, 9, 0, false, leaderOpts)
      : PersonFactory.createPerson(state, leaderOpts);
    if (!leader) return;
    leader.sectId = sectId;
    leader.officeSlotId = 'leader';
    leader.job = 3;
    leader.fami = fami;
    leader.rogueTitleId = null;
    leader.metPlayer = false;
    if (!record.officeHolders || typeof record.officeHolders !== 'object') {
      record.officeHolders = {};
    }
    record.officeHolders.leader = [leader.id];
    if (!record.roleByNpcId || typeof record.roleByNpcId !== 'object') {
      record.roleByNpcId = {};
    }
    record.roleByNpcId[leader.id] = slotDef.title;
    record.leaderId = leader.id;
  }

  // 事件 212：A 接替 B 的席位（或升到 B 同级空缺）；B 降为弟子/长老。
  // 返回 { ok, slotId, title, successorId, predecessorId } 或 null。
  function promoteSuccessor(model, successorId, predecessorId) {
    Dns = resolveDns();
    if (!model || !successorId) return null;
    const records = model.systems && model.systems.npcs &&
      model.systems.npcs.records;
    const successor = records && records[successorId];
    const predecessor = predecessorId && records
      ? records[predecessorId]
      : null;
    if (!successor || successor.status !== 'living' ||
        successor.lifeStage === 'child') {
      return null;
    }
    const sectId = successor.sectId ||
      (predecessor && predecessor.sectId) ||
      null;
    if (!sectId || typeof sectId !== 'string') return null;
    const slotIds = Object.keys(SectOfficeContent.SECT_OFFICE_TABLE || {});
    if (slotIds.indexOf(sectId) < 0) return null;

    let targetSlot = predecessor && typeof predecessor.officeSlotId === 'string'
      ? predecessor.officeSlotId
      : null;
    if (!targetSlot || targetSlot === 'disciple') {
      targetSlot = 'elder';
    }
    const slotDef = SectOfficeContent.getSlot(sectId, targetSlot);
    if (!slotDef) return null;

    successor.sectId = sectId;
    // 事件强制接替：若境界不足席位门槛，抬到最低可任职（否则随后 fill 会清掉）。
    const minRealm = Number(slotDef.minRealm) || 0;
    if ((Number(successor.realmStage) || 0) < minRealm) {
      successor.realmStage = minRealm;
      if (Dns && typeof Dns.syncLevelAliases === 'function') {
        Dns.syncLevelAliases(successor);
      }
    }
    assignJobByRealm(successor, { officeSlotId: targetSlot });

    if (predecessor && predecessor.id !== successor.id &&
        predecessor.sectId === sectId) {
      const demoteTo = targetSlot === 'leader' || targetSlot === 'peak'
        ? 'elder'
        : 'disciple';
      const demoteDef = SectOfficeContent.getSlot(sectId, demoteTo);
      if (demoteDef) {
        const demoteMin = Number(demoteDef.minRealm) || 0;
        if ((Number(predecessor.realmStage) || 0) < demoteMin &&
            demoteTo !== 'disciple') {
          // 降到弟子更稳
          assignJobByRealm(predecessor, { officeSlotId: 'disciple' });
        } else {
          assignJobByRealm(predecessor, { officeSlotId: demoteTo });
        }
      } else {
        clearNpcOffice(predecessor);
      }
    }

    const sects = model.systems && model.systems.sects;
    if (sects) {
      const record = ensureSectRecord(sects, sectId);
      if (!record.officeHolders || typeof record.officeHolders !== 'object') {
        record.officeHolders = {};
      }
      Object.keys(record.officeHolders).forEach(function (slot) {
        if (!Array.isArray(record.officeHolders[slot])) return;
        record.officeHolders[slot] = record.officeHolders[slot].filter(
          function (id) {
            return id !== successor.id &&
              !(predecessor && id === predecessor.id);
          }
        );
      });
      const succSlot = successor.officeSlotId || targetSlot;
      if (!Array.isArray(record.officeHolders[succSlot])) {
        record.officeHolders[succSlot] = [];
      }
      record.officeHolders[succSlot].push(successor.id);
      if (predecessor && predecessor.officeSlotId) {
        const predSlot = predecessor.officeSlotId;
        if (!Array.isArray(record.officeHolders[predSlot])) {
          record.officeHolders[predSlot] = [];
        }
        if (record.officeHolders[predSlot].indexOf(predecessor.id) < 0) {
          record.officeHolders[predSlot].push(predecessor.id);
        }
      }
      if (succSlot === 'leader') {
        record.leaderId = successor.id;
      }
      if (!record.roleByNpcId || typeof record.roleByNpcId !== 'object') {
        record.roleByNpcId = {};
      }
      record.roleByNpcId[successor.id] =
        SectOfficeContent.sectOfficeTitle(sectId, successor.officeSlotId) ||
        slotDef.title;
    }

    const title = SectOfficeContent.sectOfficeTitle
      ? SectOfficeContent.sectOfficeTitle(sectId, successor.officeSlotId)
      : slotDef.title;
    return {
      ok: true,
      slotId: successor.officeSlotId || targetSlot,
      title: title || slotDef.title,
      successorId: successor.id,
      predecessorId: predecessor ? predecessor.id : null
    };
  }

  // 对标 lvup→changejob：突破后只升不降，按 retjob+编制尝试升职。
  function changeJobAfterBreakthrough(model, person) {
    Dns = resolveDns();
    if (!model || !person || !person.sectId) return person;
    const sectId = person.sectId;
    const slotIds = Object.keys(SectOfficeContent.SECT_OFFICE_TABLE || {});
    if (slotIds.indexOf(sectId) < 0) return person;
    const sects = model.systems && model.systems.sects;
    if (!sects) return person;
    const record = ensureSectRecord(sects, sectId);
    const members = livingMembers(
      model.systems.npcs && model.systems.npcs.records,
      sectId
    );
    fillSect(sectId, members, record, sects && sects.player ? sects.player : null);
    if (!record.leaderId) {
      ensureQualifiedLeader(model, sectId, record);
    }
    return person;
  }

  function reconcile(model, options) {
    const inPlace = !!(options && options.inPlace);
    const state = inPlace ? model : clone(model);
    const npcs = state.systems && state.systems.npcs;
    const sects = state.systems && state.systems.sects;
    if (!npcs || !npcs.records || !sects) {
      return { ok: false, code: 'invalid_state', state: model };
    }
    const records = npcs.records;
    const sectIds = Object.keys(SectOfficeContent.SECT_OFFICE_TABLE || {});

    Object.keys(records).forEach(function (npcId) {
      const person = records[npcId];
      if (!person || person.status !== 'living') {
        if (person) {
          person.officeSlotId = null;
          person.rogueTitleId = null;
        }
        return;
      }
      if (person.sectId && sectIds.indexOf(person.sectId) >= 0) {
        person.rogueTitleId = null;
        return;
      }
      person.sectId = null;
      assignRogue(person);
    });

    sectIds.forEach(function (sectId) {
      const record = ensureSectRecord(sects, sectId);
      let members = livingMembers(records, sectId);
      fillSect(sectId, members, record, sects.player || null);
      if (!record.leaderId) {
        ensureQualifiedLeader(state, sectId, record);
        // 新造宗主后把其角色映射并入（弟子职位已在 fillSect 写好）。
        members = livingMembers(records, sectId);
        const leader = record.leaderId && records[record.leaderId];
        if (leader) {
          const title = SectOfficeContent.sectOfficeTitle(sectId, 'leader');
          record.roleByNpcId[leader.id] = title || '宗主';
          if (!Array.isArray(record.officeHolders.leader) ||
              record.officeHolders.leader.indexOf(leader.id) < 0) {
            record.officeHolders.leader = [leader.id];
          }
        }
      }
      record.lastChangedAt = Math.max(
        0,
        Number(record.lastChangedAt) || 0
      );
    });

    return { ok: true, code: 'ok', state: state };
  }

  function resolveTitle(person) {
    if (!person) {
      return {
        kind: 'none',
        title: null,
        slotId: null,
        rogueTitleId: null,
        affiliationLabel: '散修'
      };
    }
    if (person.sectId) {
      const title = SectOfficeContent.sectOfficeTitle(
        person.sectId,
        person.officeSlotId
      );
      return {
        kind: 'sect',
        title: title,
        slotId: person.officeSlotId || null,
        rogueTitleId: null,
        affiliationLabel: null
      };
    }
    const rogue = SectOfficeContent.getRogueTitle(person.rogueTitleId);
    return {
      kind: 'rogue',
      title: rogue ? rogue.title : '散修',
      slotId: null,
      rogueTitleId: rogue ? rogue.id : person.rogueTitleId || null,
      affiliationLabel: SectOfficeContent.affiliationLabel({
        title: rogue ? rogue.title : null
      })
    };
  }

  function resolveAffiliation(person, sectName) {
    const resolved = resolveTitle(person);
    if (resolved.kind === 'sect') {
      return SectOfficeContent.affiliationLabel({
        sectName: sectName || null,
        title: resolved.title
      });
    }
    return resolved.affiliationLabel;
  }

  return Object.freeze({
    reconcile: reconcile,
    resolveTitle: resolveTitle,
    resolveAffiliation: resolveAffiliation,
    pickRogueTitleId: pickRogueTitleId,
    assignJobByRealm: assignJobByRealm,
    changeJobAfterBreakthrough: changeJobAfterBreakthrough,
    promoteSuccessor: promoteSuccessor,
    compareMembers: compareMembers
  });
});
