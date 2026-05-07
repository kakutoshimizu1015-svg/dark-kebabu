import { customerMutationStage } from "../customerMutation";
import { explorationNodes, ingredients, morningLogCandidates, sauces } from "../data";
import { matchesConditions } from "../data/conditions";
import type {
  Customer,
  GameState,
  Ingredient,
  Kebab,
  KebabStatKey,
  MeatTowerDominantType,
  NightHistoryEntry,
  SalesLog,
  TowerAttributes,
} from "../types";

export type SimulationSummary = {
  nightsRequested: number;
  finalNightNumber: number;
  finalMoney: number;
  finalReputation: number;
  finalPoliceAttention: number;
  meatTowerLevel: number;
  meatTowerDominantType: MeatTowerDominantType;
  customerMutationStages: Array<{ customerId: string; name: string; mutationStage: number }>;
  blocked: boolean;
  saveable: boolean;
  error?: string;
  warnings: string[];
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(value)));

const cloneState = (state: GameState): GameState => JSON.parse(JSON.stringify(state)) as GameState;

const rng = (seed: number) => {
  let value = seed || 1;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
};

const pick = <T,>(entries: T[], random: () => number) => entries[Math.floor(random() * entries.length)];

const shuffle = <T,>(entries: T[], random: () => number) => {
  const copy = [...entries];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
};

const cargoWeight = (inventory: Ingredient[]) => inventory.reduce((sum, ingredient) => sum + ingredient.weight, 0);

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

const dominantTowerType = (attributes: TowerAttributes): MeatTowerDominantType =>
  (Object.entries(attributes) as Array<[MeatTowerDominantType, number]>).sort((a, b) => b[1] - a[1])[0][0];

const calculateKebab = (selectedIngredients: Ingredient[], nightNumber: number, random: () => number): Kebab => {
  const sauce = pick(sauces, random) ?? sauces[0];
  const base = selectedIngredients.reduce(
    (stats, ingredient) => ({
      umami: stats.umami + ingredient.umami,
      spice: stats.spice + ingredient.spice,
      stink: stats.stink + ingredient.stink,
      addictiveness: stats.addictiveness + ingredient.addictiveness,
      weirdness: stats.weirdness + ingredient.weirdness,
      price: stats.price + ingredient.priceValue,
      risk: stats.risk + ingredient.stink + ingredient.weirdness + ingredient.towerAttributes.poison * 4,
    }),
    { umami: 0, spice: 0, stink: 0, addictiveness: 0, weirdness: 0, price: 0, risk: 0 },
  );
  const countBonus = selectedIngredients.length >= 3 ? 1.12 : 1;
  const stats = {
    umami: clamp((base.umami + sauce.modifiers.umami) * countBonus, 0, 999),
    spice: clamp(base.spice + sauce.modifiers.spice, 0, 999),
    stink: clamp(base.stink + sauce.modifiers.stink, 0, 999),
    addictiveness: clamp(base.addictiveness + sauce.modifiers.addictiveness, 0, 999),
    weirdness: clamp(base.weirdness + sauce.modifiers.weirdness, 0, 999),
    price: clamp((base.price + sauce.modifiers.price) * countBonus, 0, 99999),
    risk: clamp(base.risk / Math.max(1, selectedIngredients.length) + sauce.modifiers.risk, 0, 999),
  };

  return {
    id: `sim-kebab-${nightNumber}-${Math.random().toString(16).slice(2)}`,
    name: `${selectedIngredients[0]?.name ?? "夜肉"}・シミュケバブ`,
    ingredients: selectedIngredients,
    sauce,
    ...stats,
  };
};

const statValue = (kebab: Kebab, key: KebabStatKey) => kebab[key];

const scoreKebabForCustomer = (kebab: Kebab, customer: Customer) => {
  const favoriteScore = customer.favoriteStats.reduce((sum, key) => sum + statValue(kebab, key), 0);
  const dislikeScore = customer.dislikeStats.reduce((sum, key) => sum + statValue(kebab, key), 0);
  return favoriteScore - dislikeScore * 0.72 - kebab.risk * 0.15;
};

const chooseBestKebab = (kebabs: Kebab[], customer: Customer) =>
  [...kebabs].sort((a, b) => scoreKebabForCustomer(b, customer) - scoreKebabForCustomer(a, customer))[0];

const createMorningLogs = (state: GameState, count: number) => {
  const eligible = morningLogCandidates.filter((candidate) => matchesConditions(state, candidate.conditions));
  return eligible.slice(0, Math.max(1, Math.min(count, eligible.length))).map((candidate, index) => ({
    id: `sim-log-${state.nightNumber}-${index}`,
    title: candidate.title,
    message: candidate.message,
  }));
};

