# Stage 3 Combat, Dungeons, Techniques, and Breakthrough Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有单主行动放置内核和顶部/左侧/右侧 UI 骨架中，交付确定性自动战斗、普通区域、副本波次与首领、装备和补给方案、功法学习与配置、重伤撤退，以及具有永久门槛记录的概率突破。

**Architecture:** Stage 3 只扩展 Stage 1B 的 `Simulation.advance` 和 Stage 2 的规则/库存/内容体系。战斗以 0.25 秒整数 tick 保存在 `systems.combat.session`，在线分块和离线整段使用同一个 `Stage3Rules`；战斗引擎只返回新状态、RNG 和领域事件。装备、功法、战斗方案、门槛和突破由纯模块处理，`game.js` 只组合命令、查询和存档事务，`ui.js` 只渲染冻结 ViewModel。

**Tech Stack:** 原生 JavaScript、UMD 浏览器全局、CommonJS Node 自测、现有 DOM/CSS/Canvas、无依赖、无打包器。

## Global Constraints

- 唯一规格是 `docs/superpowers/specs/2026-07-24-xiuxian-idle-core-design.md`。
- 本计划以前置 Stage 1B 和 Stage 2 全部完成且独立审查通过为条件。
- 保留现有顶部状态栏、可滚动左侧页签、独立滚动右侧内容区、全屏弹层和角色 Canvas 合成；不引入新框架或大地图。
- 战斗、普通区域和副本占用唯一主要行动槽；玩家不实时点击释放技能。
- 在线和离线只能调用 `Simulation.advance`；Stage 3 不创建第二个 interval、rAF 规则、离线公式或战斗捷径。
- 战斗 RNG、掉落 RNG、功法触发 RNG 和突破 RNG 都只使用保存的 `rngState`。
- `core/` 与 `content/` 不得访问 DOM、Canvas、`Platform`、`SaveSystem`、localStorage、toast 或 `Math.random()`。
- 生命归零只造成重伤撤退。普通战斗和副本不永久死亡、不删装备、不清背包；已消耗补给和时间不返还。
- 突破概率只能等于“境界基础概率 + 已选择丹药 + 当前事件增益”，最终钳制到 0～100%。装备、功法、符箓、阵法、灵兽、关系、宗门和洞府都不得直接修改概率。
- 突破门槛完成后永久保存；突破失败清空当前境界修为、消耗本次丹药和一次性事件增益，但不清门槛。
- 功法首次读书永久学会，重复功法书转为经验；离开宗门不能删除已学功法。
- 本阶段只提供宗门功法的纯数据接缝，不虚构玩家宗门、宗门成员或 NPC 指点。
- 根源码唯一权威；`release/` 只由验证后的同步脚本生成。
- 每个任务严格 RED → 验证失败 → GREEN → 全量回归 → commit → 独立 review。

## Verified Starting Evidence

- 当前 `npm test` 为 foundation 40/40、skillnet 90/90、UI 28/28，整体通过。
- 当前 `game.js` 只有采集/生产放置规则，战斗和功法页面没有实现。
- 当前突破仍由 `tryBreakthrough()` 直接在 `game.js` 判定；没有永久门槛数据，失败逻辑与最终规格不一致。
- 当前战斗所需装备只作为物品数量存在，没有装备槽、衍生属性、补给方案或多套配置。
- Stage 1A 已提供版本化快照和可复现 RNG；Stage 1B 计划会提供纯 `Simulation.advance`、结构化报告、私有状态和冻结命令/查询边界。
- Stage 2 计划固定提供 `player.inventory`、十二技能、装备/消耗品注册表、阵法/灵兽效果、`Stage2Rules.create`、schema v3 和以下公开边界：

```js
Simulation.advance(model, elapsedSeconds, {
  source: 'online' | 'offline',
  fromMs,
  mainActionLimitSeconds: null | number,
  rules,
  lanes
}) // => {state, report}

window.GameAPI = Object.freeze({queries, commands, render});

// Every command:
{ok:boolean, code:string, changed:boolean, message:string|null, data:object|null}
```

Stage 2 动作键已固定：

```text
gather:explore:<skillId>
gather:collect:<skillId>:<entryId>
fish:<spotId>
produce:<recipeId>
beast:tame:<encounterId>
beast:train:<beastId>
```

Stage 3 新增：

```text
combat:region:<regionId>:<enemyId>
combat:dungeon:<dungeonId>
```

## File Map

| File | Responsibility |
|---|---|
| `content/combat.js` | 区域、敌人、属性种子、装备、补给效果、掉落表、副本波次 |
| `content/techniques.js` | 主动功法、被动心法、功法书、标签和宗门接缝 |
| `content/realms.js` | 境界、修为需求、基础概率、永久门槛和对应丹药 |
| `core/stage3-state.js` | schema v4 默认值、v3→v4 迁移、战斗会话校验 |
| `core/combat-loadouts.js` | 装备/补给/功法槽、多套方案、背包绑定 |
| `core/techniques.js` | 学习、重复书经验、升级、槽位和宗门修正 |
| `core/combat-stats.js` | 境界、装备、心法、阵法、灵兽到战斗属性的纯投影 |
| `core/combat-engine.js` | 0.25 秒确定性 tick、条件优先级、伤害、状态和补给 |
| `core/combat-rewards.js` | 掉落 RNG、pending loot 和领取事务 |
| `core/combat-progress.js` | 区域击杀、副本通关、首次奖励、永久门槛 |
| `core/breakthrough.js` | 门槛校验、概率、丹药/事件消耗、成功/失败 |
| `core/stage3-rules.js` | 战斗动作和重伤 lane 接入 Stage 1B/2 rules |
| `game.js` | 组合根、命令/查询、事务存档 |
| `ui.js` / `styles.css` | 现有页面骨架内的战斗/功法/突破 UI |
| `selftest_stage3_*.js` | 内容、状态、功法、战斗、副本、突破、API 的 focused tests |

## Persisted Stage 3 Model

Stage 2 schema v3 在 Stage 3 显式升级为 schema v4：

```js
model.player.techniques = {
  known: {
    [techniqueId]: { level: 1, xp: 0 }
  }
};

model.player.combat = {
  injury: null,
  activeLoadoutId: 'loadout-1',
  nextLoadoutId: 2,
  loadouts: [{
    id: 'loadout-1',
    name: '方案一',
    equipment: {
      weapon: null,
      armor: null,
      accessory: null
    },
    activeTechniques: [
      { techniqueId: null, condition: { type: 'always' } },
      { techniqueId: null, condition: { type: 'always' } },
      { techniqueId: null, condition: { type: 'always' } },
      { techniqueId: null, condition: { type: 'always' } }
    ],
    passiveTechniques: [null, null, null],
    supplies: {
      food: { itemId: null, triggerRatio: 0.50, stopWhenEmpty: false },
      pill: { itemId: null, triggerRatio: 0.30, stopWhenEmpty: false },
      talisman: { itemId: null, useAt: 'enemy_start', stopWhenEmpty: false }
    }
  }]
};

model.player.combatProgress = {
  enemyKills: { [enemyId]: 0 },
  regionKills: { [regionId]: 0 },
  dungeonClears: { [dungeonId]: 0 },
  firstClears: { [dungeonId]: true },
  completedGates: { [gateId]: true }
};

model.player.breakthrough = {
  realmId: 'qi-1',
  cultivation: 0,
  eventBuffs: []
};

model.systems.combat = {
  session: null,
  pendingLoot: null,
  nextLootId: 1
};
```

重伤：

```js
{
  id: 'severe-injury',
  remainingSeconds: 1800,
  totalSeconds: 1800
}
```

战斗会话：

```js
{
  mode: 'region' | 'dungeon',
  actionKey,
  regionId: String | null,
  enemyId: String | null,
  dungeonId: String | null,
  waveIndex: 0,
  waveDefeated: 0,
  bossPhase: 0,
  intermissionTicks: 0,
  elapsedTicks: 0,
  tickRemainderSeconds: 0,
  loadoutId: String,
  loadoutSnapshot: {
    activeTechniques: Array,
    passiveTechniques: Array,
    supplies: Object,
    techniqueLevels: Object
  },
  player: {
    hp, maxHp, qi, maxQi,
    attack, defense, accuracy, evasion, critChance,
    attackIntervalTicks, cooldownTicks,
    shield, buffs: {}, statuses: {},
    techniqueCooldowns: {}
  },
  enemy: null | {
    id, hp, maxHp, attack, defense, accuracy, evasion,
    attackIntervalTicks, cooldownTicks,
    phase, buffs: {}, statuses: {}
  }
}
```

会话只保存普通 JSON 数值和 ID，不保存内容对象、函数、DOM 或计时器。

## Deterministic Combat Contract

固定 tick：

```js
const COMBAT_TICK_SECONDS = 0.25;
```

每个 tick 的顺序固定：

