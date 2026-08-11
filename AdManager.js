// AdManager.js — 广告管理（折中态：桥接已建，但未接入任何游戏内入口/奖励）
// 设计约定：本文件只调 Platform.*，绝不出现原始 tap.*（原始 tap.* 仅封装在 platform.js 内）。
//
// 当前策略（用户 2026-07-27 拍板「折中：先搭桥不接奖励」）：
//   - 提供 showReward / showInterstitial / showBanner 标准出口；
//   - 游戏内目前不调用、不发任何奖励；
//   - 日后真要接广告变现时，业务侧写：
//       if (await AdManager.showReward()) 发奖(); else 提示('看完才有奖励');
//     （激励视频让玩家自己点、看完 isEnded 才发奖、加载失败兜底跳过，绝不卡主流程）
(function () {
  'use strict';

  var rewardAd = null;
  var interstitialAd = null;
  var bannerAd = null;

  // 广告单元 ID：H5 走 TapTap 开发者中心内置变现。
  // 接入时在开发者中心「小游戏广告」申请后填真实值；折中态下仅占位，不影响运行。
  var AD_UNIT = {
    rewarded: 'REWARD_AD_UNIT_ID',
    interstitial: 'INTERSTITIAL_AD_UNIT_ID',
    banner: 'BANNER_AD_UNIT_ID'
  };

  function init() {
    if (typeof Platform === 'undefined' || !Platform.createRewardedVideoAd) return;
    // 预创建，避免首次展示慢；mock 环境下为本地假广告
    rewardAd = Platform.createRewardedVideoAd(AD_UNIT.rewarded);
    interstitialAd = Platform.createInterstitialAd(AD_UNIT.interstitial);
    bannerAd = Platform.createBannerAd(AD_UNIT.banner);
  }

  // 激励视频：返回 Promise<boolean>（是否看完）。看完(isEnded)才应发奖。
  // 加载失败自动兜底 resolve(false)，绝不卡住主流程。
  function showReward() {
    return new Promise(function (resolve) {
      var ad = rewardAd || (typeof Platform !== 'undefined' && Platform.createRewardedVideoAd
        ? (rewardAd = Platform.createRewardedVideoAd(AD_UNIT.rewarded)) : null);
      if (!ad) { resolve(false); return; }
      var onClose = function (res) {
        if (ad.offClose) { try { ad.offClose(onClose); } catch (e) {} }
        resolve(!!(res && res.isEnded));
      };
      if (ad.onClose) ad.onClose(onClose);
      var shown = ad.show ? ad.show() : Promise.resolve();
      Promise.resolve(shown).catch(function () {
        // 首次 show 失败：重新 load 再 show 一次，仍失败则兜底 false
        if (ad.load) {
          ad.load().then(function () { return ad.show(); }).catch(function () { resolve(false); });
        } else { resolve(false); }
      });
    });
  }

  function showInterstitial() {
    return new Promise(function (resolve) {
      var ad = interstitialAd || (typeof Platform !== 'undefined' && Platform.createInterstitialAd
        ? (interstitialAd = Platform.createInterstitialAd(AD_UNIT.interstitial)) : null);
      if (!ad) { resolve(false); return; }
      var onClose = function () {
        if (ad.offClose) { try { ad.offClose(onClose); } catch (e) {} }
        resolve(true);
      };
      if (ad.onClose) ad.onClose(onClose);
      var shown = ad.show ? ad.show() : Promise.resolve();
      Promise.resolve(shown).catch(function () { resolve(false); });
    });
  }

  function showBanner() {
    if (!bannerAd && typeof Platform !== 'undefined' && Platform.createBannerAd) {
      bannerAd = Platform.createBannerAd(AD_UNIT.banner);
    }
    if (bannerAd && bannerAd.show) { bannerAd.show().catch(function () {}); }
    return bannerAd;
  }
  function hideBanner() {
    if (bannerAd && bannerAd.hide) { bannerAd.hide().catch(function () {}); }
  }

  window.AdManager = {
    init: init,
    showReward: showReward,
    showInterstitial: showInterstitial,
    showBanner: showBanner,
    hideBanner: hideBanner
  };
})();
