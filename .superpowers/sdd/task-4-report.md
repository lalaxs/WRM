# Stage 1A Task 4 实现报告

## 范围

- 基线：`2c3f284`；当前实现截至 `24a5c30`
- 运行时：`index.html`、`platform.js`、`game.js`、`ui.js`、`styles.css`
- 回归：`selftest_foundation.js`、`selftest_skillnet.js`、`selftest_ui.js`
- 未修改：`release/`、Stage 1B/Stage 2 草案、现有 UI 布局与交互结构

## TDD 证据

首次补测试后运行 `npm test`，按预期失败：

- 基础设施：`38 通过 / 2 失败`
  - `Platform.save` 尚未返回成功/失败布尔值。
- 技艺体系：`81 通过 / 7 失败`
  - 重复动作仍使用 `Infinity`，无 `mode`。
  - 随机状态与版本化快照尚未接入。
  - 离线报告合并函数尚不存在。
- UI：`22 通过 / 6 失败`
  - 启动未读取 `cloud_save_v1`。
  - 待确认离线报告未跨打开合并和即时持久化。
  - 关闭报告未清除 `offlineResult`。

另补离线报告准确性回归后，`node selftest_skillnet.js` 按预期出现 2 个失败：

- 采集报告错误地包含历史 `done`。
- 材料不足时生产报告返回计划次数而非实际完成次数。

代码审查后逐项增加红灯复现：

- 离线结算和关闭报告在保存返回 `false`/抛异常时未回滚，共 10 个失败断言。
- 飞升寿元在模型、快照往返与 UI 显示中不一致，共 4 个失败断言。
- 探索动作提前持久化，失败后无法持有同一结果重试，共 4 个失败断言。
- `appearance.parts` 结构校验和启动索引规范不足，共 6 个失败断言。
- 小于 30 秒的离线区间被吞掉，共 3 个失败断言。
- 未提交离线区间可被普通保存覆盖，共 2 个失败断言。
- 同一内存重复调用相同结算区间可重复发放，共 1 个失败断言。
- 最终接口边界复审先出现运行时 1 个、UI 5 个失败断言：
  - 公开 `GameAPI.persist(now, true)` / `closeOffline(true)` 可取得内部提交权限。
  - 备份或旧档修复写回失败后没有独立 `repair` 状态，仍会继续启动离线结算。
  - 无当前动作、无待确认报告的旧档修复失败没有任何可见恢复入口。

## 已实现

- 浏览器及 VM 都按顺序载入 `GameRandom`、`SaveSystem`，覆盖 UMD 浏览器全局分支。
- `Platform.save` 成功返回 `true`，存储异常返回 `false`。
- 动作统一为 JSON 安全结构：
  - 重复：`mode: 'repeat', count: 0`
  - 有限：`mode: 'finite', count >= 1`
- 在线与离线剩余次数判断都识别重复/有限模式。
- 所有游戏内随机调用改走 `gameRandom()`，并将 `rngState` 写入快照。
- 运行时只写 `cloud_save_v1`/`cloud_save_v1_backup`；旧多键仅由 `SaveSystem` 读取迁移。
- 启动读取主快照、备份或旧档；备份/旧档应用后立即修复为主快照。
- 待确认离线报告与本次新增收益相加，显示前立即持久化；再次打开继续合并；确认后清除并立即保存。
- 离线报告只记录本次实际完成次数，避免重复累计历史 `done` 或材料不足时虚报。
- 角色创建、形象保存、当前动作和退出保存均走统一快照。
- 离线结算先建完整检查点，保存失败或异常时回滚角色、动作、RNG、钓鱼和报告状态；普通保存会保持阻塞，避免覆盖待重试的旧时间戳。
- 同一内存记录已提交到的时间点，相同区间不会重复发放。
- 关闭报告只有在清除状态写入成功后才生效；失败时报告保持可见并显示明确提示。
- 小于 30 秒的离线时间写入 `current.elapsed`，无报告和已有待确认报告两种路径都不会丢失。
- 探索先提交有限动作再生成结果；最终资源点、RNG 与 `current: null` 统一提交，失败时持有同一结果重试，重开由已提交动作和旧种子确定性复现。
- 飞升寿元统一使用 `null` 表示无尽，模型、保存、在线推进、Canvas 和 DOM 显示一致。
- 主快照严格要求普通对象 `appearance.parts`；坏主档回退备份，启动再过滤类别并修正部件索引。
- 内部特权保存已拆为私有路径；公开 `GameAPI.persist` 和 `GameAPI.closeOffline` 会忽略额外参数，锁定后只能调用 `retryPersistence()`。
- 保存失败会显示跨主界面/创建页常驻的恢复提示；玩家可直接点击重试，无需关闭或重开游戏。
- 备份/旧档修复写回失败会进入 `repair` 锁，记录原始 `savedAt` 与本次启动 `now`，并停止后续离线结算。
- `repair` 重试只先写回原修复快照；成功后再结算原启动离线区间。修复或离线提交任一步再次失败，都保留准确、可重复重试的状态。
- 无当前动作、无待确认报告时也会显示修复失败；恢复成功后不会凭空生成离线报告。

## 验证

- `node --check core/random.js`：通过
- `node --check core/save-system.js`：通过
- `node --check game.js`：通过
- `node --check ui.js`：通过
- `npm test`：通过
  - 基础设施：`44/44`
  - 技艺体系：`140/140`
  - UI：`47/47`
  - 合计：`231/231`
- `git diff --check`：通过
- `release/`：无改动

## 风险

- 离线结算或启动修复未提交时会阻止普通保存和进度变化；存储恢复后可在当前页面点击“重试”，不需要重开，且始终沿用原始时间区间。
- `SaveSystem` 会保留上一份有效主快照作为备份；灾难恢复到备份时，行为符合本阶段既定回滚策略。

## 提交

- `5acf939 refactor: migrate runtime to versioned save snapshots`
- `862a511 fix: make offline settlement persistence transactional`
- `dc52bec fix: add recoverable persistence failure flow`
- `33a0051 docs: record stage 1a completion`
- `24a5c30 fix: seal persistence recovery boundaries`
