// ============================================================
// ui-skills.js — XiuxianUi page module (classic script, no bundler)
// ============================================================
(function () {
  var Ui = window.XiuxianUi = window.XiuxianUi || {};
    'use strict';

  function buildProduction(navName, c) {
    const info = Ui.api().queries.skillPage(navName);
    const refs = Ui.contentState.refs;
    refs.skillNavName = navName;
    Ui.buildSkillHead(c, info, 'production-page');
    if (!Array.isArray(info.recipes)) {
      const legacyGrid = Ui.el('div', 'action-grid skill-tile-grid', c);
      (info.actions || []).forEach(function (action) {
        const tile = Ui.createMinimalSkillTile(
          legacyGrid,
          action.locked ? 'locked' : ''
        );
        tile.badgeEl.textContent = action.locked ? '锁' : '制';
        tile.titleEl.textContent = action.name;
        tile.iconEl.textContent = (action.name || '·').charAt(0);
      });
      refs.legacyProduction = true;
      return;
    }
    refs.pageStructure = Ui.productionTopology(info);
    const grid = Ui.el('div', 'action-grid skill-tile-grid', c);
    refs.recipeCards = {};
    info.recipes.forEach(function (recipe) {
      const tile = Ui.createSkillActionTile(
        grid,
        'recipe-card' + (recipe.unlocked ? '' : ' locked')
      );
      refs.recipeCards[recipe.recipeId] = tile;
      Ui.updateProductionCard(tile, recipe, info.title || navName);
    });
  }

  function liveProduction(navName) {
    const info = Ui.api().queries.skillPage(navName);
    const refs = Ui.contentState.refs;
    Ui.updateSkillHead(info);
    if (refs.legacyProduction || !Array.isArray(info.recipes)) return;
    if (refs.pageStructure !== Ui.productionTopology(info)) {
      Ui.rebuildContent(navName);
      return;
    }
    info.recipes.forEach(function (recipe) {
      const ref = refs.recipeCards[recipe.recipeId];
      if (!ref) return;
      Ui.updateProductionCard(ref, recipe, info.title || navName);
    });
    Ui.updateSkillActionModal();
  }

  function gatherTopology(info) {
    const resources = Array.isArray(info.resources) && info.resources.length
      ? info.resources
      : (info.resource ? [info.resource] : []);
    return JSON.stringify({
      skillId: info.skillId,
      explore: info.explore ? info.explore.actionKey : null,
      resources: resources.map(function (row) {
        return {
          instanceId: row.instanceId,
          entryId: row.entryId,
          actionKey: row.actionKey,
          drops: (row.drops || []).map(function (drop) {
            return drop.itemId;
          })
        };
      }),
      spots: info.spots.map(function (spot) {
        return {
          spotId: spot.spotId,
          actionKey: spot.actionKey,
          species: spot.species.map(function (species) {
            return species.speciesId;
          })
        };
      })
    });
  }

  function updateExploreCard(ref, explore, navTitle, skillId) {
    const skillXp = Number(explore.skillXp) || 0;
    const masteryXp = Number(explore.masteryXp) || 0;
    ref.cardEl.classList.toggle('active', !!explore.active);
    ref.badgeEl.textContent = '探索';
    ref.badgeEl.className = 'tile-badge badge-explore';
    Ui.setTileIcon(
      ref.iconEl,
      null,
      Ui.SKILL_TILE_GLYPHS[skillId] || '探'
    );
    ref.titleEl.textContent = explore.name;
    const maxCapacity = Number(explore.maxCapacity) || 0;
    Ui.updateSkillActionTileMeta(
      ref,
      maxCapacity > 0 ? ('储量上限 ' + maxCapacity) : ''
    );
    Ui.updateSkillActionTileCountBadge(ref, null);
    Ui.updateSkillActionTileRewards(ref, {
      skillXp: skillXp,
      masteryXp: masteryXp,
      locked: false,
      skillTitle: '技能经验 +' + skillXp,
      masteryTitle: '探索精通经验 +' + masteryXp
    });
    Ui.updateSkillActionTileProgress(ref, {
      unlocked: true,
      active: explore.active,
      stalled: explore.stalled,
      progress: explore.progress,
      durationSeconds: explore.durationSeconds
    });
    Ui.wireSkillTileOpen(ref.cardEl, function () {
      Ui.openSkillActionModal({
        kind: 'explore',
        id: 'explore',
        nav: navTitle
      });
    });
  }

  function updateResourceCard(ref, resource, navTitle) {
    const skillXp = Number(resource.skillXp) || 0;
    const masteryXp = Ui.fishingExpectedMasteryXp(skillXp);
    const depleted = !(Number(resource.remaining) > 0);
    ref.cardEl.classList.toggle('active', !!resource.active);
    ref.cardEl.classList.toggle('is-depleted', depleted);
    ref.badgeEl.textContent = '采';
    ref.badgeEl.className = 'tile-badge badge-gather';
    const drop = resource.drops && resource.drops[0];
    Ui.setTileIcon(
      ref.iconEl,
      drop,
      (resource.name || '材').charAt(0)
    );
    ref.titleEl.textContent = resource.name;
    Ui.updateSkillActionTileMeta(ref, '');
    Ui.updateSkillActionTileCountBadge(
      ref,
      resource.capacity > 0 ? resource.remaining : null
    );
    Ui.updateSkillActionTileRewards(ref, {
      skillXp: skillXp,
      masteryXp: masteryXp,
      locked: false,
      skillTitle: '技能经验 +' + skillXp,
      masteryTitle: '精通经验 +' + masteryXp
    });
    Ui.updateSkillActionTileProgress(ref, {
      unlocked: true,
      active: resource.active,
      stalled: resource.stalled,
      progress: resource.progress,
      durationSeconds: resource.durationSeconds
    });
    Ui.wireSkillTileOpen(ref.cardEl, function () {
      Ui.openSkillActionModal({
        kind: 'resource',
        id: resource.instanceId || resource.entryId,
        nav: navTitle
      });
    });
  }

  function updateFishingCard(ref, spot, navTitle) {
    ref.cardEl.classList.toggle('locked', !spot.unlocked);
    ref.cardEl.classList.toggle('active', !!spot.active);
    ref.badgeEl.textContent = '钓';
    ref.badgeEl.className = 'tile-badge badge-fish';
    const first = spot.species && spot.species[0];
    Ui.setTileIcon(
      ref.iconEl,
      first ? { itemId: first.speciesId, name: first.name } : null,
      (spot.name || '鱼').charAt(0)
    );
    ref.titleEl.textContent = spot.name;
    Ui.updateSkillActionTileMeta(ref, '');
    Ui.updateSkillActionTileCountBadge(ref, null);
    Ui.updateFishingRewardIcons(ref, spot);
    Ui.updateSkillActionTileProgress(ref, {
      unlocked: spot.unlocked,
      active: spot.active,
      stalled: spot.stalled,
      progress: spot.progress,
      durationSeconds: spot.durationSeconds
    });
    Ui.wireSkillTileOpen(ref.cardEl, function () {
      Ui.openSkillActionModal({
        kind: 'fishing',
        id: spot.spotId,
        nav: navTitle
      });
    });
  }

  function buildGather(navName, c) {
    const info = Ui.api().queries.gatherPage(navName);
    const refs = Ui.contentState.refs;
    refs.skillId = info.skillId;
    refs.skillNavName = navName;
    Ui.buildSkillHead(c, info, 'gather-page');
    if (!Array.isArray(info.spots)) {
      const legacyGrid = Ui.el('div', 'action-grid skill-tile-grid', c);
      (info.cards || []).forEach(function (entry) {
        const tile = Ui.createMinimalSkillTile(
          legacyGrid,
          entry.locked ? 'locked' : ''
        );
        tile.badgeEl.textContent = entry.time ? '采' : '探索';
        tile.titleEl.textContent = entry.name;
        tile.iconEl.textContent = (entry.name || '·').charAt(0);
      });
      refs.legacyGather = true;
      return;
    }
    refs.pageStructure = gatherTopology(info);
    const grid = Ui.el('div', 'action-grid skill-tile-grid', c);
    refs.gatherSpots = {};
    refs.gatherResources = {};
    const navTitle = info.title || navName;
    const resources = Array.isArray(info.resources) && info.resources.length
      ? info.resources
      : (info.resource ? [info.resource] : []);
    if (info.explore) {
      const tile = Ui.createSkillActionTile(grid, 'explore-card');
      refs.gatherExplore = tile;
      updateExploreCard(tile, info.explore, navTitle, info.skillId);
    }
    resources.forEach(function (resource) {
      const tile = Ui.createSkillActionTile(grid, 'resource-card');
      const key = resource.instanceId || resource.entryId;
      refs.gatherResources[key] = tile;
      updateResourceCard(tile, resource, navTitle);
    });
    info.spots.forEach(function (spot) {
      const tile = Ui.createFishingSpotTile(
        grid,
        spot.unlocked ? '' : 'locked'
      );
      refs.gatherSpots[spot.spotId] = tile;
      updateFishingCard(tile, spot, navTitle);
    });
    if (!resources.length && info.skillId !== 'fishing') {
      Ui.el(
        'div',
        'gather-hint',
        c,
        '尚未探索，先前往探索'
      );
    }
  }

  function liveGather(navName) {
    const info = Ui.api().queries.gatherPage(navName);
    const refs = Ui.contentState.refs;
    refs.skillId = info.skillId;
    Ui.updateSkillHead(info);
    if (refs.legacyGather || !Array.isArray(info.spots)) return;
    if (refs.pageStructure !== gatherTopology(info)) {
      Ui.rebuildContent(navName);
      return;
    }
    const navTitle = info.title || navName;
    const resources = Array.isArray(info.resources) && info.resources.length
      ? info.resources
      : (info.resource ? [info.resource] : []);
    if (info.explore) {
      updateExploreCard(
        refs.gatherExplore,
        info.explore,
        navTitle,
        info.skillId
      );
    }
    resources.forEach(function (resource) {
      const key = resource.instanceId || resource.entryId;
      const ref = refs.gatherResources && refs.gatherResources[key];
      if (ref) updateResourceCard(ref, resource, navTitle);
    });
    info.spots.forEach(function (spot) {
      const ref = refs.gatherSpots[spot.spotId];
      if (ref) updateFishingCard(ref, spot, navTitle);
    });
    Ui.updateSkillActionModal();
  }


  Ui.buildProduction = buildProduction;
  Ui.liveProduction = liveProduction;
  Ui.gatherTopology = gatherTopology;
  Ui.updateExploreCard = updateExploreCard;
  Ui.updateResourceCard = updateResourceCard;
  Ui.updateFishingCard = updateFishingCard;
  Ui.buildGather = buildGather;
  Ui.liveGather = liveGather;

  (Ui.GATHER_NAV || []).forEach(function (navName) {
    Ui.registerPage('gather:' + navName, {
      build: function (nav, host) { buildGather(nav, host); },
      live: function (nav) { liveGather(nav); }
    });
  });
  (Ui.PRODUCTION_NAV || []).forEach(function (navName) {
    Ui.registerPage('production:' + navName, {
      build: function (nav, host) { buildProduction(nav, host); },
      live: function (nav) { liveProduction(nav); }
    });
  });

})();
