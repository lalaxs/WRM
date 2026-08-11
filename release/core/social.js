(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports
    ? factory(
      require('../content/social-interactions.js'),
      require('../content/npc-generation.js'),
      require('./relationships.js'),
      require('./inventory.js'),
      require('./skill-progression.js')
    )
    : factory(
      root && root.SocialInteractionContent,
      root && root.NpcGenerationContent,
      root && root.Relationships,
      root && root.Inventory,
      root && root.SkillProgression
    );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.Social = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  SocialInteractionContent,
  NpcGenerationContent,
  Relationships,
  Inventory,
  SkillProgression
) {
  'use strict';

  const KEY_PART = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

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

  function isAvailable(model, npcId, interactionId, itemId, deps) {
    const person = npcRecord(model, npcId);
    if (!person) return result(false, 'unknown_person', model);
    if (person.status !== 'living') {
      return result(false, 'person_unavailable', model);
    }
    if (hasPersonLock(model, npcId)) {
      return result(false, 'person_busy', model);
    }
    const found = interaction(interactionId, deps);
    if (!found) return result(false, 'unknown_interaction', model);
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
    output.resentment = (output.resentment || 0) + 1;
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

  function complete(model, action, helpers, deps) {
    const parsed = typeof action === 'string'
      ? parseActionKey(action, deps)
      : action;
    if (!parsed) return result(false, 'invalid_action', model);
    const available = isAvailable(
      model,
      parsed.npcId,
      parsed.interactionId,
      parsed.itemId,
      deps
    );
    if (!available.ok) return available;
    const state = clone(model);
    if (!state) return result(false, 'invalid_state', model);
    const found = interaction(parsed.interactionId, deps);
    const inventory = deps && deps.Inventory ? deps.Inventory : Inventory;
    const progression = deps && deps.SkillProgression
      ? deps.SkillProgression
      : SkillProgression;
    if (parsed.itemId) {
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
    const modifiers = profile ? profile.relationModifiers : {};
    const chance = Math.max(
      0,
      found.relationship.misunderstandingChance -
        benefits.misunderstandingReduction
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
    state.player.cultivation =
      (Number.isFinite(state.player.cultivation)
        ? state.player.cultivation
        : 0) + found.rewards.cultivation;
    if (!applySkillRewards(state, found.rewards, progression) ||
        !applyBenefits(state, parsed.npcId, found.rewards)) {
      return result(false, 'reward_failed', model);
    }
    return {
      ok: true,
      code: 'ok',
      state: state,
      result: deepFreeze({
        npcId: parsed.npcId,
        interactionId: parsed.interactionId,
        label: found.label.replace('某人', person.identity.name),
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
      if (entry.id === 'gift') return true;
      return isAvailable(model, npcId, entry.id, null, deps).ok;
    }).map(function (entry) {
      return {
        id: entry.id,
        label: entry.label.replace('某人', person.identity.name),
        durationSeconds: entry.durationSeconds,
        requiresGift: entry.id === 'gift'
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
    complete: complete,
    query: query
  });
});
