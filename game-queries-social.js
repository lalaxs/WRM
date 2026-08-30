'use strict';

const STAGE4_RELATION_KEYS = Object.freeze([
  'affection',
  'trust',
  'romanticAttachment',
  'closeness',
  'dependence',
  'loyalty',
  'jealousy',
  'desire'
]);
const stage4ReadState = {
  world: new Set()
};


function stage4Person(model, npcId) {
  return model && model.systems && model.systems.npcs &&
    model.systems.npcs.records &&
    model.systems.npcs.records[npcId] || null;
}

function stage4Region(regionId) {
  return stage4Bootstrap.RegionContent &&
    stage4Bootstrap.RegionContent.get(regionId);
}

function stage4Sect(sectId) {
  return stage4Bootstrap.SectContent &&
    stage4Bootstrap.SectContent.get(sectId);
}

function stage4OfficeView(person) {
  const sect = person ? stage4Sect(person.sectId) : null;
  if (stage4Bootstrap.SectOffices &&
      typeof stage4Bootstrap.SectOffices.resolveTitle === 'function') {
    const resolved = stage4Bootstrap.SectOffices.resolveTitle(person);
    const affiliation = stage4Bootstrap.SectOffices.resolveAffiliation(
      person,
      sect ? sect.name : null
    );
    return {
      kind: resolved.kind,
      title: resolved.title,
      slotId: resolved.slotId,
      rogueTitleId: resolved.rogueTitleId,
      affiliationLabel: affiliation
    };
  }
  if (sect) {
    return {
      kind: 'sect',
      title: null,
      slotId: null,
      rogueTitleId: null,
      affiliationLabel: sect.name
    };
  }
  return {
    kind: 'rogue',
    title: '散修',
    slotId: null,
    rogueTitleId: null,
    affiliationLabel: '散修'
  };
}

function stage4CursorOffset(cursor) {
  const matched = typeof cursor === 'string'
    ? /^offset:([0-9]+)$/.exec(cursor)
    : null;
  return matched ? Math.max(0, Number(matched[1]) || 0) : 0;
}

function stage4Paged(rows, cursor, size) {
  const offset = stage4CursorOffset(cursor);
  const pageSize = size || 20;
  const items = rows.slice(offset, offset + pageSize);
  return {
    items,
    nextCursor: offset + items.length < rows.length
      ? 'offset:' + (offset + items.length)
      : null
  };
}

function stage4HistoryTime(entry) {
  const source = entry || {};
  return Number(source.at) || Number(source.createdAt) ||
    Number(source.resolvedAt) || Number(source.fromMs) / 1000 || 0;
}

function stage4HistoryRow(entry, prefix) {
  const source = entry || {};
  return {
    id: String(source.id || prefix + '-' + stage4HistoryTime(source)),
    kind: String(source.category || source.source || prefix),
    title: String(source.title || source.label || '修仙界动态'),
    at: stage4HistoryTime(source),
    npcId: typeof source.npcId === 'string' ? source.npcId : null,
    sectId: typeof source.sectId === 'string' ? source.sectId : null,
    scope: source.scope === 'nearby' ? 'nearby' : 'all'
  };
}

function stage4AbsoluteMonthNow(model) {
  if (stage4Bootstrap.WorldMonth &&
      typeof stage4Bootstrap.WorldMonth.currentAbsoluteMonth === 'function') {
    return stage4Bootstrap.WorldMonth.currentAbsoluteMonth(model);
  }
  return 1;
}

function stage4LabelFromAbsoluteMonth(absolute) {
  if (stage4Bootstrap.WorldMonth &&
      typeof stage4Bootstrap.WorldMonth.labelFromAbsoluteMonth === 'function') {
    return stage4Bootstrap.WorldMonth.labelFromAbsoluteMonth(absolute);
  }
  const value = Math.max(1, Math.floor(Number(absolute) || 1));
  const year = Math.floor((value - 1) / 12) + 1;
  const month = ((value - 1) % 12) + 1;
  return year + '年' + month + '月';
}

function stage4EntryAbsoluteMonth(entry, model) {
  const source = entry || {};
  if (Number.isFinite(source.calendarMonth) && source.calendarMonth >= 1) {
    return Math.floor(source.calendarMonth);
  }
  if (Number.isFinite(source.month) && source.month >= 1 &&
      source.month < 1e6) {
    return Math.floor(source.month);
  }
  const monthSeconds = stage4Bootstrap.WorldMonth &&
    Number(stage4Bootstrap.WorldMonth.MONTH_REAL_SECONDS) > 0
    ? Number(stage4Bootstrap.WorldMonth.MONTH_REAL_SECONDS)
    : 180;
  const rawAt = Number(source.at) || 0;
  // 游戏内秒 → 灵枢月；墙钟秒无法还原年月，回落到当前历。
  if (rawAt > 0 && rawAt < 1e8) {
    return Math.max(1, Math.floor(rawAt / monthSeconds) || 1);
  }
  return stage4AbsoluteMonthNow(model);
}

function stage4ChronicleMetas(model) {
  const systems = model && model.systems;
  const events = systems && systems.events;
  if (!events) return [];
  const metas = [];
  const seen = new Set();
  if (stage4Bootstrap.WorldMonth &&
      typeof stage4Bootstrap.WorldMonth.visibleWorldEvents === 'function') {
    stage4Bootstrap.WorldMonth.visibleWorldEvents(model).forEach(
      function (event) {
        if (typeof stage4Bootstrap.WorldMonth.isChronicleEvent === 'function'
          ? !stage4Bootstrap.WorldMonth.isChronicleEvent(event)
          : false) {
          return;
        }
        if (!event || event.id == null || seen.has(event.id)) return;
        seen.add(event.id);
        metas.push({
          id: event.id,
          calendarMonth: stage4EntryAbsoluteMonth(event, model),
          source: 'worldEvent',
          raw: event
        });
      }
    );
  }
  events.evolution.slice().reverse().forEach(function (entry) {
    if (entry && typeof entry.id === 'string' &&
        entry.id.indexOf('sect-day-') === 0) {
      return;
    }
    const entryId = entry && typeof entry.id === 'string' ? entry.id : '';
    const entryCategory = entry && typeof entry.category === 'string'
      ? entry.category
      : '';
    if (entryCategory === 'lifecycle' ||
        entryCategory === 'ascension' ||
        entryId.indexOf('lifespan-end-') === 0 ||
        entryId.indexOf('ascension-departure-') === 0) {
      return;
    }
    const titleText = entry && entry.title ? String(entry.title) : '';
    if (titleText.indexOf('完成了今日的门中事务') >= 0) {
      return;
    }
    if (/加入了新的宗门|离开了原有宗门/.test(titleText)) {
      return;
    }
    if (/飞升离去|寿元已尽|坐化于凡尘/.test(titleText)) {
      return;
    }
    if (!entry || entry.id == null || seen.has(entry.id)) return;
    seen.add(entry.id);
    metas.push({
      id: entry.id,
      calendarMonth: stage4EntryAbsoluteMonth(entry, model),
      source: 'evolution',
      raw: entry
    });
  });
  events.summaries.slice().reverse().forEach(function (entry) {
    if (!entry || entry.id == null || seen.has(entry.id)) return;
    seen.add(entry.id);
    metas.push({
      id: entry.id,
      calendarMonth: stage4EntryAbsoluteMonth(entry, model),
      source: 'summary',
      raw: entry
    });
  });
  return metas.sort(function (left, right) {
    return right.calendarMonth - left.calendarMonth ||
      String(left.id).localeCompare(String(right.id));
  });
}

