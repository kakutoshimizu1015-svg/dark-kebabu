import type { GameState, Goal, GoalReward, NightHistoryEntry } from "./types";

const rewardFlag = (reward: GoalReward) => `unlock:${reward.kind}:${reward.id}`;

const customerIdByName = (state: GameState, name: string) =>
  state.customers.find((customer) => customer.name === name)?.id;

const isGoalComplete = (goal: Goal, state: GameState, nightHistoryEntry: NightHistoryEntry) => {
  const { condition } = goal;
  switch (condition.kind) {
    case "ingredientsCollectedAtLeast":
      return nightHistoryEntry.ingredientsCollected.length >= condition.value;
    case "policeIncreaseAtMost":
      return nightHistoryEntry.policeAttentionChange <= condition.value;
    case "servedCustomerPositive":
      return state.salesLogs.some(
        (log) => customerIdByName(state, log.customerName) === condition.customerId && log.satisfactionChange > 0,
      );
    case "fedTowerAttribute": {
      const before = nightHistoryEntry.meatTowerChanges.attributesBefore[condition.attribute];
      const after = nightHistoryEntry.meatTowerChanges.attributesAfter[condition.attribute];
      return after - before >= condition.value;
    }
    case "heardRadioCategoryAtLeast":
      return (
        state.radioBroadcastHistory.filter((record) => record.category === condition.category).length >=
        condition.value
      );
    case "meatTowerLevelAtLeast":
      return nightHistoryEntry.meatTowerChanges.levelAfter >= condition.value;
  }
};

export const evaluateCompletedGoals = (state: GameState, nightHistoryEntry: NightHistoryEntry) =>
  state.goals.filter(
    (goal) => !goal.completed && !state.completedGoalIds.includes(goal.id) && isGoalComplete(goal, state, nightHistoryEntry),
  );

export const applyGoalRewards = (state: GameState, completedGoals: Goal[]) => {
  const rewardFlags = completedGoals.map((goal) => rewardFlag(goal.reward));
  const recipeRewards = completedGoals
    .filter((goal) => goal.reward.kind === "recipe")
    .map((goal) => goal.reward.id);
  const storyRewards = completedGoals
    .filter((goal) => goal.reward.kind === "storyFragment")
    .map((goal) => goal.reward.id);

  return {
    unlockedFlags: [...new Set([...state.unlockedFlags, ...rewardFlags])],
    unlockedRecipes: [...new Set([...state.unlockedRecipes, ...recipeRewards])],
    unlockedStoryFlags: [...new Set([...state.unlockedStoryFlags, ...storyRewards])],
    completedGoalIds: [...new Set([...state.completedGoalIds, ...completedGoals.map((goal) => goal.id)])],
    goals: state.goals.map((goal) =>
      completedGoals.some((completedGoal) => completedGoal.id === goal.id)
        ? { ...goal, completed: true }
        : goal,
    ),
  };
};
