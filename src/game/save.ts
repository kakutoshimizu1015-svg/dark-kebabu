import { broadcasts, explorationAreas, items } from "./data";
import { goals } from "./data/goals";
import { createRadioBroadcasts } from "./radioBroadcasts";
import type { GameScene, GameState } from "./types";

export const GAME_STATE_VERSION = 1;
const SAVE_KEY = "kebab-after-dark.save";

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === "string");

const gameScenes: GameScene[] = ["title", "hub", "radio", "exploration", "prep", "sales", "meatTower", "morning", "ending"];

const isGameScene = (value: unknown): value is GameScene =>
  typeof value === "string" && gameScenes.includes(value as GameScene);

export const migrateSaveData = (rawData: unknown, fallback: GameState): GameState | null => {
  if (!isRecord(rawData)) return null;

  const version = isNumber(rawData.version) ? rawData.version : 0;
  if (version > GAME_STATE_VERSION) return null;

  const candidate = rawData as Partial<GameState>;
  if (!isNumber(candidate.nightNumber) || !isNumber(candidate.money)) return null;
  if (!isRecord(candidate.playerStats) || !isRecord(candidate.meatTower) || !Array.isArray(candidate.customers)) {
    return null;
  }

  const migrated: GameState = {
    ...fallback,
    ...candidate,
    version: GAME_STATE_VERSION,
    scene: isGameScene(candidate.scene) ? candidate.scene : "radio",
    nightNumber: candidate.nightNumber,
    money: candidate.money,
    reputation: isNumber(candidate.reputation) ? candidate.reputation : fallback.reputation,
    policeAttention: isNumber(candidate.policeAttention) ? candidate.policeAttention : fallback.policeAttention,
    playerStats: candidate.playerStats,
    inventory: Array.isArray(candidate.inventory) ? candidate.inventory : [],
    cookedKebabs: Array.isArray(candidate.cookedKebabs) ? candidate.cookedKebabs : [],
    selectedSalesCustomerId:
      typeof candidate.selectedSalesCustomerId === "string"
        ? candidate.selectedSalesCustomerId
        : fallback.selectedSalesCustomerId,
    refusedCustomerIds: isStringArray(candidate.refusedCustomerIds) ? candidate.refusedCustomerIds : [],
    customers: candidate.customers,
    meatTower: candidate.meatTower,
    morningLogs: Array.isArray(candidate.morningLogs) ? candidate.morningLogs : [],
    nightHistory: Array.isArray(candidate.nightHistory) ? candidate.nightHistory : [],
    nextNightHint: typeof candidate.nextNightHint === "string" ? candidate.nextNightHint : fallback.nextNightHint,
    endingFlags: isStringArray(candidate.endingFlags) ? candidate.endingFlags : [],
    currentEnding: candidate.currentEnding,
    goals: Array.isArray(candidate.goals) ? candidate.goals : goals,
    completedGoalIds: isStringArray(candidate.completedGoalIds) ? candidate.completedGoalIds : [],
    completedGoalsLastNight: Array.isArray(candidate.completedGoalsLastNight) ? candidate.completedGoalsLastNight : [],
    unlockedFlags: isStringArray(candidate.unlockedFlags) ? candidate.unlockedFlags : [],
    unlockedStoryFlags: isStringArray(candidate.unlockedStoryFlags) ? candidate.unlockedStoryFlags : [],
    unlockedRecipes: isStringArray(candidate.unlockedRecipes) ? candidate.unlockedRecipes : [],
    radioBroadcastHistory: Array.isArray(candidate.radioBroadcastHistory) ? candidate.radioBroadcastHistory : [],
    items: Array.isArray(candidate.items) ? candidate.items : items,
    broadcasts: Array.isArray(candidate.broadcasts) ? candidate.broadcasts : broadcasts,
    explorationAreas: Array.isArray(candidate.explorationAreas) ? candidate.explorationAreas : explorationAreas,
    selectedExplorationAreaId:
      typeof candidate.selectedExplorationAreaId === "string"
        ? candidate.selectedExplorationAreaId
        : fallback.selectedExplorationAreaId,
    selectedPrepIngredientIds: Array.isArray(candidate.selectedPrepIngredientIds)
      ? candidate.selectedPrepIngredientIds
      : [],
    currentExplorationNodes: Array.isArray(candidate.currentExplorationNodes)
      ? candidate.currentExplorationNodes
      : fallback.currentExplorationNodes,
    collectedIngredients: Array.isArray(candidate.collectedIngredients) ? candidate.collectedIngredients : [],
  };

  return {
    ...migrated,
    broadcasts: createRadioBroadcasts(migrated),
  };
};

export const saveGameState = (state: GameState): boolean => {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...state, version: GAME_STATE_VERSION }));
    return true;
  } catch {
    return false;
  }
};

export const loadGameState = (fallback: GameState): GameState | null => {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return migrateSaveData(JSON.parse(raw), fallback);
  } catch {
    return null;
  }
};

export const hasSavedGameState = (): boolean => {
  try {
    return localStorage.getItem(SAVE_KEY) !== null;
  } catch {
    return false;
  }
};

export const clearSavedGameState = () => {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // Ignore storage failures; reset can still continue in memory.
  }
};
