(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.LifecycleContent = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const WORLD_YEAR_SECONDS = 12 * 60 * 60;
  const PLAYER_SAFETY_BUFFER_YEARS = 1;
  const LINEAGE_RITUAL_SECONDS = 6 * 60 * 60;
  const CHILD_ADULT_AGE_YEARS = 18;

  const INHERITANCE_LEVEL_ONE = Object.freeze({
    level: 1,
    fullMasterySlots: 3,
    techniqueSlots: 2,
    equipmentSlots: 1,
    resourceTypeSlots: 3,
    resourcePercent: 0.25,
    spiritStonePercent: 0.10,
    premiumCurrencyPercent: 1
  });

  const NEW_IDENTITY_ORIGINS = Object.freeze([
    Object.freeze({ id: 'wanderingReborn', name: '散修新生' }),
    Object.freeze({ id: 'marketArtisan', name: '坊市匠户' }),
    Object.freeze({ id: 'herbalHouse', name: '采药世家' }),
    Object.freeze({ id: 'minorSectDependent', name: '小宗别院' }),
    Object.freeze({ id: 'frontierTraveler', name: '边地旅人' }),
    Object.freeze({ id: 'hiddenLineage', name: '隐世血脉' })
  ]);

  return Object.freeze({
    WORLD_YEAR_SECONDS: WORLD_YEAR_SECONDS,
    PLAYER_SAFETY_BUFFER_YEARS: PLAYER_SAFETY_BUFFER_YEARS,
    LINEAGE_RITUAL_SECONDS: LINEAGE_RITUAL_SECONDS,
    CHILD_ADULT_AGE_YEARS: CHILD_ADULT_AGE_YEARS,
    INHERITANCE_LEVEL_ONE: INHERITANCE_LEVEL_ONE,
    NEW_IDENTITY_ORIGINS: NEW_IDENTITY_ORIGINS
  });
});
