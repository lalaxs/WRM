# 钓鱼 Melvor 对标设计（鱼种 / 杂物 / 特殊 / 装备）

日期：2026-08-11

## 决策摘要

- 钓鱼对标 Melvor：约 **15 钓区**、约 **50 生鱼**，每次行动按钓区滚 **鱼 / 杂物 / 特殊**。
- 主消耗口仍是烹饪→战斗回血；少数鱼走炼丹/阵法/直食/口粮。
- 杂物以出售为主，少量进低阶制作。
- 特殊表含宝匣、解锁物、钓鱼消耗品与 **稀有可装备**；不取代采矿→炼器主装。
- 采药为主草源、炼丹保守约 18 系等产销总原则见会话定稿；本文件只定钓鱼子系统。
- 配方不强制双来源；交叉按需差异化。

## 单次行动结算

```text
1. 按当前钓区权重抽取结果类型：fish | junk | special
2. fish   → 在本区鱼表中按权重抽一种生鱼（受鱼种解锁等级约束）
3. junk   → 在全局杂物池抽一件；技能 XP = 1（可配置）
4. special→ 给「本应钓到的目标鱼」同等 XP，再在特殊池按权重抽一件
5. 某鱼熟练度 ≥ 阈值后，钓该鱼时 junk 权重视为 0（对标 Melvor 65）
6. 可选全局熟练检查点：进一步降低或免除 junk
```

宝匣类特殊物进背包后，由玩家手动打开（二段反馈）。

---

## 表① 钓区：鱼 / 杂物 / 特殊概率

概率为设计初值，实现时可整体缩放，但应保持「浅滩 junk 高、秘区 special 高、荒洋 junk 低」的相对关系。

| 序号 | 钓区 ID | 名称 | 解锁 | 鱼% | 杂物% | 特殊% | 本区鱼种（ID） |
| ---: | --- | --- | ---: | ---: | ---: | ---: | --- |
| 1 | `pond` | 村口池塘 | 1 | 75 | 25 | 0 | `spiritShrimp` 灵虾, `sardineFish` 沙丁灵鱼, `spiritCarp` 灵鲤 |
| 2 | `shrapnelCreek` | 碎石灵溪 | 5 | 80 | 20 | 0 | `sardineFish` 沙丁灵鱼, `herringFish` 青鲱, `blowfish` 河豚灵 |
| 3 | `shallow` | 灵溪浅滩 | 8 | 78 | 20 | 2 | `spiritShrimp` 灵虾, `spiritCarp` 灵鲤, `silverTrout` 银鳟 |
| 4 | `moon` | 银月溪谷 | 15 | 72 | 26 | 2 | `silverTrout` 银鳟, `spiritSeahorse` 灵海马, `mackerelFish` 鲭灵鱼 |
| 5 | `pier` | 渡口渔栈 | 20 | 70 | 28 | 2 | `silverTrout` 银鳟, `sunsetSalmon` 霞鲑, `fanfish` 扇尾鱼 |
| 6 | `deep` | 翠玉深潭 | 28 | 70 | 27 | 3 | `greenBass` 青鲈, `poisonFish` 毒泡鱼, `darkCatfish` 玄鲶 |
| 7 | `openWaters` | 沧澜阔水 | 40 | 70 | 27 | 3 | `swordfish` 剑鱼, `spiritLobster` 灵龙虾, `mantaRay` 鳐灵 |
| 8 | `barrenOcean` | 荒洋无风带 | 50 | 88 | 10 | 2 | `sharkSpirit` 鲨灵, `whaleSpirit` 鲸灵, `halibutFish` 比目灵 |
| 9 | `trench` | 剑渊海沟 | 55 | 68 | 28 | 4 | `blowfish` 河豚灵, `anglerFish` 鮟鱇灵, `caveFish` 洞冥鱼, `swordfish` 剑鱼 |
| 10 | `thunderPond` | 雷泽沼地 | 48 | 80 | 15 | 5 | `thunderEel` 雷鳗, `lavaFish` 熔岩鱼, `magmaEel` 炎髓鳗 |
| 11 | `jungleWaters` | 蛮藤水泽 | 60 | 78 | 18 | 4 | `spikeFish` 刺鳞鱼, `blueCrab` 蓝玉蟹, `largeBlowfish` 巨河豚 |
| 12 | `staticValley` | 静雷谷涧 | 65 | 82 | 14 | 4 | `rockfish` 岩纹鱼, `staticJellyfish` 静电水母 |
| 13 | `frozenSea` | 玄冰海 | 70 | 88 | 10 | 2 | `frostCrab` 霜蟹, `frozenManta` 冻鳐 |
| 14 | `midnightLagoon` | 夜汐潟湖 | 75 | 66 | 28 | 6 | `ghostFish` 鬼纹鱼, `terrorFish` 骇浪鱼, `skeletonFish` 骨纹鱼 |
| 15 | `mysticPond` | 玄机秘潭 | 80 | 84 | 10 | 6 | `mysticSeahorse` 玄海马, `mysticShark` 玄鲨, `magicFish` 魔光鱼, `dragonFish` 龙鱼 |
| 16 | `secretCove` | 漂流秘湾 | 瓶解锁 | 92 | 0 | 8 | `spiritSeahorse` 灵海马, `skeletonFish` 骨纹鱼, `magicFish` 魔光鱼 |
| 17 | `berserkShoal` | 狂澜滩 | 护腕解锁 | 94 | 5 | 1 | `leapingTrout` 跃纹鳟, `leapingSalmon` 跃纹鲑, `leapingBroad` 阔跃鱼 |

