import type { MissionDef, MissionState } from './types';

export function loadMission(def: MissionDef): MissionState {
  const collected: Record<string, boolean> = {};
  for (let i = 0; i < def.objectives.length; i += 1) {
    const obj = def.objectives[i]!;
    if (obj.type === 'collect') collected[obj.collectId ?? obj.id] = false;
  }
  if (def.pickups) {
    for (let i = 0; i < def.pickups.length; i += 1) {
      const p = def.pickups[i]!;
      if (p.objectiveFlag && collected[p.objectiveFlag] === undefined)
        collected[p.objectiveFlag] = false;
    }
  }
  if (def.structures) {
    for (let i = 0; i < def.structures.length; i += 1) {
      const s = def.structures[i]!;
      if (s.drop && s.drop.objectiveFlag && collected[s.drop.objectiveFlag] === undefined)
        collected[s.drop.objectiveFlag] = false;
    }
  }
  return {
    def,
    objectives: def.objectives.map((o) => ({ ...o, complete: false })),
    complete: false,
    collected,
  };
}
