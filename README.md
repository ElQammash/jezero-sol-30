# Jezero: Sol 30 🪐

**A 3D Mars colony survival game built on real NASA data. Team AstraQuest (Rowina), NASA Space Apps Challenge 2026.**

Year 2038. You command the first human colony on Mars, in the real Jezero crater. Six crew, thirty sols, six linked crises. Keep Power, Oxygen, Food and Shield up, and every decision you make will show in the world.

- 🎮 **Play in the browser (no install):** https://mistyrose-eland-246079.hostingersite.com/
- 🌍 Arabic and English · 📱 phones and computers · 📴 works offline
- 📄 Full documentation: [docs/PROJECT.md](docs/PROJECT.md) ([PDF](docs/PROJECT.pdf)) · PRD: [docs/PRD.md](docs/PRD.md) ([PDF](docs/PRD.pdf)) · Deploy: [docs/DEPLOY.md](docs/DEPLOY.md) · Submission text: [docs/SUBMISSION.md](docs/SUBMISSION.md) · Original plan (Arabic): [plan/GAME_PLAN.md](plan/GAME_PLAN.md)

## Run locally
```bash
npm ci
npm run dev      # http://localhost:5173
npm test         # 30 unit tests
npm run paths    # balance analysis of all 486 decision paths
npm run build    # production site in dist/
```

## Real NASA assets
| Asset | Source |
|---|---|
| Terrain of Jezero crater | HiRISE DTM `DTEEC_045994_1985_046060_1985_U01` + orthoimage `ESP_045994_1985` (NASA/JPL/UArizona), CTX DTM horizon (NASA/JPL/MSSS), via USGS Astrogeology analysis-ready data |
| Perseverance rover model | NASA 3D Resources, `25042_Perseverance.glb` (NASA/JPL-Caltech) |
| Wind and rover sounds | Perseverance microphone recordings (NASA/JPL-Caltech) |

## Data sources (every number in the game)
Each value lives in [`src/data/nasa.ts`](src/data/nasa.ts) and has a **Source** button in the game. Regenerate this table with `npx tsx scripts/sources-table.ts`.

