// platform.js — H5 桥接层
// 用标准 Web API 实现游戏所需的平台能力，对外暴露 window.Platform。
// 游戏逻辑（game.js）只调用 Platform.*，不直接碰 document / SDK / tap.*。
//
// ── 屏幕适配策略（竖屏手游 H5：宽度优先 + 动态高度）──
//   设计基准宽度 DW=420；高度随真实屏幕比例动态变化（logicalH = h / scale）。
//   这样内容宽度永远撑满，高度也永远占满，消灭上下黑边/留白。
//   game.js 用 Platform.view.logicalH 作为当前逻辑高度 H，所有纵向布局基于此。
(function () {
  'use strict';

  // 设计基准（与 game.js 的 W/H 对应）
  var DW = 420, DH = 820;

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const view = { w: 0, h: 0, dpr: 1, safeTop: 0,
                 scale: 1, offsetX: 0, offsetY: 0, logicalH: DH };

  // 安全区顶部插入（CSS env() 仅在支持的安全区容器内有效，否则为 0）
  function readSafeInset() {
    const probe = document.createElement('div');
    probe.style.cssText =
      'position:fixed;left:0;top:0;padding-top:env(safe-area-inset-top);visibility:hidden;';
    document.body.appendChild(probe);
    const v = parseFloat(getComputedStyle(probe).paddingTop) || 0;
    document.body.removeChild(probe);
    // 直接用系统安全区返回值：避免刘海屏状态栏遮挡内容
    return v;
  }

  // 画布铺满真实屏（物理像素 = 屏宽 × dpr）
  // 宽度填满：scale = 屏宽/DW、offsetX=0，横向撑满、无左右留白；纵向占满（logicalH 随屏高动态）
  // 背景由 render() step① 用真实屏尺寸全屏铺满
  function resize() {
    var dpr = window.devicePixelRatio || 1;
    var w = window.innerWidth;
    var h = window.innerHeight;
    view.w = w; view.h = h; view.dpr = dpr;
    view.safeTop = readSafeInset();

    // Canvas 物理像素 = CSS像素 × DPR（全屏铺满）
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';

    // ── 宽度优先缩放 + 动态高度（game.js 的 render 用这些值 setTransform）──
    // scale 按宽度填满；logicalH 按真实屏幕高度反推，让画布高度正好占满屏幕。
    view.scale = w / DW;
    view.offsetX = 0;
    view.offsetY = 0;
    view.logicalH = Math.max(DH, h / view.scale);

    // 默认变换：纯 DPR（用于全屏背景绘制等）
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);

  // ── 触摸 / 鼠标（PC 浏览器自测兜底）──
  // 统一把 DOM 事件整理成沙箱同款结构 { touches:[{clientX,clientY}], changedTouches:[...] }
  const handlers = { start: [], move: [], end: [] };
  function toPoint(e) {
    const t = (e.touches && e.touches[0]) ||
              (e.changedTouches && e.changedTouches[0]) || e;
    return { clientX: t.clientX, clientY: t.clientY };
  }
  function toEvent(e) {
    const p = toPoint(e);
    return { touches: [p], changedTouches: [p] };
  }
  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    const ev = toEvent(e);
    handlers.start.forEach(f => f(ev));
  }, { passive: false });
  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    const ev = toEvent(e);
    handlers.move.forEach(f => f(ev));
  }, { passive: false });
  canvas.addEventListener('touchend', e => {
    const ev = toEvent(e);
    handlers.end.forEach(f => f(ev));
  });
  canvas.addEventListener('mousedown', e => handlers.start.forEach(f => f(toEvent(e))));
  canvas.addEventListener('mousemove', e => handlers.move.forEach(f => f(toEvent(e))));
  canvas.addEventListener('mouseup',   e => handlers.end.forEach(f => f(toEvent(e))));

  // ── 对外接口 ──
  window.Platform = {
    get canvas() { return canvas; },
    get ctx() { return ctx; },
    get view() { return view; },

    // 主屏画布由 index.html 的 <canvas id="game"> 提供；
    // 离屏画布用此工厂新建（drawImage 合成用）
    createCanvas() { return document.createElement('canvas'); },
    // 图片：标准 Image，支持 .src / .onload / .onerror / .complete
    createImage() { return new Image(); },

    onTouchStart: f => handlers.start.push(f),
    onTouchMove: f => handlers.move.push(f),
    onTouchEnd:   f => handlers.end.push(f),

    request(url, opt) { return fetch(url, opt).then(r => r.json()); },

    // 本地存档（后续可换云存档）：自动 JSON 序列化
    save(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        return false;
      }
    },
    load(key) {
      try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : null; }
      catch (e) { return null; }
    },

    // 屏幕信息：对齐沙箱回调签名 { success(res){} }；res 含 pixelRatio / safeArea / window* / screen*
    getSystemInfoAsync(opt) {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth, h = window.innerHeight;
      const res = {
        pixelRatio: dpr,
        safeArea: { top: view.safeTop, bottom: 0, left: 0, right: 0 },
        windowWidth: w, windowHeight: h,
        screenWidth: w, screenHeight: h,
        statusBarHeight: view.safeTop
      };
      if (opt && typeof opt.success === 'function') opt.success(res);
      else if (opt && typeof opt.complete === 'function') opt.complete(res);
      return Promise.resolve(res);
    },

    // ── 平台能力桥接（原始 tap.* 只在本文件内出现；业务/AdManager 只调 Platform.*）──
    // 是否处于 TapTap 运行环境（真机/WebView 注入 tap 全局）
    inTap: (typeof tap !== 'undefined'),

    // 登录：真机走 tap.login / @xd-js-sdk/auth；本地返回假用户，游戏照常跑
    login() {
      if (typeof tap !== 'undefined' && tap.login) return tap.login();
      return Promise.resolve({ mock: true, openId: 'local-test', nickname: '测试玩家' });
    },
    share(payload) {
      if (typeof tap !== 'undefined' && tap.share) return tap.share(payload);
      console.log('[mock] share', payload);
    },

    // 广告出口（AdManager 调这里，不直接碰 tap）
    // 三种广告统一经 Platform 创建；本地无 tap 时返回 mock，模拟「看完」让同一份代码双端可跑
    createRewardedVideoAd(adUnitId) {
      if (typeof tap !== 'undefined' && tap.createRewardedVideoAd)
        return tap.createRewardedVideoAd({ adUnitId });
      return mockRewardedAd();
    },
    createInterstitialAd(adUnitId) {
      if (typeof tap !== 'undefined' && tap.createInterstitialAd)
        return tap.createInterstitialAd({ adUnitId });
      return mockInterstitialAd();
    },
    createBannerAd(adUnitId) {
      if (typeof tap !== 'undefined' && tap.createBannerAd)
        return tap.createBannerAd({ adUnitId });
      return mockBannerAd();
    }
  };

  // ── 本地 mock 广告（仅自测用，真机由 tap 接管）──
  function mockRewardedAd() {
    let closeCb = null, errCb = null;
    return {
      onError(fn) { errCb = fn; },
      onClose(fn) { closeCb = fn; },
      offClose() { closeCb = null; },
      load() { return Promise.resolve(); },
      show() {
        return Promise.resolve().then(() => {
          // 模拟「玩家看完」：isEnded=true
          if (closeCb) closeCb({ isEnded: true });
          else if (errCb) errCb({ errMsg: 'mock: no close handler' });
        });
      }
    };
  }
  function mockInterstitialAd() {
    let closeCb = null;
    return {
      onClose(fn) { closeCb = fn; },
      offClose() { closeCb = null; },
      load() { return Promise.resolve(); },
      show() { return Promise.resolve().then(() => { if (closeCb) closeCb({}); }); }
    };
  }
  function mockBannerAd() {
    return {
      onError() {}, onLoad() {},
      show() { return Promise.resolve(); },
      hide() { return Promise.resolve(); },
      destroy() {}
    };
  }
})();
