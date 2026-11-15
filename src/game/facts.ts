import type { NasaKey } from '../data/nasa';

/** NASA data entries behind each fact card (for the Source button). */
export const FACT_SOURCES: Record<string, NasaKey[]> = {
  surfaceRadiation: ['marsSurfaceDose'],
  regolithShield: ['marsSurfaceDose'],
  swimIce: ['electrolysisWater'],
  crops: ['potatoYield', 'potatoOxygen', 'potatoEnergy'],
  moxie: ['moxieRate', 'moxiePower', 'marsCO2'],
  kilopower: ['kilopowerOutput'],
  dustStorm2018: ['dustStormTau2018', 'solarIrradianceMars'],
  ingenuity: ['ingenuityFlights'],
  rover: ['marsGravity'],
  lightDelay: ['lightDelayMin', 'lightDelayMax'],
  oxygenNeed: ['oxygenPerCrewDay', 'co2PerCrewDay'],
  crisis: ['oxygenPerCrewDay'],
  waterWall: ['waterShielding', 'solarStorm2024'],
  blueSunset: ['blueSunset'],
};

/** Sources behind each HUD meter. */
export const METER_SOURCES: Record<'power' | 'oxygen' | 'food' | 'shield', NasaKey[]> = {
  power: ['solarIrradianceMars', 'solarCellEfficiency', 'solDuration'],
  oxygen: ['oxygenPerCrewDay', 'moxieRate', 'electrolysisWater'],
  food: ['packagedFoodPerCrewDay', 'potatoYield', 'foodEnergyPerCrewDay'],
  shield: ['marsSurfaceDose', 'solarStorm2024', 'waterShielding'],
};
