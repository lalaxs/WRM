'use strict';

const queries = Object.freeze({
  app: queryApp,
  navigation: queryNavigation,
  top: queryTop,
  home: queryHome,
  inventory: queryInventory,
  itemInfo: queryItemInfo,
  equipmentInfo: queryEquipmentInfo,
  breakModal: queryBreakModal,
  skillPage: querySkillPage,
  gatherPage: queryGatherPage,
  homestead: queryHomestead,
  inheritanceHall: queryInheritanceHall,
  legacyTransition: queryLegacyTransition,
  charm: queryCharm,
  offline: queryOffline,
  settlingOffline: querySettlingOffline,
  events: queryEvents,
  calendar: queryCalendar,
  relationships: queryRelationships,
  combatParty: queryCombatParty,
  relationship: queryRelationship,
  social: querySocial,
  sects: querySects,
  sect: querySect,
  sectPavilion: querySectPavilion,
  world: queryWorld,
  persistence: queryPersistence,
  combat: queryCombat,
  combatLoadouts: queryCombatLoadouts,
  techniques: queryTechniques,
  breakthrough: queryBreakthrough
});

const commands = Object.freeze({
  randomizeAppearance: commandRandomizeAppearance,
  stepAppearance: commandStepAppearance,
  confirmCreate: commandConfirmCreate,
  saveAppearance: commandSaveAppearance,
  switchNav: commandSwitchNav,
  openBreak: commandOpenBreak,
  closeBreak: commandCloseBreak,
  closeLifespanBuffer: commandCloseLifespanBuffer,
  attemptBreak: commandAttemptBreak,
  startAction: commandStartAction,
  stopAction: commandStopAction,
  sellItem: commandSellItem,
  useItem: commandUseItem,
  expandInventory: commandExpandInventory,
  plant: commandPlant,
  plantAll: commandPlantAll,
  harvest: commandHarvest,
  equipFormation: commandEquipFormation,
  unequipFormation: commandUnequipFormation,
  setActiveBeast: commandSetActiveBeast,
  consumeTechniqueBook: commandConsumeTechniqueBook,
  createCombatLoadout: commandCreateCombatLoadout,
  renameCombatLoadout: commandRenameCombatLoadout,
  deleteCombatLoadout: commandDeleteCombatLoadout,
  setActiveCombatLoadout: commandSetActiveCombatLoadout,
  setEquipment: commandSetEquipment,
  equipEquipment: commandEquipEquipment,
  unequipEquipment: commandUnequipEquipment,
  enhanceEquipment: commandEnhanceEquipment,
  reforgeEquipment: commandReforgeEquipment,
  setEquipmentFavorite: commandSetEquipmentFavorite,
  sellEquipment: commandSellEquipment,
  salvageEquipment: commandSalvageEquipment,
  setSupply: commandSetSupply,
  setActiveTechnique: commandSetActiveTechnique,
  setPassiveTechnique: commandSetPassiveTechnique,
  claimCombatLoot: commandClaimCombatLoot,
  treatInjury: commandTreatInjury,
  attemptBreakthrough: commandAttemptBreakthrough,
  startSocial: commandStartSocial,
  travelToRegion: commandTravelToRegion,
  chooseEvent: commandChooseEvent,
  chooseSect: commandChooseSect,
  acceptSectMission: commandAcceptSectMission,
  refreshSectMissionBoard: commandRefreshSectMissionBoard,
  claimSectMission: commandClaimSectMission,
  advanceSectMission: commandAdvanceSectMission,
  startSectMissionCombat: commandStartSectMissionCombat,
  exchangeSectTechnique: commandExchangeSectTechnique,
  promoteSectDisciple: commandPromoteSectDisciple,
  setCombatCompanion: commandSetCombatCompanion,
  markEventSectionRead: commandMarkEventSectionRead,
  proposeLineageRitual: commandProposeLineageRitual,
  setInheritancePlan: commandSetInheritancePlan,
  beginLegacyTransition: commandBeginLegacyTransition,
  chooseLegacyRoute: commandChooseLegacyRoute,
  updateNewIdentityDraft: commandUpdateNewIdentityDraft,
  confirmLegacyTransition: commandConfirmLegacyTransition,
  cancelLegacyTransition: commandCancelLegacyTransition,
  acknowledgeOffline: commandAcknowledgeOffline,
  enterLegacyRebirth: commandEnterLegacyRebirth,
  retryPersistence: commandRetryPersistence
});

const renderApi = Object.freeze({
  drawCharacter,
  drawCharacterAppearance,
  randomNieParts
});

window.GameAPI = Object.freeze({
  queries,
  commands,
  render: renderApi
});

if (runtimeRoot &&
    runtimeRoot.window !== runtimeRoot &&
    runtimeRoot.__GAME_TEST_HARNESS_REQUEST__ === true) {
  runtimeRoot.__GameTestHarness = Object.freeze({
    ACTIONS,
    SKILL_PAGES,
    NAV,
    GATHERING_DATA,
    defaultPlayer,
    ensurePlayer,
    setCurrent,
    closeOffline,
    addSkillXp,
    skillXpNeed,
    resName,
    state,
    REALM_TABLE,
    breakthroughRate,
    tryBreakthrough,
    enterLunhui,
    confirmCreate,
    randomize,
    stepPart,
    navIndexOfAction,
    persist,
    save,
    queries: Object.freeze({
      persistence: getPersistenceStatus
    }),
    commands: Object.freeze({
      retryPersistence,
      stopAction: commandStopAction,
      startAction: commandStartAction
    }),
    gameRandom,
    simulationRuntime,
    getLastSimulationReport,
    getToastMessage: function () { return toastMsg; },
    getRegions: function () { return regions; },
    setShowBreak: function (value) { state.showBreak = value; },
    getShowBreak: function () { return state.showBreak; },
    __test: Object.freeze({
      snapshotModel: function () {
        return StateModel.fromRuntime(state, state.processedThroughMs);
      },
      replaceModel: function (model) {
        invalidateQueryModelCache();
        return StateModel.applyToRuntime(state, model);
      },
      advanceRuntime,
      advanceGameplay,
      advanceHidden,
      settleStartupOffline,
      acknowledgeOffline,
      runRuntimeFrame,
      handleVisibilityChange,
      flushLifecycle,
      publishGainTipsFromReport,
      recoverySnapshot: function () {
        return persistenceRecovery.testSnapshot();
      }
    })
  });
}