const simulateOneNight = (state: GameState, random: () => number) => {
  const startMoney = state.money;
  const startReputation = state.reputation;
  const startPolice = state.policeAttention;
  const startTower = JSON.parse(JSON.stringify(state.meatTower)) as GameState["meatTower"];
  const collectedIngredients: Ingredient[] = [];
  const servedKebabs: Kebab[] = [];
  const salesLogs: SalesLog[] = [];
  let blocked = false;

  state.playerStats.hp = Math.min(state.playerStats.maxHp, Math.max(40, state.playerStats.hp + 16));
  state.playerStats.alert = Math.max(0, state.playerStats.alert - 8 + Math.floor(state.policeAttention / 15));
  state.playerStats.stink = Math.max(0, state.playerStats.stink - 6);
  state.playerStats.noise = Math.max(0, state.playerStats.noise - 5);

  let depth = 1;
  while (
    state.playerStats.hp >= state.playerStats.maxHp * 0.4 &&
    cargoWeight(state.inventory) < state.cargoCapacity * 0.8 &&
    state.playerStats.alert < 70 &&
    depth <= 8
  ) {
    const possibleNodes = explorationNodes.filter((node) => node.depth <= depth + 1);
    const node = pick(possibleNodes, random) ?? explorationNodes[0];
    state.playerStats.hp = clamp(state.playerStats.hp + node.riskEffects.hp, 0, state.playerStats.maxHp);
    state.playerStats.stink = clamp(state.playerStats.stink + node.riskEffects.stink, 0, 999);
    state.playerStats.noise = clamp(state.playerStats.noise + node.riskEffects.noise, 0, 999);
    state.playerStats.alert = clamp(state.playerStats.alert + node.riskEffects.alert, 0, 999);
    state.policeAttention = clamp(state.policeAttention + node.riskEffects.policeAttention, 0, 999);

    const rewards = node.rewardIngredientIds
      .map((id) => ingredients.find((ingredient) => ingredient.id === id))
      .filter((ingredient): ingredient is Ingredient => Boolean(ingredient))
      .slice(0, Math.max(1, Math.min(3, depth)));
    state.inventory.push(...rewards);
    collectedIngredients.push(...rewards);
    depth += 1;
    if (state.playerStats.hp <= 0) break;
  }

  if (state.inventory.length === 0) {
    const fallback = pick(ingredients, random);
    if (fallback) {
      state.inventory.push(fallback);
      collectedIngredients.push(fallback);
    }
  }

  const cookCount = Math.max(1, Math.min(3, Math.floor(random() * 3) + 1, state.inventory.length));
  const selectedIngredients = shuffle(state.inventory, random).slice(0, cookCount);
  const kebab = calculateKebab(selectedIngredients, state.nightNumber, random);
  state.cookedKebabs = [kebab];
  state.inventory = state.inventory.filter((ingredient, index) => !selectedIngredients.includes(ingredient) || index > state.inventory.indexOf(ingredient));

  state.customers = state.customers.map((customer) => {
    const chosenKebab = chooseBestKebab(state.cookedKebabs, customer) ?? kebab;
    servedKebabs.push(chosenKebab);
    const favoriteScore = customer.favoriteStats.reduce((sum, key) => sum + statValue(chosenKebab, key), 0);
    const dislikeScore = customer.dislikeStats.reduce((sum, key) => sum + statValue(chosenKebab, key), 0);
    const satisfactionDelta = Math.round(favoriteScore / 5 - dislikeScore / 8 + customer.regularity / 18);
    const nextSatisfaction = clamp(customer.satisfaction + satisfactionDelta, 0, 100);
    const moneyGain = Math.max(0, Math.round(chosenKebab.price * (0.35 + nextSatisfaction / 100)));
    const reputationGain = Math.round((nextSatisfaction - 45) / 12);
    const policeGain = Math.max(0, Math.floor((chosenKebab.stink + chosenKebab.risk + chosenKebab.weirdness / 2) / 18));
    const desireGain = Math.max(
      1,
      Math.round(chosenKebab.addictiveness / 7 + chosenKebab.stink / 15 + Math.max(0, nextSatisfaction - 50) / 18),
    );
    const desireProgress = clamp(customer.desireProgress + desireGain, 0, 100);
    const mutationStage = customerMutationStage(desireProgress);

    state.money += moneyGain;
    state.reputation += reputationGain;
    state.policeAttention += policeGain;
    salesLogs.push({
      id: `sim-sale-${state.nightNumber}-${customer.id}`,
      customerName: customer.name,
      kebabName: chosenKebab.name,
      satisfactionChange: satisfactionDelta,
      moneyEarned: moneyGain,
      reputationChange: reputationGain,
      policeAttentionChange: policeGain,
      desireProgressChange: desireGain,
      mutationStageAfter: mutationStage,
      message: `${customer.name}: ${chosenKebab.name}`,
    });

    return {
      ...customer,
      satisfaction: nextSatisfaction,
      desireProgress,
      mutationStage,
    };
  });

  const towerFeed = shuffle(state.inventory, random).slice(0, Math.ceil(state.inventory.length * 0.65));
  const addedAttributes = towerFeed.reduce(
    (sum, ingredient) => addTowerAttributes(sum, ingredient.towerAttributes),
    emptyTowerAttributes(),
  );
  const expGained = towerFeed.reduce((sum, ingredient) => sum + ingredient.weight * 6, 0);
  state.inventory = state.inventory.filter((ingredient) => !towerFeed.includes(ingredient));
  state.meatTower.attributes = addTowerAttributes(state.meatTower.attributes, addedAttributes);
  state.meatTower.exp += expGained;
  state.meatTower.level = Math.max(state.meatTower.level, 1 + Math.floor(state.meatTower.exp / 40));
  state.meatTower.dominantType = dominantTowerType(state.meatTower.attributes);
  state.meatTower.risk += addedAttributes.poison * 2 + addedAttributes.tentacle + Math.floor(expGained / 12);

  const morningLogs = createMorningLogs(state, Math.min(8, 2 + state.meatTower.level));
  const historyEntry: NightHistoryEntry = {
    nightNumber: state.nightNumber,
    earnedMoney: state.money - startMoney,
    reputationChange: state.reputation - startReputation,
    policeAttentionChange: state.policeAttention - startPolice,
    ingredientsCollected: collectedIngredients,
    kebabsServed: servedKebabs,
    customerChanges: state.customers.map((customer) => ({
      customerId: customer.id,
      name: customer.name,
      satisfaction: customer.satisfaction,
      desireProgress: customer.desireProgress,
      mutationStage: customer.mutationStage,
    })),
    meatTowerChanges: {
      levelBefore: startTower.level,
      levelAfter: state.meatTower.level,
      expGained,
      dominantTypeBefore: startTower.dominantType,
      dominantTypeAfter: state.meatTower.dominantType,
      riskBefore: startTower.risk,
      riskAfter: state.meatTower.risk,
      attributesBefore: startTower.attributes,
      attributesAfter: state.meatTower.attributes,
    },
    morningLogs,
  };
  state.nightHistory = [historyEntry, ...state.nightHistory];
  state.morningLogs = [...morningLogs, ...state.morningLogs].slice(0, 80);
  state.salesLogs = salesLogs;
  state.nightNumber += 1;
  state.cookedKebabs = [];
  state.selectedSalesKebabId = undefined;
  state.selectedPrepIngredientIds = state.inventory.slice(0, 3).map((ingredient) => ingredient.id);
  state.scene = "radio";
  state.playerStats.hp = Math.min(state.playerStats.maxHp, state.playerStats.hp + 12);

  if (state.playerStats.hp <= 0 || ingredients.length === 0 || sauces.length === 0) blocked = true;
  return blocked;
};

