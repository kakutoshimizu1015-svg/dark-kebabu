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
  explorationNodes,
  ingredients,
  initialMeatTower,
  items,
  sauces,
} from "../data";
import type {
  ExplorationNode,
  GameScene,
  GameState,
  Ingredient,
  Kebab,
  KebabStats,
  KebabStatKey,
  MeatTowerDominantType,
  MorningLog,
  NextNightEffects,
  RadioBroadcast,
  SalesLog,
  Sauce,
  TowerAttributes,
} from "../types";

type GameContextValue = {
  state: GameState;
  startNight: () => void;
  chooseBroadcast: (broadcast: RadioBroadcast) => void;
  exploreNode: (node: ExplorationNode) => void;
  returnFromExploration: () => void;
  discardIngredient: (inventoryIndex: number) => void;
  togglePrepIngredient: (ingredientId: string) => void;
  selectSauce: (sauceId: string) => void;
  selectSalesKebab: (kebabId: string) => void;
  prepareKebab: () => void;
  completeSales: () => void;
  feedMeatTower: () => void;
  beginNextNight: () => void;
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
  fat: "脂肪系",
  poison: "毒性混入系",
  glow: "発光系",
  fungus: "菌糸成熟系",
  tentacle: "触手系",
};

const createTowerEffects = (dominantType: MeatTowerDominantType, level: number, risk: number) => {
  const common = `Lv.${level} / リスク${risk}`;
  const effects: Record<MeatTowerDominantType, string[]> = {
    fat: [`脂肪系: 売上アップ、腐敗リスクアップ。${common}`],
    glow: [`発光系: 評判アップ、ラジオ干渉アップ。${common}`],
    fungus: [`菌糸成熟系: ソース強化、異臭アップ。${common}`],
    tentacle: [`触手系: 仕込み補助、暴走リスクアップ。${common}`],
    poison: [`毒性混入系: 違法度アップ、警察注目度アップ。${common}`],
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
    logs.push(createMorningLog("FM88.8", `FM88.8が昨夜の売上 ¥${totalSales.toLocaleString()} を読み上げた。`));
  }
  if (state.explorationDepth >= 3 || state.playerStats.alert >= 35) {
    logs.push(createMorningLog("探索変化", "裏路地の一部が帰れない道に変わった。次の探索リスクが上がる。"));
  }
  const mostChangedCustomer = state.customers
    .slice()
    .sort((a, b) => b.desireProgress - a.desireProgress)[0];
  if (mostChangedCustomer && mostChangedCustomer.desireProgress >= 20) {
    logs.push(
      createMorningLog(
        "客の変化",
        `${mostChangedCustomer.name}の欲望が進んだ。変異段階 ${mostChangedCustomer.mutationStage} の兆候が出ている。`,
      ),
    );
  }
  if (state.policeAttention + nextEffects.policeAttentionDelta >= 45) {
    logs.push(createMorningLog("警察", "警察が屋台周辺を巡回し始めた。次の夜の警察注目度が上がる。"));
  }
  if (state.reputation >= 82) {
    logs.push(createMorningLog("評判", "噂を聞いた客が増えた。常連度が少し上がる。"));
  }
  logs.push(createMorningLog("看板", "看板の文字が勝手に「もっと食わせろ」に変わった。"));
  logs.push(...towerEffects.map((effect) => createMorningLog("肉タワー", effect)));
  return logs;
};

const totalCargoWeight = (inventory: Ingredient[]) =>
  inventory.reduce((sum, ingredient) => sum + ingredient.weight, 0);

const pickIngredients = (ids: string[]) =>
  ids
    .map((id) => ingredients.find((ingredient) => ingredient.id === id))
    .filter((ingredient): ingredient is Ingredient => Boolean(ingredient));

