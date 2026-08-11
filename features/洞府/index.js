// 功能模块：洞府（主页 / Homestead）
// ─────────────────────────────────────────────────────────────
// 本文件是该功能的「模块登记 / 索引」，由 feature-module-dev Skill 维护。
// 权威内容来源 = 用户在对话中的描述；任何改动须彻底清理旧内容，禁止新旧并存。
// 模块目录约定见 .workbuddy/skills/feature-module-dev/SKILL.md 第一节。
//
// 当前组成（均已实装，逐步收敛到本模块目录）：
//   · 主页壳 home   → ui.js buildHome()（5 卡片 → 子页两级结构）+ game.js navIndex=0（默认洞府）
//   · 5 张卡片入口  → CAVE_TABS = [灵田/阵法/灵兽/会客厅/传承殿]，见 ui.js buildCaveGrid()
//   · 灵田 farm     → ui.js buildFarm()    + core/farm.js          + content/homestead.js(CROPS)
//   · 阵法 formation→ ui.js buildFormations()+ core/formations.js   + content/homestead.js(FORMATIONS)
//   · 灵兽 beast   → ui.js buildBeasts()  + core/spirit-beasts.js  + content/homestead.js
//   · 会客厅/传承殿 → ui.js buildReserve()/buildInheritanceHall()（占位）
//   · 全局行动栏    → ui.js buildShell().action-bar + updateActionBar()（顶部资源栏下方；空闲/行动名+进度）
//   · 离线判定      → game.js handleVisibilityChange()（仅恢复运行，不结算）+ 加载路径按时间戳结算（梅尔沃式）
//
// 注意：本文件是开发期登记/索引，非运行时强制加载；真实逻辑仍在上述既有模块。
// 后续按 Skill 第三节把各子系统的 ui/content/logic 收拢进本目录。
// ─────────────────────────────────────────────────────────────
window.FeatureModules = window.FeatureModules || {};
window.FeatureModules['洞府'] = {
  id: '洞府',
  navLabel: '洞府',
  isHome: true,
  subSystems: ['farm', 'formations', 'beasts', 'meetingHall', 'inheritance'],
  spec: 'features/洞府/spec.md',   // 权威规格（用户描述驱动，改动即重写清旧版）
  source: 'ui.js buildHome/buildCaveGrid + content/homestead.js + core/{farm,formations,spirit-beasts}.js'
};
