/*
 * 宗门藏宝阁 + 玩家职阶。
 * 与 NPC 同一套原版职阶（弟子/长老/峰主/掌门）；
 * 玩家额外可用贡献主动申请升阶，突破时也会按 retjob 同步。
 */
(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports
    ? factory(
      require('../content/sect-pavilion.js'),
      require('../content/techniques.js'),
      require('./dns.js'),
      require('../content/sect-offices.js')
    )
    : factory(
      root && root.SectPavilionContent,
      root && root.TechniqueContent,
      root && root.Dns,
      root && root.SectOfficeContent
    );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.SectPavilion = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  DefaultPavilionContent,
  DefaultTechniqueContent,
  DnsArg,
  SectOfficeContentArg
) {
  'use strict';

  function resolveDns() {
    if (DnsArg) return DnsArg;
    if (typeof globalThis !== 'undefined' && globalThis.Dns) return globalThis.Dns;
    if (typeof require === 'function') {
      try { return require('./dns.js'); } catch (e) { /* ignore */ }
    }
    return null;
  }

  function resolveOffices() {
    if (SectOfficeContentArg) return SectOfficeContentArg;
    if (typeof globalThis !== 'undefined' && globalThis.SectOfficeContent) {
      return globalThis.SectOfficeContent;
    }
    if (typeof require === 'function') {
      try { return require('../content/sect-offices.js'); } catch (e) { /* ignore */ }
    }
    return null;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function response(ok, code, state, extra) {
    return Object.assign({ ok: ok, code: code, state: state }, extra || {});
  }

  function pavilionContent(deps) {
    return deps && deps.pavilion ? deps.pavilion : DefaultPavilionContent;
  }

  function techniqueContent(deps) {
    return deps && deps.techniques ? deps.techniques : DefaultTechniqueContent;
  }

  function playerSect(model) {
    return model && model.systems && model.systems.sects &&
      model.systems.sects.player
      ? model.systems.sects.player
      : null;
  }

  function applyOfficeFields(sectPlayer, rank) {
    if (!sectPlayer || !rank) return;
    sectPlayer.discipleRank = rank.id;
    sectPlayer.officeSlotId = rank.id;
    sectPlayer.job = typeof rank.job === 'number' ? rank.job : 0;
  }

  function ensureDiscipleState(sectPlayer) {
    if (!sectPlayer) return null;
    const content = DefaultPavilionContent;
    const raw = typeof sectPlayer.discipleRank === 'string'
      ? sectPlayer.discipleRank
      : (typeof sectPlayer.officeSlotId === 'string'
        ? sectPlayer.officeSlotId
        : 'disciple');
    const rank = content.getRank(raw);
    applyOfficeFields(sectPlayer, rank);
    if (!Number.isFinite(sectPlayer.lifetimeContribution)) {
      sectPlayer.lifetimeContribution = 0;
    }
    return sectPlayer;
  }

  function contributionOf(sectPlayer, sectId) {
    if (!sectPlayer || !sectPlayer.contribution) return 0;
    return Math.max(0, Math.floor(Number(sectPlayer.contribution[sectId]) || 0));
  }

  function completedMissionCount(sectPlayer) {
    const ids = sectPlayer && sectPlayer.mission &&
      sectPlayer.mission.completedMissionIds;
    return Array.isArray(ids) ? ids.length : 0;
  }

  function realmStageOf(model) {
    return Math.max(
      0,
      Math.floor(Number(model && model.player && model.player.realmStage) || 0)
    );
  }

  function rankMeets(content, haveRankId, needRankId) {
    const have = content.getRank(haveRankId);
    const need = content.getRank(needRankId);
    return (have.order || 0) >= (need.order || 0);
  }

  function labeledRank(content, sectId, rank) {
    if (!rank) return null;
    const offices = resolveOffices();
    let label = rank.label;
    let shortLabel = rank.shortLabel;
    if (offices && typeof offices.sectOfficeTitle === 'function' && sectId) {
      const title = offices.sectOfficeTitle(sectId, rank.id);
      if (title) {
        label = title;
        shortLabel = title;
      }
    }
    return {
      id: rank.id,
      label: label,
      shortLabel: shortLabel,
      order: rank.order,
      job: rank.job,
      minContribution: rank.minContribution,
      minMissions: rank.minMissions,
      minRealm: rank.minRealm
    };
  }

  function promotionGate(content, sectPlayer, sectId, model, targetRank) {
    const rank = targetRank ||
      content.nextRank(sectPlayer.discipleRank, sectId);
    if (!rank) {
      return {
        ok: false,
        rank: null,
        reasons: ['已是当前可晋升的最高地位']
      };
    }
    const contribution = Math.max(
      contributionOf(sectPlayer, sectId),
      Math.floor(Number(sectPlayer.lifetimeContribution) || 0)
    );
    const missions = completedMissionCount(sectPlayer);
    const realm = realmStageOf(model);
    const reasons = [];
    if (contribution < rank.minContribution) {
      reasons.push(
        '贡献不足（需 ' + rank.minContribution + '，当前 ' + contribution + '）'
      );
    }
    if (missions < rank.minMissions) {
      reasons.push(
        '任务不足（需完成 ' + rank.minMissions + '，当前 ' + missions + '）'
      );
    }
    if (realm < rank.minRealm) {
      reasons.push(
        '境界不足（需达到第 ' + (rank.minRealm + 1) + ' 境）'
      );
    }
    // 峰主编制：与 NPC 共用 jobmax[fami]
    if (rank.id === 'peak') {
      const Dns = resolveDns();
      const offices = resolveOffices();
      const fami = Dns && Dns.sectFami && typeof Dns.sectFami[sectId] === 'number'
        ? Dns.sectFami[sectId]
        : 0;
      const max = Dns && Array.isArray(Dns.jobmax) ? (Dns.jobmax[fami] | 0) : 0;
      if (max <= 0 || (offices && !offices.getSlot(sectId, 'peak'))) {
        reasons.push('本宗无峰主编制');
      } else {
        const holders = model && model.systems && model.systems.sects &&
          model.systems.sects.records &&
          model.systems.sects.records[sectId] &&
          model.systems.sects.records[sectId].officeHolders;
        const peakN = holders && Array.isArray(holders.peak)
          ? holders.peak.length
          : 0;
        if (peakN >= max) reasons.push('峰主席位已满');
      }
    }
    if (rank.id === 'leader') {
      const record = model && model.systems && model.systems.sects &&
        model.systems.sects.records &&
        model.systems.sects.records[sectId];
      if (record && record.leaderId) {
        reasons.push('掌门位已有人任职');
      }
    }
    return {
      ok: reasons.length === 0,
      rank: labeledRank(content, sectId, rank),
      reasons: reasons
    };
  }

  function knownTechniqueLevel(player, techniqueId) {
    const known = player && player.techniques && player.techniques.known;
    if (!known || typeof known !== 'object') return 0;
    const row = known[techniqueId];
    if (!row || typeof row !== 'object') return 0;
    return Math.max(0, Math.floor(Number(row.level) || 0));
  }

  function grantTechnique(player, techniqueId, repeatXp) {
    if (!player.techniques || typeof player.techniques !== 'object') {
      player.techniques = { known: {} };
    }
    if (!player.techniques.known || typeof player.techniques.known !== 'object') {
      player.techniques.known = {};
    }
    const known = player.techniques.known;
    if (known[techniqueId] && known[techniqueId].level >= 1) {
      if (!repeatXp) {
        return { already: true, learned: false, xpGained: 0 };
      }
      known[techniqueId].level =
        Math.max(1, Math.floor(Number(known[techniqueId].level) || 1)) + 1;
      return { already: true, learned: false, xpGained: 1 };
    }
    known[techniqueId] = { level: 1 };
    return { already: false, learned: true, xpGained: 0 };
  }

  function buildOfferCard(model, sectPlayer, sectId, offer, content, techniques) {
    const tech = techniques.get(offer.techniqueId);
    if (!tech) return null;
    const rankOk = rankMeets(content, sectPlayer.discipleRank, offer.minRank);
    const realmOk = realmStageOf(model) >= offer.minRealm;
    const have = contributionOf(sectPlayer, sectId);
    const cost = Math.max(0, Math.floor(Number(offer.contributionCost) || 0));
    const owned = knownTechniqueLevel(model.player, offer.techniqueId) >= 1;
    const canBuy = rankOk && realmOk && have >= cost && (!owned || offer.repeatXp);
    const needRank = content.getRank(offer.minRank);
    return {
      techniqueId: offer.techniqueId,
      name: tech.name,
      contributionCost: cost,
      minRank: offer.minRank,
      minRankLabel: labeledRank(content, sectId, needRank).label,
      minRealm: offer.minRealm,
      requiredRealmIndex: offer.minRealm,
      rankOk: rankOk,
      realmOk: realmOk,
      owned: owned,
      canBuy: canBuy,
      repeatXp: !!offer.repeatXp
    };
  }

  function groupOffersByRealm(offers) {
    const buckets = Object.create(null);
    (offers || []).forEach(function (offer) {
      const key = String(Math.max(0, Math.floor(Number(offer.requiredRealmIndex) || 0)));
      if (!buckets[key]) buckets[key] = [];
      buckets[key].push(offer);
    });
    return Object.keys(buckets).sort(function (a, b) {
      return Number(a) - Number(b);
    }).map(function (key) {
      return {
        requiredRealmIndex: Number(key),
        offers: buckets[key]
      };
    });
  }

  function buildPavilionView(model, deps) {
    const content = pavilionContent(deps);
    const techniques = techniqueContent(deps);
    const sectPlayer = playerSect(model);
    if (!sectPlayer || !sectPlayer.sectId) {
      return {
        available: false,
        rank: labeledRank(content, null, content.getRank('disciple')),
        next: null,
        promotion: null,
        offers: [],
        contribution: 0
      };
    }
    ensureDiscipleState(sectPlayer);
    const sectId = sectPlayer.sectId;
    const rank = content.getRank(sectPlayer.discipleRank);
    const next = content.nextRank(sectPlayer.discipleRank, sectId);
    const promotion = promotionGate(content, sectPlayer, sectId, model, next);
    const offers = content.listOffers(sectId).map(function (offer) {
      return buildOfferCard(
        model,
        sectPlayer,
        sectId,
        offer,
        content,
        techniques
      );
    }).filter(Boolean);
    return {
      available: true,
      sectId: sectId,
      rank: labeledRank(content, sectId, rank),
      next: next ? labeledRank(content, sectId, next) : null,
      promotion: promotion,
      canPromote: !!(promotion && promotion.ok && next),
      contribution: contributionOf(sectPlayer, sectId),
      lifetimeContribution: Math.floor(
        Number(sectPlayer.lifetimeContribution) || 0
      ),
      completedMissions: completedMissionCount(sectPlayer),
      offers: offers,
      offerGroups: groupOffersByRealm(offers)
    };
  }

  function exchangeTechnique(model, techniqueId, deps) {
    const state = clone(model);
    const content = pavilionContent(deps);
    const techniques = techniqueContent(deps);
    const sectPlayer = playerSect(state);
    if (!sectPlayer || !sectPlayer.sectId) {
      return response(false, 'not_in_sect', model);
    }
    ensureDiscipleState(sectPlayer);
    const sectId = sectPlayer.sectId;
    const offer = content.getOffer(sectId, techniqueId);
    if (!offer) return response(false, 'unknown_offer', model);
    const tech = techniques.get(techniqueId);
    if (!tech || tech.sectId !== sectId) {
      return response(false, 'unknown_offer', model);
    }
    const card = buildOfferCard(
      state,
      sectPlayer,
      sectId,
      offer,
      content,
      techniques
    );
    if (!card || !card.canBuy) {
      if (card && card.owned && !offer.repeatXp) {
        return response(false, 'already_learned', state);
      }
      if (!rankMeets(content, sectPlayer.discipleRank, offer.minRank)) {
        return response(false, 'rank_locked', state);
      }
      if (realmStageOf(state) < offer.minRealm) {
        return response(false, 'realm_requirement', state);
      }
      return response(false, 'contribution_short', state);
    }
    const cost = card.contributionCost;
    sectPlayer.contribution[sectId] =
      contributionOf(sectPlayer, sectId) - cost;
    const grant = grantTechnique(state.player, techniqueId, !!offer.repeatXp);
    return response(true, 'ok', state, {
      techniqueId: techniqueId,
      name: tech.name,
      cost: cost,
      learned: grant.learned === true,
      already: grant.already === true,
      xpGained: grant.xpGained || 0
    });
  }

  function promoteDisciple(model, deps) {
    const state = clone(model);
    const content = pavilionContent(deps);
    const sectPlayer = playerSect(state);
    if (!sectPlayer || !sectPlayer.sectId) {
      return response(false, 'not_in_sect', model);
    }
    ensureDiscipleState(sectPlayer);
    const next = content.nextRank(sectPlayer.discipleRank, sectPlayer.sectId);
    const gate = promotionGate(
      content,
      sectPlayer,
      sectPlayer.sectId,
      state,
      next
    );
    if (!gate.ok || !gate.rank) {
      return response(false, 'promotion_locked', state, {
        reasons: gate.reasons || []
      });
    }
    applyOfficeFields(sectPlayer, content.getRank(gate.rank.id));
    return response(true, 'ok', state, {
      rankId: gate.rank.id,
      rankLabel: gate.rank.label
    });
  }

  // 对标 NPC changejob：突破后按 retjob 尝试升职（只升不降；编制满则停）。
  function syncAfterBreakthrough(model) {
    const Dns = resolveDns();
    const content = DefaultPavilionContent;
    const sectPlayer = playerSect(model);
    if (!sectPlayer || !sectPlayer.sectId || !Dns || typeof Dns.retjob !== 'function') {
      return model;
    }
    ensureDiscipleState(sectPlayer);
    const sectId = sectPlayer.sectId;
    const fami = Dns.sectFami && typeof Dns.sectFami[sectId] === 'number'
      ? Dns.sectFami[sectId]
      : 0;
    const level = typeof Dns.majorLevel === 'function'
      ? Dns.majorLevel(realmStageOf(model))
      : realmStageOf(model);
    const record = model.systems.sects.records &&
      model.systems.sects.records[sectId];
    const holders = record && record.officeHolders ? record.officeHolders : {};
    const peakCount = Array.isArray(holders.peak) ? holders.peak.length : 0;
    const leaderTaken = !!(record && record.leaderId) ||
      (Array.isArray(holders.leader) && holders.leader.length > 0);
    const honorTaken = Array.isArray(holders.honor) && holders.honor.length > 0;
    const nextJob = Dns.retjob(level, fami, {
      peakCount: peakCount,
      leaderTaken: leaderTaken,
      honorTaken: honorTaken,
      random: function () { return 1; }
    });
    const currentJob = typeof sectPlayer.job === 'number' ? sectPlayer.job : 0;
    if (nextJob <= currentJob) return model;
    let slotId = Dns.slotIdForJob ? Dns.slotIdForJob(nextJob) : 'disciple';
    const offices = resolveOffices();
    if (offices && typeof offices.getSlot === 'function' &&
        slotId !== 'disciple' && !offices.getSlot(sectId, slotId)) {
      slotId = nextJob >= 1 ? 'elder' : 'disciple';
    }
    applyOfficeFields(sectPlayer, content.getRank(slotId));
    return model;
  }

  function noteContributionGain(sectPlayer, sectId, amount) {
    if (!sectPlayer || !sectId) return;
    ensureDiscipleState(sectPlayer);
    const gain = Math.max(0, Math.floor(Number(amount) || 0));
    sectPlayer.lifetimeContribution =
      Math.max(0, Math.floor(Number(sectPlayer.lifetimeContribution) || 0)) +
      gain;
  }

  function resetDiscipleOnJoin(sectPlayer) {
    if (!sectPlayer) return;
    applyOfficeFields(sectPlayer, DefaultPavilionContent.getRank('disciple'));
  }

  return Object.freeze({
    ensureDiscipleState: ensureDiscipleState,
    buildPavilionView: buildPavilionView,
    exchangeTechnique: exchangeTechnique,
    promoteDisciple: promoteDisciple,
    syncAfterBreakthrough: syncAfterBreakthrough,
    noteContributionGain: noteContributionGain,
    resetDiscipleOnJoin: resetDiscipleOnJoin,
    promotionGate: promotionGate
  });
});