1. 若处于 intermission，扣 1 tick；到零时创建下一敌人。
2. 检查并自动使用 food/pill；配置为 `stopWhenEmpty` 且触发时无物品则撤退。
3. 玩家 cooldown 为 0 时，从主动槽 1→4 检查“已学会、冷却、灵力、条件”；释放第一个满足者，否则普通攻击。
4. 玩家行动后敌人仍存活且 cooldown 为 0 时，敌人行动。
5. 结算持续伤害、治疗、护盾、buff/status tick。
6. 所有 cooldown 和有限状态各减 1。
7. 敌人生命为 0 时先结算击杀、掉落和波次；玩家生命为 0 时重伤撤退。

攻击 RNG 消耗顺序固定：

```text
命中判定 → 暴击判定 → 技能附加状态判定 → 掉落表按内容顺序判定
```

伤害公式：

```js
hitChance = clamp(0.20, 0.98,
  0.75 + (attacker.accuracy - defender.evasion) * 0.005);

baseDamage = Math.max(1, Math.floor(
  attacker.attack * techniqueMultiplier
  - defender.defense * (1 - defenseIgnore) * 0.50
));

criticalDamage = Math.floor(baseDamage * 1.50);
```

未命中伤害为 0。攻击技能消耗一次命中 RNG 和一次暴击 RNG；纯治疗/回灵技能不消耗命中或暴击 RNG。

玩家基础属性：

```js
maxHp = 100 + realmIndex * 40;
attack = 12 + realmIndex * 5;
defense = 5 + realmIndex * 3;
accuracy = 75 + realmIndex * 2;
evasion = 5 + realmIndex;
critChance = Math.min(0.25, 0.05 + realmIndex * 0.005);
maxQi = 100 + realmIndex * 10;
attackIntervalTicks = Math.max(4, 8 - Math.floor(realmIndex / 4));
```

装备、被动心法、阵法和灵兽只进入 `CombatStats.derive`。它们不能进入 `Breakthrough.chance`。

## First Directly Buildable Content Batch

### Combat quantity

- 9 普通区域。
- 每区 3 个普通敌人，共 27 个。
- 9 个副本。
- 每副本 4 个波次组：普通 A×2、普通 B×2、精英×1、首领×1，共 54 次敌人遭遇。
- 每副本 1 个独立精英和 1 个独立首领，共 18 个；总敌人定义 45 个。
- 最终首领使用 2 阶段，验证多阶段首领能力。
- 27 件装备：9 武器、9 防具、9 饰品。
- 16 本功法：10 主动、6 被动；对应 16 种功法书。
- 6 种食物、2 种丹药、3 种符箓拥有战斗补给效果。

### Regions, dungeons, and enemy IDs

| Tier | Region | Normal enemies | Dungeon | Elite | Boss |
|---:|---|---|---|---|---|
| 1 | `qingyunOutskirts` 青云山麓 | `thornHare`,`grayWolf`,`wanderingBandit` | `breathCave` 聚气洞 | `caveWarden` | `breathSerpent` |
| 2 | `blackIronRidge` 玄铁岭 | `ironClawBeast`,`stonePuppet`,`rogueCultivator` | `foundationAltar` 筑基坛 | `altarGuardian` | `earthVeinApe` |
| 3 | `redSandValley` 赤砂谷 | `sandScorpion`,`fireCrow`,`swordRogue` | `goldCoreRuins` 金丹遗府 | `ruinElder` | `scarletCoreBeast` |
| 4 | `mistSoulMarsh` 雾魂泽 | `soulMoth`,`ghostVine`,`mireFiend` | `nascentSoulTower` 元婴塔 | `towerKeeper` | `infantSoulShade` |
| 5 | `thunderPeak` 雷霆峰 | `thunderBird`,`lightningSpirit`,`armoredFiend` | `spiritTransformationPeak` 化神天阶 | `thunderJudge` | `heavenlyThunderRoc` |
| 6 | `voidRift` 虚空裂谷 | `riftCrawler`,`voidMoth`,`spaceBandit` | `voidRefiningRift` 炼虚裂境 | `riftWarden` | `voidDevourer` |
| 7 | `starfallAbyss` 星落渊 | `starHound`,`meteorGolem`,`abyssCultivator` | `bodyIntegrationPalace` 合体古殿 | `palaceMarshal` | `unityTitan` |
| 8 | `mahayanaAbyss` 大乘天渊 | `daoWraith`,`lawBeast`,`skyDemon` | `mahayanaTrial` 大乘道场 | `daoGateKeeper` | `myriadLawAvatar` |
| 9 | `ascensionTerrace` 飞升台 | `cloudGeneral`,`tribulationSpirit`,`immortalShadow` | `ascensionTrial` 飞升天关 | `tribulationHerald` | `ninefoldTribulation` |

区域和副本的 `requiredRealmIndex` 固定为：

```js
[0, 8, 9, 10, 11, 12, 13, 14, 15]
```

Tier 1 无前置副本；Tier 2～9 还必须已首通前一 tier 副本。普通区域只检查对应境界，副本同时检查境界和前置首通。

每个副本波次：

```js
[
  { enemyId: normalEnemies[0], count: 2 },
  { enemyId: normalEnemies[1], count: 2 },
  { enemyId: eliteId, count: 1 },
  { enemyId: bossId, count: 1 }
]
```

`ninefoldTribulation`：

```js
phases: [
  { hpMultiplier: 1.00, attackMultiplier: 1.00, defenseMultiplier: 1.00 },
  { hpMultiplier: 1.50, attackMultiplier: 1.25, defenseMultiplier: 1.15 }
]
```

普通敌人 tier 属性：

```js
hp = round(45 * 1.85 ** (tier - 1));
attack = round(8 * 1.65 ** (tier - 1));
defense = round(3 * 1.60 ** (tier - 1));
accuracy = 68 + tier * 3;
evasion = 4 + tier * 2;
attackIntervalTicks = [8,8,7,7,6,6,5,5,4][tier - 1];
cultivation = tier * 5;
```

精英使用 `hp×2.0, attack×1.35, defense×1.40, cultivation×3`；首领使用 `hp×5.0, attack×1.60, defense×1.60, cultivation×8`。

### Equipment

| Tier | Weapon | Armor | Accessory |
|---:|---|---|---|
| 1 | `cloudwoodSword` | `cloudRobe` | `breathJade` |
| 2 | `blackIronSword` | `stoneguardArmor` | `foundationSeal` |
| 3 | `scarletCoreBlade` | `sunscaleArmor` | `corePendant` |
| 4 | `soulCallingStaff` | `mistweaveRobe` | `infantSoulPearl` |
| 5 | `thunderSword` | `lightningArmor` | `spiritMirror` |
| 6 | `voidBlade` | `riftRobe` | `voidRing` |
| 7 | `starforgedSpear` | `unityArmor` | `bodySeal` |
| 8 | `abyssSword` | `mahayanaRobe` | `daoPendant` |
| 9 | `ascensionBlade` | `heavenlyRobe` | `immortalJade` |

装备属性：

```js
weapon:    { attack: tier * 6, accuracy: tier * 2 }
armor:     { maxHp: tier * 20, defense: tier * 4 }
accessory: { maxQi: tier * 10, critChance: tier * 0.01, evasion: tier }
```

### Techniques

主动功法：

| ID | Tier | Qi | Cooldown | Effect |
|---|---:|---:|---:|---|
| `cloudPiercingSword` | 1 | 10 | 16 ticks | 1.40× attack |
| `returningWindSlash` | 1 | 12 | 20 | two 0.80× hits |
| `stoneBreakingFist` | 2 | 12 | 20 | 1.60× attack |
| `spiritNeedle` | 2 | 14 | 24 | 1.20×, ignore 30% defense |
| `clearHeartArt` | 2 | 20 | 48 | heal 20% max HP |
| `gatheringBreath` | 1 | 0 | 60 | restore 25 Qi |
| `thunderSeal` | 3 | 22 | 32 | 1.80×, 30% shock for 8 ticks |
| `bindingTalisman` | 3 | 18 | 36 | 0.80×, enemy interval +2 ticks for 12 ticks |
| `beastEcho` | 4 | 24 | 32 | 1.50×; active beast makes it 1.80× |
| `starfallArray` | 5 | 30 | 60 | 2.20× attack |

被动心法：

```js
steadyBreath:    { maxQiPercent: 0.15 }
ironBody:        { defensePercent: 0.10 }
swiftShadow:     { attackIntervalReduction: 0.05 }
swordHeart:      { taggedDamageBonus: { sword: 0.10 } }
pillGuard:       { supplyHealingBonus: 0.15 }
spiritCompanion: { activeBeastEffectBonus: 0.10 }
```

功法等级 1～20。升级需求：

```js
techniqueXpNeed(level, sectModifier) {
  if (level >= 20) return 0;
  return Math.round(100 * Math.pow(level, 1.7) * sectModifier.xpCostMultiplier);
}
```

重复书经验为 `100 * technique.tier`；主动功法每次成功释放获得 `tier` XP；装备中的被动心法每次战斗胜利获得 `tier` XP。

### Sect seam

Stage 3 不定义宗门，只接受：

```js
sectContext = {
  sectId: null | String,
  favoredTechniqueIds: String[],
  favoredTags: String[]
};
```

