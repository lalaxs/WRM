# 修仙放置 H5 · 项目手册（权威）

**状态**：现行权威入口（2026-08-16）  
**冲突处理**：系统细则与本手册冲突时，以**当前源码与 `content/*` 数据**为准，并回写本手册。

早期 `docs/superpowers/specs/` 过程规格已删除；需查阅时从 Git 历史恢复。

---

## 1. 日常开发

- **唯一源码与日常预览入口：仓库根目录**（打开根目录 `index.html`）。
- **不要**用 `release/` 做日常调试；改完源码却打开 `release/` 会看到旧内容。
- 可选：`npm run dev`（默认尝试 `5288`，占用则换端口）。
- 发行：`npm run sync-release` 或 `npm run package:h5`（打包前会同步生成 `release/`）。
- 存档：**只认 `schemaVersion === 5`**；旧档忽略为空档。不做跨版本迁移。同版本仍走 `normalize`；转世玩法走 `LegacyTransition`（与存档迁移无关）。

---

## 2. 运行时地基

权威清单：仓库根目录 `runtime-modules.js`。

### 2.1 依赖方向（只允许向下）

`platform → content → core → game(GameAPI) → ui`

| 层 | 职责 | 禁止 |
|----|------|------|
| platform | TapTap / 广告 / 容器 | — |
| content | 静态表与文案数据 | 依赖 core / game / ui |
| core | 规则与状态机 | 依赖 game / ui |
| game | `GameAPI` 编排查询与命令 | 直接操作 DOM |
| ui | DOM 表现 | 直接碰 core / content / `SaveSystem` / `tap.*`（只经 `window.GameAPI`） |

### 2.2 加载约定

- 首屏脚本顺序与 `BOOT_SCRIPTS` 一致（可带 `?v=`）。
- 延后只经 `LazyContent`：草药大表、UI 分页、战斗引擎、`styles-game.css`。
- 改加载链：先改 `runtime-modules.js` → 再改 `index.html` → `npm run test:runtime`。
- Cursor 规则：`.cursor/rules/runtime-contract.mdc`。

---

## 3. 产品边界（现行）

- 竖屏、单机、持续运行的修仙放置；无最终通关。
- **不做**大地图、格子移动、自由探索操作；世界用抽象地区 + 人物 / 宗门 / 事件表现。
- 保留「顶部状态 + 左侧页签 + 右侧内容」UI 框架；继续原生 HTML / CSS / JS + DOM；不迁新框架/引擎。
- 无玩家市场、排行、共享世界；网络仅用于登录、云存档、广告等平台能力。
- 随机人物事件用规则与人工模板，**不在线**调生成式 AI。
- **单一主挂机槽**：无行动队列、不自动替玩家选下一行动；灵田等并行进度不占主槽；主动社交走并行队列。
- 固定 **12** 生活技能：采药、采矿、伐木、钓鱼、炼丹、炼器、烹饪、符箓、魅力、御兽、种植、阵法（魅力无额外熟练度）。
- 文案用审核安全表达（如「与某人一起修炼」「共同修炼」）。
- 功法 UI **已取消**可配释放条件（引擎侧多存 `always`）；勿再按旧「条件释放」产品稿实现。
- 大事记只读；无「待玩家点选项」的世界事件队列；宗门加入/离开在宗门页操作。

---

## 4. 已落地架构结论（由对标蓝图提炼）

下列来自原版对标重构，**已在代码中成立**。勿再按旧「待建 event-engine / 6 秒日 tick 完全替换月批」过程稿执行。

| 结论 | 代码锚点 |
|------|---------|
| 配置总表 `Dns` | `core/dns.js`（含 `famiAct1day`、`act4day`、月事件软帽等） |
| Person / 关系网 | `core/person-factory.js`、`core/person-graph.js`（`getpe` / `cans` / 当日配额） |
| 世界事件只刷「与玩家有关系且 cans」的人 | `core/world-month.js` + `world-event-gen.js` 等 |
| 推进入口仍是「月」 | `WorldMonth.advanceOneMonth`；内部对标 dayevent（`resetDaily` → 池化 → doevent）+ `waittime0` |
| 现实节奏 | 约 **180 现实秒 ≈ 1 游戏月**（`Dns.MONTH_REAL_SECONDS` / `daySeconds`） |
| 大事记只读 | 无待决策队列 |
| 结构关系种子 | `core/relation-seed.js`：开局稀疏血缘 / 师徒 / NPC 道侣；不给玩家预挂父母师尊道侣 |
| NPC 模块角色 | `npc-simulation.js` **仅**被动生命周期（衰老 / 修为 / 寿元），不自主产事件 |

### 4.1 明确未完成（勿写成已完成）

