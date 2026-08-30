(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.SectOfficeContent = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function resolveDns() {
    if (typeof globalThis !== 'undefined' && globalThis.Dns) {
      return globalThis.Dns;
    }
    if (typeof require === 'function') {
      try { return require('../core/dns.js'); } catch (e) { /* ignore */ }
    }
    return null;
  }

  function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
      return value;
    }
    Object.freeze(value);
    Object.keys(value).forEach(function (key) {
      deepFreeze(value[key]);
    });
    return value;
  }

  function slot(id, rank, title, options) {
    options = options || {};
    return {
      id: id,
      rank: rank,
      title: title,
      capacity: options.capacity == null ? 1 : options.capacity,
      minRealm: options.minRealm == null ? 0 : options.minRealm,
      allowVacant: options.allowVacant === true,
      pool: options.pool === true,
      job: typeof options.job === 'number' ? options.job : 0
    };
  }

  // 对标原版 _job 阶梯；展示名用 H5 门派中文。
  // 玩家与 NPC 共用此职阶；玩家另可贡献主动申请（见 sect-pavilion）。
  const RANKS = deepFreeze({
    leader: { id: 'leader', order: 100, label: '掌门位' },
    honor: { id: 'honor', order: 90, label: '名号位' },
    peak: { id: 'peak', order: 80, label: '峰主' },
    elder: { id: 'elder', order: 70, label: '长老' },
    disciple: { id: 'disciple', order: 20, label: '弟子' }
  });

  // 旧档 / 叙事过滤用的席位别名 → 原版职阶
  const SLOT_ALIASES = deepFreeze({
    outer: 'disciple',
    inner: 'disciple',
    true: 'disciple',
    steward: 'disciple',
    'hall-yanwu': 'peak',
    'hall-jianzhong': 'peak',
    'hall-dan': 'peak',
    'hall-garden': 'peak',
    'hall-forge': 'peak',
    'hall-array': 'peak',
    'hall-beast': 'peak',
    'hall-field': 'peak',
    'hall-talisman': 'peak',
    'hall-clear': 'peak',
    hall: 'peak',
    trueDisciple: 'disciple'
  });

  const RANK_ALIASES = deepFreeze({
    outer: 'disciple',
    inner: 'disciple',
    trueDisciple: 'disciple',
    steward: 'disciple',
    hall: 'peak'
  });

  // level_l 门槛 → 粗映射到 H5 realmStage（majorLevel 互逆近似）
  const SECT_OFFICE_TABLE = deepFreeze({
    'taixuan-sword': [
      slot('leader', 'leader', '宗主', {
        capacity: 1, minRealm: 8, allowVacant: true, job: 3
      }),
      slot('honor', 'honor', '剑仙', {
        capacity: 1, minRealm: 8, allowVacant: true, job: 4
      }),
      slot('elder', 'elder', '长老', {
        capacity: 999, minRealm: 6, allowVacant: true, job: 1
      }),
      slot('disciple', 'disciple', '弟子', { pool: true, minRealm: 0, job: 0 })
    ],
    'baicao-valley': [
      slot('leader', 'leader', '谷主', {
        capacity: 1, minRealm: 8, allowVacant: true, job: 3
      }),
      slot('peak', 'peak', '峰主', {
        capacity: 5, minRealm: 7, allowVacant: true, job: 2
      }),
      slot('elder', 'elder', '长老', {
        capacity: 999, minRealm: 6, allowVacant: true, job: 1
      }),
      slot('disciple', 'disciple', '弟子', { pool: true, minRealm: 0, job: 0 })
    ],
    'tiangong-pavilion': [
      slot('leader', 'leader', '阁主', {
        capacity: 1, minRealm: 8, allowVacant: true, job: 3
      }),
      slot('elder', 'elder', '长老', {
        capacity: 999, minRealm: 6, allowVacant: true, job: 1
      }),
      slot('disciple', 'disciple', '弟子', { pool: true, minRealm: 0, job: 0 })
    ],
    'spirit-beast-mountain': [
      slot('leader', 'leader', '山主', {
        capacity: 1, minRealm: 8, allowVacant: true, job: 3
      }),
      slot('elder', 'elder', '长老', {
        capacity: 999, minRealm: 6, allowVacant: true, job: 1
      }),
      slot('disciple', 'disciple', '弟子', { pool: true, minRealm: 0, job: 0 })
    ],
    'qingyin-palace': [
      slot('leader', 'leader', '宫主', {
        capacity: 1, minRealm: 8, allowVacant: true, job: 3
      }),
      slot('honor', 'honor', '音仙', {
        capacity: 1, minRealm: 8, allowVacant: true, job: 4
      }),
      slot('peak', 'peak', '峰主', {
        capacity: 7, minRealm: 7, allowVacant: true, job: 2
      }),
      slot('elder', 'elder', '长老', {
        capacity: 999, minRealm: 6, allowVacant: true, job: 1
      }),
      slot('disciple', 'disciple', '弟子', { pool: true, minRealm: 0, job: 0 })
    ]
  });

  // 散修身份：无门派槽位，按境界带加权抽取，可长期不变。
  const ROGUE_TITLES = deepFreeze([
    {
      id: 'mortal-aspirant',
      title: '凡人修士',
      minRealm: 0,
      maxRealm: 2,
      weight: 24
    },
    {
      id: 'wandering-rogue',
      title: '游方散修',
      minRealm: 0,
      maxRealm: 8,
      weight: 28
    },
    {
      id: 'market-cultivator',
      title: '市井修士',
      minRealm: 0,
      maxRealm: 6,
      weight: 18
    },
    {
      id: 'herb-wanderer',
      title: '山野药农',
      minRealm: 1,
      maxRealm: 8,
      weight: 14
    },
    {
      id: 'street-alchemist',
      title: '走方丹师',
      minRealm: 2,
      maxRealm: 10,
      weight: 12
    },
    {
      id: 'wandering-sword',
      title: '游方剑客',
      minRealm: 3,
      maxRealm: 11,
      weight: 14
    },
    {
      id: 'forge-guest',
      title: '坊市器修',
      minRealm: 3,
      maxRealm: 10,
      weight: 10
    },
    {
      id: 'beast-keeper',
      title: '饲灵客',
      minRealm: 2,
      maxRealm: 10,
      weight: 10
    },
    {
      id: 'talisman-guest',
      title: '符箓客',
      minRealm: 2,
      maxRealm: 10,
      weight: 10
    },
    {
      id: 'jianghu-xia',
      title: '江湖侠修',
      minRealm: 4,
      maxRealm: 12,
      weight: 8
    },
    {
      id: 'cloud-daoist',
      title: '云游道人',
      minRealm: 5,
      maxRealm: 14,
      weight: 8
    },
    {
      id: 'lone-hermit',
      title: '孤峰隐士',
      minRealm: 6,
      maxRealm: 15,
      weight: 6
    }
  ]);

  const ROGUE_BY_ID = Object.create(null);
  ROGUE_TITLES.forEach(function (row) {
    ROGUE_BY_ID[row.id] = row;
  });
  deepFreeze(ROGUE_BY_ID);

  function canonicalizeSlotId(slotId) {
    if (typeof slotId !== 'string' || !slotId) return null;
    if (SLOT_ALIASES[slotId]) return SLOT_ALIASES[slotId];
    return slotId;
  }

  function listSlots(sectId) {
    const rows = SECT_OFFICE_TABLE[sectId];
    return Array.isArray(rows) ? rows : [];
  }

  function getSlot(sectId, slotId) {
    const canonical = canonicalizeSlotId(slotId);
    if (!canonical) return null;
    const rows = listSlots(sectId);
    for (let index = 0; index < rows.length; index++) {
      if (rows[index].id === canonical) return rows[index];
    }
    return null;
  }

  function getRogueTitle(titleId) {
    return typeof titleId === 'string' &&
      Object.prototype.hasOwnProperty.call(ROGUE_BY_ID, titleId)
      ? ROGUE_BY_ID[titleId]
      : null;
  }

  function listRogueTitles() {
    return ROGUE_TITLES;
  }

  function rankOrder(rankId) {
    const rank = RANKS[rankId];
    return rank ? rank.order : 0;
  }

  function sortedSlots(sectId) {
    return listSlots(sectId).slice().sort(function (left, right) {
      const order = rankOrder(right.rank) - rankOrder(left.rank);
      if (order) return order;
      return left.id.localeCompare(right.id);
    });
  }

  function sectOfficeTitle(sectId, slotId) {
    const found = getSlot(sectId, slotId);
    return found ? found.title : null;
  }

  function affiliationLabel(input) {
    const sectName = input && typeof input.sectName === 'string'
      ? input.sectName
      : null;
    const title = input && typeof input.title === 'string'
      ? input.title
      : null;
    if (sectName && title) return sectName + '·' + title;
    if (sectName) return sectName;
    if (title) return '散修·' + title;
    return '散修';
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
    const realm = Math.max(0, Math.floor(Number(realmStage) || 0));
    const pool = ROGUE_TITLES.filter(function (row) {
      return realm >= row.minRealm && realm <= row.maxRealm;
    });
    const rows = pool.length > 0 ? pool : ROGUE_TITLES;
    if (!rows.length) return null;
    let total = 0;
    rows.forEach(function (row) {
      total += Math.max(1, Number(row.weight) || 1);
    });
    let cursor = hashString(String(npcId || '') + ':rogue-title') % total;
    for (let index = 0; index < rows.length; index++) {
      cursor -= Math.max(1, Number(rows[index].weight) || 1);
      if (cursor < 0) return rows[index].id;
    }
    return rows[rows.length - 1].id;
  }

  // 高职：默认不由 retjob 粗表自动授予（掌门/荣誉常靠指定造人）；
  // 峰主/掌门型 fami 在 fillSect 带编制上下文时可由 retjob 升迁。
  const EXPLICIT_ONLY_RANKS = deepFreeze({
    leader: true,
    honor: true
  });

  function resolveFami(person) {
    const Dns = resolveDns();
    if (typeof person.fami === 'number') return person.fami | 0;
    const sectId = person.sectId;
    if (Dns && Dns.sectFami && typeof Dns.sectFami[sectId] === 'number') {
      return Dns.sectFami[sectId];
    }
    return 0;
  }

  // 对标 retjob(tlevel, tfami)：无编制上下文时只定弟子/长老；
  // options.officeSlotId 显式指定优先；options.retjobCtx 供 fillSect 传入编制。
  function assignJobByRealm(person, options) {
    if (!person || typeof person !== 'object') return person;
    const opts = options || {};
    const Dns = resolveDns();
    const sectIds = Object.keys(SECT_OFFICE_TABLE);
    const sectId = typeof person.sectId === 'string' ? person.sectId : null;
    const inSect = !!(sectId && sectIds.indexOf(sectId) >= 0);

    if (opts.forceRogue === true || !inSect) {
      person.sectId = null;
      person.officeSlotId = null;
      person.job = 0;
      if (!getRogueTitle(person.rogueTitleId)) {
        person.rogueTitleId = pickRogueTitleId(person.id, person.realmStage);
      }
      return person;
    }

    if (typeof opts.officeSlotId === 'string' && opts.officeSlotId) {
      const explicit = getSlot(sectId, opts.officeSlotId);
      if (explicit) {
        person.sectId = sectId;
        person.officeSlotId = explicit.id;
        person.job = typeof explicit.job === 'number'
          ? explicit.job
          : (Dns && Dns.jobForSlotId
            ? Dns.jobForSlotId(explicit.id)
            : 0);
        person.rogueTitleId = null;
        return person;
      }
    }

    const fami = resolveFami(person);
    person.fami = fami;
    const level = Dns && typeof Dns.majorLevel === 'function'
      ? Dns.majorLevel(person.realmStage)
      : Math.max(0, Math.floor(Number(person.realmStage) || 0));
    const ctx = opts.retjobCtx || {};
    let job = 0;
    if (Dns && typeof Dns.retjob === 'function') {
      job = Dns.retjob(level, fami, ctx);
    } else {
      job = level > 5 ? 1 : 0;
    }

    // 无编制上下文（造人粗定职）时，不自动抢掌门/荣誉/峰主，只落弟子/长老。
    if (!opts.retjobCtx && job >= 2) {
      job = 1;
    }

    let slotId = Dns && typeof Dns.slotIdForJob === 'function'
      ? Dns.slotIdForJob(job)
      : (job >= 1 ? 'elder' : 'disciple');
    let slotDef = getSlot(sectId, slotId);
    if (!slotDef) {
      // 本宗无该席（如无峰主编制）时降级
      if (job >= 2) {
        slotDef = getSlot(sectId, 'elder') || getSlot(sectId, 'disciple');
        job = slotDef && slotDef.job != null ? slotDef.job : 1;
      } else {
        slotDef = getSlot(sectId, 'disciple');
        job = 0;
      }
    }

    person.sectId = sectId;
    person.officeSlotId = slotDef ? slotDef.id : 'disciple';
    person.job = job;
    person.rogueTitleId = null;
    return person;
  }

  function isExplicitOnlySlot(sectId, slotId) {
    const found = getSlot(sectId, slotId);
    return !!(found && EXPLICIT_ONLY_RANKS[found.rank]);
  }

  function slotsMatch(leftId, rightId) {
    const a = canonicalizeSlotId(leftId);
    const b = canonicalizeSlotId(rightId);
    return !!(a && b && a === b);
  }

  function canonicalizeRankId(rankId) {
    if (typeof rankId !== 'string' || !rankId) return null;
    if (RANK_ALIASES[rankId]) return RANK_ALIASES[rankId];
    return rankId;
  }

  function ranksMatch(leftId, rightId) {
    const a = canonicalizeRankId(leftId);
    const b = canonicalizeRankId(rightId);
    return !!(a && b && a === b);
  }

  return Object.freeze({
    RANKS: RANKS,
    SECT_OFFICE_TABLE: SECT_OFFICE_TABLE,
    ROGUE_TITLES: ROGUE_TITLES,
    SLOT_ALIASES: SLOT_ALIASES,
    RANK_ALIASES: RANK_ALIASES,
    EXPLICIT_ONLY_RANKS: EXPLICIT_ONLY_RANKS,
    listSlots: listSlots,
    sortedSlots: sortedSlots,
    getSlot: getSlot,
    canonicalizeSlotId: canonicalizeSlotId,
    canonicalizeRankId: canonicalizeRankId,
    slotsMatch: slotsMatch,
    ranksMatch: ranksMatch,
    getRogueTitle: getRogueTitle,
    listRogueTitles: listRogueTitles,
    sectOfficeTitle: sectOfficeTitle,
    rankOrder: rankOrder,
    affiliationLabel: affiliationLabel,
    pickRogueTitleId: pickRogueTitleId,
    assignJobByRealm: assignJobByRealm,
    isExplicitOnlySlot: isExplicitOnlySlot
  });
});
