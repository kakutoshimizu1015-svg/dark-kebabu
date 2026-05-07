export type GameScene =
  | "title"
  | "hub"
  | "radio"
  | "exploration"
  | "prep"
  | "sales"
  | "meatTower"
  | "morning"
  | "ending";

export type Rarity = "common" | "uncommon" | "rare" | "cursed";

export type DataCondition =
  | { kind: "always" }
  | { kind: "nightAtLeast"; value: number }
  | { kind: "policeAtLeast"; value: number }
  | { kind: "reputationAtLeast"; value: number }
  | { kind: "meatTowerLevelAtLeast"; value: number }
  | { kind: "meatTowerDominant"; value: MeatTowerDominantType }
  | { kind: "customerMutationAtLeast"; customerId: string; value: number }
  | { kind: "rareIngredientLastNight" }
  | { kind: "salesFailuresAtLeast"; value: number };

export type ConditionalData<T> = T & {
  conditions?: DataCondition[];
};

export type Item = {
  id: string;
  name: string;
  description: string;
  rarity: Rarity;
  value: number;
};

export type TowerAttributes = {
  fat: number;
  poison: number;
  glow: number;
  fungus: number;
  tentacle: number;
};

export type Ingredient = {
  id: string;
  name: string;
  description: string;
  rarity: Rarity;
  weight: number;
  stink: number;
  umami: number;
  spice: number;
  weirdness: number;
  addictiveness: number;
  priceValue: number;
  towerAttributes: TowerAttributes;
};

export type IngredientTag =
  | "fat"
  | "spice"
  | "glow"
  | "fungus"
  | "tentacle"
  | "brain"
  | "sauce";

export type KebabStatKey =
  | "umami"
  | "spice"
  | "stink"
  | "addictiveness"
  | "weirdness"
  | "risk";

export type Customer = {
  id: string;
  name: string;
  desireType: string;
  favoriteStats: KebabStatKey[];
  dislikeStats: KebabStatKey[];
  satisfaction: number;
  regularity: number;
  desireProgress: number;
  mutationStage: number;
};

export type Kebab = {
  id: string;
  name: string;
  ingredients: Ingredient[];
  sauce: Sauce;
  umami: number;
  spice: number;
  stink: number;
  weirdness: number;
  addictiveness: number;
  price: number;
  risk: number;
};

export type KebabStats = {
  umami: number;
  spice: number;
  stink: number;
  addictiveness: number;
  weirdness: number;
  price: number;
  risk: number;
};

export type Sauce = {
  id: string;
  name: string;
  description: string;
  modifiers: KebabStats;
};

export type MorningLogCandidate = {
  id: string;
  title: string;
  message: string;
  conditions: DataCondition[];
};

export type StoryFragmentCategory =
  | "predecessor"
  | "meat"
  | "radio"
  | "city"
  | "customer"
  | "authority";

export type StoryFragmentSource =
  | "exploration"
  | "radio"
  | "customer"
  | "meatTower"
  | "goal";

export type StoryFragment = {
  id: string;
  title: string;
  summary: string;
  fullText: string;
  category: StoryFragmentCategory;
  source: StoryFragmentSource;
  unlockCondition: DataCondition[];
  relatedEndingFlags: string[];
  discovered: boolean;
};

export type GoalType = "shortTerm" | "midTerm" | "longTerm";

export type GoalCondition =
  | { kind: "ingredientsCollectedAtLeast"; value: number }
  | { kind: "policeIncreaseAtMost"; value: number }
  | { kind: "servedCustomerPositive"; customerId: string }
  | { kind: "fedTowerAttribute"; attribute: keyof TowerAttributes; value: number }
  | { kind: "heardRadioCategoryAtLeast"; category: RadioBroadcast["category"]; value: number }
  | { kind: "meatTowerLevelAtLeast"; value: number };

export type GoalReward =
  | { kind: "ingredient"; id: string; label: string }
  | { kind: "sauce"; id: string; label: string }
  | { kind: "recipe"; id: string; label: string }
  | { kind: "radioBroadcast"; id: string; label: string }
  | { kind: "explorationNode"; id: string; label: string }
  | { kind: "storyFragment"; id: string; label: string };

export type Goal = {
  id: string;
  title: string;
  description: string;
  type: GoalType;
  condition: GoalCondition;
  reward: GoalReward;
  completed: boolean;
};

export type RadioBroadcastRecord = {
  id: string;
  category: RadioBroadcast["category"];
  nightNumber: number;
};

export type RadioBroadcast = {
  id: string;
  station: string;
  title: string;
  transcript: string;
  category: "normal" | "interference" | "predecessor";
  effect: string;
  effectPreview: string;
  isEffectHidden?: boolean;
  signalNoise: number;
};

export type MeatTowerDominantType = "fat" | "poison" | "glow" | "fungus" | "tentacle";

export type EndingType = "inheritance" | "burn" | "coexistence" | "exposure";

export type EndingResult = {
  type: EndingType;
  name: string;
  description: string;
  reason: string;
  priority: number;
};