说明：

- 表内 **17 区**（15 常驻 + 2 解锁），常驻数量对齐 Melvor 主表体量。
- 现有 10 鱼全部保留：`spiritCarp` `spiritShrimp` `silverTrout` `greenBass` `darkCatfish` `sunsetSalmon` `thunderEel` `spiritLobster` `swordfish` `dragonFish`。
- 新增约 40 鱼槽，合计约 **50**（含跃纹 3 种）。
- `secretCove` 由特殊物「漂流瓶」解锁；`berserkShoal` 由「狂澜护腕」装备或解锁标记开启。

### 生鱼默认去向（差异化，非强制交叉）

| 去向 | 鱼种 |
| --- | --- |
| 烹饪→战斗回血（主，约 35～40） | 灵虾、沙丁、青鲱、灵鲤、银鳟、鲭灵、霞鲑、扇尾、青鲈、玄鲶、灵龙虾、比目灵、剑鱼、鮟鱇、鲨灵、鲸灵、鳐灵、洞冥、刺鳞、蓝玉蟹、巨河豚、岩纹、霜蟹、冻鳐、龙鱼、跃纹三种 等 |
| 炼丹副材（约 4～6） | `poisonFish` 毒泡鱼、`ghostFish` 鬼纹鱼、`staticJellyfish` 静电水母、`rawWhisper` 预留深渊低语鱼（若首发不做深渊可后置） |
| 直食回血（不需烹饪） | `magicFish` 魔光鱼 |
| 阵法 / 口粮优选 | `spiritCarp` 可兼阵法；口粮可用「任意低中阶可烹饪鱼」规则，不必一鱼一口粮 |
| 偏出售 / 熟练 | `skeletonFish` 骨纹鱼（可兼极低祈愿/出售）；部分跃纹鱼 |

深渊主题鱼（蒸汽游、虚空鳐等）标为 **二期**，首发可不进可见钓区。

---

## 表② 杂物池与特殊池

### 杂物池（Junk）

钓到 junk 时从本池加权抽取。技能 XP = 1。

