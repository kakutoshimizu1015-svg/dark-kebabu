export type GameScene =
  | "title"
  | "radio"
  | "exploration"
  | "prep"
  | "sales"
  | "meatTower"
  | "morning";

export type Rarity = "common" | "uncommon" | "rare" | "cursed";

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

export type RadioBroadcast = {
  id: string;
  station: string;
  title: string;
  transcript: string;
  effect: string;
  signalNoise: number;
};

export type MeatTowerDominantType = "fat" | "poison" | "glow" | "fungus" | "tentacle";

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
  | "monster";

export type ExplorationRiskEffects = {
  hp: number;
  stink: number;
  noise: number;
  alert: number;
  policeAttention: number;
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

export type GameState = {
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
  selectedPrepIngredientIds: string[];
  selectedSauceId: string;
  customers: Customer[];
  salesLogs: SalesLog[];
  meatTower: MeatTower;
  morningLogs: MorningLog[];
  nextNightEffects: NextNightEffects;
  items: Item[];
  broadcasts: RadioBroadcast[];
  selectedBroadcast?: RadioBroadcast;
  currentExplorationNodes: ExplorationNode[];
  explorationDepth: number;
  collectedIngredients: Ingredient[];
  lastExplorationResult?: MorningLog;
};