function stage4ElaborateChronicleMeta(model, meta) {
  if (!meta) return null;
  if (meta.source === 'worldEvent') {
    const event = meta.raw;
    const narrative = stage4RewritePlayerNarrative(
      model,
      event.narrative || '',
      event.participants
    );
    const absoluteMonth = meta.calendarMonth;
    return {
      id: event.id,
      kind: event.type || 'world',
      title: '',
      body: narrative,
      calendarMonth: absoluteMonth,
      calendarLabel: stage4LabelFromAbsoluteMonth(absoluteMonth),
      at: absoluteMonth,
      participants: (event.participants || []).map(function (npcId) {
        if (npcId === 'player') {
          return {
            npcId: 'player',
            name: stage4PlayerNarrativeLabel(model)
          };
        }
        const person = stage4Person(model, npcId);
        return {
          npcId: npcId,
          name: person && person.identity
            ? person.identity.name
            : '一位修士'
        };
      }),
      options: null
    };
  }
  const row = stage4HistoryRow(meta.raw, 'world');
  const absoluteMonth = meta.calendarMonth;
  return Object.assign({}, row, {
    calendarMonth: absoluteMonth,
    calendarLabel: stage4LabelFromAbsoluteMonth(absoluteMonth),
    at: absoluteMonth,
    options: null
  });
}

function stage4EventRows(model, options) {
  const metas = stage4ChronicleMetas(model);
  const limit = options && Number.isFinite(options.elaborateLimit)
    ? Math.max(0, Math.floor(options.elaborateLimit))
    : metas.length;
  return metas.slice(0, limit).map(function (meta) {
    return stage4ElaborateChronicleMeta(model, meta);
  });
}

function queryEvents(input) {
  const model = stage4Model();
  if (!model) {
    return readonlyQuery({
      stage4Available: false,
      section: 'world',
      filter: 'all',
      counts: { world: 0 },
      unreadCounts: { world: 0 },
      tabs: [{ id: 'world', label: '大事记' }],
      items: [],
      nextCursor: null,
      offlineReports: []
    });
  }
  const requested = input && typeof input === 'object' ? input : {};
  const metas = stage4ChronicleMetas(model);
  const unread = metas.filter(function (meta) {
    return !stage4ReadState.world.has(meta.id);
  }).length;
  const page = stage4Paged(metas, requested.cursor, 30);
  const items = page.items.map(function (meta) {
    return stage4ElaborateChronicleMeta(model, meta);
  });
  return readonlyQuery({
    stage4Available: true,
    section: 'world',
    filter: 'all',
    tabs: [{ id: 'world', label: '大事记' }],
    counts: { world: metas.length },
    unreadCounts: { world: unread },
    items: items,
    nextCursor: page.nextCursor,
    offlineReports: []
  });
}

function stage4ZeroEdge() {
  return {
    affection: 0,
    trust: 0,
    romanticAttachment: 0,
    desire: 0,
    dependence: 0,
    loyalty: 0,
    jealousy: 0,
    closeness: 0,
    lastChangedAt: 0
  };
}

function stage4ReadEdge(edges, sourceId, targetId) {
  const edge = edges && edges[sourceId + '>' + targetId];
  const out = stage4ZeroEdge();
  if (!edge) return out;
  STAGE4_RELATION_KEYS.forEach(function (key) {
    out[key] = Number.isFinite(edge[key])
      ? Math.max(0, Math.floor(edge[key]))
      : 0;
  });
  out.lastChangedAt = Number.isFinite(edge.lastChangedAt)
    ? edge.lastChangedAt
    : 0;
  return out;
}

// UI 只读人物对：禁止走 Relationships.queryPair（内部会整树 snapshotJsonData）。
function stage4Pair(model, npcId) {
  const person = stage4Person(model, npcId);
  if (!person) return null;
  const relationships = model.systems && model.systems.relationships;
  const edges = relationships && relationships.edges || {};
  const bonds = relationships && relationships.bonds || {};
  const restrictions = relationships && relationships.restrictions || {};
  const bondKey = stage4BondKey(npcId);
  const bond = bonds[bondKey];
  return {
    firstId: 'player',
    secondId: npcId,
    firstToSecond: stage4ReadEdge(edges, 'player', npcId),
    secondToFirst: stage4ReadEdge(edges, npcId, 'player'),
    bond: bond && typeof bond.stage === 'string'
      ? {
        stage: bond.stage,
        changedByEventId: bond.changedByEventId || null,
        changedAt: Number.isFinite(bond.changedAt) ? bond.changedAt : 0
      }
      : {
        stage: 'stranger',
        changedByEventId: null,
        changedAt: 0
      },
    romanceEligible: person.status === 'living' && !restrictions[bondKey]
  };
}

function stage4BondKey(npcId) {
  return 'player' < npcId
    ? 'player|' + npcId
    : npcId + '|player';
}

// 列表行只读边表，避免对每人 queryPair + deepFreeze。
function stage4PersonRow(model, npcId) {
  const person = stage4Person(model, npcId);
  if (!person || person.status !== 'living') return null;
  const relationships = model.systems && model.systems.relationships;
  const edges = relationships && relationships.edges || {};
  const bonds = relationships && relationships.bonds || {};
  const forward = edges['player>' + npcId];
  const reverse = edges[npcId + '>player'];
  const bond = bonds[stage4BondKey(npcId)];
  const region = stage4Region(person.regionId);
  const sect = stage4Sect(person.sectId);
  const office = stage4OfficeView(person);
  let topRelationId = 'affection';
  let topRelationValue = 0;
  STAGE4_RELATION_KEYS.forEach(function (key) {
    const amount = reverse && Number.isFinite(reverse[key])
      ? Math.max(0, Math.floor(reverse[key]))
      : 0;
    if (amount > topRelationValue) {
      topRelationValue = amount;
      topRelationId = key;
    }
  });
  const appearance = person.identity && person.identity.appearance;
  return {
    npcId,
    name: person.identity.name,
    gender: person.identity.gender,
    pronoun: person.identity.gender === 'male' ? '他' : '她',
    appearance: appearance && typeof appearance === 'object'
      ? {
        buildId: appearance.buildId || null,
        faceId: appearance.faceId || null,
        hairId: appearance.hairId || null,
        featureId: appearance.featureId || null
      }
      : null,
    metPlayer: person.metPlayer === true,
    realm: REALM_TABLE[person.realmStage]
      ? REALM_TABLE[person.realmStage].name
      : '练气一层',
    regionId: person.regionId,
    regionName: region ? region.name : '行踪不明',
    sectId: person.sectId,
    sectName: sect ? sect.name : '散修',
    officeTitle: office.title,
    affiliationLabel: office.affiliationLabel,
    affection: forward && Number.isFinite(forward.affection)
      ? forward.affection
      : 0,
    trust: forward && Number.isFinite(forward.trust)
      ? forward.trust
      : 0,
    topRelationId: topRelationId,
    topRelationValue: topRelationValue,
    recentAt: Math.max(
      forward && Number.isFinite(forward.lastChangedAt)
        ? forward.lastChangedAt
        : 0,
      reverse && Number.isFinite(reverse.lastChangedAt)
        ? reverse.lastChangedAt
        : 0,
      bond && Number.isFinite(bond.changedAt) ? bond.changedAt : 0
    ),
    bondStage: bond && typeof bond.stage === 'string'
      ? bond.stage
      : 'stranger'
  };
}

