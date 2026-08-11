# Enemy Cartoon Restyle Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 45 张朴素修仙敌人素材交付为统一的扁平卡通 v2 批次，其中 41 张锁定造型转绘、4 张冻结复用。

**Architecture:** 原批次的 manifest 继续作为唯一敌人清单。新批处理脚本派生 v2 路径、复用冻结素材、处理纯色键背景、统一 512/256 输出并生成九区总览、前后对照和 84px 检查表；ImageGen 每次只转绘一名敌人，当前母版锁定身份，已通过素材提供风格。

**Tech Stack:** Built-in ImageGen、Python 3、Pillow、现有 `remove_chroma_key.py`、Git。

## Global Constraints

- 不覆盖 `docs/art/enemy-prototypes/2026-07-31-enemy-grounded-roster/`。
- 新输出写入 `docs/art/enemy-prototypes/2026-07-31-enemy-grounded-roster-cartoon-v2/`。
- 中间文件写入 `tmp/imagegen/enemy-grounded-roster-cartoon-v2/`。
- 4 张冻结复用：`thornHare`、`stonePuppet`、`soulMoth`、`earthVeinApe`。
- 41 张转绘必须保留敌人 ID、物种、正面姿势和唯一识别特征。
- 有眼睛的敌人统一将眼睛放大约 15%，略微圆润头脸，但不得幼儿化。
- 最终必须包含 45 张 512×512 RGBA 母版、45 张 256×256 RGBA 预览。

---

### Task 1: 建立非覆盖式 v2 批处理

**Files:**
- Create: `scripts/build-cartoon-enemy-batch.py`
- Create: `selftest_enemy_cartoon_batch.py`
- Create: `tmp/imagegen/enemy-grounded-roster-cartoon-v2/manifest.json`
- Create: `docs/art/enemy-prototypes/2026-07-31-enemy-grounded-roster-cartoon-v2/batch-summary.md`

**Interfaces:**
- Consumes: `tmp/imagegen/enemy-grounded-roster/manifest.json` 与旧批次 `*-source.png`。
- Produces: `prepare`、`normalize`、`sheets`、`validate` 子命令及 v2 manifest。

- [x] **Step 1: 写批处理失败测试**

测试必须断言 45 个唯一 ID、4 个冻结 ID、41 个待转绘 ID、所有 v2 路径均位于独立目录，并验证旧批次文件哈希在 `prepare` 后不变。

- [x] **Step 2: 运行测试确认失败**

Run:

```bash
/Users/jar/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 selftest_enemy_cartoon_batch.py
```

Expected: FAIL，因为 `scripts/build-cartoon-enemy-batch.py` 尚不存在。

- [x] **Step 3: 实现批处理脚本**

脚本必须提供：

```text
prepare
normalize --id ID | --tier 1..9 | --all
sheets [--tier 1..9]
validate [--tier 1..9] [--allow-missing-generated]
```

`normalize` 使用 manifest 中的键色移除背景，将非透明包围盒按普通 450px、精英 468px、首领 486px 的最长边缩放并居中到 512×512，再生成 256×256 预览。

- [x] **Step 4: 运行测试确认通过**

Run:

```bash
/Users/jar/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 selftest_enemy_cartoon_batch.py
/Users/jar/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 scripts/build-cartoon-enemy-batch.py prepare
```

Expected: `PASS`，并打印 `manifest=45 reused=4 generated=41`。

- [x] **Step 5: 提交批处理基础**

```bash
git add scripts/build-cartoon-enemy-batch.py selftest_enemy_cartoon_batch.py tmp/imagegen/enemy-grounded-roster-cartoon-v2/manifest.json docs/art/enemy-prototypes/2026-07-31-enemy-grounded-roster-cartoon-v2/batch-summary.md
git commit -m "art: prepare cartoon enemy restyle batch"
```

### Task 2: 转绘第 1–3 区

**Files:**
- Create: `tmp/imagegen/enemy-grounded-roster-cartoon-v2/raw/{enemyId}.png`
- Create: `docs/art/enemy-prototypes/2026-07-31-enemy-grounded-roster-cartoon-v2/{enemyId}-source.png`
- Create: `docs/art/enemy-prototypes/2026-07-31-enemy-grounded-roster-cartoon-v2/{enemyId}-preview.png`
- Create: `docs/art/enemy-prototypes/2026-07-31-enemy-grounded-roster-cartoon-v2/regions/tier-{1,2,3}.png`

**Interfaces:**
- Consumes: 旧母版作为造型参考，`thornHare`、`stonePuppet`、`earthVeinApe` 作为风格参考。
- Produces: tier 1–3 的 15 张 v2 母版与预览。

- [x] **Step 1: 逐张执行造型锁定转绘**