const clampStat = (value: number) => Math.max(0, Math.round(value));
const clampBetween = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const statValue = (kebab: Kebab, key: KebabStatKey) => kebab[key];

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
  if (ids.has("twitch-tentacle")) return "触手スペシャル・ケバブ";
  if (ids.has("glow-cheese")) return "発光チーズ・ケバブ";
  if (ids.has("hell-chili") || sauce.id === "hell-red") return "地獄辛味・ケバブ";
  if (sauce.id === "brain-mayo" || ids.has("after-dark-meat")) return "脳みそマヨ・ケバブ";
  if (ids.has("mushroom-silt")) return "菌糸熟成・ケバブ";
  return "深夜まかない・ケバブ";
};

const createKebab = (selectedIngredients: Ingredient[], sauce: Sauce, nightNumber: number): Kebab => {
  const stats = calculateKebabStats(selectedIngredients, sauce);
  return {
    id: `night-${nightNumber}-kebab-${Date.now()}`,
    name: createKebabName(selectedIngredients, sauce),
    ingredients: selectedIngredients,
    sauce,
    ...stats,
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

const createExplorationNodes = (depth: number, nightNumber: number, riskBonus = 0): ExplorationNode[] => {
  const count = 5 + ((depth + nightNumber) % 4);
  return explorationNodes
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
        risk: node.risk + depthBonus * 7 + riskBonus,
        rewardIngredientIds: rewardIds,
        rewardPreview:
          deeper >= 4 && rewardIds.length > 0 ? `${node.rewardPreview} + 奥地ボーナス` : node.rewardPreview,
        riskEffects: {
          hp: node.riskEffects.hp - Math.max(0, depthBonus * 2) - Math.floor(riskBonus / 8),
          stink: node.riskEffects.stink + depthBonus,
          noise: node.riskEffects.noise + depthBonus,
          alert: node.riskEffects.alert + depthBonus * 2 + Math.floor(riskBonus / 6),
          policeAttention: node.riskEffects.policeAttention + depthBonus + Math.floor(riskBonus / 7),
        },
      };
    })
    .sort((a, b) => a.depth - b.depth || b.risk - a.risk)
    .slice(0, count);
};

const nextScene: Record<GameScene, GameScene> = {
  title: "radio",
  radio: "exploration",
  exploration: "prep",
  prep: "sales",
  sales: "meatTower",
  meatTower: "morning",
  morning: "radio",
};

