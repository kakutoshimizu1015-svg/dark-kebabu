import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  broadcasts,
  customers,
  explorationAreas,
  explorationNodes,
  ingredients,
  initialMeatTower,
  items,
  morningLogCandidates,
  sauces,
  storyFragments,
} from "../data";
import { matchesConditions } from "../data/conditions";
import { goals as goalData } from "../data/goals";
import { applyGoalRewards, evaluateCompletedGoals } from "../goals";
import { checkEndingConditions } from "../endings";
import { customerMutationStage, getCustomerMutationDescription } from "../customerMutation";
import { createRadioBroadcasts } from "../radioBroadcasts";
import { discoverStoryFragments } from "../story";
import {
  GAME_STATE_VERSION,
  clearSavedGameState,
  hasSavedGameState,
  loadGameState,
  saveGameState,
} from "../save";
import type {
  ExplorationNode,
  Customer,
  GameScene,
  GameState,
  Ingredient,
  Kebab,
  KebabStats,
  KebabStatKey,
  MeatTowerDominantType,
  MorningLog,
  NightHistoryEntry,
  NightStartSnapshot,
  NextNightEffects,
  RadioBroadcast,
  SalesLog,
  Sauce,
  TowerAttributes,
} from "../types";

type GameContextValue = {
  state: GameState;
  startNight: () => void;
  goToScene: (scene: GameScene) => void;
  chooseBroadcast: (broadcast: RadioBroadcast) => void;
  selectExplorationArea: (areaId: string) => void;
  exploreNode: (node: ExplorationNode) => void;
  returnFromExploration: () => void;
  discardIngredient: (inventoryIndex: number) => void;
  reorderInventory: (fromIndex: number, toIndex: number) => void;
  togglePrepIngredient: (ingredientId: string) => void;
  selectSauce: (sauceId: string) => void;
  selectSalesKebab: (kebabId: string) => void;
  selectSalesCustomer: (customerId: string) => void;
  prepareKebab: (qualityBonus?: number) => void;
  serveCustomer: (customerId?: string, kebabId?: string) => void;
  refuseCustomer: (customerId?: string) => void;
  completeSales: () => void;
  feedMeatTower: (ingredientIds?: string[]) => void;
  discoverStoryFromLog: (source?: "exploration" | "radio" | "customer" | "meatTower" | "goal") => void;
  beginNextNight: () => void;
  returnToTitle: () => void;
  continueFromEnding: () => void;
  newGame: () => void;
  manualSave: () => boolean;
  loadSavedGame: () => boolean;
  savedGameAvailable: boolean;
  debugUpdateState: (updater: (state: GameState) => GameState) => void;
  debugResetGame: () => void;
};

const GameContext = createContext<GameContextValue | undefined>(undefined);

const createMorningLog = (title: string, message: string): MorningLog => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  title,
  message,
});

const emptyTowerAttributes = (): TowerAttributes => ({
  fat: 0,
  poison: 0,
  glow: 0,
  fungus: 0,
  tentacle: 0,
});

const addTowerAttributes = (a: TowerAttributes, b: TowerAttributes): TowerAttributes => ({
  fat: a.fat + b.fat,
  poison: a.poison + b.poison,
  glow: a.glow + b.glow,
  fungus: a.fungus + b.fungus,
  tentacle: a.tentacle + b.tentacle,
});

const cloneTowerAttributes = (attributes: TowerAttributes): TowerAttributes => ({
  fat: attributes.fat,
  poison: attributes.poison,
  glow: attributes.glow,
  fungus: attributes.fungus,
  tentacle: attributes.tentacle,
});

const cloneMeatTower = (meatTower: GameState["meatTower"]): GameState["meatTower"] => ({
  ...meatTower,
  attributes: cloneTowerAttributes(meatTower.attributes),
  nextMorningEffects: [...meatTower.nextMorningEffects],
});

const createNightStartSnapshot = (state: Pick<GameState, "money" | "reputation" | "policeAttention" | "meatTower">): NightStartSnapshot => ({
  money: state.money,
  reputation: state.reputation,
  policeAttention: state.policeAttention,
  meatTower: cloneMeatTower(state.meatTower),
});

const dominantTowerType = (attributes: TowerAttributes): MeatTowerDominantType => {
  const candidates: Array<[MeatTowerDominantType, number]> = [
    ["fat", attributes.fat],
    ["poison", attributes.poison],
    ["glow", attributes.glow],
    ["fungus", attributes.fungus],
    ["tentacle", attributes.tentacle],
  ];
  return candidates.sort((a, b) => b[1] - a[1])[0][0];
};

const towerTypeLabel: Record<MeatTowerDominantType, string> = {
  fat: "Fat line",
  poison: "Poison line",
  glow: "Glow line",
  fungus: "Fungus line",
  tentacle: "Tentacle line",
};

const createTowerEffects = (dominantType: MeatTowerDominantType, level: number, risk: number) => {
  const common = `Lv.${level} / risk ${risk}`;
  const effects: Record<MeatTowerDominantType, string[]> = {
    fat: [`Fat line: sales up, rot risk up. ${common}`],
    glow: [`Glow line: reputation up, radio interference up. ${common}`],
    fungus: [`Fungus line: sauce support, stink up. ${common}`],
    tentacle: [`Tentacle line: prep support, runaway risk up. ${common}`],
    poison: [`Poison line: illegal flavor up, police attention up. ${common}`],
  };
  return effects[dominantType];
};

const emptyNextNightEffects = (): NextNightEffects => ({
  explorationRiskBonus: 0,
  policeAttentionDelta: 0,
  reputationDelta: 0,
  playerStinkDelta: 0,
  playerNoiseDelta: 0,
  bonusMoney: 0,
  customerRegularityDelta: 0,
  specialEventUnlocked: false,
});

const towerEffectsForNextNight = (dominantType: MeatTowerDominantType, towerRisk: number): NextNightEffects => {
  const effects = emptyNextNightEffects();
  switch (dominantType) {
    case "fat":
      effects.bonusMoney += 420;
      effects.explorationRiskBonus += 4 + Math.floor(towerRisk / 12);
      effects.playerStinkDelta += 2;
      break;
    case "glow":
      effects.reputationDelta += 4;
      effects.playerNoiseDelta += 5;
      effects.explorationRiskBonus += 2;
      break;
    case "fungus":
      effects.playerStinkDelta += 6;
      effects.reputationDelta += 1;
      break;
    case "tentacle":
      effects.customerRegularityDelta += 3;
      effects.explorationRiskBonus += 5;
      effects.specialEventUnlocked = true;
      break;
    case "poison":
      effects.policeAttentionDelta += 9;
      effects.explorationRiskBonus += 7;
      break;
  }
  return effects;
};

