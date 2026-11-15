# Space Apps 2026: Submission Form Text

Copy each section into the matching field of the Space Apps project submission form, in this order.

**Team:** AstraQuest · **Team members:** Malak Tamer Said Ahmad (team owner), Rowina Walid Abdul Rahman · **Challenge:** Build a Junior Astronaut Mission Trainer

### Images for the project page (JPG/PNG/GIF, up to 10 MB each)
Upload these files from `docs/submission-images/`:
1. `gameplay.gif` (6.4 MB, 13.8 s of real gameplay). Use it as the **main project image**: it shows the living colony, the crew working and the HUD.
2. `1-world-and-hud.png`: the real 3D Jezero colony with the clock, the meters, the daily goal, the ground arrows and the crew tags labelled. Put it first in the gallery, or next to the summary.
3. `2-crisis-trade-offs.png`: a crisis card with its cost and gain icons labelled. Put it next to the description of the crises and trade-offs.
4. `3-source-button.png`: the Source panel with the NASA value, source and link labelled. Put it next to the NASA Data section.

None of the images shows a real person. They contain no NASA logos or insignia, and they are all real gameplay captures.

---

## Project Name
Jezero: Sol 30

---

## High-Level Project Summary
*Jezero: Sol 30* is a free 3D browser game for students aged 10–14. The player commands the first human colony on Mars in 2038, in the real Jezero crater where NASA's Perseverance rover landed, and walks the base as an astronaut on ground built from NASA HiRISE terrain data. For 30 sols they keep four meters alive (Power, Oxygen, Food and Shield) and the health of six crew, while six linked crises arrive: where to build the habitat; how to get oxygen, water and food; a dust storm; a broken rover; a solar-storm warning delayed by the real Earth–Mars light time; and a medical emergency.

It addresses the challenge by making trade-offs something you *feel*. Each sol runs in real time. The player gives orders, named crewmembers walk out and do the work, and the meters move as a result. Power spent on ice leaves less for the storm. A risky walk saves the base but costs health later. No option wins on its own. Across all 486 decision paths, a random player wins 21.6% of missions and a thoughtful player wins 89.2%. Every number comes from a checked source and has a Source button in the game. Simplifications are labelled.

It matters because mission planning is about resources and risk, and children learn that best by deciding and living with the results. The game needs no install and no instructions: a short training, arrows on the ground, a daily goal and illustrated hint cards guide the player. It runs on phones, in Arabic and English, and offline.

---

## Link to Project Demo
https://mistyrose-eland-246079.hostingersite.com/demo/Jezero-Sol-30-Demo.pdf

---

## Link to Final Project
https://mistyrose-eland-246079.hostingersite.com/

---

## Detailed Project Description

**Links**
- Play (no install, no login): https://mistyrose-eland-246079.hostingersite.com/
- Source code: https://github.com/ElQammash/jezero-sol-30
- Full presentation, with a source cited for every number on every slide: https://mistyrose-eland-246079.hostingersite.com/presentation/ (PDF: https://mistyrose-eland-246079.hostingersite.com/presentation/Jezero-Sol-30-Full-Presentation.pdf)
- Full documentation: https://github.com/ElQammash/jezero-sol-30/blob/main/docs/PROJECT.md

### What it does
- **A real 3D Mars.** The playable kilometre is NASA HiRISE elevation data of Jezero crater with its orthoimage, and an 18 km CTX elevation model forms the horizon. NASA's own Perseverance 3D model is the colony's robot helper. The wind you hear was recorded by Perseverance's microphone on Mars.
- **A living sol.** The sol runs by itself, from sunrise through the blue Martian sunset to night, with pause and 1×/2×/4× speed. The four meters move live toward the result of tonight's accounting, so every order shows its effect at once. A Mission Log explains what changed and why.
- **A crew that works.** Lina (engineer), Omar (botanist), Sara (doctor), Yusuf (geologist) and Maya (pilot) take the jobs you order. Each one walks to the site and works there with a progress bar and a countdown. Cleaned panels, regolith piled on the roof, and potatoes growing toward harvest can all be seen in the world.
- **Six linked crises,** each with 2–3 options shown as cards with cost and gain icons. Three options are carried out by the player in the world: walking through a dust storm to start the reactor, sending the repair team, and racing to the shelter before the solar storm arrives.
- **Guidance for children.** A sol-1 training with a pointing hand, arrows drawn on the ground that go around buildings, a daily goal taken from the colony's weakest point, and 13 illustrated hint cards made from real annotated screenshots.
- **Debrief.** The game replays every crisis with the other options and names the decision that mattered most. The player can retry from that moment.

