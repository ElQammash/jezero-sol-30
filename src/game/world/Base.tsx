import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { GameState } from '../../engine';
import { TUNING } from '../../engine';
import { heightAt, type TerrainData } from '../terrain';
import { useT } from '../useT';
import { panelTexture, solarTexture } from '../textures';

/** Where each part of the colony stands (metres from the landing site). */
export const SITES = {
  habitat: new THREE.Vector3(0, 0, 0),
  greenhouse: new THREE.Vector3(-22, 0, 8),
  solar: new THREE.Vector3(30, 0, -4),
  power: new THREE.Vector3(14, 0, 12),
  moxie: new THREE.Vector3(-12, 0, -14),
  comms: new THREE.Vector3(-26, 0, -20),
  lander: new THREE.Vector3(42, 0, 34),
  garage: new THREE.Vector3(10, 0, -24),
  iceDrill: new THREE.Vector3(150, 0, -110),
  reactor: new THREE.Vector3(-170, 0, 140),
  tower: new THREE.Vector3(16, 0, -9),
  lab: new THREE.Vector3(-4, 0, -20),
  robot: new THREE.Vector3(20, 0, -27),
} as const;
export type SiteId = keyof typeof SITES;

/** Simple circle colliders for the player (x, z, radius). */
export const COLLIDERS: [SiteId, number][] = [
  ['habitat', 7.2],
  ['greenhouse', 7.5],
  ['power', 2.6],
  ['moxie', 1.8],
  ['comms', 1.5],
  ['lander', 5.5],
  ['garage', 3.5],
  ['iceDrill', 3],
  ['reactor', 2.5],
  ['tower', 3.4],
  ['lab', 4.6],
  ['robot', 1.9],
];

/** Pressurised tunnels between modules: [from, to, radius of from, radius of to]. */
const TUNNELS: [SiteId, SiteId, number, number][] = [
  ['habitat', 'greenhouse', 6.2, 7.2],
  ['habitat', 'lab', 6.2, 4.4],
  ['habitat', 'tower', 6.2, 3.2],
];

export interface Segment {
  ax: number;
  az: number;
  bx: number;
  bz: number;
  r: number;
}

/** Capsule colliders for long shapes: tunnels, the lab module and each row of solar panels. */
export const SEGMENTS: Segment[] = (() => {
  const out: Segment[] = [];
  for (const [a, b, ra, rb] of TUNNELS) {
    const A = SITES[a];
    const B = SITES[b];
    const dx = B.x - A.x;
    const dz = B.z - A.z;
    const len = Math.hypot(dx, dz);
    const ux = dx / len;
    const uz = dz / len;
    out.push({ ax: A.x + ux * ra, az: A.z + uz * ra, bx: B.x - ux * rb, bz: B.z - uz * rb, r: 1.8 });
  }
  const rotated = (site: SiteId, rot: number, x: number, z: number) => {
    const c = SITES[site];
    // matches three.js Y rotation of the placed group
    return [c.x + x * Math.cos(rot) + z * Math.sin(rot), c.z - x * Math.sin(rot) + z * Math.cos(rot)] as const;
  };
  // lab: a 9 m tube with rounded ends, rotated 0.3 rad
  {
    const [ax, az] = rotated('lab', 0.3, -6.6, 0);
    const [bx, bz] = rotated('lab', 0.3, 6.6, 0);
    out.push({ ax, az, bx, bz, r: 2.6 });
  }
  // solar field: 4 rows of panels; the gaps between rows stay walkable
  for (let r = 0; r < 4; r++) {
    const z = r * 5 - 7.5;
    const [ax, az] = rotated('solar', 0.05, -13.2, z);
    const [bx, bz] = rotated('solar', 0.05, 13.2, z);
    out.push({ ax, az, bx, bz, r: 1.45 });
  }
  return out;
})();