| ID | 名称 | 权重 | 售价意向 | 用途 |
| --- | --- | ---: | ---: | --- |
| `oldBoot` | 破靴 | 18 | 低 | 仅出售 |
| `rottenHat` | 烂斗笠 | 16 | 低 | 仅出售 |
| `rustyHook` | 锈钩 | 14 | 低 | 仅出售 |
| `tornNet` | 断网 | 14 | 低 | 仅出售 |
| `driftwood` | 漂木 | 12 | 低 | 仅出售 |
| `crackedBowl` | 碎瓷碗 | 10 | 低 | 仅出售 |
| `soakedRags` | 潮湿布片 | 8 | 低 | 仅出售 |
| `hempRope` | 麻绳 | 6 | 中低 | 可升级为弦/丝，或低阶符箓辅材 |
| `spiritSilkScrap` | 灵丝残段 | 4 | 中 | 低阶符箓 / 阵法辅材 |
| `dullScale` | 黯淡鳞片 | 4 | 中低 | 出售；可选低阶炼器辅材 |
| `waterloggedCoin` | 水蚀铜钱 | 3 | 中 | 出售换灵石感 |
| `tangledWeed` | 缠魂水草 | 3 | 低 | 出售；可选口粮填料 |

杂物合计 **12 种**。高熟练免 junk 后，这些主要来自宝匣开出。

### 特殊池（Special）

钓到 special 时从本池加权抽取。权重总和用于相对稀有度；实现时用整数权重即可。

| ID | 名称 | 权重 | 相对稀有 | 作用 |
| --- | --- | ---: | --- | --- |
| `sunkenCasket` | 沉水宝匣 | 500 | 常见特殊 | 打开→表②-B |
| `lostTackleBox` | 遗落渔匣 | 80 | 少见 | 打开→钓鱼消耗品 / 宝石 |
| `messageBottle` | 漂流瓶 | 25 | 稀有 | 使用后解锁 `secretCove`；一次性 |
| `berserkBracer` | 狂澜护腕 | 18 | 稀有 | 可装备；解锁 `berserkShoal` |
| `pirateRelicRing` | 海盗遗戒 | 8 | 很稀有 | 可装备饰品 |
| `ancientSkillRing` | 古钓技能戒 | 2 | 极稀有 | 可装备；全生活技能 XP 加成 |
| `ancientMasteryRing` | 古钓熟练戒 | 2 | 极稀有 | 可装备；生活技能熟练 XP 加成 |

首发不做深渊时，不把「深渊渔匣 100% 占特殊表」做进主池；二期可另做深渊钓区特殊表。

### 表②-B 沉水宝匣内容

| 内容类型 | 示例 | 权重意向 |
| --- | --- | --- |
| 杂物 | 从 junk 池抽 1～3 | 高 |
| 宝石 | `topaz` / `sapphire` / `ruby` 等已有宝石 | 中 |
| 金属锭 | 低～中阶锭各 1 | 低 |
| 低阶饰品 | 非炼器主线的「水蚀玉佩」等固定小饰品 | 很低 |
| 灵石 | 小额 `lingshi` | 中 |

### 表②-C 遗落渔匣内容

| ID | 名称 | 作用 |
| --- | --- | --- |
| `fishingHook` | 灵鱼钩 | 消耗品：若干次钓鱼内提升得鱼率或减 junk |
| `goldenReel` | 金丝轮 | 消耗品：提升特殊率 |
| `spiritLure` | 聚灵饵 | 消耗品：提升双倍鱼产出概率 |
| 宝石 / 符材 | 已有宝石或 `spiritEssence` | 填充 |

消耗品具体次数与数值在实现计划里定，本规格只锁定「有三类渔具消耗品 + 开箱获得」。

---

## 表③ 可装备掉落清单（与炼器错位）