命中 favored ID 或 tag：

```js
{
  requiredRealmReduction: 1,
  xpCostMultiplier: 0.90
}
```

否则 `{requiredRealmReduction:0, xpCostMultiplier:1}`。已学功法不再检查当前宗门，因此退出宗门不会删除或禁用。

### Supplies

```js
grilledCarp:       {type:'food', heal:20}
shrimpSoup:        {type:'food', heal:25}
spiritRiceMeal:    {type:'food', heal:35}
troutFeast:        {type:'food', heal:45}
lobsterBanquet:    {type:'food', heal:60}
dragonFishBanquet: {type:'food', heal:90}
healingPill:       {type:'pill', heal:50}
qiGatheringPill:   {type:'pill', restoreQi:40}
wardTalisman:      {type:'talisman', shieldMaxHpRatio:0.20}
healingTalisman:   {type:'talisman', heal:35}
hasteTalisman:     {type:'talisman', attackIntervalReduction:0.10, durationTicks:40}
```

### Loot

- 每个 tier 的“基础材料 / 额外补给 / 功法书池”固定如下；书池到高 tier 允许重复掉落，重复书正是功法升级来源：

| Tier | Base material | Extra supply | Technique book pool |
|---:|---|---|---|
| 1 | `copperOre` | `grilledCarp` | `cloudPiercingSword`,`returningWindSlash`,`gatheringBreath`,`steadyBreath` |
| 2 | `ironOre` | `shrimpSoup` | `stoneBreakingFist`,`spiritNeedle`,`clearHeartArt`,`ironBody` |
| 3 | `silverOre` | `spiritRiceMeal` | `thunderSeal`,`bindingTalisman`,`swiftShadow` |
| 4 | `goldOre` | `troutFeast` | `beastEcho`,`swordHeart` |
| 5 | `jadeShard` | `healingTalisman` | `starfallArray`,`pillGuard` |
| 6 | `darkIronOre` | `wardTalisman` | `spiritCompanion` |
| 7 | `adamantOre` | `lobsterBanquet` | `starfallArray`,`spiritCompanion` |
| 8 | `crystalOre` | `dragonFishBanquet` | `starfallArray`,`swordHeart`,`pillGuard` |
| 9 | `darkCrystal` | `hasteTalisman` | all 16 books |

- 普通敌人：必掉本 tier 基础材料 1～2；按内容数组顺序一次 15% 判定，命中后掉对应额外补给 1。
- 精英：必掉基础材料 2～4；20% 掉本 tier 武器或防具 1；10% 掉本 tier 分配的功法书。
- 首领：必掉基础材料 5；35% 掉本 tier 三件装备之一；20% 掉本 tier 功法书。
- 每个副本首次通关固定奖励本 tier 饰品 1，以及上表书池中按书写顺序取第 `min(tier, pool.length)-1` 本功法书 1。
- 掉落无法进入背包时，整批进入 `systems.combat.pendingLoot`，战斗以 `requirements_invalid` 停止并写 warning `inventory_full`；不丢弃、不部分领取。

## Realm and Permanent Gate Table

| Current → Next | Need | Base | Pill | Permanent gate |
|---|---:|---:|---|---|
| 练气1→2 | 100 | 100% | none | `kill:thornHare:3` |
| 练气2→3 | 250 | 100% | none | `kill:grayWolf:3` |
| 练气3→4 | 450 | 100% | none | `kill:wanderingBandit:3` |
| 练气4→5 | 700 | 100% | none | `kill:thornHare:10` |
| 练气5→6 | 1000 | 100% | none | `kill:grayWolf:10` |
| 练气6→7 | 1400 | 100% | none | `kill:wanderingBandit:10` |
| 练气7→8 | 1900 | 100% | none | `clear:breathCave:1` |
| 练气8→9 | 2500 | 100% | none | `clear:breathCave:3` |
| 练气9→筑基 | 3000 | 60% | `foundationPill` | `clear:foundationAltar:1` |
| 筑基→金丹 | 6000 | 50% | `goldCorePill` | `clear:goldCoreRuins:1` |
| 金丹→元婴 | 15000 | 40% | `nascentSoulPill` | `clear:nascentSoulTower:1` |
| 元婴→化神 | 40000 | 30% | `spiritTransformationPill` | `clear:spiritTransformationPeak:1` |
| 化神→炼虚 | 100000 | 25% | `voidRefiningPill` | `clear:voidRefiningRift:1` |
| 炼虚→合体 | 250000 | 20% | `bodyIntegrationPill` | `clear:bodyIntegrationPalace:1` |
| 合体→大乘 | 600000 | 15% | `mahayanaPill` | `clear:mahayanaTrial:1` |
| 大乘→飞升 | 1500000 | 10% | none | `clear:ascensionTrial:1` |

匹配丹药每颗 +20 个百分点，可选择 0～持有数量；丹药不是尝试前置。事件增益为：

```js
{id, bonus, usesRemaining}
```

只累计 `usesRemaining > 0` 的有限 `bonus`。所有已使用丹药和事件使用次数在成功或失败时都消耗。

---

### Task 1: Frozen Stage 3 content registries

**Files:**
- Create: `content/combat.js`
- Create: `content/techniques.js`
- Create: `content/realms.js`
- Create: `selftest_stage3_content.js`
- Modify: `content/items.js`
- Modify: `selftest_all.js`

**Interfaces:**
- Produces frozen CommonJS/browser globals `CombatContent`, `TechniqueContent`, `RealmContent`。
- Extends Stage 2 `ItemContent` with 27 equipment items and 16 technique-book items。

- [ ] **Step 1: Register the missing suite and verify RED**

Add `selftest_stage3_content.js` after the Stage 2 content suite, then run `npm test`.

Expected: only the missing Stage 3 suite fails.

- [ ] **Step 2: Write exact counts and referential-integrity tests**

```js
const Combat = require('./content/combat.js');
const Techniques = require('./content/techniques.js');
const Realms = require('./content/realms.js');
const Items = require('./content/items.js');

ok(Object.keys(Combat.REGIONS).length === 9, 'nine combat regions');
ok(Object.keys(Combat.ENEMIES).length === 45, 'forty-five enemy definitions');
ok(Object.keys(Combat.DUNGEONS).length === 9, 'nine dungeons');
ok(Object.values(Combat.DUNGEONS).every(d => d.waves.length === 4),
  'every dungeon has four wave groups');
ok(Combat.ENEMIES.ninefoldTribulation.phases.length === 2,
  'final boss exercises multi-phase support');
ok(Object.keys(Combat.EQUIPMENT).length === 27, 'twenty-seven equipment items');
ok(Object.keys(Techniques.TECHNIQUES).length === 16, 'sixteen techniques');
ok(Techniques.list('active').length === 10, 'ten active techniques');
ok(Techniques.list('passive').length === 6, 'six passive techniques');
ok(Realms.TRANSITIONS.length === 16, 'sixteen realm transitions');

for (const dungeon of Object.values(Combat.DUNGEONS)) {
  for (const wave of dungeon.waves) {
    ok(!!Combat.ENEMIES[wave.enemyId], 'dungeon enemy exists: ' + wave.enemyId);
  }
  for (const itemId of Object.keys(dungeon.firstClearRewards.items)) {
    ok(!!Items.ITEMS[itemId], 'first-clear item exists: ' + itemId);
  }
}
for (const technique of Object.values(Techniques.TECHNIQUES)) {
  ok(!!Items.ITEMS[technique.bookItemId], 'technique book exists: ' + technique.id);
}
for (const transition of Realms.TRANSITIONS) {
  if (transition.pillItemId) {
    ok(!!Items.ITEMS[transition.pillItemId], 'breakthrough pill exists');
  }
}
```

- [ ] **Step 3: Implement combat seeds and exact stat formulas**

Encode the nine rows from “Regions, dungeons, and enemy IDs” as explicit seed records, then build/freeze `REGIONS`, `ENEMIES`, and `DUNGEONS` with the exact formulas above. Do not generate IDs or names randomly.

Each enemy:

```js
{
  id, name, tier, rank: 'normal'|'elite'|'boss',
  stats: {hp,attack,defense,accuracy,evasion,attackIntervalTicks,critChance},
  cultivation,
  phases: [],
  lootTableId
}
```

Each dungeon includes `requiredRealmIndex`, `requiredDungeonId`, `waves`, `firstClearRewards`, and `repeatLootTableId`. Tier 1 has no prior dungeon; tier N requires tier N-1 first clear.

- [ ] **Step 4: Implement equipment, supply, loot, technique, and realm tables**

Use the exact IDs/formulas in this plan. Technique records:

```js
{
  id, name, kind: 'active'|'passive', tier,
  tags: ['sword'],
  requiredRealmIndex,
  bookItemId: 'techniqueBook:' + id,
  qiCost, cooldownTicks,
  effect
}
```

Realm transitions use:

```js
{
  currentRealmId, nextRealmId, name, nextName,
  cultivationNeed, baseChance, pillItemId,
  gate: {id, type:'enemyKills'|'dungeonClears', targetId, count},
  nextLifespan
}
```