function useMaterials() {
  return useMemo(() => {
    const panel = panelTexture();
    const hull = new THREE.MeshStandardMaterial({ map: panel, roughness: 0.55, metalness: 0.35, color: '#f1eee8' });
    const hullDark = new THREE.MeshStandardMaterial({ color: '#5d6066', roughness: 0.5, metalness: 0.6 });
    const trim = new THREE.MeshStandardMaterial({ color: '#c8742f', roughness: 0.6, metalness: 0.2 });
    const glass = new THREE.MeshPhysicalMaterial({
      color: '#cfe6ff', roughness: 0.05, metalness: 0, transmission: 0.85, thickness: 0.4, transparent: true, opacity: 0.55, ior: 1.45,
    });
    const window = new THREE.MeshStandardMaterial({ color: '#2a1d10', emissive: '#ffb860', emissiveIntensity: 2.2, roughness: 0.3 });
    const solar = new THREE.MeshStandardMaterial({ map: solarTexture(), roughness: 0.25, metalness: 0.6 });
    const frame = new THREE.MeshStandardMaterial({ color: '#9a9a9a', roughness: 0.4, metalness: 0.8 });
    const regolith = new THREE.MeshStandardMaterial({ color: '#8a4b2c', roughness: 1 });
    const leaf = new THREE.MeshStandardMaterial({ color: '#4e9a3a', roughness: 0.8 });
    const growLight = new THREE.MeshStandardMaterial({ color: '#ff5cf0', emissive: '#ff4fe0', emissiveIntensity: 1.6 });
    return { hull, hullDark, trim, glass, window, solar, frame, regolith, leaf, growLight };
  }, []);
}

type Mats = ReturnType<typeof useMaterials>;

function Placed({ terrain, at, children, rot = 0 }: { terrain: TerrainData; at: THREE.Vector3; children: React.ReactNode; rot?: number }) {
  const y = heightAt(terrain, at.x, at.z);
  return (
    <group position={[at.x, y, at.z]} rotation={[0, rot, 0]}>
      {children}
    </group>
  );
}

/** A small marker stone near the habitat for each crewmember who died. */
function Memorial({ game }: { game: GameState }) {
  const { t } = useT();
  const fallen = game.crew.filter((c) => !c.alive);
  if (!fallen.length) return null;
  return (
    <group position={[-12, 0, 16]}>
      <mesh position={[0, 0.7, 0]} castShadow>
        <boxGeometry args={[1.4, 1.4, 0.35]} />
        <meshStandardMaterial color="#6d5a4c" roughness={0.9} />
      </mesh>
      <Html position={[0, 2.1, 0]} center distanceFactor={14} zIndexRange={[3, 0]} style={{ pointerEvents: 'none' }}>
        <div className="memorial">🕯 {fallen.map((c) => t(`names.${c.id}`)).join(' · ')}</div>
      </Html>
    </group>
  );
}

