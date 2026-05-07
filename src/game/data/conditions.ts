import type { DataCondition, GameState } from "../types";

const failedSalesCount = (state: GameState) =>
  state.salesLogs.filter((log) => log.satisfactionChange < 0 || log.reputationChange < 0).length;

const hadRareIngredientLastNight = (state: GameState) =>
  state.nightHistory[0]?.ingredientsCollected.some(
    (ingredient) => ingredient.rarity === "rare" || ingredient.rarity === "cursed",
  ) ?? false;

const customerMutationStage = (state: GameState, customerId: string) =>
  state.customers.find((customer) => customer.id === customerId)?.mutationStage ?? 0;

export const matchesCondition = (state: GameState, condition: DataCondition) => {
  switch (condition.kind) {
    case "always":
      return true;
    case "nightAtLeast":
      return state.nightNumber >= condition.value;
    case "policeAtLeast":
      return state.policeAttention >= condition.value;
    case "reputationAtLeast":
      return state.reputation >= condition.value;
    case "meatTowerLevelAtLeast":
      return state.meatTower.level >= condition.value;
    case "meatTowerDominant":
      return state.meatTower.dominantType === condition.value;
    case "customerMutationAtLeast":
      return customerMutationStage(state, condition.customerId) >= condition.value;
    case "rareIngredientLastNight":
      return hadRareIngredientLastNight(state);
    case "salesFailuresAtLeast":
      return failedSalesCount(state) >= condition.value;
  }
};

export const matchesConditions = (state: GameState, conditions: DataCondition[] = []) =>
  conditions.length === 0 || conditions.some((condition) => matchesCondition(state, condition));