Add item registry records for all equipment and books; category is `equipment` or `technique`, sale values are positive integers, and book records include `techniqueId`.

- [ ] **Step 5: Verify syntax and full tests**

```powershell
node --check content/combat.js
node --check content/techniques.js
node --check content/realms.js
node selftest_stage3_content.js
npm test
```

- [ ] **Step 6: Commit**

```powershell
git add content/combat.js content/techniques.js content/realms.js content/items.js selftest_stage3_content.js selftest_all.js
git commit -m "feat: define stage 3 combat content"
```

**Reviewer gate:** Count every registry, inspect generated stats at tiers 1/5/9, and verify no missing item/enemy/technique/gate references.

---

### Task 2: Schema v4 state and lossless v3 migration

**Files:**
- Create: `core/stage3-state.js`
- Create: `selftest_stage3_state.js`
- Modify: `core/state-model.js`
- Modify: `core/save-system.js`
- Modify: `selftest_foundation.js`
- Modify: `selftest_all.js`

**Interfaces:**
- Consumes Stage 2 schema v3。
- Produces `Stage3State.defaults()`, `normalize(model)`, `migrateV3(model)`, `normalizeSession(session)`。
- Sets `SaveSystem.SCHEMA_VERSION` to exactly `4` and keeps `v1→v2→v3→v4` migration chain。

- [ ] **Step 1: Add missing suite and verify RED**

Register `selftest_stage3_state.js`; `npm test` must fail only because it does not exist.

- [ ] **Step 2: Write default, migration, and JSON tests**

```js
const S = require('./core/stage3-state.js');
const defaults = S.defaults();
ok(defaults.player.combat.loadouts.length === 1, 'one default loadout');
ok(defaults.player.combat.loadouts[0].activeTechniques.length === 4,
  'four active slots');
ok(defaults.player.combat.loadouts[0].passiveTechniques.length === 3,
  'three passive slots');
ok(defaults.player.techniques.known &&
   Object.keys(defaults.player.techniques.known).length === 0,
  'no technique starts learned');
ok(defaults.systems.combat.session === null, 'no combat session starts');
ok(defaults.systems.combat.pendingLoot === null, 'no pending loot starts');

const migrated = S.migrateV3({
  player: {
    realmStage: 9,
    xiwei: 3456,
    shouyuan: 250,
    shouMax: 300,
    inventory: {capacity:40,stacks:{cloudwoodSword:1},bindings:{}}
  },
  systems: {}
});
ok(migrated.player.breakthrough.realmId === 'foundation',
  'legacy realm index maps to realm id');
ok(migrated.player.breakthrough.cultivation === 3456,
  'legacy cultivation is retained');
ok(!('realmStage' in migrated.player) && !('xiwei' in migrated.player),
  'v4 removes duplicated legacy realm fields');

const roundTrip = JSON.parse(JSON.stringify(S.normalize({
  player: defaults.player,
  systems: {
    combat: {
      session: {
        mode:'region', actionKey:'combat:region:qingyunOutskirts:thornHare',
        regionId:'qingyunOutskirts', enemyId:'thornHare',
        dungeonId:null, waveIndex:0, waveDefeated:0, bossPhase:0,
        intermissionTicks:0, elapsedTicks:7, tickRemainderSeconds:0.1,
        loadoutId:'loadout-1',
        loadoutSnapshot:{
          activeTechniques:[],passiveTechniques:[],supplies:{},techniqueLevels:{}
        },
        player:{hp:90,maxHp:100,qi:80,maxQi:100,attack:12,defense:5,
          accuracy:75,evasion:5,critChance:0.05,attackIntervalTicks:8,
          cooldownTicks:3,shield:0,buffs:{},statuses:{},techniqueCooldowns:{}},
        enemy:null
      },
      pendingLoot:null,nextLootId:1
    }
  }
})));
ok(roundTrip.systems.combat.session.elapsedTicks === 7,
  'mid-combat session survives JSON round-trip');
```

- [ ] **Step 3: Implement normalization**

Clamp all quantities/ticks/HP/Qi to finite non-negative values. Reject unknown region/enemy/dungeon/loadout/technique/item references. If a session is invalid, clear only the session and main combat action, append warning `invalid_combat_session_recovered`, and keep player progress.

Normalize conditions to the exact allowed shapes:

```js
{type:'always'}
{type:'selfHpBelow', threshold:0.01..1}
{type:'selfQiAbove', threshold:0..1}
{type:'enemyHpBelow', threshold:0.01..1}
{type:'enemyHasStatus', statusId:String}
{type:'selfMissingBuff', buffId:String}
```

Unknown conditions become `{type:'always'}`.

- [ ] **Step 4: Implement explicit save migration**

Add `migrateV3` to `core/save-system.js`; never silently relabel v3 as v4. Update Stage 2 schema assertions from 3 to 4 while retaining explicit v1, v2, and v3 fixtures. Startup repair immediately writes migrated v4 through the existing controller transaction.

- [ ] **Step 5: Verify**

```powershell
node --check core/stage3-state.js
node --check core/state-model.js
node --check core/save-system.js
node selftest_stage3_state.js
node selftest_foundation.js
npm test
```

- [ ] **Step 6: Commit**

```powershell
git add core/stage3-state.js core/state-model.js core/save-system.js selftest_stage3_state.js selftest_foundation.js selftest_all.js
git commit -m "feat: add stage 3 state migration"
```

**Reviewer gate:** Corrupt every nested session branch, load v1/v2/v3/v4 fixtures, and verify recovery never drops inventory, skills, mastery, techniques, gates, or dungeon progress.

---

### Task 3: Equipment, supplies, and multi-loadout transactions

**Files:**
- Create: `core/combat-loadouts.js`
- Create: `selftest_stage3_loadouts.js`
- Modify: `selftest_all.js`

**Interfaces:**
- Consumes `Inventory`, `CombatContent`, `TechniqueContent`。
- Produces pure `create`, `rename`, `remove`, `setActive`, `setEquipment`, `setSupply`, `setActiveTechnique`, `setPassiveTechnique`, `minimumSellRemainder`, `query`。
- Maximum 5 loadouts; exactly 4 active and 3 passive slots each。

- [ ] **Step 1: Add suite and verify RED**

Register `selftest_stage3_loadouts.js`; run `npm test`.

- [ ] **Step 2: Write transaction and binding tests**

Prove:

- New player has `方案一`; create returns `方案二`; sixth plan returns `loadout_limit`.
- Names trim to 1–12 characters; empty/duplicate names reject.
- Deleting active plan selects the first remaining plan; last plan cannot be deleted.
- Weapon/armor/accessory type mismatches reject without mutation.
- The same physical item may be referenced by multiple saved plans, and inventory binding `equipment` remains exactly 1 while any plan references it.
- Removing the last reference unbinds it.
- A bound planned item cannot be sold through Stage 2 Inventory.
- A configured supply is not inventory-bound because combat must be able to consume it; the command-layer sale guard allows selling excess but rejects selling the final referenced unit with `item_in_combat_plan`.
- Equipment/supply/technique edits to the active plan return `combat_active` while a combat session exists; inactive plans remain editable.
- Query output is deeply frozen.

```js
let model = Stage3State.defaults();
model.player.inventory.stacks.cloudwoodSword = 1;
let out = Loadouts.setEquipment(model, 'loadout-1', 'weapon', 'cloudwoodSword');
ok(out.ok && out.state.player.inventory.bindings.cloudwoodSword.equipment === 1,
  'planned equipment is protected');
out = Loadouts.create(out.state, '方案二');
out = Loadouts.setEquipment(out.state, out.result.id, 'weapon', 'cloudwoodSword');
ok(out.state.player.inventory.bindings.cloudwoodSword.equipment === 1,
  'shared preset reference binds one physical stack once');
```

- [ ] **Step 3: Implement reference-safe binding**

After every loadout mutation, compute the set of distinct referenced **equipment** item IDs across all plans. Reconcile `inventory.bindings[itemId].equipment` to 1 or 0 through `Inventory.bind/unbind`; do not increment per plan. Supply references are configuration IDs, not reserved stacks, because `CombatEngine` must consume them through ordinary `Inventory.apply`.

Expose `minimumSellRemainder(model,itemId)`: return 1 when any loadout references the item as food/pill/talisman, otherwise 0. Stage 3's `commands.sellItem` wrapper checks this before calling Stage 2 Inventory and returns `item_in_combat_plan` when the proposed sale would leave less than the minimum. This protects a configured supply from accidental sale without making it unavailable to combat.

Supply validation:

```js
food -> CombatContent.SUPPLIES[itemId].type === 'food'
pill -> type === 'pill'
talisman -> type === 'talisman'
triggerRatio -> finite 0.05..0.95
useAt -> exactly 'enemy_start'
```

- [ ] **Step 4: Implement slot validation and frozen query**

Active slot accepts only a learned active technique; passive slot only a learned passive technique. A technique cannot appear twice in the same plan. Query returns plan tabs, equipment stats, owned/available counts, slot priority numbers, conditions, supply counts and active-session edit lock.

