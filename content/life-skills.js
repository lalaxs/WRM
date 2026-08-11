(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.LifeSkillContent = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.freeze(value);
    Object.keys(value).forEach(function (key) {
      deepFreeze(value[key]);
    });
    return value;
  }

  const SKILLS = deepFreeze({
    herb:        { id: 'herb', label: '采药', page: 'standalone', hasMastery: true },
    mining:      { id: 'mining', label: '采矿', page: 'standalone', hasMastery: true },
    woodcutting: { id: 'woodcutting', label: '伐木', page: 'standalone', hasMastery: true },
    fishing:     { id: 'fishing', label: '钓鱼', page: 'standalone', hasMastery: true },
    alchemy:     { id: 'alchemy', label: '炼丹', page: 'standalone', hasMastery: true },
    forging:     { id: 'forging', label: '炼器', page: 'standalone', hasMastery: true },
    cooking:     { id: 'cooking', label: '烹饪', page: 'standalone', hasMastery: true },
    talisman:    { id: 'talisman', label: '符箓', page: 'standalone', hasMastery: true },
    charm:       {
      id: 'charm',
      label: '魅力',
      page: 'relationship',
      hasMastery: false,
      xpSource: 'social'
    },
    beastTaming: { id: 'beastTaming', label: '御兽', page: 'homestead', hasMastery: true },
    farming:     { id: 'farming', label: '种植', page: 'homestead', hasMastery: true },
    formation:   { id: 'formation', label: '阵法', page: 'homestead', hasMastery: true }
  });

  function get(skillId) {
    return SKILLS[skillId] || null;
  }

  function list(page) {
    const skills = Object.values(SKILLS);
    return Object.freeze(page == null
      ? skills
      : skills.filter(function (skill) { return skill.page === page; }));
  }

  return Object.freeze({
    SKILLS: SKILLS,
    get: get,
    list: list
  });
});
