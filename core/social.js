(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports
    ? factory(
      require('../content/social-interactions.js'),
      require('../content/npc-generation.js'),
      require('./relationships.js'),
      require('./inventory.js'),
      require('./skill-progression.js'),
      require('./techniques.js'),
      require('./world-month.js'),
      require('./dns.js')
    )
    : factory(
      root && root.SocialInteractionContent,
      root && root.NpcGenerationContent,
      root && root.Relationships,
      root && root.Inventory,
      root && root.SkillProgression,
      root && root.Techniques,
      root && root.WorldMonth,
      root && root.Dns
    );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.Social = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  SocialInteractionContent,
  NpcGenerationContent,
  Relationships,
  Inventory,
  SkillProgression,
  Techniques,
  WorldMonth,
  DnsConfig
) {
  'use strict';

  const KEY_PART = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
  // 异地仅寄礼；接近/陪伴等当面互动必须同地。
  const REMOTE_SAFE_INTERACTIONS = Object.freeze(['gift']);

  function own(value, key) {
    return Object.prototype.hasOwnProperty.call(value, key);
  }

  function clone(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return null;
    }
  }

  function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
      return value;
    }
    Object.keys(value).forEach(function (key) {
      deepFreeze(value[key]);
    });
    return Object.freeze(value);
  }

  function interaction(interactionId, deps) {
    const content = deps && deps.SocialInteractionContent
      ? deps.SocialInteractionContent
      : SocialInteractionContent;
    return content && typeof content.get === 'function'
      ? content.get(interactionId)
      : null;
  }

  function parseActionKey(key, deps) {
    if (typeof key !== 'string') return null;
    const parts = key.split(':');
    if (parts.length < 3 || parts.length > 4 || parts[0] !== 'social') {
      return null;
    }
    if (!KEY_PART.test(parts[1]) || !KEY_PART.test(parts[2])) return null;
    const found = interaction(parts[2], deps);
    if (!found) return null;
    const gift = parts[2] === 'gift';
    if ((gift && parts.length !== 4) || (!gift && parts.length !== 3)) {
      return null;
    }
    if (gift && !KEY_PART.test(parts[3])) return null;
    return deepFreeze({
      key: key,
      npcId: parts[1],
      interactionId: parts[2],
      itemId: gift ? parts[3] : null
    });
  }

  function npcRecord(model, npcId) {
    const systems = model && model.systems;
    const npcs = systems && systems.npcs;
    const records = npcs && npcs.records;
    return records && own(records, npcId) ? records[npcId] : null;
  }

  function hasPersonLock(model, npcId) {
    const jobs = model &&
      model.systems &&
      model.systems.parallel &&
      model.systems.parallel.jobs;
    return Array.isArray(jobs) && jobs.some(function (job) {
      return job &&
        job.kind === 'social' &&
        job.npcId === npcId;
    });
  }

  function result(ok, code, state, value) {
    return {
      ok: ok,
      code: code,
      state: state,
      value: value || null
    };
  }

  function personAffectionTowardPlayer(model, npcId, deps) {
    // UI/可用性热路径：禁止 Relationships.queryPair（会整树 snapshot）。
    const edges = model &&
      model.systems &&
      model.systems.relationships &&
      model.systems.relationships.edges;
    const edge = edges && edges[npcId + '>player'];
    if (edge && Number.isFinite(edge.affection)) {
      return Math.max(0, Math.floor(edge.affection));
    }
    return 0;
  }

  function personRomanticTowardPlayer(model, npcId) {
    const edges = model &&
      model.systems &&
      model.systems.relationships &&
      model.systems.relationships.edges;
    const edge = edges && edges[npcId + '>player'];
    if (edge && Number.isFinite(edge.romanticAttachment)) {
      return Math.max(0, Math.floor(edge.romanticAttachment));
    }
    return 0;
  }

  function pairTags(model, npcId) {
    const worldMonth = WorldMonth;
    if (worldMonth && typeof worldMonth.getTags === 'function' &&
        model && model.systems && model.systems.relationships) {
      return worldMonth.getTags(model.systems.relationships, npcId, 'player');
    }
    const map = model &&
      model.systems &&
      model.systems.relationships &&
      model.systems.relationships.tags;
    if (!map || typeof map !== 'object') return [];
    const key = npcId < 'player'
      ? npcId + '|player'
      : 'player|' + npcId;
    const alt = npcId + '|player';
    const raw = map[key] || map[alt] || map['player|' + npcId];
    return Array.isArray(raw) ? raw.slice() : [];
  }

  function requiredAffectionOf(found) {
    const amount = found && Number(found.requiredAffection);
    return Number.isFinite(amount) && amount > 0 ? Math.floor(amount) : 0;
  }

  function sameRegion(model, npcId, deps) {
    const worldMonth = deps && deps.WorldMonth ? deps.WorldMonth : WorldMonth;
    if (!worldMonth || typeof worldMonth.sameRegion !== 'function') {
      return false;
    }
    return worldMonth.sameRegion(model, npcId) === true;
  }

  function isAvailable(model, npcId, interactionId, itemId, deps) {
    const person = npcRecord(model, npcId);
    if (!person) return result(false, 'unknown_person', model);
    if (person.status !== 'living') {
      return result(false, 'person_unavailable', model);
    }
    const activity = typeof person.activityStatus === 'string'
      ? person.activityStatus
      : 'normal';
    if (activity === 'seclusion' ||
        activity === 'imprisoned' ||
        activity === 'injured' ||
        activity === 'missing' ||
        activity === 'tribulation' ||
        activity === 'exploring') {
      return result(false, 'person_unavailable', model);
    }
    if (!(deps && deps.ignorePersonLock) && hasPersonLock(model, npcId)) {
      return result(false, 'person_busy', model);
    }
    const found = interaction(interactionId, deps);
    if (!found) return result(false, 'unknown_interaction', model);
    if (!sameRegion(model, npcId, deps) &&
        REMOTE_SAFE_INTERACTIONS.indexOf(interactionId) < 0) {
      return result(false, 'interaction_locked', model);
    }
    if (activity === 'travel' &&
        REMOTE_SAFE_INTERACTIONS.indexOf(interactionId) < 0) {
      return result(false, 'interaction_locked', model);
    }
    const need = requiredAffectionOf(found);
    if (need > 0 &&
        personAffectionTowardPlayer(model, npcId, deps) < need) {
      return result(false, 'affection_locked', model);
    }
    const needRom = Number(found.requiredRomanticAttachment) || 0;
    if (needRom > 0 && personRomanticTowardPlayer(model, npcId) < needRom) {
      return result(false, 'affection_locked', model);
    }
    const tags = pairTags(model, npcId);
    const requiredTags = Array.isArray(found.requiredTags)
      ? found.requiredTags
      : [];
    for (let i = 0; i < requiredTags.length; i++) {
      if (tags.indexOf(requiredTags[i]) < 0) {
        return result(false, 'interaction_locked', model);
      }
    }
    const requiredAny = Array.isArray(found.requiredAnyTags)
      ? found.requiredAnyTags
      : [];
    if (requiredAny.length) {
      let hit = false;
      for (let i = 0; i < requiredAny.length; i++) {
        if (tags.indexOf(requiredAny[i]) >= 0) {
          hit = true;
          break;
        }
      }
      if (!hit) return result(false, 'interaction_locked', model);
    }
    const forbidden = Array.isArray(found.forbiddenTags)
      ? found.forbiddenTags
      : [];
    for (let i = 0; i < forbidden.length; i++) {
      if (tags.indexOf(forbidden[i]) >= 0) {
        return result(false, 'interaction_locked', model);
      }
    }
    if (found.availability.kind === 'sect') {
      const playerSect = model &&
        model.systems &&
        model.systems.sects &&
        model.systems.sects.player
        ? model.systems.sects.player.sectId
        : null;
      if (found.availability.sectIds.indexOf(person.sectId) < 0 &&
          found.availability.sectIds.indexOf(playerSect) < 0) {
        return result(false, 'interaction_locked', model);
      }
    }
    if (interactionId === 'gift') {
      if (typeof itemId !== 'string' || itemId.length === 0) {
        return result(false, 'gift_required', model);
      }
      const inventory = deps && deps.Inventory
        ? deps.Inventory
        : Inventory;
      if (!inventory ||
          typeof inventory.availableQuantity !== 'function' ||
          inventory.availableQuantity(model.player.inventory, itemId) < 1) {
        return result(false, 'gift_unavailable', model);
      }
    } else if (itemId != null) {
      return result(false, 'unexpected_item', model);
    }
    return result(true, 'ok', model, found);
  }

  function duration(model, action, deps) {
    const parsed = typeof action === 'string'
      ? parseActionKey(action, deps)
      : action;
    const found = parsed && interaction(parsed.interactionId, deps);
    return found && Number.isFinite(found.durationSeconds)
      ? found.durationSeconds
      : 0;
  }

  function personDaoTraits(person) {
    return Array.isArray(person && person.traits) ? person.traits : [];
  }

  function daoHeartEffect(person, traitId) {
    if (!NpcGenerationContent ||
        typeof NpcGenerationContent.getDaoHeartTrait !== 'function') {
      return null;
    }
    const trait = NpcGenerationContent.getDaoHeartTrait(traitId);
    return trait && trait.effects ? trait.effects : null;
  }

  // 交互相关的道心标签乘数 → 关系指标乘数（复用 positiveDelta 的 modifiers 通道）。
  // 只对本次交互实际出现的指标产出乘数，避免跨交互串味。
  function daoHeartMetricModifiers(person, interactionId) {
    const out = {};
    personDaoTraits(person).forEach(function (id) {
      const fx = daoHeartEffect(person, id);
      if (!fx) return;
      if (interactionId === 'gift' && fx.giftAffection) {
        out.affection = (out.affection || 1) * fx.giftAffection;
      } else if (interactionId === 'discussDao' && fx.daoTrust) {
        out.trust = (out.trust || 1) * fx.daoTrust;
      } else if ((interactionId === 'confess' ||
                  interactionId === 'formPartnership') && fx.loyalGrowth) {
        out.loyalty = (out.loyalty || 1) * fx.loyalGrowth;
      } else if (interactionId === 'outing' && fx.outingAffection) {
        out.affection = (out.affection || 1) * fx.outingAffection;
      } else if ((interactionId === 'accompany' ||
                  interactionId === 'visit' ||
                  interactionId === 'cultivateTogether' ||
                  interactionId === 'repayKindness') && fx.stayAffection) {
        out.affection = (out.affection || 1) * fx.stayAffection;
      }
    });
    return out;
  }

  // 道心标签对误解率的影响：乘法缩放 + 加法增量。
  function daoHeartMisunderstanding(person, interactionId) {
    let scale = 1;
    let bonus = 0;
    personDaoTraits(person).forEach(function (id) {
      const fx = daoHeartEffect(person, id);
      if (!fx) return;
      if (interactionId === 'gift' && fx.giftMisunderstandingScale) {
        scale *= fx.giftMisunderstandingScale;
      }
      if (fx.willfulResistance) bonus += fx.willfulResistance;
      if (fx.principledRigidity) bonus += fx.principledRigidity;
    });
    return { scale: scale, bonus: bonus };
  }

  function positiveDelta(values, multiplier, personalityModifiers) {
    const output = {};
    Object.keys(values || {}).forEach(function (metric) {
      const raw = values[metric];
      const personality = personalityModifiers &&
        Number.isFinite(personalityModifiers[metric])
        ? personalityModifiers[metric]
        : 1;
      const factor = raw > 0 ? multiplier * personality : personality;
      output[metric] = Math.round(raw * factor);
    });
    return output;
  }

  function misunderstandingDelta(values) {
    const output = {};
    Object.keys(values || {}).forEach(function (metric) {
      const amount = values[metric];
      if ((metric === 'affection' || metric === 'trust') && amount > 0) {
        output[metric] = -Math.max(1, Math.ceil(amount / 2));
      } else {
        output[metric] = amount;
      }
    });
    output.closeness = (output.closeness || 0) - 1;
    return output;
  }

  function replace(target, source) {
    Object.keys(target).forEach(function (key) { delete target[key]; });
    Object.keys(source).forEach(function (key) { target[key] = source[key]; });
  }

  function applySkillRewards(state, rewards, progression) {
    const skillXp = Array.isArray(rewards.skillXp) ? rewards.skillXp : [];
    for (let index = 0; index < skillXp.length; index++) {
      const reward = skillXp[index];
      const progress = state.player.skills &&
        state.player.skills[reward.skillId];
      if (!progress || !progression ||
          typeof progression.addSkillXp !== 'function') {
        return false;
      }
      state.player.skills[reward.skillId] =
        progression.addSkillXp(progress, reward.xp).value;
    }
    return true;
  }

  function applyBenefits(state, npcId, rewards) {
    const declared = Array.isArray(rewards.temporaryBenefits)
      ? rewards.temporaryBenefits
      : [];
    if (!state.systems.social) {
      state.systems.social = { nextBenefitId: 1, benefits: [] };
    }
    for (let index = 0; index < declared.length; index++) {
      const benefit = declared[index];
      if (!benefit ||
          typeof benefit.effectId !== 'string' ||
          !Number.isFinite(benefit.durationSeconds) ||
          benefit.durationSeconds <= 0) {
        return false;
      }
      const id = 'social-benefit-' + state.systems.social.nextBenefitId++;
      state.systems.social.benefits.push({
        id: id,
        sourceNpcId: npcId,
        effectId: benefit.effectId,
        remainingSeconds: benefit.durationSeconds,
        totalSeconds: benefit.durationSeconds
      });
    }
    return true;
  }

  function applyTechniqueUnderstanding(state, rewards) {
    const rows = Array.isArray(rewards.techniqueUnderstanding)
      ? rewards.techniqueUnderstanding
      : [];
    if (!rows.length) return true;
    if (!Techniques || typeof Techniques.grantXp !== 'function') {
      return true;
    }
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      if (!row || typeof row.techniqueId !== 'string' ||
          !Number.isFinite(row.amount) || row.amount <= 0) {
        continue;
      }
      if (!state.player.techniques ||
          !state.player.techniques.known ||
          !state.player.techniques.known[row.techniqueId]) {
        continue;
      }
      const granted = Techniques.grantXp(
        state,
        row.techniqueId,
        Math.floor(row.amount),
        'npc_guidance',
        {
          sectId: null,
          favoredTechniqueIds: [],
          favoredTags: []
        }
      );
      if (granted && granted.ok && granted.state) {
        replace(state, granted.state);
      }
    }
    return true;
  }

  function complete(model, action, helpers, deps, options) {
    const parsed = typeof action === 'string'
      ? parseActionKey(action, deps)
      : action;
    if (!parsed) return result(false, 'invalid_action', model);
    const opts = options && typeof options === 'object' ? options : {};
    const giftPrepaid = opts.giftPrepaid === true;
    const available = isAvailable(
      model,
      parsed.npcId,
      parsed.interactionId,
      giftPrepaid ? null : parsed.itemId,
      deps
    );
    if (!available.ok) {
      if (!(giftPrepaid &&
          parsed.interactionId === 'gift' &&
          (available.code === 'gift_required' ||
            available.code === 'unexpected_item'))) {
        return available;
      }
    }
    const state = clone(model);
    if (!state) return result(false, 'invalid_state', model);
    const found = interaction(parsed.interactionId, deps);
    if (!found) return result(false, 'unknown_interaction', model);
    const inventory = deps && deps.Inventory ? deps.Inventory : Inventory;
    const progression = deps && deps.SkillProgression
      ? deps.SkillProgression
      : SkillProgression;
    if (parsed.itemId && !giftPrepaid) {
      const delta = {};
      delta[parsed.itemId] = -1;
      const paid = inventory.apply(state.player.inventory, delta);
      if (!paid || paid.ok !== true) {
        return result(false, 'gift_unavailable', model);
      }
      state.player.inventory = paid.value;
    }

    const charm = state.player.skills && state.player.skills.charm;
    const charmGain = progression.gainCharmXp(
      charm,
      found.rewards.charmXp,
      { source: 'social' }
    );
    if (!charmGain || charmGain.ok !== true) {
      return result(false, 'charm_reward_failed', model);
    }
    state.player.skills.charm = charmGain.value;
    const benefits = progression.charmBenefits(charm.level);
    const person = npcRecord(state, parsed.npcId);
    const profile = NpcGenerationContent &&
      typeof NpcGenerationContent.getPersonality === 'function'
      ? NpcGenerationContent.getPersonality(person.personalityId)
      : null;
    const modifiers = Object.assign(
      {},
      profile ? profile.relationModifiers : {},
      daoHeartMetricModifiers(person, parsed.interactionId)
    );
    const misunderstandingAdjust = daoHeartMisunderstanding(
      person,
      parsed.interactionId
    );
    const chance = Math.min(
      0.95,
      Math.max(
        0,
        (found.relationship.misunderstandingChance -
          benefits.misunderstandingReduction) *
          misunderstandingAdjust.scale +
          misunderstandingAdjust.bonus
      )
    );
    const randomValue = helpers && typeof helpers.random === 'function'
      ? helpers.random()
      : 0.99;
    if (!Number.isFinite(randomValue) ||
        randomValue < 0 ||
        randomValue >= 1) {
      return result(false, 'invalid_random', model);
    }
    const misunderstood = randomValue < chance;
    let playerDelta = positiveDelta(
      found.relationship.playerToPerson,
      benefits.positiveRelationMultiplier,
      modifiers
    );
    let personDelta = positiveDelta(
      found.relationship.personToPlayer,
      benefits.positiveRelationMultiplier,
      modifiers
    );
    if (misunderstood) {
      playerDelta = misunderstandingDelta(playerDelta);
      personDelta = misunderstandingDelta(personDelta);
    }
    // 生日月赠礼：对方回礼好感部分加倍（仅 affection 分量）。
    if (parsed.interactionId === 'gift' && person) {
      const worldMonth = deps && deps.WorldMonth ? deps.WorldMonth : WorldMonth;
      const cal = state.systems &&
        state.systems.world &&
        worldMonth &&
        typeof worldMonth.ensureCalendar === 'function'
        ? worldMonth.ensureCalendar(state.systems.world)
        : null;
      if (cal &&
          person.birthdayMonth === cal.month &&
          Number.isFinite(personDelta.affection) &&
          personDelta.affection > 0) {
        personDelta.affection *= 2;
      }
    }
    // 对标 act1「增进感情」：拜访/交谈额外走 randomaddlove 语义。
    if (!misunderstood &&
        (parsed.interactionId === 'talk' ||
          parsed.interactionId === 'visit')) {
      const Dns = (deps && deps.Dns) || DnsConfig;
      if (Dns && typeof Dns.randomAddLove === 'function') {
        const roll = helpers && typeof helpers.random === 'function'
          ? helpers.random
          : Math.random;
        const loveBump = Dns.randomAddLove(1, 4, roll);
        personDelta.romanticAttachment =
          (Number(personDelta.romanticAttachment) || 0) +
          loveBump.romanticAttachment;
        personDelta.affection =
          (Number(personDelta.affection) || 0) + loveBump.affection;
        if (loveBump.jealousy) {
          personDelta.jealousy =
            (Number(personDelta.jealousy) || 0) + loveBump.jealousy;
        }
      }
    }
    const atSeconds = helpers && typeof helpers.nowSeconds === 'function'
      ? helpers.nowSeconds()
      : 0;
    const forward = Relationships.applyDelta(
      state,
      'player',
      parsed.npcId,
      playerDelta,
      atSeconds
    );
    if (!forward.ok) return result(false, forward.code, model);
    const reverse = Relationships.applyDelta(
      forward.state,
      parsed.npcId,
      'player',
      personDelta,
      atSeconds
    );
    if (!reverse.ok) return result(false, reverse.code, model);
    replace(state, reverse.state);
    const finishedPerson = npcRecord(state, parsed.npcId);
    if (finishedPerson) {
      finishedPerson.metPlayer = true;
      // 对标 getpe：结识须进 frs，仅 metPlayer 不足以进刷新圈。
      if (!state.player.kin || typeof state.player.kin !== 'object') {
        state.player.kin = {
          fa: null, mo: null, par: null, frs: [], ens: []
        };
      }
      if (!Array.isArray(state.player.kin.frs)) state.player.kin.frs = [];
      if (state.player.kin.frs.indexOf(parsed.npcId) < 0) {
        state.player.kin.frs.push(parsed.npcId);
      }
      if (!finishedPerson.kin || typeof finishedPerson.kin !== 'object') {
        finishedPerson.kin = {
          fa: null, mo: null, par: null, frs: [], ens: []
        };
      }
      if (!Array.isArray(finishedPerson.kin.frs)) finishedPerson.kin.frs = [];
      if (finishedPerson.kin.frs.indexOf('player') < 0) {
        finishedPerson.kin.frs.push('player');
      }
    }
    // 告白/结契：成功后写入关系标签（不恢复待决策队列）。
    if (!misunderstood &&
        (parsed.interactionId === 'confess' ||
          parsed.interactionId === 'formPartnership' ||
          parsed.interactionId === 'repayKindness')) {
      const worldMonthTags = deps && deps.WorldMonth
        ? deps.WorldMonth
        : WorldMonth;
      if (worldMonthTags &&
          typeof worldMonthTags.getTags === 'function' &&
          typeof worldMonthTags.setTags === 'function') {
        let tags = worldMonthTags.getTags(
          state.systems.relationships,
          parsed.npcId,
          'player'
        );
        if (parsed.interactionId === 'confess') {
          if (tags.indexOf('friend') < 0) tags = tags.concat(['friend']);
          if (tags.indexOf('lover') < 0) tags = tags.concat(['lover']);
          tags = tags.filter(function (tag) { return tag !== 'enemy'; });
        } else if (parsed.interactionId === 'formPartnership') {
          if (tags.indexOf('lover') < 0) tags = tags.concat(['lover']);
          if (tags.indexOf('partner') < 0) tags = tags.concat(['partner']);
          tags = tags.filter(function (tag) { return tag !== 'enemy'; });
        } else if (parsed.interactionId === 'repayKindness') {
          if (tags.indexOf('friend') < 0) tags = tags.concat(['friend']);
          if (tags.indexOf('close-friend') < 0 &&
              personAffectionTowardPlayer(state, parsed.npcId) >= 40) {
            tags = tags.concat(['close-friend']);
          }
        }
        worldMonthTags.setTags(
          state.systems.relationships,
          parsed.npcId,
          'player',
          tags
        );
      }
    }
    const worldMonth = deps && deps.WorldMonth ? deps.WorldMonth : WorldMonth;
    if (worldMonth &&
        typeof worldMonth.appendWorldEvent === 'function' &&
        finishedPerson) {
      const regionId = finishedPerson.regionId ||
        (state.player && state.player.regionId) ||
        'qinglan-town';
      const interactionLabel = found.label.replace(
        '某人',
        finishedPerson.identity.name
      );
      const locName = typeof worldMonth.regionName === 'function'
        ? worldMonth.regionName(regionId)
        : regionId;
      const contentApi = deps && deps.SocialInteractionContent
        ? deps.SocialInteractionContent
        : SocialInteractionContent;
      const completeNarrative = contentApi &&
        typeof contentApi.getNarrative === 'function'
        ? contentApi.getNarrative(parsed.interactionId, 'complete', {
          name: finishedPerson.identity.name,
          pronoun: finishedPerson.identity.gender === 'male' ? '他' : '她',
          loc: locName,
          you: worldMonth && typeof worldMonth.playerNarrativeLabel === 'function'
            ? worldMonth.playerNarrativeLabel(state)
            : ((state.player && state.player.name) || '无名')
        })
        : ((worldMonth && typeof worldMonth.playerNarrativeLabel === 'function'
          ? worldMonth.playerNarrativeLabel(state)
          : ((state.player && state.player.name) || '无名')) + '在【' + locName + '】与【' + finishedPerson.identity.name +
          '】完成了【' + interactionLabel + '】。');
      worldMonth.appendWorldEvent(state, {
        type: parsed.interactionId,
        participants: ['player', parsed.npcId],
        location: regionId,
        narrative: completeNarrative,
        source: 'player'
      });
    }
    state.player.cultivation =
      (Number.isFinite(state.player.cultivation)
        ? state.player.cultivation
        : 0) + found.rewards.cultivation;
    if (!applySkillRewards(state, found.rewards, progression) ||
        !applyBenefits(state, parsed.npcId, found.rewards) ||
        !applyTechniqueUnderstanding(state, found.rewards)) {
      return result(false, 'reward_failed', model);
    }
    const resultLabel = found.label.replace('某人', person.identity.name);
    const resultNarrative = (function () {
      const contentApi = deps && deps.SocialInteractionContent
        ? deps.SocialInteractionContent
        : SocialInteractionContent;
      if (!contentApi || typeof contentApi.getNarrative !== 'function') {
        return resultLabel;
      }
      const locName = finishedPerson && worldMonth &&
        typeof worldMonth.regionName === 'function'
        ? worldMonth.regionName(
          finishedPerson.regionId ||
          (state.player && state.player.regionId) ||
          'qinglan-town'
        )
        : '某处';
      return contentApi.getNarrative(parsed.interactionId, 'complete', {
        name: person.identity.name,
        pronoun: person.identity.gender === 'male' ? '他' : '她',
        loc: locName,
        you: worldMonth && typeof worldMonth.playerNarrativeLabel === 'function'
          ? worldMonth.playerNarrativeLabel(state)
          : ((state.player && state.player.name) || '无名')
      });
    })();
    return {
      ok: true,
      code: 'ok',
      state: state,
      result: deepFreeze({
        npcId: parsed.npcId,
        interactionId: parsed.interactionId,
        label: resultLabel,
        narrative: resultNarrative,
        charmXp: found.rewards.charmXp,
        cultivation: found.rewards.cultivation,
        charmBenefits: benefits,
        misunderstandingChance: chance,
        misunderstood: misunderstood,
        playerToPerson: playerDelta,
        personToPlayer: personDelta
      })
    };
  }

  function nextPlayerJobId(jobs) {
    let seq = 1;
    const used = Object.create(null);
    (Array.isArray(jobs) ? jobs : []).forEach(function (job) {
      if (job && typeof job.id === 'string') used[job.id] = true;
    });
    let id;
    do {
      id = 'social-job-player-' + seq;
      seq += 1;
    } while (used[id]);
    return id;
  }

  function enqueue(model, npcId, interactionId, itemId, deps) {
    const available = isAvailable(
      model,
      npcId,
      interactionId,
      itemId,
      deps
    );
    if (!available.ok) return available;
    const actionKey = interactionId === 'gift'
      ? 'social:' + npcId + ':gift:' + itemId
      : 'social:' + npcId + ':' + interactionId;
    const existingJobs = model &&
      model.systems &&
      model.systems.parallel &&
      Array.isArray(model.systems.parallel.jobs)
      ? model.systems.parallel.jobs
      : [];
    const exists = existingJobs.some(function (job) {
      return job &&
        job.kind === 'social' &&
        job.actionKey === actionKey &&
        job.ready !== true;
    });
    if (exists) {
      return result(true, 'no_change', model);
    }
    const state = clone(model);
    if (!state) return result(false, 'invalid_state', model);
    const found = available.value;
    const person = npcRecord(state, npcId);
    const inventory = deps && deps.Inventory ? deps.Inventory : Inventory;
    let paidItemId = null;
    if (interactionId === 'gift' && itemId) {
      const delta = {};
      delta[itemId] = -1;
      const paid = inventory.apply(state.player.inventory, delta);
      if (!paid || paid.ok !== true) {
        return result(false, 'gift_unavailable', model);
      }
      state.player.inventory = paid.value;
      paidItemId = itemId;
    }
    if (!state.systems) state.systems = {};
    if (!state.systems.parallel ||
        !Array.isArray(state.systems.parallel.jobs)) {
      state.systems.parallel = { jobs: [] };
    }
    const label = found.label.replace(
      '某人',
      person.identity && person.identity.name
        ? person.identity.name
        : '对方'
    );
    const contentApi = deps && deps.SocialInteractionContent
      ? deps.SocialInteractionContent
      : SocialInteractionContent;
    const progressNarrative = contentApi &&
      typeof contentApi.getNarrative === 'function'
      ? contentApi.getNarrative(interactionId, 'progress', {
        name: person.identity && person.identity.name
          ? person.identity.name
          : '对方',
        pronoun: person.identity && person.identity.gender === 'male'
          ? '他'
          : '她'
      })
      : label;
    const startNarrative = contentApi &&
      typeof contentApi.getNarrative === 'function'
      ? contentApi.getNarrative(interactionId, 'start', {
        name: person.identity && person.identity.name
          ? person.identity.name
          : '对方',
        pronoun: person.identity && person.identity.gender === 'male'
          ? '他'
          : '她'
      })
      : label;
    const duration = Number.isFinite(found.durationSeconds)
      ? found.durationSeconds
      : 0;
    if (!(duration > 0)) return result(false, 'invalid_action', model);
    state.systems.parallel.jobs.push({
      id: nextPlayerJobId(state.systems.parallel.jobs),
      kind: 'social',
      npcId: npcId,
      sourceEventId: null,
      label: progressNarrative,
      remainingSeconds: duration,
      totalSeconds: duration,
      followupTemplateId: null,
      interactionId: interactionId,
      itemId: itemId || null,
      paidItemId: paidItemId,
      actionKey: actionKey,
      context: {},
      ready: false,
      completionReported: false
    });
    return result(true, 'ok', state, {
      npcId: npcId,
      interactionId: interactionId,
      actionKey: actionKey,
      label: label,
      narrative: startNarrative,
      progressNarrative: progressNarrative,
      durationSeconds: duration
    });
  }

  function query(model, npcId, deps) {
    const person = npcRecord(model, npcId);
    if (!person || person.status !== 'living') return null;
    const content = deps && deps.SocialInteractionContent
      ? deps.SocialInteractionContent
      : SocialInteractionContent;
    const candidates = content && typeof content.list === 'function'
      ? content.list()
      : [];
    const interactions = candidates.filter(function (entry) {
      if (entry.id === 'gift') {
        return personAffectionTowardPlayer(model, npcId, deps) >=
          requiredAffectionOf(entry);
      }
      return isAvailable(model, npcId, entry.id, null, deps).ok;
    }).map(function (entry) {
      return {
        id: entry.id,
        label: entry.label.replace('某人', person.identity.name),
        durationSeconds: entry.durationSeconds,
        requiresGift: entry.id === 'gift',
        requiredAffection: requiredAffectionOf(entry)
      };
    });
    return deepFreeze({
      npcId: npcId,
      npcName: person.identity.name,
      busy: hasPersonLock(model, npcId),
      interactions: interactions
    });
  }

  return Object.freeze({
    parseActionKey: parseActionKey,
    isAvailable: isAvailable,
    duration: duration,
    enqueue: enqueue,
    complete: complete,
    query: query,
    hasPersonLock: hasPersonLock
  });
});
