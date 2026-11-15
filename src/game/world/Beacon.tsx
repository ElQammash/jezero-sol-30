import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { currentTarget, spotPosition } from '../spots';
import { useGame } from '../store';
import { heightAt, type TerrainData } from '../terrain';

/** A glowing pillar of light over the place the player needs to reach. */
export default function Beacon({ terrain }: { terrain: TerrainData }) {
  const game = useGame((s) => s.game);
  const action = useGame((s) => s.action);
  const target = currentTarget(game, action);
  const ring = useRef<THREE.Mesh>(null);
  const beam = useRef<THREE.Mesh>(null);
  const mats = useMemo(
    () => ({
      beam: new THREE.MeshBasicMaterial({ color: '#7fd8ff', transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
      ring: new THREE.MeshBasicMaterial({ color: '#7fd8ff', transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }),
    }),
    [],
  );
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (ring.current) {
      const s = 1 + (t % 1.4) / 1.4;
      ring.current.scale.set(s, s, s);
      mats.ring.opacity = 0.8 * (1 - (t % 1.4) / 1.4);
    }
    if (beam.current) mats.beam.opacity = 0.16 + Math.sin(t * 3) * 0.05;
  });
  if (!target) return null;
  const p = spotPosition(target);
  const urgent = action?.objective === 'shelter';
  mats.beam.color.set(urgent ? '#ff5a4a' : '#7fd8ff');
  mats.ring.color.set(urgent ? '#ff5a4a' : '#7fd8ff');
  const y = heightAt(terrain, p.x, p.z);
  return (
    <group position={[p.x, y, p.z]}>
      <mesh ref={beam} material={mats.beam} position={[0, 30, 0]}>
        <cylinderGeometry args={[0.9, 1.4, 60, 24, 1, true]} />
      </mesh>
      <mesh ref={ring} material={mats.ring} position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.6, 1.9, 40]} />
      </mesh>
    </group>
  );
}
