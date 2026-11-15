import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import * as THREE from 'three';

export interface AstronautHandle {
  group: THREE.Group;
  /** phase 0..2π of the walk cycle, speed in m/s */
  pose: (phase: number, speed: number, dt: number) => void;
}

interface Props {
  suitColor?: string;
  stripe?: string;
  children?: React.ReactNode;
}

/** A detailed procedural EVA suit astronaut with a simple walk cycle (no external model needed). */
const Astronaut = forwardRef<AstronautHandle, Props>(function Astronaut({ suitColor = '#f2efe9', stripe = '#d9622b', children }, ref) {
  const root = useRef<THREE.Group>(null!);
  const hips = useRef<THREE.Group>(null!);
  const torso = useRef<THREE.Group>(null!);
  const legL = useRef<THREE.Group>(null!);
  const legR = useRef<THREE.Group>(null!);
  const kneeL = useRef<THREE.Group>(null!);
  const kneeR = useRef<THREE.Group>(null!);
  const armL = useRef<THREE.Group>(null!);
  const armR = useRef<THREE.Group>(null!);
  const elbowL = useRef<THREE.Group>(null!);
  const elbowR = useRef<THREE.Group>(null!);
  const head = useRef<THREE.Group>(null!);

  const mats = useMemo(() => {
    const suit = new THREE.MeshStandardMaterial({ color: suitColor, roughness: 0.78, metalness: 0.02 });
    const suitDark = new THREE.MeshStandardMaterial({ color: '#b9b4ab', roughness: 0.8 });
    const accent = new THREE.MeshStandardMaterial({ color: stripe, roughness: 0.6 });
    const metal = new THREE.MeshStandardMaterial({ color: '#8d9198', roughness: 0.35, metalness: 0.85 });
    const boot = new THREE.MeshStandardMaterial({ color: '#4a4744', roughness: 0.9 });
    const visor = new THREE.MeshPhysicalMaterial({ color: '#c9902f', metalness: 1, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.5 });
    const helmet = new THREE.MeshPhysicalMaterial({ color: '#f7f5f0', roughness: 0.25, clearcoat: 0.6 });
    const light = new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#e8f4ff', emissiveIntensity: 3 });
    return { suit, suitDark, accent, metal, boot, visor, helmet, light };
  }, [suitColor, stripe]);

  useImperativeHandle(ref, () => ({
    group: root.current,
    pose: (phase, speed, dt) => {
      const k = Math.min(1, speed / 2.5);
      const swing = Math.sin(phase) * 0.55 * k;
      const lift = Math.max(0, Math.sin(phase)) * 0.75 * k;
      const lift2 = Math.max(0, -Math.sin(phase)) * 0.75 * k;
      legL.current.rotation.x = swing;
      legR.current.rotation.x = -swing;
      kneeL.current.rotation.x = -lift2 * 0.9 - 0.05;
      kneeR.current.rotation.x = -lift * 0.9 - 0.05;
      armL.current.rotation.x = -swing * 0.7;
      armR.current.rotation.x = swing * 0.7;
      elbowL.current.rotation.x = -0.35 - k * 0.3;
      elbowR.current.rotation.x = -0.35 - k * 0.3;
      // low gravity: a little bounce in each step, and gentle breathing when idle
      const bounce = Math.abs(Math.cos(phase)) * 0.09 * k;
      const breathe = Math.sin(performance.now() / 900) * 0.012 * (1 - k);
      hips.current.position.y = 0.98 + bounce + breathe;
      torso.current.rotation.x = 0.06 * k;
      head.current.rotation.y = THREE.MathUtils.damp(head.current.rotation.y, 0, 4, dt);
    },
  }));

  const limb = (len: number, r: number, mat: THREE.Material) => (
    <mesh material={mat} position={[0, -len / 2, 0]} castShadow>
      <capsuleGeometry args={[r, len - r * 2, 6, 12]} />
    </mesh>
  );

  return (
    <group ref={root}>
      <group ref={hips} position={[0, 0.98, 0]}>
        {/* pelvis */}
        <mesh material={mats.suit} castShadow>
          <capsuleGeometry args={[0.2, 0.18, 6, 14]} />
        </mesh>
        <mesh material={mats.metal} position={[0, 0.12, 0]}>
          <torusGeometry args={[0.215, 0.03, 8, 24]} />
        </mesh>
        {/* legs */}
        {[
          [legL, kneeL, -0.12],
          [legR, kneeR, 0.12],
        ].map(([leg, knee, x], i) => (
          <group key={i} ref={leg as React.RefObject<THREE.Group>} position={[x as number, -0.08, 0]}>
            {limb(0.46, 0.105, mats.suit)}
            <mesh material={mats.accent} position={[0, -0.2, 0]}>
              <torusGeometry args={[0.108, 0.015, 6, 16]} />
            </mesh>
            <group ref={knee as React.RefObject<THREE.Group>} position={[0, -0.44, 0]}>
              <mesh material={mats.suitDark} castShadow>
                <sphereGeometry args={[0.1, 12, 10]} />
              </mesh>
              {limb(0.44, 0.095, mats.suit)}
              <mesh material={mats.boot} position={[0, -0.47, 0.05]} castShadow>
                <boxGeometry args={[0.17, 0.12, 0.3]} />
              </mesh>
            </group>
          </group>
        ))}
        {/* torso */}
        <group ref={torso} position={[0, 0.18, 0]}>
          <mesh material={mats.suit} position={[0, 0.32, 0]} castShadow>
            <capsuleGeometry args={[0.27, 0.3, 8, 16]} />
          </mesh>
          {/* chest control box */}
          <mesh material={mats.suitDark} position={[0, 0.36, 0.25]} castShadow>
            <boxGeometry args={[0.3, 0.2, 0.1]} />
          </mesh>
          <mesh material={mats.accent} position={[-0.08, 0.38, 0.305]}>
            <boxGeometry args={[0.06, 0.05, 0.02]} />
          </mesh>
          <mesh material={mats.light} position={[0.08, 0.38, 0.305]}>
            <boxGeometry args={[0.05, 0.03, 0.02]} />
          </mesh>
          {/* life-support backpack */}
          <mesh material={mats.suit} position={[0, 0.36, -0.3]} castShadow>
            <boxGeometry args={[0.5, 0.62, 0.24]} />
          </mesh>
          <mesh material={mats.metal} position={[0.18, 0.56, -0.43]}>
            <cylinderGeometry args={[0.04, 0.04, 0.3, 8]} />
          </mesh>
          <mesh material={mats.accent} position={[0, 0.12, -0.425]}>
            <boxGeometry args={[0.44, 0.06, 0.02]} />
          </mesh>
          {/* shoulders and arms */}
          {[
            [armL, elbowL, -0.36],
            [armR, elbowR, 0.36],
          ].map(([arm, elbow, x], i) => (
            <group key={i} ref={arm as React.RefObject<THREE.Group>} position={[x as number, 0.52, 0]}>
              <mesh material={mats.suit} castShadow>
                <sphereGeometry args={[0.12, 14, 12]} />
              </mesh>
              <group rotation={[0, 0, (i === 0 ? 1 : -1) * 0.12]}>
                {limb(0.32, 0.085, mats.suit)}
                <group ref={elbow as React.RefObject<THREE.Group>} position={[0, -0.3, 0]}>
                  {limb(0.3, 0.078, mats.suit)}
                  <mesh material={mats.metal} position={[0, -0.26, 0]}>
                    <torusGeometry args={[0.08, 0.018, 6, 16]} />
                  </mesh>
                  <mesh material={mats.boot} position={[0, -0.34, 0.01]} castShadow>
                    <sphereGeometry args={[0.075, 12, 10]} />
                  </mesh>
                </group>
              </group>
            </group>
          ))}
          {/* helmet */}
          <group ref={head} position={[0, 0.82, 0.02]}>
            <mesh material={mats.metal} position={[0, -0.13, 0]}>
              <torusGeometry args={[0.17, 0.035, 8, 24]} />
            </mesh>
            <mesh material={mats.helmet} castShadow>
              <sphereGeometry args={[0.215, 28, 22]} />
            </mesh>
            <mesh material={mats.visor} position={[0, 0.0, 0.035]} scale={[1, 0.9, 1]}>
              <sphereGeometry args={[0.2, 28, 22, -1.15, 2.3, 0.75, 1.25]} />
            </mesh>
            <mesh material={mats.light} position={[0.17, 0.12, 0.1]}>
              <cylinderGeometry args={[0.025, 0.025, 0.04, 10]} />
            </mesh>
          </group>
        </group>
      </group>
      {children}
    </group>
  );
});

export default Astronaut;
