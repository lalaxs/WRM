(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports
    ? factory(require('./random.js'))
    : factory(root.GameRandom);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.TeamCombatEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (GameRandom) {
  'use strict';

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function alive(unit) { return unit && unit.fallen !== true && unit.hp > 0; }
  function normalizedSeed(seed) {
    return GameRandom && typeof GameRandom.normalizeSeed === 'function'
      ? GameRandom.normalizeSeed(seed)
      : (Number.isFinite(seed) ? seed : 1) >>> 0;
  }
  function draw(rngState) {
    return GameRandom.next(normalizedSeed(rngState));
  }
  function opponents(session, actor) {
    return actor.side === 'ally' ? session.teams.enemies : session.teams.allies;
  }
  function allies(session, actor) {
    return actor.side === 'ally' ? session.teams.allies : session.teams.enemies;
  }
  function findUnit(session, id) {
    return session.teams.allies.concat(session.teams.enemies).filter(function (unit) {
      return unit.id === id;
    })[0] || null;
  }
  function hpRatio(unit) {
    return unit.maxHp > 0 ? unit.hp / unit.maxHp : 0;
  }
  function compareByLowestHp(a, b) {
    return hpRatio(a) - hpRatio(b) || a.id.localeCompare(b.id);
  }
  function selectTarget(session, actor, targetRule, rngState) {
    const enemies = opponents(session, actor).filter(alive);
    const friends = allies(session, actor).filter(alive);
    const state = normalizedSeed(rngState);
    if (targetRule === 'self') return { targetId: actor.id, rngState: state };
    if (targetRule === 'lowestHpAlly') {
      const target = friends.slice().sort(compareByLowestHp)[0];
      return { targetId: target ? target.id : null, rngState: state };
    }
    if (targetRule === 'lowestHpEnemy') {
      const target = enemies.slice().sort(compareByLowestHp)[0];
      return { targetId: target ? target.id : null, rngState: state };
    }
    if (targetRule === 'randomEnemy') {
      if (!enemies.length) return { targetId: null, rngState: state };
      const rolled = draw(state);
      return {
        targetId: enemies[Math.floor(rolled.value * enemies.length)].id,
        rngState: rolled.seed
      };
    }
    const target = enemies.slice().sort(function (a, b) {
      return b.threat - a.threat || a.id.localeCompare(b.id);
    })[0];
    return { targetId: target ? target.id : null, rngState: state };
  }
  function applyDamage(target, amount) {
    let remaining = Math.max(0, Math.floor(amount));
    const shield = Math.max(0, target.shield || 0);
    const absorbed = Math.min(shield, remaining);
    target.shield = shield - absorbed;
    remaining -= absorbed;
    const applied = Math.min(Math.max(0, target.hp), remaining);
    target.hp = Math.max(0, target.hp - remaining);
    if (target.hp === 0) target.fallen = true;
    return applied;
  }
  function damageFor(actor, target, multiplier, defenseIgnore, critical) {
    const ignore = Math.max(0, Math.min(1, Number(defenseIgnore) || 0));
    const defense = Math.max(0, Number(target.defense) || 0) * (1 - ignore);
    let amount = Math.max(1, Math.floor((Number(actor.attack) || 0) - defense * 0.5));
    amount = Math.max(1, Math.floor(amount * (Number(multiplier) || 1)));
    return critical ? Math.max(1, Math.floor(amount * (actor.critDamage || 1.5))) : amount;
  }
  function recordDamage(actor, target, amount, critical, techniqueId, events, metrics) {
    const applied = applyDamage(target, amount);
    target.threat = (target.threat || 0) + applied * (actor.threatGain || 1);
    if (actor.side === 'ally') metrics.damageDealt += applied;
    else metrics.damageTaken += applied;
    events.push({
      type: 'damage',
      sourceId: actor.id,
      targetId: target.id,
      amount: applied,
      critical: critical,
      techniqueId: techniqueId || null,
      hit: true
    });
  }
  function applyStatus(target, status, state) {
    const rawId = status && (status.id || status.type);
    if (typeof rawId !== 'string' || !/^[A-Za-z0-9_-]+$/.test(rawId)) return;
    if (Object.prototype.hasOwnProperty.call(status, 'chance')) {
      const rolled = draw(state.rngState);
      state.rngState = rolled.seed;
      const chance = Math.max(0, Math.min(1, Number(status.chance) || 0));
      if (rolled.value >= chance) return;
    }
    const id = rawId === 'binding' ? 'slow' : rawId;
    const duration = Math.floor(Number(status.durationTicks) || 0);
    const applied = { id: id, remainingTicks: Math.max(1, duration) };
    ['attackIntervalTicks', 'attackIntervalAdd', 'skipNextAction'].forEach(function (key) {
      if (Object.prototype.hasOwnProperty.call(status, key) &&
          (typeof status[key] === 'boolean' || Number.isFinite(status[key]))) {
        applied[key] = status[key];
      }
    });
    target.statuses = target.statuses || {};
    target.statuses[id] = applied;
  }
  function mwiHitChance(accuracy, evasion) {
    const acc = Math.max(0, Number(accuracy) || 0);
    const eva = Math.max(0, Number(evasion) || 0);
    const accPower = Math.pow(acc, 1.4);
    const evaPower = Math.pow(eva, 1.4);
    const total = accPower + evaPower;
    if (!(total > 0)) return 0.5;
    return accPower / total;
  }
  function attack(session, actor, targetRule, effect, state, events, metrics, techniqueId) {
    const hits = Math.max(1, Math.floor(effect && effect.hits || 1));
    for (let index = 0; index < hits; index++) {
      const selected = selectTarget(session, actor, targetRule, state.rngState);
      state.rngState = selected.rngState;
      const target = findUnit(session, selected.targetId);
      if (!target) return;
      const hitRoll = draw(state.rngState);
      state.rngState = hitRoll.seed;
      const hitChance = mwiHitChance(actor.accuracy, target.evasion);
      if (hitRoll.value >= hitChance) {
        events.push({
          type: 'damage',
          sourceId: actor.id,
          targetId: target.id,
          amount: 0,
          critical: false,
          techniqueId: techniqueId || null,
          hit: false
        });
        continue;
      }
      const critRoll = draw(state.rngState);
      state.rngState = critRoll.seed;
      const critical = critRoll.value < (actor.critChance || 0);
      recordDamage(actor, target, damageFor(actor, target,
        effect && effect.multiplier, effect && effect.defenseIgnore, critical),
      critical, techniqueId, events, metrics);
      applyStatus(target, effect && effect.status, state);
    }
  }
  function conditionMet(session, actor, technique) {
    const condition = technique.condition || { type: 'always' };
    if (condition.type === 'allyHpBelow') {
      return allies(session, actor).some(function (unit) {
        return alive(unit) && hpRatio(unit) < condition.threshold;
      });
    }
    return true;
  }
  function executeTechnique(session, actor, technique, state, events, metrics) {
    const effect = technique.effect;
    if (!effect) return false;
    if (effect.type === 'attack' || effect.type === 'aoeAttack') {
      let multiplier = Number(effect.multiplier) || 1;
      if (effect.type === 'aoeAttack') {
        const enemies = opponents(session, actor).filter(alive);
        const count = Math.max(1, Math.min(4, enemies.length || 1));
        const coefficients = [1, 0.85, 0.72, 0.65];
        multiplier *= coefficients[count - 1];
        enemies.slice(0, count).forEach(function (target) {
          const hits = Math.max(1, Math.floor(effect.hits || 1));
          for (let index = 0; index < hits; index++) {
            const hitRoll = draw(state.rngState);
            state.rngState = hitRoll.seed;
            const hitChance = mwiHitChance(actor.accuracy, target.evasion);
            if (hitRoll.value >= hitChance) {
              events.push({
                type: 'damage',
                sourceId: actor.id,
                targetId: target.id,
                amount: 0,
                critical: false,
                techniqueId: technique.techniqueId || null,
                hit: false
              });
              continue;
            }
            const critRoll = draw(state.rngState);
            state.rngState = critRoll.seed;
            const critical = critRoll.value < (actor.critChance || 0);
            recordDamage(actor, target, damageFor(actor, target,
              multiplier, effect.defenseIgnore, critical),
            critical, technique.techniqueId, events, metrics);
            applyStatus(target, effect.status, state);
          }
        });
        return true;
      }
      attack(session, actor, technique.targetRule || 'highestThreatEnemy', effect,
        state, events, metrics, technique.techniqueId);
      return true;
    }
    if (effect.type === 'restoreQi') {
      const amount = Number(effect.amount) || 0;
      const ratio = Number(effect.maxQiRatio) || 0;
      const restore = amount + (actor.maxQi || 0) * ratio;
      const before = actor.qi || 0;
      actor.qi = Math.min(actor.maxQi || before, before + restore);
      events.push({
        type: 'restore_qi',
        sourceId: actor.id,
        targetId: actor.id,
        amount: (actor.qi || 0) - before,
        critical: false,
        techniqueId: technique.techniqueId,
        hit: true
      });
      return true;
    }
    if (effect.type === 'shield') {
      const selected = selectTarget(session, actor,
        technique.targetRule || 'self', state.rngState);
      state.rngState = selected.rngState;
      const target = findUnit(session, selected.targetId);
      if (!target) return false;
      const defenseFactor = Number(effect.defenseFactor) || 0;
      const maxHpRatio = Number(effect.maxHpRatio) || 0;
      const shield = Math.max(0,
        (actor.defense || 0) * defenseFactor +
        (target.maxHp || 0) * maxHpRatio);
      const cap = (target.maxHp || 0) * 0.5;
      target.shield = Math.min(cap, Math.max(target.shield || 0, shield));
      events.push({
        type: 'shield',
        sourceId: actor.id,
        targetId: target.id,
        amount: shield,
        critical: false,
        techniqueId: technique.techniqueId,
        hit: true
      });
      return true;
    }
    if (effect.type !== 'heal') return false;
    const selected = selectTarget(session, actor,
      technique.targetRule || 'lowestHpAlly', state.rngState);
    state.rngState = selected.rngState;
    const target = findUnit(session, selected.targetId);
    if (!target) return false;
    const ratioAmount = Number(effect.maxHpRatio) || 0;
    const fixedAmount = Number(effect.amount) || 0;
    const attackFactor = Number(effect.attackFactor) || 0;
    const amount = fixedAmount ||
      ((actor.attack || 0) * attackFactor + target.maxHp * ratioAmount);
    const before = target.hp;
    target.hp = Math.min(target.maxHp, target.hp + Math.round(amount * (actor.cooperation || 1)));
    target.fallen = target.hp <= 0;
    const healed = target.hp - before;
    actor.threat = (actor.threat || 0) + healed * 0.6;
    metrics.healingDone += healed;
    events.push({
      type: 'heal',
      sourceId: actor.id,
      targetId: target.id,
      amount: healed,
      critical: false,
      techniqueId: technique.techniqueId,
      hit: true
    });
    if (effect.purge === true) {
      const statuses = target.statuses || {};
      const purgeable = ['shock', 'slow', 'burn', 'poison'];
      let purged = null;
      for (let index = 0; index < purgeable.length; index++) {
        const statusId = purgeable[index];
        if (Object.prototype.hasOwnProperty.call(statuses, statusId)) {
          delete statuses[statusId];
          purged = statusId;
          break;
        }
      }
      events.push({
        type: 'purge',
        sourceId: actor.id,
        targetId: target.id,
        amount: purged ? 1 : 0,
        critical: false,
        techniqueId: technique.techniqueId,
        hit: true
      });
    }
    return true;
  }
  function act(session, actor, state, events, metrics) {
    if (!alive(actor) || actor.cooldownTicks > 0) return;
    const technique = (actor.techniques || []).filter(function (entry) {
      return conditionMet(session, actor, entry);
    })[0];
    if (technique && executeTechnique(session, actor, technique, state, events, metrics)) {
      actor.cooldownTicks = actor.actionIntervalTicks;
      return;
    }
    attack(session, actor, 'highestThreatEnemy', null, state, events, metrics, null);
    actor.cooldownTicks = actor.actionIntervalTicks;
  }
  function outcomeFor(session) {
    const alliesAlive = session.teams.allies.some(alive);
    const enemiesAlive = session.teams.enemies.some(alive);
    return enemiesAlive ? (alliesAlive ? 'continue' : 'allies_defeated') : 'enemies_defeated';
  }
  function advanceTick(session, context) {
    const next = clone(session);
    const state = { rngState: normalizedSeed(context && context.rngState) };
    const events = [];
    const metrics = { damageDealt: 0, damageTaken: 0, healingDone: 0 };
    next.teams.allies.concat(next.teams.enemies).forEach(function (unit) {
      if (unit.cooldownTicks > 0) unit.cooldownTicks--;
      if (unit.statuses && typeof unit.statuses === 'object') {
        Object.keys(unit.statuses).forEach(function (statusId) {
          const status = unit.statuses[statusId];
          if (!status) return;
          const remaining = Math.floor(Number(status.remainingTicks) || 0) - 1;
          if (remaining <= 0) delete unit.statuses[statusId];
          else status.remainingTicks = remaining;
        });
      }
    });
    next.teams.allies.concat(next.teams.enemies).forEach(function (unit) {
      act(next, unit, state, events, metrics);
    });
    next.elapsedTicks++;
    return {
      ok: true,
      session: next,
      rngState: state.rngState,
      outcome: outcomeFor(next),
      events: events,
      metrics: metrics
    };
  }

  return Object.freeze({ advanceTick: advanceTick, selectTarget: selectTarget });
});