| Key | Value | Source | Checked | Notes |
|---|---|---|---|---|
| `oxygenPerCrewDay` | 0.816 kg/crew-day | [NASA Life Support Baseline Values and Assumptions Document (BVAD), NASA/TP-2015-218570/REV1, 2018, Table 3-33](https://ntrs.nasa.gov/citations/20180001338) | primary | Nominal oxygen used by one 82 kg crewmember per Earth day. |
| `co2PerCrewDay` | 1.04 kg/crew-day | [NASA Life Support Baseline Values and Assumptions Document (BVAD), NASA/TP-2015-218570/REV1, 2018, Table 3-33](https://ntrs.nasa.gov/citations/20180001338) | primary |  |
| `waterPerCrewDay` | 2.5 kg/crew-day | [NASA Life Support Baseline Values and Assumptions Document (BVAD), NASA/TP-2015-218570/REV1, 2018, Table 3-33](https://ntrs.nasa.gov/citations/20180001338) | primary | Drinking water plus water to rehydrate food. |
| `packagedFoodPerCrewDay` | 1.83 kg/crew-day | [NASA Life Support Baseline Values and Assumptions Document (BVAD), NASA/TP-2015-218570/REV1, 2018, section 4.3 (ISS food container)](https://ntrs.nasa.gov/citations/20180001338) | primary | Packaged ISS food per crewmember per day, including packaging. |
| `foodEnergyPerCrewDay` | 12.59 MJ/crew-day | [NASA Life Support Baseline Values and Assumptions Document (BVAD), NASA/TP-2015-218570/REV1, 2018, Table 3-33](https://ntrs.nasa.gov/citations/20180001338) | primary |  |
| `potatoYield` | 105.3 g fresh food/m²/day | [NASA Life Support Baseline Values and Assumptions Document (BVAD), NASA/TP-2015-218570/REV1, 2018, Table 4-97 (white potato)](https://ntrs.nasa.gov/citations/20180001338) | primary, simplified | Average over the whole growing cycle in NASA growth chambers. Real potatoes take about 4 months to harvest; the game speeds growth up to fit 30 sols. |
| `potatoOxygen` | 32.23 g O₂/m²/day | [NASA Life Support Baseline Values and Assumptions Document (BVAD), NASA/TP-2015-218570/REV1, 2018, Table 4-98 (white potato)](https://ntrs.nasa.gov/citations/20180001338) | primary, simplified | Oxygen released by a potato crop, averaged over its life cycle. |
| `potatoEnergy` | 3.22 MJ/kg | [USDA FoodData Central, Potatoes, flesh and skin, raw (FDC 170026). NOT NASA](https://fdc.nal.usda.gov/food-details/170026/nutrients) | secondary, **not NASA** | 77 kcal per 100 g. Used to turn the harvest into crew-days of food. |
| `issWaterRecovery` | 0.98 fraction | [NASA: NASA Achieves Water Recovery Milestone on International Space Station (2023)](https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station/) | primary |  |
| `electrolysisWater` | 1.125 kg water per kg O₂ | [Derived: water (H₂O) is 8/9 oxygen by mass](https://ntrs.nasa.gov/citations/20180001338) | derived | Splitting 1.125 kg of water gives 1 kg of oxygen and 0.125 kg of hydrogen. |
| `solarIrradianceMars` | 586.2 W/m² | [NASA NSSDC Mars Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html) | primary | Top of the atmosphere. 43% of the sunlight at Earth. |
| `solDuration` | 24.6597 hours | [NASA NSSDC Mars Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html) | primary | One sol is 24 h 39 min 35 s. |
| `marsGravity` | 0.38 × Earth | [NASA NSSDC Mars Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html) | primary |  |
| `marsCO2` | 95.1 % of the air | [NASA NSSDC Mars Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html) | primary |  |
| `marsPressure` | 6.36 mbar | [NASA NSSDC Mars Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html) | primary | Less than 1% of Earth’s air pressure. Astronauts need pressure suits outside. |
| `marsNightTemp` | -70 °C | [NASA: Steady Temperatures at Mars’ Gale Crater (Curiosity REMS)](https://science.nasa.gov/photojournal/steady-temperatures-at-mars-gale-crater) | secondary | Typical night low of the air at Gale crater; daytime highs were near 0 °C. |
| `marsDayTemp` | 0 °C | [NASA: Steady Temperatures at Mars’ Gale Crater (Curiosity REMS)](https://science.nasa.gov/photojournal/steady-temperatures-at-mars-gale-crater) | secondary |  |
| `blueSunset` | 956 sol of the Curiosity mission | [NASA SVS: NASA’s Curiosity Sees Blue Sunset on Mars (2015)](https://svs.gsfc.nasa.gov/11875) | secondary | Fine dust lets blue light through near sunset, so Martian sunsets are blue. |
| `marsSurfaceDose` | 0.67 mSv/day | [Hassler et al. 2014, Science 343, Curiosity RAD (NASA MSL)](https://doi.org/10.1126/science.1244797) | secondary, simplified | Over 30 sols this adds up to only ~20 mSv. The game’s Shield meter therefore stands for protection against solar storms and the environment. |
| `solarStorm2024` | 8.1 mGy in one event | [NASA: NASA Watches Mars Light Up During Epic Solar Storm (2024)](https://www.nasa.gov/solar-system/planets/mars/nasa-watches-mars-light-up-during-epic-solar-storm) | secondary, simplified | Largest solar storm Curiosity’s RAD measured on the surface (20 May 2024). |
| `waterShielding` | 0.0574 m of water wall | [NASA TransHab water-tank storm shelter; NASA RadWorks storm shelters (NTRS 20160006051)](https://ntrs.nasa.gov/citations/20160006051) | secondary, simplified | Hydrogen-rich water blocks the protons of solar storms well; NASA studied using stored water as a storm shelter wall. |
| `solarCellEfficiency` | 0.307 fraction | [NASA APPEL: ISS roll-out solar array (iROSA) cells](https://appel.nasa.gov/2021/06/29/astronauts-continue-space-station-power-upgrades) | secondary |  |
| `moxieRate` | 12 g O₂/hour (best) | [NASA JPL: Perseverance MOXIE results](https://www.jpl.nasa.gov/news/nasas-perseverance-mars-rover-extracts-first-oxygen-from-red-planet/) | secondary | Design goal was 6 g/h; MOXIE made 122 g in total over 16 runs. |
| `moxiePower` | 300 W | [MOXIE specifications (MIT / NASA JPL), as reported](https://science.nasa.gov/blog/a-day-full-of-moxie/) | secondary, simplified | About 25–50 kWh per kg of oxygen at MOXIE’s size. A crew-size unit is assumed to reach the efficient end of that range. |
| `dustStormTau2018` | 10.8 optical depth (tau) | [NASA JPL: Opportunity Hunkers Down During Dust Storm (2018)](https://www.jpl.nasa.gov/news/opportunity-hunkers-down-during-dust-storm/) | secondary, simplified | Record dust over Opportunity; normal is about 0.5. The game storm is shorter and a bit weaker. |
| `kilopowerOutput` | 10 kWe (up to) | [NASA Kilopower / KRUSTY (NTRS 20180005435)](https://ntrs.nasa.gov/citations/20180005435) | secondary, simplified | Kilopower designs span 1–10 kWe; the game’s standby reactor is the 10 kWe size. |
| `ingenuityFlights` | 72 flights | [Ingenuity Mars Helicopter (NASA JPL), reported by Live Science](https://www.livescience.com/space/mars/nasas-historic-ingenuity-helicopter-ends-its-3-year-mars-mission-suffering-rotor-damage-on-72nd-flight) | secondary | Planned for 5 flights; flew 72 times from 2021 to January 2024. |
| `lightDelayMin` | 3 minutes | [NASA Mars Relay Network figure (3 to 22.4 min); game delay computed with JPL approximate planet positions](https://ssd.jpl.nasa.gov/planets/approx_pos.html) | secondary | The game computes the real Earth–Mars distance for the mission date with JPL’s approximate planet positions. |
| `lightDelayMax` | 22.4 minutes | [NASA Mars Relay Network figure (farthest, 400.2 million km); JPL approximate planet positions](https://ssd.jpl.nasa.gov/planets/approx_pos.html) | secondary |  |

Gameplay-only values (tank sizes, storm length, chances) are design choices in [`src/engine/tuning.ts`](src/engine/tuning.ts). They are not NASA data.

## Built with
TypeScript · React · three.js · React Three Fiber · drei · postprocessing · zustand · Vite · vite-plugin-pwa · Vitest · Puppeteer · geotiff.js · glTF-Transform · FFmpeg · PHP + SQLite. AI assistance: Claude Code ([docs/PROJECT.md §12](docs/PROJECT.md)).