const createMorningSummary = (state: GameState, towerEffects: string[], nextEffects: NextNightEffects): MorningLog[] => {
  const logs: MorningLog[] = [];
  const totalSales = state.salesLogs.reduce((sum, log) => sum + log.moneyEarned, 0);
  if (totalSales > 0) {
    logs.push(createMorningLog("FM88.8", `FM88.8 read last night sales: ${totalSales.toLocaleString()} yen.`));
  }
  if (state.explorationDepth >= 3 || state.playerStats.alert >= 35) {
    logs.push(createMorningLog("Exploration shift", "Some alleys changed into routes that are harder to return from."));
  }
  const mostChangedCustomer = state.customers.slice().sort((a, b) => b.desireProgress - a.desireProgress)[0];
  if (mostChangedCustomer && mostChangedCustomer.desireProgress >= 20) {
    logs.push(
      createMorningLog(
        "Customer change",
        `${mostChangedCustomer.name} desire progressed. Mutation stage ${mostChangedCustomer.mutationStage} is visible.`,
      ),
    );
  }
  if (state.policeAttention + nextEffects.policeAttentionDelta >= 45) {
    logs.push(createMorningLog("Police", "Police patrols started circling the stall area."));
  }
  if (state.reputation >= 82) {
    logs.push(createMorningLog("Reputation", "More hungry customers heard the rumor before sunrise."));
  }
  logs.push(createMorningLog("District shift", "The district copied last night and returned it slightly wrong."));
  logs.push(...towerEffects.map((effect) => createMorningLog("Meat tower", effect)));

  const eligibleMorningLogs = morningLogCandidates.filter((candidate) => matchesConditions(state, candidate.conditions));
  const morningOffset = (state.nightNumber + state.meatTower.level + state.policeAttention) % Math.max(1, eligibleMorningLogs.length);
  logs.push(
    ...[...eligibleMorningLogs.slice(morningOffset), ...eligibleMorningLogs.slice(0, morningOffset)]
      .slice(0, Math.min(5, 2 + state.meatTower.level))
      .map((candidate) => createMorningLog(candidate.title, candidate.message)),
  );

  const eligibleStoryFragments = storyFragments.filter(
    (fragment) => !state.unlockedStoryFlags.includes(fragment.id) && matchesConditions(state, fragment.unlockCondition),
  );
  logs.push(
    ...eligibleStoryFragments
      .slice(0, 1)
      .map((fragment) => createMorningLog(fragment.title, fragment.summary)),
  );

  return logs;
};

const createNextNightHint = (state: GameState, nextEffects: NextNightEffects): string => {
  const mostChangedCustomer = [...state.customers].sort((a, b) => b.desireProgress - a.desireProgress)[0];
  if (state.meatTower.dominantType === "glow") return "裏路地の奥で発光素材の噂が光っている。";
  if (state.policeAttention + nextEffects.policeAttentionDelta >= 55) return "警察の巡回が屋台の角を覚え始めている。";
  if (mostChangedCustomer && mostChangedCustomer.desireProgress >= 45) return `${mostChangedCustomer.name}が今夜また来そうだ。`;
  if (nextEffects.specialEventUnlocked) return "常連の変異が、新しい路地の入口を開けている。";
  if (state.meatTower.level >= 3) return "肉タワーが新しい形に近づいている。";
  return "FM88.8があなた宛のノイズを流している。";
};

const createNightHistoryEntry = (
  state: GameState,
  nextMeatTower: GameState["meatTower"],
  expGained: number,
  morningLogs: MorningLog[],
): NightHistoryEntry => ({
  nightNumber: state.nightNumber,
  earnedMoney: state.money - state.nightStartSnapshot.money,
  reputationChange: state.reputation - state.nightStartSnapshot.reputation,
  policeAttentionChange: state.policeAttention - state.nightStartSnapshot.policeAttention,
  ingredientsCollected: [...state.collectedIngredients],
  kebabsServed: [...state.cookedKebabs],
  customerChanges: state.customers.map((customer) => ({
    customerId: customer.id,
    name: customer.name,
    satisfaction: customer.satisfaction,
    desireProgress: customer.desireProgress,
    mutationStage: customer.mutationStage,
  })),
  meatTowerChanges: {
    levelBefore: state.nightStartSnapshot.meatTower.level,
    levelAfter: nextMeatTower.level,
    expGained,
    dominantTypeBefore: state.nightStartSnapshot.meatTower.dominantType,
    dominantTypeAfter: nextMeatTower.dominantType,
    riskBefore: state.nightStartSnapshot.meatTower.risk,
    riskAfter: nextMeatTower.risk,
    attributesBefore: cloneTowerAttributes(state.nightStartSnapshot.meatTower.attributes),
    attributesAfter: cloneTowerAttributes(nextMeatTower.attributes),
  },
  morningLogs,
});

const totalCargoWeight = (inventory: Ingredient[]) =>
  inventory.reduce((sum, ingredient) => sum + ingredient.weight, 0);

const totalCargoValue = (inventory: Ingredient[]) =>
  inventory.reduce((sum, ingredient) => sum + ingredient.priceValue, 0);

const returnAccidentRisk = (state: GameState) =>
  clampBetween(
    Math.round(
      state.playerStats.stink * 0.35 +
        state.playerStats.noise * 0.25 +
        state.playerStats.alert * 0.3 +
        state.policeAttention * 0.2 +
        state.explorationDepth * 4,
    ),
    5,
    75,
  );

const returnSuccessRate = (state: GameState) => clampBetween(100 - returnAccidentRisk(state), 25, 95);

const pickIngredients = (ids: string[]) =>
  ids
    .map((id) => ingredients.find((ingredient) => ingredient.id === id))
    .filter((ingredient): ingredient is Ingredient => Boolean(ingredient));

const clampStat = (value: number) => Math.max(0, Math.round(value));
const clampBetween = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const statValue = (kebab: Kebab, key: KebabStatKey) => kebab[key];

const createSalesLogId = (customerId: string) => `${Date.now()}-${customerId}-${Math.random().toString(16).slice(2)}`;

const evaluateCustomerSale = (customer: Customer, kebab: Kebab) => {
  const favoriteScore = customer.favoriteStats.reduce((sum, key) => sum + statValue(kebab, key), 0);
  const dislikeScore = customer.dislikeStats.reduce((sum, key) => sum + statValue(kebab, key), 0);
  const satisfactionDelta = Math.round(favoriteScore / 5 - dislikeScore / 8 + customer.regularity / 18);
  const nextSatisfaction = clampBetween(customer.satisfaction + satisfactionDelta, 0, 100);
  const moneyEarned = Math.max(0, Math.round(kebab.price * (0.35 + nextSatisfaction / 100)));
  const reputationChange = Math.round((nextSatisfaction - 45) / 12);
  const policeAttentionChange = Math.max(0, Math.floor((kebab.stink + kebab.risk + kebab.weirdness / 2) / 18));
  const desireProgressChange = Math.max(
    1,
    Math.round(kebab.addictiveness / 7 + kebab.stink / 15 + Math.max(0, nextSatisfaction - 50) / 18),
  );
  const nextDesireProgress = clampBetween(customer.desireProgress + desireProgressChange, 0, 100);
  const mutationStageAfter = customerMutationStage(nextDesireProgress);
  const mutationDescription = getCustomerMutationDescription({
    ...customer,
    mutationStage: mutationStageAfter,
  });

  return {
    satisfactionDelta,
    nextSatisfaction,
    moneyEarned,
    reputationChange,
    policeAttentionChange,
    desireProgressChange,
    nextDesireProgress,
    mutationStageAfter,
    mutationDescription,
  };
};

