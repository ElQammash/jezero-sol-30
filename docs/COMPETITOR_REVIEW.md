# Competitor Review: how a rival team would attack *Jezero: Sol 30*

Written from the point of view of a rival team that played the game and read the repository, looking for anything a judge could mark down. Each weakness is scored against the five Space Apps judging criteria, with the fix we chose and where it shipped. Scores: **High** = a judge would likely mention it; **Med** = could cost points; **Low** = polish.

| # | Weakness a judge could raise | Impact | Creativity | Validity | Relevance | Presentation | Fix (phase) |
|---|---|---|---|---|---|---|---|
| 1 | **A child does not know how to move or where to go.** The only guide is a light beam and a small arrow. Nothing teaches WASD, the joystick, running or "press E". | High | Low | Low | **High** (challenge says *no instructions needed*) | High | Step-by-step first-time tutorial with a pointing hand on the real HUD element; arrows on the ground leading to every objective; a landing circle at the target. (Phase 3) |
| 2 | **The world is frozen.** Time only moves when you press "End sol" in the base computer; between presses nothing happens. | High | Med | Low | Med | High | The sol runs by itself: the sun crosses the sky, a blue sunset, then night, with pause and 1×/2×/4× speed. Optional "Sleep until morning". (Phase 2) |
| 3 | **Progress is hidden.** You only learn what happened from the sol report after the sol ends. Cause and effect is delayed and hard to connect. | High | Low | Med | **High** (trade-offs must be *felt*) | Med | Meters move live toward the engine's forecast the moment you change an order; a Mission Log that is always one tap away lists what is done, what is in progress, and why each meter moved. (Phase 2) |
| 4 | **The crew are decoration.** They pace back and forth and do not do the jobs you give them. | Med | High | Low | Med | High | Orders go to a named crewmember, who walks to the job and works there with a progress bar; name tags; crew go inside at night and in storms. (Phase 4) |
| 5 | **Buildings are fixed.** Choosing "underground habitat" or "ice plant" does not visibly build anything. | Med | High | Low | Med | Med | Structures from decisions appear in the world when chosen, with construction progress. (Phase 5, cut first if late) |
| 6 | **Crops and crisis choices leave weak marks.** The farm is the same dome every sol; after a crisis the world looks the same. | Med | Med | Med | High | Med | Crops grow through stages with a harvest countdown and wilt when lights are off; crisis choices leave marks (reactor glow, dust on panels, shelter, memorial). (Phase 4) |
| 7 | **No clear goal for today.** The goal for the whole mission (30 sols) is too far away for a 10-year-old. | High | Low | Low | High | Med | A daily goal picked from real engine state (the weakest meter, a coming storm, low shield), with ground arrows to where to act and a "done" moment. (Phase 3) |
| 8 | **The demo deck breaks the rules.** The old 20-slide deck is far over the 7-slide limit for Global Judging. | — | — | — | **High** (eligibility) | High | Replaced with a 7-slide English deck as a public PDF; the 20-slide prompt was deleted. (Phase 0) |
| 9 | **Too many claims, not enough proof in the deck.** Judges look at slides for a few minutes. | Med | Low | Med | Med | High | Every slide shows real gameplay; the balance proof (486 paths, random vs thoughtful win rates) is on one slide; QR code to play. (Phase 0/6) |
| 10 | **Is the radiation meter honest?** 30 sols of surface radiation is only ~20 mSv, which would not hurt anyone. | Low | Low | **High** | Med | Low | Already labelled: the Shield stands for storm protection, and the in-game note says so. Kept, and repeated in the docs. |
| 11 | **Crops grow in days, not months.** | Low | Low | High | Low | Low | The greenhouse note says real potatoes take months (from NASA BVAD) and that the game speeds this up. (Phase 4) |
| 12 | **Performance on cheap phones is unproven.** | Med | Low | Low | Med | Med | Low quality turns off shadows, effects and dust. Stated honestly in the docs as not yet measured on real low-end phones. |
| 13 | **Only one named team member on the deck.** | Low | — | — | — | Med | The deck reads member names from one place, so more names can be added in one line before submitting. |

## What a rival could not easily beat
- Ground built from real HiRISE and CTX terrain of Jezero, NASA's own Perseverance model and microphone audio.
- 29 sourced numbers, each with an in-game Source button, and honest labels on every simplification.
- A deterministic engine with a 486-path balance analysis, and a debrief that replays the other options.
- Full Arabic (right to left, male and female forms of address) as well as English, and offline play.
