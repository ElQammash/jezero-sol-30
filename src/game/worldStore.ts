import * as THREE from 'three';
import { create } from 'zustand';

/** Visual state of the world (not game rules): time of day, dust, player position. */
interface WorldState {
  /** 0..1 through the sol; 0.25 = sunrise, 0.5 = noon, 0.75 = sunset. */
  time: number;
  sunDir: THREE.Vector3;
  dust: number; // 0..1 storm haze
  flash: number; // solar particle event alert, 0..1
  player: THREE.Vector3;
  setTime: (t: number) => void;
  setDust: (d: number) => void;
}

export function sunDirection(time: number): THREE.Vector3 {
  // simple sun path: rises in the east (+x), sets in the west (-x), tilted south
  const a = (time - 0.25) * Math.PI * 2;
  return new THREE.Vector3(Math.cos(a), Math.sin(a), 0.35).normalize();
}

export const useWorld = create<WorldState>((set) => ({
  time: 0.36,
  sunDir: sunDirection(0.36),
  dust: 0,
  flash: 0,
  player: new THREE.Vector3(5, 0, 30),
  setTime: (t) => set({ time: t, sunDir: sunDirection(t) }),
  setDust: (d) => set({ dust: d }),
}));

if (import.meta.env.DEV) (window as unknown as { __world: typeof useWorld }).__world = useWorld;
