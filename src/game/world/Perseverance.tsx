import { useGLTF } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import { heightAt, type TerrainData } from '../terrain';

const URL = './models/perseverance.glb';

/**
 * NASA's real 3D model of the Perseverance rover (NASA/JPL-Caltech, public domain,
 * science.nasa.gov 3D resources). In the game it is the colony's robotic helper.
 */
export default function Perseverance({ terrain, at, yaw = 0 }: { terrain: TerrainData; at: [number, number]; yaw?: number }) {
  const { scene } = useGLTF(URL);
  const model = useMemo(() => {
    const m = scene.clone(true);
    // normalise to the real rover length (~3 m) whatever units the file uses
    const box = new THREE.Box3().setFromObject(m);
    const size = box.getSize(new THREE.Vector3());
    const s = 3 / Math.max(size.x, size.z);
    m.scale.setScalar(s);
    const box2 = new THREE.Box3().setFromObject(m);
    m.position.y = -box2.min.y;
    m.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    return m;
  }, [scene]);
  const y = heightAt(terrain, at[0], at[1]);
  return (
    <group position={[at[0], y, at[1]]} rotation={[0, yaw, 0]}>
      <primitive object={model} />
    </group>
  );
}

useGLTF.preload(URL);