### How it works
A deterministic TypeScript engine (seeded random numbers) settles each sol in one step: energy, oxygen, water, food, radiation, equipment wear and crew health. The HUD and the 3D world blend toward that result during the sol, and a unit test checks that they land exactly on it. Every real number lives in one data file with its source. A script checks every source URL and looks for each value in the source text. The 3D world is React Three Fiber on three.js, with our own sky and terrain shaders. The game is an installable offline web app. Cloud saves use a small PHP + SQLite API with only a username and password.

### Benefits
Students practise systems thinking: resources are linked, choices have delayed costs, and the numbers come from real missions. Teachers get a free link that runs on school computers and phones with no account needed, in Arabic or English.

### Goals
1. Trade-offs felt through play, not explained in text.
2. Real NASA data behind every rule, with honest labels for simplifications.
3. Playable by a 10–14-year-old with no instructions.

### Tools, languages and software
TypeScript, HTML/CSS, PHP; React 19, three.js, React Three Fiber, drei, @react-three/postprocessing, zustand, Vite, vite-plugin-pwa (Workbox), Vitest, Puppeteer, geotiff.js, glTF-Transform, FFmpeg, marked, qrcode, tsx, SQLite. Hosted on Hostinger; code on GitHub.

---

## Use of Artificial Intelligence (AI)
We used **Claude Code** (Anthropic), an AI coding assistant, as a pair programmer. It was used to:
- write and refactor code: the game engine, 3D world, interface, Arabic and English translations, the save API, and the test, capture and document-generation scripts;
- find, read and check NASA documents and numbers (including the automated source check), and download and convert NASA terrain, model and audio files;
- run the balance analysis and automated browser play-tests;
- draft the documentation, the presentations and this submission text. The team reviewed and edited all of it.

The team wrote the story and the six crises, made the design decisions, checked the sources and play-tested the game.

**No AI-generated images, video or audio are in the project.** Every visual is real gameplay rendered by our code or a NASA asset, and every sound is a NASA recording or a simple synthesized tone made in code.

---

## NASA Data
Every value below is in `src/data/nasa.ts` with its source, and each one has a Source button in the game. The status of each value is shown in brackets: **primary** = read in the original; **secondary** = confirmed through a report of the original; **derived** = calculated by us. Source-check results: https://github.com/ElQammash/jezero-sol-30/blob/main/docs/SOURCES_CHECK.md

**Datasets and assets**
- **HiRISE digital terrain model** DTEEC_045994_1985_046060_1985_U01 and **orthoimage** ESP_045994_1985 of Jezero crater (NASA MRO, NASA/JPL/University of Arizona; USGS Astrogeology analysis-ready data): https://astrogeo-ard.s3-us-west-2.amazonaws.com/mars/mro/hirise/controlled/dtm/ESP_045994_1985_ESP_046060_1985/DTEEC_045994_1985_046060_1985_U01.tif and https://www.uahirise.org/ESP_045994_1985
- **CTX digital terrain model** P02_001820_1984_XI_18N282W__P06_003442_1987_XI_18N282W (NASA MRO, NASA/JPL/MSSS; USGS Astrogeology): https://astrogeo-ard.s3-us-west-2.amazonaws.com/mars/mro/ctx/controlled/usgs/P02_001820_1984_XI_18N282W__P06_003442_1987_XI_18N282W/P02_001820_1984_XI_18N282W__P06_003442_1987_XI_18N282W_dtm.tif
- **NASA Perseverance rover 3D model** (25042_Perseverance.glb, NASA/JPL-Caltech): https://science.nasa.gov/resource/mars-perseverance-rover-3d-model/
- **Perseverance microphone recordings** of Mars wind and of the rover driving on sol 16 (NASA/JPL-Caltech/ISAE-SUPAERO/LANL): https://science.nasa.gov/resource/nasas-perseverance-rover-microphone-captures-sounds-from-mars/ and https://science.nasa.gov/resource/sounds-of-perseverance-mars-rover-driving-sol-16-90-second-highlights/
- **JPL Approximate Positions of the Planets**, used to compute the real Earth–Mars light delay for the story date: https://ssd.jpl.nasa.gov/planets/approx_pos.html

