import { Canvas } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { Bloom, EffectComposer, SMAA, Vignette } from '@react-three/postprocessing';
import { Suspense, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { GameState } from '../engine';
import { installInput } from './input';
import { loadTerrain, type TerrainData } from './terrain';
import Base, { SITES } from './world/Base';
import Beacon from './world/Beacon';
import Crew from './world/Crew';
import Dust from './world/Dust';
import Perseverance from './world/Perseverance';
import Lighting from './world/Lighting';
import Player from './world/Player';
import Sky from './world/Sky';
import Terrain from './world/Terrain';

export type Quality = 'low' | 'medium' | 'high';

export function detectQuality(): Quality {
  const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  const cores = navigator.hardwareConcurrency ?? 4;
  if (mobile) return cores >= 8 ? 'medium' : 'low';
  return cores >= 6 ? 'high' : 'medium';
}

interface Props {
  game: GameState;
  quality: Quality;
  cinematic: { target: THREE.Vector3; pos: THREE.Vector3 } | null;
  onReady?: () => void;
}

export default function World({ game, quality, cinematic, onReady }: Props) {
  const [terrain, setTerrain] = useState<TerrainData | null>(null);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadTerrain().then(setTerrain);
  }, []);
  useEffect(() => (wrap.current ? installInput(wrap.current.querySelector('canvas') ?? wrap.current) : undefined), [terrain]);
  useEffect(() => {
    if (terrain) onReady?.();
  }, [terrain, onReady]);

  const dpr: [number, number] = quality === 'high' ? [1, 2] : quality === 'medium' ? [1, 1.5] : [0.75, 1];
  return (
    <div ref={wrap} style={{ position: 'absolute', inset: 0, touchAction: 'none' }}>
      <Canvas
        shadows={quality !== 'low'}
        dpr={dpr}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        camera={{ fov: 55, near: 0.1, far: 40000, position: [10, 6, 20] }}
        onCreated={({ gl, scene }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
          scene.fog = new THREE.FogExp2('#d29a6a', 0.00011);
        }}
      >
        <Suspense fallback={null}>
          <Sky />
          <Environment resolution={64} frames={1}>
            <mesh scale={100}>
              <sphereGeometry args={[1, 32, 16]} />
              <shaderMaterial
                side={THREE.BackSide}
                vertexShader={'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }'}
                fragmentShader={'varying vec3 vP; void main(){ float h = normalize(vP).y; vec3 sky = mix(vec3(1.1,0.78,0.55), vec3(0.65,0.45,0.32), clamp(h,0.0,1.0)); vec3 ground = vec3(0.35,0.18,0.1); gl_FragColor = vec4(h > 0.0 ? sky : ground, 1.0); }'}
              />
            </mesh>
          </Environment>
          <Lighting shadows={quality !== 'low'} />
          {terrain && (
            <>
              <Terrain data={terrain} />
              <Base terrain={terrain} game={game} />
              <Player terrain={terrain} cinematic={cinematic} />
              <Crew terrain={terrain} game={game} />
              <Beacon terrain={terrain} />
              <Perseverance terrain={terrain} at={[SITES.robot.x, SITES.robot.z]} yaw={-0.6} />
              {quality !== 'low' && <Dust />}
            </>
          )}
          {quality !== 'low' && (
            <EffectComposer multisampling={0}>
              <Bloom intensity={0.6} luminanceThreshold={0.85} mipmapBlur />
              <Vignette offset={0.25} darkness={0.55} />
              <SMAA />
            </EffectComposer>
          )}
        </Suspense>
      </Canvas>
    </div>
  );
}
