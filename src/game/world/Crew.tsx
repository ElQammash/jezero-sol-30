import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { GameState, Role } from '../../engine';
import { heightAt, type TerrainData } from '../terrain';
import Astronaut, { type AstronautHandle } from './Astronaut';

/** Each crewmember walks a short route near their workplace. */
const ROUTES: Record<Exclude<Role, 'commander'>, { a: [number, number]; b: [number, number]; stripe: string }> = {
  engineer: { a: [12, 14.5], b: [20, -6], stripe: '#3a8dff' },
  botanist: { a: [-14, 15], b: [-30, 14], stripe: '#4ec26a' },
  doctor: { a: [3, 11.5], b: [-6, 13], stripe: '#ff4f6d' },
  geologist: { a: [6, -20], b: [24, -32], stripe: '#ffb03a' },
  pilot: { a: [-10, -10], b: [-24, -24], stripe: '#b067ff' },
};

function Member({ id, terrain, game }: { id: Exclude<Role, 'commander'>; terrain: TerrainData; game: GameState }) {
  const ref = useRef<AstronautHandle>(null);
  const t = useRef(Math.random() * 10);
  const phase = useRef(0);
  const r = ROUTES[id];
  const member = game.crew.find((c) => c.id === id)!;
  const inside = !member.alive || member.condition === 'sick' || (game.storm !== null && game.storm.plan !== 'C');
  useFrame((_, dt) => {
    const a = ref.current;
    if (!a) return;
    t.current += Math.min(dt, 0.05);
    // walk a -> b, pause, walk back, pause (a 40 s loop)
    const cycle = t.current % 40;
    const walking = cycle < 14 || (cycle >= 20 && cycle < 34);
    const k = cycle < 14 ? cycle / 14 : cycle < 20 ? 1 : cycle < 34 ? 1 - (cycle - 20) / 14 : 0;
    const x = r.a[0] + (r.b[0] - r.a[0]) * k;
    const z = r.a[1] + (r.b[1] - r.a[1]) * k;
    const dir = cycle < 20 ? 1 : -1;
    const yaw = Math.atan2((r.b[0] - r.a[0]) * dir, (r.b[1] - r.a[1]) * dir);
    a.group.position.set(x, heightAt(terrain, x, z), z);
    a.group.rotation.y = walking ? yaw : yaw + Math.sin(t.current * 0.4) * 0.8;
    const speed = walking ? 1.4 * (member.health / 100 + 0.3) : 0;
    phase.current += dt * (walking ? 3.6 : 0);
    a.pose(phase.current, speed, dt);
  });
  if (inside) return null;
  return <Astronaut ref={ref} stripe={r.stripe} />;
}

export default function Crew({ terrain, game }: { terrain: TerrainData; game: GameState }) {
  return (
    <>
      {(Object.keys(ROUTES) as (keyof typeof ROUTES)[]).map((id) => (
        <Member key={id} id={id} terrain={terrain} game={game} />
      ))}
    </>
  );
}
