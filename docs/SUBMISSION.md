# Space Apps 2026: Submission Form Text

Copy each section into the matching field of the Space Apps project submission form, in this order.

**Team:** AstraQuest · **Team members:** Malak Tamer Said Ahmad (team owner), Rowina Walid Abdul Rahman · **Challenge:** Build a Junior Astronaut Mission Trainer

---

## Project Name
Jezero: Sol 30

---

## High-Level Project Summary
*Jezero: Sol 30* is a free 3D browser game for students aged 10–14. The player commands the first human colony on Mars in the year 2038, in the real Jezero crater where NASA's Perseverance rover landed, and walks the base as an astronaut on ground built from NASA HiRISE terrain data. For 30 sols they keep four meters alive (Power, Oxygen, Food and Shield) and the health of six crew. Each sol the player gives crew orders, switches systems and watches the results in the world. Six linked crises arrive one by one: where to build the habitat, how to get oxygen, water and food, a dust storm, a broken rover, a solar-storm warning delayed by the real Earth–Mars light time, and a medical emergency.

It addresses the challenge by making trade-offs something you *feel*. Power for the ice plant leaves less for the storm. A risky walk saves the base but costs health later. No option wins on its own: across all 486 decision paths, a random player wins 21.6% of missions and a thoughtful player wins 91.3%. Every number in the game comes from a NASA source and has a Source button. Simplified values are labelled.

It matters because mission planning is mostly about resources and risk, and children learn that best by making decisions and living with the results. The game needs no install or instructions. It works on phones, in Arabic and English, and offline.

---

## Link to Project Demo
https://mistyrose-eland-246079.hostingersite.com/demo/Jezero-Sol-30-Demo.pdf

