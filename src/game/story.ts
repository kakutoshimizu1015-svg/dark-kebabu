import { storyFragments } from "./data/storyFragments";
import { matchesConditions } from "./data/conditions";
import type { GameState, StoryFragmentSource } from "./types";

export const discoverStoryFragments = (state: GameState, source?: StoryFragmentSource, limit = 1) => {
  const discovered = storyFragments
    .filter((fragment) => (source ? fragment.source === source : true))
    .filter((fragment) => !state.unlockedStoryFlags.includes(fragment.id))
    .filter((fragment) => matchesConditions(state, fragment.unlockCondition))
    .slice(0, limit);

  if (discovered.length === 0) {
    return {
      fragments: [],
      unlockedStoryFlags: state.unlockedStoryFlags,
      unlockedFlags: state.unlockedFlags,
    };
  }

  const discoveredIds = [...new Set([...state.unlockedStoryFlags, ...discovered.map((fragment) => fragment.id)])];
  const fragmentCount = storyFragments.filter((fragment) => discoveredIds.includes(fragment.id)).length;
  const milestoneFlags = [
    fragmentCount >= 3 ? "story:fragments-3" : undefined,
    fragmentCount >= 6 ? "story:fragments-6" : undefined,
    fragmentCount >= 10 ? "story:fragments-10" : undefined,
  ].filter((flag): flag is string => Boolean(flag));
  const endingFlags = discovered.flatMap((fragment) => fragment.relatedEndingFlags);
  return {
    fragments: discovered,
    unlockedStoryFlags: [...new Set([...discoveredIds, ...milestoneFlags])],
    unlockedFlags: [...new Set([...state.unlockedFlags, ...endingFlags])],
  };
};

export const storyFragmentsWithDiscovery = (unlockedStoryFlags: string[]) =>
  storyFragments.map((fragment) => ({
    ...fragment,
    discovered: unlockedStoryFlags.includes(fragment.id),
  }));
