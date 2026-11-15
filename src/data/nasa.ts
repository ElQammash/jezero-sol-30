/**
 * Every real-world number used by the game, with its source.
 *
 * - `value` is the figure as the source states it.
 * - `simplified: true` means the game uses or interprets it in a simplified way
 *   (explained in `note`). The UI must never present a game value as a NASA figure.
 * - `verification`: "primary" = read in the original document/page;
 *   "secondary" = confirmed through reports of the original; "derived" = computed by us.
 * - `nasa: false` = the best available source is not NASA.
 *
 * Gameplay-only knobs live in src/engine/tuning.ts and are not data.
 */
export type Verification = 'primary' | 'secondary' | 'derived';

export interface DataEntry {
  value: number;
  unit: string;
  sourceName: string;
  sourceUrl: string;
  simplified: boolean;
  verification: Verification;
  nasa: boolean;
  note?: string;
}

const BVAD = {
  name: 'NASA Life Support Baseline Values and Assumptions Document (BVAD), NASA/TP-2015-218570/REV1, 2018',
  url: 'https://ntrs.nasa.gov/citations/20180001338',
};
const MARS = { name: 'NASA NSSDC Mars Fact Sheet', url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html' };

export const NASA = {
  // ---- Crew needs (BVAD Table 3-33 and section 4.3) ----
  oxygenPerCrewDay: {
    value: 0.816, unit: 'kg/crew-day', sourceName: `${BVAD.name}, Table 3-33`, sourceUrl: BVAD.url,
    simplified: false, verification: 'primary', nasa: true, note: 'Nominal oxygen used by one 82 kg crewmember per Earth day.',
  },
  co2PerCrewDay: {
    value: 1.04, unit: 'kg/crew-day', sourceName: `${BVAD.name}, Table 3-33`, sourceUrl: BVAD.url,
    simplified: false, verification: 'primary', nasa: true,
  },
  waterPerCrewDay: {
    value: 2.5, unit: 'kg/crew-day', sourceName: `${BVAD.name}, Table 3-33`, sourceUrl: BVAD.url,
    simplified: false, verification: 'primary', nasa: true, note: 'Drinking water plus water to rehydrate food.',
  },
  packagedFoodPerCrewDay: {
    value: 1.83, unit: 'kg/crew-day', sourceName: `${BVAD.name}, section 4.3 (ISS food container)`, sourceUrl: BVAD.url,
    simplified: false, verification: 'primary', nasa: true, note: 'Packaged ISS food per crewmember per day, including packaging.',
  },
  foodEnergyPerCrewDay: {
    value: 12.59, unit: 'MJ/crew-day', sourceName: `${BVAD.name}, Table 3-33`, sourceUrl: BVAD.url,
    simplified: false, verification: 'primary', nasa: true,
  },
  potatoYield: {
    value: 105.3, unit: 'g fresh food/m²/day', sourceName: `${BVAD.name}, Table 4-97 (white potato)`, sourceUrl: BVAD.url,
    simplified: true, verification: 'primary', nasa: true,
    note: 'Average over the whole growing cycle in NASA growth chambers. Real potatoes take about 4 months to harvest; the game speeds growth up to fit 30 sols.',
  },
  potatoOxygen: {
    value: 32.23, unit: 'g O₂/m²/day', sourceName: `${BVAD.name}, Table 4-98 (white potato)`, sourceUrl: BVAD.url,
    simplified: true, verification: 'primary', nasa: true, note: 'Oxygen released by a potato crop, averaged over its life cycle.',
  },
  potatoEnergy: {
    value: 3.22, unit: 'MJ/kg', sourceName: 'USDA FoodData Central, Potatoes, flesh and skin, raw (FDC 170026). NOT NASA',
    sourceUrl: 'https://fdc.nal.usda.gov/food-details/170026/nutrients',
    simplified: false, verification: 'secondary', nasa: false, note: '77 kcal per 100 g. Used to turn the harvest into crew-days of food.',
  },
  issWaterRecovery: {
    value: 0.98, unit: 'fraction', sourceName: 'NASA: NASA Achieves Water Recovery Milestone on International Space Station (2023)',
    sourceUrl: 'https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station/',
    simplified: false, verification: 'primary', nasa: true,
  },
  electrolysisWater: {
    value: 1.125, unit: 'kg water per kg O₂', sourceName: 'Derived: water (H₂O) is 8/9 oxygen by mass', sourceUrl: 'https://ntrs.nasa.gov/citations/20180001338',
    simplified: false, verification: 'derived', nasa: true, note: 'Splitting 1.125 kg of water gives 1 kg of oxygen and 0.125 kg of hydrogen.',
  },

  // ---- Mars environment ----
  solarIrradianceMars: {
    value: 586.2, unit: 'W/m²', sourceName: MARS.name, sourceUrl: MARS.url,
    simplified: false, verification: 'primary', nasa: true, note: 'Top of the atmosphere. 43% of the sunlight at Earth.',
  },
  solDuration: {
    value: 24.6597, unit: 'hours', sourceName: MARS.name, sourceUrl: MARS.url, simplified: false, verification: 'primary', nasa: true,
    note: 'One sol is 24 h 39 min 35 s.',
  },
  marsGravity: { value: 0.38, unit: '× Earth', sourceName: MARS.name, sourceUrl: MARS.url, simplified: false, verification: 'primary', nasa: true },
  marsCO2: { value: 95.1, unit: '% of the air', sourceName: MARS.name, sourceUrl: MARS.url, simplified: false, verification: 'primary', nasa: true },
  marsPressure: {
    value: 6.36, unit: 'mbar', sourceName: MARS.name, sourceUrl: MARS.url, simplified: false, verification: 'primary', nasa: true,
    note: 'Less than 1% of Earth’s air pressure. Astronauts need pressure suits outside.',
  },
  marsNightTemp: {
    value: -70, unit: '°C', sourceName: 'NASA: Steady Temperatures at Mars’ Gale Crater (Curiosity REMS)',
    sourceUrl: 'https://science.nasa.gov/photojournal/steady-temperatures-at-mars-gale-crater',
    simplified: false, verification: 'secondary', nasa: true, note: 'Typical night low of the air at Gale crater; daytime highs were near 0 °C.',
  },
  marsDayTemp: {
    value: 0, unit: '°C', sourceName: 'NASA: Steady Temperatures at Mars’ Gale Crater (Curiosity REMS)',
    sourceUrl: 'https://science.nasa.gov/photojournal/steady-temperatures-at-mars-gale-crater',
    simplified: false, verification: 'secondary', nasa: true,
  },
  blueSunset: {
    value: 956, unit: 'sol of the Curiosity mission', sourceName: 'NASA SVS: NASA’s Curiosity Sees Blue Sunset on Mars (2015)',
    sourceUrl: 'https://svs.gsfc.nasa.gov/11875', simplified: false, verification: 'secondary', nasa: true,
    note: 'Fine dust lets blue light through near sunset, so Martian sunsets are blue.',
  },

  // ---- Radiation ----
  marsSurfaceDose: {
    value: 0.67, unit: 'mSv/day', sourceName: 'Hassler et al. 2014, Science 343, Curiosity RAD (NASA MSL)',
    sourceUrl: 'https://doi.org/10.1126/science.1244797', simplified: true, verification: 'secondary', nasa: true,
    note: 'Over 30 sols this adds up to only ~20 mSv. The game’s Shield meter therefore stands for protection against solar storms and the environment.',
  },
  solarStorm2024: {
    value: 8.1, unit: 'mGy in one event', sourceName: 'NASA: NASA Watches Mars Light Up During Epic Solar Storm (2024)',
    sourceUrl: 'https://www.nasa.gov/solar-system/planets/mars/nasa-watches-mars-light-up-during-epic-solar-storm',
    simplified: true, verification: 'secondary', nasa: true, note: 'Largest solar storm Curiosity’s RAD measured on the surface (20 May 2024).',
  },
  waterShielding: {
    value: 0.0574, unit: 'm of water wall', sourceName: 'NASA TransHab water-tank storm shelter; NASA RadWorks storm shelters (NTRS 20160006051)',
    sourceUrl: 'https://ntrs.nasa.gov/citations/20160006051', simplified: true, verification: 'secondary', nasa: true,
    note: 'Hydrogen-rich water blocks the protons of solar storms well; NASA studied using stored water as a storm shelter wall.',
  },

  // ---- Power and oxygen machines ----
  solarCellEfficiency: {
    value: 0.307, unit: 'fraction', sourceName: 'NASA APPEL: ISS roll-out solar array (iROSA) cells',
    sourceUrl: 'https://appel.nasa.gov/2021/06/29/astronauts-continue-space-station-power-upgrades',
    simplified: false, verification: 'secondary', nasa: true,
  },
  moxieRate: {
    value: 12, unit: 'g O₂/hour (best)', sourceName: 'NASA JPL: Perseverance MOXIE results',
    sourceUrl: 'https://www.jpl.nasa.gov/news/nasas-perseverance-mars-rover-extracts-first-oxygen-from-red-planet/',
    simplified: false, verification: 'secondary', nasa: true, note: 'Design goal was 6 g/h; MOXIE made 122 g in total over 16 runs.',
  },
  moxiePower: {
    value: 300, unit: 'W', sourceName: 'MOXIE specifications (MIT / NASA JPL), as reported',
    sourceUrl: 'https://science.nasa.gov/blog/a-day-full-of-moxie/', simplified: true, verification: 'secondary', nasa: true,
    note: 'About 25–50 kWh per kg of oxygen at MOXIE’s size. A crew-size unit is assumed to reach the efficient end of that range.',
  },
  dustStormTau2018: {
    value: 10.8, unit: 'optical depth (tau)', sourceName: 'NASA JPL: Opportunity Hunkers Down During Dust Storm (2018)',
    sourceUrl: 'https://www.jpl.nasa.gov/news/opportunity-hunkers-down-during-dust-storm/',
    simplified: true, verification: 'secondary', nasa: true, note: 'Record dust over Opportunity; normal is about 0.5. The game storm is shorter and a bit weaker.',
  },
  kilopowerOutput: {
    value: 10, unit: 'kWe (up to)', sourceName: 'NASA Kilopower / KRUSTY (NTRS 20180005435)', sourceUrl: 'https://ntrs.nasa.gov/citations/20180005435',
    simplified: true, verification: 'secondary', nasa: true, note: 'Kilopower designs span 1–10 kWe; the game’s standby reactor is the 10 kWe size.',
  },

  // ---- Exploration and communication ----
  ingenuityFlights: {
    value: 72, unit: 'flights', sourceName: 'Ingenuity Mars Helicopter (NASA JPL), reported by Live Science',
    sourceUrl: 'https://www.livescience.com/space/mars/nasas-historic-ingenuity-helicopter-ends-its-3-year-mars-mission-suffering-rotor-damage-on-72nd-flight',
    simplified: false, verification: 'secondary', nasa: true, note: 'Planned for 5 flights; flew 72 times from 2021 to January 2024.',
  },
  lightDelayMin: {
    value: 3, unit: 'minutes', sourceName: 'NASA Mars Relay Network figure (3 to 22.4 min); game delay computed with JPL approximate planet positions',
    sourceUrl: 'https://ssd.jpl.nasa.gov/planets/approx_pos.html', simplified: false, verification: 'secondary', nasa: true,
    note: 'The game computes the real Earth–Mars distance for the mission date with JPL’s approximate planet positions.',
  },
  lightDelayMax: {
    value: 22.4, unit: 'minutes', sourceName: 'NASA Mars Relay Network figure (farthest, 400.2 million km); JPL approximate planet positions',
    sourceUrl: 'https://ssd.jpl.nasa.gov/planets/approx_pos.html', simplified: false, verification: 'secondary', nasa: true,
  },
} as const satisfies Record<string, DataEntry>;

export type NasaKey = keyof typeof NASA;