function Habitat({ m, game }: { m: Mats; game: GameState }) {
  const buried = game.habitat === 'underground' ? (game.buildSolsLeft > 0 ? 1 - game.buildSolsLeft / 3 : 1) : 0;
  const surfaceShield = game.habitat === 'surface' ? Math.max(0, (game.shield - 40) / 60) : 0;
  const lightsOn = useRef<THREE.Group>(null);
  return (
    <group>
      {/* main pressurised module */}
      <mesh material={m.hull} castShadow receiveShadow position={[0, 2.6, 0]}>
        <cylinderGeometry args={[6, 6.3, 5.2, 40, 1]} />
      </mesh>
      <mesh material={m.hull} castShadow position={[0, 5.2, 0]}>
        <sphereGeometry args={[6, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh material={m.trim} position={[0, 0.25, 0]}>
        <cylinderGeometry args={[6.45, 6.6, 0.5, 40]} />
      </mesh>
      <group ref={lightsOn}>
        {Array.from({ length: 10 }, (_, i) => {
          const a = (i / 10) * Math.PI * 2;
          return (
            <mesh key={i} material={m.window} position={[Math.cos(a) * 6.02, 3.3, Math.sin(a) * 6.02]} rotation={[0, -a + Math.PI / 2, 0]}>
              <boxGeometry args={[1.1, 0.7, 0.1]} />
            </mesh>
          );
        })}
      </group>
      {/* airlock */}
      <group position={[0, 0, 7.2]}>
        <mesh material={m.hull} castShadow position={[0, 1.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[1.6, 1.6, 3.4, 24]} />
        </mesh>
        <mesh material={m.hullDark} position={[0, 1.6, 1.75]}>
          <boxGeometry args={[1.4, 2.2, 0.15]} />
        </mesh>
        <mesh material={m.window} position={[0, 2.95, 1.2]}>
          <boxGeometry args={[0.6, 0.12, 0.1]} />
        </mesh>
      </group>
      {/* antenna + lights on top */}
      <mesh material={m.frame} position={[0, 12.5, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 3, 6]} />
      </mesh>
      <mesh position={[0, 14.1, 0]}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshStandardMaterial color="#ff2a1a" emissive="#ff2a1a" emissiveIntensity={4} />
      </mesh>
      {/* medbay: a red cross lights up while a patient is being treated */}
      {game.medical && game.medical.solsLeft > 0 && (
        <group position={[0, 9.5, 0]}>
          <mesh>
            <boxGeometry args={[1.6, 0.45, 0.2]} />
            <meshStandardMaterial color="#000" emissive="#ff3344" emissiveIntensity={4} />
          </mesh>
          <mesh>
            <boxGeometry args={[0.45, 1.6, 0.2]} />
            <meshStandardMaterial color="#000" emissive="#ff3344" emissiveIntensity={4} />
          </mesh>
          <pointLight color="#ff4455" intensity={12} distance={14} />
        </group>
      )}
      {/* regolith piled on the roof (surface habitat) */}
      {surfaceShield > 0.02 && (
        <mesh material={m.regolith} position={[0, 4.2, 0]} scale={[1, 0.35 + surfaceShield * 0.65, 1]} castShadow>
          <sphereGeometry args={[6.9, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
      )}
      {/* underground: a berm of regolith grows over the module */}
      {buried > 0 && (
        <mesh material={m.regolith} position={[0, -0.5, 0]} scale={[1, 0.25 + buried * 0.75, 1]} castShadow receiveShadow>
          <sphereGeometry args={[11, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
      )}
    </group>
  );
}

function Greenhouse({ m, game }: { m: Mats; game: GameState }) {
  const active = game.lifeSupport === 'greenhouse';
  const growth = active ? Math.min(1, game.greenhouseAge / 6) * game.greenhouseHealth : 0;
  const leafColor = useMemo(() => new THREE.Color(), []);
  leafColor.set(game.greenhouseHealth > 0.6 ? '#4e9a3a' : game.greenhouseHealth > 0.3 ? '#9a9a3a' : '#7a5a30');
  m.leaf.color.copy(leafColor);
  return (
    <group>
      <mesh material={m.trim} position={[0, 0.3, 0]}>
        <cylinderGeometry args={[7.2, 7.4, 0.6, 40]} />
      </mesh>
      <mesh material={m.glass} position={[0, 0.6, 0]}>
        <sphereGeometry args={[7, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      {/* frame ribs */}
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} material={m.frame} position={[0, 0.6, 0]} rotation={[0, (i / 8) * Math.PI, 0]}>
          <torusGeometry args={[7.02, 0.05, 6, 40, Math.PI]} />
        </mesh>
      ))}
      {active &&
        Array.from({ length: 5 }, (_, row) =>
          Array.from({ length: 6 }, (_, col) => {
            const x = -4 + col * 1.6;
            const z = -3.2 + row * 1.6;
            if (x * x + z * z > 30) return null;
            const s = 0.15 + growth * 0.85;
            return (
              <group key={`${row}-${col}`} position={[x, 0.9, z]}>
                <mesh material={m.hullDark} position={[0, -0.1, 0]}>
                  <boxGeometry args={[1.2, 0.3, 1.2]} />
                </mesh>
                <mesh material={m.leaf} scale={[s, s, s]} position={[0, 0.35 * s, 0]}>
                  <icosahedronGeometry args={[0.55, 0]} />
                </mesh>
              </group>
            );
          }),
        )}
      {active && game.settings.greenhouseOn && <mesh material={m.growLight} position={[0, 4.5, 0]}><torusGeometry args={[3, 0.08, 6, 30]} /></mesh>}
      {active && <CropBadge game={game} />}
    </group>
  );
}

/** Harvest countdown over the farm, with the honest note about real growing times. */
function CropBadge({ game }: { game: GameState }) {
  const { t, n } = useT();
  const left = Math.max(0, Math.ceil(TUNING.greenhouseRampSols - game.greenhouseAge));
  const wilting = game.greenhouseHealth < 0.6 || !game.settings.greenhouseOn;
  const stage = game.greenhouseAge < 1.5 ? 'seed' : game.greenhouseAge < TUNING.greenhouseRampSols * 0.6 ? 'sprout' : left > 0 ? 'flower' : 'harvest';
  return (
    <Html position={[0, 8.2, 0]} center distanceFactor={22} zIndexRange={[3, 0]} style={{ pointerEvents: 'none' }}>
      <div className={`crop-badge ${wilting ? 'wilt' : ''}`}>
        <b>
          {stage === 'seed' ? '🌰' : stage === 'sprout' ? '🌱' : stage === 'flower' ? '🌿' : '🥔'} {t(`crops.${stage}`)}
        </b>
        <small>{left > 0 ? t('crops.harvestIn', { n: n(left) }) : t('crops.harvesting')}</small>
        {wilting && <small className="bad">{t('crops.wilting')}</small>}
        <em>{t('crops.note')}</em>
      </div>
    </Html>
  );
}

function SolarField({ m, game }: { m: Mats; game: GameState }) {
  const dust = 1 - game.panelClean;
  const mat = useMemo(() => m.solar.clone(), [m.solar]);
  mat.color.setRGB(1 - dust * 0.6, 1 - dust * 0.75, 1 - dust * 0.85);
  return (
    <group>
      {Array.from({ length: 4 }, (_, r) =>
        Array.from({ length: 6 }, (_, c) => (
          <group key={`${r}-${c}`} position={[c * 4.4 - 11, 0, r * 5 - 7.5]}>
            <mesh material={m.frame} position={[0, 0.7, 0]}>
              <cylinderGeometry args={[0.05, 0.05, 1.4, 6]} />
            </mesh>
            <mesh material={mat} position={[0, 1.45, 0]} rotation={[-0.45, 0, 0]} castShadow receiveShadow>
              <boxGeometry args={[4, 0.06, 2.2]} />
            </mesh>
          </group>
        )),
      )}
    </group>
  );
}

function Comms({ m, damaged }: { m: Mats; damaged: boolean }) {
  const dish = useRef<THREE.Group>(null);
  const warn = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }, dt) => {
    if (dish.current && !damaged) dish.current.rotation.y += dt * 0.05;
    if (warn.current) warn.current.emissiveIntensity = damaged && Math.sin(clock.elapsedTime * 6) > 0 ? 5 : 0.2;
  });
  return (
    <group>
      <mesh material={m.frame} position={[0, 3, 0]}>
        <cylinderGeometry args={[0.18, 0.3, 6, 8]} />
      </mesh>
      <mesh position={[0, 6.1, 0]}>
        <sphereGeometry args={[0.16, 8, 8]} />
        <meshStandardMaterial ref={warn} color="#000" emissive="#ff2a1a" emissiveIntensity={0.2} />
      </mesh>
      <group ref={dish} position={[0, 6.2, 0]} rotation={damaged ? [0.7, 0.4, 0.5] : [0, 0, 0]}>
        <mesh material={m.hull} rotation={[-0.9, 0, 0]} castShadow>
          <sphereGeometry args={[2.2, 32, 10, 0, Math.PI * 2, 0, 0.6]} />
        </mesh>
        <mesh material={m.frame} position={[0, 0.6, 0.6]} rotation={[-0.9, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 1.6, 6]} />
        </mesh>
      </group>
    </group>
  );
}

function Lander({ m }: { m: Mats }) {
  return (
    <group>
      <mesh material={m.hull} castShadow position={[0, 9, 0]}>
        <cylinderGeometry args={[3.6, 4, 15, 32]} />
      </mesh>
      <mesh material={m.hull} castShadow position={[0, 18, 0]}>
        <coneGeometry args={[3.6, 5, 32]} />
      </mesh>
      <mesh material={m.hullDark} position={[0, 1.2, 0]}>
        <cylinderGeometry args={[4, 3.2, 2.4, 32]} />
      </mesh>
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + 0.4;
        return (
          <mesh key={i} material={m.frame} position={[Math.cos(a) * 4.6, 1.6, Math.sin(a) * 4.6]} rotation={[Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5]} castShadow>
            <cylinderGeometry args={[0.12, 0.12, 4, 6]} />
          </mesh>
        );
      })}
      {[6, 10, 14].map((y) => (
        <mesh key={y} material={m.window} position={[0, y, 3.62]}>
          <boxGeometry args={[0.6, 0.6, 0.1]} />
        </mesh>
      ))}
    </group>
  );
}