每次 ImageGen 调用只处理一名敌人。提示词必须重复：保留输入敌人的物种、姿势、轮廓和特征；转为无黑色线稿、4–8 个大色块、三级以内明暗、无写实纹理；有眼睛的主体放大眼睛约 15% 并略微圆润头脸；使用纯色键背景。

- [x] **Step 2: 规范化与区域检查**

```bash
PY=/Users/jar/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3
$PY scripts/build-cartoon-enemy-batch.py normalize --tier 1
$PY scripts/build-cartoon-enemy-batch.py normalize --tier 2
$PY scripts/build-cartoon-enemy-batch.py normalize --tier 3
$PY scripts/build-cartoon-enemy-batch.py sheets --tier 1
$PY scripts/build-cartoon-enemy-batch.py sheets --tier 2
$PY scripts/build-cartoon-enemy-batch.py sheets --tier 3
$PY scripts/build-cartoon-enemy-batch.py validate --tier 1
$PY scripts/build-cartoon-enemy-batch.py validate --tier 2
$PY scripts/build-cartoon-enemy-batch.py validate --tier 3
```

Expected: 三个区域均 `PASS`。

### Task 3: 转绘第 4–6 区

**Files:**
- Create: tier 4–6 对应 15 名敌人的 v2 母版、预览与区域总览。

**Interfaces:**
- Consumes: Task 1 批处理与同一组造型/风格参考。
- Produces: tier 4–6 的 15 张 v2 母版与预览。

- [x] **Step 1: 逐张转绘非冻结敌人**

冻结的 `soulMoth` 直接复用；其他 14 张逐张转绘。魂体、云块、蛾翼仍使用不透明大色块，不生成烟雾半透明边缘。

- [x] **Step 2: 规范化并验证三个区域**

依次执行 `normalize --tier 4..6`、`sheets --tier 4..6`、`validate --tier 4..6`，全部必须 `PASS`。

### Task 4: 转绘第 7–9 区

**Files:**
- Create: tier 7–9 对应 15 名敌人的 v2 母版、预览与区域总览。

**Interfaces:**
- Consumes: Task 1 批处理与同一组造型/风格参考。
- Produces: tier 7–9 的 15 张 v2 母版与预览。

- [x] **Step 1: 逐张转绘全部 15 名敌人**

高级敌人的压迫感只能来自体量、旧伤和宽大正面轮廓；不得新增纹理、法术粒子、光环、符文或建筑。

- [x] **Step 2: 规范化并验证三个区域**

依次执行 `normalize --tier 7..9`、`sheets --tier 7..9`、`validate --tier 7..9`，全部必须 `PASS`。

### Task 5: 完整总览、前后对照与终验

**Files:**
- Create: `docs/art/enemy-prototypes/2026-07-31-enemy-grounded-roster-cartoon-v2/enemy-cartoon-v2-contact-sheet.png`
- Create: `docs/art/enemy-prototypes/2026-07-31-enemy-grounded-roster-cartoon-v2/enemy-cartoon-v2-84px-sheet.png`
- Create: `docs/art/enemy-prototypes/2026-07-31-enemy-grounded-roster-cartoon-v2/enemy-cartoon-v2-before-after.png`
- Modify: `docs/art/enemy-prototypes/2026-07-31-enemy-grounded-roster-cartoon-v2/batch-summary.md`

**Interfaces:**
- Consumes: 45 张 v2 母版、旧批次 45 张母版和 manifest。
- Produces: 完整交付包与验证记录。

- [x] **Step 1: 重建全部总览**

```bash
PY=/Users/jar/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3
$PY scripts/build-cartoon-enemy-batch.py sheets
```

- [x] **Step 2: 执行文件级终验**

```bash
$PY scripts/build-cartoon-enemy-batch.py validate
$PY selftest_enemy_cartoon_batch.py
git diff --check -- scripts/build-cartoon-enemy-batch.py selftest_enemy_cartoon_batch.py docs/art/enemy-prototypes/2026-07-31-enemy-grounded-roster-cartoon-v2
```

Expected: 45 source、45 preview、27 普通、9 精英、9 首领、4 reused、41 generated，全部 `PASS`。

- [x] **Step 3: 目视检查完整与 84px 总览**

检查不得出现偏写实个体、透明残边、裁切头部、主体过小、人形轮廓或新增浮夸装饰。

- [ ] **Step 4: 提交最终批次**

仓库级 `npm test` 存在与本美术批次无关的既有战斗、状态与装备测试失败；
本批次专项验证已通过，但按收尾规范暂不执行最终 Git 集成提交。

```bash
git add scripts/build-cartoon-enemy-batch.py selftest_enemy_cartoon_batch.py docs/art/enemy-prototypes/2026-07-31-enemy-grounded-roster-cartoon-v2
git commit -m "art: add cartoon enemy portrait restyle"
```