function queryRelationships(input) {
  const model = stage4Model();
  if (!model) return readonlyQuery({ people: [], total: 0 });
  const requested = input && typeof input === 'object' ? input : {};
  const search = typeof requested.search === 'string'
    ? requested.search.trim().toLowerCase()
    : '';
  const sort = ['recent', 'affection', 'trust', 'name'].indexOf(
    requested.sort
  ) >= 0 ? requested.sort : 'recent';
  const npcs = model.systems.npcs;
  const relationships = model.systems.relationships || {};
  const edges = relationships.edges || {};
  const bonds = relationships.bonds || {};
  const ids = npcs.activeIds.slice();
  // O(background) player-edge probes instead of scanning every NPC↔NPC edge.
  npcs.backgroundIds.forEach(function (npcId) {
    if (ids.indexOf(npcId) >= 0) return;
    if (edges['player>' + npcId] ||
        edges[npcId + '>player'] ||
        bonds[stage4BondKey(npcId)]) {
      ids.push(npcId);
    }
  });
  let people = ids.map(function (npcId) {
    return stage4PersonRow(model, npcId);
  }).filter(Boolean).filter(function (person) {
    // 关系页只列已认识的 NPC（见过面 / 好感≥20 / 有关系标签）。
    if (stage4Bootstrap.WorldMonth &&
        typeof stage4Bootstrap.WorldMonth.isKnownToPlayer === 'function') {
      return stage4Bootstrap.WorldMonth.isKnownToPlayer(model, person.npcId);
    }
    return person.metPlayer === true ||
      person.affection >= 20 ||
      person.bondStage !== 'stranger';
  });
  if (search) {
    people = people.filter(function (person) {
      return [
        person.name,
        person.regionName,
        person.sectName,
        person.officeTitle,
        person.affiliationLabel,
        person.realm
      ].join('|').toLowerCase().indexOf(search) >= 0;
    });
  }
  people.sort(function (left, right) {
    if (sort === 'name') return left.name.localeCompare(right.name);
    const field = sort === 'affection'
      ? 'affection'
      : sort === 'trust' ? 'trust' : 'recentAt';
    return right[field] - left[field] ||
      left.name.localeCompare(right.name);
  });
  return Object.freeze({
    search: search,
    sort: sort,
    total: people.length,
    calendarLabel: stage4CalendarLabel(model),
    playerRegion: stage4PlayerRegion(model),
    people: Object.freeze(people)
  });
}

function stage4CalendarLabel(model) {
  const world = model && model.systems && model.systems.world;
  if (!world || !stage4Bootstrap.WorldMonth ||
      typeof stage4Bootstrap.WorldMonth.calendarLabel !== 'function') {
    return null;
  }
  const cal = stage4Bootstrap.WorldMonth.ensureCalendar(world);
  return stage4Bootstrap.WorldMonth.calendarLabel(cal);
}

function queryCalendar() {
  const model = stage4Model();
  if (!model) return readonlyQuery(null);
  const label = stage4CalendarLabel(model);
  if (!label) return readonlyQuery(null);
  const cal = stage4Bootstrap.WorldMonth.ensureCalendar(model.systems.world);
  return readonlyQuery({
    label: label,
    year: cal.year,
    month: cal.month
  });
}

function stage4PlayerRegion(model) {
  const regionId = model && model.player && model.player.regionId;
  const region = stage4Region(regionId);
  return {
    id: regionId || 'qinglan-town',
    name: region ? region.name : '行踪不明'
  };
}

function stage4PlayerNarrativeLabel(model) {
  if (stage4Bootstrap.WorldMonth &&
      typeof stage4Bootstrap.WorldMonth.playerNarrativeLabel === 'function') {
    return stage4Bootstrap.WorldMonth.playerNarrativeLabel(model);
  }
  const raw = model && model.player && typeof model.player.name === 'string'
    ? String(model.player.name).trim()
    : '';
  const name = raw
    .replace(/（你）$/, '')
    .replace(/\(你\)$/, '')
    .trim();
  return name || '无名';
}

function stage4RewritePlayerNarrative(model, text, participants) {
  const ids = Array.isArray(participants) ? participants : [];
  const hasPlayer = ids.some(function (id) {
    return id === 'player' || (id && id.npcId === 'player');
  });
  if (!hasPlayer) return String(text || '');
  const label = stage4PlayerNarrativeLabel(model);
  if (stage4Bootstrap.WorldMonth &&
      typeof stage4Bootstrap.WorldMonth.rewriteNarrativePlayerYou === 'function') {
    return stage4Bootstrap.WorldMonth.rewriteNarrativePlayerYou(text, label);
  }
  if (!label) return String(text || '');
  let next = String(text || '');
  if (next.indexOf(label) >= 0) return next;
  return next
    .replace(/^你与/, label + '与')
    .replace(/^你在/, label + '在')
    .replace(/^你正/, label + '正')
    .replace(/^你开始/, label + '开始')
    .replace(/^你/, label);
}

function stage4WorldEventHistory(model, npcId, limit) {
  if (!stage4Bootstrap.WorldMonth ||
      typeof stage4Bootstrap.WorldMonth.eventsForParticipant !== 'function') {
    return [];
  }
  return stage4Bootstrap.WorldMonth.eventsForParticipant(
    model,
    npcId,
    limit || 24
  ).map(function (event) {
    const absoluteMonth = stage4EntryAbsoluteMonth(event, model);
    return {
      id: event.id,
      title: '',
      body: stage4RewritePlayerNarrative(
        model,
        event.narrative || '',
        event.participants
      ),
      calendarMonth: absoluteMonth,
      calendarLabel: stage4LabelFromAbsoluteMonth(absoluteMonth),
      participants: (event.participants || []).map(function (pid) {
        if (pid === 'player') {
          return {
            npcId: 'player',
            name: stage4PlayerNarrativeLabel(model)
          };
        }
        const person = stage4Person(model, pid);
        return {
          npcId: pid,
          name: person && person.identity
            ? person.identity.name
            : '一位修士'
        };
      })
    };
  });
}