| ID | 名称 | 来源 | 槽位 | 定位 | 与炼器关系 |
| --- | --- | --- | --- | --- | --- |
| `berserkBracer` | 狂澜护腕 | 特殊直掉 | 饰品或手套位（以现有 `accessory` 为准） | 解锁狂澜滩；小幅钓鱼间隔/产量 | **不可制作** |
| `pirateRelicRing` | 海盗遗戒 | 特殊直掉 | accessory | 中稀有；钓鱼特殊率或灵石获取 | **不可制作** |
| `ancientSkillRing` | 古钓技能戒 | 特殊直掉 | accessory | 极稀有；全生活技能 XP% | **不可制作**；长期追求 |
| `ancientMasteryRing` | 古钓熟练戒 | 特殊直掉 | accessory | 极稀有；熟练 XP% | **不可制作**；长期追求 |
| `brinePendant` | 水蚀玉佩 | 仅沉水宝匣 | accessory | 低阶过渡饰品 | **不可制作**；属性弱于同阶炼器饰品 |
| `tidewalkBoots` | 踏浪靴（可选） | 宝匣极低权或二期 | 履 / accessory | 主题装，钓鱼 junk 略降 | **不可制作** |

约束：

1. 钓鱼装备全部为 **掉落专属**，不进炼器配方。
2. 战斗主属性弱于同级炼器成品；强项放在 **钓鱼/生活技能** 侧。
3. 古双戒为钓鱼终极追求，权重必须保持极低。
4. 不在钓鱼特殊表投放「全套武器铠甲」，避免架空炼器。

---

## 与烹饪 / 其他系统的衔接

| 系统 | 衔接 |
| --- | --- |
| 烹饪 | 为约 35～40 种可烹饪鱼各做一道主食；回血随鱼阶上升 |
| 炼丹 | 仅少数特殊鱼进约 18 丹系副材 |
| 阵法 | 现有回澜阵等可继续吃 `spiritCarp` 等少数鱼 |
| 御兽 | 口粮配方恢复：消耗「任意合格生鱼」或指定几档鱼 |
| 炼器 | 只吃宝匣里的锭/宝石溢出，不吃钓鱼主产物 |
| 符箓 | 可选：`hempRope`/`spiritSilkScrap` 低阶辅材 |

---

## 闭环检查（钓鱼范围）

1. 每个常驻钓区至少 2 种鱼。  
2. 每种首发生鱼至少有一个去向：烹饪 / 炼丹 / 直食 / 阵法 / 口粮 / 出售。  
3. 每种杂物可出售；有制作标签的必须有配方或明确「二期再用」。  
4. 特殊池七件均有明确系统效果或开箱表。  
5. 可装备掉落均有槽位与「不可制作」标记。  
6. 漂流瓶、狂澜护腕必须能解锁对应钓区。  

---

## 实现分期建议

| 期 | 内容 |
| --- | --- |
| 一 | 15 常驻钓区 + 现有 10 鱼扩到约 50 的数据表；fish/junk/special 三岔；杂物 12；特殊 7；宝匣/渔匣开箱；烹饪主食跟鱼种补齐 |
| 二 | 秘湾 / 狂澜滩解锁流程；三类渔具消耗品生效；古双戒与海盗戒接入装备属性 |
| 三 | 深渊主题钓区与独立特殊表（可选） |

### 一期落地状态（2026-08-11）

已接入：

- `content/fishing-parity.js`：17 钓区、43 鱼种、杂物/特殊池、烹饪与补给表
- `core/gathering.js`：fish/junk/special 三岔；熟练 65 免 junk；`spot_locked`
- `core/fishing-loot.js` + `useItem`：沉水宝匣/遗落渔匣开箱；漂流瓶/狂澜护腕解锁
- 烹饪可见配方恢复并扩到约 40 道；`beastFeed` 恢复

二期仍待：渔具消耗品数值生效、古戒/海盗戒真实装备属性、钓区 UI 展示 junk/special 概率文案细化。

---

## 非目标

- 不在本规格实现深渊全量 Melvor 鱼表。  
- 不把 Melvor 英文名、图标、逐项数值原文写入游戏内容。  
- 不改变「单主行动槽」与十二技能枚举。  
- 不让钓鱼替代炼器成为主装备来源。  