const createInitialState = (): GameState => ({
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
  selectedPrepIngredientIds: ingredients.slice(0, 2).map((ingredient) => ingredient.id),
  selectedSauceId: sauces[0].id,
  customers,
  salesLogs: [],
  meatTower: initialMeatTower,
  morningLogs: [
    createMorningLog("開店前", "先代の屋台を開けた。肉タワーはまだ小さく黙っている。"),
  ],
  nextNightEffects: emptyNextNightEffects(),
  items,
  broadcasts,
  currentExplorationNodes: createExplorationNodes(1, 1),
  explorationDepth: 1,
  collectedIngredients: [],
});

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(createInitialState);

  const startNight = useCallback(() => {
    setState((current) => ({
      ...current,
      scene: "radio",
      morningLogs: [
        createMorningLog("夜の開始", `夜 ${current.nightNumber} が始まった。FM88.8が濡れた音で鳴る。`),
        ...current.morningLogs,
      ],
    }));
  }, []);

  const chooseBroadcast = useCallback((broadcast: RadioBroadcast) => {
    setState((current) => {
      const noiseGain = Math.floor(broadcast.signalNoise / 8);
      return {
        ...current,
        scene: nextScene.radio,
        selectedBroadcast: broadcast,
        currentExplorationNodes: createExplorationNodes(1, current.nightNumber),
        explorationDepth: 1,
        policeAttention: current.policeAttention + noiseGain,
        playerStats: {
          ...current.playerStats,
          noise: current.playerStats.noise + noiseGain,
          alert: current.playerStats.alert + Math.floor(noiseGain / 2),
        },
        morningLogs: [
          createMorningLog("ラジオ", `${broadcast.station}「${broadcast.title}」を受信した。${broadcast.effect}。`),
          ...current.morningLogs,
        ],
      };
    });
  }, []);

  const returnFromExploration = useCallback(() => {
    setState((current) => ({
      ...current,
      scene: "prep",
      selectedPrepIngredientIds: current.inventory.slice(0, 3).map((ingredient) => ingredient.id),
      morningLogs: [
        createMorningLog(
          "探索帰還",
          `荷物${totalCargoWeight(current.inventory)}/${current.cargoCapacity}で店へ戻った。仕込み台が待っている。`,
        ),
        ...current.morningLogs,
      ],
    }));
  }, []);

  const discardIngredient = useCallback((inventoryIndex: number) => {
    setState((current) => {
      const removed = current.inventory[inventoryIndex];
      return {
        ...current,
        inventory: current.inventory.filter((_, index) => index !== inventoryIndex),
        selectedPrepIngredientIds: current.selectedPrepIngredientIds.filter((id) => id !== removed?.id),
        morningLogs: removed
          ? [createMorningLog("荷物整理", `${removed.name}を路地に捨て、荷物を軽くした。`), ...current.morningLogs]
          : current.morningLogs,
      };
    });
  }, []);

  const exploreNode = useCallback((node: ExplorationNode) => {
    setState((current) => {
      const gainedIngredients = pickIngredients(node.rewardIngredientIds);
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
      const resultLog = createMorningLog(
        nextHp <= 0 ? "強制帰還" : "探索",
        `${node.name}: ${
          gainedIngredients.length > 0
            ? `${gainedIngredients.map((ingredient) => ingredient.name).join("、")}を入手`
            : node.type === "rest"
              ? "息を整えた"
              : "素材は得られなかった"
        }。HP${node.riskEffects.hp >= 0 ? "+" : ""}${node.riskEffects.hp}、臭気+${node.riskEffects.stink}、騒音+${node.riskEffects.noise}、警戒+${node.riskEffects.alert}。`,
      );
      const nextInventory = [...current.inventory, ...gainedIngredients];

      return {
        ...current,
        scene: nextHp <= 0 ? "prep" : "exploration",
        inventory: nextInventory,
        selectedPrepIngredientIds:
          nextHp <= 0 ? nextInventory.slice(0, 3).map((ingredient) => ingredient.id) : current.selectedPrepIngredientIds,
        collectedIngredients: [...current.collectedIngredients, ...gainedIngredients],
        policeAttention: Math.max(0, current.policeAttention + node.riskEffects.policeAttention),
        playerStats: nextStats,
        explorationDepth: nextDepth,
        currentExplorationNodes:
          nextHp <= 0 ? current.currentExplorationNodes : createExplorationNodes(nextDepth, current.nightNumber),
        lastExplorationResult: resultLog,
        morningLogs: [resultLog, ...current.morningLogs],
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

  const prepareKebab = useCallback(() => {
    setState((current) => {
      const selectedIngredients = current.selectedPrepIngredientIds
        .map((id) => current.inventory.find((ingredient) => ingredient.id === id))
        .filter((ingredient): ingredient is Ingredient => Boolean(ingredient))
        .slice(0, 3);
      if (selectedIngredients.length < 1) return current;

      const sauce = sauces.find((entry) => entry.id === current.selectedSauceId) ?? sauces[0];
      const cookedKebab = createKebab(selectedIngredients, sauce, current.nightNumber);
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
            "仕込み",
            `${cookedKebab.name}を仕込んだ。旨味${cookedKebab.umami}、刺激${cookedKebab.spice}、リスク${cookedKebab.risk}。`,
          ),
          ...current.morningLogs,
        ],
      };
    });
  }, []);

  const selectSalesKebab = useCallback((kebabId: string) => {
    setState((current) => ({ ...current, selectedSalesKebabId: kebabId }));
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
        const nextMutationStage = clampBetween(Math.floor(nextDesireProgress / 25), 0, 4);

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
          message: `${customer.name}に${kebab.name}を提供。満足${satisfactionDelta >= 0 ? "+" : ""}${satisfactionDelta}、欲望+${desireProgressGain}。`,
        });

        return {
          ...customer,
          satisfaction: nextSatisfaction,
          desireProgress: nextDesireProgress,
          mutationStage: nextMutationStage,
        };
      });

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
        morningLogs: [
          createMorningLog(
            "営業",
            `${current.customers.length}人に${kebab.name}を提供し、¥${moneyGain.toLocaleString()}を売り上げた。評判${reputationGain >= 0 ? "+" : ""}${reputationGain}、警察注目+${policeGain}。`,
          ),
          ...current.morningLogs,
        ],
      };
    });
  }, []);

  const feedMeatTower = useCallback(() => {
    setState((current) => {
      const addedAttributes = current.inventory.reduce(
        (sum, ingredient) => addTowerAttributes(sum, ingredient.towerAttributes),
        emptyTowerAttributes(),
      );
      const nextAttributes = addTowerAttributes(current.meatTower.attributes, addedAttributes);
      const gainedExp = Math.max(0, totalCargoWeight(current.inventory) * 6 + Object.values(addedAttributes).reduce((sum, value) => sum + value, 0));
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

      return {
        ...current,
        scene: nextScene.meatTower,
        inventory: [],
        selectedPrepIngredientIds: [],
        nextNightEffects,
        meatTower: {
          level: nextLevel,
          exp: nextExp,
          dominantType,
          attributes: nextAttributes,
          risk: nextRisk,
          nextMorningEffects,
        },
        morningLogs: [
          ...morningSummaryLogs,
          createMorningLog(
            "肉タワー",
            `余った素材${current.inventory.length}個を投入し、${towerTypeLabel[dominantType]}へ寄った。EXP+${gainedExp}。`,
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
      const appliedLog = createMorningLog(
        "次夜への影響",
        `探索リスク+${effects.explorationRiskBonus}、警察注目${effects.policeAttentionDelta >= 0 ? "+" : ""}${effects.policeAttentionDelta}、評判${effects.reputationDelta >= 0 ? "+" : ""}${effects.reputationDelta} が反映された。`,
      );
      return {
        ...current,
        scene: "radio",
        nightNumber: nextNightNumber,
        money: current.money + effects.bonusMoney,
        reputation: current.reputation + effects.reputationDelta,
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
        currentExplorationNodes: createExplorationNodes(1, nextNightNumber, effects.explorationRiskBonus),
        explorationDepth: 1,
        collectedIngredients: [],
        cookedKebabs: [],
        selectedSalesKebabId: undefined,
        selectedPrepIngredientIds: current.inventory.slice(0, 3).map((ingredient) => ingredient.id),
        lastExplorationResult: undefined,
        nextNightEffects: emptyNextNightEffects(),
        morningLogs: [
          createMorningLog("次の夜", `夜 ${nextNightNumber}。ラジオの向こうで新しい噂が焦げている。`),
          appliedLog,
          ...(effects.specialEventUnlocked ? [createMorningLog("特殊イベント", "客の変異段階上昇により、特別な噂が解放された。")] : []),
          ...current.morningLogs,
        ],
      };
    });
  }, []);

  const value = useMemo(
    () => ({
      state,
      startNight,
      chooseBroadcast,
      exploreNode,
      returnFromExploration,
      discardIngredient,
      togglePrepIngredient,
      selectSauce,
      selectSalesKebab,
      prepareKebab,
      completeSales,
      feedMeatTower,
      beginNextNight,
    }),
    [
      state,
      startNight,
      chooseBroadcast,
      exploreNode,
      returnFromExploration,
      discardIngredient,
      togglePrepIngredient,
      selectSauce,
      selectSalesKebab,
      prepareKebab,
      completeSales,
      feedMeatTower,
      beginNextNight,
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
