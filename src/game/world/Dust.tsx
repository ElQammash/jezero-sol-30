import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useWorld } from '../worldStore';

const COUNT = 2200;
const BOX = 60;

/** Wind-blown dust around the camera; thick during a dust storm, a faint haze otherwise. */
export default function Dust() {
  const ref = useRef<THREE.Points>(null);
  const { geo, mat, seeds } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(COUNT * 3);
    const seeds = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      seeds[i * 3] = Math.random() * BOX;
      seeds[i * 3 + 1] = Math.random() * 18;
      seeds[i * 3 + 2] = Math.random() * BOX;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 32, 32);
    const mat = new THREE.PointsMaterial({ color: '#c98a5a', map: new THREE.CanvasTexture(c), size: 0.12, transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: true });
    return { geo, mat, seeds };
  }, []);
  useFrame(({ camera, clock }) => {
    const dust = useWorld.getState().dust;
    mat.opacity = 0.08 + dust * 0.65;
    mat.size = 0.08 + dust * 0.14;
    const t = clock.elapsedTime;
    const wind = 2 + dust * 16;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < COUNT; i++) {
      // particles live in a box that wraps around the camera
      const x = ((((seeds[i * 3] + t * wind) % BOX) + BOX) % BOX) - BOX / 2;
      const z = ((((seeds[i * 3 + 2] + t * wind * 0.35) % BOX) + BOX) % BOX) - BOX / 2;
      const y = seeds[i * 3 + 1] + Math.sin(t * 0.7 + i) * 0.4;
      pos.setXYZ(i, camera.position.x + x, camera.position.y - 4 + y, camera.position.z + z);
    }
    pos.needsUpdate = true;
  });
  return <points ref={ref} geometry={geo} material={mat} frustumCulled={false} />;
}
