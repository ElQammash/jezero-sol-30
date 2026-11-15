import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useWorld } from '../worldStore';

/**
 * Mars sky: butterscotch by day, and BLUE around the setting sun (fine dust
 * scatters red light out of the long sunset path — NASA Curiosity, 2015).
 */
const vert = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize((modelMatrix * vec4(position, 1.0)).xyz - cameraPosition);
  vec4 p = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}`;

const frag = /* glsl */ `
uniform vec3 uSun;
uniform float uDust;
varying vec3 vDir;
float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
void main() {
  vec3 d = normalize(vDir);
  float e = uSun.y;
  float day = smoothstep(-0.14, 0.18, e);
  float low = 1.0 - smoothstep(0.0, 0.45, abs(e));          // sun near the horizon
  float h = clamp(d.y, -0.2, 1.0);
  vec3 zenithDay = vec3(0.58, 0.40, 0.27);
  vec3 horizonDay = vec3(0.86, 0.62, 0.43);
  vec3 sky = mix(horizonDay, zenithDay, pow(max(h, 0.0), 0.55));
  vec3 zenithNight = vec3(0.012, 0.014, 0.025);
  vec3 horizonNight = vec3(0.05, 0.035, 0.03);
  vec3 night = mix(horizonNight, zenithNight, pow(max(h, 0.0), 0.5));
  vec3 col = mix(night, sky, day);
  float cosA = max(dot(d, normalize(uSun)), 0.0);
  // blue aureole around the sun, strongest near sunrise/sunset
  float aureole = pow(cosA, 12.0);
  col += vec3(0.25, 0.45, 0.75) * aureole * (0.25 + 1.1 * low) * smoothstep(-0.2, 0.05, e);
  // warm forward glow
  col += vec3(1.0, 0.85, 0.65) * pow(cosA, 120.0) * 0.9 * day;
  // sun disc (smaller than from Earth)
  col += vec3(1.0, 0.97, 0.9) * smoothstep(0.99975, 0.99992, cosA) * 6.0 * smoothstep(-0.05, 0.02, e);
  // stars
  if (day < 0.6) {
    vec3 sp = floor(d * 420.0);
    float s = hash(sp);
    col += vec3(0.9, 0.92, 1.0) * step(0.9975, s) * (1.0 - day / 0.6) * smoothstep(-0.05, 0.2, d.y);
  }
  // dust storm: thick brown haze swallows everything
  vec3 storm = mix(vec3(0.20, 0.11, 0.06), vec3(0.55, 0.33, 0.19), day);
  col = mix(col, storm * (0.8 + 0.3 * pow(cosA, 4.0)), uDust);
  // ground below the horizon is never seen (terrain covers it) but keep it dark
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

export function skyColorAt(sunY: number, dust: number): THREE.Color {
  const day = THREE.MathUtils.smoothstep(sunY, -0.14, 0.18);
  const c = new THREE.Color(0.05, 0.035, 0.03).lerp(new THREE.Color(0.86, 0.62, 0.43), day);
  const storm = new THREE.Color(0.2, 0.11, 0.06).lerp(new THREE.Color(0.55, 0.33, 0.19), day);
  return c.lerp(storm, dust);
}

export default function Sky() {
  const ref = useRef<THREE.Mesh>(null);
  const { scene } = useThree();
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        uniforms: { uSun: { value: new THREE.Vector3(0, 1, 0) }, uDust: { value: 0 } },
        side: THREE.BackSide,
        depthWrite: false,
      }),
    [],
  );
  useFrame(({ camera }) => {
    const w = useWorld.getState();
    mat.uniforms.uSun.value.copy(w.sunDir);
    mat.uniforms.uDust.value = w.dust;
    if (ref.current) ref.current.position.copy(camera.position);
    const fogColor = skyColorAt(w.sunDir.y, w.dust).multiplyScalar(0.92);
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.color.copy(fogColor);
      scene.fog.density = 0.00011 + w.dust * 0.012;
    }
  });
  return (
    <mesh ref={ref} material={mat} frustumCulled={false} renderOrder={-1}>
      <sphereGeometry args={[1000, 48, 24]} />
    </mesh>
  );
}
