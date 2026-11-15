import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { GameState, Task } from '../../engine';
import { assignJobs, JOB, WORK_SITE, type Worker } from '../crewJobs';
import { clockRate, DAY_END, useGame } from '../store';
import { heightAt, type TerrainData } from '../terrain';
import { useT } from '../useT';
import Astronaut, { type AstronautHandle } from './Astronaut';

/** Each crewmember's workplace routine when they have no order (walk a short route). */
const ROUTES: Record<Worker, { a: [number, number]; b: [number, number]; stripe: string; icon: string }> = {
  engineer: { a: [12, 14.5], b: [12.5, 0], stripe: '#3a8dff', icon: '🔧' },
  botanist: { a: [-13, 18.5], b: [-30, 18.5], stripe: '#4ec26a', icon: '🌱' },
  doctor: { a: [3, 11.5], b: [-6, 13], stripe: '#ff4f6d', icon: '⚕️' },
  geologist: { a: [6, -20], b: [24, -32], stripe: '#ffb03a', icon: '🪨' },
  pilot: { a: [-18, -6], b: [-30, -12], stripe: '#b067ff', icon: '🚀' },
};

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

function Member({ id, terrain, game, task }: { id: Worker; terrain: TerrainData; game: GameState; task: Task | undefined }) {
  const { t, n } = useT();
  const ref = useRef<AstronautHandle>(null);
  const tm = useRef(Math.random() * 10);
  const phase = useRef(0);
  const sparks = useRef<THREE.PointLight>(null);
  const [tag, setTag] = useState<{ pct: number; left: number } | null>(null);
  const [hidden, setHidden] = useState(false);
  const r = ROUTES[id];
  const member = game.crew.find((c) => c.id === id)!;
  // inside when dead, sick, or the storm keeps everyone in (unless they are cleaning in it)
  const indoors = !member.alive || member.condition === 'sick' || (game.storm !== null && game.storm.plan !== 'C');
  const lastTag = useRef(0);

  useFrame((_, dt) => {
    const a = ref.current;
    if (!a) return;
    const clock = useGame.getState().clock;
    // everyone goes inside for the night
    const night = clock > DAY_END - 0.02;
    if (night !== hidden) setHidden(night);
    tm.current += Math.min(dt, 0.05);
    let x: number;
    let z: number;
    let yaw: number;
    let speed = 0;
    let working = false;
    const site = task ? WORK_SITE[task] : null;
    if (site && clock >= JOB.leave && clock < JOB.back) {
      // walk out, work at the site, walk back
      const home = r.a;
      if (clock < JOB.arrive) {
        const k = (clock - JOB.leave) / (JOB.arrive - JOB.leave);
        x = lerp(home[0], site[0], k);
        z = lerp(home[1], site[1], k);
        yaw = Math.atan2(site[0] - home[0], site[1] - home[1]);
        speed = 1.6;
      } else if (clock < JOB.finish) {
        x = site[0] + Math.sin(tm.current * 0.5) * 0.6;
        z = site[1];
        yaw = Math.sin(tm.current * 0.9) * 1.2;
        working = true;
      } else {
        const k = (clock - JOB.finish) / (JOB.back - JOB.finish);
        x = lerp(site[0], home[0], k);
        z = lerp(site[1], home[1], k);
        yaw = Math.atan2(home[0] - site[0], home[1] - site[1]);
        speed = 1.6;
      }
    } else {
      // idle routine at their workplace: walk a -> b, pause, walk back, pause (a 40 s loop)
      const cycle = tm.current % 40;
      const walking = cycle < 14 || (cycle >= 20 && cycle < 34);
      const k = cycle < 14 ? cycle / 14 : cycle < 20 ? 1 : cycle < 34 ? 1 - (cycle - 20) / 14 : 0;
      x = r.a[0] + (r.b[0] - r.a[0]) * k;
      z = r.a[1] + (r.b[1] - r.a[1]) * k;
      const dir = cycle < 20 ? 1 : -1;
      yaw = Math.atan2((r.b[0] - r.a[0]) * dir, (r.b[1] - r.a[1]) * dir);
      if (!walking) yaw += Math.sin(tm.current * 0.4) * 0.8;
      speed = walking ? 1.4 * (member.health / 100 + 0.3) : 0;
    }
    a.group.position.set(x, heightAt(terrain, x, z), z);
    a.group.rotation.y = yaw;
    phase.current += dt * (speed > 0 ? 3.6 : working ? 2.2 : 0);
    a.pose(phase.current, working ? 0.35 : speed, dt);
    if (sparks.current) sparks.current.intensity = working && task === 'maintain' ? (Math.random() > 0.6 ? 6 : 0) : 0;
    // progress tag above the head (5 times a second)
    if ((lastTag.current += dt) > 0.2) {
      lastTag.current = 0;
      if (site && clock >= JOB.leave && clock < JOB.finish) {
        const pct = Math.round(Math.max(0, Math.min(1, (clock - JOB.arrive) / (JOB.finish - JOB.arrive))) * 100);
        const left = Math.max(0, Math.ceil((JOB.finish - clock) / clockRate(0)));
        setTag((p) => (p && p.pct === pct && p.left === left ? p : { pct, left }));
      } else if (tag) setTag(null);
    }
  });
  if (indoors || hidden) return null;
  return (
    <Astronaut ref={ref} stripe={r.stripe}>
      <pointLight ref={sparks} position={[0.4, 1.2, 0.5]} color="#9fd4ff" distance={5} intensity={0} />
      <Html position={[0, 2.35, 0]} center distanceFactor={14} zIndexRange={[4, 0]} style={{ pointerEvents: 'none' }}>
        <div className={`crew-tag ${tag ? 'busy' : ''}`}>
          <b>
            {r.icon} {t(`names.${id}`)}
          </b>
          {tag && task && (
            <>
              <small>{t(`tasks.${task}.name`)}</small>
              <span className="pbar">
                <i style={{ inlineSize: `${tag.pct}%` }} />
              </span>
              <small>
                {tag.pct >= 100 ? '✓' : `${n(Math.floor(tag.left / 60))}:${n(tag.left % 60).padStart(2, n(0))}`}
              </small>
            </>
          )}
        </div>
      </Html>
    </Astronaut>
  );
}

export default function Crew({ terrain, game }: { terrain: TerrainData; game: GameState }) {
  const jobs = useMemo(() => assignJobs(game), [game]);
  const byWorker = useMemo(() => {
    const m: Partial<Record<Worker, Task>> = {};
    for (const [task, w] of Object.entries(jobs)) if (w) m[w] = task as Task;
    return m;
  }, [jobs]);
  return (
    <>
      {(Object.keys(ROUTES) as Worker[]).map((id) => (
        <Member key={id} id={id} terrain={terrain} game={game} task={byWorker[id]} />
      ))}
    </>
  );
}
