import { useLoader } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import { groundDetail } from '../textures';
import type { TerrainData } from '../terrain';

const DARK = new THREE.Color('#4a2a1c');
const BRIGHT = new THREE.Color('#d0915e');

function makeMaterial(ortho: THREE.Texture | null, detail: ReturnType<typeof groundDetail>, detailRepeat: number) {
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.96, metalness: 0 });
  if (ortho) mat.map = ortho;
  const normal = detail.normal.clone();
  normal.needsUpdate = true;
  normal.repeat.set(detailRepeat, detailRepeat);
  mat.normalMap = normal;
  mat.normalScale = new THREE.Vector2(0.9, 0.9);
  const albedo = detail.albedo;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uDetail = { value: albedo };
    shader.uniforms.uDark = { value: DARK };
    shader.uniforms.uBright = { value: BRIGHT };
    shader.uniforms.uHasOrtho = { value: ortho ? 1 : 0 };
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform sampler2D uDetail; uniform vec3 uDark; uniform vec3 uBright; uniform float uHasOrtho;`,
      )
      .replace(
        '#include <map_fragment>',
        `
        float lum = 0.55;
        #ifdef USE_MAP
          lum = texture2D(map, vMapUv).r;
        #endif
        lum = mix(0.55, lum, uHasOrtho);
        vec3 ground = mix(uDark, uBright, mix(0.62, smoothstep(0.05, 0.95, lum), 0.5));
        #ifdef USE_NORMALMAP
          vec3 det = texture2D(uDetail, vNormalMapUv).rgb;
          vec3 det2 = texture2D(uDetail, vNormalMapUv * 0.137 + 0.31).rgb;
          ground *= mix(det, vec3(1.0), 0.35) * mix(det2, vec3(1.0), 0.5) * 1.35;
        #endif
        diffuseColor.rgb *= ground;
        `,
      );
  };
  return mat;
}

function buildGeometry(heights: Float32Array, n: number, size: number, datum: number, edgeBlend?: (x: number, z: number, h: number) => number) {
  const geo = new THREE.PlaneGeometry(size, size, n - 1, n - 1);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    let h = heights[i] - datum;
    if (edgeBlend) h = edgeBlend(x, z, h);
    pos.setY(i, h);
  }
  geo.computeVertexNormals();
  return geo;
}

export default function Terrain({ data }: { data: TerrainData }) {
  const ortho = useLoader(THREE.TextureLoader, './terrain/ortho.png');
  const { nearGeo, farGeo, nearMat, farMat } = useMemo(() => {
    ortho.colorSpace = THREE.NoColorSpace;
    ortho.anisotropy = 8;
    const detail = groundDetail(512);
    const { meta, near, far, datum } = data;
    // align the far map (CTX) to the near map (HiRISE) along the play-area edge
    const half = meta.near.size / 2;
    const sampleFar = (x: number, z: number) => {
      const n = meta.far.n;
      const u = Math.round((x / meta.far.size + 0.5) * (n - 1));
      const v = Math.round((z / meta.far.size + 0.5) * (n - 1));
      return far[Math.max(0, Math.min(n - 1, v)) * n + Math.max(0, Math.min(n - 1, u))];
    };
    const sampleNear = (x: number, z: number) => {
      const n = meta.near.n;
      const u = Math.round((x / meta.near.size + 0.5) * (n - 1));
      const v = Math.round((z / meta.near.size + 0.5) * (n - 1));
      return near[Math.max(0, Math.min(n - 1, v)) * n + Math.max(0, Math.min(n - 1, u))];
    };
    let diff = 0;
    let cnt = 0;
    for (let t = -half; t <= half; t += 32) {
      for (const [x, z] of [[t, -half], [t, half], [-half, t], [half, t]]) {
        diff += sampleNear(x, z) - sampleFar(x, z);
        cnt++;
      }
    }
    const farOffset = diff / cnt;
    const farGeo = buildGeometry(far, meta.far.n, meta.far.size, datum - farOffset, (x, z, h) => {
      // sink the far terrain under the play area so it never pokes through
      const inside = Math.abs(x) < half - 40 && Math.abs(z) < half - 40;
      return inside ? h - 6 : h;
    });
    const nearGeo = buildGeometry(near, meta.near.n, meta.near.size, datum, (x, z, h) => {
      // blend the last 60 m of the play area into the horizon terrain
      const edge = Math.min(half - Math.abs(x), half - Math.abs(z));
      if (edge > 60) return h;
      const t = Math.max(0, edge) / 60;
      const farH = sampleFar(x, z) + farOffset - datum;
      return farH + (h - farH) * (t * t * (3 - 2 * t));
    });
    const nearMat = makeMaterial(ortho, detail, meta.near.size / 3.2);
    const farMat = makeMaterial(null, detail, meta.far.size / 25);
    return { nearGeo, farGeo, nearMat, farMat };
  }, [data, ortho]);

  return (
    <group>
      <mesh geometry={nearGeo} material={nearMat} receiveShadow />
      <mesh geometry={farGeo} material={farMat} receiveShadow />
    </group>
  );
}
