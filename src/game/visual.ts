import type { GameState } from '../engine';
import { jobProgress } from './crewJobs';

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/**
 * What the world should look like part-way through the sol: the engine result for this sol
 * (preview) blended in as the crew work. Visual only; the rules still run in endSol().
 */
export function liveVisual(g: GameState, clock: number, preview: GameState | null): GameState {
  if (!preview) return g;
  const work = jobProgress(clock);
  const has = (t: string) => g.tasks.includes(t as never);
  return {
    ...g,
    panelClean: has('cleanPanels') ? lerp(g.panelClean, preview.panelClean, work) : lerp(g.panelClean, preview.panelClean, clock),
    shield: has('pileRegolith') ? lerp(g.shield, preview.shield, work) : lerp(g.shield, preview.shield, clock),
    greenhouseHealth: lerp(g.greenhouseHealth, preview.greenhouseHealth, clock),
    greenhouseAge: lerp(g.greenhouseAge, preview.greenhouseAge, clock),
    battery: lerp(g.battery, preview.battery, clock),
    buildSolsLeft: lerp(g.buildSolsLeft, preview.buildSolsLeft, clock),
  };
}
