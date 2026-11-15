/** Shared input state, written by keyboard / pointer / touch handlers and read every frame. */
export const input = {
  moveX: 0, // -1..1 (strafe, + = right)
  moveY: 0, // -1..1 (+ = forward)
  run: false,
  interact: false, // edge-triggered, consumed by the interaction system
  camYaw: 0.15, // radians
  camPitch: 0.32,
  camDist: 7.5,
  locked: false, // UI modal open: ignore movement
};

const keys = new Set<string>();

function update() {
  const f = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
  const r = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
  if (!touchActive) {
    input.moveY = f;
    input.moveX = r;
  }
  input.run = keys.has('ShiftLeft') || keys.has('ShiftRight');
}

let touchActive = false;
export function setTouchMove(x: number, y: number, active: boolean) {
  touchActive = active;
  input.moveX = x;
  input.moveY = y;
  input.run = Math.hypot(x, y) > 0.92;
}

export function installInput(el: HTMLElement): () => void {
  const down = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement) return;
    if (e.code === 'KeyE' || e.code === 'Enter') input.interact = true;
    keys.add(e.code);
    update();
  };
  const up = (e: KeyboardEvent) => {
    keys.delete(e.code);
    update();
  };
  let dragging = false;
  let lx = 0;
  let ly = 0;
  let pid = -1;
  const pdown = (e: PointerEvent) => {
    if (e.target !== el) return;
    dragging = true;
    pid = e.pointerId;
    lx = e.clientX;
    ly = e.clientY;
  };
  const pmove = (e: PointerEvent) => {
    if (!dragging || e.pointerId !== pid) return;
    const dx = e.clientX - lx;
    const dy = e.clientY - ly;
    lx = e.clientX;
    ly = e.clientY;
    input.camYaw -= dx * 0.006;
    input.camPitch = Math.min(1.2, Math.max(-0.05, input.camPitch + dy * 0.004));
  };
  const pup = (e: PointerEvent) => {
    if (e.pointerId === pid) dragging = false;
  };
  const wheel = (e: WheelEvent) => {
    input.camDist = Math.min(14, Math.max(3.5, input.camDist + e.deltaY * 0.004));
  };
  const blur = () => {
    keys.clear();
    update();
  };
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', blur);
  el.addEventListener('pointerdown', pdown);
  window.addEventListener('pointermove', pmove);
  window.addEventListener('pointerup', pup);
  el.addEventListener('wheel', wheel, { passive: true });
  return () => {
    window.removeEventListener('keydown', down);
    window.removeEventListener('keyup', up);
    window.removeEventListener('blur', blur);
    el.removeEventListener('pointerdown', pdown);
    window.removeEventListener('pointermove', pmove);
    window.removeEventListener('pointerup', pup);
    el.removeEventListener('wheel', wheel);
  };
}

if (import.meta.env.DEV && typeof window !== 'undefined') (window as unknown as { __input: typeof input }).__input = input;