function stage4BiographyHistory(model, person) {
  const rows = [];
  const biography = Array.isArray(person.biography) ? person.biography : [];
  biography.forEach(function (entry, index) {
    if (!entry || typeof entry !== 'object') return;
    // 开局默认只展示出身；入世后的经历来自世界见闻，不预填旧事。
    if (entry.type === 'pregame') return;
    if (entry.kind === 'lifespan-warning') {
      rows.push({
        id: 'bio-' + index,
        title: '',
        body: '寿元将近，需要日后处理。',
        calendarLabel: Number.isFinite(entry.atAge) && entry.atAge > 0
          ? entry.atAge + ' 岁'
          : '',
        participants: []
      });
      return;
    }
    if (entry.type !== 'origin') return;
    const text = typeof entry.text === 'string'
      ? entry.text
      : (typeof entry.body === 'string' ? entry.body : '');
    if (!text) return;
    rows.push({
      id: 'bio-' + index,
      title: '',
      body: text,
      calendarLabel: '',
      participants: []
    });
  });
  return rows;
}

function stage4NpcBreakthrough(person) {
  const stage = Math.max(0, Math.floor(Number(person.realmStage) || 0));
  const cultivation = Math.max(0, Number(person.cultivation) || 0);
  const cur = REALM_TABLE[stage] || REALM_TABLE[0];
  const nextRealm = REALM_TABLE[stage + 1]
    ? REALM_TABLE[stage + 1].name
    : null;
  let need = nextRealm
    ? Math.max(1, Math.floor(Number(cur.need) || 1))
    : Math.max(1, Math.floor(Number(cur.need) || 1));
  // 与结算同源：优先 Dns / NpcSimulation 细档门槛，避免 UI 满条却永不突破。
  if (typeof Dns !== 'undefined' && Dns &&
      typeof Dns.cultivationNeed === 'function') {
    const dnsNeed = Dns.cultivationNeed(stage);
    if (dnsNeed > 0) need = dnsNeed;
  } else if (typeof NpcSimulation !== 'undefined' && NpcSimulation &&
      typeof NpcSimulation.realmCultivationNeed === 'function') {
    const simNeed = NpcSimulation.realmCultivationNeed(stage);
    if (simNeed > 0) need = simNeed;
  }
  const ratio = nextRealm ? Math.min(1, cultivation / need) : 1;
  let successRate = 0;
  if (nextRealm) {
    if (typeof Dns !== 'undefined' && Dns &&
        typeof Dns.breakthroughRate === 'function') {
      successRate = Math.round(Dns.breakthroughRate(stage) * 100);
    } else if (cur.tier === 'minor') {
      successRate = 100;
    } else if (Number.isFinite(cur.baseRate)) {
      successRate = Math.round(cur.baseRate * 100);
    } else {
      successRate = 60;
    }
  }
  let efficiency = Math.max(0, Number(person.cultivationEfficiency) || 0);
  // 旧档可能仍存「每秒」极小值；展示统一为每月增量。
  if (efficiency > 0 && efficiency < 0.05 &&
      typeof Dns !== 'undefined' && Dns &&
      typeof Dns.getexps === 'function') {
    efficiency = Dns.getexps(person);
  }
  return {
    realm: cur.name || '练气一层',
    cultivation: Math.floor(cultivation),
    need: need,
    successRate: successRate,
    efficiency: Math.round(efficiency * 100) / 100,
    percent: Math.round(ratio * 1000) / 10,
    progress: ratio,
    nextRealm: nextRealm
  };
}

function stage4PersonRef(model, personId) {
  if (personId === 'player') {
    return Object.freeze({
      npcId: null,
      name: stage4PlayerNarrativeLabel(model),
      isPlayer: true
    });
  }
  const person = stage4Person(model, personId);
  if (!person || !person.identity) return null;
  return Object.freeze({
    npcId: personId,
    name: person.identity.name || personId,
    isPlayer: false
  });
}

function stage4ParentsView(model, person) {
  const ids = [];
  const seen = {};
  function pushId(id) {
    if (!id || typeof id !== 'string' || seen[id]) return;
    seen[id] = true;
    ids.push(id);
  }
  if (person && Array.isArray(person.parentIds)) {
    person.parentIds.forEach(pushId);
  }
  if (person && person.kin) {
    pushId(person.kin.fa);
    pushId(person.kin.mo);
  }
  const people = [];
  ids.forEach(function (id) {
    const ref = stage4PersonRef(model, id);
    if (ref) people.push(ref);
  });
  if (!people.length) {
    return Object.freeze({ text: '不详', people: [] });
  }
  return Object.freeze({
    text: people.map(function (row) { return row.name; }).join('、'),
    people: people
  });
}

function stage4FriendsView(model, person) {
  const ids = person && person.kin && Array.isArray(person.kin.frs)
    ? person.kin.frs
    : [];
  const people = [];
  const seen = {};
  ids.forEach(function (id) {
    if (!id || typeof id !== 'string' || seen[id]) return;
    seen[id] = true;
    const ref = stage4PersonRef(model, id);
    if (ref) people.push(ref);
  });
  if (!people.length) {
    return Object.freeze({ text: '无', people: [] });
  }
  return Object.freeze({
    text: people.map(function (row) { return row.name; }).join('、'),
    people: people
  });
}

function stage4FindTaggedNpc(model, npcId, tagIds) {
  const tags = model && model.systems && model.systems.relationships &&
    model.systems.relationships.tags;
  if (!tags || typeof tags !== 'object') return null;
  const wanted = {};
  (tagIds || []).forEach(function (tag) {
    wanted[tag] = true;
  });
  const keys = Object.keys(tags);
  for (let index = 0; index < keys.length; index++) {
    const key = keys[index];
    const parts = String(key).split('|');
    if (parts.length !== 2) continue;
    if (parts[0] !== npcId && parts[1] !== npcId) continue;
    const list = tags[key];
    if (!Array.isArray(list)) continue;
    let hit = false;
    for (let tagIndex = 0; tagIndex < list.length; tagIndex++) {
      if (wanted[list[tagIndex]]) {
        hit = true;
        break;
      }
    }
    if (!hit) continue;
    const otherId = parts[0] === npcId ? parts[1] : parts[0];
    const ref = stage4PersonRef(model, otherId);
    if (ref) return ref;
  }
  return null;
}

function stage4MentorView(model, person, npcId) {
  if (person && person.mentorNpcId) {
    const explicit = stage4PersonRef(model, person.mentorNpcId);
    if (explicit) {
      return Object.freeze({ text: explicit.name, person: explicit });
    }
  }
  const tagged = stage4FindTaggedNpc(model, npcId, ['mentor']);
  if (tagged) {
    return Object.freeze({ text: tagged.name, person: tagged });
  }
  return Object.freeze({ text: '不详', person: null });
}