- [ ] **Step 5: Verify and commit**

```powershell
node --check core/combat-loadouts.js
node selftest_stage3_loadouts.js
npm test
git add core/combat-loadouts.js selftest_stage3_loadouts.js selftest_all.js
git commit -m "feat: add battle loadout configuration"
```

**Reviewer gate:** Try shared references, replacement, failed binding, deletion and active-combat edits; all failures must preserve input byte-for-byte.

---

### Task 4: Technique books, levels, slots, and sect seam

**Files:**
- Create: `core/techniques.js`
- Create: `selftest_stage3_techniques.js`
- Modify: `selftest_all.js`

**Interfaces:**
- Produces `Techniques.consumeBook`, `grantXp`, `xpNeed`, `sectModifiers`, `scaledEffect`, `queryLibrary`。
- Inputs are immutable; inventory cost uses `Inventory.apply`。

- [ ] **Step 1: Add suite and verify RED**

Register `selftest_stage3_techniques.js`; run `npm test`.

- [ ] **Step 2: Write learning/duplicate/cap tests**

```js
let model = Stage3State.defaults();
model.player.inventory.stacks['techniqueBook:cloudPiercingSword'] = 2;
let learned = Techniques.consumeBook(model, 'techniqueBook:cloudPiercingSword', {
  sectId:null,favoredTechniqueIds:[],favoredTags:[]
});
ok(learned.ok && learned.state.player.techniques.known.cloudPiercingSword.level === 1,
  'first book permanently learns technique');
ok(learned.gainedXp === 0, 'first book does not become duplicate XP');

let duplicate = Techniques.consumeBook(learned.state,
  'techniqueBook:cloudPiercingSword', emptySect);
ok(duplicate.ok && duplicate.gainedXp === 100,
  'duplicate tier-one book grants 100 XP');
ok(duplicate.state.player.inventory.stacks['techniqueBook:cloudPiercingSword'] == null,
  'books are consumed exactly once');
```

Also prove:

- Unknown/non-book item rejects.
- Realm requirement checks `requiredRealmIndex - sect.requiredRealmReduction`.
- Favored ID or tag lowers requirement by one and XP cost to 90%.
- Nonfavored context leaves values unchanged.
- Large XP crosses levels and caps at 20 with XP 0.
- Combat, `npc_guidance`, and `sect_training` are accepted XP sources; unknown source rejects.
- Changing/clearing sect context after learning never removes known technique.
- Query includes owned book count, learned level/XP, scaled effect and eligibility; it is frozen.

- [ ] **Step 3: Implement exact XP and scaling**

Active numeric effects scale by:

```js
scaled = base * (1 + 0.03 * (level - 1));
```

Passive percentages scale by:

```js
scaled = base * (1 + 0.02 * (level - 1));
```

Round to four decimals. Cooldown and qi cost do not scale.

`grantXp` returns `{ok,state,levelsGained,capped}` and never mutates loadouts. Learned records remain even if no plan references them.

- [ ] **Step 4: Verify and commit**

```powershell
node --check core/techniques.js
node selftest_stage3_techniques.js
npm test
git add core/techniques.js selftest_stage3_techniques.js selftest_all.js
git commit -m "feat: add technique learning and progression"
```

**Reviewer gate:** Compare favored/unfavored XP thresholds at levels 1, 10 and 19; verify no sect context can delete or disable a learned technique.

---

### Task 5: Combat stat projection and condition priority

**Files:**
- Create: `core/combat-stats.js`
- Create: `selftest_stage3_stats.js`
- Modify: `selftest_all.js`

**Interfaces:**
- Consumes realm index, active loadout, equipment, learned passives, Stage 2 formation/beast effects。
- Produces `CombatStats.derive(model, loadoutId)`, `conditionMet(condition, battle)`, `selectAction(battle, loadoutSnapshot)`。

- [ ] **Step 1: Add suite and write RED tests**

Test base formulas at realm indices 0, 8 and 16. Equip tier-1 weapon/armor/accessory and assert exact additive stats. Equip `ironBody`, `steadyBreath`, `swiftShadow` and assert passive effects after equipment.

Prove `derive` returns no breakthrough field:

```js
const stats = CombatStats.derive(model, 'loadout-1');
ok(!Object.keys(stats).some(k => /break|probability|突破/i.test(k)),
  'combat projection cannot affect breakthrough chance');
```

Priority test:

```js
const loadout = {
  activeTechniques: [
    {techniqueId:'clearHeartArt',condition:{type:'selfHpBelow',threshold:0.5}},
    {techniqueId:'thunderSeal',condition:{type:'enemyHpBelow',threshold:0.4}},
    {techniqueId:'cloudPiercingSword',condition:{type:'always'}},
    {techniqueId:null,condition:{type:'always'}}
  ]
};
ok(selectAt40PercentHp.id === 'clearHeartArt', 'leftmost satisfied skill wins');
ok(selectAtFullHpLowEnemy.id === 'thunderSeal', 'second slot wins when first fails');
ok(selectAtFull.id === 'cloudPiercingSword', 'always fallback skill wins');
ok(selectWithoutQi.id === 'normalAttack', 'normal attack when no configured skill is usable');
```

Cover all six condition types, cooldown and qi rejection.

- [ ] **Step 2: Implement stable stat order**

Order:

1. Realm base.
2. Flat equipment.
3. Percent passive techniques.
4. Active formation and beast combat effects.
5. Clamp `maxHp/maxQi/attack/defense >= 1`, chance 0～0.95 and attack interval ≥2 ticks.

Return a plain frozen snapshot copied into the battle session at start. Later loadout changes cannot alter an active session.

- [ ] **Step 3: Implement condition evaluator**

Conditions never consume RNG. Missing enemy/status/buff makes the relevant condition false. `selectAction` scans indices 0→3 exactly once, then returns normal attack.

- [ ] **Step 4: Verify and commit**

```powershell
node --check core/combat-stats.js
node selftest_stage3_stats.js
npm test
git add core/combat-stats.js selftest_stage3_stats.js selftest_all.js
git commit -m "feat: derive combat stats and skill priority"
```

**Reviewer gate:** Independently recalculate stats and verify array order, clamping, condition boundaries and lack of mutation.

---

### Task 6: Deterministic combat tick and automatic supplies

**Files:**
- Create: `core/combat-engine.js`
- Create: `selftest_stage3_combat.js`
- Modify: `selftest_all.js`

**Interfaces:**
- Produces `CombatEngine.createSession`, `createEnemy`, `advanceTick`, `advanceTicks`。
- One tick is exactly 0.25 seconds; `advanceTicks` is only a test/helper loop over `advanceTick`, not a second runtime path。

- [ ] **Step 1: Add suite and write deterministic RED tests**

Use `sequenceRandom` and a fixed player/enemy. Assert:

- Same seed and state produce byte-identical output/events.
- `createSession` copies the selected plan, technique levels and derived stats into `loadoutSnapshot`; later edits to the saved plan/library cannot affect that active session.
- 40 calls to `advanceTick` equal `advanceTicks(...,40)`.
- A miss consumes one accuracy roll and deals 0.
- A hit/noncrit and hit/crit produce exact formula damage.
- Player acts before enemy; a killing player hit prevents that enemy action.
- Cooldowns and statuses decrement exactly once.
- Two-hit technique consumes two attack accuracy/crit pairs in stable order.
- Healing technique consumes no accuracy/crit RNG.
- Technique XP is emitted only when a technique successfully executes.
- Unknown technique in session recovers to normal attack and warning `invalid_technique`.

- [ ] **Step 2: Write supply tests**

Prove:

- Food is used before the player action when HP ratio is at/below threshold.
- Healing is capped at max HP and includes `pillGuard`.
- Qi pill triggers at/below threshold.
- Talisman configured `enemy_start` consumes once per spawned enemy.
- When a triggering supply is empty and `stopWhenEmpty:true`, outcome is `supply_exhausted`; the enemy does not attack that tick.
- With `stopWhenEmpty:false`, combat continues without supply.
- Every consumed item is reported and removed atomically.
- Breakthrough pills are not valid combat supplies.

- [ ] **Step 3: Implement tick order and RNG**

`advanceTick(session, context)` returns:

```js
{
  ok: true,
  session,
  playerInventory,
  rngState,
  outcome: 'continue'|'enemy_defeated'|'player_defeated'|'supply_exhausted',
  events: [{
    type, sourceId, targetId, amount, critical, techniqueId
  }],
  gains: {techniqueXp:{}},
  costs: {items:{}},
  metrics: {damageDealt,damageTaken,suppliesUsed:{}}
}
```

All inventory consumption uses Stage 2 `Inventory.apply`. No engine method grants loot or updates dungeon progress.

- [ ] **Step 4: Implement statuses**

Only these Stage 3 statuses are required:

```js
shock: {remainingTicks:8, skipNextAction:true}
slow: {remainingTicks:12, attackIntervalAdd:2}
haste: {remainingTicks:40, attackIntervalReduction:0.10}
```

