'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { isDeepStrictEqual } = require('node:util');

let pass = 0;
let fail = 0;

function ok(condition, message) {
  if (condition) pass++;
  else {
    fail++;
    console.error('  ✗ FAIL: ' + message);
  }
}

function exact(actual, expected, message) {
  ok(isDeepStrictEqual(actual, expected), message);
}

function frozenTree(value, seen) {
  if (!value || typeof value !== 'object') return true;
  seen = seen || new Set();
  if (seen.has(value)) return true;
  seen.add(value);
  return Object.isFrozen(value)
    && Object.keys(value).every(function (key) {
      return frozenTree(value[key], seen);
    });
}

function load(modulePath, label) {
  try {
    return require(modulePath);
  } catch (error) {
    ok(false, label + ' loads through CommonJS: ' + error.code);
    return null;
  }
}

function walk(value, visit, seen) {
  if (!value || typeof value !== 'object') return;
  seen = seen || new Set();
  if (seen.has(value)) return;
  seen.add(value);
  Object.keys(value).forEach(function (key) {
    visit(key, value[key]);
    walk(value[key], visit, seen);
  });
}

function allStrings(value) {
  const strings = [];
  walk(value, function (_key, entry) {
    if (typeof entry === 'string') strings.push(entry);
  });
  return strings;
}

const Regions = load('../content/regions.js', 'RegionContent');
const Sects = load('../content/sects.js', 'SectContent');
const NpcGeneration =
  load('../content/npc-generation.js', 'NpcGenerationContent');
const Dns = require('../core/dns.js');
const Social =
  load('../content/social-interactions.js', 'SocialInteractionContent');
const Skills = require('../content/life-skills.js');
const Techniques = require('../content/techniques.js');
const Realms = require('../content/realms.js');

