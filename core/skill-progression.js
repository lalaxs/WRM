(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else if (root) {
    root.SkillProgression = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const MAX_LEVEL = 99;

  function normalizedLevel(value) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return 1;
    return Math.min(MAX_LEVEL, Math.max(1, Math.floor(value)));
  }

  function nonNegativeInteger(value) {
    if (typeof value !== 'number' ||
        !Number.isFinite(value) ||
        value < 0) {
      return 0;
    }
    return Math.floor(value);
  }

  function ownDataValue(record, key) {
    try {
      if (!record ||
          (typeof record !== 'object' && typeof record !== 'function')) {
        return undefined;
      }
      const descriptor = Object.getOwnPropertyDescriptor(record, key);
      return descriptor &&
        Object.prototype.hasOwnProperty.call(descriptor, 'value')
        ? descriptor.value
        : undefined;
    } catch (error) {
      return undefined;
    }
  }

  function normalizedProgress(progress) {
    const level = normalizedLevel(ownDataValue(progress, 'level'));
    return {
      level,
      xp: level >= MAX_LEVEL
        ? 0
        : nonNegativeInteger(ownDataValue(progress, 'xp'))
    };
  }

  function skillXpNeed(level) {
    const cleanLevel = normalizedLevel(level);
    return cleanLevel >= MAX_LEVEL
      ? 0
      : Math.round(50 * Math.pow(cleanLevel, 1.8));
  }

  function masteryXpNeed(level) {
    const cleanLevel = normalizedLevel(level);
    return cleanLevel >= MAX_LEVEL
      ? 0
      : Math.round(50 * Math.pow(1.12, cleanLevel - 1));
  }

  function addXp(progress, amount, xpNeed) {
    const clean = normalizedProgress(progress);
    const addition = nonNegativeInteger(amount);
    let level = clean.level;
    let xp = clean.xp > Number.MAX_VALUE - addition
      ? Number.MAX_VALUE
      : clean.xp + addition;
    const levelsGained = [];

    while (level < MAX_LEVEL) {
      const need = xpNeed(level);
      if (xp < need) break;
      xp -= need;
      level++;
      levelsGained.push(level);
    }

    const capped = level >= MAX_LEVEL;
    return {
      value: {
        level,
        xp: capped ? 0 : xp
      },
      levelsGained,
      capped
    };
  }

  function addSkillXp(progress, amount) {
    return addXp(progress, amount, skillXpNeed);
  }

  function addMasteryXp(progress, amount) {
    return addXp(progress, amount, masteryXpNeed);
  }

  function skillSpeedBonus(level) {
    return Math.min(
      0.09,
      Math.floor(normalizedLevel(level) / 10) * 0.01
    );
  }

  function masterySpeedBonus(level) {
    return Math.min(
      0.18,
      Math.floor(normalizedLevel(level) / 10) * 0.02
    );
  }

  function masteryYieldOrRetentionChance(level) {
    return Math.min(
      0.19,
      Math.floor(normalizedLevel(level) / 5) * 0.01
    );
  }

  function roundedToThree(value) {
    if (Math.abs(value) >= 1e21) return value;
    return Number(value.toFixed(3));
  }

  function effectiveDuration(baseSeconds, skillLevel, masteryLevel) {
    const cleanBase = typeof baseSeconds === 'number' &&
      Number.isFinite(baseSeconds) &&
      baseSeconds >= 0
      ? baseSeconds
      : 0;
    const duration = cleanBase *
      (1 - skillSpeedBonus(skillLevel)) *
      (1 - masterySpeedBonus(masteryLevel));
    return roundedToThree(Math.max(0.5, duration));
  }

  function hasExplicitSocialSource(context) {
    return ownDataValue(context, 'source') === 'social';
  }

  function gainCharmXp(progress, amount, context) {
    const clean = normalizedProgress(progress);
    if (!hasExplicitSocialSource(context)) {
      return {
        ok: false,
        code: 'charm_social_only',
        value: { level: clean.level, xp: clean.xp },
        levelsGained: [],
        capped: clean.level >= MAX_LEVEL
      };
    }
    const gained = addSkillXp(clean, amount);
    return {
      ok: true,
      code: 'ok',
      value: gained.value,
      levelsGained: gained.levelsGained,
      capped: gained.capped
    };
  }

  function charmBenefits(level) {
    const cleanLevel = normalizedLevel(level);
    return {
      positiveRelationMultiplier: roundedToThree(
        Math.min(1.49, 1 + (cleanLevel - 1) * 0.005)
      ),
      misunderstandingReduction: roundedToThree(
        Math.min(0.30, (cleanLevel - 1) * 0.003)
      )
    };
  }

  return Object.freeze({
    skillXpNeed,
    masteryXpNeed,
    addSkillXp,
    addMasteryXp,
    skillSpeedBonus,
    masterySpeedBonus,
    effectiveDuration,
    masteryYieldOrRetentionChance,
    gainCharmXp,
    charmBenefits
  });
});
