# 命中公式改为 MWI 式

日期：2026-08-11  
状态：已落地  
范围：仅命中判定；不改其他属性面板

## 公式

对标 Milky Way Idle：

```text
命中率 = accuracy^1.4 / (accuracy^1.4 + evasion^1.4)
```

边界：

- `accuracy`、`evasion` 下限按 0 处理
- 两者皆为 0 时命中率取 `0.5`
- **不再**使用旧式 `0.75 + (命中-闪避)×0.005` 与 20%–98% 硬夹

## 接入点

- `core/combat-engine.js`（单人）
- `core/team-combat-engine.js`（组队）

## 非目标

- 不分系命中/闪避
- 不改伤害、暴击、冷却减缩公式