if (Regions && Sects && NpcGeneration && Social) {
  const expectedRegionIds = [
    'qinglan-town',
    'yunzhou-city',
    'jade-market',
    'eastern-sect-heights',
    'western-sect-valley',
    'mistwood',
    'redstone-wilds',
    'mirror-realm'
  ];
  const expectedSectIds = [
    'taixuan-sword',
    'baicao-valley',
    'tiangong-pavilion',
    'spirit-beast-mountain',
    'qingyin-palace'
  ];
  const expectedSharedIds = [
    'talk',
    'gift',
    'accompany',
    'discussDao',
    'outing',
    'visit',
    'cultivateTogether'
  ];
  const expectedSpecificIds = [
    'taixuanSwordPractice',
    'taixuanForgeExchange',
    'baicaoHerbWalk',
    'baicaoAlchemyExchange',
    'tiangongArtifactStudy',
    'tiangongFormationDraft',
    'spiritBeastCare',
    'spiritFieldVisit',
    'qingyinTalismanExchange',
    'qingyinHeartMusic'
  ];
  const expectedPrincipleIds = [
    'exclusive',
    'devoted',
    'tolerant',
    'casual'
  ];

  exact(Regions.REGIONS.map(function (region) { return region.id; }),
    expectedRegionIds, 'eight abstract-region IDs are stable');
  ok(Regions.REGIONS.length === 8, 'exactly eight abstract regions');
  exact(Regions.REGIONS.map(function (region) { return region.type; }), [
    'town', 'town', 'market', 'sectBase',
    'sectBase', 'wilderness', 'wilderness', 'specialRealm'
  ], 'region types keep the required 2/1/2/2/1 distribution');

  const allowedRegionTypes =
    new Set(['town', 'market', 'sectBase', 'wilderness', 'specialRealm']);
  Regions.REGIONS.forEach(function (region) {
    ok(/^[A-Za-z0-9-]+$/.test(region.id),
      'region ID is ASCII: ' + region.id);
    ok(/[\u3400-\u9fff]/.test(region.name),
      'region display name is Chinese: ' + region.id);
    ok(allowedRegionTypes.has(region.type),
      'region type is allowed: ' + region.id);
    ok(Regions.get(region.id) === region,
      'region lookup returns canonical record: ' + region.id);
  });
  ok(Regions.get('missing') === null, 'unknown region lookup fails closed');
  ok(Object.isFrozen(Regions.list()), 'region list result is frozen');

  exact(Sects.SECTS.map(function (sect) { return sect.id; }),
    expectedSectIds, 'five fixed-sect IDs are stable');
  exact(Sects.SECTS.map(function (sect) { return sect.name; }), [
    '太玄剑宗', '百草谷', '天工阁', '灵兽山', '清音宫'
  ], 'five fixed sect identities match the product design');
  ok(Sects.SECTS.length === 5, 'exactly five fixed sects');
  Sects.SECTS.forEach(function (sect) {
    ok(/^[A-Za-z0-9-]+$/.test(sect.id),
      'sect ID is ASCII: ' + sect.id);
    ok(/[\u3400-\u9fff]/.test(sect.name),
      'sect display name is Chinese: ' + sect.id);
    ok(expectedRegionIds.includes(sect.homeRegionId),
      'sect home region exists: ' + sect.id);
    ok(sect.learningAccess === 'favored-not-exclusive',
      'sect bonuses favor but never permanently block content: ' + sect.id);
    ok(Array.isArray(sect.traits) && sect.traits.length >= 2,
      'sect has a distinct trait identity: ' + sect.id);
    sect.preferredPersonalityIds.forEach(function (personalityId) {
      ok(!!NpcGeneration.PERSONALITY_PROFILES.find(function (entry) {
        return entry.id === personalityId;
      }), 'sect personality preference exists: ' + sect.id + '/' + personalityId);
    });
    ok(Array.isArray(sect.bonuses) && sect.bonuses.length >= 2,
      'sect has at least two mechanical bonuses: ' + sect.id);
    sect.bonuses.forEach(function (bonus) {
      const validReference = bonus.kind === 'skill'
        ? !!Skills.SKILLS[bonus.targetId]
        : bonus.kind === 'technique'
          ? !!Techniques.TECHNIQUES[bonus.targetId]
          : false;
      ok(validReference,
        'sect bonus targets a Stage 2 skill or Stage 3 technique: ' +
          sect.id + '/' + bonus.targetId);
      ok(Number.isFinite(bonus.multiplier) && bonus.multiplier > 1,
        'sect bonus multiplier is a finite advantage: ' +
          sect.id + '/' + bonus.targetId);
    });
    ok(Sects.get(sect.id) === sect,
      'sect lookup returns canonical record: ' + sect.id);
  });
  ok(new Set(Sects.SECTS.map(function (sect) {
    return sect.bonuses.map(function (bonus) {
      return bonus.kind + ':' + bonus.targetId;
    }).join('|');
  })).size === 5, 'all five sects have mechanically distinct bonus sets');
  ok(Sects.get('missing') === null, 'unknown sect lookup fails closed');
  ok(Object.isFrozen(Sects.list()), 'sect list result is frozen');

  ok(NpcGeneration.SURNAMES.length >= 32,
    'NPC generation has at least thirty-two surnames');
  ok(NpcGeneration.GIVEN_NAME_COMPONENTS.length >= 48,
    'NPC generation has at least forty-eight given-name components');
  ok(NpcGeneration.APPEARANCE_FEATURES.length >= 18,
    'NPC generation has at least eighteen appearance features');
  ok(NpcGeneration.PERSONALITY_PROFILES.length >= 8,
    'NPC generation has at least eight personality profiles');
  ok(NpcGeneration.VALUE_PROFILES.length >= 8,
    'NPC generation has at least eight value profiles');
  ok(NpcGeneration.TALENTS.length >= 12,
    'NPC generation has at least twelve talents');
  ok(NpcGeneration.SPIRITUAL_ROOTS.length >= 8,
    'NPC generation has at least eight spiritual roots');
  ok(NpcGeneration.ROMANCE_PRINCIPLES.length === 4,
    'NPC generation has exactly four romance principles');
  exact(NpcGeneration.ROMANCE_PRINCIPLES.map(function (principle) {
    return principle.id;
  }), expectedPrincipleIds, 'romance-principle IDs are canonical and stable');
  exact(NpcGeneration.GENERATION_RULES, {
    bootstrapCount: 120,
    activeTarget: 40,
    familyCount: 16,
    sectMembershipChance: 0.70,
    baseLifespanYears: { min: 28, max: 56 }
  }, 'NPC bootstrap rules freeze the first playable population contract');
  ok(Array.isArray(NpcGeneration.REALM_WEIGHTS),
    'NPC generation exposes frozen realm weights');
  if (Array.isArray(NpcGeneration.REALM_WEIGHTS)) {
    exact(NpcGeneration.REALM_WEIGHTS.map(function (row) {
      return row.realmStage;
    }), Array.from({ length: 16 }, function (_unused, index) { return index; }),
    'Stage 4 realm generation covers living stages before ascension');
    let previousLifespanMultiplier = 0;
    NpcGeneration.REALM_WEIGHTS.forEach(function (row) {
      const realm = Object.values(Realms.REALMS).find(function (entry) {
        return entry.index === row.realmStage;
      });
      ok(!!realm && realm.id !== 'ascension',
        'realm weight references a pre-ascension Stage 3 realm: ' +
          row.realmStage);
      ok(Number.isSafeInteger(row.weight) && row.weight > 0,
        'realm generation weight is a positive integer: ' + row.realmStage);
      ok(Number.isFinite(row.lifespanMultiplier)
        && row.lifespanMultiplier > previousLifespanMultiplier,
      'higher realm has a strictly larger lifespan multiplier: ' +
        row.realmStage);
      previousLifespanMultiplier = row.lifespanMultiplier;
    });
  }
  [
    ['gender', NpcGeneration.GENDERS],
    ['personality', NpcGeneration.PERSONALITY_PROFILES],
    ['value profile', NpcGeneration.VALUE_PROFILES],
    ['talent', NpcGeneration.TALENTS],
    ['spiritual root', NpcGeneration.SPIRITUAL_ROOTS],
    ['romance principle', NpcGeneration.ROMANCE_PRINCIPLES]
  ].forEach(function (row) {
    row[1].forEach(function (entry) {
      ok(Number.isSafeInteger(entry.weight) && entry.weight > 0,
        row[0] + ' generation weight is a positive integer: ' + entry.id);
    });
  });

  NpcGeneration.SPIRITUAL_ROOTS.forEach(function (root, index) {
    ok(root.lgIndex === index && root.lgExp === Dns.lgExp[index],
      '灵根与原版 lg 档一致: ' + root.name);
  });
  ok(NpcGeneration.SPIRITUAL_ROOTS.map(function (r) { return r.name; })
    .join(',') ===
    '变异天灵根,天灵根,变异灵根,单灵根,双灵根,三灵根,四灵根,杂灵根',
    '灵根名称完全对齐原版 linggen0..7');
  ok(typeof NpcGeneration.cultivationEfficiencyFor === 'function',
    'NPC generation exposes cultivationEfficiencyFor');
  ok(NpcGeneration.cultivationEfficiencyFor(0, 'single', 0.5) > 0,
    'cultivationEfficiencyFor returns positive early-realm efficiency');
  ok(Array.isArray(NpcGeneration.DAO_HEART_TRAITS) &&
      NpcGeneration.DAO_HEART_TRAITS.length >= 8,
    'NPC generation exposes at least eight dao-heart traits');
  ok(typeof NpcGeneration.getDaoHeartTrait === 'function',
    'NPC generation exposes getDaoHeartTrait');
  ok(typeof NpcGeneration.daoHeartTraitNames === 'function',
    'NPC generation exposes daoHeartTraitNames');
  ok(typeof NpcGeneration.daoHeartTraitViews === 'function',
    'NPC generation exposes daoHeartTraitViews');
  NpcGeneration.DAO_HEART_TRAITS.forEach(function (trait) {
    ok(trait && trait.id && trait.name, 'dao-heart trait has id + name: ' +
      (trait && trait.id));
    ok(trait && trait.effects && typeof trait.effects === 'object' &&
        Object.keys(trait.effects).length > 0,
      'dao-heart trait has mechanical effects: ' + (trait && trait.id));
  });
  ok(NpcGeneration.daoHeartTraitNames(['loyal', 'loyal', 'missing'])
      .join(',') === '忠义',
    'daoHeartTraitNames resolves and de-duplicates trait ids');
  ok(Array.isArray(NpcGeneration.daoHeartTraitViews(['loyal'])) &&
      NpcGeneration.daoHeartTraitViews(['loyal'])[0].name === '忠义' &&
      NpcGeneration.daoHeartTraitViews(['loyal'])[0].effects,
    'daoHeartTraitViews returns id/name/summary/effects views');
  ok(NpcGeneration.getDaoHeartTrait('missing') === null,
    'unknown dao-heart trait lookup fails closed');

  [
    ['surname', NpcGeneration.SURNAMES, function (entry) { return entry.id; }],
    ['given-name component', NpcGeneration.GIVEN_NAME_COMPONENTS,
      function (entry) { return entry.id; }],
    ['appearance feature', NpcGeneration.APPEARANCE_FEATURES,
      function (entry) { return entry.id; }],
    ['personality profile', NpcGeneration.PERSONALITY_PROFILES,
      function (entry) { return entry.id; }],
    ['value profile', NpcGeneration.VALUE_PROFILES,
      function (entry) { return entry.id; }],
    ['talent', NpcGeneration.TALENTS, function (entry) { return entry.id; }],
    ['spiritual root', NpcGeneration.SPIRITUAL_ROOTS,
      function (entry) { return entry.id; }],
    ['romance principle', NpcGeneration.ROMANCE_PRINCIPLES,
      function (entry) { return entry.id; }]
  ].forEach(function (row) {
    const label = row[0];
    const entries = row[1];
    const ids = entries.map(row[2]);
    ok(new Set(ids).size === ids.length, label + ' IDs are unique');
    entries.forEach(function (entry) {
      ok(/^[A-Za-z0-9-]+$/.test(entry.id),
        label + ' ID is ASCII: ' + entry.id);
      ok(/[\u3400-\u9fff]/.test(entry.name),
        label + ' display name is Chinese: ' + entry.id);
    });
  });
  ok(new Set(NpcGeneration.SURNAMES.map(function (entry) {
    return entry.name;
  })).size === NpcGeneration.SURNAMES.length,
  'surname display components are unique');
  ok(new Set(NpcGeneration.GIVEN_NAME_COMPONENTS.map(function (entry) {
    return entry.name;
  })).size === NpcGeneration.GIVEN_NAME_COMPONENTS.length,
  'given-name display components are unique');
  ok(new Set(NpcGeneration.APPEARANCE_FEATURES.map(function (entry) {
    return entry.slot;
  })).size === 4,
  'appearance data covers build, face, hair, and feature slots');
  NpcGeneration.TALENTS.forEach(function (talent) {
    talent.affinities.forEach(function (affinity) {
      const validReference = affinity.kind === 'skill'
        ? !!Skills.SKILLS[affinity.targetId]
        : affinity.kind === 'technique'
          ? !!Techniques.TECHNIQUES[affinity.targetId]
          : false;
      ok(validReference,
        'talent affinity references known progression content: ' +
          talent.id + '/' + affinity.targetId);
    });
  });
  ok(NpcGeneration.getPersonality('chicheng') ===
    NpcGeneration.PERSONALITY_PROFILES.find(function (entry) {
      return entry.id === 'chicheng';
    }), 'personality lookup returns canonical record');
  ok(NpcGeneration.getValueProfile('benevolent') ===
    NpcGeneration.VALUE_PROFILES.find(function (entry) {
      return entry.id === 'benevolent';
    }), 'value-profile lookup returns canonical record');
  ok(NpcGeneration.getTalent('wood-spirit') ===
    NpcGeneration.TALENTS.find(function (entry) {
      return entry.id === 'wood-spirit';
    }), 'talent lookup returns canonical record');
  ok(NpcGeneration.getSpiritualRoot('single') ===
    NpcGeneration.SPIRITUAL_ROOTS.find(function (entry) {
      return entry.id === 'single';
    }), 'spiritual-root lookup returns canonical record');
  ok(NpcGeneration.getSpiritualRoot('metal') &&
    NpcGeneration.getSpiritualRoot('metal').id === 'single',
    '旧档金灵根别名映射到单灵根');
  ok(NpcGeneration.getRomancePrinciple('devoted') ===
    NpcGeneration.ROMANCE_PRINCIPLES[1],
  'romance-principle lookup returns canonical record');
  ok(NpcGeneration.getPersonality('missing') === null
    && NpcGeneration.getValueProfile('missing') === null
    && NpcGeneration.getTalent('missing') === null
    && NpcGeneration.getSpiritualRoot('missing') === null
    && NpcGeneration.getRomancePrinciple('missing') === null,
  'unknown NPC-generation lookups fail closed');

  exact(Social.SHARED_INTERACTIONS.map(function (entry) { return entry.id; }),
    expectedSharedIds, 'seven shared interaction IDs are stable');
  exact(Social.SPECIFIC_INTERACTIONS.map(function (entry) { return entry.id; }),
    expectedSpecificIds, 'ten sect-specific interaction IDs are stable');
  ok(Social.SHARED_INTERACTIONS.length === 7,
    'exactly seven shared interactions');
  ok(Social.SPECIFIC_INTERACTIONS.length === 10,
    'exactly ten sect or identity interactions');
  ok(Social.ALL_INTERACTIONS.length === 17,
    'exactly seventeen active interactions');
  exact(Social.SHARED_INTERACTIONS.map(function (entry) {
    return entry.durationSeconds;
  }), [120, 60, 300, 480, 900, 600, 1200],
  'shared interaction durations are canonical');
  ok(Social.get('cultivateTogether').label === '与某人一起修炼',
    'the shared cultivation interaction uses review-safe copy');

  const seenInteractionIds = new Set();
  Social.ALL_INTERACTIONS.forEach(function (interaction) {
    ok(/^[A-Za-z0-9-]+$/.test(interaction.id),
      'interaction ID is ASCII: ' + interaction.id);
    ok(!seenInteractionIds.has(interaction.id),
      'interaction ID is unique: ' + interaction.id);
    seenInteractionIds.add(interaction.id);
    ok(/[\u3400-\u9fff]/.test(interaction.label),
      'interaction display label is Chinese: ' + interaction.id);
    ok(Number.isSafeInteger(interaction.durationSeconds)
      && interaction.durationSeconds > 0,
    'interaction duration is a positive integer: ' + interaction.id);
    ok(Number.isSafeInteger(interaction.rewards.charmXp)
      && interaction.rewards.charmXp > 0,
    'every interaction grants charm XP: ' + interaction.id);
    ok(interaction.rewards.charmXpSource === 'social',
      'every interaction declares the social charm-XP source: ' +
        interaction.id);
    interaction.rewards.skillXp.forEach(function (reward) {
      ok(!!Skills.SKILLS[reward.skillId] && reward.skillId !== 'charm',
        'interaction skill XP references a non-charm Stage 2 skill: ' +
          interaction.id + '/' + reward.skillId);
    });
    interaction.rewards.techniqueUnderstanding.forEach(function (reward) {
      ok(!!Techniques.TECHNIQUES[reward.techniqueId],
        'interaction understanding references a Stage 3 technique: ' +
          interaction.id + '/' + reward.techniqueId);
    });
    if (interaction.availability.kind === 'sect') {
      ok(interaction.availability.sectIds.length === 1
        && expectedSectIds.includes(interaction.availability.sectIds[0]),
      'specific interaction references one fixed sect: ' + interaction.id);
    } else {
      ok(interaction.availability.kind === 'shared'
        && interaction.availability.sectIds.length === 0,
      'shared interaction has no sect lock: ' + interaction.id);
    }
    ok(Number.isSafeInteger(interaction.requiredAffection)
      && interaction.requiredAffection >= 0,
    'interaction declares required affection unlock: ' + interaction.id);
    ok(Social.get(interaction.id) === interaction,
      'interaction lookup returns canonical record: ' + interaction.id);
  });
  ok(Social.get('talk').requiredAffection === 0,
    'talk is unlocked at affection 0');
  ok(Social.get('gift').requiredAffection === 10,
    'gift requires affection 10');
  expectedSectIds.forEach(function (sectId) {
    ok(Social.forSect(sectId).length === 9,
      'each sect sees seven shared plus two specific interactions: ' + sectId);
  });
  ok(Social.get('missing') === null, 'unknown interaction lookup fails closed');
  ok(Object.isFrozen(Social.list()) && Object.isFrozen(Social.forSect(null)),
    'social interaction list results are frozen');

  const prototypeSensitiveIds = [
    'constructor',
    'toString',
    '__proto__',
    'hasOwnProperty'
  ];
  [
    ['region', Regions.get],
    ['sect', Sects.get],
    ['interaction', Social.get]
  ].forEach(function (row) {
    prototypeSensitiveIds.forEach(function (hostileId) {
      ok(row[1](hostileId) === null,
        row[0] + ' lookup rejects prototype-sensitive ID: ' + hostileId);
    });
    let coercions = 0;
    const coercibleId = {
      toString: function () {
        coercions++;
        return row[0] === 'region'
          ? 'qinglan-town'
          : row[0] === 'sect'
            ? 'taixuan-sword'
            : 'talk';
      }
    };
    ok(row[1](coercibleId) === null,
      row[0] + ' lookup rejects non-string IDs');
    ok(coercions === 0,
      row[0] + ' lookup never coerces an untrusted ID');
  });

  const inheritedPoisonId = 'stage4InheritedPoison';
  Object.defineProperty(Object.prototype, inheritedPoisonId, {
    configurable: true,
    enumerable: false,
    value: { id: inheritedPoisonId }
  });
  try {
    ok(Regions.get(inheritedPoisonId) === null,
      'region lookup ignores an inherited poisoned key');
    ok(Sects.get(inheritedPoisonId) === null,
      'sect lookup ignores an inherited poisoned key');
    ok(Social.get(inheritedPoisonId) === null,
      'interaction lookup ignores an inherited poisoned key');
  } finally {
    delete Object.prototype[inheritedPoisonId];
  }
  ok(!Object.isFrozen(Object.prototype),
    'content indexes never freeze Object.prototype');

  [
    ['personality', NpcGeneration.getPersonality],
    ['value profile', NpcGeneration.getValueProfile],
    ['talent', NpcGeneration.getTalent],
    ['romance principle', NpcGeneration.getRomancePrinciple]
  ].forEach(function (row) {
    prototypeSensitiveIds.forEach(function (hostileId) {
      ok(row[1](hostileId) === null,
        row[0] + ' lookup rejects prototype-sensitive ID: ' + hostileId);
    });
    let coercions = 0;
    ok(row[1]({
      toString: function () {
        coercions++;
        return 'steady';
      }
    }) === null, row[0] + ' lookup rejects non-string IDs');
    ok(coercions === 0,
      row[0] + ' lookup never coerces an untrusted ID');
  });

  const allModules = [Regions, Sects, NpcGeneration, Social];
  allModules.forEach(function (moduleApi) {
    ok(Object.isFrozen(moduleApi), 'CommonJS content API is frozen');
    ok(frozenTree(moduleApi), 'CommonJS content data is deeply frozen');
  });

  const browserModules = [
    ['content/regions.js', 'RegionContent'],
    ['content/sects.js', 'SectContent'],
    ['content/npc-generation.js', 'NpcGenerationContent'],
    ['content/social-interactions.js', 'SocialInteractionContent']
  ];
  browserModules.forEach(function (row) {
    const source = fs.readFileSync(path.join(__dirname, '..', row[0]), 'utf8');
    const context = {};
    vm.runInNewContext(source, context, { filename: row[0] });
    ok(!!context[row[1]], row[0] + ' exposes browser global ' + row[1]);
    ok(Object.isFrozen(context[row[1]]),
      row[0] + ' browser global API is frozen');
    ok(frozenTree(context[row[1]]),
      row[0] + ' browser global data is deeply frozen');
    ok(!/Math\.random|localStorage|Platform\.|SaveSystem|document\.|canvas|toast\(/.test(source),
      row[0] + ' remains a pure content module');
  });

  const forbiddenMapKeys = new Set([
    'x', 'y', 'lat', 'lng', 'neighbors', 'path', 'paths',
    'pathfinding', 'coordinates', 'route', 'routes'
  ]);
  allModules.forEach(function (moduleApi) {
    walk(moduleApi, function (key) {
      ok(!forbiddenMapKeys.has(key),
        'content contains no coordinate, adjacency, route, or path key: ' + key);
    });
  });

  const userCopy = allStrings(allModules);
  const forbiddenCopy = [
    'N' + 'PC响应',
    '等待' + 'NPC',
    '系统' + '等待',
    '双' + '修',
    '大' + '地图'
  ];
  forbiddenCopy.forEach(function (text) {
    ok(userCopy.every(function (entry) { return !entry.includes(text); }),
      'content copy excludes a forbidden review phrase');
  });
  const forbiddenStage5Keys = new Set([
    'childbirth', 'descendant', 'deathResolution', 'reincarnation',
    'ascension', 'lineage', 'inheritance', 'inheritanceHall'
  ]);
  allModules.forEach(function (moduleApi) {
    walk(moduleApi, function (key) {
      ok(!forbiddenStage5Keys.has(key),
        'Stage 4 content does not fake a Stage 5 lifecycle outcome: ' + key);
    });
  });
  ok(!allStrings(Social).some(function (text) {
    return /精通/.test(text);
  }), 'social content does not add charm mastery copy');
  walk(Social, function (key) {
    ok(key !== 'masteryId' && key !== 'masteryXp',
      'social content does not add a charm mastery field');
  });
}

console.log('\n=== Stage 4 内容自测：' + pass + ' 通过 / ' + fail + ' 失败 ===');
if (fail) process.exit(1);