export type MeatTower = {
  level: number;
  exp: number;
  dominantType: MeatTowerDominantType;
  attributes: TowerAttributes;
  risk: number;
  nextMorningEffects: string[];
};

export type ExplorationNodeType =
  | "ingredient"
  | "risk"
  | "rest"
  | "story"
  | "rare"
  | "monster"
  | "merchant"
  | "fakeIngredient"
  | "bargain"
  | "stealth"
  | "anomaly"
  | "infoBroker"
  | "blackDeal"
  | "miniboss"
  | "marketPolice";

export type ExplorationRiskEffects = {
  hp: number;
  stink: number;
  noise: number;
  alert: number;
  policeAttention: number;
};

export type ExplorationAreaModifiers = {
  risk: number;
  policeAttention: number;
  bargainSuccess: number;
  fakeChance: number;
  priceMultiplier: number;
  illegalLevel: number;
};

export type ExplorationArea = {
  id: string;
  name: string;
  description: string;
  dangerLevel: number;
  unlockCondition: DataCondition[];
  nodePool: string[];
  areaModifiers: ExplorationAreaModifiers;
};

export type MarketNodeData = {
  price: number;
  bargainSuccessRate: number;
  fakeChance: number;
  illegalLevel: number;
  policeAttentionGain: number;
};

export type ExplorationNode = {
  id: string;
  name: string;
  area: string;
  type: ExplorationNodeType;
  description: string;
  depth: number;
  risk: number;
  rewardPreview: string;
  riskPreview: string;
  riskEffects: ExplorationRiskEffects;
  rewardIngredientIds: string[];
  market?: MarketNodeData;
};

export type PlayerStats = {
  hp: number;
  maxHp: number;
  stink: number;
  noise: number;
  alert: number;
};

export type MorningLog = {
  id: string;
  title: string;
  message: string;
};

export type SalesLog = {
  id: string;
  customerName: string;
  kebabName: string;
  satisfactionChange: number;
  moneyEarned: number;
  reputationChange: number;
  policeAttentionChange: number;
  desireProgressChange: number;
  mutationStageAfter: number;
  message: string;
};

export type NextNightEffects = {
  explorationRiskBonus: number;
  policeAttentionDelta: number;
  reputationDelta: number;
  playerStinkDelta: number;
  playerNoiseDelta: number;
  bonusMoney: number;
  customerRegularityDelta: number;
  specialEventUnlocked: boolean;
};

export type NightCustomerChange = {
  customerId: string;
  name: string;
  satisfaction: number;
  desireProgress: number;
  mutationStage: number;
};

export type NightMeatTowerChange = {
  levelBefore: number;
  levelAfter: number;
  expGained: number;
  dominantTypeBefore: MeatTowerDominantType;
  dominantTypeAfter: MeatTowerDominantType;
  riskBefore: number;
  riskAfter: number;
  attributesBefore: TowerAttributes;
  attributesAfter: TowerAttributes;
};

export type NightHistoryEntry = {
  nightNumber: number;
  earnedMoney: number;
  reputationChange: number;
  policeAttentionChange: number;
  ingredientsCollected: Ingredient[];
  kebabsServed: Kebab[];
  customerChanges: NightCustomerChange[];
  meatTowerChanges: NightMeatTowerChange;
  morningLogs: MorningLog[];
};

export type NightStartSnapshot = {
  money: number;
  reputation: number;
  policeAttention: number;
  meatTower: MeatTower;
};

export type GameState = {
  version: number;
  scene: GameScene;
  nightNumber: number;
  money: number;
  reputation: number;
  policeAttention: number;
  playerStats: PlayerStats;
  cargoCapacity: number;
  inventory: Ingredient[];
  cookedKebabs: Kebab[];
  selectedSalesKebabId?: string;
  selectedSalesCustomerId?: string;
  refusedCustomerIds: string[];
  selectedPrepIngredientIds: string[];
  selectedSauceId: string;
  customers: Customer[];
  salesLogs: SalesLog[];
  meatTower: MeatTower;
  morningLogs: MorningLog[];
  nightHistory: NightHistoryEntry[];
  nightStartSnapshot: NightStartSnapshot;
  nextNightEffects: NextNightEffects;
  nextNightHint: string;
  endingFlags: string[];
  currentEnding?: EndingResult;
  items: Item[];
  broadcasts: RadioBroadcast[];
  selectedBroadcast?: RadioBroadcast;
  explorationAreas: ExplorationArea[];
  selectedExplorationAreaId: string;
  currentExplorationNodes: ExplorationNode[];
  explorationDepth: number;
  collectedIngredients: Ingredient[];
  lastExplorationResult?: MorningLog;
  goals: Goal[];
  completedGoalIds: string[];
  completedGoalsLastNight: Goal[];
  unlockedFlags: string[];
  unlockedStoryFlags: string[];
  unlockedRecipes: string[];
  radioBroadcastHistory: RadioBroadcastRecord[];
};
