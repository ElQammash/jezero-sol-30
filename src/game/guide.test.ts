import { describe, expect, it } from 'vitest';
import { chooseOption, createMission, endSol, setSettings, setTasks, type GameState } from '../engine';
import { dailyGoal } from './goals';
import { routeAround } from './path';
import { COLLIDERS, SITES } from './world/Base';

function toStage(s: GameState) {
  while (s.status === 'playing' && !s.pendingStage) s = endSol(setTasks(s, ['cleanPanels', 'maintain']));
  return s;
}

describe('daily goal', () => {
  it('comes from the engine state and is marked done by the matching order', () => {
    let s = chooseOption(createMission(11), 'A').state;
    const g = dailyGoal(s)!;
    expect(g).not.toBeNull();
    expect(g.done).toBe(false);
    s = setTasks(s, ['rest', 'maintain']);
    s = { ...s, tasks: [] };
    expect(dailyGoal(s)!.id).toBe(g.id);
  });
  it('warns about the storm two sols ahead and asks to clean the panels', () => {
    let s = chooseOption(toStage(chooseOption(createMission(5), 'A').state), 'C').state; // life support
    while (s.sol < 7) s = endSol(setTasks(s, ['maintain', 'rest']));
    s = { ...s, panelClean: 1, wear: 0 };
    s = setSettings(s, { moxieOn: true, icePlantOn: true, greenhouseOn: true });
    const g = dailyGoal(s)!;
    if (g.reason !== 'o2Falling') {
      expect(g.id).toBe('cleanPanels');
      expect(g.reason).toBe('stormSoon');
      expect(dailyGoal(setTasks(s, ['cleanPanels']))!.done).toBe(true);
    }
  });
  it('is never random: same state, same goal', () => {
    const s = chooseOption(createMission(99), 'B').state;
    expect(dailyGoal(s)).toEqual(dailyGoal(structuredClone(s)));
  });
});

describe('ground path', () => {
  it('routes around buildings instead of through them', () => {
    const from = { x: SITES.habitat.x, z: SITES.habitat.z + 20 };
    const to = { x: 10, z: -19.2 }; // the rover garage door, behind the habitat
    const pts = routeAround(from, to);
    expect(pts.length).toBeGreaterThan(2);
    const r = COLLIDERS.find(([s]) => s === 'habitat')![1];
    // sample the route: no point inside the habitat
    for (let i = 0; i < pts.length - 1; i++)
      for (let k = 0; k <= 20; k++) {
        const x = pts[i].x + ((pts[i + 1].x - pts[i].x) * k) / 20;
        const z = pts[i].z + ((pts[i + 1].z - pts[i].z) * k) / 20;
        expect(Math.hypot(x - SITES.habitat.x, z - SITES.habitat.z)).toBeGreaterThan(r);
      }
  });
});