**Every number, by source**
- **NASA Life Support Baseline Values and Assumptions Document (BVAD), NASA/TP-2015-218570/REV1, 2018**: 0.816 kg/crew-day (oxygenPerCrewDay; primary); 1.04 kg/crew-day (co2PerCrewDay; primary); 2.5 kg/crew-day (waterPerCrewDay; primary); 1.83 kg/crew-day (packagedFoodPerCrewDay; primary); 12.59 MJ/crew-day (foodEnergyPerCrewDay; primary); 105.3 g fresh food/m²/day (potatoYield; primary, simplified); 32.23 g O₂/m²/day (potatoOxygen; primary, simplified); 1.125 kg water per kg O₂ (electrolysisWater; derived). https://ntrs.nasa.gov/citations/20180001338
- **USDA FoodData Central, Potatoes, flesh and skin, raw (FDC 170026). NOT NASA** (NOT NASA): 3.22 MJ/kg (potatoEnergy; primary). https://fdc.nal.usda.gov/food-details/170026/nutrients
- **NASA: NASA Achieves Water Recovery Milestone on International Space Station (2023)**: 0.98 fraction (issWaterRecovery; primary). https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station/
- **NASA NSSDC Mars Fact Sheet**: 586.2 W/m² (solarIrradianceMars; primary); 24.6597 hours (solDuration; primary); 0.38 × Earth (marsGravity; primary); 95.1 % of the air (marsCO2; primary); 6.36 mbar (marsPressure; primary); 3 minutes (lightDelayMin; derived); 22.3 minutes (lightDelayMax; derived). https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html
- **NASA: Steady Temperatures at Mars’ Gale Crater (Curiosity REMS)**: -70 °C (marsNightTemp; secondary); 0 °C (marsDayTemp; secondary). https://science.nasa.gov/photojournal/steady-temperatures-at-mars-gale-crater
- **NASA Photojournal PIA19400: Sunset in Mars’ Gale Crater (Curiosity, 15 April 2015)**: 956 sol of the Curiosity mission (blueSunset; primary). https://science.nasa.gov/photojournal/sunset-in-mars-gale-crater/
- **Curiosity RAD (NASA MSL), Hassler et al. 2014, Science 343 (doi:10.1126/science.1244797), as stated by the RAD principal investigator in the SwRI release**: 0.67 mSv/day (marsSurfaceDose; secondary, simplified). https://swri.org/node/9079
- **NASA: NASA Watches Mars Light Up During Epic Solar Storm (2024)**: 8.1 mGy in one event (solarStorm2024; secondary, simplified). https://www.nasa.gov/solar-system/planets/mars/nasa-watches-mars-light-up-during-epic-solar-storm
- **Dugan et al. 2015, Deep Space Storm Shelter Simulation Study (NASA Langley, RadWorks), NTRS 20160006051**: 0.102 m (one water-container wall) (waterShielding; primary, simplified). https://ntrs.nasa.gov/citations/20160006051
- **NASA State-of-the-Art of Small Spacecraft Technology, Power chapter: space solar cell efficiencies (Spectrolab XTJ-Prime, 30.7%)**: 0.307 fraction (solarCellEfficiency; primary, simplified). https://www.nasa.gov/smallsat-institute/sst-soa/power-subsystems/
- **NASA: NASA’s Oxygen-Generating Experiment MOXIE Completes Mars Mission (2023)**: 12 g O₂/hour (best) (moxieRate; primary). https://www.nasa.gov/missions/mars-2020-perseverance/perseverance-rover/nasas-oxygen-generating-experiment-moxie-completes-mars-mission/
- **NASA Science: Perseverance science instruments, MOXIE (Power: 300 watts)**: 300 W (moxiePower; primary, simplified). https://science.nasa.gov/mission/mars-2020-perseverance/science-instruments/
- **NASA JPL: Opportunity Hunkers Down During Dust Storm (2018)**: 10.8 optical depth (tau) (dustStormTau2018; secondary, simplified). https://www.jpl.nasa.gov/news/opportunity-hunkers-down-during-dust-storm/
- **NASA Kilopower / KRUSTY (NTRS 20180005435)**: 10 kWe (up to) (kilopowerOutput; secondary, simplified). https://ntrs.nasa.gov/citations/20180005435
- **Ingenuity Mars Helicopter (NASA JPL), reported by Live Science**: 72 flights (ingenuityFlights; secondary). https://www.livescience.com/space/mars/nasas-historic-ingenuity-helicopter-ends-its-3-year-mars-mission-suffering-rotor-damage-on-72nd-flight