function PowerHub({ m, game }: { m: Mats; game: GameState }) {
  const charge = game.battery / 300;
  return (
    <group>
      <mesh material={m.hull} castShadow receiveShadow position={[0, 1.1, 0]}>
        <boxGeometry args={[4, 2.2, 2.6]} />
      </mesh>
      {Array.from({ length: 5 }, (_, i) => (
        <mesh key={i} position={[-1.6 + i * 0.8, 1.6, 1.32]}>
          <boxGeometry args={[0.5, 0.18, 0.04]} />
          <meshStandardMaterial
            color={i / 5 < charge ? '#3cff7a' : '#331'}
            emissive={i / 5 < charge ? '#2bff6a' : '#000'}
            emissiveIntensity={i / 5 < charge ? 2.5 : 0}
          />
        </mesh>
      ))}
    </group>
  );
}

function Moxie({ m, game }: { m: Mats; game: GameState }) {
  const on = game.settings.moxieOn;
  return (
    <group>
      <mesh material={m.hull} castShadow position={[0, 0.9, 0]}>
        <boxGeometry args={[2.4, 1.8, 1.8]} />
      </mesh>
      <mesh material={m.frame} position={[0, 2.2, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 0.8, 12]} />
      </mesh>
      <mesh position={[0.9, 1.5, 0.92]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color={on ? '#5cf' : '#222'} emissive={on ? '#5cf' : '#000'} emissiveIntensity={3} />
      </mesh>
    </group>
  );
}

function Garage({ m, game }: { m: Mats; game: GameState }) {
  const present = game.roverAt === 'base' && game.rover !== 'lost';
  return (
    <group>
      <mesh material={m.frame} position={[0, 2.6, 0]}>
        <boxGeometry args={[7, 0.15, 5]} />
      </mesh>
      {[[-3.4, -2.4], [3.4, -2.4], [-3.4, 2.4], [3.4, 2.4]].map(([x, z], i) => (
        <mesh key={i} material={m.frame} position={[x, 1.3, z]}>
          <cylinderGeometry args={[0.08, 0.08, 2.6, 6]} />
        </mesh>
      ))}
      {present && <Rover m={m} />}
    </group>
  );
}

/** A six-wheeled pressurised rover (generic design). */
export function Rover({ m }: { m: Mats }) {
  return (
    <group position={[0, 0, 0]}>
      <mesh material={m.hull} castShadow position={[0, 1.3, 0]}>
        <boxGeometry args={[2.4, 1.4, 4.2]} />
      </mesh>
      <mesh material={m.window} position={[0, 1.55, 2.12]}>
        <boxGeometry args={[1.8, 0.5, 0.05]} />
      </mesh>
      {[-1.5, 0, 1.5].map((z) =>
        [-1.35, 1.35].map((x) => (
          <mesh key={`${x}${z}`} material={m.hullDark} position={[x, 0.45, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.45, 0.45, 0.4, 16]} />
          </mesh>
        )),
      )}
    </group>
  );
}

function IceDrill({ m, game }: { m: Mats; game: GameState }) {
  const spin = useRef<THREE.Mesh>(null);
  const on = game.settings.icePlantOn && game.rover === 'ok';
  useFrame((_, dt) => {
    if (spin.current && on) spin.current.rotation.y += dt * 3;
  });
  return (
    <group>
      <mesh material={m.frame} position={[0, 4, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 8, 6]} />
      </mesh>
      <mesh ref={spin} material={m.trim} position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.6, 0.2, 2.4, 8]} />
      </mesh>
      <mesh material={m.hull} position={[2.2, 1, 0]} castShadow>
        <boxGeometry args={[2.6, 2, 2]} />
      </mesh>
      {game.roverAt === 'iceSite' && game.rover !== 'lost' && (
        <group position={[-4, 0, 2]} rotation={[0, 0.6, 0]}>
          <Rover m={m} />
        </group>
      )}
    </group>
  );
}

