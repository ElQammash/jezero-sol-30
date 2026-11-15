import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { routeAround, type P2 } from '../path';
import { currentTargetPos } from '../spots';
import { useGame } from '../store';
import { heightAt, type TerrainData } from '../terrain';
import { useWorld } from '../worldStore';

const MAX = 48;
const STEP = 1.6;

/** Animated chevrons on the ground from the player to the current target, bending around buildings. */
export default function GroundPath({ terrain }: { terrain: TerrainData }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const route = useRef<{ pts: P2[]; from: P2; to: P2 } | null>(null);
  const geo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.55, -0.25);
    s.lineTo(0, 0.3);
    s.lineTo(0.55, -0.25);
    s.lineTo(0.55, 0.05);
    s.lineTo(0, 0.6);
    s.lineTo(-0.55, 0.05);
    s.closePath();
    const g = new THREE.ShapeGeometry(s);
    g.rotateX(Math.PI / 2); // tip (+y) points forward (+z)
    return g;
  }, []);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#7fd8ff', transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }), []);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const v = useMemo(() => new THREE.Vector3(), []);
  const one = useMemo(() => new THREE.Vector3(1, 1, 1), []);

  useFrame(({ clock }) => {
    const im = mesh.current;
    if (!im) return;
    const st = useGame.getState();
    const target = st.screen === 'play' && !st.modal ? currentTargetPos(st.game, st.action) : null;
    const p = useWorld.getState().player;
    if (!target || Math.hypot(target.x - p.x, target.z - p.z) < 3) {
      im.count = 0;
      return;
    }
    const urgent = st.action?.objective === 'shelter';
    mat.color.set(urgent ? '#ff6a4a' : '#7fd8ff');
    const r = route.current;
    const moved = !r || Math.hypot(r.from.x - p.x, r.from.z - p.z) > 1.5 || r.to.x !== target.x || r.to.z !== target.z;
    if (moved) {
      const a = { x: p.x, z: p.z };
      const b = { x: target.x, z: target.z };
      const far = Math.hypot(b.x - a.x, b.z - a.z) > 90;
      route.current = { pts: far ? [a, b] : routeAround(a, b), from: a, to: b };
    }
    const pts = route.current!.pts.slice();
    pts[0] = { x: p.x, z: p.z };
    // chevrons flow toward the target
    const offset = (clock.elapsedTime * 2.2) % STEP;
    let n = 0;
    let carry = 1.2 + offset;
    for (let i = 0; i < pts.length - 1 && n < MAX; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      const yaw = Math.atan2(b.x - a.x, b.z - a.z);
      let d = carry;
      while (d < len - 0.6 && n < MAX) {
        const x = a.x + ((b.x - a.x) * d) / len;
        const z = a.z + ((b.z - a.z) * d) / len;
        q.setFromAxisAngle(up, yaw);
        const fade = 1 - n / MAX;
        m.compose(v.set(x, heightAt(terrain, x, z) + 0.09, z), q, one.set(fade, 1, fade));
        im.setMatrixAt(n++, m);
        d += STEP;
      }
      carry = d - len;
    }
    im.count = n;
    im.instanceMatrix.needsUpdate = true;
    mat.opacity = 0.6 + Math.sin(clock.elapsedTime * 4) * 0.2;
  });

  return <instancedMesh ref={mesh} args={[geo, mat, MAX]} frustumCulled={false} renderOrder={2} />;
}
