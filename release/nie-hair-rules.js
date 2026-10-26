(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.NieHairRules = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function qianIndices(set) {
    return Array.isArray(set.qian) ? set.qian.slice() : [set.qian];
  }

  // 仅列出「强制互配」的发型。未列入的前发/后发可自由混搭。
  // 例：男角色白发前后发只能彼此搭配。
  const EXCLUSIVE = Object.freeze({
    b: Object.freeze([
      Object.freeze({ id: 'white', label: '白发', hou: 0, qian: 0 })
    ]),
    g: Object.freeze([])
  });

  function buildLookup(gender) {
    const key = gender === 'b' ? 'b' : 'g';
    const houToSet = Object.create(null);
    const qianToSet = Object.create(null);
    (EXCLUSIVE[key] || []).forEach(function (set) {
      houToSet[set.hou] = set;
      qianIndices(set).forEach(function (qianIndex) {
        qianToSet[qianIndex] = set;
      });
    });
    return Object.freeze({
      sets: EXCLUSIVE[key] || Object.freeze([]),
      houToSet: houToSet,
      qianToSet: qianToSet
    });
  }

  const LOOKUP = Object.freeze({
    b: buildLookup('b'),
    g: buildLookup('g')
  });

  function genderKey(gender) {
    return gender === 'b' ? 'b' : 'g';
  }

  function lookupFor(gender) {
    return LOOKUP[genderKey(gender)];
  }

  function isValidPair(gender, hou, qian) {
    const table = lookupFor(gender);
    const houSet = table.houToSet[hou];
    const qianSet = table.qianToSet[qian];
    if (houSet) {
      return !!qianSet &&
        qianSet.id === houSet.id &&
        qianIndices(houSet).indexOf(qian) >= 0;
    }
    if (qianSet) {
      return !!houSet &&
        houSet.id === qianSet.id &&
        houSet.hou === hou;
    }
    return true;
  }

  function reconcileAfterChange(gender, parts, changedPart) {
    const hou = Number.isFinite(parts.hair_hou) ? parts.hair_hou : 0;
    const qian = Number.isFinite(parts.hair_qian) ? parts.hair_qian : 0;
    if (isValidPair(gender, hou, qian)) {
      return Object.assign({}, parts, { hair_hou: hou, hair_qian: qian });
    }
    const table = lookupFor(gender);
    if (changedPart === 'hair_hou') {
      const set = table.houToSet[hou];
      if (set) {
        return Object.assign({}, parts, {
          hair_hou: hou,
          hair_qian: qianIndices(set)[0]
        });
      }
      // 当前后发非锁定：若前发仍是锁定款，改到同套以外的默认前发 0 不合适；
      // 若前发是锁定款而新后发不匹配，把前发切到该锁定套的配对，或保留并换前发为 1（非白）
      if (table.qianToSet[qian]) {
        return Object.assign({}, parts, {
          hair_hou: hou,
          hair_qian: firstFreeQian(gender, qian)
        });
      }
    }
    if (changedPart === 'hair_qian') {
      const set = table.qianToSet[qian];
      if (set) {
        return Object.assign({}, parts, {
          hair_hou: set.hou,
          hair_qian: qian
        });
      }
      if (table.houToSet[hou]) {
        return Object.assign({}, parts, {
          hair_hou: firstFreeHou(gender, hou),
          hair_qian: qian
        });
      }
    }
    return Object.assign({}, parts, { hair_hou: hou, hair_qian: qian });
  }

  function firstFreeHou(gender, avoid) {
    const table = lookupFor(gender);
    for (let index = 0; index < 32; index++) {
      if (index === avoid) continue;
      if (!table.houToSet[index]) return index;
    }
    return 0;
  }

  function firstFreeQian(gender, avoid) {
    const table = lookupFor(gender);
    for (let index = 0; index < 32; index++) {
      if (index === avoid) continue;
      if (!table.qianToSet[index]) return index;
    }
    return 0;
  }

  function normalizeHairParts(gender, parts) {
    const hou = Number.isFinite(parts.hair_hou) ? parts.hair_hou : 0;
    const qian = Number.isFinite(parts.hair_qian) ? parts.hair_qian : 0;
    if (isValidPair(gender, hou, qian)) return parts;
    const table = lookupFor(gender);
    if (table.houToSet[hou]) {
      return reconcileAfterChange(gender, parts, 'hair_hou');
    }
    if (table.qianToSet[qian]) {
      return reconcileAfterChange(gender, parts, 'hair_qian');
    }
    return parts;
  }

  function stepHairPart(gender, parts, part, delta, listLength) {
    const count = Math.max(0, Number(listLength) || 0);
    if (count <= 0 || !Number.isFinite(delta) || delta === 0) return parts;
    if (part !== 'hair_hou' && part !== 'hair_qian') return parts;
    const current = Number.isFinite(parts[part]) ? parts[part] : 0;
    let next = (current + Math.trunc(delta)) % count;
    if (next < 0) next += count;
    const updated = Object.assign({}, parts);
    updated[part] = next;
    return reconcileAfterChange(gender, updated, part);
  }

  function randomHairParts(gender, parts, houCount, qianCount, rngValue) {
    let cursor = Number(rngValue);
    if (!Number.isFinite(cursor)) cursor = 0;
    cursor = cursor >>> 0;
    const houMax = Math.max(1, Number(houCount) || 1);
    const qianMax = Math.max(1, Number(qianCount) || 1);
    cursor = (Math.imul(cursor, 1664525) + 1013904223) >>> 0;
    const hou = cursor % houMax;
    cursor = (Math.imul(cursor, 1664525) + 1013904223) >>> 0;
    const qian = cursor % qianMax;
    return normalizeHairParts(gender, Object.assign({}, parts, {
      hair_hou: hou,
      hair_qian: qian
    }));
  }

  return Object.freeze({
    isValidPair: isValidPair,
    reconcileAfterChange: reconcileAfterChange,
    normalizeHairParts: normalizeHairParts,
    stepHairPart: stepHairPart,
    randomHairParts: randomHairParts
  });
});