function Reactor({ m, game }: { m: Mats; game: GameState }) {
  return (
    <group>
      <mesh material={m.regolith} position={[0, 0, 0]} scale={[1, 0.35, 1]}>
        <sphereGeometry args={[6, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh material={m.hullDark} position={[0, 2.5, 0]} castShadow>
        <cylinderGeometry args={[0.6, 0.9, 3, 16]} />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} material={m.frame} position={[0, 4.2, 0]} rotation={[0, (i * Math.PI) / 4, 0]}>
          <coneGeometry args={[2.2, 3.5, 4, 1, true]} />
        </mesh>
      ))}
      <mesh position={[0, 6.2, 0]}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshStandardMaterial color="#000" emissive={game.reactorOn ? '#3cff7a' : '#ff8a2a'} emissiveIntensity={4} />
      </mesh>
      {game.reactorOn && <pointLight position={[0, 5, 0]} color="#7dffb0" intensity={40} distance={22} />}
    </group>
  );
}

function Rocks({ terrain }: { terrain: TerrainData }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const count = 900;
  const { geo, mat, matrices, colors } = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(1, 2);
    const p = geo.attributes.position as THREE.BufferAttribute;
    let s = 12345;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < p.count; i++) {
      const k = 0.8 + rnd() * 0.35;
      p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.7, p.getZ(i) * k);
    }
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.92 });
    const colors: THREE.Color[] = [];
    const matrices: THREE.Matrix4[] = [];
    const tmp = new THREE.Object3D();
    let placed = 0;
    while (placed < count) {
      const r = 14 + rnd() * 380;
      const a = rnd() * Math.PI * 2;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      // keep the colony area clear
      if (Math.hypot(x - 10, z) < 62) continue; // keep the colony and the walkways clear
      const size = Math.pow(rnd(), 3) * 1.6 + 0.08;
      tmp.position.set(x, heightAt(terrain, x, z) + size * 0.2, z);
      tmp.rotation.set(rnd() * 0.5, rnd() * Math.PI * 2, rnd() * 0.5);
      tmp.scale.setScalar(size);
      tmp.updateMatrix();
      matrices.push(tmp.matrix.clone());
      colors.push(new THREE.Color().setHSL(0.045 + rnd() * 0.02, 0.35 + rnd() * 0.2, 0.17 + rnd() * 0.14));
      placed++;
    }
    return { geo, mat, matrices, colors };
  }, [terrain]);
  return (
    <instancedMesh
      ref={(r) => {
        (ref as React.MutableRefObject<THREE.InstancedMesh | null>).current = r;
        if (r) {
          matrices.forEach((mm, i) => {
            r.setMatrixAt(i, mm);
            r.setColorAt(i, colors[i]);
          });
          if (r.instanceColor) r.instanceColor.needsUpdate = true;
          r.instanceMatrix.needsUpdate = true;
        }
      }}
      args={[geo, mat, count]}
      castShadow
      receiveShadow
    />
  );
}

