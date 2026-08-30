/*
 * original-jobs.js —— 原版职位/家族名对照表（APK TextAsset af）
 * 仅作对标参考与自测；游戏内展示名用 H5 content/sects、sect-offices。
 */
(function (root, factory) {
  'use strict';
  const api = typeof module === 'object' && module.exports ? factory() : factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.OriginalJobs = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const famiNames = Object.freeze({
  "0": "合欢宗",
  "1": "凌霄宗",
  "2": "药王谷",
  "3": "妙音门",
  "4": "万剑山",
  "5": "星机阁",
  "6": "大自在殿",
  "7": "十万大山",
  "8": "修仙世家",
  "20": "魔域"
});
  const jobs = Object.freeze({
  "0": {
    "0": "弟子",
    "1": "长老",
    "3": "宗主"
  },
  "1": {
    "0": "弟子",
    "1": "长老",
    "2": "峰主",
    "3": "掌门"
  },
  "2": {
    "0": "弟子",
    "1": "长老",
    "3": "谷主"
  },
  "3": {
    "0": "弟子",
    "1": "长老",
    "3": "门主"
  },
  "4": {
    "0": "弟子",
    "1": "长老",
    "2": "峰主",
    "3": "掌门",
    "4": "剑尊"
  },
  "5": {
    "0": "弟子",
    "1": "长老",
    "3": "阁主"
  },
  "6": {
    "0": "弟子",
    "1": "长老",
    "3": "住持",
    "4": "佛子"
  },
  "7": {
    "0": "住民",
    "1": "长老",
    "2": "族长",
    "3": "妖王"
  },
  "8": {
    "0": "子弟",
    "1": "长老",
    "2": "家主"
  },
  "20": {
    "0": "魔人",
    "1": "魔将",
    "2": "城主",
    "3": "魔皇"
  }
});
  const leaders = Object.freeze({
  "0": "宗主",
  "1": "掌门",
  "2": "谷主",
  "3": "门主",
  "4": "剑尊",
  "5": "阁主",
  "6": "佛子",
  "7": "妖王",
  "8": "家主",
  "20": "魔皇"
});

  function rejob(fami, job) {
    const ft = jobs[String(fami | 0)];
    if (!ft) return null;
    const title = ft[String(job | 0)];
    return typeof title === 'string' ? title : null;
  }

  function releader(fami) {
    const title = leaders[String(fami | 0)];
    return typeof title === 'string' ? title : null;
  }

  function famiName(fami) {
    const name = famiNames[String(fami | 0)];
    return typeof name === 'string' ? name : null;
  }

  return Object.freeze({
    famiNames: famiNames,
    jobs: jobs,
    leaders: leaders,
    rejob: rejob,
    releader: releader,
    famiName: famiName
  });
});