- 仍有名册 bootstrap（非「只在关系诞生时才有人」的极简模型）。
- **没有**独立的 6 秒「自然日」引擎完全取代月推进；月/年事件软帽仍在。
- 宗门表 `content/sects.js` 现行 **5** 门（太玄剑宗、百草谷、天工阁、灵兽山、清音宫）；功法数据里可有「红尘阁」相关 ID，**不等于**已入宗门表。

---

## 5. 内容与系统真源

| 内容 | 真源 |
|------|------|
| 物品 / 材料 / 配方 / 丹药效果 | `content/items.js`、`materials.js`、`recipes.js`、懒加载 `herblore-parity` |
| 战斗区 / 秘境 / 敌人 / 掉落 | `content/combat.js`（现行约 **9** 区域 + **9** 秘境、**45** 敌人） |
| 功法 | `content/techniques.js`（验证池 **32**、总表约 **77**）；槽位与境界门控见 `content/realms.js` 等 |
| 组队战斗 | `core/team-combat-*` 等（主角 + 最多 3 同行；延后加载） |
| 随机装备 | `core/equipment.js` |
| 宗门 | `content/sects.js`（5 门） |
| 敌人立绘 | `assets/enemy-portraits/` |
| 道具图标 | `content/item-art.js` → `assets/item-icons/` |
| 世界叙事模板 | `content/world-event-narratives/` + 懒加载 |
| 模块加载清单 | `runtime-modules.js` |

战斗页 UI：**区域**（无限刷怪）与 **秘境**（多波次）双页签；名单与掉落以 `content/combat.js` 为准。

已落地短决策（细节看代码）：

- 钓鱼对标：`content/fishing-parity.js`
- 命中：MWI 式 `mwiHitChance`（单人/组队引擎）
- 技能栏：具名普攻 + 3 功法格（`basic-attacks` + 战斗 UI）
- 功法获取：区域刷书、重复书转 XP 等以 `combat` / `techniques` 为准

---

## 6. 洞府页与离线 / 行动栏

- 默认落地页为导航「洞府」：先 **5 张卡片**（灵田 / 阵法 / 灵兽 / 会客厅 / 传承殿），点入子页，子页「← 返回洞府」。
- **不用**页签切换子系统；卡片 → 子页两级结构。
- 洞府页**不**显示境界卡、**不**显示当前行动卡。
- 会客厅：仍占位。传承殿：已实现（寿元、传承计划、后嗣、前世等；`ui-home.js` + `queries.inheritanceHall`）。
- 当前行动：全局顶栏下方 `.action-bar`（空闲 / 行动名 + 进度）。
- 离线：切后台再回前台**不**结算；仅**重新加载页面**时按存档 `processedThroughMs` 结算（`game.js` `handleVisibilityChange` 只恢复运行）。
- 长离线启动：先出游戏壳与「正在结算离线收益」提示（**不依赖**导航页模块就绪），再**分帧**追算并显示进度；世界见闻全量月数封顶 `OFFLINE_MONTH_CAP`（超额只推日历/年龄）；战斗离线加大同规则批处理；离线 NPC 年龄/修为按 `ACTIVE_STEP` 合并推进，避免短周期主行动每微步扫全表。
- 离线弹窗：仅当报告有意义（主行动完成 / 战斗结果 / 社交完成 / 时钟回拨）才写入 `pendingOfflineReports`；空闲长离线只推进水位线，不弹空窗。
- 离线见闻降频：在 cap 内约 `OFFLINE_EVENT_MONTH_CHANCE`（1/4）的月份出见闻，且每月最多 `OFFLINE_EVENT_MONTHLY_CAP`（1）条；在线仍为约 1～2 条/月。
- 见闻保留上限 `WORLD_EVENT_RETENTION`（400）；在线 tick 跳过整树 JSON 守卫与 apply 全量 normalize，避免长离线后操作卡顿。
- 命令热路径：`captureRuntime` 深拷贝即可；全量 normalize 只在存档边界 `toSnapshotInput`（读档/离线结算仍完整 normalize）。

## 6.1 美术

| 文档 | 用途 |
|------|------|
| `docs/art/2026-07-30-item-icon-art-standard.md` | 道具图标美术规范 |

战斗 / 功法 / 装备 / NPC 等系统细则以代码与 §5 真源为准。

---

## 7. 文档维护规则

1. 新系统先改代码与 `content`，再回写本手册；禁止只留过程聊天稿当真理。
2. 已落地的一次性决策：写入本手册「真源」一行即可，**不要**再堆短纪要文件。
3. 未开工的大扩充用任务/issue 跟踪，不在工作树留半截设计稿冒充现行规格。
4. `docs/README.md` 只做指针；正文以本手册为准。
