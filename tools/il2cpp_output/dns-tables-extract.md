# 原版 dns / root 数值表提取（2026-08-15）

从 `global-metadata.dat` 的 `/*Metadata offset*/` FieldRVA 数据 + `dns.init` / `rereward` / `signuppost1` 静态字段写入顺序还原。
配对依据：二进制里 Field$ 注册三元组 `(slot, 0x403, Field$地址)`，其中 `slot = 代码使用的 BSS 槽 + 0x4000`。

## 已钉死并写入 `core/dns.js`

| 字段 | 长度 | 值 | 来源 |
|------|------|-----|------|
| `act4day` | float | **30.0** | dns.init STR static+0x158 |
| `fami_act1day` | int[21] | `[30,30,30,20,30,30,100,30,30, 0×11, 30]` | meta `0x48A8B8` |
| `jobmax` | int[21] | `[0,5,0,0,7,0,0,12, 0×12, 13]` | meta `0x48ACE8` |
| `fami_yang` | int[22] | `[2,1,1,1,1,1,2,1×16]` | meta `0x48AC58` |
| `fitem` | int[9] | `[0,1,2,4,8,16,24,40,80]` | meta `0x48B1C0` |
| `level_yang` / `level_feel` | int[10] | `[1,2,3,4,5,6,7,8,9,9]`（共用同一初始化块） | meta `0x48A660` |
| `level_speed` | float[10] | `[1.0…2.6,2.6]` | meta `0x48B5D8` |
| `waittime` | float[4] | `[0.25,0.5,1.0,2.0]` | meta `0x48A3A0` |
| `lgr` | float[8] | `[0.05,0.1×4,0.15,0.2,0.2]` | meta `0x48A3D0` |
| `savetime` | int[4] | `[365,730,1725,3650]` | meta `0x48A710` |
| `npclog` | int[170] | 事件 ID 池 | meta `0x48AEA0` |
| `level_exp1max` | int[10] | 候选 `[10,21,81,126,252,648,1004,4320,14400,14400]` | meta `0x48A9B8`（槽位待二次确认） |
| **`root.mday`** | int[13] | **`[0,31,28,31,30,31,30,31,31,30,31,30,31]`** | signuppost1 → this+0x148，meta `0x48AA48` |

## 重要更正

**`root.mday` 是月天数日历，不是事件 ID 日程。**  
`dayevent` / `doevent` 都不读 `mday`；`addday` 用它翻月。旧文档（事件刷新逻辑解析 / 刷新范围判定分析 / 对标方案）里「`mday[今天]=事件ID`」表述作废。

## 文案解包（2026-08-15）

从 `某某宗女修修炼手札2.70.APK` → `assets/bin/Data/data.unity3d` → TextAsset **`af`**（简体语言包）解出：

| 内容 | 键格式 | 产出 |
|------|--------|------|
| 家族名 | `fami{n}` | `content/original-jobs.js` |
| 职位名 | `job{fami}_{job}` | 同上（`rejob` / `releader`） |
| 事件文案 | `eventt{id}{variant}` | `content/original-event-texts.js` |

- `npclog` 164 个唯一 ID 中 **158** 个有文案（缺 218/219/220/566/567/568）
- DES API 存在，但职位/事件明文在语言包里，**不必**解 DES
- 提取脚本：`tools/_extract_af_tables.py`（依赖已解出的 `apk_extract/unity_dump/TextAsset_af_26.txt`）

## H5 接线

- 造人写 `fami`（sect→0..4，散修→20）与 `job`（office→officeJob）
- `createFamilyMember` 对标 `creatpersonf(tfami, levelmin, ltype, hpar)`
- `fillSect` 用 `jobmax[job]` 覆盖非零编制；**展示职位名/门派中文名保留 H5**（原版 `rejob`/`fami` 名仅对照）
- **修炼入口统一到 `Dns.cultivationNeed` / `majorLevel` / `levelSpeedMult` / `sync*Aliases`**
  - NPC：`npc-simulation` + `npc-generator` 同源
  - 玩家：突破后双写 `level_l`/`exp1`/`realmStage`；**需求量仍用 `content/realms.js`（H5 门槛/丹药曲线）**
  - 不恢复全体 tick 自动连破（保持「不模拟世界」）
- 事件：`getpe` 圈 ∩ `cans` + `randomlevel`；`character_beat` 用 `original-event-slots` 配方拼句（对标 doevent）

## 仍待

- `level_exp1max` Field$ 槽二次确认
- 若要对齐玩家与 NPC **需求量级**，需另定缩放策略（当前故意两套量级）
- doevent 三人以上插名规则可再抠