function stage4DaoCompanionView(model, person, npcId, pair) {
  if (pair && pair.bond && pair.bond.stage === 'partner') {
    const you = stage4PersonRef(model, 'player');
    return Object.freeze({ text: you.name, person: you });
  }
  if (person && person.kin && person.kin.par) {
    const kinPar = stage4PersonRef(model, person.kin.par);
    if (kinPar) {
      return Object.freeze({ text: kinPar.name, person: kinPar });
    }
  }
  const tagged = stage4FindTaggedNpc(model, npcId, [
    'partner',
    'dao-companion'
  ]);
  if (tagged) {
    return Object.freeze({ text: tagged.name, person: tagged });
  }
  return Object.freeze({ text: '无', person: null });
}

function stage4SpiritualRootView(person) {
  const rootId = person && person.spiritualRootId;
  const root = stage4Bootstrap.NpcGenerationContent &&
    typeof stage4Bootstrap.NpcGenerationContent.getSpiritualRoot ===
      'function'
    ? stage4Bootstrap.NpcGenerationContent.getSpiritualRoot(rootId)
    : null;
  return Object.freeze({
    id: root ? root.id : rootId || null,
    name: root && root.name ? root.name : '未知',
    summary: root && root.name
      ? '灵根决定修炼效率与部分特质。'
      : '灵根尚不明朗。'
  });
}

function stage4TraitsView(person) {
  if (stage4Bootstrap.NpcGenerationContent &&
      typeof stage4Bootstrap.NpcGenerationContent.daoHeartTraitViews ===
        'function') {
    return stage4Bootstrap.NpcGenerationContent.daoHeartTraitViews(
      person.traits
    );
  }
  return [];
}

function stage4PreferenceCategoryLabel(categoryId) {
  const labels = {
    herb: '灵草',
    pill: '丹药',
    artifact: '法器',
    talisman: '符箓',
    ore: '矿石',
    fish: '渔获',
    wood: '灵木',
    manual: '功法'
  };
  return labels[categoryId] || categoryId;
}

function stage4PreferenceView(person, affection) {
  const prefs = person && person.preferences && typeof person.preferences === 'object'
    ? person.preferences
    : {};
  const loveItemIds = Array.isArray(prefs.loveItemIds)
    ? prefs.loveItemIds.slice(0, 2)
    : [];
  const likeCategories = Array.isArray(prefs.likeCategories)
    ? prefs.likeCategories.slice(0, 2)
    : [];
  const known = Number(affection) >= 20 &&
    (loveItemIds.length > 0 || likeCategories.length > 0);
  if (!known) {
    return Object.freeze({
      known: false,
      text: '未知',
      loveItemIds: [],
      likeCategories: []
    });
  }
  const parts = [];
  likeCategories.forEach(function (categoryId) {
    parts.push(stage4PreferenceCategoryLabel(categoryId));
  });
  loveItemIds.forEach(function (itemId) {
    const item = stage2Bootstrap && stage2Bootstrap.ItemContent
      ? stage2Bootstrap.ItemContent.get(itemId)
      : null;
    parts.push(item && item.name ? item.name : resName(itemId));
  });
  return Object.freeze({
    known: true,
    text: parts.length ? parts.join('、') : '未知',
    loveItemIds: loveItemIds.slice(),
    likeCategories: likeCategories.slice()
  });
}

function queryRelationship(input) {
  const model = stage4Model();
  const npcId = input && typeof input.npcId === 'string'
    ? input.npcId
    : null;
  const person = model && stage4Person(model, npcId);
  const pair = person && stage4Pair(model, npcId);
  if (!person || !pair) return null;
  const profile =
    stage4Bootstrap.NpcGenerationContent.getRomancePrinciple(
      person.romancePrincipleId
    );
  const personalityProfile =
    stage4Bootstrap.NpcGenerationContent.getPersonality(
      person.personalityId
    );
  const region = stage4Region(person.regionId);
  const sect = stage4Sect(person.sectId);
  const office = stage4OfficeView(person);
  const breakthrough = stage4NpcBreakthrough(person);
  const parents = stage4ParentsView(model, person);
  const mentor = stage4MentorView(model, person, npcId);
  const daoCompanion = stage4DaoCompanionView(model, person, npcId, pair);
  const friends = stage4FriendsView(model, person);
  const spiritualRoot = stage4SpiritualRootView(person);
  const traits = stage4TraitsView(person);
  // 出身在前；其后为入世后世界见闻（与大事记同文风）。
  const includeHistory = !(input && input.includeHistory === false);
  const history = includeHistory ? stage4BiographyHistory(model, person) : [];
  if (includeHistory) {
    stage4WorldEventHistory(model, npcId, 24).forEach(function (entry) {
      history.push(entry);
    });
    if (Array.isArray(person.keyEventIds)) {
      person.keyEventIds.slice(0, 12).forEach(function (eventId) {
        history.push({
          id: eventId,
          title: '关键事件',
          body: '曾卷入事件「' + eventId + '」。'
        });
      });
    }
  }
  const affectionToPlayer = pair.secondToFirst &&
    Number.isFinite(pair.secondToFirst.affection)
    ? Math.max(0, Math.floor(pair.secondToFirst.affection))
    : 0;
  // 热路径：浅冻结即可，避免 Stage4 snapshotJsonData 深拷贝。
  const appearance = person.identity && person.identity.appearance;
  return Object.freeze({
    npcId,
    name: person.identity.name,
    gender: person.identity.gender,
    pronoun: person.identity.gender === 'male' ? '他' : '她',
    appearance: appearance && typeof appearance === 'object'
      ? Object.freeze({
        buildId: appearance.buildId || null,
        faceId: appearance.faceId || null,
        hairId: appearance.hairId || null,
        featureId: appearance.featureId || null
      })
      : null,
    appearanceTags: appearance && typeof appearance === 'object'
      ? Object.keys(appearance).map(function (key) {
        return appearance[key];
      })
      : [],
    ageYears: person.ageYears,
    realmStage: person.realmStage,
    realm: REALM_TABLE[person.realmStage]
      ? REALM_TABLE[person.realmStage].name
      : '练气一层',
    region: region ? { id: region.id, name: region.name } : null,
    playerRegion: stage4PlayerRegion(model),
    sameRegion: stage4Bootstrap.WorldMonth &&
      typeof stage4Bootstrap.WorldMonth.sameRegion === 'function'
      ? stage4Bootstrap.WorldMonth.sameRegion(model, npcId)
      : true,
    calendarLabel: stage4CalendarLabel(model),
    sect: sect ? { id: sect.id, name: sect.name } : null,
    office: {
      kind: office.kind,
      title: office.title,
      slotId: office.slotId,
      rogueTitleId: office.rogueTitleId,
      affiliationLabel: office.affiliationLabel
    },
    biography: Array.isArray(person.biography) ? person.biography.slice() : [],
    history: history,
    breakthrough: breakthrough,
    parents: parents,
    mentor: mentor,
    daoCompanion: daoCompanion,
    friends: friends,
    spiritualRoot: spiritualRoot,
    traits: traits.slice(),
    cultivationEfficiency: breakthrough.efficiency,
    bond: pair.bond,
    romanceEligible: pair.romanceEligible,
    personality: personalityProfile ? {
      id: personalityProfile.id,
      name: personalityProfile.name,
      summary: personalityProfile.summary
    } : null,
    preferences: stage4PreferenceView(person, affectionToPlayer),
    activityStatus: person.activityStatus || 'normal',
    activityStatusLabel: (function () {
      const labels = stage4Bootstrap.WorldMonth &&
        stage4Bootstrap.WorldMonth.ACTIVITY_STATUS_LABELS;
      const status = person.activityStatus || 'normal';
      return labels && labels[status] ? labels[status] : '正常';
    })(),
    metPlayer: person.metPlayer === true,
    romancePrinciple: profile ? {
      id: profile.id,
      name: profile.name,
      summary: profile.summary
    } : null,
    metrics: STAGE4_RELATION_KEYS.map(function (key) {
      return {
        id: key,
        playerToPerson: pair.firstToSecond[key],
        personToPlayer: pair.secondToFirst[key]
      };
    })
  });
}

