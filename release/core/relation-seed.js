(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports
    ? factory(
      require('./random.js'),
      require('../content/npc-generation.js')
    )
    : factory(
      root && root.GameRandom,
      root && root.NpcGenerationContent
    );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.RelationSeed = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  GameRandom,
  NpcGenerationContent
) {
  'use strict';

  function isRecord(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function own(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  }

  function validSeed(value) {
    return Number.isInteger(value) && value > 0 && value <= 0xFFFFFFFF;
  }

  function draw(rngState) {
    const next = GameRandom && typeof GameRandom.next === 'function'
      ? GameRandom.next(rngState)
      : null;
    if (!next || !validSeed(next.seed) ||
        typeof next.value !== 'number' ||
        !Number.isFinite(next.value)) {
      return { rngState: rngState, value: 0 };
    }
    return { rngState: next.seed, value: next.value };
  }

  function rollInt(rngState, min, max) {
    const low = Math.min(min, max);
    const high = Math.max(min, max);
    const rolled = draw(rngState);
    const span = high - low + 1;
    const value = low + Math.floor(rolled.value * span);
    return {
      rngState: rolled.rngState,
      value: value > high ? high : value
    };
  }

  function shuffle(list, rngState) {
    const next = list.slice();
    let seed = rngState;
    for (let index = next.length - 1; index > 0; index--) {
      const rolled = rollInt(seed, 0, index);
      seed = rolled.rngState;
      const swap = next[index];
      next[index] = next[rolled.value];
      next[rolled.value] = swap;
    }
    return { rngState: seed, value: next };
  }

  function pickWeighted(items, weightOf, rngState) {
    let total = 0;
    const weights = [];
    for (let index = 0; index < items.length; index++) {
      const weight = Math.max(0, Number(weightOf(items[index])) || 0);
      weights.push(weight);
      total += weight;
    }
    if (!items.length || total <= 0) {
      return { rngState: rngState, value: null };
    }
    const rolled = draw(rngState);
    let cursor = rolled.value * total;
    for (let index = 0; index < items.length; index++) {
      cursor -= weights[index];
      if (cursor < 0) {
        return { rngState: rolled.rngState, value: items[index] };
      }
    }
    return {
      rngState: rolled.rngState,
      value: items[items.length - 1]
    };
  }

  function pairKey(leftId, rightId) {
    return leftId < rightId
      ? leftId + '|' + rightId
      : rightId + '|' + leftId;
  }

  function affinityKey(sourceId, targetId) {
    return sourceId + '>' + targetId;
  }

  function defaultRules() {
    return (NpcGenerationContent &&
      NpcGenerationContent.RELATION_SEED_RULES) || null;
  }

  function ensureRelationships(model) {
    if (!isRecord(model.systems)) model.systems = {};
    if (!isRecord(model.systems.relationships)) {
      model.systems.relationships = {};
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

  function livingRecords(model) {
    const npcs = model && model.systems && model.systems.npcs;
    const records = npcs && isRecord(npcs.records) ? npcs.records : null;
    if (!records) return [];
    const list = [];
    Object.keys(records).forEach(function (id) {
      if (id === 'player' || id.indexOf('npc-') !== 0) return;
      const person = records[id];
      if (!isRecord(person) || person.status !== 'living') return;
      list.push({ id: id, person: person });
    });
    return list;
  }

  function hasStructurePair(rels, leftId, rightId) {
    const key = pairKey(leftId, rightId);
    if (own(rels.restrictions, key)) return true;
    const tags = rels.tags[key];
    if (!Array.isArray(tags) || !tags.length) return false;
    for (let index = 0; index < tags.length; index++) {
      const tag = tags[index];
      if (tag === 'blood' || tag === 'mentor' || tag === 'partner' ||
          tag === 'lover' || tag === 'dao-companion') {
        return true;
      }
    }
    return false;
  }

  function addTags(rels, leftId, rightId, extra) {
    const key = pairKey(leftId, rightId);
    const current = Array.isArray(rels.tags[key]) ? rels.tags[key].slice() : [];
    const seen = {};
    current.forEach(function (tag) { seen[tag] = true; });
    (extra || []).forEach(function (tag) {
      if (!tag || seen[tag]) return;
      seen[tag] = true;
      current.push(tag);
    });
    rels.tags[key] = current;
  }

  function bumpKinEdge(rels, sourceId, targetId, amount) {
    // 8 维仅玩家↔NPC；NPC↔NPC 只用 affinity。
    if (sourceId !== 'player' && targetId !== 'player') return;
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
    edge.romanticAttachment = 0;
    edge.desire = 0;
    edge.jealousy = 0;
    rels.edges[key] = edge;
  }

  function setAffinity(rels, leftId, rightId, amount) {
    const value = Math.max(-100, Math.min(100, amount | 0));
    // 玩家↔NPC：写入 8 维 affection，不占 npcAffinities。
    if (leftId === 'player' || rightId === 'player') {
      if (value !== 0) {
        bumpKinEdge(rels, leftId, rightId, value);
        bumpKinEdge(rels, rightId, leftId, Math.max(0, value - 2));
      }
      return;
    }
    if (value === 0) {
      delete rels.npcAffinities[affinityKey(leftId, rightId)];
      delete rels.npcAffinities[affinityKey(rightId, leftId)];
      return;
    }
    rels.npcAffinities[affinityKey(leftId, rightId)] = value;
    rels.npcAffinities[affinityKey(rightId, leftId)] = value;
  }

  function linkBlood(rels, parentId, childId, affinity) {
    addTags(rels, parentId, childId, ['blood', 'acquainted']);
    rels.restrictions[pairKey(parentId, childId)] = 'blood';
    // setAffinity：NPC↔NPC 写单维好感；含玩家则写 8 维。
    setAffinity(rels, parentId, childId, affinity);
  }

  function linkMentor(rels, mentorId, discipleId, affinity) {
    addTags(rels, mentorId, discipleId, ['mentor', 'acquainted']);
    setAffinity(rels, mentorId, discipleId, affinity);
  }

  function linkDaoCompanion(rels, leftId, rightId, affinity) {
    const key = pairKey(leftId, rightId);
    addTags(rels, leftId, rightId, [
      'lover',
      'partner',
      'acquainted',
      'friend'
    ]);
    rels.bonds[key] = {
      stage: 'partner',
      changedByEventId: null,
      changedAt: 0
    };
    rels.arcs[key] = {
      stage: 'bond',
      lastEventMonth: 0,
      lastChronicleMonth: 0,
      eventCount: 1,
      romanceBeat: 'bonded'
    };
    setAffinity(rels, leftId, rightId, affinity);
  }

  function groupBy(list, keyOf) {
    const map = {};
    list.forEach(function (row) {
      const key = keyOf(row);
      if (!key) return;
      if (!own(map, key)) map[key] = [];
      map[key].push(row);
    });
    return map;
  }

  function occupiedAsPartner(rels, npcId) {
    const tags = rels.tags;
    const keys = Object.keys(tags);
    for (let index = 0; index < keys.length; index++) {
      const key = keys[index];
      const parts = key.split('|');
      if (parts.length !== 2) continue;
      if (parts[0] !== npcId && parts[1] !== npcId) continue;
      const list = tags[key];
      if (!Array.isArray(list)) continue;
      if (list.indexOf('partner') >= 0 || list.indexOf('dao-companion') >= 0) {
        return true;
      }
    }
    return false;
  }

  function seedBloodClusters(people, rels, rules, rngState) {
    const blood = rules.blood;
    let seed = rngState;
    const byFamily = groupBy(people, function (row) {
      return row.person.familyId || null;
    });
    const familyIds = Object.keys(byFamily);
    const shuffledFamilies = shuffle(familyIds, seed);
    seed = shuffledFamilies.rngState;
    const countRoll = rollInt(
      seed,
      blood.clusterCount.min,
      blood.clusterCount.max
    );
    seed = countRoll.rngState;
    let made = 0;
    const familyUses = {};

    for (let f = 0; f < shuffledFamilies.value.length &&
        made < countRoll.value; f++) {
      const familyId = shuffledFamilies.value[f];
      const uses = familyUses[familyId] || 0;
      if (uses >= blood.maxClustersPerFamily) continue;
      const members = byFamily[familyId];
      if (!members || members.length < 2) continue;

      const parents = members.filter(function (row) {
        return (row.person.ageYears | 0) >= blood.minParentAge;
      });
      if (!parents.length) continue;

      const parentShuffle = shuffle(parents, seed);
      seed = parentShuffle.rngState;
      let primary = null;
      let secondary = null;
      for (let p = 0; p < parentShuffle.value.length; p++) {
        const candidate = parentShuffle.value[p];
        const children = members.filter(function (row) {
          if (row.id === candidate.id) return false;
          const gap = (candidate.person.ageYears | 0) -
            (row.person.ageYears | 0);
          if (gap < blood.minAgeGap) return false;
          if ((candidate.person.realmStage | 0) + 1 <
              (row.person.realmStage | 0)) {
            return false;
          }
          const existing = Array.isArray(row.person.parentIds)
            ? row.person.parentIds
            : [];
          return existing.length < 2;
        });
        if (!children.length) continue;
        primary = candidate;
        const singleRoll = draw(seed);
        seed = singleRoll.rngState;
        if (singleRoll.value >= blood.singleParentChance) {
          for (let q = 0; q < parentShuffle.value.length; q++) {
            const other = parentShuffle.value[q];
            if (other.id === primary.id) continue;
            const ageGap = Math.abs(
              (primary.person.ageYears | 0) - (other.person.ageYears | 0)
            );
            if (ageGap > blood.maxParentAgeGap) continue;
            if (hasStructurePair(rels, primary.id, other.id)) continue;
            secondary = other;
            break;
          }
        }
        const childPool = children.filter(function (row) {
          if (!secondary) return true;
          const gap = (secondary.person.ageYears | 0) -
            (row.person.ageYears | 0);
          if (gap < blood.minAgeGap) return false;
          if ((secondary.person.realmStage | 0) + 1 <
              (row.person.realmStage | 0)) {
            return false;
          }
          return true;
        });
        if (!childPool.length) {
          primary = null;
          secondary = null;
          continue;
        }
        const childCountRoll = rollInt(
          seed,
          blood.childrenPerCluster.min,
          blood.childrenPerCluster.max
        );
        seed = childCountRoll.rngState;
        const childShuffle = shuffle(childPool, seed);
        seed = childShuffle.rngState;
        const chosen = childShuffle.value.slice(0, childCountRoll.value);
        if (!chosen.length) continue;

        chosen.forEach(function (child) {
          const parentIds = Array.isArray(child.person.parentIds)
            ? child.person.parentIds.slice()
            : [];
          if (parentIds.indexOf(primary.id) < 0) parentIds.push(primary.id);
          if (secondary && parentIds.indexOf(secondary.id) < 0) {
            parentIds.push(secondary.id);
          }
          child.person.parentIds = parentIds.slice(0, 2);
          linkBlood(rels, primary.id, child.id, blood.affinity);
          if (secondary) {
            linkBlood(rels, secondary.id, child.id, blood.affinity);
          }
        });
        for (let i = 0; i < chosen.length; i++) {
          for (let j = i + 1; j < chosen.length; j++) {
            if (!hasStructurePair(rels, chosen[i].id, chosen[j].id)) {
              linkBlood(rels, chosen[i].id, chosen[j].id, blood.affinity);
            }
          }
        }
        if (secondary && !hasStructurePair(rels, primary.id, secondary.id)) {
          // 双亲彼此不是血缘；留给道侣种子或保持普通相识。
          addTags(rels, primary.id, secondary.id, ['acquainted']);
          setAffinity(rels, primary.id, secondary.id, Math.max(
            20,
            Math.floor(blood.affinity * 0.7)
          ));
        }
        familyUses[familyId] = uses + 1;
        made += 1;
        break;
      }
    }
    return { rngState: seed, count: made };
  }

  function seedMentorLinks(people, rels, rules, rngState) {
    const mentorRules = rules.mentor;
    let seed = rngState;
    const bySect = groupBy(people, function (row) {
      return row.person.sectId || null;
    });
    const mentors = people.filter(function (row) {
      if (mentorRules.requireSect && !row.person.sectId) return false;
      return (row.person.realmStage | 0) >= mentorRules.minMentorRealm;
    });
    const mentorShuffle = shuffle(mentors, seed);
    seed = mentorShuffle.rngState;
    const pairRoll = rollInt(
      seed,
      mentorRules.pairCount.min,
      mentorRules.pairCount.max
    );
    seed = pairRoll.rngState;
    let made = 0;

    for (let m = 0; m < mentorShuffle.value.length &&
        made < pairRoll.value; m++) {
      const mentor = mentorShuffle.value[m];
      const pool = (bySect[mentor.person.sectId] || []).filter(function (row) {
        if (row.id === mentor.id) return false;
        if (row.person.mentorNpcId) return false;
        if ((mentor.person.realmStage | 0) -
            (row.person.realmStage | 0) < mentorRules.minRealmGap) {
          return false;
        }
        if (hasStructurePair(rels, mentor.id, row.id)) return false;
        const parentIds = Array.isArray(row.person.parentIds)
          ? row.person.parentIds
          : [];
        if (parentIds.indexOf(mentor.id) >= 0) return false;
        return true;
      });
      if (!pool.length) continue;
      const ranked = pool.map(function (row) {
        const ageGap = (mentor.person.ageYears | 0) -
          (row.person.ageYears | 0);
        let weight = 1 + Math.max(
          0,
          (mentor.person.realmStage | 0) - (row.person.realmStage | 0)
        );
        if (ageGap >= mentorRules.softMinAgeGap) weight += 2;
        return { row: row, weight: weight };
      });
      const discipleCountRoll = rollInt(
        seed,
        mentorRules.disciplesPerMentor.min,
        mentorRules.disciplesPerMentor.max
      );
      seed = discipleCountRoll.rngState;
      let local = 0;
      const remaining = ranked.slice();
      while (remaining.length && local < discipleCountRoll.value &&
          made < pairRoll.value) {
        const picked = pickWeighted(remaining, function (item) {
          return item.weight;
        }, seed);
        seed = picked.rngState;
        if (!picked.value) break;
        const disciple = picked.value.row;
        remaining.splice(remaining.indexOf(picked.value), 1);
        if (hasStructurePair(rels, mentor.id, disciple.id)) continue;
        disciple.person.mentorNpcId = mentor.id;
        linkMentor(rels, mentor.id, disciple.id, mentorRules.affinity);
        made += 1;
        local += 1;
      }
    }
    return { rngState: seed, count: made };
  }

  function companionWeight(left, right, rules) {
    let weight = 1;
    if (left.person.sectId && left.person.sectId === right.person.sectId) {
      weight *= rules.daoCompanion.sameSectWeight;
    }
    if (left.person.regionId &&
        left.person.regionId === right.person.regionId) {
      weight *= rules.daoCompanion.sameRegionWeight;
    }
    return weight;
  }

  function seedDaoCompanionPairs(people, rels, rules, rngState) {
    const companion = rules.daoCompanion;
    let seed = rngState;
    const adults = people.filter(function (row) {
      return (row.person.ageYears | 0) >= companion.minAge &&
        !occupiedAsPartner(rels, row.id);
    });
    const pairRoll = rollInt(
      seed,
      companion.pairCount.min,
      companion.pairCount.max
    );
    seed = pairRoll.rngState;
    let made = 0;
    const used = {};

    while (made < pairRoll.value) {
      const free = adults.filter(function (row) {
        return !used[row.id] && !occupiedAsPartner(rels, row.id);
      });
      if (free.length < 2) break;
      const leftPick = pickWeighted(free, function () { return 1; }, seed);
      seed = leftPick.rngState;
      const left = leftPick.value;
      if (!left) break;
      const candidates = free.filter(function (row) {
        if (row.id === left.id) return false;
        if (hasStructurePair(rels, left.id, row.id)) return false;
        const ageGap = Math.abs(
          (left.person.ageYears | 0) - (row.person.ageYears | 0)
        );
        if (ageGap > companion.maxAgeGap) return false;
        const realmGap = Math.abs(
          (left.person.realmStage | 0) - (row.person.realmStage | 0)
        );
        if (realmGap > companion.maxRealmGap) return false;
        return true;
      });
      if (!candidates.length) {
        used[left.id] = true;
        continue;
      }
      const rightPick = pickWeighted(candidates, function (row) {
        return companionWeight(left, row, rules);
      }, seed);
      seed = rightPick.rngState;
      const right = rightPick.value;
      if (!right) {
        used[left.id] = true;
        continue;
      }
      linkDaoCompanion(rels, left.id, right.id, companion.affinity);
      used[left.id] = true;
      used[right.id] = true;
      made += 1;
    }
    return { rngState: seed, count: made };
  }

  function countPlayerCircle(model) {
    const rels = isRecord(model.systems) ? model.systems.relationships : null;
    const seen = {};
    let count = 0;
    function add(id) {
      if (!id || id === 'player' || seen[id]) return;
      seen[id] = true;
      count += 1;
    }
    if (rels && isRecord(rels.edges)) {
      Object.keys(rels.edges).forEach(function (key) {
        const sep = key.indexOf('>');
        if (sep < 0) return;
        const a = key.slice(0, sep);
        const b = key.slice(sep + 1);
        if (a === 'player') add(b);
        else if (b === 'player') add(a);
      });
    }
    if (rels && isRecord(rels.bonds)) {
      Object.keys(rels.bonds).forEach(function (key) {
        const sep = key.indexOf('|');
        if (sep < 0) return;
        const a = key.slice(0, sep);
        const b = key.slice(sep + 1);
        if (a === 'player') add(b);
        else if (b === 'player') add(a);
      });
    }
    const records = model.systems && model.systems.npcs &&
      model.systems.npcs.records;
    if (isRecord(records)) {
      Object.keys(records).forEach(function (id) {
        if (records[id] && records[id].metPlayer === true) add(id);
      });
    }
    return count;
  }

  // 开局/转世后玩家圈子为空时，种一批同城初识，否则大事记永远刷不出事件。
  function seedPlayerStarterCircle(model, options) {
    if (!isRecord(model) || !isRecord(model.systems)) return model;
    const opts = options || {};
    const onlyIfEmpty = opts.onlyIfEmpty !== false;
    if (onlyIfEmpty && countPlayerCircle(model) > 0) return model;
    const records = model.systems.npcs && model.systems.npcs.records;
    if (!isRecord(records)) return model;
    const regionId = model.player && typeof model.player.regionId === 'string'
      ? model.player.regionId
      : 'qinglan-town';
    const want = Math.max(3, Math.min(8, opts.count | 0 || 5));
    const pool = Object.keys(records).filter(function (id) {
      const person = records[id];
      if (!person || person.status !== 'living') return false;
      if (person.lifeStage === 'child') return false;
      return (person.regionId || 'qinglan-town') === regionId;
    });
    if (!pool.length) return model;
    let rngState = validSeed(model.rngState)
      ? model.rngState
      : (GameRandom && GameRandom.DEFAULT_SEED) || 0x6D2B79F5;
    // 轻量洗牌，避免总是固定前几个 id。
    for (let i = pool.length - 1; i > 0; i--) {
      const rolled = draw(rngState);
      rngState = rolled.rngState;
      const j = Math.floor(rolled.value * (i + 1));
      const tmp = pool[i];
      pool[i] = pool[j];
      pool[j] = tmp;
    }
    const rels = ensureRelationships(model);
    const pick = pool.slice(0, Math.min(want, pool.length));
    pick.forEach(function (npcId) {
      const person = records[npcId];
      person.metPlayer = true;
      addTags(rels, 'player', npcId, ['acquainted']);
      bumpKinEdge(rels, 'player', npcId, 18);
      bumpKinEdge(rels, npcId, 'player', 16);
      setAffinity(rels, 'player', npcId, 12);
    });
    model.rngState = rngState;
    return model;
  }

  function seed(model, options) {
    if (!isRecord(model) || !isRecord(model.systems)) return model;
    const people = livingRecords(model);
    if (people.length < 4) return model;
    const rules = (options && options.rules) || defaultRules();
    if (!isRecord(rules) ||
        !isRecord(rules.blood) ||
        !isRecord(rules.mentor) ||
        !isRecord(rules.daoCompanion)) {
      return model;
    }
    const rels = ensureRelationships(model);
    let rngState = validSeed(model.rngState)
      ? model.rngState
      : (GameRandom && GameRandom.DEFAULT_SEED) || 0x6D2B79F5;

    const blood = seedBloodClusters(people, rels, rules, rngState);
    rngState = blood.rngState;
    const mentors = seedMentorLinks(people, rels, rules, rngState);
    rngState = mentors.rngState;
    const companions = seedDaoCompanionPairs(people, rels, rules, rngState);
    rngState = companions.rngState;
    model.rngState = rngState;
    return seedPlayerStarterCircle(model, { onlyIfEmpty: true });
  }

  return Object.freeze({
    seed: seed,
    seedPlayerStarterCircle: seedPlayerStarterCircle,
    countPlayerCircle: countPlayerCircle,
    pairKey: pairKey
  });
});
