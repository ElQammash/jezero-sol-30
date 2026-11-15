import { solsLeft, STAGE_SOLS, type GameState, type Task } from '../engine';

/** What today's goal asks the player to do. Each one is an order given at the base computer. */
export type GoalId = 'giveOrders' | 'cleanPanels' | 'pileRegolith' | 'maintain' | 'tendGreenhouse' | 'rest' | 'moxieOn' | 'icePlantOn' | 'greenhouseOn';
export type GoalReason = 'o2Falling' | 'stormSoon' | 'dusty' | 'shieldLow' | 'plantsWeak' | 'crewHurt' | 'wear' | 'routine';

export interface Goal {
  id: GoalId;
  reason: GoalReason;
  params?: Record<string, number | string>;
  done: boolean;
}

/**
 * Today's goal, picked from the real engine state: the weakest meter, the forecast and the
 * next crisis. Never random. Conditions that pick the goal do not depend on today's orders,
 * so the goal stays the same while the player carries it out; `done` reflects the orders.
 */
export function dailyGoal(g: GameState): Goal | null {
  if (g.status !== 'playing' || g.pendingStage) return null;
  const has = (t: Task) => g.tasks.includes(t);
  const st = g.settings;
  const left = solsLeft(g);
  if (left.oxygen < 8) {
    if (g.lifeSupport === 'moxie') return { id: 'moxieOn', reason: 'o2Falling', done: st.moxieOn };
    if (g.lifeSupport === 'ice' && g.rover !== 'lost') return { id: 'icePlantOn', reason: 'o2Falling', done: st.icePlantOn };
    if (g.lifeSupport === 'greenhouse') return { id: 'greenhouseOn', reason: 'o2Falling', done: st.greenhouseOn };
  }
  const solsToStorm = STAGE_SOLS.power - g.sol;
  if (!g.choices.power && solsToStorm >= 0 && solsToStorm <= 2) return { id: 'cleanPanels', reason: 'stormSoon', params: { n: solsToStorm }, done: has('cleanPanels') };
  if (g.panelClean < 0.8) return { id: 'cleanPanels', reason: 'dusty', params: { pct: Math.round(g.panelClean * 100) }, done: has('cleanPanels') };
  if (g.habitat === 'surface' && g.shield < 50) return { id: 'pileRegolith', reason: 'shieldLow', params: { pct: Math.round(g.shield) }, done: has('pileRegolith') };
  if (g.lifeSupport === 'greenhouse' && g.greenhouseHealth < 0.75) return { id: 'tendGreenhouse', reason: 'plantsWeak', done: has('tendGreenhouse') };
  const hurt = g.crew.find((c) => c.alive && c.health < 60);
  if (hurt) return { id: 'rest', reason: 'crewHurt', params: { who: hurt.id }, done: has('rest') };
  if (g.wear > 45) return { id: 'maintain', reason: 'wear', params: { pct: Math.round(g.wear) }, done: has('maintain') };
  return { id: 'giveOrders', reason: 'routine', done: g.tasks.length >= 2 };
}
