import * as THREE from 'three';
import type { GameState } from '../engine';
import { dailyGoal } from './goals';
import type { WorldAction } from './store';
import { SITES, type SiteId } from './world/Base';

export type Spot = 'computer' | 'airlock' | 'reactor' | 'garage';

export const SPOTS: { id: Spot; site: SiteId; offset: [number, number]; radius: number }[] = [
  { id: 'computer', site: 'tower', offset: [0, 4.4], radius: 3 },
  { id: 'airlock', site: 'habitat', offset: [0, 9.6], radius: 3.2 },
  { id: 'reactor', site: 'reactor', offset: [0, 5], radius: 4 },
  { id: 'garage', site: 'garage', offset: [0, 4.8], radius: 3.5 },
];

export function spotPosition(id: Spot): THREE.Vector3 {
  const s = SPOTS.find((x) => x.id === id)!;
  const c = SITES[s.site];
  return new THREE.Vector3(c.x + s.offset[0], 0, c.z + s.offset[1]);
}

/** Where the player should go right now (for the beacon and compass), if anywhere. */
export function currentTarget(game: GameState, action: WorldAction | null): Spot | null {
  if (action) return action.objective === 'shelter' ? 'airlock' : action.objective === 'reactor' ? 'reactor' : 'garage';
  const goal = dailyGoal(game);
  if (goal && !goal.done) return 'computer'; // orders are given at the base computer
  return null;
}

/** A temporary place to walk to (tutorial circle). Set by the tutorial, read by the guides. */
export const guide = { override: null as THREE.Vector3 | null };

/** Where the player should go right now, as a world position, if anywhere. */
export function currentTargetPos(game: GameState, action: WorldAction | null): THREE.Vector3 | null {
  if (guide.override && !action) return guide.override;
  const s = currentTarget(game, action);
  return s ? spotPosition(s) : null;
}
