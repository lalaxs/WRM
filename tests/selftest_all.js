'use strict';

const path = require('path');
const { spawnSync } = require('child_process');

const repoRoot = path.join(__dirname, '..');

const suites = [
  'selftest_team_combat_lexicon.js',
  'selftest_equipment_content.js',
  'selftest_equipment_domain.js',
  'selftest_equipment_inventory.js',
  'selftest_equipment_combat.js',
  'selftest_equipment_commands.js',
  'selftest_equipment_acquisition.js',
  'selftest_equipment_npc.js',
  'selftest_equipment_ui.js',
  'selftest_npc_combat_config.js',
  'selftest_combat_party.js',
  'selftest_team_combat_snapshot.js',
  'selftest_team_combat_engine.js',
  'selftest_team_combat_integration.js',
  'selftest_team_combat_ui.js',
  'selftest_foundation.js',
  'selftest_stage2_content.js',
  'selftest_stage3_content.js',
  'selftest_stage4_content.js',
  'selftest_stage2_state.js',
  'selftest_stage3_state.js',
  'selftest_stage4_state.js',
  'selftest_stage4_npc_generator.js',
  'selftest_stage4_roster.js',
  'selftest_stage4_relationships.js',
  'selftest_stage4_social.js',
  'selftest_stage4_event_engine.js',
  'selftest_stage4_event_content.js',
  'selftest_stage4_parallel_social.js',
  'selftest_stage4_npc_simulation.js',
  'selftest_stage4_sects.js',
  'selftest_stage4_event_schedule.js',
  'selftest_stage4_api.js',
  'selftest_stage4_ui.js',
  'selftest_stage5_baseline.js',
  'selftest_stage5_ui.js',
  'selftest_item_tips.js',
  'selftest_item_icon_transparency.js',
  'selftest_top_resource_icons.js',
  'selftest_herblore_parity_content.js',
  'selftest_material_system.js',
  'selftest_latest_material_outputs.js',
  'selftest_rune_potion_content.js',
  'selftest_legacy_content_cleanup.js',
  'selftest_potion_combat_supply.js',
  'selftest_stage3_loadouts.js',
  'selftest_stage3_techniques.js',
  'selftest_stage3_stats.js',
  'selftest_stage3_combat.js',
  'selftest_stage3_rewards.js',
  'selftest_stage3_dungeons.js',
  'selftest_combat_area_select.js',
  'selftest_enemy_portraits.js',
  'selftest_stage3_injury.js',
  'selftest_stage3_breakthrough.js',
  'selftest_stage3_simulation.js',
  'selftest_stage3_api.js',
  'selftest_stage2_progression.js',
  'selftest_stage2_inventory.js',
  'selftest_stage2_gathering.js',
  'selftest_stage2_fishing.js',
  'selftest_stage2_production.js',
  'selftest_stage2_farm.js',
  'selftest_stage2_formations.js',
  'selftest_stage2_beasts.js',
  'selftest_stage2_simulation.js',
  'selftest_stage2_api.js',
  'selftest_farm_bulk_ui.js',
  'selftest_simulation.js',
  'selftest_skillnet.js',
  'selftest_ui.js',
  'selftest_browser_fixture.js',
  'selftest_release.js',
  'selftest_release_sync.js',
  'selftest_h5_package.js'
];

function runAllSuites() {
  let failed = 0;
  for (const suite of suites) {
    const result = spawnSync(process.execPath, [path.join(__dirname, suite)], {
      cwd: repoRoot,
      encoding: 'utf8'
    });
    process.stdout.write(result.stdout || '');
    process.stderr.write(result.stderr || '');
    if (result.status !== 0) failed++;
  }
  if (failed) {
    console.error(
      '\n=== 全量自测失败：' + failed + ' 个测试文件未通过 ==='
    );
    return 1;
  }
  console.log('\n=== 全量自测通过 ===');
  return 0;
}

module.exports = Object.freeze({ runAllSuites });

if (require.main === module) {
  process.exitCode = runAllSuites();
}
