# -*- coding: utf-8 -*-
"""从 af 事件文案按关键词生成 action→eventId 池，写入 content/original-event-bindings.js

完全还原策略（本阶段）：
- 世界日事件优先走原版 eventt ID
- 「是否同意」提问 ID 不入随机池；运行时若抽中则改写为拒绝 ID
- 收徒/舍身解毒等无法自动拒绝干净落地的提问 ID：跳过
- 不做元阳；不做同意 UI
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AF = json.loads(
    (ROOT / "tools/il2cpp_output/af-extracted.json").read_text(encoding="utf-8")
)
OUT = ROOT / "content/original-event-bindings.js"

# 提问 ID → 拒绝 ID（暂不做同意 UI：随机世界事件一律改抽拒绝结局）
CONSENT_REJECT = {
    32: 33,  # 一见钟情求道侣
    146: 147,  # NPC 求道侣
    210: 211,  # 弟子求双修
    237: 238,  # 外人求双修
    116: 117,  # 是否帮忙解毒
    67: 68,  # 情毒
    75: 76,  # 情毒
}

# 暂不做且拒绝也需造人/舍身链路：直接跳过，不进池、不落地
CONSENT_SKIP = frozenset({60})  # 收徒

# 玩家契约灵宠专属（原版「你」=玩家；逆鳞/凤火/龙气等）。
# 禁止进 NPC 世界见闻随机池，避免熟人角色念出契约兽台词。
PLAYER_PET_ONLY = frozenset({82, 85, 86, 89, 90, 91})

# H5 action → 文案关键词（命中则入池）
RULES = {
    "meet": ["结识", "认识了", "相遇", "遇见", "与之结识"],
    "talk": ["闲谈", "交谈", "叙话", "聊天", "倾诉", "告诉"],
    "gift": ["礼物", "赠与", "赠予", "送给", "献上"],
    "rare_gift": ["逆鳞", "重礼", "珍藏", "万年"],
    "birthday": ["生日", "庆生"],
    "date": ["约会", "相约", "陪他", "陪她", "一起去"],
    "confess_npc": ["告白", "表白", "心意", "爱意", "求亲"],
    "partner_npc": ["结为道侣", "道侣大典", "结成道侣"],
    "breakup": ["解除道侣", "分手", "分开"],
    "jealousy": ["嫉妒", "吃醋", "独占"],
    "quarrel": ["争吵", "口角", "翻脸", "不欢而散", "怒而", "决裂"],
    "duel": ["决斗", "比试", "动手", "对招"],
    "rival": ["仇", "仇恨", "敌对", "情敌"],
    "aid": ["救了", "救起", "相助", "帮助", "所救"],
    "rescue": ["救了", "救起", "脱险", "所救"],
    "crisis_save": ["救了", "救起", "所救"],
    "crisis_meet": ["危机", "险境", "脱困", "遇险"],
    "spar": ["切磋", "比试", "对招", "比斗"],
    "market": ["坊市", "拍卖", "交易", "买", "卖"],
    "debate": ["争论", "辩", "争了一会儿理", "论道"],
    "mentor": ["指点", "教导", "传功", "师兄", "师尊", "收徒"],
    "treasure": ["机缘", "宝物", "灵药", "秘宝", "奇遇"],
    "first_sight": ["一见钟情", "多看了一眼", "一眼", "初见"],
    "cultivate_together": ["一起修炼", "双修", "合修"],
    "character_beat": ["修炼", "突破", "闭关", "游历", "顿悟", "飞升", "灵宠"],
    "breakthrough": ["突破几率", "突破率", "突破有成"],
}

# 无独立文案池时，运行时落到这些动作的原版池（完全还原嗓子，避免 H5 白话）
ACTION_ALIASES = {
    "spar": ["duel", "aid", "breakthrough"],
    "market": ["meet", "talk", "gift"],
    "debate": ["talk", "mentor"],
    "mentor": ["talk", "gift", "aid"],
    "treasure": ["rare_gift", "meet", "character_beat"],
    "first_sight": ["meet", "crisis_meet", "partner_npc"],
    "quarrel": ["rival", "breakup", "jealousy"],
    "duel": ["rival", "aid", "breakthrough"],
}

# 效果：文案可静态推断的部分
# breakthrough_delta：直接加到 attemptBreakthrough 的 rate（对标文案百分比）
EFFECT_RULES = [
    (r"重伤不治而亡|不治而亡|经脉寸断而死|身亡", {"status": "dead"}),
    (r"重伤|身受重伤", {"status": "injured"}),
    (r"渡劫死亡率下降", {"buff": "tribulation_down"}),
    (r"好感大幅增加", {"feel": 8}),
    (r"好感增加", {"feel": 4}),
    (r"好感些微增加|好感些微上升", {"feel": 2}),
    (r"好感上升", {"feel": 3}),
    (r"看法比之前好了很多", {"feel": 5}),
    (r"吐露了对.{0,6}爱意|无法抑制.{0,8}爱意|如潮水般.{0,12}爱意", {"love": 6}),
    (r"爱意无法抑制|对师尊的爱意", {"love": 5}),
    (r"独占的欲念|独占欲", {"lust": 4}),
    (r"跌落一个大境界|下跌一个大境界", {"sublevel": 3}),
    (r"跌落一个小境界", {"sublevel": 1}),
    (r"灵气和精气获得了恢复", {"restore_qi": True}),
]

# 突破率：捕获 ±N% / 「提升」无数字默认 +5%
BT_UP = re.compile(
    r"突破(?:几率|率)\s*(?:上升|增加|提升|降低|下降|减少)?\s*[+＋]?\s*(\d+)\s*%"
    r"|突破(?:几率|率)\s*[+＋]\s*(\d+)\s*%"
)
BT_DOWN = re.compile(
    r"突破(?:几率|率)\s*(?:下降|降低|减少)\s*(\d+)\s*%"
)
BT_UP_BARE = re.compile(r"突破(?:几率|率)\s*(?:上升|增加|提升)")
BT_DOWN_BARE = re.compile(r"突破(?:几率|率)\s*(?:下降|降低|减少)")

# 洗髓改灵根
WASH_ROOT = re.compile(r"洗髓丹|服用了洗髓")

# 仅「双方已结成」类；排除「和别人结为道侣后」等旁观/吃醋句
ACCEPT_DAO = re.compile(
    r"与之结为了道侣|结为了道侣|"
    r"意料之中的被接受|如愿以偿|获得肯定的答复|答应了结为道侣|"
    r"两情相悦，结为道侣|牵起了.{0,6}的手"
)
REJECT_DAO = re.compile(
    r"拒绝了|被拒绝|收到了拒绝|得到了拒绝|毫不犹豫的拒绝|"
    r"并没有和任何人结为道侣|是否同意|"
    r"和别人结为道侣"
)
UNTAG_DAO = re.compile(r"解除道侣")

# 手工钉死：接受 / 拒绝 / 旁观吃醋（避免关键词误伤）
FORCE_TAG_DAO = frozenset({149, 151, 153, 155, 461, 492})
FORCE_NO_TAG_DAO = frozenset({
    32, 33, 146, 147, 148, 150, 152, 154,
    210, 211, 237, 238, 116, 117, 67, 68, 75, 76, 60, 61,
    462, 463, 471, 472,
})


def parse_breakthrough_delta(text: str):
    m = BT_DOWN.search(text)
    if m:
        return -int(m.group(1)) / 100.0
    m = BT_UP.search(text)
    if m:
        n = m.group(1) or m.group(2)
        if n:
            # 「降低」也会被第一个宽松 UP 误抓时已先走 DOWN
            if re.search(r"突破(?:几率|率)\s*(?:下降|降低|减少)", text):
                return -int(n) / 100.0
            return int(n) / 100.0
    if BT_DOWN_BARE.search(text):
        return -0.05
    if BT_UP_BARE.search(text):
        return 0.05
    return None


def is_consent_question(text: str) -> bool:
    return ("是否同意" in text) or ("是否帮忙" in text) or ("是否愿意" in text)


def build_effects(eid: int, text: str) -> dict:
    eff: dict = {}
    for pat, spec in EFFECT_RULES:
        if re.search(pat, text):
            for key, val in spec.items():
                if key in ("feel", "love", "lust", "desire", "sublevel"):
                    prev = eff.get(key)
                    if prev is None or (
                        isinstance(val, (int, float))
                        and isinstance(prev, (int, float))
                        and abs(val) > abs(prev)
                    ):
                        eff[key] = val
                elif key == "status" and eff.get("status") == "dead":
                    continue
                else:
                    eff[key] = val

    delta = parse_breakthrough_delta(text)
    if delta is not None:
        eff["breakthrough_delta"] = delta
        # 兼容旧字段
        eff["buff"] = "breakthrough_up" if delta > 0 else "breakthrough_down"

    if WASH_ROOT.search(text):
        eff["wash_root"] = True

    # 道侣标签：仅「双方已结成」落地；提问与拒绝绝不打 tag
    if UNTAG_DAO.search(text):
        eff["untag"] = "dao-companion"
        eff.pop("tag", None)
    elif eid in FORCE_NO_TAG_DAO or is_consent_question(text) or REJECT_DAO.search(text):
        eff.pop("tag", None)
    elif eid in FORCE_TAG_DAO or (
        ACCEPT_DAO.search(text)
        and "拒绝" not in text
        and "是否同意" not in text
        and "和别人结为道侣" not in text
    ):
        eff["tag"] = "dao-companion"

    if eid == 33:
        eff["breakthrough_delta"] = -0.05
        eff["buff"] = "breakthrough_down"
    if eid in CONSENT_REJECT:
        eff.pop("tag", None)

    return eff


def main() -> None:
    texts = AF["eventTextById"]
    pools: dict[str, list[int]] = {k: [] for k in RULES}
    effects: dict[str, dict] = {}

    ban = set(CONSENT_REJECT.keys()) | set(CONSENT_SKIP) | set(PLAYER_PET_ONLY)

    for eid_s, text in texts.items():
        eid = int(eid_s)
        if eid in ban:
            # 提问/跳过/玩家灵宠专属：仍登记效果供审计，但不进随机池
            eff = build_effects(eid, text)
            if eff:
                effects[str(eid)] = eff
            continue
        for action, kws in RULES.items():
            if any(kw in text for kw in kws):
                pools[action].append(eid)
        eff = build_effects(eid, text)
        if eff:
            effects[str(eid)] = eff

    # 拒绝 ID 也要有可抽文案与效果
    for q, r in CONSENT_REJECT.items():
        r_text = texts.get(str(r), "")
        if r_text:
            effects[str(r)] = build_effects(r, r_text)
            # 拒绝结局进 partner / cultivate 相关池，保证能播到
            if q in (32, 146):
                pools.setdefault("partner_npc", []).append(r)
            # 33 带 breakthrough_delta；147 只是拒道侣，不进突破池
            if q == 32:
                pools.setdefault("breakthrough", []).append(r)
            if q in (210, 237):
                pools.setdefault("cultivate_together", []).append(r)
            if q == 116:
                pools.setdefault("aid", []).append(r)

    # 兜底：灵宠专属 ID 不得残留在任何池
    for action in list(pools.keys()):
        pools[action] = [e for e in pools[action] if e not in PLAYER_PET_ONLY]

    for action in pools:
        pools[action] = sorted(set(pools[action]))

    # 结构性事件：保证能进世界见闻池（效果在 applyStructuralEventEffects）
    FORCE_BEAT = [81, 83, 212, 213, 459, 516, 574]
    pools.setdefault("character_beat", [])
    for eid in FORCE_BEAT:
        if str(eid) in texts or eid in {int(x) for x in texts}:
            pools["character_beat"].append(eid)
    pools["character_beat"] = sorted(set(pools["character_beat"]))

    # 效果旗标（获物不做背包；结构性效果由 eventId 硬接线）
    for eid, spec in (
        (81, {"hatch_pet": True}),
        (83, {"form_pet": True}),
        (212, {"promote": True}),
        (213, {"ascend": True}),
        (459, {"birth": True}),
        (516, {"ascend": True}),
        (574, {"ascend": True}),
    ):
        row = dict(effects.get(str(eid)) or {})
        row.update(spec)
        effects[str(eid)] = row

    pools = {k: v for k, v in pools.items() if v}

    # 去掉空别名目标
    aliases = {
        k: [a for a in v if a in pools]
        for k, v in ACTION_ALIASES.items()
    }
    aliases = {k: v for k, v in aliases.items() if v}

    js = """/*
 * original-event-bindings.js —— H5 action → 原版 eventId 池 + 轻量效果
 * 由 tools/_build_event_bindings.py 从 af-extracted.json 生成。
 *
 * 完全还原约定（本阶段）：
 *   - 世界日事件优先原版 eventt；无池动作走 ACTION_ALIASES
 *   - 「是否同意」提问 ID 改抽拒绝 ID；收徒提问直接跳过
 *   - NPC↔NPC 只用 feel → npcAffinities；玩家↔NPC 写 8 维
 *   - breakthrough_delta：文案百分比直接加到突破判定
 *   - wash_root：洗髓丹升一档灵根
 *   - 不做元阳；不做同意 UI
 */
