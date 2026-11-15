import type { GameState, Role, Task } from '../engine';

export type Worker = Exclude<Role, 'commander'>;

/** Who is best at each job (role affinity is visual only: the engine does not change). */
const PREFERRED: Record<Task, Worker[]> = {
  cleanPanels: ['engineer', 'pilot', 'geologist', 'botanist', 'doctor'],
  pileRegolith: ['geologist', 'pilot', 'engineer', 'botanist', 'doctor'],
  maintain: ['engineer', 'pilot', 'geologist', 'doctor', 'botanist'],
  tendGreenhouse: ['botanist', 'doctor', 'pilot', 'geologist', 'engineer'],
  rest: ['doctor', 'botanist', 'pilot', 'geologist', 'engineer'],
};

/** Where each job is done (x, z on the base map). */
export const WORK_SITE: Record<Task, [number, number]> = {
  cleanPanels: [15, -3.3], // the end of the panel rows, where cleaning starts
  pileRegolith: [-7.5, 5.5], // beside the habitat
  maintain: [14, 16.4], // the power hub
  tendGreenhouse: [-22, 3], // inside the greenhouse dome
  rest: [2.5, 11.5], // by the habitat airlock (the doctor checks everyone)
};

/** Sol-clock window of a job: walk out, work, walk back. */
export const JOB = { leave: 0.06, arrive: 0.12, finish: 0.4, back: 0.46 } as const;

/** The crewmember who carries out each of today's orders (healthy crew first, by role). */
export function assignJobs(g: GameState): Partial<Record<Task, Worker>> {
  const out: Partial<Record<Task, Worker>> = {};
  const used = new Set<Worker>();
  const able = (r: Worker) => {
    const c = g.crew.find((x) => x.id === r);
    return !!c && c.alive && c.condition !== 'sick' && !used.has(r);
  };
  for (const task of g.tasks) {
    const who = PREFERRED[task].find(able);
    if (who) {
      out[task] = who;
      used.add(who);
    }
  }
  return out;
}

/** Progress 0..1 of today's jobs at a point of the sol. */
export function jobProgress(clock: number): number {
  return Math.max(0, Math.min(1, (clock - JOB.arrive) / (JOB.finish - JOB.arrive)));
}