const buildWarnings = (state: GameState, nightsRequested: number, blocked: boolean, error?: string) => {
  const warnings: string[] = [];
  if (blocked) warnings.push("進行不能の可能性: HP/素材/ソースのいずれかが不足しました。");
  if (error) warnings.push(`エラー: ${error}`);
  if (state.policeAttention >= 100) warnings.push("警察注目度が危険域: 100以上です。");
  if (state.money >= 12580 + nightsRequested * 2500) warnings.push("報酬過多: 夜数に対してmoneyが増えすぎています。");
  if (state.meatTower.level >= Math.max(6, nightsRequested / 5)) warnings.push("肉タワー成長が早い可能性があります。");
  if (state.customers.some((customer) => customer.mutationStage >= 3 && nightsRequested <= 10)) {
    warnings.push("欲望進行が早すぎ: 10夜以内にStage 3へ到達しています。");
  }
  return warnings;
};

export const simulateRun = (initialState: GameState, nightsRequested: number): SimulationSummary => {
  const state = cloneState(initialState);
  const random = rng(8800 + nightsRequested + state.nightNumber);
  let blocked = false;
  let error: string | undefined;

  try {
    for (let index = 0; index < nightsRequested; index += 1) {
      blocked = simulateOneNight(state, random) || blocked;
      if (blocked) break;
    }
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Unknown simulation error";
  }

  let saveable = false;
  try {
    JSON.stringify(state);
    saveable = !error;
  } catch {
    saveable = false;
  }

  return {
    nightsRequested,
    finalNightNumber: state.nightNumber,
    finalMoney: state.money,
    finalReputation: state.reputation,
    finalPoliceAttention: state.policeAttention,
    meatTowerLevel: state.meatTower.level,
    meatTowerDominantType: state.meatTower.dominantType,
    customerMutationStages: state.customers.map((customer) => ({
      customerId: customer.id,
      name: customer.name,
      mutationStage: customer.mutationStage,
    })),
    blocked,
    saveable,
    error,
    warnings: buildWarnings(state, nightsRequested, blocked, error),
  };
};
