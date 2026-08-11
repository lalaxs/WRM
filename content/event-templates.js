(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.EventTemplateContent = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
      return value;
    }
    Object.keys(value).forEach(function (key) {
      deepFreeze(value[key]);
    });
    return Object.freeze(value);
  }

  const TEMPLATES = deepFreeze([
    {
      id: 'social-first-conversation',
      revision: 1,
      scope: 'player',
      category: 'relationship',
      cooldownSeconds: 86400,
      requirements: [{ type: 'npcLiving', npcId: '{{npcId}}' }],
      title: '初识{{npcName}}',
      body: '你在{{regionName}}遇见{{npcName}}，几句闲谈让彼此留下了印象。',
      options: [
        {
          id: 'speak-openly',
          label: '坦诚交谈',
          preview: '双方好感与信任略有增加',
          effects: [
            {
              type: 'relationDelta',
              sourceId: 'player',
              targetId: '{{npcId}}',
              values: { affection: 3, trust: 2 }
            },
            {
              type: 'relationDelta',
              sourceId: '{{npcId}}',
              targetId: 'player',
              values: { affection: 2, trust: 1 }
            }
          ]
        }
      ]
    },
    {
      id: 'relationship-become-friends',
      revision: 1,
      scope: 'player',
      category: 'relationship',
      cooldownSeconds: 259200,
      requirements: [{ type: 'npcLiving', npcId: '{{npcId}}' }],
      title: '一句知己',
      body: '{{npcName}}说起一路相识的点滴，希望今后能以好友相称。',
      options: [
        {
          id: 'accept-friendship',
          label: '欣然成为好友',
          preview: '关系阶段变为好友',
          effects: [
            {
              type: 'setBondStage',
              firstId: 'player',
              secondId: '{{npcId}}',
              stage: 'friend'
            },
            {
              type: 'relationDelta',
              sourceId: '{{npcId}}',
              targetId: 'player',
              values: { trust: 5 }
            }
          ]
        },
        {
          id: 'remain-acquainted',
          label: '暂且保持来往',
          preview: '不改变关系阶段',
          effects: []
        }
      ]
    },
    {
      id: 'relationship-confess-feelings',
      revision: 1,
      scope: 'player',
      category: 'romance',
      cooldownSeconds: 604800,
      requirements: [
        { type: 'npcLiving', npcId: '{{npcId}}' },
        { type: 'bondStage', npcId: '{{npcId}}', stage: 'friend' }
      ],
      title: '月下心意',
      body: '{{npcName}}在月色下说出长久以来的心意，并认真等你作答。',
      options: [
        {
          id: 'become-lovers',
          label: '回应这份心意',
          preview: '关系阶段变为恋人',
          effects: [
            {
              type: 'setBondStage',
              firstId: 'player',
              secondId: '{{npcId}}',
              stage: 'lover'
            },
            {
              type: 'relationDelta',
              sourceId: 'player',
              targetId: '{{npcId}}',
              values: { romanticAttachment: 8, trust: 3 }
            }
          ]
        },
        {
          id: 'decline-kindly',
          label: '温和说明只愿做好友',
          preview: '仍保持好友关系',
          effects: [
            {
              type: 'relationDelta',
              sourceId: '{{npcId}}',
              targetId: 'player',
              values: { affection: -2 }
            }
          ]
        }
      ]
    },
    {
      id: 'relationship-formal-partner',
      revision: 1,
      scope: 'player',
      category: 'romance',
      cooldownSeconds: 1209600,
      requirements: [
        { type: 'npcLiving', npcId: '{{npcId}}' },
        { type: 'bondStage', npcId: '{{npcId}}', stage: 'lover' }
      ],
      title: '相伴修行之约',
      body: '{{npcName}}提议结为正式伴侣，共同安排今后的修行与生活。',
      options: [
        {
          id: 'form-partnership',
          label: '立下相伴之约',
          preview: '关系阶段变为正式伴侣',
          effects: [
            {
              type: 'setBondStage',
              firstId: 'player',
              secondId: '{{npcId}}',
              stage: 'partner'
            },
            {
              type: 'relationDelta',
              sourceId: '{{npcId}}',
              targetId: 'player',
              values: { loyalty: 10, trust: 5 }
            }
          ]
        },
        {
          id: 'need-more-time',
          label: '说明还需要时间',
          preview: '保持当前关系',
          effects: []
        }
      ]
    },
    {
      id: 'relationship-jealousy-conflict',
      revision: 1,
      scope: 'player',
      category: 'conflict',
      cooldownSeconds: 432000,
      requirements: [{ type: 'npcLiving', npcId: '{{npcId}}' }],
      title: '没有说开的误会',
      body: '{{npcName}}因近日的一则传闻心生不安。现在把话说开，仍有转圜余地。',
      options: [
        {
          id: 'explain',
          label: '耐心解释来龙去脉',
          preview: '降低怨恨，恢复少量信任',
          effects: [
            {
              type: 'relationDelta',
              sourceId: '{{npcId}}',
              targetId: 'player',
              values: { trust: 4, resentment: -4, jealousy: -3 }
            }
          ]
        },
        {
          id: 'compensate',
          label: '补偿此前的疏忽',
          preview: '赠出一枚灵桃并缓和关系',
          effects: [
            { type: 'removeItem', itemId: 'spiritPeach', quantity: 1 },
            {
              type: 'relationDelta',
              sourceId: '{{npcId}}',
              targetId: 'player',
              values: { affection: 4, resentment: -3 }
            }
          ]
        },
        {
          id: 'negotiate',
          label: '协商今后的相处边界',
          preview: '增加信任并降低嫉妒',
          effects: [
            {
              type: 'relationDelta',
              sourceId: 'player',
              targetId: '{{npcId}}',
              values: { trust: 3 }
            },
            {
              type: 'relationDelta',
              sourceId: '{{npcId}}',
              targetId: 'player',
              values: { trust: 5, jealousy: -5 }
            }
          ]
        },
        {
          id: 'exit',
          label: '退出这段关系',
          preview: '双方分开，不会损失全部资源',
          effects: [
            {
              type: 'setBondStage',
              firstId: 'player',
              secondId: '{{npcId}}',
              stage: 'separated'
            },
            {
              type: 'relationDelta',
              sourceId: '{{npcId}}',
              targetId: 'player',
              values: { affection: -8, resentment: 3 }
            }
          ]
        }
      ]
    },
    {
      id: 'relationship-peaceful-separation',
      revision: 1,
      scope: 'player',
      category: 'romance',
      cooldownSeconds: 604800,
      requirements: [{ type: 'npcLiving', npcId: '{{npcId}}' }],
      title: '各自的前路',
      body: '你与{{npcName}}认真谈过近况，发现彼此想走的道路已经不同。',
      options: [
        {
          id: 'separate-kindly',
          label: '好好道别',
          preview: '关系阶段变为分开',
          effects: [
            {
              type: 'setBondStage',
              firstId: 'player',
              secondId: '{{npcId}}',
              stage: 'separated'
            },
            {
              type: 'relationDelta',
              sourceId: 'player',
              targetId: '{{npcId}}',
              values: { affection: -5, resentment: -2 }
            }
          ]
        }
      ]
    },
    {
      id: 'sect-first-choice',
      revision: 1,
      scope: 'player',
      category: 'sect',
      cooldownSeconds: 0,
      requirements: [{ type: 'playerSect', sectId: null }],
      title: '五宗来函',
      body: '完成初次修行后，五个宗门都送来了正式引荐。你也可以继续以散修身份游历。',
      options: [
        {
          id: 'join-taixuan',
          label: '加入太玄剑宗',
          preview: '成为太玄剑宗弟子',
          effects: [{ type: 'setSect', sectId: 'taixuan-sword' }]
        },
        {
          id: 'join-baicao',
          label: '加入百草谷',
          preview: '成为百草谷弟子',
          effects: [{ type: 'setSect', sectId: 'baicao-valley' }]
        },
        {
          id: 'join-tiangong',
          label: '加入天工阁',
          preview: '成为天工阁弟子',
          effects: [{ type: 'setSect', sectId: 'tiangong-pavilion' }]
        },
        {
          id: 'join-spirit-beast',
          label: '加入灵兽山',
          preview: '成为灵兽山弟子',
          effects: [{ type: 'setSect', sectId: 'spirit-beast-mountain' }]
        },
        {
          id: 'join-qingyin',
          label: '加入清音宫',
          preview: '成为清音宫弟子',
          effects: [{ type: 'setSect', sectId: 'qingyin-palace' }]
        },
        {
          id: 'remain-wandering',
          label: '继续做散修',
          preview: '暂不加入宗门，今后仍可通过事件选择',
          effects: [{ type: 'setSect', sectId: null }]
        }
      ]
    },
    {
      id: 'sect-leave-request',
      revision: 1,
      scope: 'player',
      category: 'sect',
      cooldownSeconds: 604800,
      requirements: [{ type: 'playerHasSect' }],
      title: '去留之议',
      body: '你向宗门说明了离开的想法。执事提醒，贡献与声望会受影响，但已学能力会保留。',
      options: [
        {
          id: 'leave-sect',
          label: '确认离开宗门',
          preview: '恢复散修身份',
          effects: [{ type: 'setSect', sectId: null }]
        },
        {
          id: 'stay',
          label: '暂时留下',
          preview: '不改变当前宗门',
          effects: []
        }
      ]
    },
    {
      id: 'social-letter-invitation',
      revision: 1,
      scope: 'player',
      category: 'relationship',
      cooldownSeconds: 172800,
      requirements: [{ type: 'npcLiving', npcId: '{{npcId}}' }],
      title: '远方来信',
      body: '{{npcName}}托人送来一封长信，想与你继续谈谈近日的见闻。',
      options: [
        {
          id: 'write-back',
          label: '认真回信',
          preview: '开始与对方互寄书信',
          effects: [
            {
              type: 'startSocialJob',
              npcId: '{{npcId}}',
              label: '与{{npcName}}互寄书信',
              durationSeconds: 7200,
              followupTemplateId: 'social-letter-followup'
            }
          ]
        },
        {
          id: 'save-letter',
          label: '收好来信',
          preview: '稍后再联系',
          effects: []
        }
      ]
    },
    {
      id: 'social-letter-followup',
      revision: 1,
      scope: 'player',
      category: 'relationship',
      cooldownSeconds: 0,
      requirements: [{ type: 'npcLiving', npcId: '{{npcId}}' }],
      title: '书信往来渐深',
      body: '几封信后，你与{{npcName}}对彼此的经历都有了更多理解。',
      options: [
        {
          id: 'keep-letters',
          label: '珍藏这些书信',
          preview: '双方信任增加',
          effects: [
            {
              type: 'relationDelta',
              sourceId: 'player',
              targetId: '{{npcId}}',
              values: { trust: 4 }
            },
            {
              type: 'relationDelta',
              sourceId: '{{npcId}}',
              targetId: 'player',
              values: { trust: 4 }
            }
          ]
        }
      ]
    },
    {
      id: 'social-gift-search',
      revision: 1,
      scope: 'player',
      category: 'relationship',
      cooldownSeconds: 259200,
      requirements: [{ type: 'npcLiving', npcId: '{{npcId}}' }],
      title: '一份合心的礼物',
      body: '你想为{{npcName}}准备一件真正合心意的东西，需要花些时间打听。',
      options: [
        {
          id: 'search-gift',
          label: '开始寻找礼物',
          preview: '寻找完成后出现后续事件',
          effects: [
            {
              type: 'startSocialJob',
              npcId: '{{npcId}}',
              label: '为{{npcName}}寻找礼物',
              durationSeconds: 10800,
              followupTemplateId: 'social-gift-followup'
            }
          ]
        },
        {
          id: 'not-now',
          label: '暂不准备',
          preview: '不产生变化',
          effects: []
        }
      ]
    },
    {
      id: 'social-gift-followup',
      revision: 1,
      scope: 'player',
      category: 'relationship',
      cooldownSeconds: 0,
      requirements: [{ type: 'npcLiving', npcId: '{{npcId}}' }],
      title: '找到合适的礼物',
      body: '几番打听后，你终于找到了适合{{npcName}}的灵桃。',
      options: [
        {
          id: 'give-found-gift',
          label: '送出灵桃',
          preview: '双方好感增加',
          effects: [
            { type: 'addItem', itemId: 'spiritPeach', quantity: 1 },
            {
              type: 'relationDelta',
              sourceId: '{{npcId}}',
              targetId: 'player',
              values: { affection: 5, trust: 2 }
            }
          ]
        }
      ]
    },
    {
      id: 'region-spirit-rain',
      revision: 1,
      scope: 'world',
      category: 'region',
      cooldownSeconds: 259200,
      requirements: [{ type: 'region', regionId: '{{regionId}}' }],
      title: '{{regionName}}灵雨',
      body: '{{regionName}}落下一场温和灵雨，灵田与山林都显得生机充盈。',
      options: [
        {
          id: 'record-region-news',
          label: '记入地区见闻',
          preview: '写入事件摘要',
          effects: [
            {
              type: 'addSummary',
              category: 'region',
              title: '{{regionName}}近日灵雨充沛'
            }
          ]
        }
      ]
    },
    {
      id: 'world-market-caravan',
      revision: 1,
      scope: 'world',
      category: 'world',
      cooldownSeconds: 432000,
      requirements: [],
      title: '远方商队抵达',
      body: '一支远方商队进入琳琅坊市，各地人物都在谈论新到的材料与见闻。',
      options: [
        {
          id: 'record-world-news',
          label: '记入天下传闻',
          preview: '写入世界演变',
          effects: [
            {
              type: 'addEvolution',
              category: 'world',
              title: '琳琅坊市迎来远方商队'
            }
          ]
        }
      ]
    },
    {
      id: 'social-dao-appointment',
      revision: 1,
      scope: 'player',
      category: 'relationship',
      cooldownSeconds: 259200,
      requirements: [{ type: 'npcLiving', npcId: '{{npcId}}' }],
      title: '论道之约',
      body: '{{npcName}}想选一个清静日子与你论道，彼此都需要先做准备。',
      options: [
        {
          id: 'prepare-appointment',
          label: '约定论道之日',
          preview: '开始准备赴约',
          effects: [
            {
              type: 'startSocialJob',
              npcId: '{{npcId}}',
              label: '等待与{{npcName}}论道之日',
              durationSeconds: 14400,
              followupTemplateId: 'social-letter-followup'
            }
          ]
        }
      ]
    }
  ]);

  const BY_ID = Object.create(null);
  TEMPLATES.forEach(function (template) {
    BY_ID[template.id] = template;
  });
  deepFreeze(BY_ID);

  function get(templateId) {
    return typeof templateId === 'string' &&
      Object.prototype.hasOwnProperty.call(BY_ID, templateId)
      ? BY_ID[templateId]
      : null;
  }

  function list() {
    return TEMPLATES;
  }

  return Object.freeze({
    TEMPLATES: TEMPLATES,
    get: get,
    list: list
  });
});
