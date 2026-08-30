(function (root, factory) {
  'use strict';
  // 统一模板填空：eventId → EventTemplates；无模板 / 缺参 → 空串，上层跳过。
  const api = typeof module === 'object' && module.exports
    ? factory(
      require('../content/regions.js'),
      require('../content/sects.js'),
      require('../content/sect-offices.js'),
      require('../content/npc-generation.js'),
      require('../content/original-event-bindings.js'),
      require('../content/event-templates.js')
    )
    : factory(
      root && root.RegionContent,
      root && root.SectContent,
      root && root.SectOfficeContent,
      root && root.NpcGenerationContent,
      root && root.OriginalEventBindings,
      root && root.EventTemplates
    );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.WorldNarrativeFill = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  RegionContent,
  SectContent,
  SectOfficeContent,
  NpcGenerationContent,
  OriginalEventBindings,
  EventTemplates
) {
  'use strict';

  const GIFT_ITEMS = Object.freeze([
    '九棱玄晶',
    '一株百年灵芝',
    '半壶陈年灵酒',
    '一枚定向石',
    '一柄寒光短剑',
    '一袋新摘灵果',
    '三枚回气丹',
    '一卷残缺剑谱',
    '一对传音符',
    '一匹织锦护腕'
  ]);

  // 对标 af pet03/04/13/14；幼体对标 spet0/1
  const PET_FORMS = Object.freeze(['龙君', '龙女', '凤君', '凤女']);
  const YOUNG_PETS = Object.freeze(['幼龙', '雏凤']);
  const SWORD_SPIRITS = Object.freeze(['剑灵·霜鸣', '剑灵·焚心', '剑灵·流光', '剑灵·玄音']);
  const CRAFT_ITEMS = Object.freeze([
    '回气丹', '凝神丹', '养魂香', '护体符', '一瓶疗伤药'
  ]);
  const OFFICE_FALLBACKS = Object.freeze([
    '长老', '峰主', '执事', '真传弟子', '内门弟子'
  ]);
  const BABY_NAME_POOL = Object.freeze([
    '清衡', '和珩', '月宁', '安真', '青雪', '星予', '华辰', '渊昭',
    '灵犀', '景行', '望舒', '承影'
  ]);

  function regionName(regionId) {
    if (RegionContent && typeof RegionContent.get === 'function') {
      const region = RegionContent.get(regionId);
      if (region && typeof region.name === 'string') return region.name;
    }
    return regionId || '某处';
  }

  function personName(person) {
    const identity = person && person.identity;
    return identity && typeof identity.name === 'string'
      ? identity.name
      : '某人';
  }

  function personOfficeSuffix(person) {
    if (!person || !SectOfficeContent) return '';
    if (person.sectId) {
      const title = SectOfficeContent.sectOfficeTitle(
        person.sectId,
        person.officeSlotId
      );
      const sect = SectContent && typeof SectContent.get === 'function'
        ? SectContent.get(person.sectId)
        : null;
      if (sect && title) return '（' + sect.name + title + '）';
      if (title) return '（' + title + '）';
      if (sect) return '（' + sect.name + '）';
      return '';
    }
    const rogue = SectOfficeContent.getRogueTitle(person.rogueTitleId);
    return rogue ? '（' + rogue.title + '）' : '（散修）';
  }

  function regionIds() {
    if (RegionContent && Array.isArray(RegionContent.ids)) {
      return RegionContent.ids.slice();
    }
    if (RegionContent && typeof RegionContent.list === 'function') {
      return RegionContent.list().map(function (row) { return row.id; });
    }
    return [
      'qinglan-town',
      'yunzhou-city',
      'jade-market',
      'eastern-sect-heights',
      'western-sect-valley',
      'mistwood',
      'redstone-wilds',
      'mirror-realm'
    ];
  }

  function randomOf(list, random) {
    if (!list || !list.length) return null;
    const roll = typeof random === 'function' ? random() : Math.random();
    return list[Math.floor(roll * list.length) % list.length];
  }

  function ensureGiftLabel(giftLabel, random) {
    if (typeof giftLabel === 'string' && giftLabel.trim()) return giftLabel.trim();
    return pickGiftItem(random);
  }

  function pickPetForm(random) {
    return randomOf(PET_FORMS, random) || '龙君';
  }

  function pickYoungPet(random) {
    return randomOf(YOUNG_PETS, random) || '幼龙';
  }

  function pickLinggenName(random) {
    const roots = NpcGenerationContent &&
      Array.isArray(NpcGenerationContent.SPIRITUAL_ROOTS)
      ? NpcGenerationContent.SPIRITUAL_ROOTS
      : null;
    if (roots && roots.length) {
      const row = randomOf(roots, random);
      if (row && row.name) return row.name;
    }
    return randomOf([
      '天灵根', '单灵根', '双灵根', '三灵根', '变异灵根'
    ], random) || '单灵根';
  }

  function pickOfficeTitle(random) {
    return randomOf(OFFICE_FALLBACKS, random) || '长老';
  }

  function pickBabyName(random) {
    return randomOf(BABY_NAME_POOL, random) || '清衡';
  }

  function pickCraftItem(random) {
    return randomOf(CRAFT_ITEMS, random) || '回气丹';
  }

  function pickSwordSpirit(random) {
    return randomOf(SWORD_SPIRITS, random) || '剑灵·霜鸣';
  }

  /**
   * 原版「你」= 玩家。非玩家见闻里（模板已是 {you}）：
   * - {a}向{you} / 为{you} / 请求{you}… → you 是对方（优先 b，否则玩家名）
   * - 其余（邀请{you}、{you}为了、对{you}的印象…）→ you 与句首主语同为 a
   * 对方槽禁止回退成 a，否则会出现「楚云晚向楚云晚请求」这类同人句。
   */
  function resolveYouLabel(template, aLabel, bLabel, playerLabel) {
    const a = typeof aLabel === 'string' && aLabel.trim() ? aLabel.trim() : null;
    const b = typeof bLabel === 'string' && bLabel.trim() ? bLabel.trim() : null;
    const player = typeof playerLabel === 'string' && playerLabel.trim()
      ? playerLabel.trim()
      : null;
    const t = String(template || '');
    if (/拜\{you\}为师/.test(t)) return a;
    if (/\{a\}(向\{you\}|为\{you\}|请求\{you\})/.test(t) ||
        /\{a\}[^。{]{0,12}(向\{you\}介绍|向\{you\}提出|取悦于\{you\}|许下和\{you\}|温养了\{you\})/.test(t)) {
      if (b && b !== a) return b;
      if (player && player !== a) return player;
      return null;
    }
    return a;
  }

  function buildTemplateValues(a, b, c, item, slot, random, locName, youLabel) {
    const s = slot && typeof slot === 'object' ? slot : {};
    return {
      a: a || null,
      b: b || null,
      c: c || null,
      you: youLabel || a || null,
      gift: item || null,
      young_pet: s.petYoungName || pickYoungPet(random),
      pet_form: s.petFormName || pickPetForm(random),
      linggen: pickLinggenName(random),
      office: s.officeTitle || pickOfficeTitle(random),
      baby: s.babyName || pickBabyName(random),
      sword: pickSwordSpirit(random),
      craft: pickCraftItem(random),
      loc: locName || null
    };
  }

  // 统一模板填空；缺参返回 null。
  function fillOriginalEventNarrative(
    eventId,
    aLabel,
    bLabel,
    giftLabel,
    extraNames,
    random,
    slots,
    locName,
    playerLabel
  ) {
    if (!EventTemplates || typeof EventTemplates.pickTemplate !== 'function') {
      return null;
    }
    const template = EventTemplates.pickTemplate(eventId, random);
    if (!template) return null;

    const names = [];
    if (aLabel) names.push(aLabel);
    if (bLabel) names.push(bLabel);
    if (Array.isArray(extraNames)) {
      extraNames.forEach(function (n) {
        if (typeof n === 'string' && n && names.indexOf(n) < 0) names.push(n);
      });
    }
    if (!names.length) return null;

    const a = names[0];
    const b = names.length > 1 ? names[1] : null;
    const c = names.length > 2 ? names[2] : null;
    if (EventTemplates.needsPeer(eventId) && !b) return null;

    const item = (typeof giftLabel === 'string' && giftLabel.trim())
      ? giftLabel.trim()
      : (EventTemplates.needsGift(eventId)
        ? ensureGiftLabel(null, random)
        : null);
    const you = resolveYouLabel(template, a, b, playerLabel);
    if (template.indexOf('{you}') >= 0 && !you) return null;
    const values = buildTemplateValues(
      a, b, c, item, slots, random, locName || null, you
    );
    return EventTemplates.fillTemplate(template, values);
  }

  function originalTextNeedsPeer(eventId) {
    if (eventId == null || !EventTemplates ||
        typeof EventTemplates.needsPeer !== 'function') {
      return false;
    }
    return EventTemplates.needsPeer(eventId);
  }

  function actionHasOriginalPool(action) {
    return !!(OriginalEventBindings &&
      typeof OriginalEventBindings.poolFor === 'function' &&
      OriginalEventBindings.poolFor(action));
  }

  function fillNarrative(type, aLabel, bLabel, locName, ctx, random) {
    // 无 eventId 不拼句：禁止 H5 白话兜底。
    if (!ctx || !Number.isFinite(ctx.eventId)) return '';
    let eventId = ctx.eventId;
    if (OriginalEventBindings &&
        typeof OriginalEventBindings.resolveConsentEventId === 'function') {
      const resolved = OriginalEventBindings.resolveConsentEventId(eventId);
      if (resolved == null) return '';
      eventId = resolved;
      ctx.eventId = resolved;
    }
    const playerLabel = ctx.playerLabel || null;
    const original = fillOriginalEventNarrative(
      eventId,
      aLabel,
      bLabel,
      ctx.giftItem || null,
      ctx.extraNameLabels || null,
      random,
      {
        petFormName: ctx.petFormName || null,
        petYoungName: ctx.petYoungName || null,
        babyName: ctx.babyName || null,
        officeTitle: ctx.officeTitle || null
      },
      locName,
      playerLabel
    );
    if (original) return original;
    // 结构性事件已锁定 ID：禁止改抽，避免「状态已改、文案换成另一条」。
    if (!ctx.lockEventId && OriginalEventBindings &&
        typeof OriginalEventBindings.pickEventId === 'function' &&
        actionHasOriginalPool(type)) {
      for (let tryIndex = 0; tryIndex < 8; tryIndex++) {
        const altId = OriginalEventBindings.pickEventId(type, random);
        if (altId == null || altId === eventId) continue;
        const alt = fillOriginalEventNarrative(
          altId,
          aLabel,
          bLabel,
          ctx.giftItem || null,
          ctx.extraNameLabels || null,
          random,
          {
            petFormName: ctx.petFormName || null,
            petYoungName: ctx.petYoungName || null,
            babyName: ctx.babyName || null,
            officeTitle: ctx.officeTitle || null
          },
          locName,
          playerLabel
        );
        if (alt) {
          ctx.eventId = altId;
          return alt;
        }
      }
    }
    return '';
  }

  function personPlainLabel(person) {
    return personName(person);
  }

  function personShortTitle(person) {
    if (!person) return '';
    if (person.sectId) {
      const sect = SectContent && typeof SectContent.get === 'function'
        ? SectContent.get(person.sectId)
        : null;
      const sectName = sect && typeof sect.name === 'string' ? sect.name : '';
      if (SectOfficeContent && typeof SectOfficeContent.sectOfficeTitle ===
          'function') {
        const office = SectOfficeContent.sectOfficeTitle(
          person.sectId,
          person.officeSlotId
        );
        if (office) return sectName + office;
      }
      if (person.discipleRank === 'core') return sectName + '真传';
      if (person.discipleRank === 'inner') return sectName + '内门';
      return sectName ? sectName + '弟子' : '门中弟子';
    }
    if (SectOfficeContent && typeof SectOfficeContent.getRogueTitle ===
        'function') {
      const rogue = SectOfficeContent.getRogueTitle(person.rogueTitleId);
      if (rogue && rogue.title) return rogue.title;
    }
    return '散修';
  }

  function personChronicleLabel(person) {
    const name = personName(person);
    const title = personShortTitle(person);
    return title ? title + name : name;
  }

  function pickGiftItem(random) {
    return randomOf(GIFT_ITEMS, random) || '一份薄礼';
  }

  function playerNarrativeLabel(state) {
    const raw = state && state.player && typeof state.player.name === 'string'
      ? String(state.player.name).trim()
      : '';
    // 展示位一律用玩家本名，不再用「你」或「名（你）」代替。
    const name = raw
      .replace(/（你）$/, '')
      .replace(/\(你\)$/, '')
      .trim();
    return name || '无名';
  }

  function rewriteNarrativePlayerYou(text, playerLabel) {
    const label = typeof playerLabel === 'string' && playerLabel.trim()
      ? playerLabel.trim()
      : '';
    if (!label) return String(text || '');
    let next = String(text || '');
    if (next.indexOf(label) >= 0) return next;
    next = next
      .replace(/^你与/, label + '与')
      .replace(/^你在/, label + '在')
      .replace(/^你正/, label + '正')
      .replace(/^你开始/, label + '开始')
      .replace(/^你/, label);
    return next;
  }


  return Object.freeze({
    GIFT_ITEMS: GIFT_ITEMS,
    PET_FORMS: PET_FORMS,
    YOUNG_PETS: YOUNG_PETS,
    regionName: regionName,
    personName: personName,
    personOfficeSuffix: personOfficeSuffix,
    regionIds: regionIds,
    randomOf: randomOf,
    fillOriginalEventNarrative: fillOriginalEventNarrative,
    originalTextNeedsPeer: originalTextNeedsPeer,
    actionHasOriginalPool: actionHasOriginalPool,
    fillNarrative: fillNarrative,
    personPlainLabel: personPlainLabel,
    personShortTitle: personShortTitle,
    personChronicleLabel: personChronicleLabel,
    pickGiftItem: pickGiftItem,
    playerNarrativeLabel: playerNarrativeLabel,
    rewriteNarrativePlayerYou: rewriteNarrativePlayerYou,
    resolveYouLabel: resolveYouLabel
  });
});
