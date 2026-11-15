/**
 * Gameplay values. These are NOT NASA data: they are design choices, tuned with
 * scripts/paths.ts so that thoughtful play usually wins and careless play does not.
 * Real figures come from src/data/nasa.ts.
 */
export const TUNING = {
  crew: 6,
  sols: 30,

  // Real-time sol (presentation only: the engine still settles a sol in one endSol() step)
  solSeconds: 180, // one sol at 1x speed, in real seconds
  solDayShare: 0.75, // share of those seconds spent in daylight (the night passes faster)

  // Storage (game sizes)
  batteryKWh: 300,
  o2TankKg: 220,
  foodStoreKg: 380,
  waterTankKg: 900,

  // Starting supplies (landed cargo)
  startO2Kg: 110,
  startFoodKg: 285,
  startWaterKg: 300,

  // Solar field
  panelAreaM2: 300,
  solarDayFactor: 0.3, // sun angle + night, averaged over a sol
  dustExtinction: 0.35, // transmission = exp(-tau * k)
  normalTau: 0.5,
  panelDustPerSol: 0.035, // panels lose this much output per sol unless cleaned
  panelCleanTo: 1,

  // Electrical loads per sol (kWh)
  loadLifeSupport: 85, // air, water recycling, comms, computers
  loadHeating: { surface: 40, underground: 20 },
  loadHeatingLow: 0.5, // multiplier when heating is turned down
  loadExcavator: 60,
  loadGreenhouse: 110,
  loadIcePlant: 75, // drill, melt, electrolysis
  loadMoxie: 125, // ~25 kWh per kg O2 (efficient end of MOXIE's range)
  loadMedbay: 40,
  loadRobotMission: 70,
  reactorKWhPerSol: 246, // 10 kWe for one sol

  // Production
  iceWaterPerSol: 42,
  iceO2PerSol: 5.5, // electrolysis of part of that water
  moxieO2PerSol: 4.2,
  greenhouseAreaM2: 120,
  greenhouseRampSols: 6, // simplified: real crops take months
  greenhouseWaterPerSol: 4.5,

  // Losses
  habitatWaterLossPerSol: 2, // airlock cycles, cleaning, leaks
  evaO2PerPersonSol: 1.5, // extra oxygen for a suited crewmember working outside

  // Shield (0-100)
  shieldSurface: 40,
  shieldUnderground: 90,
  undergroundBuildSols: 3,
  regolithPerTask: 4,
  stormShieldDamage: 6,

  // Health (0-100 per crewmember)
  healthRegen: 2,
  coldDamage: 14, // battery empty at night
  co2Damage: 8, // life support short of power
  starveDamage: 18,
  rationDamage: 1,
  rationFactor: 0.8,
  crampedDamage: 2, // living in the lander while digging in
  restHeal: 6,
  radiationSickness: 4, // health lost per sol for 4 sols after a big dose

  // Equipment wear
  wearPerSol: 4,
  maintainWear: 18,
  failureWearFactor: 1 / 170,

  // Daily crew tasks
  tasksPerSol: 2,

  // Random small events
  minorEventChance: 0.15,
} as const;
