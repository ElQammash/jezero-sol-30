# Space Apps 2026: Submission Text (draft)

**Project name:** Jezero: Sol 30
**Team:** AstraQuest · *[student names]*
**Challenge:** Build a Junior Astronaut Mission Trainer
**Demo:** https://mistyrose-eland-246079.hostingersite.com/
**Repository:** https://github.com/ElQammash/jezero-sol-30

## High-level summary
*Jezero: Sol 30* is a 3D browser game for students aged 10–14. They command the first human colony on Mars in 2038, in the real Jezero crater, where NASA's Perseverance rover landed. Students walk the base as an astronaut, on ground built from real NASA HiRISE terrain data. For 30 sols they manage four meters (Power, Oxygen, Food, Shield) and the health of six crew. Six crises arrive in turn: where to build the habitat, how to get water, oxygen and food, a dust storm, a broken rover, a solar-storm warning delayed by the real Earth–Mars light time, and a medical emergency. The crises are linked, so earlier choices change later dangers. Every number has a Source button, and simplified values are labelled. A debrief replays the mission and names the decision that mattered most. The game is in Arabic and English, runs on phones and computers, and works offline.

## What it does
- **3D world:** real Jezero terrain (HiRISE, about 2 m detail, plus an 18 km CTX horizon), NASA's own Perseverance 3D model, and real wind recorded by Perseverance's microphone on Mars.
- **Choices with costs:** six crises with 2–3 options each, shown as cards with cost and gain icons. Three options are carried out by the player in the world: walk to the reactor through a dust storm, send the repair team, and race to the shelter before a countdown ends.
- **Sol loop:** choose 2 crew tasks a sol (clean the panels, pile regolith for shielding, maintenance, tend the farm, rest) and switch systems (rations, heating, farm lights, ice plant, MOXIE).
- **Visible consequences:** lights dim, plants wilt, regolith piles on the roof, the storm swallows the sky, and the crew react.
- **Debrief:** replays every crisis with the other options and shows "the decision that mattered most", with a retry from that moment.

## How it addresses the challenge
1. **Trade-offs felt, not explained.** Every option costs something now or later. Our analysis of all 486 decision paths (40 runs each) shows that no option wins on its own. A random player wins 21.6% of missions; a thoughtful player wins 91.3%.
2. **Real NASA data** shapes the world and the rules (see below), and the game openly labels what it simplifies.
3. **No instructions needed.** A light beacon and direction arrow show where to go, short objectives fold into an icon, the meters turn yellow then red before a crisis, and everything is in Arabic and English.

## Space agency data used
- **NASA/USGS HiRISE DTM and orthoimage of Jezero crater**, and a **CTX DTM** for the horizon (the playable ground).
- **NASA 3D Resources:** the Perseverance rover model.
- **NASA Perseverance microphone:** recordings of wind and of the rover driving.
- **NASA BVAD (2018):** O₂ 0.816, CO₂ 1.04, water 2.5 and food 1.83 kg per crew-day; potato yield of 105.3 g and O₂ release of 32.23 g per m² per day.
- **NASA Mars Fact Sheet:** sunlight 586.2 W/m², sol length 24.6597 h, gravity 0.38 g, 95.1% CO₂, surface pressure 6.36 mbar.
- **Curiosity RAD:** 0.67 mSv/day on the surface; the May 2024 solar storm, 8.1 mGy.
- **Curiosity REMS:** nights around −70 °C.
- **Opportunity and the 2018 global dust storm:** optical depth 10.8.
- **Perseverance MOXIE:** 12 g O₂ per hour at about 300 W.
- **Kilopower / KRUSTY:** up to 10 kWe.
- **ISS:** 98% water recovery and 30.7% solar cell efficiency.
- **Ingenuity:** 72 flights.
- **JPL approximate planet positions:** the real Earth–Mars light delay for the story date.
- **NASA RadWorks:** the water-wall storm-shelter concept.
- **NASA Curiosity:** the blue Martian sunset.
- **Not NASA, and labelled as such:** USDA potato energy.

## Use of artificial intelligence
We used **Claude Code** (Anthropic) as an AI pair programmer. It searched for and checked NASA figures, found and processed NASA terrain, model and audio files, and wrote the game rules, 3D world, interface, translations and save API. It also ran the balance analysis and automated browser play-tests. The team defined the story and the crises, reviewed the sources, play-tested, and made the design decisions. The visuals are drawn in code or are NASA's own assets; no AI image or video generators were used.

## Tools
TypeScript, React, three.js, React Three Fiber, drei, postprocessing, zustand, Vite, vite-plugin-pwa, Vitest, Puppeteer, geotiff.js, glTF-Transform, FFmpeg, PHP + SQLite, Hostinger, GitHub.
