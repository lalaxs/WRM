'use strict';

const path = require('path');
const { spawnSync } = require('child_process');

const repoRoot = path.join(__dirname, '..');

const suites = require('fs').readdirSync(__dirname)
  .filter(name => /^selftest_.*\.js$/.test(name) && name !== 'selftest_all.js')
  .sort();

function runAllSuites() {
  let failed = 0;
  for (const suite of suites) {
    console.log('\n--- ' + suite + ' ---');
    const result = spawnSync(process.execPath, [path.join(__dirname, suite)], {
      cwd: repoRoot,
      encoding: 'utf8'
    });
    process.stdout.write(result.stdout || '');
    process.stderr.write(result.stderr || '');
    if (result.status !== 0) {
      failed++;
      console.error('FAILED SUITE: ' + suite);
    }
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