export const calculateKebabStats = (selectedIngredients: Ingredient[], sauce: Sauce): KebabStats => {
  const base = selectedIngredients.reduce<KebabStats>(
    (sum, ingredient) => ({
      umami: sum.umami + ingredient.umami,
      spice: sum.spice + ingredient.spice,
      stink: sum.stink + ingredient.stink,
      addictiveness: sum.addictiveness + ingredient.addictiveness,
      weirdness: sum.weirdness + ingredient.weirdness,
      price: sum.price + ingredient.priceValue,
      risk: sum.risk + ingredient.weirdness + ingredient.stink,
    }),
    { umami: 0, spice: 0, stink: 0, addictiveness: 0, weirdness: 0, price: 0, risk: 0 },
  );

  const countBonus = selectedIngredients.length >= 3 ? 1.12 : 1;
  return {
    umami: clampStat((base.umami + sauce.modifiers.umami) * countBonus),
    spice: clampStat(base.spice + sauce.modifiers.spice),
    stink: clampStat(base.stink + sauce.modifiers.stink),
    addictiveness: clampStat(base.addictiveness + sauce.modifiers.addictiveness),
    weirdness: clampStat(base.weirdness + sauce.modifiers.weirdness),
    price: clampStat(480 + base.price + sauce.modifiers.price + base.umami * 7 + base.addictiveness * 5),
    risk: clampStat(Math.floor(base.risk / 4) + sauce.modifiers.risk),
  };
};

const createKebabName = (selectedIngredients: Ingredient[], sauce: Sauce): string => {
  const ids = new Set(selectedIngredients.map((ingredient) => ingredient.id));
  if (ids.has("twitch-tentacle")) return "隗ｦ謇九せ繝壹す繝｣繝ｫ繝ｻ繧ｱ繝舌ヶ";
  if (ids.has("glow-cheese")) return "逋ｺ蜈峨メ繝ｼ繧ｺ繝ｻ繧ｱ繝舌ヶ";
  if (ids.has("hell-chili") || sauce.id === "hell-red") return "蝨ｰ迯・ｾ帛袖繝ｻ繧ｱ繝舌ヶ";
  if (sauce.id === "brain-mayo" || ids.has("after-dark-meat")) return "閼ｳ縺ｿ縺昴・繝ｨ繝ｻ繧ｱ繝舌ヶ";
  if (ids.has("mushroom-silt")) return "闖檎ｳｸ辭滓・繝ｻ繧ｱ繝舌ヶ";
  return "豺ｱ螟懊∪縺九↑縺・・繧ｱ繝舌ヶ";
};

const createKebab = (selectedIngredients: Ingredient[], sauce: Sauce, nightNumber: number, qualityBonus = 0): Kebab => {
  const stats = calculateKebabStats(selectedIngredients, sauce);
  const qualityMultiplier = 1 + qualityBonus / 100;
  return {
    id: `night-${nightNumber}-kebab-${Date.now()}`,
    name: createKebabName(selectedIngredients, sauce),
    ingredients: selectedIngredients,
    sauce,
    ...stats,
    umami: clampStat(stats.umami * qualityMultiplier),
    spice: clampStat(stats.spice * (1 + qualityBonus / 180)),
    stink: clampStat(stats.stink * (1 - Math.max(0, qualityBonus) / 220)),
    addictiveness: clampStat(stats.addictiveness * qualityMultiplier),
    price: clampStat(stats.price * (1 + qualityBonus / 140)),
    risk: clampStat(stats.risk * (1 - qualityBonus / 260)),
  };
};

const removeUsedIngredients = (inventory: Ingredient[], usedIds: string[]) => {
  const remainingUsedIds = [...usedIds];
  return inventory.filter((ingredient) => {
    const usedIndex = remainingUsedIds.indexOf(ingredient.id);
    if (usedIndex === -1) return true;
    remainingUsedIds.splice(usedIndex, 1);
    return false;
  });
};

const createExplorationNodes = (
  depth: number,
  nightNumber: number,
  riskBonus = 0,
  areaId = "back-alley",
): ExplorationNode[] => {
  const count = 5 + ((depth + nightNumber) % 4);
  const nightDanger = Math.max(0, nightNumber - 1);
  const area = explorationAreas.find((entry) => entry.id === areaId) ?? explorationAreas[0];
  return explorationNodes
    .filter((node) => area.nodePool.includes(node.id))
    .map((node, index) => {
      const depthBonus = Math.max(0, depth - 1);
      const deeper = node.depth + depthBonus;
      const rewardIds =
        node.type === "ingredient" || node.type === "rare" || node.type === "monster"
          ? node.rewardIngredientIds.slice(0, Math.min(node.rewardIngredientIds.length, 1 + Math.floor(deeper / 3)))
          : node.rewardIngredientIds;

      return {
        ...node,
        id: `${node.id}-d${depth}-${index}`,
        depth: deeper,
        risk: node.risk + depthBonus * 7 + nightDanger * 3 + riskBonus + area.areaModifiers.risk,
        rewardIngredientIds: rewardIds,
        market: node.market
          ? {
              ...node.market,
              price: Math.max(0, Math.round(node.market.price * area.areaModifiers.priceMultiplier)),
              bargainSuccessRate: clampBetween(node.market.bargainSuccessRate + area.areaModifiers.bargainSuccess, 0, 95),
              fakeChance: clampBetween(node.market.fakeChance + area.areaModifiers.fakeChance, 0, 95),
              illegalLevel: node.market.illegalLevel + area.areaModifiers.illegalLevel,
              policeAttentionGain: node.market.policeAttentionGain + area.areaModifiers.policeAttention,
            }
          : undefined,
        rewardPreview:
          deeper >= 4 && rewardIds.length > 0 ? `${node.rewardPreview} + 螂･蝨ｰ繝懊・繝翫せ` : node.rewardPreview,
        riskEffects: {
          hp: node.riskEffects.hp - Math.max(0, depthBonus * 2) - Math.floor(nightDanger / 2) - Math.floor(riskBonus / 8),
          stink: node.riskEffects.stink + depthBonus,
          noise: node.riskEffects.noise + depthBonus,
          alert: node.riskEffects.alert + depthBonus * 2 + nightDanger + Math.floor(riskBonus / 6),
          policeAttention:
            node.riskEffects.policeAttention +
            depthBonus +
            Math.floor(nightDanger / 2) +
            Math.floor(riskBonus / 7) +
            area.areaModifiers.policeAttention,
        },
      };
    })
    .sort((a, b) => a.depth - b.depth || b.risk - a.risk)
    .slice(0, count);
};

const nextScene: Record<GameScene, GameScene> = {
  title: "hub",
  hub: "hub",
  radio: "hub",
  exploration: "hub",
  prep: "hub",
  sales: "hub",
  meatTower: "morning",
  morning: "hub",
  ending: "title",
};

