(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports
    ? factory(
      require('../content/event-templates.js'),
      require('../content/sects.js'),
      require('../content/regions.js'),
      require('./relationships.js'),
      require('./inventory.js')
    )
    : factory(
      root && root.EventTemplateContent,
      root && root.SectContent,
      root && root.RegionContent,
      root && root.Relationships,
      root && root.Inventory
    );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.EventEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  EventTemplateContent,
  SectContent,
  RegionContent,
  Relationships,
  Inventory
) {
  'use strict';

  const PENDING_LIMIT = 20;
  const RECENT_LIMIT = 100;
  const SUMMARY_LIMIT = 300;
  const EVOLUTION_LIMIT = 500;
  const MONTH_SECONDS = 30 * 86400;
  const ALLOWED_CONTEXT = Object.freeze([
    'npcId',
    'npcName',
    'regionId',
    'regionName',
    'sectId',
    'sectName'
  ]);
  const EFFECT_TYPES = Object.freeze([
    'relationDelta',
    'setBondStage',
    'addItem',
    'removeItem',
    'setSect',
    'startSocialJob',
    'addSummary',
    'addEvolution',
    'setRomancePrinciple',
    'addBenefit',
    'addCultivation'
  ]);
  const FORBIDDEN_WAITING_LABELS = Object.freeze([
    'NPC' + '响应',
    '等待' + 'NPC',
    '系统' + '等待'
  ]);

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

  function response(ok, code, state, extra) {
    return Object.assign({
      ok: ok,
      code: code,
      state: state
    }, extra || {});
  }

  function eventSystem(model) {
    return model && model.systems && model.systems.events;
  }

  function registryList(templates) {
    if (Array.isArray(templates)) return templates.slice();
    if (templates && typeof templates.list === 'function') {
      return templates.list().slice();
    }
    return EventTemplateContent &&
      typeof EventTemplateContent.list === 'function'
      ? EventTemplateContent.list().slice()
      : [];
  }

  function templateById(templateId, templates) {
    const list = registryList(templates);
    for (let index = 0; index < list.length; index++) {
      if (list[index] && list[index].id === templateId) return list[index];
    }
    return null;
  }

  function htmlSafe(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function cleanContext(context) {
    const source = context && typeof context === 'object' &&
      !Array.isArray(context)
      ? context
      : {};
    const result = {};
    ALLOWED_CONTEXT.forEach(function (key) {
      if (typeof source[key] === 'string') result[key] = source[key];
    });
    return result;
  }

  function renderString(text, context) {
    if (typeof text !== 'string') return null;
    let invalid = false;
    const value = text.replace(/\{\{([A-Za-z][A-Za-z0-9]*)\}\}/g,
      function (match, key) {
        if (ALLOWED_CONTEXT.indexOf(key) < 0 ||
            !own(context, key)) {
          invalid = true;
          return '';
        }
        return htmlSafe(context[key]);
      });
    return invalid || /\{\{|\}\}/.test(value) ? null : value;
  }

  function renderValue(value, context) {
    if (typeof value === 'string') return renderString(value, context);
    if (value === null ||
        typeof value === 'number' ||
        typeof value === 'boolean') {
      return value;
    }
    if (Array.isArray(value)) {
      const renderedArray = [];
      for (let index = 0; index < value.length; index++) {
        const rendered = renderValue(value[index], context);
        if (rendered === undefined || rendered === null &&
            value[index] !== null) return undefined;
        renderedArray.push(rendered);
      }
      return renderedArray;
    }
    if (value && typeof value === 'object') {
      const output = {};
      const keys = Object.keys(value);
      for (let index = 0; index < keys.length; index++) {
        const rendered = renderValue(value[keys[index]], context);
        if (rendered === undefined ||
            rendered === null && value[keys[index]] !== null) {
          return undefined;
        }
        output[keys[index]] = rendered;
      }
      return output;
    }
    return undefined;
  }

  function npc(model, npcId) {
    const records = model &&
      model.systems &&
      model.systems.npcs &&
      model.systems.npcs.records;
    return records && own(records, npcId) ? records[npcId] : null;
  }

  function requirementMet(model, requirement) {
    if (!requirement || typeof requirement.type !== 'string') return false;
    if (requirement.type === 'npcLiving') {
      const person = npc(model, requirement.npcId);
      return Boolean(person && person.status === 'living');
    }
    if (requirement.type === 'bondStage') {
      const bond = Relationships.getBond(
        model,
        'player',
        requirement.npcId
      );
      return Boolean(bond && bond.stage === requirement.stage);
    }
    if (requirement.type === 'playerSect') {
      const playerSect = model.systems &&
        model.systems.sects &&
        model.systems.sects.player;
      return Boolean(playerSect &&
        playerSect.sectId === requirement.sectId);
    }
    if (requirement.type === 'playerHasSect') {
      const playerSect = model.systems &&
        model.systems.sects &&
        model.systems.sects.player;
      return Boolean(playerSect && typeof playerSect.sectId === 'string');
    }
    if (requirement.type === 'region') {
      return model.player &&
        model.player.regionId === requirement.regionId;
    }
    return false;
  }

  function templateEligible(model, template, context) {
    const rendered = renderValue(
      Array.isArray(template.requirements) ? template.requirements : [],
      cleanContext(context)
    );
    return Array.isArray(rendered) &&
      rendered.every(function (requirement) {
        return requirementMet(model, requirement);
      });
  }

  function eligibleTemplates(model, context, templates) {
    return deepFreeze(registryList(templates)
      .filter(function (template) {
        return template &&
          typeof template.id === 'string' &&
          templateEligible(model, template, context);
      })
      .sort(function (left, right) {
        return left.id.localeCompare(right.id);
      }));
  }

  function nextEventId(events) {
    const value = Number.isSafeInteger(events.nextId) && events.nextId > 0
      ? events.nextId
      : 1;
    events.nextId = value + 1;
    return 'event-' + value;
  }

  function instantiate(model, templateId, context, helpers, templates) {
    const template = templateById(templateId, templates);
    const events = eventSystem(model);
    if (!template || !events) {
      return response(false, template ? 'invalid_state' : 'unknown_template',
        model);
    }
    const clean = cleanContext(context);
    if (!templateEligible(model, template, clean)) {
      return response(false, 'requirements_invalid', model);
    }
    const title = renderString(template.title, clean);
    const body = renderString(template.body, clean);
    const options = renderValue(template.options, clean);
    if (title === null || body === null ||
        !Array.isArray(options) ||
        options.length === 0) {
      return response(false, 'invalid_template', model);
    }
    const state = clone(model);
    if (!state) return response(false, 'invalid_state', model);
    const id = nextEventId(state.systems.events);
    const now = helpers && typeof helpers.nowSeconds === 'function'
      ? helpers.nowSeconds()
      : 0;
    const participants = [];
    if (clean.npcId) participants.push(clean.npcId);
    const event = {
      id: id,
      templateId: template.id,
      templateRevision: template.revision,
      createdAt: now,
      participants: participants,
      context: clean,
      title: title,
      body: body,
      options: options
    };
    return response(true, 'ok', state, {
      event: deepFreeze(clone(event))
    });
  }

  function enqueue(model, event) {
    const state = clone(model);
    const snapshot = clone(event);
    const events = state && eventSystem(state);
    if (!events || !snapshot || typeof snapshot.id !== 'string') {
      return response(false, 'invalid_event', model);
    }
    if (!Array.isArray(events.pending)) events.pending = [];
    if (events.pending.some(function (entry) {
      return entry.id === snapshot.id;
    })) {
      return response(true, 'no_change', state);
    }
    if (events.pending.length >= PENDING_LIMIT) {
      return response(false, 'pending_capacity', model);
    }
    events.pending.push(snapshot);
    return response(true, 'ok', state);
  }

  function rangeContains(ranges, numericId) {
    return Array.isArray(ranges) && ranges.some(function (range) {
      return Array.isArray(range) &&
        range.length === 2 &&
        numericId >= range[0] &&
        numericId <= range[1];
    });
  }

  function resolvedAlready(events, eventId) {
    if (Array.isArray(events.resolvedRecent) &&
        events.resolvedRecent.some(function (entry) {
          return entry && entry.id === eventId;
        })) {
      return true;
    }
    const match = /^event-([1-9][0-9]*)$/.exec(eventId);
    return match
      ? rangeContains(events.resolvedIdRanges, Number(match[1]))
      : false;
  }

  function hasSocialLock(model, npcId) {
    const jobs = model &&
      model.systems &&
      model.systems.parallel &&
      model.systems.parallel.jobs;
    return Array.isArray(jobs) && jobs.some(function (job) {
      return job && job.kind === 'social' && job.npcId === npcId;
    });
  }

  function validEffect(effect) {
    if (!effect ||
        typeof effect !== 'object' ||
        Array.isArray(effect) ||
        EFFECT_TYPES.indexOf(effect.type) < 0) {
      return false;
    }
    if (effect.type === 'relationDelta') {
      return typeof effect.sourceId === 'string' &&
        typeof effect.targetId === 'string' &&
        effect.values &&
        typeof effect.values === 'object' &&
        !Array.isArray(effect.values);
    }
    if (effect.type === 'setBondStage') {
      return typeof effect.firstId === 'string' &&
        typeof effect.secondId === 'string' &&
        typeof effect.stage === 'string';
    }
    if (effect.type === 'addItem' || effect.type === 'removeItem') {
      return typeof effect.itemId === 'string' &&
        Number.isSafeInteger(effect.quantity) &&
        effect.quantity > 0;
    }
    if (effect.type === 'setSect') {
      return effect.sectId === null ||
        Boolean(SectContent && typeof SectContent.get === 'function' &&
          SectContent.get(effect.sectId));
    }
    if (effect.type === 'startSocialJob') {
      return typeof effect.npcId === 'string' &&
        typeof effect.label === 'string' &&
        effect.label.length > 0 &&
        !FORBIDDEN_WAITING_LABELS.some(function (text) {
          return effect.label.indexOf(text) >= 0;
        }) &&
        Number.isFinite(effect.durationSeconds) &&
        effect.durationSeconds > 0 &&
        typeof effect.followupTemplateId === 'string';
    }
    if (effect.type === 'addSummary' ||
        effect.type === 'addEvolution') {
      return typeof effect.title === 'string' &&
        effect.title.length > 0;
    }
    if (effect.type === 'setRomancePrinciple') {
      return typeof effect.npcId === 'string' &&
        typeof effect.principleId === 'string';
    }
    if (effect.type === 'addBenefit') {
      return typeof effect.npcId === 'string' &&
        typeof effect.effectId === 'string' &&
        Number.isFinite(effect.durationSeconds) &&
        effect.durationSeconds > 0;
    }
    return effect.type === 'addCultivation' &&
      Number.isFinite(effect.amount) &&
      effect.amount >= 0;
  }

  function preflightEffects(model, effects) {
    if (!Array.isArray(effects)) return 'invalid_effect';
    for (let index = 0; index < effects.length; index++) {
      const effect = effects[index];
      if (!effect || EFFECT_TYPES.indexOf(effect.type) < 0) {
        return 'unknown_effect';
      }
      if (!validEffect(effect)) return 'invalid_effect';
      if (effect.type === 'startSocialJob' &&
          hasSocialLock(model, effect.npcId)) {
        return 'person_busy';
      }
    }
    return null;
  }

  function applyInventory(state, effect) {
    const delta = {};
    delta[effect.itemId] = effect.type === 'addItem'
      ? effect.quantity
      : -effect.quantity;
    const changed = Inventory.apply(state.player.inventory, delta);
    if (!changed || changed.ok !== true) return changed && changed.code;
    state.player.inventory = changed.value;
    return null;
  }

  function applyEffect(state, effect, event, atSeconds, effectIndex) {
    if (effect.type === 'relationDelta') {
      const changed = Relationships.applyDelta(
        state,
        effect.sourceId,
        effect.targetId,
        effect.values,
        atSeconds
      );
      if (!changed.ok) return changed.code;
      const next = clone(changed.state);
      Object.keys(state).forEach(function (key) { delete state[key]; });
      Object.keys(next).forEach(function (key) { state[key] = next[key]; });
      return null;
    }
    if (effect.type === 'setBondStage') {
      const changed = Relationships.setBondStage(
        state,
        effect.firstId,
        effect.secondId,
        effect.stage,
        event.id,
        atSeconds
      );
      if (!changed.ok) return changed.code;
      const next = clone(changed.state);
      Object.keys(state).forEach(function (key) { delete state[key]; });
      Object.keys(next).forEach(function (key) { state[key] = next[key]; });
      return null;
    }
    if (effect.type === 'addItem' || effect.type === 'removeItem') {
      return applyInventory(state, effect);
    }
    if (effect.type === 'setSect') {
      const playerSect = state.systems.sects.player;
      const previousSectId = playerSect.sectId;
      playerSect.sectId = effect.sectId;
      playerSect.joinedAt = effect.sectId === null ? null : atSeconds;
      playerSect.choiceEventOffered = effect.sectId !== null;
      playerSect.choiceAvailableAt = effect.sectId === null
        ? atSeconds + 86400
        : 0;
      if (previousSectId &&
          previousSectId !== effect.sectId) {
        if (!playerSect.contribution) playerSect.contribution = {};
        if (!playerSect.reputation) playerSect.reputation = {};
        playerSect.contribution[previousSectId] = Math.floor(
          (Number(playerSect.contribution[previousSectId]) || 0) * 0.8
        );
        playerSect.reputation[previousSectId] =
          (Number(playerSect.reputation[previousSectId]) || 0) - 5;
      }
      return null;
    }
    if (effect.type === 'startSocialJob') {
      if (!state.systems.parallel) state.systems.parallel = { jobs: [] };
      state.systems.parallel.jobs.push({
        id: 'social-job-' + event.id + '-' + (effectIndex + 1),
        kind: 'social',
        npcId: effect.npcId,
        sourceEventId: event.id,
        label: effect.label,
        remainingSeconds: effect.durationSeconds,
        totalSeconds: effect.durationSeconds,
        followupTemplateId: effect.followupTemplateId,
        context: clone(event.context) || {},
        ready: false,
        completionReported: false
      });
      return null;
    }
    if (effect.type === 'addSummary' ||
        effect.type === 'addEvolution') {
      const key = effect.type === 'addSummary' ? 'summaries' : 'evolution';
      if (!Array.isArray(state.systems.events[key])) {
        state.systems.events[key] = [];
      }
      state.systems.events[key].push({
        id: event.id + '-' + key + '-' + (effectIndex + 1),
        category: effect.category || 'world',
        title: effect.title,
        at: atSeconds
      });
      return null;
    }
    if (effect.type === 'setRomancePrinciple') {
      const person = npc(state, effect.npcId);
      if (!person) return 'unknown_person';
      person.romancePrincipleId = effect.principleId;
      return null;
    }
    if (effect.type === 'addBenefit') {
      const social = state.systems.social;
      const nextId = Number.isSafeInteger(social.nextBenefitId)
        ? social.nextBenefitId
        : 1;
      social.nextBenefitId = nextId + 1;
      social.benefits.push({
        id: 'social-benefit-' + nextId,
        sourceNpcId: effect.npcId,
        effectId: effect.effectId,
        remainingSeconds: effect.durationSeconds,
        totalSeconds: effect.durationSeconds
      });
      return null;
    }
    if (effect.type === 'addCultivation') {
      state.player.cultivation =
        (Number.isFinite(state.player.cultivation)
          ? state.player.cultivation
          : 0) + effect.amount;
      return null;
    }
    return 'unknown_effect';
  }

  function compactHistory(events) {
    if (!Array.isArray(events.resolvedRecent)) events.resolvedRecent = [];
    if (!Array.isArray(events.resolvedIdRanges)) {
      events.resolvedIdRanges = [];
    }
    while (events.resolvedRecent.length > RECENT_LIMIT) {
      const old = events.resolvedRecent.shift();
      const match = old && /^event-([1-9][0-9]*)$/.exec(old.id);
      if (!match) continue;
      const numeric = Number(match[1]);
      events.resolvedIdRanges.push([numeric, numeric]);
    }
    events.resolvedIdRanges.sort(function (left, right) {
      return left[0] - right[0];
    });
    const merged = [];
    events.resolvedIdRanges.forEach(function (range) {
      const last = merged[merged.length - 1];
      if (last && range[0] <= last[1] + 1) {
        last[1] = Math.max(last[1], range[1]);
      } else {
        merged.push([range[0], range[1]]);
      }
    });
    events.resolvedIdRanges = merged;
    return events;
  }

  function resolve(model, eventId, optionId, helpers) {
    const sourceEvents = eventSystem(model);
    if (!sourceEvents) return response(false, 'invalid_state', model);
    if (resolvedAlready(sourceEvents, eventId)) {
      return response(true, 'already_resolved', clone(model));
    }
    const pending = Array.isArray(sourceEvents.pending)
      ? sourceEvents.pending
      : [];
    const eventIndex = pending.findIndex(function (entry) {
      return entry && entry.id === eventId;
    });
    if (eventIndex < 0) return response(false, 'unknown_event', model);
    const event = pending[eventIndex];
    const option = Array.isArray(event.options)
      ? event.options.find(function (entry) {
        return entry && entry.id === optionId;
      })
      : null;
    if (!option) return response(false, 'unknown_option', model);
    const preflight = preflightEffects(model, option.effects);
    if (preflight) return response(false, preflight, model);

    const state = clone(model);
    if (!state) return response(false, 'invalid_state', model);
    const events = state.systems.events;
    const workingEvent = events.pending[eventIndex];
    const atSeconds = helpers && typeof helpers.nowSeconds === 'function'
      ? helpers.nowSeconds()
      : 0;
    events.pending.splice(eventIndex, 1);
    if (!Array.isArray(events.resolvedRecent)) events.resolvedRecent = [];
    events.resolvedRecent.push({
      id: workingEvent.id,
      templateId: workingEvent.templateId,
      templateRevision: workingEvent.templateRevision,
      participants: clone(workingEvent.participants) || [],
      title: workingEvent.title,
      optionId: optionId,
      resolvedAt: atSeconds
    });
    for (let index = 0; index < option.effects.length; index++) {
      const failure = applyEffect(
        state,
        option.effects[index],
        workingEvent,
        atSeconds,
        index
      );
      if (failure) return response(false, failure, model);
    }
    compactHistory(state.systems.events);
    return response(true, 'ok', state, {
      result: {
        eventId: eventId,
        optionId: optionId
      }
    });
  }

  function appendTo(model, key, entry) {
    const state = clone(model);
    const snapshot = clone(entry);
    if (!state || !snapshot || !state.systems || !state.systems.events) {
      return response(false, 'invalid_entry', model);
    }
    if (!Array.isArray(state.systems.events[key])) {
      state.systems.events[key] = [];
    }
    state.systems.events[key].push(snapshot);
    return response(true, 'ok', state);
  }

  function appendSummary(model, entry) {
    return appendTo(model, 'summaries', entry);
  }

  function appendEvolution(model, entry) {
    return appendTo(model, 'evolution', entry);
  }

  function resolveAutonomous(
    model,
    templateId,
    context,
    helpers,
    deps
  ) {
    const templates = deps && deps.templates;
    const template = templateById(templateId, templates);
    if (!template || template.scope !== 'world') {
      return response(false, 'not_autonomous', model);
    }
    const created = instantiate(
      model,
      templateId,
      context,
      helpers,
      templates
    );
    if (!created.ok) return created;
    const event = clone(created.event);
    const option = event.options[0];
    const unsafe = option.effects.some(function (effect) {
      return effect.type !== 'addSummary' &&
        effect.type !== 'addEvolution' &&
        effect.type !== 'relationDelta' &&
        effect.type !== 'setBondStage';
    });
    if (unsafe) return response(false, 'autonomous_effect_forbidden', model);
    const preflight = preflightEffects(created.state, option.effects);
    if (preflight) return response(false, preflight, model);
    const state = clone(created.state);
    const atSeconds = helpers && typeof helpers.nowSeconds === 'function'
      ? helpers.nowSeconds()
      : 0;
    if (!Array.isArray(state.systems.events.resolvedRecent)) {
      state.systems.events.resolvedRecent = [];
    }
    state.systems.events.resolvedRecent.push({
      id: event.id,
      templateId: event.templateId,
      templateRevision: event.templateRevision,
      participants: clone(event.participants) || [],
      title: event.title,
      optionId: option.id,
      resolvedAt: atSeconds
    });
    for (let index = 0; index < option.effects.length; index++) {
      const failure = applyEffect(
        state,
        option.effects[index],
        event,
        atSeconds,
        index
      );
      if (failure) return response(false, failure, model);
    }
    compactHistory(state.systems.events);
    return response(true, 'ok', state, {
      result: { eventId: event.id, optionId: option.id }
    });
  }

  function rollDailyBudget(helpers) {
    const value = helpers && typeof helpers.random === 'function'
      ? helpers.random()
      : 0;
    const roll = Number.isFinite(value) && value >= 0 && value < 1
      ? value
      : 0;
    return 5 + Math.min(5, Math.floor(roll * 6));
  }

  function regionName(regionId) {
    const region = RegionContent &&
      typeof RegionContent.get === 'function'
      ? RegionContent.get(regionId)
      : null;
    return region && region.name ? region.name : regionId;
  }

  function spontaneousTemplate(template) {
    if (!template || template.scope !== 'player') return false;
    if (template.id === 'sect-first-choice' ||
        template.id === 'sect-leave-request') return false;
    return template.id.indexOf('followup') < 0;
  }

  function schedulePlayerEvent(model, helpers, deps) {
    const state = clone(model);
    const events = eventSystem(state);
    if (!events || !events.day) {
      return response(false, 'invalid_state', model);
    }
    events.day.attempted =
      (Number.isSafeInteger(events.day.attempted)
        ? events.day.attempted
        : 0) + 1;
    if (!Array.isArray(events.pending)) events.pending = [];
    if (events.pending.length >= PENDING_LIMIT) {
      return response(false, 'pending_capacity', state);
    }
    if (events.day.created >= events.day.budget) {
      return response(false, 'daily_budget_complete', state);
    }
    const templates = registryList(deps && deps.templates)
      .filter(spontaneousTemplate);
    const npcs = state.systems && state.systems.npcs;
    const records = npcs && npcs.records || {};
    const ids = (npcs && Array.isArray(npcs.activeIds)
      ? npcs.activeIds
      : Object.keys(records)).filter(function (id) {
      return records[id] && records[id].status === 'living';
    }).sort();
    const now = helpers && typeof helpers.nowSeconds === 'function'
      ? Math.max(0, Number(helpers.nowSeconds()) || 0)
      : 0;
    const candidates = [];
    ids.forEach(function (npcId) {
      const person = records[npcId];
      const context = {
        npcId: npcId,
        npcName: person.identity && person.identity.name
          ? person.identity.name
          : npcId,
        regionId: person.regionId || state.player.regionId,
        regionName: regionName(
          person.regionId || state.player.regionId
        )
      };
      templates.forEach(function (template) {
        const cooldownKey = template.id + '|' + npcId;
        if (Number(events.cooldowns[cooldownKey]) > now) return;
        if (!templateEligible(state, template, context)) return;
        candidates.push({
          template: template,
          context: context,
          cooldownKey: cooldownKey
        });
      });
    });
    if (candidates.length === 0) {
      return response(false, 'no_eligible_event', state);
    }
    candidates.sort(function (left, right) {
      return left.template.id.localeCompare(right.template.id) ||
        left.context.npcId.localeCompare(right.context.npcId);
    });
    const randomValue = helpers && typeof helpers.random === 'function'
      ? helpers.random()
      : 0;
    const safeRandom = Number.isFinite(randomValue) &&
      randomValue >= 0 && randomValue < 1 ? randomValue : 0;
    const selected = candidates[Math.min(
      candidates.length - 1,
      Math.floor(safeRandom * candidates.length)
    )];
    const made = instantiate(
      state,
      selected.template.id,
      selected.context,
      { nowSeconds: function () { return now; } },
      templates
    );
    if (!made.ok) return made;
    const queued = enqueue(made.state, made.event);
    if (!queued.ok) return queued;
    queued.state.systems.events.day.attempted = events.day.attempted;
    queued.state.systems.events.day.created =
      (Number(queued.state.systems.events.day.created) || 0) + 1;
    queued.state.systems.events.cooldowns[selected.cooldownKey] =
      now + Math.max(0, Number(selected.template.cooldownSeconds) || 0);
    return response(true, 'ok', queued.state, { event: made.event });
  }

  function historyTime(entry) {
    if (Number.isFinite(entry && entry.at)) return entry.at;
    if (Number.isFinite(entry && entry.resolvedAt)) return entry.resolvedAt;
    return 0;
  }

  function importantIds(entry) {
    const result = [];
    ['npcId', 'sectId', 'sourceNpcId', 'targetNpcId'].forEach(function (key) {
      if (entry && typeof entry[key] === 'string' &&
          result.indexOf(entry[key]) < 0) result.push(entry[key]);
    });
    return result;
  }

  function compactRows(events, key, limit) {
    if (!Array.isArray(events[key])) events[key] = [];
    if (!Array.isArray(events.compacted)) events.compacted = [];
    const removeCount = Math.max(0, events[key].length - limit);
    if (removeCount === 0) return;
    const groups = {};
    events[key].slice(0, removeCount).forEach(function (entry) {
      const month = Math.floor(historyTime(entry) / MONTH_SECONDS);
      const category = entry && entry.category || 'world';
      const id = 'compact-' + key + '-' + month + '-' + category;
      if (!groups[id]) {
        groups[id] = {
          id: id,
          source: key,
          monthIndex: month,
          category: category,
          count: 0,
          importantIds: []
        };
      }
      groups[id].count++;
      importantIds(entry).forEach(function (importantId) {
        if (groups[id].importantIds.indexOf(importantId) < 0) {
          groups[id].importantIds.push(importantId);
        }
      });
    });
    Object.keys(groups).sort().forEach(function (id) {
      const existing = events.compacted.find(function (entry) {
        return entry && entry.id === id;
      });
      if (existing) {
        existing.count += groups[id].count;
        groups[id].importantIds.forEach(function (importantId) {
          if (existing.importantIds.indexOf(importantId) < 0) {
            existing.importantIds.push(importantId);
          }
        });
      } else {
        events.compacted.push(groups[id]);
      }
    });
    events[key] = events[key].slice(removeCount);
  }

  function compactWorldHistory(model) {
    const state = clone(model);
    const events = eventSystem(state);
    if (!events) return model;
    compactRows(events, 'summaries', SUMMARY_LIMIT);
    compactRows(events, 'evolution', EVOLUTION_LIMIT);
    return state;
  }

  function resolvedWorldEvent(
    state,
    category,
    title,
    participants,
    atSeconds
  ) {
    const events = state.systems.events;
    const id = nextEventId(events);
    if (!Array.isArray(events.resolvedRecent)) events.resolvedRecent = [];
    events.resolvedRecent.push({
      id: id,
      templateId: 'autonomous-' + category,
      templateRevision: 1,
      participants: participants.slice(),
      title: title,
      optionId: 'world-result',
      resolvedAt: atSeconds
    });
    return id;
  }

  function resolveAutonomousBondStage(
    model,
    firstId,
    secondId,
    stage,
    title,
    helpers
  ) {
    const state = clone(model);
    if (!eventSystem(state)) return response(false, 'invalid_state', model);
    const at = helpers && typeof helpers.nowSeconds === 'function'
      ? Math.max(0, Number(helpers.nowSeconds()) || 0)
      : 0;
    const id = resolvedWorldEvent(
      state,
      'relationship',
      title,
      [firstId, secondId],
      at
    );
    const changed = Relationships.setBondStage(
      state,
      firstId,
      secondId,
      stage,
      id,
      at
    );
    if (!changed.ok) return response(false, changed.code, model);
    if (!Array.isArray(changed.state.systems.events.evolution)) {
      changed.state.systems.events.evolution = [];
    }
    changed.state.systems.events.evolution.push({
      id: id + '-evolution',
      category: 'relationship',
      sourceNpcId: firstId,
      targetNpcId: secondId,
      title: title,
      at: at
    });
    compactHistory(changed.state.systems.events);
    return response(true, 'ok', changed.state, { eventId: id });
  }

  function resolveAutonomousNpcSect(model, npcId, sectId, helpers) {
    const state = clone(model);
    const person = npc(state, npcId);
    if (!person ||
        !(sectId === null ||
          SectContent && typeof SectContent.get === 'function' &&
          SectContent.get(sectId))) {
      return response(false, 'invalid_membership', model);
    }
    const at = helpers && typeof helpers.nowSeconds === 'function'
      ? Math.max(0, Number(helpers.nowSeconds()) || 0)
      : 0;
    const title = (person.identity && person.identity.name || npcId) +
      (sectId === null ? '离开了原有宗门' : '加入了新的宗门');
    const id = resolvedWorldEvent(
      state,
      'sect-membership',
      title,
      [npcId],
      at
    );
    person.sectId = sectId;
    if (!Array.isArray(state.systems.events.evolution)) {
      state.systems.events.evolution = [];
    }
    state.systems.events.evolution.push({
      id: id + '-evolution',
      category: 'sect',
      npcId: npcId,
      sectId: sectId,
      title: title,
      at: at
    });
    compactHistory(state.systems.events);
    return response(true, 'ok', state, { eventId: id });
  }

  return Object.freeze({
    eligibleTemplates: eligibleTemplates,
    instantiate: instantiate,
    enqueue: enqueue,
    resolve: resolve,
    resolveAutonomous: resolveAutonomous,
    appendSummary: appendSummary,
    appendEvolution: appendEvolution,
    rollDailyBudget: rollDailyBudget,
    schedulePlayerEvent: schedulePlayerEvent,
    compactWorldHistory: compactWorldHistory,
    resolveAutonomousBondStage: resolveAutonomousBondStage,
    resolveAutonomousNpcSect: resolveAutonomousNpcSect,
    compactHistory: function (model) {
      const state = clone(model);
      if (!state || !eventSystem(state)) return model;
      compactHistory(state.systems.events);
      return state;
    },
    hasSocialLock: hasSocialLock
  });
});
