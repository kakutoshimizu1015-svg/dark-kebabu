import type { Customer } from "./types";

export const mutationStageLabels = ["通常", "予兆", "明確な異変", "街に影響する存在"] as const;

const defaultDescriptions = [
  "まだ普段の客として振る舞っている。",
  "食後の様子が少しだけ変わり始める。",
  "店の周囲にも分かる異変が残る。",
  "街の地形やイベントに影響し始める。",
] as const;

const customerMutationDescriptions: Record<string, readonly string[]> = {
  "bandaged-man": [
    "通常",
    "焦げた匂いが服に残る",
    "来店時、火災速報のノイズが混ざる",
    "裏路地に火災跡ルートが出現する",
  ],
  "crying-zombie": [
    "通常",
    "食べながら涙を流す",
    "店の周囲に雨の匂いが残る",
    "雨の路地ルートが出現する",
  ],
  influencer: [
    "通常",
    "ケバブを撮影し始める",
    "街の看板に顔が映る",
    "炎上イベントとレア客が増える",
  ],
  "night-cop": [
    "通常",
    "店を監視する",
    "巡回ルートが増える",
    "警察注目度と検問イベントが変化する",
  ],
};

export const customerMutationStage = (desireProgress: number) =>
  Math.min(3, Math.max(0, Math.floor(desireProgress / 25)));

export const getMutationStageLabel = (stage: number) =>
  mutationStageLabels[Math.min(3, Math.max(0, stage))] ?? mutationStageLabels[0];

export const getCustomerMutationDescription = (customer: Pick<Customer, "id" | "mutationStage">) => {
  const stage = Math.min(3, Math.max(0, customer.mutationStage));
  return customerMutationDescriptions[customer.id]?.[stage] ?? defaultDescriptions[stage];
};