(7-slide deck. Mirror: https://github.com/ElQammash/jezero-sol-30/blob/main/docs/demo/Jezero-Sol-30-Demo.pdf)

---

## Link to Final Project
Play: https://mistyrose-eland-246079.hostingersite.com/

Source code: https://github.com/ElQammash/jezero-sol-30

---

## Detailed Project Description

### What it does
- **A real 3D Mars.** The playable kilometre is NASA HiRISE elevation data of Jezero crater with its orthoimage, and an 18 km CTX elevation model forms the horizon. NASA's own Perseverance 3D model drives around as the colony's robot helper. The wind you hear was recorded by Perseverance's microphone on Mars.
- **A sol loop.** Each sol the player picks two crew tasks and switches systems, then ends the sol to see the blue Martian sunset, the night and a report of what changed.
- **Visible consequences.** Lights dim, plants wilt, regolith piles on the roof and the storm swallows the sky.
- **Six linked crises,** each with 2–3 options shown as cards with cost and gain icons. Some options are carried out by the player in the world: walking through a dust storm to start the reactor, or racing to the shelter before the solar storm arrives.
- **Guidance for children.** A direction arrow, distance, a light beacon on every target, and short objectives that fold into an icon.
- **Debrief.** The game replays every crisis with the other options and names the decision that mattered most. The player can retry from that moment.

### How it works
A deterministic TypeScript engine (seeded random numbers) does all the accounting at the end of each sol: energy, oxygen, water, food, radiation, equipment wear and crew health. The 3D world is React Three Fiber on three.js, with our own sky and terrain shaders. Cloud saves use a small PHP + SQLite API with only a username and password.

### Benefits
Students practise systems thinking: resources are linked, choices have delayed costs, and the data comes from real missions. Teachers get a free link that runs on any school device with no account needed.

### Goals
1. Trade-offs felt through play, not explained in text.
2. Real NASA data behind every rule, with honest labels for simplifications.
3. Playable by a 10–14-year-old with no instructions, in Arabic or English.

### Tools, languages and software
TypeScript, HTML/CSS, PHP; React 19, three.js, React Three Fiber, drei, @react-three/postprocessing, zustand, Vite, vite-plugin-pwa (Workbox), Vitest, Puppeteer, geotiff.js, glTF-Transform, FFmpeg, marked, qrcode, SQLite; hosted on Hostinger; code on GitHub.

---

## Use of Artificial Intelligence (AI)
We used **Claude Code** (Anthropic), an AI coding assistant, as a pair programmer. It was used to:
- write and refactor code: the game engine, 3D world, interface, Arabic and English translations, the save API and the test and build scripts;
- find, read and check NASA documents and numbers, and download and convert NASA terrain, model and audio files;
- run the balance analysis and automated browser play-tests;
- draft the documentation and this submission text. The team reviewed and edited all of it.

The team wrote the story and the six crises, made the design decisions, checked the sources and play-tested the game.

**No AI-generated images, video or audio are in the project.** Every visual is real gameplay rendered by our code or a NASA asset, and every sound is a NASA recording or a simple synthesized tone made in code.

---

## NASA Data
- **HiRISE digital terrain model and orthoimage of Jezero crater**, DTEEC_045994_1985_046060_1985_U01 / ESP_045994_1985 (NASA MRO, USGS Astrogeology analysis-ready data): https://astrogeo-ard.s3-us-west-2.amazonaws.com/mars/mro/hirise/controlled/dtm/ESP_045994_1985_ESP_046060_1985/DTEEC_045994_1985_046060_1985_U01.tif
- **CTX digital terrain model** for the 18 km horizon, P02_001820_1984_XI_18N282W__P06_003442_1987_XI_18N282W (NASA MRO, USGS Astrogeology): https://astrogeo-ard.s3-us-west-2.amazonaws.com/mars/mro/ctx/controlled/usgs/P02_001820_1984_XI_18N282W__P06_003442_1987_XI_18N282W/P02_001820_1984_XI_18N282W__P06_003442_1987_XI_18N282W_dtm.tif
- **NASA Perseverance rover 3D model:** https://science.nasa.gov/resource/mars-perseverance-rover-3d-model/
- **Perseverance microphone recordings** of Mars wind and of the rover driving: https://science.nasa.gov/resource/nasas-perseverance-rover-microphone-captures-sounds-from-mars/ and https://science.nasa.gov/resource/sounds-of-perseverance-mars-rover-driving-sol-16-90-second-highlights/
- **NASA Life Support Baseline Values and Assumptions Document (BVAD), 2018:** oxygen, water and food per crew-day; potato yield and oxygen: https://ntrs.nasa.gov/citations/20180001338
- **NASA Mars Fact Sheet:** sunlight, sol length, gravity, air: https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html
- **Curiosity RAD** surface radiation (Hassler et al. 2014): https://doi.org/10.1126/science.1244797 and the May 2024 solar storm: https://www.nasa.gov/solar-system/planets/mars/nasa-watches-mars-light-up-during-epic-solar-storm
- **Curiosity REMS** temperatures: https://science.nasa.gov/photojournal/steady-temperatures-at-mars-gale-crater
- **Opportunity and the 2018 dust storm:** https://www.jpl.nasa.gov/news/opportunity-hunkers-down-during-dust-storm/
- **Perseverance MOXIE:** https://www.jpl.nasa.gov/news/nasas-perseverance-mars-rover-extracts-first-oxygen-from-red-planet/ and https://science.nasa.gov/blog/a-day-full-of-moxie/
- **Kilopower / KRUSTY:** https://ntrs.nasa.gov/citations/20180005435
- **ISS water recovery:** https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station/
- **ISS solar arrays (iROSA):** https://appel.nasa.gov/2021/06/29/astronauts-continue-space-station-power-upgrades
- **Water-wall storm shelters (NASA RadWorks):** https://ntrs.nasa.gov/citations/20160006051
- **JPL approximate planet positions** for the real Earth–Mars light delay: https://ssd.jpl.nasa.gov/planets/approx_pos.html
- **Curiosity's blue sunset:** https://svs.gsfc.nasa.gov/11875

The full table of every number, its value, source and whether it is simplified is in the repository: https://github.com/ElQammash/jezero-sol-30/blob/main/docs/data-sources.md

---

## Space Agency Partner Data and Other References
**No data from partner space agencies (such as ESA, JAXA, CSA or others) was used.** All space data is from NASA.

Other references:
- **USDA FoodData Central**, potato energy (77 kcal per 100 g), labelled "Not NASA" in the game: https://fdc.nal.usda.gov/food-details/170026/nutrients
- **Ingenuity flight count** as reported by Live Science: https://www.livescience.com/space/mars/nasas-historic-ingenuity-helicopter-ends-its-3-year-mars-mission-suffering-rotor-damage-on-72nd-flight

Open-source software (all used under their open-source licences):
- **Language and build:** TypeScript (https://www.typescriptlang.org), Vite (https://vite.dev), vite-plugin-pwa (https://vite-pwa-org.netlify.app)
- **App and 3D:** React (https://react.dev), three.js (https://threejs.org), React Three Fiber and drei (https://r3f.docs.pmnd.rs), postprocessing (https://github.com/pmndrs/postprocessing), zustand (https://zustand.docs.pmnd.rs)
- **Testing:** Vitest (https://vitest.dev), Puppeteer (https://pptr.dev)
- **Data processing:** geotiff.js (https://geotiffjs.github.io), glTF-Transform (https://gltf-transform.dev), FFmpeg (https://ffmpeg.org)
- **Docs:** marked, node-qrcode
- **Server:** PHP (https://www.php.net) with SQLite

Fonts: Space Grotesk and Inter (SIL Open Font License, Google Fonts), used in the demo deck.

Hosting: Hostinger (https://www.hostinger.com). Code: GitHub.