function stage4FirstOwnedItemId(model) {
  const stacks = model && model.player && model.player.inventory &&
    model.player.inventory.stacks;
  if (!stacks || typeof stacks !== 'object') return null;
  const keys = Object.keys(stacks);
  for (let index = 0; index < keys.length; index++) {
    const itemId = keys[index];
    if (Number(stacks[itemId]) > 0) return itemId;
  }
  return null;
}

function stage4GiftChoices(model, npcId, options) {
  const stacks = model.player && model.player.inventory &&
    model.player.inventory.stacks || {};
  const gift = stage4Bootstrap.SocialInteractionContent &&
    typeof stage4Bootstrap.SocialInteractionContent.get === 'function'
    ? stage4Bootstrap.SocialInteractionContent.get('gift')
    : null;
  if (!gift) return [];
  const person = stage4Person(model, npcId);
  if (!person || person.status !== 'living') return [];
  const ignoreBusy = !!(options && options.ignoreBusy);
  const jobs = model.systems &&
    model.systems.parallel &&
    model.systems.parallel.jobs;
  if (!ignoreBusy && Array.isArray(jobs) && jobs.some(function (job) {
    return job && job.kind === 'social' && job.npcId === npcId &&
      job.ready !== true;
  })) {
    return [];
  }
  const need = Number.isFinite(gift.requiredAffection)
    ? Math.max(0, Math.floor(gift.requiredAffection))
    : 0;
  if (need > 0) {
    const edge = model.systems &&
      model.systems.relationships &&
      model.systems.relationships.edges &&
      model.systems.relationships.edges[npcId + '>player'];
    const affection = edge && Number.isFinite(edge.affection)
      ? Math.max(0, Math.floor(edge.affection))
      : 0;
    if (affection < need) return [];
  }
  return Object.keys(stacks).filter(function (itemId) {
    return Number(stacks[itemId]) > 0;
  }).map(function (itemId) {
    const item = stage2Bootstrap.ItemContent &&
      stage2Bootstrap.ItemContent.get(itemId);
    return {
      itemId,
      name: item ? item.name : resName(itemId),
      quantity: stacks[itemId]
    };
  });
}

function querySocial(input) {
  const model = stage4Model();
  const npcId = input && typeof input.npcId === 'string'
    ? input.npcId
    : null;
  const person = model && stage4Person(model, npcId);
  if (!person) return null;
  const includeGifts = !(input && input.includeGifts === false);
  const gifts = includeGifts
    ? stage4GiftChoices(model, npcId, { ignoreBusy: true })
    : [];
  const giftProbeId = includeGifts
    ? (gifts[0] && gifts[0].itemId) || null
    : stage4FirstOwnedItemId(model);
  const listDeps = {
    Inventory: stage2Bootstrap.Inventory,
    SocialInteractionContent: stage4Bootstrap.SocialInteractionContent,
    WorldMonth: stage4Bootstrap.WorldMonth,
    ignorePersonLock: true
  };
  const interactions = stage4Bootstrap.SocialInteractionContent.list()
    .filter(function (entry) {
      if (entry.id === 'gift') {
        if (!giftProbeId) return false;
        // 用占位物品只跑同地/状态等门槛；真正选礼在详情里。
        return stage4Bootstrap.Social.isAvailable(
          model,
          npcId,
          'gift',
          giftProbeId,
          listDeps
        ).ok;
      }
      return stage4Bootstrap.Social.isAvailable(
        model,
        npcId,
        entry.id,
        null,
        listDeps
      ).ok;
    }).map(function (entry) {
      return {
        id: entry.id,
        label: entry.label.replace('某人', person.identity.name),
        durationSeconds: entry.durationSeconds,
        rewards: {
          charmXp: entry.rewards.charmXp,
          cultivation: entry.rewards.cultivation
        },
        requiresGift: entry.id === 'gift',
        requiredAffection: Number.isFinite(entry.requiredAffection)
          ? entry.requiredAffection
          : 0
      };
    });
  const parallelJobs = model.systems &&
    model.systems.parallel &&
    Array.isArray(model.systems.parallel.jobs)
    ? model.systems.parallel.jobs
    : [];
  const parallel = parallelJobs.filter(function (job) {
    return job && job.kind === 'social' && job.npcId === npcId;
  }).map(function (job) {
    return {
      id: job.id,
      label: job.label,
      remainingSeconds: job.remainingSeconds,
      totalSeconds: job.totalSeconds,
      progress: job.totalSeconds > 0
        ? Math.max(0, Math.min(
          1,
          1 - job.remainingSeconds / job.totalSeconds
        ))
        : 1,
      ready: job.ready === true
    };
  });
  const personBusy = parallel.some(function (job) {
    return job.ready !== true;
  });
  return Object.freeze({
    npcId,
    npcName: person.identity.name,
    sameRegion: stage4Bootstrap.WorldMonth &&
      typeof stage4Bootstrap.WorldMonth.sameRegion === 'function'
      ? stage4Bootstrap.WorldMonth.sameRegion(model, npcId)
      : true,
    playerRegion: stage4PlayerRegion(model),
    // 社交走并行队列，不再占用主行动。
    mainSlotBusy: false,
    personBusy: personBusy,
    current: null,
    gifts,
    interactions: interactions,
    parallel
  });
}

function stage4SpiritualRootName(rootId) {
  if (!rootId || !stage4Bootstrap.NpcGenerationContent ||
      typeof stage4Bootstrap.NpcGenerationContent.getSpiritualRoot !==
        'function') {
    return rootId || '未知灵根';
  }
  const root = stage4Bootstrap.NpcGenerationContent.getSpiritualRoot(rootId);
  return root && root.name ? root.name : (rootId || '未知灵根');
}

function stage4StackLabel(stackId) {
  return ({
    yaocai: '药材',
    lingkuang: '灵矿',
    muliao: '木料',
    shicai: '食材',
    faqi: '法器',
    hujia: '护甲',
    shanshi: '膳食',
    fu: '符箓',
    caiqing: '才情',
    tupo: '筑基丹',
    heal: '疗伤丹'
  })[stackId] || stackId;
}

