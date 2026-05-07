import { storyFragments } from "./data";
import type { EndingResult, EndingType, GameState, StoryFragmentCategory } from "./types";

const endingNames: Record<EndingType, string> = {
  inheritance: "継承エンド",
  burn: "焼却エンド",
  coexistence: "共存エンド",
  exposure: "暴露エンド",
};

const endingDescriptions: Record<EndingType, string> = {
  inheritance: "先代の継ぎ足しを受け入れ、屋台と肉タワーは同じ生き物になる。",
  burn: "衛生局と警察が夜明け前に踏み込み、肉タワーごと街の一部を焼却する。",
  coexistence: "店、常連、肉タワーがぎりぎりの距離で共存し、終末ネオン街に朝が残る。",
  exposure: "FM88.8の混線に真相を乗せ、夜肉と街の記録を外へ漏らす。",
};

const discoveredFragments = (state: GameState) =>
  storyFragments.filter((fragment) => state.unlockedStoryFlags.includes(fragment.id));

const countFragmentsByCategory = (state: GameState, category: StoryFragmentCategory) =>
  discoveredFragments(state).filter((fragment) => fragment.category === category).length;

const countEndingFlags = (state: GameState, prefix: string) =>
  state.unlockedFlags.filter((flag) => flag.startsWith(prefix)).length;

const makeEnding = (type: EndingType, reason: string, priority: number): EndingResult => ({
  type,
  name: endingNames[type],
  description: endingDescriptions[type],
  reason,
  priority,
});

export const checkEndingConditions = (state: GameState): EndingResult | null => {
  const authorityAndCity = countFragmentsByCategory(state, "authority") + countFragmentsByCategory(state, "city");
  const predecessor = countFragmentsByCategory(state, "predecessor");
  const radio = countFragmentsByCategory(state, "radio");
  const customerMaxMutation = Math.max(...state.customers.map((customer) => customer.mutationStage), 0);
  const interferenceCount = state.radioBroadcastHistory.filter((broadcast) => broadcast.category === "interference").length;
  const inheritanceTower = ["fat", "tentacle", "poison"].includes(state.meatTower.dominantType);
  const rareOrMeatUsage = state.nightHistory
    .flatMap((entry) => entry.kebabsServed.flatMap((kebab) => kebab.ingredients))
    .filter((ingredient) => ingredient.id.includes("meat") || ingredient.rarity === "cursed").length;

  const candidates: EndingResult[] = [];

  if (
    (state.policeAttention >= 85 && authorityAndCity >= 2 && state.meatTower.risk >= 55) ||
    (state.unlockedFlags.includes("ending:burn") && state.policeAttention >= 72 && state.meatTower.risk >= 45)
  ) {
    candidates.push(
      makeEnding(
        "burn",
        `警察注目度${state.policeAttention}、封鎖資料${authorityAndCity}件、肉タワー危険度${state.meatTower.risk}が焼却ラインを越えた。`,
        100,
      ),
    );
  }

  if (
    (radio >= 2 && interferenceCount >= 5 && state.unlockedFlags.includes("ending:expose")) ||
    (radio >= 3 && interferenceCount >= 7)
  ) {
    candidates.push(
      makeEnding(
        "exposure",
        `FM88.8関連資料${radio}件、混線放送${interferenceCount}回。放送はもう店内だけに収まらない。`,
        90,
      ),
    );
  }

  if (
    state.meatTower.level >= 5 &&
    inheritanceTower &&
    predecessor >= 1 &&
    (state.policeAttention >= 55 || rareOrMeatUsage >= 8)
  ) {
    candidates.push(
      makeEnding(
        "inheritance",
        `肉タワーLv.${state.meatTower.level}、${state.meatTower.dominantType}系、先代資料${predecessor}件。継ぎ足しの声が店主の声に重なった。`,
        80,
      ),
    );
  }

  if (
    state.meatTower.level >= 3 &&
    state.policeAttention <= 55 &&
    customerMaxMutation <= 2 &&
    state.meatTower.risk <= 58 &&
    (state.unlockedFlags.includes("truth:tower") || state.unlockedFlags.includes("truth:market") || state.nightNumber >= 12)
  ) {
    candidates.push(
      makeEnding(
        "coexistence",
        `肉タワーLv.${state.meatTower.level}、警察注目度${state.policeAttention}、常連最大変異Stage ${customerMaxMutation}。まだ戻れる距離で朝が来た。`,
        70,
      ),
    );
  }

  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => b.priority - a.priority)[0];
};

export const getEndingProgressSignals = (state: GameState): string[] => {
  const authorityAndCity = countFragmentsByCategory(state, "authority") + countFragmentsByCategory(state, "city");
  const radio = countFragmentsByCategory(state, "radio");
  const predecessor = countFragmentsByCategory(state, "predecessor");
  const customerMaxMutation = Math.max(...state.customers.map((customer) => customer.mutationStage), 0);
  const interferenceCount = state.radioBroadcastHistory.filter((broadcast) => broadcast.category === "interference").length;
  const signals = [
    state.meatTower.level >= 4 || predecessor > 0
      ? "肉タワーの声が強くなっている"
      : "肉タワーはまだ店主の手の届く高さで震えている",
    state.policeAttention >= 65 || authorityAndCity >= 2
      ? "街の封鎖が近づいている"
      : "警察の光はまだ角を曲がりきっていない",
    customerMaxMutation <= 1
      ? "常連たちはまだ戻れるかもしれない"
      : "常連の欲望が街へ漏れ始めている",
    radio >= 2 || interferenceCount >= 5
      ? "FM88.8が真相に近づいている"
      : "FM88.8はまだ雑音のふりをしている",
  ];
  if (countEndingFlags(state, "ending:") > 0) {
    signals.push("エンディングに関わる旗が、朝ログの裏で立っている");
  }
  return signals;
};
