import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync(new URL('../../.github/workflows/windows-release.yml', import.meta.url), 'utf8');

function validateSetupBoundary(source) {
  assert.match(source, /\$setupAssets = @\(\$assetsForApplication \| Where-Object \{ \$_\.Asset -eq 'Setup\.exe' \}\)/);
  assert.doesNotMatch(source, /\$_\.Asset -match '-Setup\\\.exe\$'/);
}

test('validates the literal setup asset field before publication', () => {
  validateSetupBoundary(workflow);
});

test('turns red when the setup boundary is changed back to the published filename pattern', () => {
  const broken = workflow.replace("$_.Asset -eq 'Setup.exe'", "$_.Asset -match '-Setup\\.exe$'");
  assert.throws(() => validateSetupBoundary(broken));
});
