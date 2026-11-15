import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { useWorld } from '../worldStore';

/** Sun + sky light. The shadow box follows the player so shadows stay sharp. */
export default function Lighting({ shadows }: { shadows: boolean }) {
  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const target = useRef(new THREE.Object3D());

  useFrame(() => {
    const w = useWorld.getState();
    const s = sun.current;
    if (!s || !hemi.current) return;
    const day = THREE.MathUtils.smoothstep(w.sunDir.y, -0.08, 0.25);
    const dust = w.dust;
    // Mars sunlight is ~43% of Earth's; exposure compensates, keep it warm and a bit weaker
    s.intensity = 3.2 * day * (1 - dust * 0.85);
    s.color.setRGB(1, 0.9 - (1 - day) * 0.15, 0.78 - (1 - day) * 0.2);
    target.current.position.copy(w.player);
    s.target = target.current;
    s.position.copy(w.player).addScaledVector(w.sunDir, 80);
    s.target.updateMatrixWorld();
    hemi.current.intensity = 0.25 + 0.75 * day;
    hemi.current.color.setRGB(0.95 - dust * 0.3, 0.72 - dust * 0.3, 0.55 - dust * 0.3);
    hemi.current.groundColor.setRGB(0.42, 0.22, 0.13);
  });

  return (
    <>
      <hemisphereLight ref={hemi} args={['#f0b88a', '#6b3820', 0.9]} />
      <directionalLight
        ref={sun}
        castShadow={shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-camera-near={1}
        shadow-camera-far={200}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
      />
      <primitive object={target.current} />
    </>
  );
}
