## Corrections made on 15 Nov 2026 after the first check
The first run found 10 values that could not be matched to the text of their cited page. Each one was fixed in `src/data/nasa.ts` (and therefore in the game and in every generated document). None was kept unverified.

| Key | Problem found | Fix |
|---|---|---|
| `waterShielding` | 0.0574 m did not appear in the cited NASA report. | **Value replaced** with 0.102 m, the water-container wall thickness stated in that report (Dugan et al. 2015, NTRS 20160006051). It is only used in an in-game fact, not in the rules. |
| `lightDelayMax` | 22.4 min (and "400.2 million km") did not match NASA's figure. | **Value corrected to 22.3 min**, derived from the NASA Mars Fact Sheet maximum distance of 401.4 million km. It is only used as a bound in a test. |
| `lightDelayMin` | The cited page had no such figure. | Now derived from the Mars Fact Sheet minimum distance of 54.6 million km (3.0 min). |
| `moxieRate` | The cited 2021 JPL page gives 6 g/h (first run) and a 10 g/h design goal, not 12 g/h. | Source changed to NASA's 2023 MOXIE mission-complete article, which states 12 g/h. |
| `moxiePower` | 300 W was not on the cited blog. | Source changed to NASA's Perseverance instruments page ("Power 300 watts"). |
| `solarCellEfficiency` | 30.7% was not on the cited APPEL page. | Source changed to NASA's Small Spacecraft State-of-the-Art report (XTJ-Prime cell, 30.7%). Labelled as an assumption about the colony's cells. |
| `marsSurfaceDose` | The journal page blocks automated requests. | Value confirmed in the SwRI release, which quotes the RAD principal investigator. Kept as secondary. |
| `blueSunset` | The SVS page is rendered by script. | Source changed to NASA Photojournal PIA19400, which states the 956th sol. |
| `potatoEnergy` | The FoodData Central page is rendered by script. | Confirmed through the FoodData Central API record for the same food (322 kJ, 77 kcal per 100 g). Still labelled NOT NASA. |
| `electrolysisWater` | Derived from chemistry (water is 8/9 oxygen by mass), so there is nothing to look up. | Labelled "derived". |

No game rule changed in a way that affects balance. Only `waterShielding` and `lightDelayMax` changed value, and neither is used in the sol accounting.

**Note on `dustStormTau2018`:** jpl.nasa.gov answered later automated runs with HTTP 202, a bot challenge with an empty page. The first run today (15 Nov 2026) got HTTP 200, and `10.8` was found in the page text. The value is therefore verified; only the later re-checks could not load the page.