function Tunnel({ m, terrain, a, b, ra, rb }: { m: Mats; terrain: TerrainData; a: THREE.Vector3; b: THREE.Vector3; ra: number; rb: number }) {
  const dir = b.clone().sub(a).setY(0);
  const full = dir.length();
  dir.normalize();
  const start = a.clone().addScaledVector(dir, ra - 0.5);
  const len = full - ra - rb + 1;
  const mid = start.clone().addScaledVector(dir, len / 2);
  const y = Math.min(heightAt(terrain, a.x, a.z), heightAt(terrain, b.x, b.z));
  const yaw = Math.atan2(dir.x, dir.z);
  const ribs = Math.max(2, Math.floor(len / 2.2));
  return (
    <group position={[mid.x, y, mid.z]} rotation={[0, yaw, 0]}>
      <mesh material={m.hull} position={[0, 1.5, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.35, 1.35, len, 20, 1, true]} />
      </mesh>
      <mesh material={m.regolith} position={[0, 0.25, 0]} scale={[1, 0.45, 1]}>
        <boxGeometry args={[3.4, 1.1, len]} />
      </mesh>
      {Array.from({ length: ribs }, (_, i) => (
        <mesh key={i} material={m.trim} position={[0, 1.5, -len / 2 + ((i + 0.5) * len) / ribs]}>
          <torusGeometry args={[1.38, 0.08, 6, 24]} />
        </mesh>
      ))}
      {Array.from({ length: Math.floor(len / 3) }, (_, i) => (
        <mesh key={'w' + i} material={m.window} position={[1.33, 1.8, -len / 2 + 1.5 + i * 3]} rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[0.5, 0.25, 0.05]} />
        </mesh>
      ))}
    </group>
  );
}

