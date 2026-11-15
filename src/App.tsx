import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { STORM_TAU, type StageId } from './engine';
import { setMuted, setStorm } from './game/sound';
import { useGame } from './game/store';
import World from './game/World';
import { SITES, type SiteId } from './game/world/Base';
import { useWorld } from './game/worldStore';
import Hud from './ui/Hud';
import { Computer, OutcomeModal, SolReport, StageModal } from './ui/Modals';
import { EndScreen, Intro, TitleScreen } from './ui/Screens';

const STAGE_SITE: Record<StageId, SiteId> = {
  habitat: 'habitat',
  lifeSupport: 'greenhouse',
  power: 'solar',
  mobility: 'garage',
  communication: 'comms',
  safety: 'habitat',
};
const MORNING = 0.32;
const NIGHT_MS = 3800;

/** Drives time of day, dust and the end-of-sol time-lapse. */
function useDirector() {
  useEffect(() => {
    let raf = 0;
    let t0 = 0;
    const loop = (now: number) => {
      const s = useGame.getState();
      const w = useWorld.getState();
      // dust follows the storm
      const tau = s.game.storm ? STORM_TAU[s.game.storm.day] ?? 0 : 0;
      const dustTarget = Math.min(1, tau / 6.5);
      const dust = w.dust + (dustTarget - w.dust) * 0.02;
      if (Math.abs(dust - w.dust) > 0.0005) w.setDust(dust);
      setStorm(dust);
      if (s.nightfall > 0) {
        if (!t0) t0 = now;
        const p = Math.min(1, (now - t0) / ((window as unknown as { __fast?: boolean }).__fast ? 250 : NIGHT_MS));
        // morning -> sunset (blue!) -> night -> next morning
        w.setTime(MORNING + p * 1.0);
        if (p >= 1) {
          t0 = 0;
          w.setTime(MORNING);
          s.finishNight();
        }
      } else if (s.screen === 'title') {
        w.setTime(0.68 + Math.sin(now / 9000) * 0.02); // late afternoon glow on the title screen
      } else if (Math.abs(w.time - MORNING) > 0.001 && s.nightfall === 0) {
        w.setTime(MORNING);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
}

export default function App() {
  const screen = useGame((s) => s.screen);
  const modal = useGame((s) => s.modal);
  const game = useGame((s) => s.game);
  const quality = useGame((s) => s.quality);
  const muted = useGame((s) => s.muted);
  const lang = useGame((s) => s.lang);
  const [clock, setClock] = useState(0);
  useDirector();
  useEffect(() => setMuted(muted), [muted]);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);
  useEffect(() => {
    if (screen !== 'title') return;
    const id = setInterval(() => setClock((c) => c + 1), 50);
    return () => clearInterval(id);
  }, [screen]);

  const cinematic = useMemo(() => {
    if (screen === 'title' || screen === 'intro') {
      const a = clock * 0.004;
      return { target: new THREE.Vector3(0, 6, 0), pos: new THREE.Vector3(Math.sin(a) * 75, 26, Math.cos(a) * 75) };
    }
    if (modal === 'stage' && game.pendingStage) {
      const c = SITES[STAGE_SITE[game.pendingStage]];
      return { target: c.clone().setY(4), pos: c.clone().add(new THREE.Vector3(22, 12, 26)) };
    }
    return null;
  }, [screen, modal, game.pendingStage, clock]);

  return (
    <>
      <World game={game} quality={quality} cinematic={cinematic} />
      {screen === 'title' && <TitleScreen />}
      {screen === 'intro' && <Intro />}
      {screen === 'play' && (
        <>
          <Hud />
          {modal === 'stage' && game.pendingStage && <StageModal />}
          {modal === 'outcome' && <OutcomeModal />}
          {modal === 'computer' && <Computer />}
          {modal === 'solReport' && <SolReport />}
          <NightOverlay />
        </>
      )}
      {screen === 'end' && <EndScreen />}
    </>
  );
}

function NightOverlay() {
  const nightfall = useGame((s) => s.nightfall);
  if (nightfall === 0) return null;
  return <div className="night-overlay" />;
}