function stage4SectOfficeGroups(model, sectId, record) {
  const content = stage4Bootstrap.SectOfficeContent;
  if (!content || typeof content.sortedSlots !== 'function') {
    return [];
  }
  const holders = record && record.officeHolders
    ? record.officeHolders
    : {};
  return content.sortedSlots(sectId).map(function (slot) {
    const ids = Array.isArray(holders[slot.id]) ? holders[slot.id] : [];
    const members = ids.map(function (npcId) {
      const person = stage4Person(model, npcId);
      return {
        npcId: npcId,
        name: person && person.identity
          ? person.identity.name
          : '一位修士',
        realm: REALM_TABLE[person && person.realmStage]
          ? REALM_TABLE[person.realmStage].name
          : '未知境界'
      };
    }).filter(function (row) {
      return !!row.npcId;
    });
    return {
      slotId: slot.id,
      rank: slot.rank,
      title: slot.title,
      pool: slot.pool === true,
      members: members,
      count: members.length
    };
  });
}

function querySects() {
  const model = stage4Model();
  if (!model) return readonlyQuery({ wandering: true, sects: [] });
  if (!model.systems || !model.systems.sects || !model.systems.sects.records ||
      !model.systems.sects.player) {
    return readonlyQuery({ wandering: true, sects: [] });
  }
  const player = model.systems.sects.player;
  const current = stage4Sect(player.sectId);
  const nowSeconds = Date.now() / 1000;
  const onCooldown = Number.isFinite(player.choiceAvailableAt) &&
    player.choiceAvailableAt > nowSeconds &&
    !current;
  const rootId = model.player && model.player.spiritualRootId;
  const missionsApi = stage4Bootstrap.SectMissions;
  let joinedView = null;
  if (current && missionsApi &&
      typeof missionsApi.buildMissionView === 'function') {
    const pavilionContent = stage4Bootstrap.SectPavilionContent;
    const rankId = player.discipleRank || 'disciple';
    const rankRow = pavilionContent &&
      typeof pavilionContent.getRank === 'function'
      ? pavilionContent.getRank(rankId)
      : null;
    joinedView = {
      id: current.id,
      name: current.name,
      description: current.description,
      traits: current.traits.slice(),
      favoredResources: current.favoredResources.slice(),
      contribution: player.contribution[current.id] || 0,
      playerReputation: player.reputation[current.id] || 0,
      discipleRank: rankId,
      discipleRankLabel: rankRow && rankRow.label
        ? rankRow.label
        : '弟子',
      // 藏宝阁/成员架构仅弹窗按需查询，避免每帧重建大对象。
      missions: missionsApi.buildMissionView(
        model,
        current.id,
        {
          missions: stage4Bootstrap.SectMissionContent,
          combat: stage3Bootstrap.CombatContent
        },
        { nowSeconds: function () { return nowSeconds; } }
      )
    };
  }
  // 已入宗时浏览列表无用；未入宗才构建，避免每帧扫五宗门槛。
  const sects = current
    ? []
    : stage4Bootstrap.SectContent.list().map(function (definition) {
      const record = model.systems.sects.records[definition.id];
      const gate = missionsApi &&
        typeof missionsApi.evaluateJoinRequirements === 'function'
        ? missionsApi.evaluateJoinRequirements(definition, model.player)
        : { requirements: [], met: true };
      const canAttempt = !onCooldown;
      return {
        id: definition.id,
        name: definition.name,
        description: definition.description,
        traits: definition.traits.slice(),
        favoredResources: definition.favoredResources.slice(),
        power: record ? record.power : 1,
        reputation: record ? record.reputation : 0,
        joined: false,
        canAttemptJoin: canAttempt,
        canJoin: canAttempt && gate.met,
        requirementsMet: gate.met,
        requirements: gate.requirements.map(function (row) {
          return {
            label: row.label,
            ok: row.ok,
            current: row.current,
            required: row.required
          };
        })
      };
    });
  const cooldownSeconds = onCooldown
    ? Math.max(0, Math.ceil((Number(player.choiceAvailableAt) || 0) - nowSeconds))
    : 0;
  const leaveCooldownSeconds = stage4Bootstrap.SectSimulation &&
    Number.isFinite(Number(stage4Bootstrap.SectSimulation.LEAVE_COOLDOWN_SECONDS))
    ? Math.max(0, Math.floor(Number(stage4Bootstrap.SectSimulation.LEAVE_COOLDOWN_SECONDS)))
    : 0;
  return readonlyQuery({
    wandering: !current,
    currentSectId: current ? current.id : null,
    currentSectName: current ? current.name : '散修',
    choiceUnlocked: true,
    choiceOnCooldown: onCooldown,
    choiceAvailableAt: Number(player.choiceAvailableAt) || 0,
    choiceCooldownSeconds: cooldownSeconds,
    choiceCooldownLabel: formatSectCooldownLabel(cooldownSeconds),
    leaveCooldownSeconds: leaveCooldownSeconds,
    leaveCooldownLabel: formatSectCooldownLabel(leaveCooldownSeconds),
    canLeave: !!current,
    spiritualRootId: rootId || null,
    spiritualRootName: stage4SpiritualRootName(rootId),
    joined: joinedView,
    sects: sects
  });
}