No stacking: reapplication keeps the larger remaining duration. Values are finite integers.

- [ ] **Step 5: Verify and commit**

```powershell
node --check core/combat-engine.js
node selftest_stage3_combat.js
npm test
git add core/combat-engine.js selftest_stage3_combat.js selftest_all.js
git commit -m "feat: add deterministic automatic combat ticks"
```

**Reviewer gate:** Re-run the same 10,000-tick fixture twice, compare hashes and RNG states, and inspect simultaneous kill/supply/status boundaries.

---

### Task 7: Drop transactions and protected pending loot

**Files:**
- Create: `core/combat-rewards.js`
- Create: `selftest_stage3_rewards.js`
- Modify: `selftest_all.js`

**Interfaces:**
- Consumes `CombatContent` and `Inventory`。
- Produces `rollEnemyLoot`, `rollFirstClearRewards`, `applyOrPend`, `claimPending`, `queryPending`。

- [ ] **Step 1: Add suite and write RED tests**

Prove:

- Fixed RNG hits/misses each ordered drop row and quantity range.
- Identical seed/input returns identical items, currency and next seed.
- Sufficient inventory applies the entire batch atomically.
- Full inventory applies nothing and stores exactly one pending batch.
- Existing pending loot blocks another battle reward with `pending_loot_exists`.
- Claim with space adds everything once and clears pending.
- Repeated claim returns `no_pending_loot`.
- Pending loot survives JSON round-trip.
- Bound items and equipment stacks obey Stage 2 slot rules.

- [ ] **Step 2: Implement exact RNG consumption**

For each drop entry in content order:

1. Consume one chance draw.
2. If successful and `min !== max`, consume one quantity draw.
3. Add quantity to a temporary item map.

Guaranteed rows still consume no chance draw. First-clear fixed rewards consume no RNG.

- [ ] **Step 3: Implement pending transaction**

```js
pendingLoot = {
  id: 'combat-loot-' + nextLootId,
  source: {type:'enemy'|'dungeon-first-clear', id},
  items: {},
  currency: 0,
  createdAtMs
}
```

`applyOrPend` first tries one `Inventory.apply`. On failure `inventory_full`, keep inventory/currency unchanged, store the whole batch, increment nextLootId, and return warning `inventory_full`.

- [ ] **Step 4: Verify and commit**

```powershell
node --check core/combat-rewards.js
node selftest_stage3_rewards.js
npm test
git add core/combat-rewards.js selftest_stage3_rewards.js selftest_all.js
git commit -m "feat: protect combat loot transactions"
```

**Reviewer gate:** Verify no failure path partially grants currency, items, book, equipment or consumes pending loot.

---

### Task 8: Regions, dungeon waves, bosses, and permanent combat progress

**Files:**
- Create: `core/combat-progress.js`
- Create: `selftest_stage3_dungeons.js`
- Modify: `selftest_all.js`

**Interfaces:**
- Produces `canStartRegion`, `canStartDungeon`, `startRegion`, `startDungeon`, `afterEnemyDefeated`, `nextDungeonEnemy`, `queryRegions`, `queryDungeons`。
- Uses `CombatEngine` for each enemy and `CombatRewards` for rewards。

- [ ] **Step 1: Add suite and write region tests**

Prove:

- Locked realm/unknown region/enemy rejects before replacing main action.
- Region action repeatedly spawns the selected enemy after 4 intermission ticks.
- Health/Qi persist between region enemies.
- Enemy kill and region kill counts increment once.
- Each kill grants configured cultivation and passive-technique XP.
- Pending loot stops the action with `requirements_invalid`.

- [ ] **Step 2: Write dungeon tests**

Prove:

- Prior-dungeon/realm/item prerequisites reject without consuming anything.
- A run creates wave 0 enemy 1; exact sequence is 2/2/1/1.
- HP/Qi and remaining supplies persist through waves.
- Boss death increments dungeon clear exactly once.
- First clear reward and gate happen once; second clear gets only repeat loot.
- `ninefoldTribulation` phase 1 death creates phase 2 without incrementing wave/clear or granting phase-1 boss loot.
- After a completed run, a repeat action waits 12 ticks, refills HP/Qi, and starts the next run.
- Mid-wave save/reload reaches the same final state as uninterrupted play.

- [ ] **Step 3: Implement permanent gate evaluator**

After every kill/clear, evaluate all `RealmContent.TRANSITIONS` gates:

```js
enemyKills -> enemyKills[targetId] >= count
dungeonClears -> dungeonClears[targetId] >= count
```

Set `completedGates[gate.id] = true`; never set false. Emit unlock only on false→true.

Provide future task hook:

```js
recordExternalGate(progress, gateId, source)
```

It accepts only a gate defined with `type:'task'`; the first batch defines none, so Stage 3 UI cannot fabricate task completion.

- [ ] **Step 4: Implement frozen ViewModels**

Region VM includes unlock, three enemies, stats, drop preview, kill counts and active progress. Dungeon VM includes prerequisites, four wave groups, first-clear status/reward, repeat drops, clear count, active wave/enemy/boss phase.

- [ ] **Step 5: Verify and commit**

```powershell
node --check core/combat-progress.js
node selftest_stage3_dungeons.js
npm test
git add core/combat-progress.js selftest_stage3_dungeons.js selftest_all.js
git commit -m "feat: add regions and dungeon progression"
```

**Reviewer gate:** Audit all off-by-one wave/phase transitions, first-clear idempotency, permanent gates and arbitrary save/reload boundaries.

---

### Task 9: Defeat, severe-injury retreat, and recovery lane

**Files:**
- Modify: `core/combat-progress.js`
- Create: `selftest_stage3_injury.js`
- Modify: `selftest_all.js`

**Interfaces:**
- Produces `applyDefeat`, `advanceInjury`, `treatInjury` and passive lane adapter。

- [ ] **Step 1: Add suite and write RED tests**

Prove:

- HP 0 clears combat session and combat main action.
- Stop reason is `injured`, report retreat reason is `player_defeated`.
- One 1800-second severe injury is created.
- Equipment, inventory except consumed supplies, techniques, gates and dungeon clears remain unchanged.
- Consumed food/pill/talisman is not refunded.
- Starting combat while injured returns `injured`.
- Noncombat Stage 2 actions remain startable.
- Injury advances full real online/offline time, ignores main-action offline cap, and is chunk invariant.
- At zero injury becomes null.
- `treatInjury` consumes one `healingPill`, subtracts 600 seconds, clamps to zero, and is atomic.

- [ ] **Step 2: Implement defeat**

`applyDefeat` never calls death/轮回. If an injury already exists, set remaining to `max(existing.remainingSeconds,1800)`, not sum. Keep partial dungeon progress only in the cleared progress records; the failed run session is discarded.

- [ ] **Step 3: Implement Stage 1B lane**

```js
{
  id: 'stage3-injury-recovery',
  nextBoundary(state) {
    return state.player.combat.injury
      ? state.player.combat.injury.remainingSeconds
      : Infinity;
  },
  elapse(state, seconds) {
    if (state.player.combat.injury) {
      state.player.combat.injury.remainingSeconds -= seconds;
    }
  },
  resolve(state, helpers) {
    if (state.player.combat.injury &&
        state.player.combat.injury.remainingSeconds <= 1e-9) {
      state.player.combat.injury = null;
      helpers.report.passive.injuryRecovered = true;
    }
  }
}
```

Extend `SimulationReport.normalize` with optional `passive.injuryRecovered:false`.

- [ ] **Step 4: Verify and commit**

```powershell
node selftest_stage3_injury.js
npm test
git add core/combat-progress.js core/simulation-report.js selftest_stage3_injury.js selftest_all.js
git commit -m "feat: add severe-injury retreat and recovery"
```

**Reviewer gate:** Search for permanent death/resource deletion on ordinary defeat and compare capped offline main time with uncapped injury recovery.

---

### Task 10: Permanent-gate breakthrough with restricted probability sources

**Files:**
- Create: `core/breakthrough.js`
- Create: `selftest_stage3_breakthrough.js`
- Modify: `selftest_all.js`

**Interfaces:**
- Produces `Breakthrough.requirements`, `chance`, `attempt`, `addEventBuff`, `query`。
- `chance` signature deliberately excludes equipment/techniques/relations：

```js
chance(transition, selectedPills, activeEventBuffs)
```

- [ ] **Step 1: Add suite and write gate/chance RED tests**

Prove:

- Insufficient cultivation blocks.
- Missing permanent gate blocks.
- Gate stays true across every failure.
- Minor transition has 100% base and still requires gate/cultivation.
- Major base rates exactly match table.
- 2 matching pills add exactly 0.40; wrong pill rejects.
- Event buffs with no remaining use do not count.
- Chance clamps at 1.00.
- Adding/removing equipment, techniques, formation, beast, relationship or sect fields does not change `chance`.

```js
const base = B.chance(t, [], []);
const noisyModel = addEveryForbiddenBonus(model);
ok(B.chance(t, [], []) === base,
  'non-permitted systems cannot affect breakthrough probability');
```