/** Tall operations tower (ISRU control, relay antennas, floodlights). */
function Tower({ m }: { m: Mats }) {
  const blink = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (blink.current) blink.current.emissiveIntensity = Math.sin(clock.elapsedTime * 3) > 0.6 ? 6 : 0.3;
  });
  return (
    <group>
      <mesh material={m.hull} castShadow receiveShadow position={[0, 6, 0]}>
        <cylinderGeometry args={[2.6, 3, 12, 28]} />
      </mesh>
      {[2.5, 5.5, 8.5, 11.5].map((y) => (
        <mesh key={y} material={m.hullDark} position={[0, y, 0]}>
          <cylinderGeometry args={[3.05 - y * 0.03, 3.05 - y * 0.03, 0.35, 28]} />
        </mesh>
      ))}
      {[3.8, 6.8, 9.8].map((y) =>
        Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          const r = 2.95 - y * 0.03;
          return (
            <mesh key={y + '-' + i} material={m.window} position={[Math.cos(a) * r, y, Math.sin(a) * r]} rotation={[0, -a + Math.PI / 2, 0]}>
              <boxGeometry args={[0.7, 0.45, 0.06]} />
            </mesh>
          );
        }),
      )}
      <mesh material={m.hull} castShadow position={[0, 13.4, 0]}>
        <cylinderGeometry args={[1.6, 2.6, 2.8, 24]} />
      </mesh>
      <mesh material={m.frame} position={[0, 17.5, 0]}>
        <cylinderGeometry args={[0.08, 0.12, 6, 6]} />
      </mesh>
      <mesh material={m.frame} position={[0.9, 16.2, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 3.5, 6]} />
      </mesh>
      <mesh position={[0, 20.6, 0]}>
        <sphereGeometry args={[0.18, 8, 8]} />
        <meshStandardMaterial ref={blink} color="#ff2a1a" emissive="#ff2a1a" emissiveIntensity={4} />
      </mesh>
      {/* external pipes */}
      {[0.6, 2.2, 4].map((a) => (
        <mesh key={a} material={m.frame} position={[Math.cos(a) * 3.15, 6, Math.sin(a) * 3.15]}>
          <cylinderGeometry args={[0.12, 0.12, 12, 8]} />
        </mesh>
      ))}
      <mesh material={m.trim} position={[0, 0.3, 0]}>
        <cylinderGeometry args={[3.3, 3.5, 0.6, 28]} />
      </mesh>
    </group>
  );
}