function formatSectCooldownLabel(seconds) {
  const value = Math.max(0, Math.floor(Number(seconds) || 0));
  if (value <= 0) return '';
  const days = Math.floor(value / 86400);
  const hours = Math.floor((value % 86400) / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  if (days > 0) {
    return hours > 0 ? (days + ' 天 ' + hours + ' 小时') : (days + ' 天');
  }
  if (hours > 0) {
    return minutes > 0 ? (hours + ' 小时 ' + minutes + ' 分') : (hours + ' 小时');
  }
  if (minutes > 0) return minutes + ' 分钟';
  return value + ' 秒';
}

function enrichSectPavilionView(view) {
  if (!view || !view.available) return view;
  function labelFor(index) {
    const row = REALM_TABLE[Math.max(0, Math.floor(Number(index) || 0))];
    return row && row.name ? row.name : ('境界' + index);
  }
  (view.offers || []).forEach(function (offer) {
    offer.realmLabel = labelFor(offer.requiredRealmIndex);
  });
  (view.offerGroups || []).forEach(function (group) {
    group.realmLabel = labelFor(group.requiredRealmIndex);
    (group.offers || []).forEach(function (offer) {
      offer.realmLabel = labelFor(offer.requiredRealmIndex);
    });
  });
  return view;
}

function querySectPavilion() {
  const model = stage4Model();
  if (!model || !stage4Bootstrap.SectPavilion ||
      typeof stage4Bootstrap.SectPavilion.buildPavilionView !== 'function') {
    return readonlyQuery({ available: false, offers: [], offerGroups: [] });
  }
  return readonlyQuery(
    enrichSectPavilionView(
      stage4Bootstrap.SectPavilion.buildPavilionView(model, {
        pavilion: stage4Bootstrap.SectPavilionContent,
        techniques: stage3Bootstrap.TechniqueContent
      })
    )
  );
}

function querySect(input) {
  const model = stage4Model();
  if (!model || !model.systems || !model.systems.sects ||
      !model.systems.sects.records || !model.systems.sects.player ||
      !model.systems.npcs || !model.systems.npcs.records) {
    return readonlyQuery(null);
  }
  const sectId = input && typeof input.sectId === 'string'
    ? input.sectId
    : null;
  const definition = stage4Sect(sectId);
  const record = model.systems.sects.records[sectId];
  if (!definition || !record) return readonlyQuery(null);
  const members = Object.keys(model.systems.npcs.records).filter(
    function (npcId) {
      return model.systems.npcs.records[npcId].sectId === sectId &&
        model.systems.npcs.records[npcId].status === 'living';
    }
  );
  const leader = stage4Person(model, record.leaderId);
  const player = model.systems.sects.player;
  const pairStates = model.systems.sects.pairStates;
  const stanceCounts = {
    allied: 0,
    neutral: 0,
    competitive: 0,
    hostile: 0
  };
  Object.keys(pairStates).forEach(function (key) {
    if (key.split('|').indexOf(sectId) < 0) return;
    const stance = pairStates[key] && pairStates[key].state;
    if (Object.prototype.hasOwnProperty.call(stanceCounts, stance)) {
      stanceCounts[stance]++;
    }
  });
  const missionsApi = stage4Bootstrap.SectMissions;
  const gate = missionsApi &&
    typeof missionsApi.evaluateJoinRequirements === 'function'
    ? missionsApi.evaluateJoinRequirements(definition, model.player)
    : { requirements: [], met: true };
  return readonlyQuery({
    id: sectId,
    name: definition.name,
    description: definition.description,
    traits: definition.traits.slice(),
    favoredResources: definition.favoredResources.slice(),
    bonuses: definition.bonuses.slice(),
    power: record.power,
    reputation: record.reputation,
    memberCount: members.length,
    leader: leader ? {
      npcId: leader.id,
      name: leader.identity.name
    } : null,
    stanceCounts,
    joined: player.sectId === sectId,
    contribution: player.contribution[sectId] || 0,
    playerReputation: player.reputation[sectId] || 0,
    requirementsMet: gate.met,
    requirements: gate.requirements.map(function (row) {
      return {
        label: row.label,
        ok: row.ok,
        current: row.current,
        required: row.required
      };
    }),
    offices: stage4SectOfficeGroups(model, sectId, record),
    missions: missionsApi &&
      typeof missionsApi.buildMissionView === 'function' &&
      player.sectId === sectId
      ? missionsApi.buildMissionView(
        model,
        sectId,
        {
          missions: stage4Bootstrap.SectMissionContent,
          combat: stage3Bootstrap.CombatContent
        },
        { nowSeconds: function () { return Date.now() / 1000; } }
      )
      : { offers: [], active: null, needsRefresh: false, nextRefreshIn: 0 }
  });
}

function queryWorld(input) {
  const model = stage4Model();
  if (!model) {
    return readonlyQuery({
      scope: 'all',
      regions: [],
      people: [],
      sects: [],
      families: [],
      recent: [],
      nextCursor: null,
      playerRegion: null,
      selectedRegion: null
    });
  }
  if (!model.systems || !model.systems.npcs || !model.systems.npcs.records ||
      !model.systems.sects || !model.systems.sects.records) {
    return readonlyQuery({
      scope: 'all',
      regions: [],
      people: [],
      sects: [],
      families: [],
      recent: [],
      nextCursor: null,
      playerRegion: null,
      selectedRegion: null
    });
  }
  const requested = input && typeof input === 'object' ? input : {};
  const playerRegion = stage4PlayerRegion(model);
  const regionId = stage4Region(requested.regionId)
    ? requested.regionId
    : model.player.regionId;
  const records = model.systems.npcs.records;
  const allLiving = Object.keys(records).filter(function (npcId) {
    return records[npcId].status === 'living';
  });
  const regionPeopleIds = allLiving.filter(function (npcId) {
    return records[npcId].regionId === regionId;
  });
  const families = {};
  regionPeopleIds.forEach(function (npcId) {
    const familyId = records[npcId].familyId || '无家族记载';
    if (!families[familyId]) {
      families[familyId] = { id: familyId, count: 0, names: [] };
    }
    families[familyId].count++;
    if (families[familyId].names.length < 3) {
      families[familyId].names.push(records[npcId].identity.name);
    }
  });
  const recentMetas = stage4ChronicleMetas(model);
  const page = stage4Paged(recentMetas, requested.cursor, 20);
  page.items = page.items.map(function (meta) {
    return stage4ElaborateChronicleMeta(model, meta);
  });
  const peopleCountByRegion = Object.create(null);
  for (let i = 0; i < allLiving.length; i++) {
    const livingRegionId = records[allLiving[i]].regionId;
    peopleCountByRegion[livingRegionId] =
      (peopleCountByRegion[livingRegionId] || 0) + 1;
  }
  const regions = stage4Bootstrap.RegionContent.list().map(function (region) {
    const travel = stage4Bootstrap.WorldMonth &&
      typeof stage4Bootstrap.WorldMonth.estimatePlayerTravel === 'function'
      ? stage4Bootstrap.WorldMonth.estimatePlayerTravel(model, region.id)
      : null;
    return {
      id: region.id,
      name: region.name,
      type: region.type,
      description: region.description,
      peopleCount: peopleCountByRegion[region.id] || 0,
      isHere: !!(playerRegion && playerRegion.id === region.id),
      travel: travel && travel.ok
        ? {
          alreadyThere: !!travel.alreadyThere,
          far: !!travel.far,
          months: travel.months || 0,
          nearDays: travel.nearDays || 0,
          durationLabel: travel.durationLabel || '',
          fromName: travel.fromName || '',
          toName: travel.toName || region.name
        }
        : null
    };
  });
  const selectedRegion = regions.find(function (region) {
    return region.id === regionId;
  }) || null;
  const people = regionPeopleIds.map(function (npcId) {
    return stage4PersonRow(model, npcId);
  }).filter(Boolean).sort(function (left, right) {
    return right.affection - left.affection ||
      left.name.localeCompare(right.name);
  });
  return readonlyQuery({
    scope: 'all',
    regionId,
    playerRegion: playerRegion
      ? {
        id: playerRegion.id,
        name: playerRegion.name,
        description: playerRegion.description || ''
      }
      : null,
    selectedRegion,
    filters: {
      scopes: [],
      regions: regions.map(function (region) {
        return { id: region.id, name: region.name };
      })
    },
    regions,
    people,
    sects: stage4Bootstrap.SectContent.list().map(function (definition) {
      const record = model.systems.sects.records[definition.id];
      return {
        id: definition.id,
        name: definition.name,
        power: record.power,
        reputation: record.reputation
      };
    }),
    families: Object.keys(families).sort().map(function (familyId) {
      return families[familyId];
    }),
    recent: page.items,
    nextCursor: page.nextCursor
  });
}