const createInitialState = (): GameState => ({
  version: GAME_STATE_VERSION,
  scene: "title",
  nightNumber: 1,
  money: 12580,
  reputation: 78,
  policeAttention: 18,
  playerStats: {
    hp: 62,
    maxHp: 100,
    stink: 0,
    noise: 12,
    alert: 18,
  },
  cargoCapacity: 14,
  inventory: ingredients.slice(0, 2),
  cookedKebabs: [],
  selectedSalesKebabId: undefined,
  selectedSalesCustomerId: customers[0]?.id,
  refusedCustomerIds: [],
  selectedPrepIngredientIds: ingredients.slice(0, 2).map((ingredient) => ingredient.id),
  selectedSauceId: sauces[0].id,
  customers,
  salesLogs: [],
  meatTower: initialMeatTower,
  morningLogs: [
    createMorningLog("Opening memory", "The inherited stall is open. The meat tower is still breathing."),
  ],
  nightHistory: [],
  nightStartSnapshot: {
    money: 12580,
    reputation: 78,
    policeAttention: 18,
    meatTower: cloneMeatTower(initialMeatTower),
  },
  nextNightEffects: emptyNextNightEffects(),
  nextNightHint: "FM88.8があなた宛のノイズを流している。",
  endingFlags: [],
  currentEnding: undefined,
  items,
  broadcasts,
  explorationAreas,
  selectedExplorationAreaId: "back-alley",
  currentExplorationNodes: createExplorationNodes(1, 1, 0, "back-alley"),
  explorationDepth: 1,
  collectedIngredients: [],
  goals: goalData,
  completedGoalIds: [],
  completedGoalsLastNight: [],
  unlockedFlags: [],
  unlockedStoryFlags: [],
  unlockedRecipes: [],
  radioBroadcastHistory: [],
});

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(createInitialState);
  const [savedGameAvailable, setSavedGameAvailable] = useState(hasSavedGameState);
  const startNight = useCallback(() => {
    setState((current) => ({
      ...current,
      scene: "hub",
      broadcasts: createRadioBroadcasts(current),
      morningLogs: [
        createMorningLog(
          "Night start",
          `Night ${current.nightNumber} begins. FM88.8 is tracing last night.`,
        ),
        ...current.morningLogs,
      ],
    }));
  }, []);

  const goToScene = useCallback((scene: GameScene) => {
    setState((current) => ({ ...current, scene }));
  }, []);

  const chooseBroadcast = useCallback((broadcast: RadioBroadcast) => {
    setState((current) => {
      const noiseGain = Math.floor(broadcast.signalNoise / 8);
      const storyDiscovery = discoverStoryFragments(current, "radio", broadcast.category === "predecessor" ? 2 : 1);
      const storyLogs = storyDiscovery.fragments.map((fragment) =>
        createMorningLog("Story fragment", `${fragment.title}: ${fragment.summary}`),
      );
      return {
        ...current,
        scene: nextScene.radio,
        selectedBroadcast: broadcast,
        radioBroadcastHistory: [
          ...current.radioBroadcastHistory,
          { id: broadcast.id, category: broadcast.category, nightNumber: current.nightNumber },
        ],
        currentExplorationNodes: createExplorationNodes(
          1,
          current.nightNumber,
          Math.floor(current.policeAttention / 6),
          current.selectedExplorationAreaId,
        ),
        explorationDepth: 1,
        policeAttention: current.policeAttention + noiseGain,
        playerStats: {
          ...current.playerStats,
          noise: current.playerStats.noise + noiseGain,
          alert: current.playerStats.alert + Math.floor(noiseGain / 2),
        },
        unlockedStoryFlags: storyDiscovery.unlockedStoryFlags,
        unlockedFlags: storyDiscovery.unlockedFlags,
        morningLogs: [
          ...storyLogs,
          createMorningLog("Radio", `${broadcast.station} "${broadcast.title}" received. ${broadcast.isEffectHidden ? "The effect is hidden in static" : broadcast.effectPreview}.`),
          ...current.morningLogs,
        ],
      };
    });
  }, []);

  const selectExplorationArea = useCallback((areaId: string) => {
    setState((current) => {
      const area = explorationAreas.find((entry) => entry.id === areaId);
      if (!area) return current;
      const riskBonus = current.nextNightEffects.explorationRiskBonus + Math.floor(current.policeAttention / 6);
      return {
        ...current,
        selectedExplorationAreaId: area.id,
        explorationDepth: 1,
        currentExplorationNodes: createExplorationNodes(1, current.nightNumber, riskBonus, area.id),
        lastExplorationResult: createMorningLog(
          "Exploration area",
          `${area.name} selected. Danger Lv.${area.dangerLevel}; market rules may change price, fake chance, and police attention.`,
        ),
      };
    });
  }, []);

  const returnFromExploration = useCallback(() => {
    setState((current) => {
      const successRate = returnSuccessRate(current);
      const accidentRisk = 100 - successRate;
      const roll = Math.random() * 100;
      const rareIngredient = ingredients.find((ingredient) => ingredient.rarity === "rare") ?? ingredients[0];
      let nextInventory = [...current.inventory];
      let nextCollectedIngredients = [...current.collectedIngredients];
      let nextPoliceAttention = current.policeAttention;
      let nextPlayerStats = { ...current.playerStats };
      let resultLog: MorningLog;

      if (roll <= successRate) {
        resultLog = createMorningLog(
          "Safe return",
          `Return chance ${successRate}%. Cargo ${totalCargoWeight(nextInventory)}/${current.cargoCapacity} arrived safely.`,
        );
      } else if (roll <= successRate + accidentRisk * 0.28 && nextInventory.length > 0) {
        const dropCount = Math.max(1, Math.ceil(nextInventory.length * 0.25));
        const dropped = nextInventory.slice(-dropCount);
        nextInventory = nextInventory.slice(0, -dropCount);
        resultLog = createMorningLog(
          "Dropped cargo",
          `${dropped.map((ingredient) => ingredient.name).join(", ")} was lost on the way back.`,
        );
      } else if (roll <= successRate + accidentRisk * 0.56) {
        const hpLoss = 8 + current.explorationDepth * 3;
        nextPlayerStats = {
          ...nextPlayerStats,
          hp: Math.max(0, nextPlayerStats.hp - hpLoss),
          alert: nextPlayerStats.alert + 4,
        };
        resultLog = createMorningLog("Chased home", `Something followed you. HP-${hpLoss}, alert +4.`);
      } else if (roll <= successRate + accidentRisk * 0.82) {
        const policeGain = 6 + Math.floor(current.explorationDepth * 1.5);
        nextPoliceAttention += policeGain;
        nextPlayerStats = {
          ...nextPlayerStats,
          alert: nextPlayerStats.alert + policeGain,
          noise: nextPlayerStats.noise + 2,
        };
        resultLog = createMorningLog("Police spotted you", `Police attention +${policeGain}, noise +2.`);
      } else {
        nextInventory = [...nextInventory, rareIngredient];
        nextCollectedIngredients = [...nextCollectedIngredients, rareIngredient];
        nextPlayerStats = {
          ...nextPlayerStats,
          stink: nextPlayerStats.stink + 8,
        };
        resultLog = createMorningLog("Rare return", `${rareIngredient.name} came back with you, but stink +8.`);
      }

      return {
        ...current,
        scene: "hub",
        inventory: nextInventory,
        collectedIngredients: nextCollectedIngredients,
        policeAttention: nextPoliceAttention,
        playerStats: nextPlayerStats,
        selectedPrepIngredientIds: nextInventory.slice(0, 3).map((ingredient) => ingredient.id),
        morningLogs: [resultLog, ...current.morningLogs],
      };
    });
  }, []);

  const discardIngredient = useCallback((inventoryIndex: number) => {
    setState((current) => {
      const removed = current.inventory[inventoryIndex];
      return {
        ...current,
        inventory: current.inventory.filter((_, index) => index !== inventoryIndex),
        selectedPrepIngredientIds: current.selectedPrepIngredientIds.filter((id) => id !== removed?.id),
        morningLogs: removed
          ? [createMorningLog("Cargo discarded", `${removed.name} was thrown away to lighten the bag.`), ...current.morningLogs]
          : current.morningLogs,
      };
    });
  }, []);

  const exploreNode = useCallback((node: ExplorationNode) => {
    setState((current) => {
      const market = node.market;
      const bargainRoll = Math.random() * 100;
      const bargainSucceeded = Boolean(market && market.bargainSuccessRate > 0 && bargainRoll <= market.bargainSuccessRate);
      const marketPrice = market
        ? Math.max(0, Math.round(market.price * (bargainSucceeded ? 0.65 : 1)))
        : 0;
      const canPay = current.money >= marketPrice;
      const fakeRoll = Math.random() * 100;
      const fakeTriggered = Boolean(market && canPay && market.fakeChance > 0 && fakeRoll <= market.fakeChance);
      const rewardIds = fakeTriggered
        ? ["fake-spice"]
        : canPay
          ? node.rewardIngredientIds
          : [];
      const gainedIngredients = pickIngredients(rewardIds);
      const nextHp = Math.min(
        current.playerStats.maxHp,
        Math.max(0, current.playerStats.hp + node.riskEffects.hp),
      );
      const nextStats = {
        hp: nextHp,
        maxHp: current.playerStats.maxHp,
        stink: Math.max(0, current.playerStats.stink + node.riskEffects.stink),
        noise: Math.max(0, current.playerStats.noise + node.riskEffects.noise),
        alert: Math.max(0, current.playerStats.alert + node.riskEffects.alert),
      };
      const nextDepth = current.explorationDepth + 1;
      const marketMessage = market
        ? canPay
          ? ` Paid ¥${marketPrice.toLocaleString()}${bargainSucceeded ? " after bargaining" : ""}. ${
              fakeTriggered ? "Fake detected too late." : `Illegal level ${market.illegalLevel}.`
            }`
          : ` Could not pay ¥${marketPrice.toLocaleString()}, so the reward slipped away.`
        : "";
      const resultLog = createMorningLog(
        nextHp <= 0 ? "Forced return" : "Exploration",
        `${node.name}: ${
          gainedIngredients.length > 0
            ? `found ${gainedIngredients.map((ingredient) => ingredient.name).join(", ")}`
            : node.type === "rest"
              ? "caught your breath"
              : "risk increased"
        }. HP${node.riskEffects.hp >= 0 ? "+" : ""}${node.riskEffects.hp}, stink +${node.riskEffects.stink}, noise +${node.riskEffects.noise}, alert +${node.riskEffects.alert}.${marketMessage}`,
      );
      const nextInventory = [...current.inventory, ...gainedIngredients];
      const shouldDiscoverStory = node.type === "story" || node.type === "infoBroker";
      const storyDiscovery = shouldDiscoverStory
        ? discoverStoryFragments(current, "exploration", node.type === "infoBroker" ? 3 : 2)
        : discoverStoryFragments(current, "exploration", 0);
      const storyLogs = storyDiscovery.fragments.map((fragment) =>
        createMorningLog("Story fragment", `${fragment.title}: ${fragment.summary}`),
      );

      return {
        ...current,
        scene: nextHp <= 0 ? "hub" : "exploration",
        money: current.money - (canPay ? marketPrice : 0),
        inventory: nextInventory,
        selectedPrepIngredientIds:
          nextHp <= 0 ? nextInventory.slice(0, 3).map((ingredient) => ingredient.id) : current.selectedPrepIngredientIds,
        collectedIngredients: [...current.collectedIngredients, ...gainedIngredients],
        policeAttention: Math.max(
          0,
          current.policeAttention +
            node.riskEffects.policeAttention +
            (market && canPay ? market.policeAttentionGain + market.illegalLevel : 0),
        ),
        playerStats: nextStats,
        explorationDepth: nextDepth,
        currentExplorationNodes:
          nextHp <= 0
            ? current.currentExplorationNodes
            : createExplorationNodes(
                nextDepth,
                current.nightNumber,
                Math.floor(current.policeAttention / 6),
                current.selectedExplorationAreaId,
              ),
        unlockedStoryFlags: storyDiscovery.unlockedStoryFlags,
        unlockedFlags: storyDiscovery.unlockedFlags,
        lastExplorationResult: resultLog,
        morningLogs: [...storyLogs, resultLog, ...current.morningLogs],
      };
    });
  }, []);

  const reorderInventory = useCallback((fromIndex: number, toIndex: number) => {
    setState((current) => {
      if (fromIndex === toIndex || !current.inventory[fromIndex] || !current.inventory[toIndex]) return current;
      const nextInventory = [...current.inventory];
      const [moved] = nextInventory.splice(fromIndex, 1);
      nextInventory.splice(toIndex, 0, moved);
      return {
        ...current,
        inventory: nextInventory,
        selectedPrepIngredientIds: nextInventory.slice(0, 3).map((ingredient) => ingredient.id),
      };
    });
  }, []);

  const togglePrepIngredient = useCallback((ingredientId: string) => {
    setState((current) => {
      const isSelected = current.selectedPrepIngredientIds.includes(ingredientId);
      if (isSelected) {
        return {
          ...current,
          selectedPrepIngredientIds: current.selectedPrepIngredientIds.filter((id) => id !== ingredientId),
        };
      }
      if (current.selectedPrepIngredientIds.length >= 3) return current;
      return {
        ...current,
        selectedPrepIngredientIds: [...current.selectedPrepIngredientIds, ingredientId],
      };
    });
  }, []);

  const selectSauce = useCallback((sauceId: string) => {
    setState((current) => ({ ...current, selectedSauceId: sauceId }));
  }, []);

  const prepareKebab = useCallback((qualityBonus = 0) => {
    setState((current) => {
      const selectedIngredients = current.selectedPrepIngredientIds
        .map((id) => current.inventory.find((ingredient) => ingredient.id === id))
        .filter((ingredient): ingredient is Ingredient => Boolean(ingredient))
        .slice(0, 3);
      if (selectedIngredients.length < 1) return current;

      const sauce = sauces.find((entry) => entry.id === current.selectedSauceId) ?? sauces[0];
      const cookedKebab = createKebab(selectedIngredients, sauce, current.nightNumber, qualityBonus);
      const nextInventory = removeUsedIngredients(current.inventory, selectedIngredients.map((ingredient) => ingredient.id));

      return {
        ...current,
        scene: nextScene.prep,
        inventory: nextInventory,
        cookedKebabs: [...current.cookedKebabs, cookedKebab],
        selectedSalesKebabId: cookedKebab.id,
        selectedPrepIngredientIds: nextInventory.slice(0, 3).map((ingredient) => ingredient.id),
        playerStats: {
          ...current.playerStats,
          stink: current.playerStats.stink + Math.ceil(cookedKebab.stink / 8),
        },
        morningLogs: [
          createMorningLog(
            "Prep",
            `${cookedKebab.name} was prepared. Umami ${cookedKebab.umami}, spice ${cookedKebab.spice}, risk ${cookedKebab.risk}.`,
          ),
          ...current.morningLogs,
        ],
      };
    });
  }, []);

  const selectSalesKebab = useCallback((kebabId: string) => {
    setState((current) => ({ ...current, selectedSalesKebabId: kebabId }));
  }, []);

  const selectSalesCustomer = useCallback((customerId: string) => {
    setState((current) => ({ ...current, selectedSalesCustomerId: customerId }));
  }, []);

  const serveCustomer = useCallback((customerId?: string, kebabId?: string) => {
    setState((current) => {
      const targetCustomerId = customerId ?? current.selectedSalesCustomerId ?? current.customers[0]?.id;
      const targetKebabId = kebabId ?? current.selectedSalesKebabId ?? current.cookedKebabs[0]?.id;
      const customer = current.customers.find((entry) => entry.id === targetCustomerId);
      const kebab = current.cookedKebabs.find((entry) => entry.id === targetKebabId);
      if (!customer || !kebab) return current;

      const result = evaluateCustomerSale(customer, kebab);
      const nextCustomer: Customer = {
        ...customer,
        satisfaction: result.nextSatisfaction,
        desireProgress: result.nextDesireProgress,
        mutationStage: result.mutationStageAfter,
      };
      const salesLog: SalesLog = {
        id: createSalesLogId(customer.id),
        customerName: customer.name,
        kebabName: kebab.name,
        satisfactionChange: result.satisfactionDelta,
        moneyEarned: result.moneyEarned,
        reputationChange: result.reputationChange,
        policeAttentionChange: result.policeAttentionChange,
        desireProgressChange: result.desireProgressChange,
        mutationStageAfter: result.mutationStageAfter,
        message: `${customer.name} ate ${kebab.name}. Satisfaction ${result.satisfactionDelta >= 0 ? "+" : ""}${result.satisfactionDelta}, desire +${result.desireProgressChange}, stage ${result.mutationStageAfter}: ${result.mutationDescription}`,
      };
      const nextCustomers = current.customers.map((entry) => (entry.id === customer.id ? nextCustomer : entry));
      const nextCookedKebabs = current.cookedKebabs.filter((entry) => entry.id !== kebab.id);
      const storyDiscovery = discoverStoryFragments(
        { ...current, customers: nextCustomers, salesLogs: [salesLog, ...current.salesLogs] },
        "customer",
        1,
      );
      const storyLogs = storyDiscovery.fragments.map((fragment) =>
        createMorningLog("Story fragment", `${fragment.title}: ${fragment.summary}`),
      );

      return {
        ...current,
        money: current.money + result.moneyEarned,
        reputation: current.reputation + result.reputationChange,
        policeAttention: current.policeAttention + result.policeAttentionChange,
        playerStats: {
          ...current.playerStats,
          alert: current.playerStats.alert + result.policeAttentionChange,
        },
        customers: nextCustomers,
        cookedKebabs: nextCookedKebabs,
        selectedSalesKebabId: nextCookedKebabs[0]?.id,
        selectedSalesCustomerId: nextCustomers.find((entry) => entry.id !== customer.id)?.id ?? customer.id,
        salesLogs: [salesLog, ...current.salesLogs],
        unlockedStoryFlags: storyDiscovery.unlockedStoryFlags,
        unlockedFlags: storyDiscovery.unlockedFlags,
        morningLogs: [
          ...storyLogs,
          createMorningLog(
            "Sales",
            `${customer.name} was served ${kebab.name}. Money +${result.moneyEarned.toLocaleString()}, reputation ${result.reputationChange >= 0 ? "+" : ""}${result.reputationChange}, police +${result.policeAttentionChange}.`,
          ),
          ...current.morningLogs,
        ],
      };
    });
  }, []);

  const refuseCustomer = useCallback((customerId?: string) => {
    setState((current) => {
      const targetCustomerId = customerId ?? current.selectedSalesCustomerId ?? current.customers[0]?.id;
      const customer = current.customers.find((entry) => entry.id === targetCustomerId);
      if (!customer) return current;
      const nextCustomers = current.customers.map((entry) =>
        entry.id === customer.id
          ? {
              ...entry,
              satisfaction: clampBetween(entry.satisfaction - 5, 0, 100),
              regularity: clampBetween(entry.regularity - 2, 0, 100),
            }
          : entry,
      );
      const salesLog: SalesLog = {
        id: createSalesLogId(customer.id),
        customerName: customer.name,
        kebabName: "提供拒否",
        satisfactionChange: -5,
        moneyEarned: 0,
        reputationChange: -1,
        policeAttentionChange: -1,
        desireProgressChange: 0,
        mutationStageAfter: customer.mutationStage,
        message: `${customer.name} was refused. No sale, but the stall avoided feeding the wrong desire.`,
      };

      return {
        ...current,
        reputation: current.reputation - 1,
        policeAttention: Math.max(0, current.policeAttention - 1),
        customers: nextCustomers,
        refusedCustomerIds: [...new Set([...current.refusedCustomerIds, customer.id])],
        selectedSalesCustomerId: nextCustomers.find((entry) => entry.id !== customer.id)?.id ?? customer.id,
        salesLogs: [salesLog, ...current.salesLogs],
        morningLogs: [
          createMorningLog("Sales refusal", `${customer.name} was turned away. The street noticed the restraint.`),
          ...current.morningLogs,
        ],
      };
    });
  }, []);

  const completeSales = useCallback(() => {
    setState((current) => {
      const fallbackSauce = sauces.find((entry) => entry.id === current.selectedSauceId) ?? sauces[0];
      const fallbackIngredients = current.inventory.slice(0, Math.min(3, Math.max(1, current.inventory.length)));
      const fallbackKebab = createKebab(fallbackIngredients, fallbackSauce, current.nightNumber);
      const kebab =
        current.cookedKebabs.find((entry) => entry.id === current.selectedSalesKebabId) ??
        current.cookedKebabs.at(-1) ??
        fallbackKebab;

      let moneyGain = 0;
      let reputationGain = 0;
      let policeGain = 0;
      const salesLogs: SalesLog[] = [];

      const nextCustomers = current.customers.map((customer) => {
        const favoriteScore = customer.favoriteStats.reduce((sum, key) => sum + statValue(kebab, key), 0);
        const dislikeScore = customer.dislikeStats.reduce((sum, key) => sum + statValue(kebab, key), 0);
        const satisfactionDelta = Math.round(favoriteScore / 5 - dislikeScore / 8 + customer.regularity / 18);
        const nextSatisfaction = clampBetween(customer.satisfaction + satisfactionDelta, 0, 100);
        const customerMoney = Math.max(0, Math.round(kebab.price * (0.35 + nextSatisfaction / 100)));
        const customerReputation = Math.round((nextSatisfaction - 45) / 12);
        const customerPolice = Math.max(0, Math.floor((kebab.stink + kebab.risk + kebab.weirdness / 2) / 18));
        const desireProgressGain = Math.max(
          1,
          Math.round(kebab.addictiveness / 7 + kebab.stink / 15 + Math.max(0, nextSatisfaction - 50) / 18),
        );
        const nextDesireProgress = clampBetween(customer.desireProgress + desireProgressGain, 0, 100);
        const nextMutationStage = customerMutationStage(nextDesireProgress);
        const mutationDescription = getCustomerMutationDescription({
          ...customer,
          mutationStage: nextMutationStage,
        });

        moneyGain += customerMoney;
        reputationGain += customerReputation;
        policeGain += customerPolice;
        salesLogs.push({
          id: `${Date.now()}-${customer.id}-${Math.random().toString(16).slice(2)}`,
          customerName: customer.name,
          kebabName: kebab.name,
          satisfactionChange: satisfactionDelta,
          moneyEarned: customerMoney,
          reputationChange: customerReputation,
          policeAttentionChange: customerPolice,
          desireProgressChange: desireProgressGain,
          mutationStageAfter: nextMutationStage,
          message: `${customer.name} ate ${kebab.name}. Satisfaction ${satisfactionDelta >= 0 ? "+" : ""}${satisfactionDelta}, desire +${desireProgressGain}, stage ${nextMutationStage}: ${mutationDescription}`,
        });

        return {
          ...customer,
          satisfaction: nextSatisfaction,
          desireProgress: nextDesireProgress,
          mutationStage: nextMutationStage,
        };
      });

      const storyDiscovery = discoverStoryFragments(
        { ...current, customers: nextCustomers, salesLogs },
        "customer",
        2,
      );
      const storyLogs = storyDiscovery.fragments.map((fragment) =>
        createMorningLog("Story fragment", `${fragment.title}: ${fragment.summary}`),
      );

      return {
        ...current,
        scene: nextScene.sales,
        money: current.money + moneyGain,
        reputation: current.reputation + reputationGain,
        policeAttention: current.policeAttention + policeGain,
        playerStats: {
          ...current.playerStats,
          alert: current.playerStats.alert + policeGain,
        },
        customers: nextCustomers,
        salesLogs,
        cookedKebabs: current.cookedKebabs.length > 0 ? current.cookedKebabs : [kebab],
        unlockedStoryFlags: storyDiscovery.unlockedStoryFlags,
        unlockedFlags: storyDiscovery.unlockedFlags,
        morningLogs: [
          ...storyLogs,
          createMorningLog(
            "Sales",
            `${current.customers.length} customers ate ${kebab.name}. Money +${moneyGain.toLocaleString()}, reputation ${reputationGain >= 0 ? "+" : ""}${reputationGain}, police +${policeGain}.`,
          ),
          ...current.morningLogs,
        ],
      };
    });
  }, []);

  const feedMeatTower = useCallback((ingredientIds?: string[]) => {
    setState((current) => {
      const targetInventory = ingredientIds && ingredientIds.length > 0
        ? ingredientIds
            .map((id) => current.inventory.find((ingredient) => ingredient.id === id))
            .filter((ingredient): ingredient is Ingredient => Boolean(ingredient))
        : current.inventory;
      const addedAttributes = targetInventory.reduce(
        (sum, ingredient) => addTowerAttributes(sum, ingredient.towerAttributes),
        emptyTowerAttributes(),
      );
      const nextAttributes = addTowerAttributes(current.meatTower.attributes, addedAttributes);
      const gainedExp = Math.max(0, totalCargoWeight(targetInventory) * 6 + Object.values(addedAttributes).reduce((sum, value) => sum + value, 0));
      const nextExp = current.meatTower.exp + gainedExp;
      const nextLevel = Math.max(current.meatTower.level, 1 + Math.floor(nextExp / 40));
      const dominantType = dominantTowerType(nextAttributes);
      const nextRisk = current.meatTower.risk + addedAttributes.poison * 2 + addedAttributes.tentacle + Math.floor(gainedExp / 12);
      const nextMorningEffects = createTowerEffects(dominantType, nextLevel, nextRisk);
      const towerNextEffects = towerEffectsForNextNight(dominantType, nextRisk);
      const pressureEffects: NextNightEffects = {
        explorationRiskBonus: current.policeAttention >= 45 ? 8 : current.policeAttention >= 32 ? 4 : 0,
        policeAttentionDelta: current.policeAttention >= 45 ? 5 : 0,
        reputationDelta: current.reputation >= 82 ? 2 : 0,
        playerStinkDelta: 0,
        playerNoiseDelta: 0,
        bonusMoney: 0,
        customerRegularityDelta: current.reputation >= 82 ? 4 : 0,
        specialEventUnlocked: current.customers.some((customer) => customer.mutationStage >= 2),
      };
      const nextNightEffects: NextNightEffects = {
        explorationRiskBonus: towerNextEffects.explorationRiskBonus + pressureEffects.explorationRiskBonus,
        policeAttentionDelta: towerNextEffects.policeAttentionDelta + pressureEffects.policeAttentionDelta,
        reputationDelta: towerNextEffects.reputationDelta + pressureEffects.reputationDelta,
        playerStinkDelta: towerNextEffects.playerStinkDelta + pressureEffects.playerStinkDelta,
        playerNoiseDelta: towerNextEffects.playerNoiseDelta + pressureEffects.playerNoiseDelta,
        bonusMoney: towerNextEffects.bonusMoney + pressureEffects.bonusMoney,
        customerRegularityDelta: towerNextEffects.customerRegularityDelta + pressureEffects.customerRegularityDelta,
        specialEventUnlocked: towerNextEffects.specialEventUnlocked || pressureEffects.specialEventUnlocked,
      };
      const morningSummaryLogs = createMorningSummary(current, nextMorningEffects, nextNightEffects);
      const nextNightHint = createNextNightHint(
        { ...current, meatTower: { ...current.meatTower, dominantType, level: nextLevel, risk: nextRisk } },
        nextNightEffects,
      );
      const nextMeatTower = {
        level: nextLevel,
        exp: nextExp,
        dominantType,
        attributes: nextAttributes,
        risk: nextRisk,
        nextMorningEffects,
      };
      const towerLog = createMorningLog(
        "Meat tower",
        `${targetInventory.length} ingredients were fed into the tower. It leaned toward ${towerTypeLabel[dominantType]}. XP+${gainedExp}.`,
      );
      const finalMorningLogs = [
        ...morningSummaryLogs,
        towerLog,
        ...Array.from({ length: Math.max(0, Math.min(4, nextLevel - 1)) }, (_, index) =>
          createMorningLog(
            "Meat tower echo",
            `Lv.${nextLevel} tower echo ${index + 1}: a new morning change is forming.`,
          ),
        ),
      ];
      const towerStoryDiscovery = discoverStoryFragments({ ...current, meatTower: nextMeatTower }, "meatTower", 2);
      const nightHistoryEntry = createNightHistoryEntry(current, nextMeatTower, gainedExp, finalMorningLogs);
      const completedGoals = evaluateCompletedGoals(
        { ...current, meatTower: nextMeatTower },
        nightHistoryEntry,
      );
      const rewardState = applyGoalRewards(current, completedGoals);
      const goalStoryDiscovery = completedGoals.length > 0
        ? discoverStoryFragments(
            { ...current, unlockedStoryFlags: rewardState.unlockedStoryFlags, unlockedFlags: rewardState.unlockedFlags },
            "goal",
            2,
          )
        : { fragments: [], unlockedStoryFlags: rewardState.unlockedStoryFlags, unlockedFlags: rewardState.unlockedFlags };
      const storyLogs = [...towerStoryDiscovery.fragments, ...goalStoryDiscovery.fragments].map((fragment) =>
        createMorningLog("Story fragment", `${fragment.title}: ${fragment.summary}`),
      );
      const goalLogs = completedGoals.map((goal) =>
        createMorningLog("Goal complete", `${goal.title}: ${goal.reward.label} unlocked.`),
      );
      const nextState: GameState = {
        ...current,
        scene: nextScene.meatTower,
        inventory: removeUsedIngredients(current.inventory, targetInventory.map((ingredient) => ingredient.id)),
        selectedPrepIngredientIds: [],
        nextNightEffects,
        nextNightHint,
        meatTower: nextMeatTower,
        goals: rewardState.goals,
        completedGoalIds: rewardState.completedGoalIds,
        completedGoalsLastNight: completedGoals,
        unlockedFlags: [...new Set([...towerStoryDiscovery.unlockedFlags, ...goalStoryDiscovery.unlockedFlags])],
        unlockedStoryFlags: [...new Set([...towerStoryDiscovery.unlockedStoryFlags, ...goalStoryDiscovery.unlockedStoryFlags])],
        unlockedRecipes: rewardState.unlockedRecipes,
        nightHistory: [nightHistoryEntry, ...current.nightHistory],
        morningLogs: [...storyLogs, ...goalLogs, ...finalMorningLogs, ...current.morningLogs],
      };
      const ending = checkEndingConditions(nextState);
      if (!ending) return nextState;
      return {
        ...nextState,
        scene: "ending",
        currentEnding: ending,
        endingFlags: [...new Set([...nextState.endingFlags, `ending:${ending.type}`])],
      };
    });
  }, []);

  const discoverStoryFromLog = useCallback((source?: "exploration" | "radio" | "customer" | "meatTower" | "goal") => {
    setState((current) => {
      const discovery = discoverStoryFragments(current, source, 1);
      if (discovery.fragments.length === 0) return current;
      return {
        ...current,
        unlockedStoryFlags: discovery.unlockedStoryFlags,
        unlockedFlags: discovery.unlockedFlags,
        morningLogs: [
          ...discovery.fragments.map((fragment) =>
            createMorningLog("Story fragment", `${fragment.title}: ${fragment.summary}`),
          ),
          ...current.morningLogs,
        ],
      };
    });
  }, []);

  const beginNextNight = useCallback(() => {
    setState((current) => {
      const effects = current.nextNightEffects;
      const nextNightNumber = current.nightNumber + 1;
      const nextPoliceAttention = Math.max(0, current.policeAttention - 4 + effects.policeAttentionDelta);
      const nextMoney = current.money + effects.bonusMoney;
      const nextReputation = current.reputation + effects.reputationDelta;
      const appliedLog = createMorningLog(
        "Next night effects",
        `Exploration risk +${effects.explorationRiskBonus}, police ${effects.policeAttentionDelta >= 0 ? "+" : ""}${effects.policeAttentionDelta}, reputation ${effects.reputationDelta >= 0 ? "+" : ""}${effects.reputationDelta}.`,
      );
      return {
        ...current,
        scene: "hub",
        nightNumber: nextNightNumber,
        broadcasts: createRadioBroadcasts({
          ...current,
          nightNumber: nextNightNumber,
          money: nextMoney,
          reputation: nextReputation,
          policeAttention: nextPoliceAttention,
        }),
        money: nextMoney,
        reputation: nextReputation,
        policeAttention: nextPoliceAttention,
        playerStats: {
          ...current.playerStats,
          hp: Math.min(current.playerStats.maxHp, current.playerStats.hp + 12),
          stink: Math.max(0, current.playerStats.stink - 5 + effects.playerStinkDelta),
          noise: Math.max(0, current.playerStats.noise - 4 + effects.playerNoiseDelta),
          alert: Math.max(0, current.playerStats.alert - 4 + Math.floor(nextPoliceAttention / 12)),
        },
        customers: current.customers.map((customer) => ({
          ...customer,
          regularity: clampBetween(customer.regularity + effects.customerRegularityDelta, 0, 100),
        })),
        currentExplorationNodes: createExplorationNodes(
          1,
          nextNightNumber,
          effects.explorationRiskBonus + Math.floor(nextPoliceAttention / 6),
          current.selectedExplorationAreaId,
        ),
        explorationDepth: 1,
        collectedIngredients: [],
        cookedKebabs: [],
        salesLogs: [],
        selectedSalesKebabId: undefined,
        selectedSalesCustomerId: current.customers[0]?.id,
        refusedCustomerIds: [],
        completedGoalsLastNight: [],
        selectedPrepIngredientIds: current.inventory.slice(0, 3).map((ingredient) => ingredient.id),
        lastExplorationResult: undefined,
        nextNightEffects: emptyNextNightEffects(),
        nextNightHint: createNextNightHint(current, emptyNextNightEffects()),
        nightStartSnapshot: createNightStartSnapshot({
          money: nextMoney,
          reputation: nextReputation,
          policeAttention: nextPoliceAttention,
          meatTower: current.meatTower,
        }),
        morningLogs: [
          createMorningLog("Next night", `Night ${nextNightNumber} begins. The street carries last night forward.`),
          appliedLog,
          ...(effects.specialEventUnlocked
            ? [createMorningLog("Special route", "A customer mutation has unlocked a new route rumor.")]
            : []),
          ...current.morningLogs,
        ],
      };
    });
  }, []);

  const returnToTitle = useCallback(() => {
    setState((current) => ({ ...current, scene: "title" }));
  }, []);

  const continueFromEnding = useCallback(() => {
    setState((current) => ({ ...current, scene: "morning" }));
  }, []);

  const newGame = useCallback(() => {
    clearSavedGameState();
    setSavedGameAvailable(false);
    setState(createInitialState());
  }, []);

  const manualSave = useCallback(() => {
    const saved = saveGameState(state);
    setSavedGameAvailable(saved || hasSavedGameState());
    return saved;
  }, [state]);

  const loadSavedGame = useCallback(() => {
    const loaded = loadGameState(createInitialState());
    if (!loaded) {
      clearSavedGameState();
      setSavedGameAvailable(false);
      return false;
    }
    setState(loaded);
    setSavedGameAvailable(true);
    return true;
  }, []);

  const debugUpdateState = useCallback((updater: (state: GameState) => GameState) => {
    setState((current) => updater(current));
  }, []);

  const debugResetGame = useCallback(() => {
    clearSavedGameState();
    setSavedGameAvailable(false);
    setState(createInitialState());
  }, []);

  const value = useMemo(
    () => ({
      state,
      startNight,
      goToScene,
      chooseBroadcast,
      selectExplorationArea,
      exploreNode,
      returnFromExploration,
      discardIngredient,
      reorderInventory,
        togglePrepIngredient,
        selectSauce,
        selectSalesKebab,
        selectSalesCustomer,
        prepareKebab,
        serveCustomer,
        refuseCustomer,
        completeSales,
      feedMeatTower,
      discoverStoryFromLog,
      beginNextNight,
      returnToTitle,
      continueFromEnding,
      newGame,
      manualSave,
      loadSavedGame,
      savedGameAvailable,
      debugUpdateState,
      debugResetGame,
    }),
    [
      state,
      startNight,
      chooseBroadcast,
      selectExplorationArea,
      exploreNode,
      returnFromExploration,
      discardIngredient,
      reorderInventory,
      togglePrepIngredient,
      selectSauce,
      selectSalesKebab,
      selectSalesCustomer,
      prepareKebab,
      serveCustomer,
      refuseCustomer,
      completeSales,
      feedMeatTower,
      discoverStoryFromLog,
      beginNextNight,
      returnToTitle,
      continueFromEnding,
      newGame,
      manualSave,
      loadSavedGame,
      savedGameAvailable,
      debugUpdateState,
      debugResetGame,
    ],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used inside GameProvider");
  }
  return context;
}