/** Science lab: a horizontal module on legs. */
function Lab({ m }: { m: Mats }) {
  return (
    <group>
      <mesh material={m.hull} castShadow receiveShadow position={[0, 2.4, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[2.3, 2.3, 9, 28]} />
      </mesh>
      {[-4.5, 4.5].map((x) => (
        <mesh key={x} material={m.hull} position={[x, 2.4, 0]}>
          <sphereGeometry args={[2.3, 24, 16]} />
        </mesh>
      ))}
      {[-3, 0, 3].map((x) => (
        <mesh key={x} material={m.trim} position={[x, 2.4, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[2.33, 0.07, 6, 28]} />
        </mesh>
      ))}
      {[-2.2, 0, 2.2].map((x) => (
        <mesh key={'w' + x} material={m.window} position={[x, 2.7, 2.28]}>
          <boxGeometry args={[1, 0.5, 0.06]} />
        </mesh>
      ))}
      {[[-3, -1.6], [3, -1.6], [-3, 1.6], [3, 1.6]].map(([x, z], i) => (
        <mesh key={i} material={m.frame} position={[x, 0.5, z]}>
          <cylinderGeometry args={[0.12, 0.18, 1, 8]} />
        </mesh>
      ))}
    </group>
  );
}

/** Where the rover broke down on its way to the supply cache. */
const ABANDONED = new THREE.Vector3(58, 0, -62);

export default function Base({ terrain, game }: { terrain: TerrainData; game: GameState }) {
  const m = useMaterials();
  // dim the windows when life support is short of power
  const lastPower = game.history.at(-1)?.powerRatio ?? 1;
  m.window.emissiveIntensity = 0.3 + 2.2 * lastPower;
  return (
    <group>
      <Placed terrain={terrain} at={SITES.habitat}><Habitat m={m} game={game} /></Placed>
      <Placed terrain={terrain} at={SITES.greenhouse}><Greenhouse m={m} game={game} /></Placed>
      <Placed terrain={terrain} at={SITES.solar} rot={0.05}><SolarField m={m} game={game} /></Placed>
      <Placed terrain={terrain} at={SITES.power}><PowerHub m={m} game={game} /></Placed>
      <Placed terrain={terrain} at={SITES.moxie}><Moxie m={m} game={game} /></Placed>
      <Placed terrain={terrain} at={SITES.comms}><Comms m={m} damaged={game.commsDamaged} /></Placed>
      <Placed terrain={terrain} at={SITES.lander}><Lander m={m} /></Placed>
      <Placed terrain={terrain} at={SITES.garage}><Garage m={m} game={game} /></Placed>
      <Placed terrain={terrain} at={SITES.iceDrill}><IceDrill m={m} game={game} /></Placed>
      <Placed terrain={terrain} at={SITES.reactor}><Reactor m={m} game={game} /></Placed>
      <Placed terrain={terrain} at={SITES.tower}><Tower m={m} /></Placed>
      <Placed terrain={terrain} at={SITES.lab} rot={0.3}><Lab m={m} /></Placed>
      {TUNNELS.map(([a, b, ra, rb]) => (
        <Tunnel key={a + b} m={m} terrain={terrain} a={SITES[a]} b={SITES[b]} ra={ra} rb={rb} />
      ))}
      {game.rover === 'lost' && (
        <Placed terrain={terrain} at={ABANDONED} rot={0.9}>
          <group rotation={[0.12, 0, 0.18]}>
            <Rover m={m} />
          </group>
          <Html position={[0, 3.6, 0]} center distanceFactor={20} zIndexRange={[3, 0]} style={{ pointerEvents: 'none' }}>
            <div className="memorial">🚙✕</div>
          </Html>
        </Placed>
      )}
      <Placed terrain={terrain} at={SITES.habitat}><Memorial game={game} /></Placed>
      <Rocks terrain={terrain} />
    </group>
  );
}