- [ ] **Step 2: Write success/failure consumption tests**

With deterministic random:

- Attempt always consumes exactly one RNG draw, including 100% chance.
- Success consumes selected pills and one use from each included event buff, advances realm, sets cultivation 0, refreshes lifespan, retains completed gates.
- Failure consumes the same preparation, sets cultivation 0, retains realm and all completed gates.
- No attempt can consume healing/food/talisman or mismatched pills.
- Retry after failure does not require re-clearing dungeon/kill gate.
- At final realm returns `highest_realm`.
- Input is unchanged on all validation failures.

- [ ] **Step 3: Implement event hook and attempt**

`addEventBuff(model,buff)` is internal for Stage 4:

```js
{
  id: nonempty String,
  bonus: finite 0..1,
  usesRemaining: positive integer
}
```

Same ID replaces only when the new object has greater `usesRemaining`; Stage 3 exposes no UI command to create buffs.

`attempt` validates first, clones model, consumes pill inventory through one `Inventory.apply`, consumes event uses, draws RNG, applies success/failure, and returns:

```js
{
  ok:true, code:'success'|'failure',
  state, rngState,
  chance, roll,
  consumed:{items,eventBuffIds},
  gateId,
  realmBefore, realmAfter
}
```

- [ ] **Step 4: Verify and commit**

```powershell
node --check core/breakthrough.js
node selftest_stage3_breakthrough.js
npm test
git add core/breakthrough.js selftest_stage3_breakthrough.js selftest_all.js
git commit -m "feat: enforce permanent breakthrough gates"
```

**Reviewer gate:** Inspect the `chance` call graph and prove there is no path from combat stats, formation effects, beast effects, sect context or relationship state.

---

### Task 11: Register combat with the unified simulation

**Files:**
- Create: `core/stage3-rules.js`
- Create: `selftest_stage3_simulation.js`
- Modify: `core/stage2-rules.js`
- Modify: `game.js`
- Modify: `index.html`
- Modify: `selftest_all.js`
- Modify: `selftest_foundation.js`

**Interfaces:**
- Produces `Stage3Rules.create(deps) -> {rules,lanes}` by extending, not replacing, Stage 2 rules。
- Rules/lanes are frozen ordinary objects/arrays。

- [ ] **Step 1: Add suite and write action tests**

Prove:

- Both combat action key forms validate before replacing the current action.
- Combat descriptor duration is exactly 0.25 seconds.
- One Simulation completion advances one combat tick but does not increment `mainAction.done`.
- Region enemy kill increments report completion once.
- Dungeon final clear increments report completion once; internal waves/ticks do not.
- `supply_exhausted`, `injured`, and pending-loot inventory full clear the main action with the specified Stage 1B stop reason.
- Switching away clears the active combat session with stop reason `switched`; no background combat remains.
- Noncombat Stage 2 actions and passive lanes still work.

- [ ] **Step 2: Extend report structure**

Add optional:

```js
combat: {
  ticks: 0,
  enemiesDefeated: {},
  dungeonClears: {},
  damageDealt: 0,
  damageTaken: 0,
  suppliesUsed: {},
  loot: {},
  pendingLootId: null,
  retreatReason: null
},
techniques: {xp:{}}
```

`SimulationReport.summarize` merges these deterministically and preserves report IDs.

- [ ] **Step 3: Implement combat rule adapter**

`Stage3Rules` delegates:

```text
session absent -> validate/loadout snapshot/create first enemy
each 0.25s -> CombatEngine.advanceTick
enemy defeated -> CombatRewards + CombatProgress
dungeon transition -> nextDungeonEnemy
player defeated -> applyDefeat/stop injured
supply missing -> stop supply_exhausted
pending loot -> stop requirements_invalid + warning inventory_full
```

Cultivation, technique XP, loot, costs and unlocks copy into the shared report. No adapter touches UI/storage.

- [ ] **Step 4: Write online/offline and reload parity**

For the same v4 model and seed compare:

```text
120 seconds: 480 × 0.25s online vs one 120s offline
6 hours: irregular chunks [0.25,1.75,17,60] repeated vs one batch
12-hour capped combat vs 48-hour offline: combat 12h, injury/farm/fish 48h
save/reload at player cooldown=3
save/reload between dungeon enemies
save/reload at final boss phase transition
save/reload with pending loot
```

Final state and RNG must be byte-identical. Normalize report IDs/timestamps, then compare report totals.

- [ ] **Step 5: Load modules and scan architecture**

Load content/core scripts before `game.js` in dependency order. Construct one combined frozen runtime. Add source scans:

```js
for (const file of stage3PureFiles) {
  const source = fs.readFileSync(file, 'utf8');
  ok(!/Math\.random|localStorage|Platform\.|SaveSystem|document\.|canvas|toast\(/.test(source),
    file + ' is pure');
}
```

- [ ] **Step 6: Verify and commit**

```powershell
node --check core/stage3-rules.js
node --check game.js
node selftest_stage3_simulation.js
node selftest_foundation.js
npm test
git add core/stage3-rules.js core/stage2-rules.js core/simulation-report.js game.js index.html selftest_stage3_simulation.js selftest_foundation.js selftest_all.js
git commit -m "feat: integrate combat with unified simulation"
```

**Reviewer gate:** Verify no second clock/offline batch shortcut, and independently compare at least three random seeds across online/offline/reload.

---

### Task 12: Frozen Stage 3 command/query API

**Files:**
- Create: `selftest_stage3_api.js`
- Modify: `game.js`
- Modify: `selftest_all.js`
- Modify: `selftest_ui.js`

**Interfaces:**
- Preserves all Stage 1B/2 methods and frozen boundary。
- Adds:

```js
commands.consumeTechniqueBook({itemId})
commands.createCombatLoadout({name})
commands.renameCombatLoadout({loadoutId,name})
commands.deleteCombatLoadout({loadoutId})
commands.setActiveCombatLoadout({loadoutId})
commands.setEquipment({loadoutId,slot,itemId})
commands.setSupply({loadoutId,slot,config})
commands.setActiveTechnique({loadoutId,slotIndex,techniqueId,condition})
commands.setPassiveTechnique({loadoutId,slotIndex,techniqueId})
commands.claimCombatLoot()
commands.treatInjury()
commands.attemptBreakthrough({pillItemId,quantity})

queries.combat({tab})
queries.combatLoadouts()
queries.techniques()
queries.breakthrough()
```

- [ ] **Step 1: Add suite and API-shape RED tests**

Assert every method exists, `GameAPI/queries/commands/render` are frozen, and no `state/data/persist` exists. Every nested query mutation must leave the next query unchanged.

- [ ] **Step 2: Write command transaction tests**

Prove:

- Successful model command saves once then replaces model.
- Save failure returns `save_failed`, `changed:false` and leaves model unchanged.
- Combat start still uses Stage 2 `commands.startAction({key})`.
- Loadout edits, book use, pending claim, injury treatment and breakthrough produce standard command result.
- The preserved Stage 2 sell command consults `minimumSellRemainder`: it blocks sale of the last configured supply but combat can still consume that unit.
- `attemptBreakthrough` exposes chance/roll/result but not mutable state.
- No public command can add event buffs or mark gates complete.
- Immediate command reports archive gains/costs without adding main-action time.

- [ ] **Step 3: Implement frozen ViewModels**

`queries.combat({tab})`:

- `regions`: region/enemy cards, drops, kills, active battle HP/Qi/cooldowns.
- `dungeons`: prerequisites, waves, first/repeat rewards, clear count and active wave/phase.
- `sectTrial`: `{implemented:false, reason:'加入宗门后开放'}`.
- `specialRealm`: `{implemented:false, reason:'后续秘境内容开放'}`.

`combatLoadouts`: plans, equipment, supplies, technique priority/conditions and current derived stats.

`techniques`: learned/unlearned library, owned book counts, levels/XP, scaled effects and sect modifier display.

`breakthrough`: current/next realm, cultivation, permanent gate status/progress, base chance, selectable matching pill quantity, event buff list, final chance and failure consequence.

- [ ] **Step 4: Verify and commit**

```powershell
node --check game.js
node selftest_stage3_api.js
node selftest_ui.js
npm test
git add game.js selftest_stage3_api.js selftest_ui.js selftest_all.js
git commit -m "refactor: expose stage 3 commands and queries"
```

**Reviewer gate:** Attempt all mutations through query results and failed commands; confirm no raw model/content/function leaks.

---

### Task 13: Render combat, techniques, loadouts, and breakthrough in the existing UI

**Files:**
- Modify: `ui.js`
- Modify: `styles.css`
- Modify: `selftest_ui.js`

**Interfaces:**
- Consumes only `GameAPI.queries`, `commands`, `render`。
- Preserves the existing shell, topbar, left nav, right content and modal roots。

- [ ] **Step 1: Add UI RED assertions**

Assert:

- Existing `.topbar`, `.nav`, `.content`, avatar, offline modal and Stage 2 pages still exist.
- `战斗` page has four tabs in order `普通区域/副本/宗门试炼/特殊秘境`.
- Region cards show enemies and one action button.
- Dungeon card shows waves, prerequisites and first-clear marker.
- Active combat panel shows player/enemy HP, Qi, current skill, wave/phase and supplies.
- `功法` page shows library and loadout editor.
- Breakthrough modal shows permanent gate, cultivation, three allowed probability sources and failure text.
- No real-time skill-release button exists.

- [ ] **Step 2: Render combat tabs**

Use existing right scroll area. Clicking enemy/dungeon calls:

```js
commands.startAction({key:'combat:region:' + regionId + ':' + enemyId})
commands.startAction({key:'combat:dungeon:' + dungeonId})
```

Active action offers only `停止当前行动`. HP/Qi/cooldown/wave data are read-only and refresh through query.

Sect trial and special realm use the exact reserved cards from Task 12; no fake sect membership or map.

- [ ] **Step 3: Render loadouts and supplies**

Add compact tabs for up to five plans. Each plan renders three equipment selectors, food/pill/talisman selectors, four numbered active slots with condition editor, and three passive slots. Editing active combat plan shows locked state and command message.

Condition editor options exactly match the six normalized types; threshold inputs clamp to 1–100 percent.

- [ ] **Step 4: Render technique library**

Each card shows book count, learned/unlearned, level/XP, kind, tags, qi/cooldown/effect and learn/absorb button. Button only calls `consumeTechniqueBook`. Learned abilities are not removed when sect context is empty.

- [ ] **Step 5: Render pending loot and injury**

Pending loot opens a compact modal/list with required free slots and `整理背包后领取`. Claim button calls `claimCombatLoot`.

Injury card shows remaining real time, `重伤期间无法开始战斗` and optional healing-pill treatment. Copy says `重伤撤退`, never ordinary death/轮回.

- [ ] **Step 6: Replace breakthrough modal data**

Show:

```text
永久门槛：完成/未完成及当前进度
修为：current/need
基础概率
所选丹药加成
事件增益
最终概率
失败：修为清空；门槛保留；本次丹药消耗
```

Do not display equipment、功法、符箓、阵法、灵兽、关系或洞府 as chance sources.

- [ ] **Step 7: Additive responsive styles**

Add `.combat-tabs`, `.enemy-card`, `.dungeon-waves`, `.battle-status`, `.hp-bar`, `.qi-bar`, `.loadout-tabs`, `.technique-slot`, `.condition-row`, `.pending-loot`, `.injury-card`. At 360×800 no body horizontal scroll; left/right areas remain independently scrollable.

- [ ] **Step 8: Verify and commit**

```powershell
node --check ui.js
node selftest_ui.js
npm test
git add ui.js styles.css selftest_ui.js
git commit -m "feat: render stage 3 in existing ui shell"
```

**Reviewer gate:** Smoke at 360×800 and 420×820, ensure combat configuration never covers the play area/shell and no UI element mutates model directly.

---

### Task 14: Stage 3 release synchronization and engineering gate

**Files:**
- Modify: `scripts/sync-release.js`
- Modify: `selftest_release_sync.js`
- Modify: `package.json`
- Generate: `release/content/**`
- Generate: `release/core/**`
- Generate: `release/index.html`
- Generate: `release/game.js`
- Generate: `release/ui.js`
- Generate: `release/styles.css`

- [ ] **Step 1: Extend release manifest and verify RED**

Add every Stage 3 runtime file to the existing root→release hash test before syncing. `npm test` must fail on missing/drifted Stage 3 release files.

- [ ] **Step 2: Sync from root only**

Run the existing allowlisted sync script after extending its explicit `core/` and `content/` coverage. It must not touch `release/NIE` or copy release changes back to root.

- [ ] **Step 3: Run deterministic engineering matrix**

```text
same state/seed, 10,000 combat ticks twice -> same hash/RNG
120s online 0.25 chunks vs offline batch -> same state/report totals
6h irregular chunks vs batch -> same state
48h offline -> combat max 12h, injury/farm/fish full 48h
save/reload at attack cooldown, wave transition, boss phase, pending loot
region defeat -> injury, no death/resource wipe
dungeon first clear twice -> reward/gate once
duplicate technique books -> correct XP/level
four active slots -> leftmost satisfied only
five loadouts -> equipment binding stable
breakthrough success/failure -> pills consumed, cultivation cleared, gate retained
forbidden combat/relationship/etc fields -> no chance change
```

- [ ] **Step 4: Run full commands**

```powershell
npm run sync-release
node --check content/combat.js
node --check content/techniques.js
node --check content/realms.js
node --check core/combat-engine.js
node --check core/stage3-rules.js
node --check core/breakthrough.js
node --check game.js
node --check ui.js
npm test
```

- [ ] **Step 5: Architecture and wording scans**

```powershell
rg -n "Math\.random|localStorage|Platform\.|SaveSystem|document\.|canvas|toast\(" core content
rg -n "GameAPI\.(state|data|persist)|\ba\.(state|data|persist)\b" ui.js
rg -n "双修|普通战斗.*死亡|副本.*死亡" index.html game.js ui.js styles.css core content
```

Expected: pure modules have no forbidden runtime calls, UI has no mutable access, and player-facing forbidden copy is absent.

- [ ] **Step 6: Browser smoke QA**

At 360×800 and 420×820:

- Start ordinary combat, switch page and confirm combat continues.
- Switch to a dungeon and confirm prior combat is replaced.
- Observe automatic priority skill release without clicking.
- Exhaust configured supply and verify retreat.
- Lose once and verify injury, retained equipment/inventory/gates.
- Learn a book twice and configure two loadouts.
- Clear a dungeon, fail breakthrough, verify gate remains.
- Reopen mid-dungeon and verify continuation.
- Confirm offline settlement opens first and includes combat summary.
- Confirm no uncaught console error.

This is an engineering gate, not a “fun” or playability approval.

- [ ] **Step 7: Commit**

```powershell
git add scripts/sync-release.js selftest_release_sync.js package.json release
git commit -m "build: synchronize verified stage 3 release"
```

**Reviewer gate:** From a clean checkout, run sync/tests twice; the second run must produce no diff. Review all Stage 3 commits for unresolved Serious/Important findings.

---

## Stage 3 Completion Gate

- 9 regions, 45 enemy definitions, 9 four-wave dungeons, 27 equipment items, 16 techniques and all referenced drops pass content integrity tests.
- Combat advances only through deterministic 0.25-second Stage 1B simulation boundaries.
- Online, offline and arbitrary save/reload produce identical state and RNG.
- Ordinary combat repeats selected enemy; dungeons preserve HP/Qi/supplies through fixed waves and boss phases.
- Defeat causes 30-minute severe injury and retreat, never ordinary permanent death or resource wipe.
- Configured supplies consume atomically; shortage follows the player’s `stopWhenEmpty` setting.
- Loot is deterministic and never lost to full inventory; pending loot is claimed exactly once.
- Equipment, supplies, 4 active slots, 3 passive slots, conditions and up to 5 schemes persist and protect referenced inventory.
- First technique book learns permanently; duplicates grant XP; levels cap at 20; left-to-right conditions decide automatic release.
- Sect context can lower pre-learning requirement and XP cost, but empty/changed context never removes learned techniques.
- Region/dungeon progress grants permanent gates exactly once.
- Breakthrough chance has only base/pill/event inputs and can reach 100%.
- Breakthrough success and failure consume selected preparation; failure clears cultivation and retains every gate.
- Existing top/left/right UI skeleton, Stage 2 pages, offline/event flow and character Canvas have no regression.
- schema v4 migrates explicitly from v1/v2/v3 and survives JSON round-trip mid-combat.
- Root and `release/` hashes match; all focused tests and `npm test` pass; final independent review has no unresolved Serious or Important finding.

## Required Task Order and Review Gates

1. Content
2. State/migration
3. Loadouts
4. Techniques
5. Stats/conditions
6. Combat tick/supplies
7. Rewards
8. Regions/dungeons/gates
9. Injury
10. Breakthrough
11. Simulation integration
12. Commands/queries
13. UI
14. Release/final gate

Tasks 5→11 are strictly sequential. Use a fresh implementer and a fresh reviewer per task. Fix and re-review every Serious or Important issue before advancing. Minor findings are recorded for final Stage 3 review.

## Self-Review

- Spec coverage: deterministic automatic combat, regions, fixed dungeon waves, elites/bosses/multi-phase support, defeat/injury, supplies, protected loot, equipment, books/duplicates/levels, slots/conditions/priority, multiple plans, sect seam, permanent breakthrough gates and restricted probability sources each map to a task and test.
- Scope control: no NPCs, relationships, sect membership, player market, map, real-time manual skill button, succession or world-person simulation is invented.
- Interface consistency: Stage 3 uses Stage 1B `Simulation.advance`, Stage 2 inventory/rules/API, schema v4, frozen ViewModels and standard command results throughout.
- UI continuity: only existing `战斗`, `功法` and breakthrough surfaces are populated; the shell is not replaced.
