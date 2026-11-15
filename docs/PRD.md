# Jezero: Sol 30 — Product Requirements Document

**Team:** AstraQuest · **Team members:** Malak Tamer Said Ahmad (team owner), Rowina Walid Abdul Rahman
**Event:** NASA Space Apps Challenge 2026 · **Challenge:** Build a Junior Astronaut Mission Trainer
**Version:** 1.0 (2026-11-15) · **Status:** Built, tested and deployed
**Live:** https://mistyrose-eland-246079.hostingersite.com/ · **Code:** https://github.com/ElQammash/jezero-sol-30

---

## 1. Problem
Space-themed STEM content either hides the engineering trade-offs of a real mission or makes them too complex for young learners. Students rarely *feel* why power, oxygen, food and radiation protection compete with each other.

## 2. Product
A 3D web game: the player commands the first Mars colony (Jezero crater, 2038) for 30 sols. They walk the base as an astronaut and face six linked crises. Every decision moves four meters and the crew's health. A debrief shows the decision that mattered most.

## 3. Goals and success measures

| Goal (from the challenge) | Requirement | How we measure it |
|---|---|---|
| Trade-offs felt through play | Every option has costs and benefits; crises are linked; effects show in the 3D world | Path analysis: no option wins on its own; best paths depend on earlier choices |
| Real NASA data | Every number from a sourced data file; real terrain, model and audio; simplifications labelled | 29 sourced values, each with a Source button; unit tests check the data file |
| Playable by 10–14 year olds without instructions | Beacon, direction arrow, short objectives, icon cost cards, colour-coded meters, Arabic + English | Automated play-throughs; first-sol guidance to the base computer |
| Careless play fails, thoughtful play succeeds | Balance targets | Random player 21.6% win, thoughtful 91.3% (486 paths × 40 runs) |

## 4. Users
- **Primary:** students aged 10–14, Arabic or English speakers, on phones or computers.
- **Secondary:** teachers (a 20–35 minute session) and the Space Apps judges.

## 5. Functional requirements
1. **Title screen:** start or continue; choose commander gender (for the Arabic forms), graphics quality and language; optional cloud save.
2. **Intro story:** four short lines.
3. **3D world:** real Jezero terrain (HiRISE + CTX); sky with day, night and blue sunset; colony (habitat, farm, tower, lab, tunnels, solar field, power hub, MOXIE, comms dish, lander, garage, ice drill, reactor); NASA Perseverance model; five crewmates walking around; dust storm; solid buildings.
4. **Controls:** keyboard and mouse; touch joystick and drag on phones; E or tap to interact.
5. **HUD:** four small meters (tap for details and source), sol and crisis counter, crew health dots, folding objective, direction arrow with distance, countdown, base computer and end-sol buttons.
6. **Sol loop:** choose 2 crew tasks and the system switches → end the sol (time-lapse) → sol report.
7. **Six crises on fixed sols** (1, 4, 9, 14, 20, 26), each with 2–3 options, linked effects, and three options done by the player in the world.
8. **Outcome screen:** the result, meter changes, a NASA fact and its source.
9. **Win and lose:** win if all 30 sols are survived, all six crew are alive and the shield is above 50%; lose on running out of oxygen, any death, or a low shield at the end. 1–3 stars.
10. **Debrief:** replays each crisis's alternatives and names the decision that mattered most; retry from that crisis; a timeline chart.
11. **Languages:** Arabic (right-to-left) and English; Arabic male/female address.
12. **Saving:** automatic save on the device; optional account (username and password only).
13. **Offline:** installable PWA that caches the game, terrain, model and sounds.

## 6. Non-functional requirements
- Runs in modern browsers with no install; mobile-first layout; Low / Medium / High quality.
- First load about 4 MB (game, real terrain, rover model, audio).
- Child privacy: no email or personal data is collected.
- Honesty: no adjusted value is shown as a raw NASA figure.

## 7. Out of scope (v1)
Multiplayer, a native app-store release, a teacher dashboard, and voice-over.

## 8. Milestones (all delivered)

| # | Milestone | Status |
|---|---|---|
| M0 | Plan, clean start | ✅ |
| M1 | Engine, data, tests, path analysis | ✅ |
| M2 | 3D vertical slice | ✅ |
| M3 | All six crises playable | ✅ |
| M4 | Polish: HUD, crew, NASA model and sounds, storm, PWA, cloud save, Arabic | ✅ |
| M5 | Deployment, documentation, presentation | ✅ |

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Performance on weak phones | Quality presets; Low turns off shadows, post effects and dust |
| Asset licensing | Only NASA/USGS public-domain data and our own code |
| Players getting lost | Beacon, direction arrow, objectives |
| Balance | Exhaustive path analysis and automated play-tests |
