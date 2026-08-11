(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.GameRandom = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DEFAULT_SEED = 0x6D2B79F5;

  function normalizeSeed(value) {
    const seed = Number.isFinite(value) ? (value >>> 0) : DEFAULT_SEED;
    return seed === 0 ? DEFAULT_SEED : seed;
  }

  function fromEntropy(now, salt) {
    let value = (normalizeSeed(now) ^ normalizeSeed(salt)) >>> 0;
    value = Math.imul(value ^ (value >>> 16), 0x45D9F3B) >>> 0;
    value = Math.imul(value ^ (value >>> 16), 0x45D9F3B) >>> 0;
    value = (value ^ (value >>> 16)) >>> 0;
    return normalizeSeed(value);
  }

  function next(seed) {
    let value = normalizeSeed(seed);
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    value >>>= 0;
    return {
      seed: normalizeSeed(value),
      value: value / 0x100000000
    };
  }

  return Object.freeze({
    DEFAULT_SEED,
    normalizeSeed,
    fromEntropy,
    next
  });
});
