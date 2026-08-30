// ============================================================
// ui-home.js — XiuxianUi page module (classic script, no bundler)
// ============================================================
(function () {
  var Ui = window.XiuxianUi = window.XiuxianUi || {};
    'use strict';

  function buildHome(c) {
    const refs = Ui.contentState.refs;
    // 洞府主页：先展示 5 张卡片（灵田/阵法/灵兽/会客厅/传承殿），点卡片进入对应子页。
    // 不再用页签切换（旧页签式已按功能细化规范清理）。
    refs.caveTab = 'grid';
    refs.caveHost = Ui.el('div', 'cave-module', c);
    Ui.renderCaveModule();
  }

  function liveHome() {
    // 洞府页不再显示境界与当前行动（按规范：移至顶部资源栏下方全局行动栏）。
    Ui.liveCaveModule();
  }

  function renderCaveModule() {
    const refs = Ui.contentState.refs;
    if (!refs.caveHost) return;
    refs.caveHost.innerHTML = '';
    if (refs.caveTab === 'grid') {
      Ui.buildCaveGrid(refs.caveHost);
      return;
    }
    // 子页：返回按钮 + 对应模块内容
    const back = Ui.el('button', 'cave-back', refs.caveHost, '← 返回洞府');
    back.addEventListener('click', function () {
      refs.caveTab = 'grid';
      Ui.farmUiState.selectedPlotId = null;
      renderCaveModule();
      Ui.syncFarmPlotModal();
    });
    const host = Ui.el('div', 'cave-sub', refs.caveHost);
    if (refs.caveTab === 'farm') Ui.buildFarm(host);
    else if (refs.caveTab === 'formations') Ui.buildFormations(host);
    else if (refs.caveTab === 'beasts') Ui.buildBeasts(host);
    else if (refs.caveTab === 'meetingHall') {
      Ui.buildReserve(host, 'reserve-meetingHall', '会客厅', '将在人物与事件阶段开放');
    } else {
      Ui.buildInheritanceHall(host);
    }
  }

  function buildCaveGrid(c) {
    const refs = Ui.contentState.refs;
    const grid = Ui.el('div', 'cave-grid', c);
    Ui.CAVE_TABS.forEach(function (entry) {
      const card = Ui.el('div', 'cave-card', grid, '');
      Ui.el('div', 'cave-card-title', card, entry[1]);
      card.addEventListener('click', function () {
        refs.caveTab = entry[0];
        if (entry[0] !== 'farm') Ui.farmUiState.selectedPlotId = null;
        renderCaveModule();
        Ui.syncFarmPlotModal();
      });
    });
  }

  function liveCaveModule() {
    const refs = Ui.contentState.refs;
    if (refs.caveTab === 'farm') Ui.liveFarm();
    else if (refs.caveTab === 'formations') Ui.liveFormations();
    else if (refs.caveTab === 'beasts') Ui.liveBeasts();
    else if (refs.caveTab === 'inheritance') Ui.liveInheritanceHall();
  }

  function farmStructure(view) {
    if (!view || !Array.isArray(view.plots) ||
        !Array.isArray(view.plantableCrops)) return 'unavailable';
    return JSON.stringify({
      plots: view.plots.map(function (plot) {
        return [plot.plotId, plot.unlocked, plot.cropId, plot.ready];
      }),
      crops: view.plantableCrops.map(function (crop) {
        return [crop.cropId, crop.unlocked, crop.seedOwned];
      })
    });
  }

  function farmUnlockedCrops(view) {
    return view.plantableCrops.filter(function (crop) {
      return crop.unlocked;
    });
  }

  function farmCropById(view, cropId) {
    return view.plantableCrops.find(function (crop) {
      return crop.cropId === cropId;
    }) || null;
  }

  function farmCssToken(value) {
    return String(value || 'none').replace(/[^a-zA-Z0-9_-]/g, '-');
  }

  function farmCropKindClass(cropId) {
    return 'crop-kind-' + farmCssToken(cropId);
  }

  function farmPlotState(plot) {
    if (!plot.unlocked) return 'locked';
    if (!plot.cropId) return 'empty';
    return plot.ready ? 'ready' : 'growing';
  }

  function farmVisualCropId(view, plot, crops) {
    if (plot.cropId) return plot.cropId;
    if (!plot.unlocked) return '';
    return Ui.farmSelectedCropId(plot.plotId, crops);
  }

  function farmVisualCropName(view, plot, cropId) {
    if (plot.cropId) {
      return plot.cropName || (farmCropById(view, cropId) || {}).name || '灵植';
    }
    const crop = farmCropById(view, cropId);
    return crop ? crop.name : '待播种';
  }

  function farmCropIcon(cropId) {
    const icons = {
      spiritRice: '🌾',
      qiGatheringGrass: '🌿',
      heartClearGrass: '🌿',
      moonSpiritGrass: '🌿',
      bloodSpiritGrass: '🌿',
      goldenLingzhi: '🍄'
    };
    return icons[cropId] || '🌱';
  }

  function farmSeedIcon(seedItemId) {
    const icons = {
      commonSeed: '🌱',
      fineSeed: '🌱',
      rareSeed: '🌟'
    };
    return icons[seedItemId] || '🌱';
  }

  function farmFieldIcon(view, plot, cropId) {
    if (!plot.unlocked) return '·';
    if (plot.cropId) return farmCropIcon(cropId);
    const crop = farmCropById(view, cropId);
    return crop ? farmSeedIcon(crop.seedItemId) : '未选择种子';
  }

  function fmtDurShort(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (d > 0) return d + ' 天 ' + h + ' 小时';
    if (h > 0) return h + ' 小时 ' + m + ' 分';
    if (m > 0) return m + ' 分 ' + s + ' 秒';
    return s + ' 秒';
  }

  function farmFieldStatus(view, plot, cropId) {
    if (!plot.unlocked) return '尚未解锁';
    if (plot.cropId) {
      return plot.ready ? '已成熟' : '成长中';
    }
    return '未播种';
  }

  function farmProgressLabel(plot) {
    if (plot.ready) return '已成熟';
    return '剩余 ' + fmtDurShort(plot.remainingSeconds);
  }

  function farmFieldProgress(plot) {
    if (!plot.unlocked) return 0;
    if (!plot.cropId) return 0;
    if (plot.ready) return 1;
    return plot.progress;
  }

  function buildFarmField(parent, view, plot, crops) {
    const cropId = farmVisualCropId(view, plot, crops);
    const cropClass = farmCropKindClass(cropId);
    parent.classList.add('farm-field');
    parent.classList.add('field-state-' + farmPlotState(plot));
    parent.classList.add(cropClass);
    const unselectedClass = plot.unlocked && !plot.cropId && !cropId
      ? ' farm-seed-unselected'
      : '';
    Ui.el(
      'div',
      'farm-crop-icon ' + cropClass + unselectedClass,
      parent,
      farmFieldIcon(view, plot, cropId)
    );
    const ref = {
      statusEl: Ui.el(
        'div',
        'farm-field-status',
        parent,
        farmFieldStatus(view, plot, cropId)
      )
    };
    if (plot.cropId) {
      const progress = Ui.el('div', 'farm-field-progress', parent);
      ref.fillEl = Ui.el('div', 'farm-field-progress-fill', progress);
      ref.progressLabelEl = Ui.el(
        'div',
        'farm-field-progress-label',
        progress,
        farmProgressLabel(plot)
      );
      ref.fillEl.style.width = Ui.percent(farmFieldProgress(plot)) + '%';
    }
    return ref;
  }

  function farmEmptyPlots(view) {
    return view.plots.filter(function (plot) {
      return plot.unlocked && !plot.cropId;
    });
  }

  function farmSelectedCropId(plotId, crops) {
    const current = Ui.cropSelections[plotId];
    return crops.some(function (crop) {
      return crop.cropId === current;
    }) ? current : '';
  }

  function setFarmCropSelection(plotId, cropId, crops) {
    if (crops.some(function (crop) {
      return crop.cropId === cropId;
    })) {
      Ui.cropSelections[plotId] = cropId;
    } else {
      delete Ui.cropSelections[plotId];
    }
  }

  function farmPlannedAssignments(view) {
    const crops = farmUnlockedCrops(view);
    return farmEmptyPlots(view).map(function (plot) {
      return {
        plotId: plot.plotId,
        cropId: farmSelectedCropId(plot.plotId, crops)
      };
    }).filter(function (assignment) {
      return !!assignment.cropId;
    });
  }

  function farmPlanStatus(view, assignments) {
    const available = {};
    const needed = {};
    assignments.forEach(function (assignment) {
      const crop = farmCropById(view, assignment.cropId);
      if (!crop) return;
      available[crop.seedItemId] = crop.seedOwned;
      needed[crop.seedItemId] =
        (needed[crop.seedItemId] || 0) + crop.seedRequired;
    });
    const missing = Object.keys(needed).some(function (itemId) {
      return needed[itemId] > (available[itemId] || 0);
    });
    return {
      ok: !missing,
      warning: missing ? '种子不足' : '',
      text: assignments.length
        ? missing
          ? '将播种 ' + assignments.length + ' 块 · 种子不足'
          : '将播种 ' + assignments.length + ' 块'
        : farmEmptyPlots(view).length
          ? '尚未选择种子'
          : '没有空闲灵田'
    };
  }

  function openFarmPlotModal(plotId) {
    Ui.farmUiState.selectedPlotId = plotId;
    renderCaveModule();
    Ui.syncFarmPlotModal();
  }

  function closeFarmPlotModal() {
    Ui.farmUiState.selectedPlotId = null;
    renderCaveModule();
    Ui.syncFarmPlotModal();
  }

  function buildFarm(c) {
    const view = Ui.api().queries.homestead('farm');
    const refs = Ui.contentState.refs;
    if (!view || !Array.isArray(view.plots) ||
        !Array.isArray(view.plantableCrops)) {
      refs.caveStructure = 'unavailable';
      Ui.buildReserve(c, 'reserve-farm', '灵田', '当前存档尚未启用灵田');
      return;
    }
    refs.caveStructure = farmStructure(view);
    refs.plotRefs = {};
    const crops = farmUnlockedCrops(view);
    const assignments = farmPlannedAssignments(view);
    const planStatus = farmPlanStatus(view, assignments);

    if (Ui.farmUiState.selectedPlotId &&
        !view.plots.some(function (plot) {
          return plot.plotId === Ui.farmUiState.selectedPlotId;
        })) {
      Ui.farmUiState.selectedPlotId = null;
    }
    if (!crops.some(function (crop) {
      return crop.cropId === Ui.farmUiState.quickCropId;
    })) {
      Ui.farmUiState.quickCropId = crops[0] && crops[0].cropId || '';
    }

    const toolbar = Ui.el('div', 'farm-toolbar', c);
    const quick = Ui.el('select', 'crop-select quick-crop-select', toolbar);
    crops.forEach(function (crop) {
      const option = Ui.el('option', '', quick, crop.name);
      option.value = crop.cropId;
    });
    quick.value = Ui.farmUiState.quickCropId;
    quick.disabled = !crops.length;
    quick.addEventListener('change', function (event) {
      Ui.farmUiState.quickCropId = event.target.value;
    });
    const quickButton = Ui.el(
      'button',
      'farm-toolbtn quick-seed-action',
      toolbar,
      '快捷播种'
    );
    quickButton.disabled = !farmEmptyPlots(view).length || !crops.length;
    quickButton.addEventListener('click', function () {
      farmEmptyPlots(view).forEach(function (plot) {
        setFarmCropSelection(plot.plotId, Ui.farmUiState.quickCropId, crops);
      });
      renderCaveModule();
      Ui.syncFarmPlotModal();
    });
    const plantAll = Ui.el(
      'button',
      'farm-toolbtn primary plant-all-action',
      toolbar,
      '全部播种'
    );
    plantAll.disabled = !assignments.length;
    plantAll.addEventListener('click', function () {
      if (!planStatus.ok) {
        Ui.showToast(planStatus.warning || planStatus.text);
        return;
      }
      const result = Ui.invokeCommand('plantAll', { assignments: assignments });
      if (result && result.ok && result.changed) {
        Ui.farmUiState.selectedPlotId = null;
        renderCaveModule();
        Ui.syncFarmPlotModal();
      }
    });
    Ui.el('div', 'farm-plan-summary', c, planStatus.text);

    const grid = Ui.el('div', 'homestead-grid', c);
    view.plots.forEach(function (plot) {
      const card = Ui.el(
        'div',
        'card plot-card' +
          (plot.unlocked ? '' : ' locked') +
          (Ui.farmUiState.selectedPlotId === plot.plotId ? ' selected' : ''),
        grid
      );
      card.addEventListener('click', function () {
        openFarmPlotModal(plot.plotId);
      });
      const fieldRef = buildFarmField(card, view, plot, crops);
      if (!plot.unlocked) {
        return;
      }
      if (!plot.cropId) {
        return;
      }
      refs.plotRefs[plot.plotId] = fieldRef;
      Ui.updatePlot(refs.plotRefs[plot.plotId], plot);
    });
  }

  function farmSelectedPlotContext() {
    if (!Ui.contentState.refs || Ui.contentState.refs.caveTab !== 'farm') {
      return null;
    }
    if (!Ui.farmUiState.selectedPlotId) return null;
    const view = Ui.api().queries.homestead('farm');
    if (!view || !Array.isArray(view.plots) ||
        !Array.isArray(view.plantableCrops)) {
      return null;
    }
    const plot = view.plots.find(function (entry) {
      return entry.plotId === Ui.farmUiState.selectedPlotId;
    });
    if (!plot) {
      Ui.farmUiState.selectedPlotId = null;
      return null;
    }
    return {
      view: view,
      plot: plot,
      crops: farmUnlockedCrops(view)
    };
  }

  function farmPlotModalSignature(view, plot, crops) {
    const cropId = farmVisualCropId(view, plot, crops);
    return JSON.stringify({
      plot: [
        plot.plotId,
        plot.unlocked,
        plot.cropId,
        plot.cropName,
        plot.ready,
        cropId
      ],
      crops: crops.map(function (crop) {
        return [
          crop.cropId,
          crop.name,
          crop.seedOwned,
          crop.seedRequired,
          crop.growthSeconds,
          crop.baseHarvest,
          crop.masteryLevel
        ];
      })
    });
  }

  function buildFarmPlotModal(m) {
    m.root.addEventListener('click', function (event) {
      if (event && event.target === m.root) closeFarmPlotModal();
    });
    const modal = Ui.el('div', 'modal farm-plot-modal', m.root);
    const close = Ui.el('button', 'modal-close', modal, '×');
    close.addEventListener('click', function () {
      closeFarmPlotModal();
    });
    m.refs = {
      title: Ui.el('div', 'modal-title', modal, '灵田详情'),
      body: Ui.el('div', 'modal-body farm-plot-modal-body', modal)
    };
    m.signature = '';
  }

  function updateFarmPlotModal(m, view, plot, crops) {
    m.refs.title.textContent = '灵田详情';
    const signature = farmPlotModalSignature(view, plot, crops);
    if (m.signature !== signature) {
      m.refs.body.innerHTML = '';
      Ui.buildFarmPlotDetail(m.refs.body, view, plot, crops);
      m.signature = signature;
      return;
    }
    Ui.updatePlot(Ui.contentState.refs.plotRefs['detail-' + plot.plotId], plot);
  }

  function syncFarmPlotModal() {
    const m = Ui.modals.farmPlot;
    if (!m || !m.root) return;
    const context = farmSelectedPlotContext();
    if (!context) {
      m.root.style.display = 'none';
      m.signature = '';
      return;
    }
    if (!m.built) {
      buildFarmPlotModal(m);
      m.built = true;
    }
    m.root.style.display = 'flex';
    updateFarmPlotModal(m, context.view, context.plot, context.crops);
  }

  function buildFarmPlotDetail(c, view, plot, crops) {
    const preview = Ui.el('div', 'farm-modal-field-preview', c);
    buildFarmField(preview, view, plot, crops);
    if (!plot.unlocked) {
      Ui.el('div', 'muted', c, '尚未解锁');
      return;
    }
    if (!plot.cropId) {
      const selectedCropId = farmSelectedCropId(plot.plotId, crops);
      Ui.el(
        'div',
        'plot-status',
        c,
        selectedCropId
          ? '未播种 · 这块田会按当前种子计划参与全部播种'
          : '未播种 · 尚未选择种子'
      );
      const select = Ui.el('select', 'crop-select crop-plan-select', c);
      const placeholder = Ui.el('option', '', select, '未选择种子');
      placeholder.value = '';
      crops.forEach(function (crop) {
        const option = Ui.el('option', '', select, crop.name);
        option.value = crop.cropId;
      });
      select.value = selectedCropId;
      select.disabled = !crops.length;
      select.addEventListener('change', function (event) {
        setFarmCropSelection(plot.plotId, event.target.value, crops);
        renderCaveModule();
        syncFarmPlotModal();
      });
      const crop = farmCropById(view, selectedCropId);
      if (crop) {
        const stats = Ui.el('div', 'farm-detail-grid', c);
        Ui.el('div', 'seed-count', stats, '种子 ' + crop.seedOwned + '/' + crop.seedRequired);
        Ui.el('div', 'muted', stats, '成长 ' + Ui.fmtDur(crop.growthSeconds));
        Ui.el('div', 'muted', stats, '基础产出 ' + crop.baseHarvest);
        Ui.el('div', 'muted', stats, '精通 ' + crop.masteryLevel + ' 级');
      } else {
        Ui.el('div', 'muted', c, '暂无可种作物');
      }
      return;
    }
    Ui.el('div', 'plot-crop', c, plot.cropName);
    const progress = Ui.el('div', 'action-progress', c);
    const fill = Ui.el('div', 'fill', progress);
    const status = Ui.el('div', 'plot-status', c);
    const ref = { fillEl: fill, statusEl: status };
    Ui.contentState.refs.plotRefs['detail-' + plot.plotId] = ref;
    Ui.updatePlot(ref, plot);
    if (plot.ready) {
      const harvest = Ui.el(
        'button',
        'small-btn harvest-action',
        c,
        '采收'
      );
      harvest.addEventListener('click', function (event) {
        if (event && event.stopPropagation) event.stopPropagation();
        Ui.invokeCommand('harvest', { plotId: plot.plotId });
      });
    }
  }

  function updatePlot(ref, plot) {
    if (!ref) return;
    if (ref.fillEl) {
      ref.fillEl.style.width = Ui.percent(farmFieldProgress(plot)) + '%';
    }
    if (ref.progressLabelEl) {
      ref.progressLabelEl.textContent = farmProgressLabel(plot);
    }
    if (ref.statusEl) {
      ref.statusEl.textContent = plot.ready ? '已成熟' : '成长中';
    }
  }

  function liveFarm() {
    const view = Ui.api().queries.homestead('farm');
    if (!view || !Array.isArray(view.plots) ||
        !Array.isArray(view.plantableCrops)) return;
    if (Ui.contentState.refs.caveStructure !== farmStructure(view)) {
      renderCaveModule();
      return;
    }
    view.plots.forEach(function (plot) {
      updatePlot(Ui.contentState.refs.plotRefs[plot.plotId], plot);
      updatePlot(Ui.contentState.refs.plotRefs['detail-' + plot.plotId], plot);
    });
  }

  function formationStructure(view) {
    if (!view || !Array.isArray(view.slots) ||
        !Array.isArray(view.formations)) return 'unavailable';
    return JSON.stringify({
      slots: view.slots,
      formations: view.formations
    });
  }

  function buildFormations(c) {
    const view = Ui.api().queries.homestead('formations');
    const refs = Ui.contentState.refs;
    if (!view || !Array.isArray(view.slots) ||
        !Array.isArray(view.formations)) {
      refs.caveStructure = 'unavailable';
      Ui.buildReserve(c, 'reserve-formations', '阵法', '当前存档尚未启用阵法');
      return;
    }
    refs.caveStructure = formationStructure(view);
    view.slots.forEach(function (slot) {
      const card = Ui.el('div', 'card formation-slot', c);
      Ui.el('div', 'card-title', card, '阵位 ' + (slot.slotIndex + 1));
      Ui.el('div', 'formation-name', card, slot.name || '未布阵');
      if (slot.effectText) Ui.el('div', 'effect-text', card, slot.effectText);
      if (slot.formationId) {
        const clear = Ui.el(
          'button',
          'small-btn formation-clear',
          card,
          '卸下'
        );
        clear.addEventListener('click', function () {
          Ui.invokeCommand('unequipFormation', {
            slotIndex: slot.slotIndex
          });
        });
      }
    });
    const list = Ui.el('div', 'formation-list', c);
    view.formations.forEach(function (formation) {
      const row = Ui.el('div', 'card formation-card', list);
      Ui.el('div', 'card-title', row, formation.name);
      const owned = Ui.el(
        'div',
        'formation-owned',
        row,
        '持有 ' + formation.owned + ' · 可用 ' + formation.unbound
      );
      Ui.attachItemTipTrigger(owned, {
        itemId: formation.itemId,
        name: formation.name,
        owned: formation.owned,
        available: formation.unbound
      });
      Ui.el(
        'div',
        'formation-discovered',
        row,
        formation.discovered ? '已发现' : '尚未发现'
      );
      Ui.el('div', 'effect-text', row, formation.effectText);
      if (formation.canEquip) {
        const equip = Ui.el(
          'button',
          'small-btn formation-equip',
          row,
          view.slots[0] && view.slots[0].formationId ? '替换' : '装备'
        );
        equip.addEventListener('click', function () {
          Ui.invokeCommand('equipFormation', {
            slotIndex: 0,
            itemId: formation.itemId
          });
        });
      }
    });
  }

  function liveFormations() {
    const view = Ui.api().queries.homestead('formations');
    if (!view || !Array.isArray(view.slots) ||
        !Array.isArray(view.formations)) return;
    if (Ui.contentState.refs.caveStructure !== formationStructure(view)) {
      renderCaveModule();
    }
  }

  function beastStructure(view) {
    if (!view || !Array.isArray(view.encounters) ||
        !Array.isArray(view.roster)) return 'unavailable';
    return JSON.stringify({
      encounters: view.encounters.map(function (encounter) {
        return [
          encounter.id,
          encounter.speciesName,
          encounter.sourceSkillId,
          encounter.tame.actionKey,
          encounter.tame.itemId,
          encounter.tame.durationSeconds,
          encounter.tame.active,
          encounter.tame.stalled
        ];
      }),
      roster: view.roster.map(function (beast) {
        return [
          beast.id,
          beast.level,
          beast.xp,
          beast.traitName,
          beast.growthName,
          beast.training.actionKey,
          beast.training.itemId,
          beast.training.durationSeconds,
          beast.assistant.beastId,
          beast.assistant.effect,
          beast.assistant.active,
          beast.training.active,
          beast.training.stalled
        ];
      })
    });
  }

  function buildBeasts(c) {
    const view = Ui.api().queries.homestead('beasts');
    const refs = Ui.contentState.refs;
    if (!view || !Array.isArray(view.encounters) ||
        !Array.isArray(view.roster)) {
      refs.caveStructure = 'unavailable';
      Ui.buildReserve(c, 'reserve-beasts', '灵兽', '当前存档尚未启用灵兽');
      return;
    }
    refs.caveStructure = beastStructure(view);
    refs.beastActions = {};
    if (!view.encounters.length) {
      Ui.el('div', 'muted', c, '暂无待驯服灵兽');
    }
    view.encounters.forEach(function (encounter) {
      const card = Ui.el('div', 'card beast-card beast-encounter', c);
      Ui.el('div', 'card-title', card, encounter.speciesName);
      Ui.el('div', 'action-meta', card, '来自 ' + encounter.sourceSkillId);
      Ui.el(
        'div',
        'action-meta',
        card,
        ''
      );
      const tameMeta = card.lastChild;
      const tameItem = encounter.tame.itemId
        ? Ui.resolveItemTipData({ itemId: encounter.tame.itemId, required: 1 })
        : null;
      if (tameItem) {
        Ui.renderItemLine(
          tameMeta,
          tameItem,
          '驯服耗时 ' + encounter.tame.durationSeconds + ' 秒 · 材料 ' +
            tameItem.name
        );
      } else {
        tameMeta.textContent =
          '驯服耗时 ' + encounter.tame.durationSeconds + ' 秒';
      }
      const action = Object.assign({}, encounter.tame);
      const progress = Ui.addProgress(card, action);
      const holder = Ui.el('div', 'action-control', card);
      Ui.updateActionControl(holder, action, false);
      refs.beastActions[action.actionKey] = { progress, holder };
    });
    view.roster.forEach(function (beast) {
      const card = Ui.el('div', 'card beast-card beast-roster', c);
      Ui.el(
        'div',
        'card-title',
        card,
        beast.speciesName + ' Lv.' + beast.level
      );
      Ui.el(
        'div',
        'beast-detail',
        card,
        '经验 ' + beast.xp + ' · 特性 ' + beast.traitName +
          ' · 成长 ' + beast.growthName
      );
      Ui.el(
        'div',
        'action-meta',
        card,
        ''
      );
      const trainingMeta = card.lastChild;
      const trainingItem = beast.training.itemId
        ? Ui.resolveItemTipData({ itemId: beast.training.itemId, required: 1 })
        : null;
      if (trainingItem) {
        Ui.renderItemLine(
          trainingMeta,
          trainingItem,
          '训练耗时 ' + beast.training.durationSeconds + ' 秒 · 材料 ' +
            trainingItem.name
        );
      } else {
        trainingMeta.textContent =
          '训练耗时 ' + beast.training.durationSeconds + ' 秒';
      }
      const action = Object.assign({}, beast.training);
      const training = Ui.el('div', 'beast-training', card);
      const progress = Ui.addProgress(training, action);
      const holder = Ui.el('div', 'action-control', training);
      Ui.updateActionControl(holder, action, false);
      refs.beastActions[action.actionKey] = { progress, holder };
      const assistant = Ui.el(
        'button',
        'small-btn assistant-toggle',
        card,
        beast.assistant.active ? '取消助阵' : '设为助阵'
      );
      assistant.addEventListener('click', function () {
        Ui.invokeCommand('setActiveBeast', {
          beastId: beast.assistant.active ? null : beast.assistant.beastId
        });
      });
    });
  }

  function liveBeasts() {
    const view = Ui.api().queries.homestead('beasts');
    if (!view || !Array.isArray(view.encounters) ||
        !Array.isArray(view.roster)) return;
    if (Ui.contentState.refs.caveStructure !== beastStructure(view)) {
      renderCaveModule();
      return;
    }
    view.encounters.forEach(function (encounter) {
      const ref = Ui.contentState.refs.beastActions[encounter.tame.actionKey];
      if (ref) Ui.updateProgress(ref.progress, encounter.tame);
    });
    view.roster.forEach(function (beast) {
      const ref = Ui.contentState.refs.beastActions[beast.training.actionKey];
      if (ref) Ui.updateProgress(ref.progress, beast.training);
    });
  }

  function buildInventory(c) {
    const refs = Ui.contentState.refs;
    // inventory-page 类由 syncContentShellClass 打在 shell.content 上。
    refs.equipmentDock = Ui.el('section', 'inventory-equipment-dock', c);
    const dockHead = Ui.el('div', 'equipment-dock-head', refs.equipmentDock);
    Ui.el('div', 'equipment-dock-title', dockHead, '当前装备');
    refs.equipmentLoadoutName = Ui.el(
      'div',
      'equipment-dock-plan',
      dockHead,
      '当前战斗方案'
    );
    refs.equipmentDockGrid = Ui.el(
      'div',
      'equipment-dock-grid',
      refs.equipmentDock
    );
    refs.inventoryScroll = Ui.el('div', 'inventory-scroll-region', c);
    refs.filters = Ui.el('div', 'filters inv-filters', refs.inventoryScroll);
    Ui.enableDragScroll(refs.filters);
    refs.toolbar = Ui.el('div', 'inv-toolbar', refs.inventoryScroll);
    refs.capacity = Ui.el('div', 'inv-capacity', refs.toolbar);
    const btnGroup = Ui.el('div', 'inv-toolbtns', refs.toolbar);
    refs.tidyBtn = Ui.el('button', 'inv-toolbtn', btnGroup, '整理');
    refs.expandBtn = Ui.el('button', 'inv-toolbtn primary', btnGroup, '拓展');
    refs.tidyBtn.addEventListener('click', Ui.tidyInventory);
    refs.expandBtn.addEventListener('click', Ui.openExpandModal);
    refs.inventoryHost = Ui.el('div', 'inv-grid', refs.inventoryScroll);
    Ui.refreshInventoryView();
  }

  function uiQuality(quality) {
    return {
      common: 'white',
      fine: 'green',
      rare: 'blue',
      epic: 'purple',
      legendary: 'orange',
      mythic: 'red'
    }[quality] || quality || 'white';
  }

  function activeEquipmentPlan() {
    const view = Ui.safeQuery('combatLoadouts', undefined, null);
    if (!view || !Array.isArray(view.plans)) return null;
    return view.plans.find(function (plan) {
      return plan && plan.id === view.activeLoadoutId;
    }) || view.plans.find(function (plan) {
      return plan && plan.active;
    }) || view.plans[0] || null;
  }

  function equipmentInfo(itemLike) {
    const source = itemLike && typeof itemLike === 'object'
      ? itemLike
      : {};
    const instanceId = typeof source.instanceId === 'string'
      ? source.instanceId
      : '';
    if (!instanceId) return null;
    const detail = Ui.safeQuery(
      'equipmentInfo',
      { instanceId: instanceId },
      null
    );
    if (!detail) return Object.assign({}, source, {
      instanceId: instanceId,
      category: 'equipment'
    });
    const merged = Object.assign({}, source, detail, {
      instanceId: instanceId,
      itemId: instanceId,
      category: 'equipment',
      quantity: Number.isSafeInteger(source.quantity)
        ? source.quantity
        : 1,
      available: Number.isSafeInteger(source.available)
        ? source.available
        : 1,
      bound: Array.isArray(detail.references)
        ? detail.references.length
        : Number(source.bound) || 0,
      slotName: Ui.EQUIPMENT_LABELS[detail.slot] || detail.slot || '装备'
    });
    if (!merged.description) {
      merged.description = (merged.affixes || []).map(function (affix) {
        return affix.text;
      }).join(' · ') || '尚未生成附加词条。';
    }
    return merged;
  }

  function refreshEquipmentDock() {
    const refs = Ui.contentState.refs;
    if (!refs.equipmentDockGrid) return;
    const plan = activeEquipmentPlan();
    const rows = plan && Array.isArray(plan.equipment)
      ? plan.equipment
      : [];
    const bySlot = {};
    rows.forEach(function (row) {
      if (row && Ui.EQUIPMENT_SLOTS.indexOf(row.slot) >= 0) {
        bySlot[row.slot] = row;
      }
    });
    const signature = JSON.stringify({
      id: plan && plan.id,
      name: plan && plan.name,
      equipment: Ui.EQUIPMENT_SLOTS.map(function (slot) {
        return bySlot[slot] || null;
      })
    });
    if (refs.equipmentDockSignature === signature) return;
    refs.equipmentDockSignature = signature;
    refs.equipmentLoadoutName.textContent = plan
      ? (plan.name || '当前战斗方案')
      : '暂无战斗方案';
    refs.equipmentDockGrid.innerHTML = '';
    Ui.EQUIPMENT_SLOTS.forEach(function (slotName) {
      const row = bySlot[slotName] || {
        slot: slotName,
        unlocked: true,
        instanceId: null
      };
      const filled = !!row.instanceId;
      const unlocked = row.unlocked !== false;
      const slot = Ui.el(
        'button',
        'equipment-dock-slot ' +
          (filled ? 'filled' : unlocked ? 'empty' : 'locked'),
        refs.equipmentDockGrid
      );
      slot.type = 'button';
      slot.dataset.slot = slotName;
      if (filled) slot.classList.add('q-' + uiQuality(row.quality));
      const icon = Ui.el('div', 'equipment-dock-icon', slot);
      if (filled) {
        Ui.renderItemIcon(icon, row, { fallback: '◇' });
      } else {
        icon.textContent = unlocked ? '＋' : '🔒';
      }
      Ui.el(
        'div',
        'equipment-dock-label',
        slot,
        Ui.EQUIPMENT_LABELS[slotName] || slotName
      );
      if (filled && row.enhancementLevel > 0) {
        Ui.el(
          'span',
          'equipment-dock-level',
          slot,
          '+' + row.enhancementLevel
        );
      }
      if (filled) {
        slot.addEventListener('click', function (event) {
          if (event && event.stopPropagation) event.stopPropagation();
          Ui.showEquippedEquipmentTip(row, slot);
        });
      } else if (unlocked) {
        slot.addEventListener('click', function () {
          Ui.inventoryUiState.category = 'equipment';
          Ui.refreshInventoryView();
          if (refs.inventoryScroll && refs.inventoryScroll.scrollTo) {
            refs.inventoryScroll.scrollTo({ top: 0, behavior: 'smooth' });
          }
        });
      }
    });
  }

  function refreshInventoryView() {
    const refs = Ui.contentState.refs;
    const view = Ui.api().queries.inventory({ category: Ui.inventoryUiState.category });
    Ui.inventoryUiState.category = view.selectedCategory;
    refs.capacity.textContent = '已用 ' + view.used + ' / ' + view.capacity;
    refreshEquipmentDock();

    // 顶部筛选页签（支持横向滑动）
    const filterSignature = view.categories.join(',') + '|' + view.selectedCategory;
    if (refs.filterSignature !== filterSignature) {
      refs.filterSignature = filterSignature;
      refs.filters.innerHTML = '';
      view.categories.forEach(function (category) {
        const chip = Ui.el(
          'button',
          'filter-chip' +
            (category === view.selectedCategory ? ' active' : ''),
          refs.filters,
          Ui.CATEGORY_LABELS[category] || category
        );
        chip.addEventListener('click', function () {
          Ui.inventoryUiState.category = category;
          refreshInventoryView();
        });
      });
    }

    // 物品列表（整理后按品质排序）
    let items = Array.isArray(view.items) ? view.items.slice() : [];
    if (Ui.inventoryUiState.sortMode === 'quality') {
      items.sort(function (left, right) {
        const q = (Ui.QUALITY_TIER[right.quality] || 0) - (Ui.QUALITY_TIER[left.quality] || 0);
        if (q !== 0) return q;
        const cat = (Ui.INV_CATEGORY_ORDER[right.category] || 0) -
          (Ui.INV_CATEGORY_ORDER[left.category] || 0);
        if (cat !== 0) return cat;
        return String(left.name).localeCompare(String(right.name), 'zh');
      });
    }

    // 标准 RPG 网格：固定 capacity 个格子，前 N 个放物品，其余为空槽
    const capacity = Math.max(0, Number(view.capacity) || 0);
    let signature = capacity + '|' + Ui.inventoryUiState.sortMode + '|' + items.length;
    for (let i = 0; i < items.length; i++) {
      const row = items[i];
      signature += '|' + (row.instanceId || row.itemId || '') +
        ':' + (row.quantity || 0) +
        ':' + (row.quality || '') +
        ':' + (row.favorite ? 1 : 0) +
        ':' + (row.bound || 0);
    }
    if (refs.invSignature === signature) return;
    refs.invSignature = signature;
    refs.inventoryHost.innerHTML = '';
    for (let i = 0; i < capacity; i++) {
      const item = items[i];
      const slot = Ui.el(
        'div',
        'inv-slot' + (item ? ' filled' : ' empty'),
        refs.inventoryHost
      );
      if (!item) continue; // 空槽：纯展示，无内容、无图标
      if (item.quality) slot.classList.add('q-' + uiQuality(item.quality));
      Ui.renderItemIcon(Ui.el('div', 'inv-icon', slot), item);
      Ui.el('div', 'inv-slot-name', slot, item.name);
      if (item.favorite) {
        Ui.el('div', 'inv-favorite', slot, '★');
      }
      if (item.quantity > 1) {
        Ui.el('div', 'inv-qty', slot, '×' + item.quantity);
      }
      slot.addEventListener('click', function () {
        Ui.openInventoryItemAction(item);
      });
    }
  }

  function tidyInventory() {
    Ui.inventoryUiState.sortMode = 'quality';
    refreshInventoryView();
    Ui.showToast('背包已整理');
  }

  function liveInventory() {
    if (Ui.contentState.refs.inventoryHost) refreshInventoryView();
  }

  // ── 只读物品 tips：非背包场景使用，手机点击显示，点击外部隐藏 ──
  function resolveItemTipData(itemLike) {
    const source = itemLike && typeof itemLike === 'object' ? itemLike : {};
    const equipment = equipmentInfo(source);
    const itemId = typeof source.itemId === 'string' ? source.itemId : '';
    const meta = !equipment && itemId
      ? Ui.safeQuery('itemInfo', { itemId: itemId }, null)
      : null;
    const merged = Object.assign({
      itemId: itemId,
      name: itemId || '未知物品',
      category: 'material',
      icon: '📦',
      description: '暂无说明。',
      quality: 'white',
      sellValue: 0
    }, meta || {}, source, equipment || {});
    if (equipment) {
      merged.itemId = equipment.instanceId;
      merged.instanceId = equipment.instanceId;
      merged.category = 'equipment';
    }
    if (!merged.name) merged.name = itemId || '未知物品';
    if (!merged.icon) merged.icon = '📦';
    if (!merged.description) merged.description = '暂无说明。';
    if (!merged.quality) merged.quality = 'white';
    return merged;
  }

  function itemIconFallback(itemLike, fallback) {
    return itemLike && typeof itemLike.icon === 'string' && itemLike.icon
      ? itemLike.icon
      : fallback || '📦';
  }

  function itemIconSource(itemLike, preferLarge) {
    if (!itemLike || typeof itemLike !== 'object') return '';
    if (preferLarge && typeof itemLike.iconSrc100 === 'string' &&
        itemLike.iconSrc100) {
      return itemLike.iconSrc100;
    }
    return itemLike.iconSrc50 || itemLike.iconSrc || itemLike.iconSrc100 || '';
  }

  function renderItemIcon(host, itemLike, options) {
    if (!host) return;
    const opts = options || {};
    const fallback = itemIconFallback(itemLike, opts.fallback);
    const src = itemIconSource(itemLike, !!opts.large);
    host.innerHTML = '';
    host.classList.toggle('has-image-icon', !!src);
    if (!src) {
      host.textContent = fallback;
      return;
    }
    const img = document.createElement('img');
    img.className = 'item-icon-img';
    img.src = src;
    img.alt = itemLike && itemLike.name ? itemLike.name : '';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.addEventListener('error', function () {
      host.classList.remove('has-image-icon');
      host.innerHTML = '';
      host.textContent = fallback;
    });
    host.appendChild(img);
  }

  function ensureItemTip() {
    if (Ui.itemTip.built) return Ui.itemTip;
    const host = Ui.root || document.body || null;
    const rootEl = Ui.el('div', 'item-tip', host);
    rootEl.style.display = 'none';
    const head = Ui.el('div', 'item-tip-head', rootEl);
    const icon = Ui.el('div', 'item-tip-icon', head);
    const title = Ui.el('div', 'item-tip-title', head);
    const name = Ui.el('div', 'item-tip-name', title);
    const quality = Ui.el('div', 'item-tip-quality', title);
    const meta = Ui.el('div', 'item-tip-meta', rootEl);
    const desc = Ui.el('div', 'item-tip-desc', rootEl);
    Ui.itemTip = {
      built: true,
      root: rootEl,
      refs: {
        icon: icon,
        name: name,
        quality: quality,
        meta: meta,
        desc: desc
      },
      open: false
    };
    document.addEventListener('click', function (event) {
      if (!Ui.itemTip.open) return;
      const target = event.target;
      if (Ui.itemTip.root && Ui.itemTip.root.contains &&
          Ui.itemTip.root.contains(target)) {
        return;
      }
      if (target && target.closest &&
          target.closest('[data-item-tip-trigger="1"]')) {
        return;
      }
      Ui.hideItemTip();
    });
    return Ui.itemTip;
  }

  function itemTipMetaText(item) {
    const parts = [Ui.CATEGORY_LABELS[item.category] || item.category || '物品'];
    if (Number.isSafeInteger(item.quantity)) {
      parts.push('数量 ' + item.quantity);
    }
    if (Number.isSafeInteger(item.count)) {
      parts.push('数量 ' + item.count);
    }
    if (Number.isSafeInteger(item.required)) {
      parts.push('需要 ' + item.required);
    }
    if (Number.isSafeInteger(item.owned)) {
      parts.push('持有 ' + item.owned);
    }
    if (Number.isSafeInteger(item.available)) {
      parts.push('可用 ' + item.available);
    }
    return parts.join(' · ');
  }

  function positionItemTip(tipRoot, anchorElement) {
    const viewportWidth = Math.max(0, Number(window.innerWidth) || 360);
    const viewportHeight = Math.max(0, Number(window.innerHeight) || 640);
    const rect = anchorElement && anchorElement.getBoundingClientRect
      ? anchorElement.getBoundingClientRect()
      : { left: 12, right: 12, top: 120, bottom: 120, width: 0, height: 0 };
    const margin = 10;
    const width = Math.min(260, Math.max(210, viewportWidth - 24));
    tipRoot.style.maxWidth = width + 'px';
    tipRoot.style.left = Math.max(12, Math.min(
      viewportWidth - width - 12,
      rect.left + (rect.width / 2) - (width / 2)
    )) + 'px';
    const below = rect.bottom + margin;
    const useBelow = below + 160 < viewportHeight || rect.top < 180;
    tipRoot.style.top = (useBelow
      ? below
      : Math.max(12, rect.top - 170 - margin)) + 'px';
  }

  function showItemTip(itemLike, anchorElement) {
    const data = resolveItemTipData(itemLike);
    if (!data.itemId && !data.name) return;
    const tip = ensureItemTip();
    renderItemIcon(tip.refs.icon, data);
    tip.refs.name.textContent = data.name || data.itemId || '未知物品';
    const quality = data.quality || 'white';
    const qualityClass = uiQuality(quality);
    tip.refs.quality.textContent = Ui.QUALITY_LABELS[quality] || '普通';
    tip.refs.quality.className = 'item-tip-quality q-' + qualityClass;
    tip.refs.meta.textContent = itemTipMetaText(data);
    tip.refs.desc.textContent = data.description || '暂无说明。';
    tip.root.style.display = 'block';
    tip.open = true;
    positionItemTip(tip.root, anchorElement);
  }

  function hideItemTip() {
    if (!Ui.itemTip || !Ui.itemTip.root) return;
    Ui.itemTip.root.style.display = 'none';
    Ui.itemTip.open = false;
  }

  function ensureEquipmentTip() {
    if (Ui.equipmentTip.built) return Ui.equipmentTip;
    const host = Ui.root || document.body || null;
    const rootEl = Ui.el(
      'div',
      'item-tip equipment-equipped-tip',
      host
    );
    rootEl.style.display = 'none';
    const head = Ui.el('div', 'item-tip-head', rootEl);
    const icon = Ui.el('div', 'item-tip-icon', head);
    const title = Ui.el('div', 'item-tip-title', head);
    const name = Ui.el('div', 'item-tip-name', title);
    const quality = Ui.el('div', 'item-tip-quality', title);
    const meta = Ui.el('div', 'item-tip-meta', rootEl);
    const desc = Ui.el('div', 'item-tip-desc', rootEl);
    const actions = Ui.el('div', 'equipment-tip-actions', rootEl);
    const detail = Ui.el(
      'button',
      'equipment-tip-button equipment-tip-detail',
      actions,
      '查看详情'
    );
    const unequip = Ui.el(
      'button',
      'equipment-tip-button equipment-tip-unequip',
      actions,
      '卸下'
    );
    Ui.equipmentTip = {
      built: true,
      root: rootEl,
      refs: {
        icon: icon,
        name: name,
        quality: quality,
        meta: meta,
        desc: desc,
        detail: detail,
        unequip: unequip
      },
      open: false,
      data: null
    };
    detail.addEventListener('click', function (event) {
      if (event && event.stopPropagation) event.stopPropagation();
      const data = Ui.equipmentTip.data;
      Ui.hideEquipmentTip();
      if (data) Ui.openItemDetail(data);
    });
    unequip.addEventListener('click', function (event) {
      if (event && event.stopPropagation) event.stopPropagation();
      const data = Ui.equipmentTip.data;
      const custom = Ui.equipmentTip.onAction;
      const loadoutId = Ui.equipmentTip.loadoutId || null;
      Ui.hideEquipmentTip();
      if (typeof custom === 'function') {
        custom(data);
        return;
      }
      if (!data) return;
      const payload = { slot: data.slot };
      if (loadoutId) payload.loadoutId = loadoutId;
      Ui.invokeCommand('unequipEquipment', payload);
    });
    document.addEventListener('click', function (event) {
      if (!Ui.equipmentTip.open) return;
      if (Ui.equipmentTip.root && Ui.equipmentTip.root.contains &&
          Ui.equipmentTip.root.contains(event.target)) {
        return;
      }
      Ui.hideEquipmentTip();
    });
    return Ui.equipmentTip;
  }

  function showEquippedEquipmentTip(itemLike, anchorElement, loadoutId) {
    hideItemTip();
    const data = equipmentInfo(itemLike);
    if (!data) return;
    const tip = ensureEquipmentTip();
    tip.loadoutId = loadoutId || null;
    tip.onAction = null;
    tip.refs.unequip.textContent = '卸下';
    tip.refs.detail.style.display = '';
    const qualityClass = uiQuality(data.quality);
    renderItemIcon(tip.refs.icon, data);
    tip.refs.name.textContent = data.name || data.baseName || '未知装备';
    tip.refs.quality.textContent =
      data.qualityName || Ui.QUALITY_LABELS[data.quality] || '普通';
    tip.refs.quality.className =
      'item-tip-quality q-' + qualityClass;
    tip.refs.meta.textContent =
      (Ui.EQUIPMENT_LABELS[data.slot] || data.slot || '装备') +
      (data.enhancementLevel > 0
        ? ' · 强化 +' + data.enhancementLevel
        : '');
    tip.refs.desc.textContent = (data.affixes || []).length
      ? data.affixes.slice(0, 3).map(function (affix) {
        return affix.text;
      }).join(' · ')
      : '暂无附加词条';
    tip.data = data;
    tip.root.style.display = 'block';
    tip.open = true;
    positionItemTip(tip.root, anchorElement);
  }

  function hideEquipmentTip() {
    if (!Ui.equipmentTip || !Ui.equipmentTip.root) return;
    Ui.equipmentTip.root.style.display = 'none';
    Ui.equipmentTip.open = false;
    Ui.equipmentTip.data = null;
    Ui.equipmentTip.loadoutId = null;
    Ui.equipmentTip.onAction = null;
  }

  function showQuickActionTip(itemLike, anchorElement, options) {
    const opts = options || {};
    hideItemTip();
    const data = itemLike && itemLike.instanceId
      ? (equipmentInfo(itemLike) || resolveItemTipData(itemLike))
      : resolveItemTipData(itemLike);
    if (!data) return;
    const tip = ensureEquipmentTip();
    tip.loadoutId = opts.loadoutId || null;
    tip.onAction = typeof opts.onAction === 'function' ? opts.onAction : null;
    tip.data = data;
    const qualityClass = uiQuality(data.quality || 'white');
    renderItemIcon(tip.refs.icon, data);
    tip.refs.name.textContent = data.name || data.itemId || '未知物品';
    tip.refs.quality.textContent =
      data.qualityName || Ui.QUALITY_LABELS[data.quality] || '普通';
    tip.refs.quality.className = 'item-tip-quality q-' + qualityClass;
    tip.refs.meta.textContent = opts.meta || itemTipMetaText(data) || '';
    tip.refs.desc.textContent = opts.desc || data.description ||
      ((data.affixes || []).length
        ? data.affixes.slice(0, 3).map(function (affix) {
          return affix.text;
        }).join(' · ')
        : '点击下方按钮进行操作');
    tip.refs.unequip.textContent = opts.actionLabel || '确认';
    tip.refs.detail.style.display = opts.hideDetail ? 'none' : '';
    tip.root.style.display = 'block';
    tip.open = true;
    positionItemTip(tip.root, anchorElement);
  }

  function attachItemTipTrigger(element, itemLike) {
    if (!element || !itemLike || !itemLike.itemId) return;
    element._itemTipData = itemLike;
    element.dataset.itemTipTrigger = '1';
    element.classList.add('item-tip-trigger');
    if (element._itemTipBound) return;
    element._itemTipBound = true;
    element.addEventListener('click', function (event) {
      if (event && event.preventDefault) event.preventDefault();
      if (event && event.stopPropagation) event.stopPropagation();
      showItemTip(element._itemTipData, element);
    });
  }

  function openInventoryItemAction(item) {
    hideItemTip();
    hideEquipmentTip();
    Ui.openItemDetail(resolveItemTipData(item));
  }

  function renderItemLine(rowEl, item, text) {
    const display = item && item.itemId
      ? resolveItemTipData(item)
      : item;
    rowEl.innerHTML = '';
    rowEl.classList.add('item-line');
    if (display && display.itemId) rowEl.classList.add('item-tip-trigger');
    renderItemIcon(Ui.el('span', 'item-line-icon', rowEl), display);
    Ui.el('span', 'item-line-text', rowEl, text);
    if (display && display.itemId) attachItemTipTrigger(rowEl, display);
  }

  // ── 物品详情弹窗 ──
  function buildItemDetail(m) {
    const a = Ui.api();
    const modal = Ui.el('div', 'modal', m.root);
    const close = Ui.el('button', 'modal-close', modal, '×');
    close.addEventListener('click', Ui.closeItemDetail);
    const body = Ui.el('div', 'modal-body item-detail-body', modal);
    const head = Ui.el('div', 'item-detail-head', body);
    const iconBig = Ui.el('div', 'item-icon-big', head, '');
    const titleWrap = Ui.el('div', 'item-title-wrap', head);
    const nameEl = Ui.el('div', 'item-detail-name', titleWrap, '');
    const subEl = Ui.el('div', 'item-detail-sub', titleWrap, '');
    const qualityEl = Ui.el('div', 'item-quality', titleWrap, '');
    const descEl = Ui.el('div', 'item-desc', body, '');
    const metaEl = Ui.el('div', 'item-meta', body, '');
    const equipmentRoot = Ui.el(
      'div',
      'equipment-detail-content',
      body
    );
    equipmentRoot.style.display = 'none';
    const equipmentStats = Ui.el(
      'div',
      'equipment-stat-grid',
      equipmentRoot
    );
    const equipmentComparison = Ui.el(
      'div',
      'equipment-comparison',
      equipmentRoot
    );
    const equipmentAffixes = Ui.el(
      'div',
      'equipment-affix-list',
      equipmentRoot
    );
    const protectLabel = Ui.el(
      'label',
      'equipment-protect-option',
      equipmentRoot
    );
    const protectToggle = Ui.el('input', '', protectLabel);
    protectToggle.type = 'checkbox';
    Ui.el(
      'span',
      '',
      protectLabel,
      '使用护符，提高本次强化成功率'
    );
    const equipmentActions = Ui.el(
      'div',
      'equipment-action-grid',
      equipmentRoot
    );
    const equipBtn = Ui.el(
      'button',
      'item-btn use equipment-action-equip',
      equipmentActions,
      '装备'
    );
    const enhanceBtn = Ui.el(
      'button',
      'item-btn use equipment-action-enhance',
      equipmentActions,
      '强化'
    );
    const reforgeBtn = Ui.el(
      'button',
      'item-btn use equipment-action-reforge',
      equipmentActions,
      '重铸'
    );
    const favoriteBtn = Ui.el(
      'button',
      'item-btn equipment-action-favorite',
      equipmentActions,
      '收藏'
    );
    const sellEquipmentBtn = Ui.el(
      'button',
      'item-btn sell equipment-action-sell',
      equipmentActions,
      '出售'
    );
    const salvageBtn = Ui.el(
      'button',
      'item-btn sell equipment-action-salvage',
      equipmentActions,
      '分解'
    );
    const actions = Ui.el('div', 'item-actions', body);
    const sellBtn = Ui.el('button', 'item-btn sell', actions, '出售');
    const useBtn = Ui.el('button', 'item-btn use', actions, '使用');
    m.refs = {
      iconBig: iconBig,
      nameEl: nameEl,
      subEl: subEl,
      qualityEl: qualityEl,
      descEl: descEl,
      metaEl: metaEl,
      equipmentRoot: equipmentRoot,
      equipmentStats: equipmentStats,
      equipmentComparison: equipmentComparison,
      equipmentAffixes: equipmentAffixes,
      protectToggle: protectToggle,
      equipmentActions: equipmentActions,
      equipBtn: equipBtn,
      enhanceBtn: enhanceBtn,
      reforgeBtn: reforgeBtn,
      favoriteBtn: favoriteBtn,
      sellEquipmentBtn: sellEquipmentBtn,
      salvageBtn: salvageBtn,
      stackActions: actions,
      sellBtn: sellBtn,
      useBtn: useBtn
    };
  }

  function equipmentStatValue(stat, value, signed) {
    const percentStats = {
      critChance: true,
      critDamage: true,
      actionIntervalTicks: true,
      damageReduction: true,
      healingPower: true,
      healingTaken: true,
      shieldPower: true,
      controlAccuracy: true,
      controlResistance: true,
      ailmentPower: true,
      ailmentResistance: true
    };
    const numeric = Number(value) || 0;
    const formatted = percentStats[stat]
      ? Math.round(numeric * 1000) / 10 + '%'
      : String(Math.round(numeric * 100) / 100);
    if (!signed || numeric < 0 || formatted.charAt(0) === '-') {
      return formatted;
    }
    return '+' + formatted;
  }

  function setEquipmentActionState(button, enabled) {
    button.disabled = !enabled;
    button.classList.toggle('disabled', !enabled);
  }

  function refreshEquipmentDetail(instanceId) {
    const detail = equipmentInfo({ instanceId: instanceId });
    if (detail && Ui.modals.itemDetail &&
        Ui.modals.itemDetail.root.style.display !== 'none') {
      Ui.updateItemDetail(Ui.modals.itemDetail, detail);
    }
  }

  function equipmentAction(
    m,
    commandName,
    input,
    instanceId,
    closeOnSuccess
  ) {
    const result = Ui.invokeCommand(commandName, input);
    if (!result || !result.ok) return;
    if (closeOnSuccess) {
      Ui.closeItemDetail();
      return;
    }
    refreshEquipmentDetail(instanceId);
  }

  function updateEquipmentDetail(m, item) {
    const r = m.refs;
    const data = equipmentInfo(item) || item;
    const permissions = data.permissions || {};
    r.stackActions.style.display = 'none';
    r.equipmentRoot.style.display = 'flex';
    renderItemIcon(r.iconBig, data, { large: true });
    r.nameEl.textContent = data.name || data.baseName || '未知装备';
    r.subEl.textContent =
      (Ui.EQUIPMENT_LABELS[data.slot] || data.slot || '装备') +
      ' · ' + (data.realmBand || '未知境界');
    const quality = data.quality || 'common';
    r.qualityEl.textContent =
      data.qualityName || Ui.QUALITY_LABELS[quality] || '普通';
    r.qualityEl.className =
      'item-quality q-' + uiQuality(quality);
    r.descEl.textContent = data.description ||
      '随机词条装备，仅在战斗中生效。';
    r.metaEl.innerHTML = '';
    Ui.el(
      'div',
      'item-meta-row',
      r.metaEl,
      '强化 +' + (Number(data.enhancementLevel) || 0) +
        ' / +15 · 保底进度 ' + (Number(data.enhancementPity) || 0)
    );
    Ui.el(
      'div',
      'item-meta-row',
      r.metaEl,
      data.favorite ? '★ 已收藏' : '未收藏'
    );
    if (Array.isArray(data.references) && data.references.length) {
      Ui.el(
        'div',
        'item-meta-row',
        r.metaEl,
        '已装备于 ' + data.references.map(function (reference) {
          return reference.loadoutName || reference.loadoutId;
        }).join('、')
      );
    }

    r.equipmentStats.innerHTML = '';
    const stats = [];
    Object.keys(data.flat || {}).forEach(function (stat) {
      stats.push({
        stat: stat,
        value: data.flat[stat],
        percent: false
      });
    });
    Object.keys(data.percent || {}).forEach(function (stat) {
      stats.push({
        stat: stat,
        value: data.percent[stat],
        percent: true
      });
    });
    stats.forEach(function (entry) {
      const row = Ui.el('div', 'equipment-stat-row', r.equipmentStats);
      Ui.el(
        'span',
        'equipment-stat-name',
        row,
        Ui.COMBAT_STAT_LABELS[entry.stat] || entry.stat
      );
      Ui.el(
        'span',
        'equipment-stat-value',
        row,
        entry.percent
          ? '+' + (Math.round(entry.value * 1000) / 10) + '%'
          : equipmentStatValue(entry.stat, entry.value, true)
      );
    });

    r.equipmentComparison.innerHTML = '';
    const comparison = data.comparison || {};
    const comparisonRows = [];
    Object.keys(comparison.flat || {}).forEach(function (stat) {
      comparisonRows.push({
        stat: stat,
        value: comparison.flat[stat],
        percent: false
      });
    });
    Object.keys(comparison.percent || {}).forEach(function (stat) {
      comparisonRows.push({
        stat: stat,
        value: comparison.percent[stat],
        percent: true
      });
    });
    if (comparisonRows.length) {
      Ui.el(
        'div',
        'equipment-section-title',
        r.equipmentComparison,
        comparison.currentName
          ? '替换「' + comparison.currentName + '」后'
          : '装备后提升'
      );
      comparisonRows.forEach(function (entry) {
        const value = Number(entry.value) || 0;
        const row = Ui.el(
          'div',
          'equipment-comparison-row ' +
            (value >= 0 ? 'positive' : 'negative'),
          r.equipmentComparison
        );
        Ui.el(
          'span',
          '',
          row,
          Ui.COMBAT_STAT_LABELS[entry.stat] || entry.stat
        );
        Ui.el(
          'span',
          '',
          row,
          entry.percent
            ? equipmentStatValue(entry.stat, value, true)
            : equipmentStatValue(entry.stat, value, true)
        );
      });
    }

    r.equipmentAffixes.innerHTML = '';
    Ui.el(
      'div',
      'equipment-section-title',
      r.equipmentAffixes,
      '随机词条 · 点击一条可在重铸时锁定'
    );
    const affixes = Array.isArray(data.affixes) ? data.affixes : [];
    if (!affixes.length) {
      Ui.el(
        'div',
        'equipment-affix-empty',
        r.equipmentAffixes,
        '该品质没有附加词条'
      );
    }
    if (!Number.isSafeInteger(m.lockedAffixIndex) ||
        m.lockedAffixIndex >= affixes.length) {
      m.lockedAffixIndex = null;
    }
    affixes.forEach(function (affix, index) {
      const row = Ui.el(
        'button',
        'equipment-affix-row' +
          (m.lockedAffixIndex === index ? ' locked' : ''),
        r.equipmentAffixes
      );
      row.type = 'button';
      Ui.el('span', 'equipment-affix-tier', row, 'T' + affix.tier);
      Ui.el('span', 'equipment-affix-text', row, affix.text || affix.name);
      row.addEventListener('click', function () {
        m.lockedAffixIndex =
          m.lockedAffixIndex === index ? null : index;
        updateEquipmentDetail(m, data);
      });
    });

    const instanceId = data.instanceId;
    const equippedHere = Array.isArray(data.references) &&
      data.references.some(function (reference) {
        return reference.slot === data.slot;
      });
    r.equipBtn.textContent = equippedHere
      ? '已装备'
      : '装备到' + (Ui.EQUIPMENT_LABELS[data.slot] || '栏位');
    setEquipmentActionState(
      r.equipBtn,
      permissions.canEquip !== false && !equippedHere
    );
    r.equipBtn.onclick = function () {
      equipmentAction(
        m,
        'equipEquipment',
        { instanceId: instanceId },
        instanceId,
        false
      );
    };

    const nextLevel = (Number(data.enhancementLevel) || 0) + 1;
    const materialCost = Math.max(1, Math.ceil(nextLevel / 3));
    r.enhanceBtn.textContent =
      '强化 +' + nextLevel + '（铁矿×' + materialCost + '）';
    setEquipmentActionState(
      r.enhanceBtn,
      permissions.canEnhance !== false &&
        (Number(data.enhancementLevel) || 0) < 15
    );
    r.enhanceBtn.onclick = function () {
      equipmentAction(
        m,
        'enhanceEquipment',
        {
          instanceId: instanceId,
          useProtection: !!r.protectToggle.checked
        },
        instanceId,
        false
      );
    };

    r.reforgeBtn.textContent = m.lockedAffixIndex === null
      ? '重铸全部词条'
      : '锁定 1 条并重铸';
    setEquipmentActionState(
      r.reforgeBtn,
      permissions.canReforge !== false && affixes.length > 0
    );
    r.reforgeBtn.onclick = function () {
      const input = { instanceId: instanceId };
      if (m.lockedAffixIndex !== null) {
        input.lockedAffixIndex = m.lockedAffixIndex;
      }
      equipmentAction(
        m,
        'reforgeEquipment',
        input,
        instanceId,
        false
      );
    };

    r.favoriteBtn.textContent = data.favorite ? '取消收藏' : '收藏';
    setEquipmentActionState(r.favoriteBtn, true);
    r.favoriteBtn.onclick = function () {
      equipmentAction(
        m,
        'setEquipmentFavorite',
        { instanceId: instanceId, favorite: !data.favorite },
        instanceId,
        false
      );
    };

    r.sellEquipmentBtn.textContent = '出售装备';
    setEquipmentActionState(
      r.sellEquipmentBtn,
      permissions.canSell !== false
    );
    r.sellEquipmentBtn.onclick = function () {
      equipmentAction(
        m,
        'sellEquipment',
        { instanceId: instanceId },
        instanceId,
        true
      );
    };

    r.salvageBtn.textContent = '分解为铁矿';
    setEquipmentActionState(
      r.salvageBtn,
      permissions.canSalvage !== false
    );
    r.salvageBtn.onclick = function () {
      equipmentAction(
        m,
        'salvageEquipment',
        { instanceIds: [instanceId] },
        instanceId,
        true
      );
    };
  }

  function updateItemDetail(m, item) {
    const r = m.refs;
    if (item && item.instanceId) {
      updateEquipmentDetail(m, item);
      return;
    }
    m.lockedAffixIndex = null;
    r.stackActions.style.display = 'flex';
    r.equipmentRoot.style.display = 'none';
    renderItemIcon(r.iconBig, item, { large: true });
    r.nameEl.textContent = item.name;
    const catLabel = Ui.CATEGORY_LABELS[item.category] || item.category;
    r.subEl.textContent = item.sellValue > 0
      ? catLabel + ' · 售价 ' + item.sellValue + ' 灵石'
      : catLabel;
    const quality = item.quality || 'white';
    const qLabel = Ui.QUALITY_LABELS[quality] || '普通';
    r.qualityEl.textContent = qLabel;
    r.qualityEl.className = 'item-quality q-' + uiQuality(quality);
    r.descEl.textContent = item.description || '暂无说明。';
    r.metaEl.innerHTML = '';
    Ui.el(
      'div',
      'item-meta-row',
      r.metaEl,
      '持有 ' + item.quantity + ' · 可用 ' + item.available
    );
    Ui.el(
      'div',
      'item-meta-row',
      r.metaEl,
      item.bound > 0 ? '已绑定 ' + item.bound + ' 件' : '未绑定'
    );

    const canSell = item.sellValue > 0 && item.available > 0;
    r.sellBtn.disabled = !canSell;
    r.sellBtn.classList.toggle('disabled', !canSell);
    r.sellBtn.textContent = canSell
      ? ('出售 +' + item.sellValue + ' 灵石')
      : '不可出售';
    r.sellBtn.onclick = function () {
      if (!canSell) return;
      Ui.invokeCommand('sellItem', { itemId: item.itemId, quantity: 1 });
      Ui.closeItemDetail();
    };

    const useLabel =
      item.category === 'technique' ? '研读'
        : item.category === 'equipment' ? '装备'
          : item.category === 'consumable' ? '使用'
            : '使用';
    r.useBtn.textContent = useLabel;
    r.useBtn.onclick = function () {
      Ui.invokeCommand('useItem', { itemId: item.itemId, quantity: 1 });
      Ui.closeItemDetail();
    };
  }

  function openItemDetail(item) {
    const m = Ui.modals.itemDetail;
    if (!m.built) {
      buildItemDetail(m);
      m.built = true;
    }
    m.lockedAffixIndex = null;
    m.root.style.display = 'flex';
    updateItemDetail(m, item);
  }

  function closeItemDetail() {
    const m = Ui.modals.itemDetail;
    if (m) m.root.style.display = 'none';
  }

  // ── 背包横向拖动滑动（桌面/移动通用）──
  function enableDragScroll(container) {
    let down = false, startX = 0, startScroll = 0, moved = false;
    container.addEventListener('pointerdown', function (e) {
      if (e.button > 0) return; // 仅左键/触摸
      down = true; moved = false;
      startX = e.clientX; startScroll = container.scrollLeft;
    });
    container.addEventListener('pointermove', function (e) {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      if (moved) container.scrollLeft = startScroll - dx;
    });
    function end() {
      if (!down) return;
      down = false;
      // 拖动结束后延迟复位，确保本次 click 仍被拦截（避免误触页签）
      if (moved) setTimeout(function () { moved = false; }, 0);
    }
    container.addEventListener('pointerup', end);
    container.addEventListener('pointerleave', end);
    container.addEventListener('pointercancel', end);
    // 仅当发生过拖动才吞掉 click；纯净点击照常派发给页签
    container.addEventListener('click', function (e) {
      if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; }
    }, true);
  }

  // ── 拓展背包弹窗 ──
  function buildExpandModal(m) {
    const modal = Ui.el('div', 'modal expand-modal', m.root);
    const close = Ui.el('button', 'modal-close', modal, '×');
    close.addEventListener('click', Ui.closeExpandModal);
    const body = Ui.el('div', 'modal-body', modal);
    Ui.el('div', 'modal-title', body, '拓展背包');
    m.refs = {
      capEl: Ui.el('div', 'expand-cap', body, ''),
      list: Ui.el('div', 'expand-list', body, '')
    };
    m.options = [
      { amount: 10, cost: 50 },
      { amount: 20, cost: 100 }
    ];
  }

  function updateExpandModal(m) {
    const a = Ui.api();
    const inv = a.queries.inventory({ category: 'all' });
    const top = a.queries.top();
    const lingshi = (top && top.pills && top.pills.lingshi) || 0;
    m.refs.capEl.textContent = '当前容量 ' + inv.capacity + ' 格';
    m.refs.list.innerHTML = '';
    m.options.forEach(function (opt) {
      const row = Ui.el('div', 'expand-row', m.refs.list);
      Ui.el('div', 'expand-info', row,
        '+' + opt.amount + ' 格 · 消耗 ' + opt.cost + ' 灵石');
      const btn = Ui.el('button', 'inv-toolbtn primary expand-do', row, '拓展');
      const affordable = lingshi >= opt.cost;
      btn.disabled = !affordable;
      btn.classList.toggle('disabled', !affordable);
      btn.addEventListener('click', function () {
        const res = Ui.invokeCommand('expandInventory', {
          amount: opt.amount,
          cost: opt.cost
        });
        if (res && res.ok) {
          updateExpandModal(m);
          refreshInventoryView();
        }
      });
    });
  }

  function openExpandModal() {
    const m = Ui.modals.expand;
    if (!m.built) { buildExpandModal(m); m.built = true; }
    m.root.style.display = 'flex';
    updateExpandModal(m);
  }

  function closeExpandModal() {
    const m = Ui.modals.expand;
    if (m) m.root.style.display = 'none';
  }

  function productionTopology(info) {
    return JSON.stringify({
      skillId: info.skillId,
      recipes: info.recipes.map(function (recipe) {
        return {
          recipeId: recipe.recipeId,
          actionKey: recipe.actionKey,
          costs: recipe.costs.map(function (cost) {
            return cost.itemId;
          }),
          choices: recipe.choiceCosts.map(function (choice) {
            return choice.options.map(function (option) {
              return option.itemId;
            });
          }),
          outputId: recipe.output.itemId
        };
      })
    });
  }

  function recipeNeedsMaterials(recipe) {
    if (!recipe.unlocked) return false;
    if (recipe.costAvailable === false) return true;
    let missing = false;
    (recipe.costs || []).forEach(function (cost) {
      if (!cost.available) missing = true;
    });
    (recipe.choiceCosts || []).forEach(function (choice) {
      if (!choice.available) missing = true;
    });
    return missing;
  }

  function updateProductionCard(ref, recipe, navTitle) {
    const unlocked = !!recipe.unlocked;
    const missing = unlocked && recipeNeedsMaterials(recipe);
    const skillXp = Number(recipe.skillXp) || 0;
    const masteryXp = Number(recipe.masteryXp) || 0;
    ref.cardEl.classList.toggle('locked', !unlocked);
    ref.cardEl.classList.toggle('needs-mat', missing);
    ref.cardEl.classList.toggle('active', !!recipe.active);
    ref.badgeEl.textContent = unlocked
      ? (missing ? '缺' : '制')
      : '锁';
    ref.badgeEl.className =
      'tile-badge' +
      (unlocked
        ? (missing ? ' badge-warn' : ' badge-craft')
        : ' badge-lock');
    Ui.setTileIcon(
      ref.iconEl,
      recipe.output,
      (recipe.name || '丹').charAt(0)
    );
    ref.titleEl.textContent = recipe.name;
    Ui.updateSkillActionTileMeta(ref, '');
    Ui.updateSkillActionTileCountBadge(ref, null);
    Ui.updateSkillActionTileRewards(ref, {
      skillXp: skillXp,
      masteryXp: masteryXp,
      locked: !unlocked,
      unlockLevel: recipe.unlockLevel,
      skillTitle: '技能经验 +' + skillXp,
      masteryTitle: '配方精通经验 +' + masteryXp
    });
    Ui.updateSkillActionTileProgress(ref, {
      unlocked: unlocked,
      active: recipe.active,
      stalled: recipe.stalled,
      progress: recipe.progress,
      durationSeconds: recipe.durationSeconds
    });
    Ui.wireSkillTileOpen(ref.cardEl, function () {
      Ui.openSkillActionModal({
        kind: 'recipe',
        id: recipe.recipeId,
        nav: navTitle
      });
    });
  }

  function buildReserve(c, className, title, text) {
    const card = Ui.el('div', 'card reserve-card ' + className, c);
    Ui.el('div', 'card-title', card, title);
    Ui.el('div', 'muted', card, text);
  }


  function buildInheritanceHall(c) {
    if (!Ui.api().queries.inheritanceHall) {
      buildReserve(
        c,
        'reserve-inheritance',
        '传承殿',
        '将在传承阶段开放'
      );
      return;
    }
    const refs = Ui.contentState.refs;
    refs.inheritanceTabs = Ui.el('div', 'inheritance-tabs', c);
    refs.inheritanceHost = Ui.el('div', 'inheritance-host', c);
    refs.inheritanceSignature = null;
    Ui.INHERITANCE_SECTIONS.forEach(function (entry) {
      const button = Ui.el(
        'button',
        'inheritance-tab',
        refs.inheritanceTabs,
        entry[1]
      );
      button.addEventListener('click', function () {
        Ui.inheritanceUiState.section = entry[0];
        refs.inheritanceSignature = null;
        Ui.renderInheritanceHall();
      });
    });
    Ui.renderInheritanceHall();
  }

  function liveInheritanceHall() {
    Ui.renderInheritanceHall();
  }

  function renderLifespanCard(parent, lifespan) {
    const card = Ui.el('div', 'card lifespan-card', parent);
    Ui.el('div', 'card-title', card, '本世寿元');
    const remaining = lifespan && lifespan.remainingYears != null
      ? Math.max(0, Math.floor(Number(lifespan.remainingYears)))
      : 0;
    Ui.el(
      'div',
      'lifespan-value',
      card,
      '年龄 ' + (lifespan.ageYears || 0) + ' 岁 · 剩余 ' +
        remaining + '/' +
        (lifespan.maximumYears || 0) + ' 年寿元'
    );
    if (lifespan.status === 'safety_buffer') {
      Ui.el(
        'div',
        'buffer-warning',
        card,
        '已进入寿元安全缓冲，请完成传承或创建新身份。'
      );
    } else if (lifespan.status === 'transition_pending') {
      Ui.el('div', 'buffer-warning', card, '人生转换正在等待你的选择。');
    } else {
      Ui.el(
        'div',
        'muted',
        card,
        '寿元将尽前会进入安全缓冲，期间不会丢失本世记录。'
      );
    }
  }

  function parseInheritanceIds(value) {
    const seen = {};
    return String(value || '').split(/[,，\s]+/).map(function (id) {
      return id.trim();
    }).filter(function (id) {
      if (!id || seen[id]) return false;
      seen[id] = true;
      return true;
    });
  }

  function renderInheritancePlan(parent, view) {
    const card = Ui.el('div', 'card inheritance-plan', parent);
    Ui.el('div', 'card-title', card, '传承方案');
    Ui.el(
      'div',
      'muted',
      card,
      '填写条目 ID，以逗号分隔；一级传承殿只保存当前基础名额。'
    );
    const fields = {};
    [
      ['fullMasteryIds', '完整精通', '项'],
      ['techniqueIds', '功法', '部'],
      ['equipmentItemIds', '装备', '件'],
      ['resourceItemIds', '资源种类', '类']
    ].forEach(function (definition) {
      const row = Ui.el('label', 'inheritance-plan-row', card);
      Ui.el(
        'span',
        'inheritance-plan-label',
        row,
        definition[1] + '（最多 ' +
          (view.overview.limits[definition[0]] || 0) +
          definition[2] + '）'
      );
      const input = Ui.el('input', 'inheritance-plan-input', row);
      input.type = 'text';
      input.placeholder = '以逗号分隔';
      input.value = (view.plan[definition[0]] || []).join(', ');
      fields[definition[0]] = input;
    });
    const save = Ui.el(
      'button',
      'big-btn inheritance-plan-save',
      card,
      '保存方案'
    );
    save.addEventListener('click', function () {
      Ui.invokeCommand('setInheritancePlan', {
        fullMasteryIds: parseInheritanceIds(fields.fullMasteryIds.value),
        techniqueIds: parseInheritanceIds(fields.techniqueIds.value),
        equipmentItemIds: parseInheritanceIds(
          fields.equipmentItemIds.value
        ),
        resourceItemIds: parseInheritanceIds(fields.resourceItemIds.value)
      });
    });
  }

  function renderDescendants(parent, descendants) {
    if (!descendants.length) {
      Ui.el('div', 'placeholder', parent, '尚无后代记录');
      return;
    }
    const grid = Ui.el('div', 'descendant-list', parent);
    descendants.forEach(function (person) {
      const card = Ui.el('div', 'card descendant-card', grid);
      Ui.el('div', 'card-title', card, person.name);
      Ui.el(
        'div',
        'descendant-meta',
        card,
        (person.ageYears || 0) + ' 岁 · ' +
          (Ui.LIFE_STAGE_LABELS[person.lifeStage] || person.lifeStage)
      );
      Ui.el(
        'div',
        person.heirEligible ? 'heir-eligible' : 'muted',
        card,
        person.heirEligible ? '可继承本世传承' : '目前不可继承'
      );
    });
  }

  function renderCompletedLives(parent, lives) {
    if (!lives.length) {
      Ui.el('div', 'placeholder', parent, '本世尚未结束，暂无历代记录');
      return;
    }
    lives.slice().reverse().forEach(function (life) {
      const card = Ui.el('div', 'card legacy-preview', parent);
      const name = life.identity && life.identity.name
        ? life.identity.name
        : '未名旧世';
      Ui.el(
        'div',
        'card-title',
        card,
        '第 ' + (life.generation || 1) + ' 世 · ' + name
      );
      Ui.el(
        'div',
        'muted',
        card,
        '结局：' +
          (life.outcome === 'handover' ? '后代接续' : '进入轮回') +
          ' · 结束时境界阶段 ' + (life.realmStage || 0)
      );
    });
  }

  // 寿元是连续浮点，每帧都在变；签名必须用整数年，否则整页重绘会拆掉按钮导致“点了没反应”。
  function inheritanceHallSignature(view) {
    if (!view) return 'null';
    const life = view.lifespan || {};
    const remaining = life.remainingYears;
    return JSON.stringify({
      implemented: view.implemented,
      section: view.section,
      overview: view.overview,
      plan: view.plan,
      descendants: view.descendants,
      rituals: view.rituals,
      lives: view.lives,
      lifespan: {
        ageYears: life.ageYears,
        remainingYears: remaining == null
          ? null
          : Math.floor(Number(remaining)),
        maximumYears: life.maximumYears,
        status: life.status
      }
    });
  }

  function renderInheritanceHall() {
    const refs = Ui.contentState.refs;
    if (!refs.inheritanceHost || !Ui.api().queries.inheritanceHall) return;
    const view = Ui.api().queries.inheritanceHall({
      section: Ui.inheritanceUiState.section
    });
    const signature = inheritanceHallSignature(view);
    if (signature === refs.inheritanceSignature) return;
    refs.inheritanceSignature = signature;
    Array.prototype.forEach.call(
      refs.inheritanceTabs.children,
      function (button, index) {
        button.classList.toggle(
          'active',
          Ui.INHERITANCE_SECTIONS[index][0] === Ui.inheritanceUiState.section
        );
      }
    );
    refs.inheritanceHost.innerHTML = '';
    if (!view || !view.implemented) {
      buildReserve(
        refs.inheritanceHost,
        'reserve-inheritance',
        '传承殿',
        '当前存档尚未启用传承殿'
      );
      return;
    }
    renderLifespanCard(refs.inheritanceHost, view.lifespan);
    if (Ui.inheritanceUiState.section === 'plan') {
      renderInheritancePlan(refs.inheritanceHost, view);
    } else if (Ui.inheritanceUiState.section === 'descendants') {
      renderDescendants(refs.inheritanceHost, view.descendants || []);
    } else if (Ui.inheritanceUiState.section === 'lives') {
      renderCompletedLives(refs.inheritanceHost, view.lives || []);
    } else {
      const summary = Ui.el('div', 'card legacy-preview', refs.inheritanceHost);
      Ui.el('div', 'card-title', summary, '一级传承殿');
      Ui.el(
        'div',
        'muted',
        summary,
        '后代 ' + (view.overview.descendantCount || 0) +
          ' 人 · 已完成 ' + (view.overview.completedLifeCount || 0) +
          ' 段人生'
      );
      const legacy = Ui.api().queries.legacyTransition
        ? Ui.api().queries.legacyTransition()
        : null;
      if (legacy && legacy.pending) {
        Ui.el(
          'div',
          'buffer-warning',
          summary,
          '人生转换进行中：请在弹出的窗口里确认新身份或选择继承人。'
        );
        const open = Ui.el(
          'button',
          'big-btn legacy-start',
          summary,
          '继续完成人生转换'
        );
        open.addEventListener('click', function () {
          // 已有 pending：直接打开弹窗，勿再调 begin（会 already_pending 空转）。
          Ui.toggleModal(
            'legacy',
            true,
            Ui.buildLegacyTransition,
            Ui.updateLegacyTransition
          );
        });
      } else {
        const start = Ui.el(
          'button',
          'big-btn legacy-start',
          summary,
          '主动开始人生转换'
        );
        start.addEventListener('click', function () {
          Ui.invokeCommand('beginLegacyTransition', { cause: 'voluntary' });
        });
      }
    }
  }


  Ui.buildHome = buildHome;
  Ui.liveHome = liveHome;
  Ui.renderCaveModule = renderCaveModule;
  Ui.buildCaveGrid = buildCaveGrid;
  Ui.liveCaveModule = liveCaveModule;
  Ui.farmStructure = farmStructure;
  Ui.farmUnlockedCrops = farmUnlockedCrops;
  Ui.farmCropById = farmCropById;
  Ui.farmCssToken = farmCssToken;
  Ui.farmCropKindClass = farmCropKindClass;
  Ui.farmPlotState = farmPlotState;
  Ui.farmVisualCropId = farmVisualCropId;
  Ui.farmVisualCropName = farmVisualCropName;
  Ui.farmCropIcon = farmCropIcon;
  Ui.farmSeedIcon = farmSeedIcon;
  Ui.farmFieldIcon = farmFieldIcon;
  Ui.fmtDurShort = fmtDurShort;
  Ui.farmFieldStatus = farmFieldStatus;
  Ui.farmProgressLabel = farmProgressLabel;
  Ui.farmFieldProgress = farmFieldProgress;
  Ui.buildFarmField = buildFarmField;
  Ui.farmEmptyPlots = farmEmptyPlots;
  Ui.farmSelectedCropId = farmSelectedCropId;
  Ui.setFarmCropSelection = setFarmCropSelection;
  Ui.farmPlannedAssignments = farmPlannedAssignments;
  Ui.farmPlanStatus = farmPlanStatus;
  Ui.openFarmPlotModal = openFarmPlotModal;
  Ui.closeFarmPlotModal = closeFarmPlotModal;
  Ui.buildFarm = buildFarm;
  Ui.farmSelectedPlotContext = farmSelectedPlotContext;
  Ui.farmPlotModalSignature = farmPlotModalSignature;
  Ui.buildFarmPlotModal = buildFarmPlotModal;
  Ui.updateFarmPlotModal = updateFarmPlotModal;
  Ui.syncFarmPlotModal = syncFarmPlotModal;
  Ui.buildFarmPlotDetail = buildFarmPlotDetail;
  Ui.updatePlot = updatePlot;
  Ui.liveFarm = liveFarm;
  Ui.formationStructure = formationStructure;
  Ui.buildFormations = buildFormations;
  Ui.liveFormations = liveFormations;
  Ui.beastStructure = beastStructure;
  Ui.buildBeasts = buildBeasts;
  Ui.liveBeasts = liveBeasts;
  Ui.buildInventory = buildInventory;
  Ui.uiQuality = uiQuality;
  Ui.activeEquipmentPlan = activeEquipmentPlan;
  Ui.equipmentInfo = equipmentInfo;
  Ui.refreshEquipmentDock = refreshEquipmentDock;
  Ui.refreshInventoryView = refreshInventoryView;
  Ui.tidyInventory = tidyInventory;
  Ui.liveInventory = liveInventory;
  Ui.resolveItemTipData = resolveItemTipData;
  Ui.itemIconFallback = itemIconFallback;
  Ui.itemIconSource = itemIconSource;
  Ui.renderItemIcon = renderItemIcon;
  Ui.ensureItemTip = ensureItemTip;
  Ui.itemTipMetaText = itemTipMetaText;
  Ui.positionItemTip = positionItemTip;
  Ui.showItemTip = showItemTip;
  Ui.hideItemTip = hideItemTip;
  Ui.ensureEquipmentTip = ensureEquipmentTip;
  Ui.showEquippedEquipmentTip = showEquippedEquipmentTip;
  Ui.showQuickActionTip = showQuickActionTip;
  Ui.hideEquipmentTip = hideEquipmentTip;
  Ui.attachItemTipTrigger = attachItemTipTrigger;
  Ui.openInventoryItemAction = openInventoryItemAction;
  Ui.renderItemLine = renderItemLine;
  Ui.buildItemDetail = buildItemDetail;
  Ui.equipmentStatValue = equipmentStatValue;
  Ui.setEquipmentActionState = setEquipmentActionState;
  Ui.refreshEquipmentDetail = refreshEquipmentDetail;
  Ui.equipmentAction = equipmentAction;
  Ui.updateEquipmentDetail = updateEquipmentDetail;
  Ui.updateItemDetail = updateItemDetail;
  Ui.openItemDetail = openItemDetail;
  Ui.closeItemDetail = closeItemDetail;
  Ui.enableDragScroll = enableDragScroll;
  Ui.buildExpandModal = buildExpandModal;
  Ui.updateExpandModal = updateExpandModal;
  Ui.openExpandModal = openExpandModal;
  Ui.closeExpandModal = closeExpandModal;
  Ui.productionTopology = productionTopology;
  Ui.recipeNeedsMaterials = recipeNeedsMaterials;
  Ui.updateProductionCard = updateProductionCard;
  Ui.buildReserve = buildReserve;
  Ui.buildInheritanceHall = buildInheritanceHall;
  Ui.liveInheritanceHall = liveInheritanceHall;
  Ui.renderLifespanCard = renderLifespanCard;
  Ui.parseInheritanceIds = parseInheritanceIds;
  Ui.renderInheritancePlan = renderInheritancePlan;
  Ui.renderDescendants = renderDescendants;
  Ui.renderCompletedLives = renderCompletedLives;
  Ui.inheritanceHallSignature = inheritanceHallSignature;
  Ui.renderInheritanceHall = renderInheritanceHall;

  Ui.registerPage('home', { build: function (nav, host) { buildHome(host); }, live: function () { liveHome(); } });
  Ui.registerPage('inventory', { build: function (nav, host) { buildInventory(host); }, live: function () { liveInventory(); } });

})();