---

## Space Agency Partner Data and Other References
**No data from partner space agencies (such as ESA, JAXA, CSA or others) was used.** All space data is from NASA.

**Not NASA, and labelled as such in the game**
- USDA FoodData Central, potato energy, 77 kcal (322 kJ) per 100 g: https://fdc.nal.usda.gov/food-details/170026/nutrients

**Reported by others** (the original is a NASA mission)
- Curiosity's surface radiation dose, 0.67 mSv/day, as stated by the RAD principal investigator in the SwRI release: https://swri.org/node/9079 (paper: Hassler et al. 2014, Science 343, doi:10.1126/science.1244797)
- Ingenuity's 72 flights, reported by Live Science: https://www.livescience.com/space/mars/nasas-historic-ingenuity-helicopter-ends-its-3-year-mars-mission-suffering-rotor-damage-on-72nd-flight

**Game design values.** Storage sizes, machine loads, crop growth speed, risks and storm length are ours, not data. They are kept in `src/engine/tuning.ts` and never shown as NASA figures.

**Open-source software** (all used under their licences)
- TypeScript (Apache-2.0) https://www.typescriptlang.org
- React (MIT) https://react.dev
- three.js (MIT) https://threejs.org
- React Three Fiber and drei (MIT) https://r3f.docs.pmnd.rs
- @react-three/postprocessing (MIT) and postprocessing (Zlib) https://github.com/pmndrs/postprocessing
- zustand (MIT) https://zustand.docs.pmnd.rs
- Vite (MIT) https://vite.dev
- vite-plugin-pwa / Workbox (MIT) https://vite-pwa-org.netlify.app
- Vitest (MIT) https://vitest.dev
- Puppeteer (Apache-2.0) https://pptr.dev
- geotiff.js (MIT) https://geotiffjs.github.io
- glTF-Transform (MIT) https://gltf-transform.dev
- marked (MIT) https://marked.js.org
- node-qrcode (MIT) https://github.com/soldair/node-qrcode
- tsx (MIT) https://tsx.is
- FFmpeg (LGPL/GPL) https://ffmpeg.org
- poppler pdftotext (GPL), used to read NASA PDFs in the source check
- PHP (PHP License) https://www.php.net
- SQLite (public domain) https://sqlite.org

**Fonts:** Inter and Space Grotesk (SIL Open Font License), used in the presentations.

**Hosting:** Hostinger (https://www.hostinger.com). **Code:** GitHub (https://github.com/ElQammash/jezero-sol-30).
