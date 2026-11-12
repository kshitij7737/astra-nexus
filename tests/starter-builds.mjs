import assert from 'node:assert/strict';
import { GAME, ORDER } from '../js/game-data.js';
import { starterConfig, derive, estimate } from '../js/sim.js';
for (const id of ORDER) {
  const mission = GAME[id];
  const config = starterConfig(mission);
  const design = derive(mission, config, 'cadet');
  const result = estimate(mission, config, 'cadet');
  assert.ok(design.launchable, `${id}: launchable`);
  assert.ok(design.checks.filter(check => !check.soft).every(check => check.ok), `${id}: required checks`);
  assert.equal(result.brown, 0, `${id}: zero blackouts`);
  assert.equal(result.missionFailed, false, `${id}: mission succeeds`);
  assert.ok(result.objs.every(objective => objective.frac === 1), `${id}: all science returned`);
  assert.equal(result.score, 90, `${id}: science score before quiz bonus`);
  console.log(`${id}: starter configuration passes`);
}