(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports ? factory() : factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.OriginalEventBindings = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const pools = Object.freeze(%s);
  const effects = Object.freeze(%s);
  const consentReject = Object.freeze(%s);
  const consentSkip = Object.freeze(%s);
  const actionAliases = Object.freeze(%s);

  function poolFor(action) {
    if (!action) return null;
    const list = pools[action];
    if (Array.isArray(list) && list.length) return list;
    const alts = actionAliases[action];
    if (!Array.isArray(alts)) return null;
    for (let i = 0; i < alts.length; i++) {
      const alt = pools[alts[i]];
      if (Array.isArray(alt) && alt.length) return alt;
    }
    return null;
  }

  function resolveConsentEventId(eventId) {
    const id = eventId | 0;
    if (consentSkip.indexOf(id) >= 0) return null;
    if (Object.prototype.hasOwnProperty.call(consentReject, String(id))) {
      return consentReject[String(id)] | 0;
    }
    if (Object.prototype.hasOwnProperty.call(consentReject, id)) {
      return consentReject[id] | 0;
    }
    return id;
  }

  function isConsentQuestion(eventId) {
    const id = eventId | 0;
    return Object.prototype.hasOwnProperty.call(consentReject, String(id)) ||
      Object.prototype.hasOwnProperty.call(consentReject, id) ||
      consentSkip.indexOf(id) >= 0;
  }

  function pickEventId(action, random) {
    const list = poolFor(action);
    if (!list) return null;
    const roll = typeof random === 'function' ? random() : Math.random();
    let id = list[Math.floor(roll * list.length) %% list.length];
    id = resolveConsentEventId(id);
    return id == null ? null : id;
  }

  function effectFor(eventId) {
    if (eventId == null || eventId === '') return null;
    const resolved = resolveConsentEventId(eventId);
    if (resolved == null) return null;
    const row = effects[String(resolved | 0)];
    return row && typeof row === 'object' ? row : null;
  }

  return Object.freeze({
    pools: pools,
    effects: effects,
    consentReject: consentReject,
    consentSkip: consentSkip,
    actionAliases: actionAliases,
    poolFor: poolFor,
    pickEventId: pickEventId,
    resolveConsentEventId: resolveConsentEventId,
    isConsentQuestion: isConsentQuestion,
    effectFor: effectFor
  });
});
""" % (
        json.dumps(pools, ensure_ascii=False, indent=2),
        json.dumps(effects, ensure_ascii=False, indent=2),
        json.dumps({str(k): v for k, v in CONSENT_REJECT.items()}, ensure_ascii=False, indent=2),
        json.dumps(sorted(CONSENT_SKIP), ensure_ascii=False),
        json.dumps(aliases, ensure_ascii=False, indent=2),
    )
    OUT.write_text(js, encoding="utf-8")
    print("actions", len(pools))
    for k, v in sorted(pools.items(), key=lambda x: -len(x[1])):
        print(f"  {k}: {len(v)}")
    print("aliases", aliases)
    print("effects", len(effects))
    print("consentReject", CONSENT_REJECT)
    print("wrote", OUT)


if __name__ == "__main__":
    main()
