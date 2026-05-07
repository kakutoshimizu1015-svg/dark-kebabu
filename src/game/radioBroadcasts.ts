import { radioBroadcasts } from "./data";
import { matchesConditions } from "./data/conditions";
import type { GameState, RadioBroadcast } from "./types";

const stableRotate = <T,>(entries: T[], seed: number) => {
  if (entries.length === 0) return entries;
  const offset = seed % entries.length;
  return [...entries.slice(offset), ...entries.slice(0, offset)];
};

export const createRadioBroadcasts = (state: GameState): RadioBroadcast[] => {
  const eligible = radioBroadcasts
    .filter((broadcast) => matchesConditions(state, broadcast.conditions))
    .map(({ conditions: _conditions, ...broadcast }) => broadcast);

  return stableRotate(eligible, state.nightNumber + state.policeAttention + state.meatTower.level).slice(0, 5);
};
