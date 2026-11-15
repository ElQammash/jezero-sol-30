import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { input } from '../input';
import { heightAt, type TerrainData } from '../terrain';
import { useWorld } from '../worldStore';
import Astronaut, { type AstronautHandle } from './Astronaut';
import { COLLIDERS, SITES } from './Base';

const WALK = 2.4;
const RUN = 5.2;
const LIMIT = 470; // stay inside the detailed play area

/** The player-controlled commander, plus the third-person camera that follows them. */
export default function Player({ terrain, cinematic }: { terrain: TerrainData; cinematic: { target: THREE.Vector3; pos: THREE.Vector3 } | null }) {
  const ref = useRef<AstronautHandle>(null);
  const vel = useRef(new THREE.Vector3());
  const phase = useRef(0);
  const yaw = useRef(Math.PI);
  const { camera } = useThree();
  const camPos = useRef(new THREE.Vector3(10, 6, 20));
  const camLook = useRef(new THREE.Vector3());

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const a = ref.current;
    if (!a) return;
    const g = a.group;
    const p = useWorld.getState().player;

    // ---- movement relative to the camera ----
    const mx = input.locked ? 0 : input.moveX;
    const my = input.locked ? 0 : input.moveY;
    const len = Math.min(1, Math.hypot(mx, my));
    const forward = new THREE.Vector3(-Math.sin(input.camYaw), 0, -Math.cos(input.camYaw));
    const right = new THREE.Vector3(-forward.z, 0, forward.x);
    const wish = forward.multiplyScalar(my).add(right.multiplyScalar(mx));
    if (wish.lengthSq() > 0) wish.normalize().multiplyScalar(len * (input.run ? RUN : WALK));
    vel.current.lerp(wish, 1 - Math.exp(-dt * 8));
    const next = p.clone().addScaledVector(vel.current, dt);

    // circle colliders around buildings
    for (const [site, r] of COLLIDERS) {
      const c = SITES[site];
      const dx = next.x - c.x;
      const dz = next.z - c.z;
      const d = Math.hypot(dx, dz);
      if (d < r + 0.4 && d > 0.001) {
        next.x = c.x + (dx / d) * (r + 0.4);
        next.z = c.z + (dz / d) * (r + 0.4);
      }
    }
    next.x = THREE.MathUtils.clamp(next.x, -LIMIT, LIMIT);
    next.z = THREE.MathUtils.clamp(next.z, -LIMIT, LIMIT);
    next.y = heightAt(terrain, next.x, next.z);
    p.copy(next);

    const speed = Math.hypot(vel.current.x, vel.current.z);
    if (speed > 0.15) {
      const target = Math.atan2(vel.current.x, vel.current.z);
      let d = target - yaw.current;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      yaw.current += d * (1 - Math.exp(-dt * 10));
    }
    phase.current += dt * (speed > 0.1 ? 2.2 + speed * 1.15 : 0);
    g.position.copy(p);
    g.rotation.y = yaw.current;
    a.pose(phase.current, speed, dt);

    // ---- camera ----
    if (cinematic) {
      camPos.current.lerp(cinematic.pos, 1 - Math.exp(-dt * 1.6));
      camLook.current.lerp(cinematic.target, 1 - Math.exp(-dt * 2.2));
    } else {
      const target = p.clone().add(new THREE.Vector3(0, 1.55, 0));
      const off = new THREE.Vector3(
        Math.sin(input.camYaw) * Math.cos(input.camPitch),
        Math.sin(input.camPitch),
        Math.cos(input.camYaw) * Math.cos(input.camPitch),
      ).multiplyScalar(input.camDist);
      const want = target.clone().add(off);
      const ground = heightAt(terrain, want.x, want.z) + 0.6;
      if (want.y < ground) want.y = ground;
      camPos.current.lerp(want, 1 - Math.exp(-dt * 9));
      camLook.current.lerp(target, 1 - Math.exp(-dt * 14));
    }
    camera.position.copy(camPos.current);
    camera.lookAt(camLook.current);
  });

  return <Astronaut ref={ref} />;
}
