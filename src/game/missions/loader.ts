import type { MissionDef, MissionState } from './types';

export function loadMission(def: MissionDef): MissionState {
  return {
    def,
    objectives: def.objectives.map((o) => ({ ...o, complete: false })),
    complete: false,
  };
}
