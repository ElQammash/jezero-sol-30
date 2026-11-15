# Design decisions (upgrade, 15 Nov 2026)

Decisions taken without asking, chosen for a 10–14-year-old player and a NASA judge.

1. **Demo link** is the PDF on our own website (`/demo/Jezero-Sol-30-Demo.pdf`), which needs no login. The GitHub copy is a mirror.
2. **Team members on the deck:** only "Rowina" was given so far. The name is in one place in `docs/demo/deck.html` (`#members`).
3. **Submission text describes only what has actually shipped.** Each phase updates it when its feature is merged.
4. **Real-time sol length:** 180 real seconds per sol at 1×, with 75% of that in daylight (the night passes faster). The engine still settles each sol in one `endSol()` step. The HUD and the world blend toward `solPreview()`, so the balance analysis is unchanged.
5. **Crew orders go to a named person by role, chosen automatically.** Cleaning goes to Lina, the engineer; regolith to Yusuf, the geologist; the farm to Omar, the botanist; rest to Sara, the doctor. Healthy crew come first. The base computer shows who will do each job. Letting the player pick the person would need engine changes and a new balance pass, and the effect is the same for a 10-year-old. Role affinity is visual only, so the 486-path balance stays valid.
6. **Crew names kept as in the game (Lina, Omar, Sara, Yusuf, Maya).** The brief said to reuse the existing names.
7. **Phase 5 (placing buildings) was cut.** The habitat and greenhouse positions drive the tunnels, colliders, crew routes, guidance paths and in-world crisis actions, so letting the player move them would put every one of those at risk on submission day. Construction stays visible where it already was: the berm grows over the underground habitat while it is dug in, and regolith piles up on the surface habitat.
8. **The daily goal always points to the base computer** (where orders are given) until the order is given. After that, the player can watch the named crewmember walk to the job.
9. **"Storm in N sols" warning in the daily goal.** A colony would get dust-storm forecasts from orbiters, so warning two sols ahead is plausible. It also teaches the player to prepare before the storm arrives.
