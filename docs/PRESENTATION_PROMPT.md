# Prompt for making the presentation in another tool
Paste everything below the line into Claude, Gamma, Canva Magic Design, Beautiful.ai or PowerPoint Copilot. Attach the screenshots from `docs/screenshots/` if the tool accepts images.

---

Create a professional 16:9 presentation (about 20 slides) for a NASA Space Apps Challenge 2026 judging panel. The audience is technical judges, and the product is for students aged 10–14. Use a dark Mars style: night brown #1A0F0B, sand #F6ECE3, rust accent #E2652A, sky-blue accent #4FB3D9. Headings in Space Grotesk, body text in Inter. Use one idea per slide, big numbers, and real screenshots. Add speaker notes to every slide.

**Project:** "Jezero: Sol 30", a 3D browser game by Team AstraQuest (students: [names]). Challenge: Build a Junior Astronaut Mission Trainer. Live: https://mistyrose-eland-246079.hostingersite.com/ · Code: https://github.com/ElQammash/jezero-sol-30

**Slides to make:**
1. **Title:** Jezero: Sol 30. A 3D Mars colony game built on real NASA data. Six lives. Thirty sols. Every decision counts.
2. **The challenge:** NASA wants students to feel mission trade-offs. Judges look for (1) trade-offs felt through play, (2) real NASA data, (3) no instructions needed for 10–14-year-olds.
3. **Our answer:** a real 3D Mars in the browser. You walk the first Mars colony as its commander in the real Jezero crater. No install; phone and computer; Arabic and English; works offline.
4. **Story:** Year 2038, 6 crew (commander, engineer, botanist, doctor, geologist, pilot), 30 sols, 6 crises. Win = 30 sols + all six alive + Shield above 50%. Lose = oxygen runs out or anyone dies.
5. **World made of NASA data:**
   - HiRISE elevation model of Jezero around Perseverance's landing site (1 km play area, about 2 m detail)
   - 18 km CTX horizon
   - NASA's own Perseverance 3D model
   - real wind recorded by Perseverance's microphone
6. **How to play:** WASD/joystick, drag to look, E/tap to interact. Compact HUD: 4 small meters (tap for details and NASA source), crew health dots, a folding objective, a direction arrow and a light beacon, a Base computer, and End sol.
7. **One sol:** plan 2 crew tasks (clean panels, pile regolith, maintenance, tend farm, rest) → set systems (rations, heating, farm lights, ice plant, MOXIE) → end sol (blue Martian sunset, night) → report.
8. **Six crises** (as a table):
   - Sol 1, Habitat: surface vs underground
   - Sol 4, Life support: ice vs farm vs MOXIE
   - Sol 9, Dust storm: walk to the reactor yourself vs save power vs clean panels
   - Sol 14, Rover broke: two astronauts vs robot vs abandon
   - Sol 20, Solar-storm warning delayed by the real ~21-minute Earth–Mars light time: run to the shelter vs keep working vs water wall
   - Sol 26, Medical: medbay vs share oxygen vs wait
9. **Trade-offs you feel:**
   - Ice needs power, so the storm hits harder.
   - "Save power" makes farm plants wilt.
   - A surface habitat makes the solar storm dangerous.
   - The crew who did risky spacewalks get sick later.
   - Effects are visible: lights dim, plants wilt, regolith piles up, dust fills the sky.
10. **Four meters, real units:**
    - Power: 586.2 W/m² sunlight, 30.7% cells, Kilopower 10 kWe
    - Oxygen: 0.816 kg per person per day (NASA BVAD), MOXIE 12 g/h at ~300 W, plants 32.2 g/m²/day
    - Food: 1.83 kg per person per day, potato 105.3 g/m²/day
    - Shield: Curiosity RAD 0.67 mSv/day, the 2024 solar storm 8.1 mGy, NASA water-wall shelters
11. **29 sourced numbers, each with a Source button:** BVAD, Mars Fact Sheet, Curiosity RAD and REMS, Opportunity's 2018 storm (tau 10.8), MOXIE, Ingenuity (72 flights), Kilopower, ISS (98% water recovery), JPL planet positions, RadWorks, Curiosity's blue sunset.
12. **Honest about simplifications:**
    - 30 sols of radiation is only ~20 mSv, so the Shield stands for storm protection.
    - Crops grow faster than in reality.
    - The storm is shorter than 2018's.
    - MOXIE is crew-sized.
    - Potato energy comes from USDA (labelled "Not NASA").
13. **Debrief:** the game replays each crisis with the other options and says, for example, "Sol 9, POWER: you chose 'Save power'. Replays show 'Start the backup reactor' would have survived 100% of the time." Then you can retry from that crisis.
14. **Balance:** random player 21.6% wins; thoughtful player 91.3%; all 486 decision paths simulated 40 times each, and only 4 won every time. No single option wins on its own.
15. **Technology:** TypeScript, React 19, three.js / React Three Fiber / drei / postprocessing, zustand, Vite, vite-plugin-pwa, Vitest, Puppeteer, geotiff.js, glTF-Transform, FFmpeg, PHP 8 + SQLite, Hostinger, GitHub. No game engine; sky and terrain shaders written by us.
16. **Architecture:**
    - NASA data file
    - a deterministic TypeScript game engine (sols, crises, orbit, replays)
    - 3D world
    - interface (Arabic and English)
    - saves (on the device + optional cloud with no email)
17. **Testing:** 30 unit tests; 486-path balance analysis; full play-throughs in headless Chrome in English and Arabic, including the in-world actions; live-site checks after each deployment.
18. **Accessibility:** Arabic right-to-left with male and female forms of address, mobile joystick, offline PWA, Low/Medium/High graphics, privacy-safe cloud save.
19. **AI use:** Claude Code as a pair programmer (data checking, processing NASA assets, code, translations, balance, tests). The team wrote the story and crises, reviewed sources and play-tested. No AI image or video generators were used.
20. **Close:** next steps (Android app, more crises, a teacher mode). "Thank you. Can you keep all six alive?" Show the link and a QR code.
