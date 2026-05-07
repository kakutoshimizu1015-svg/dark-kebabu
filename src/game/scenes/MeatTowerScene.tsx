import { useMemo, useState } from "react";
import { useGame } from "../state/GameContext";
import type { Ingredient, MeatTowerDominantType, TowerAttributes } from "../types";

const towerLabels: Record<MeatTowerDominantType, string> = {
  fat: "脂肪系",
  poison: "毒性混入系",
  glow: "発光系",
  fungus: "菌糸成熟系",
  tentacle: "触手系",
};

const towerGlyphs: Record<MeatTowerDominantType, string> = {
  fat: "脂",
  poison: "毒",
  glow: "光",
  fungus: "菌",
  tentacle: "触",
};

const towerEffects: Record<MeatTowerDominantType, { benefit: string; risk: string }> = {
  fat: { benefit: "売上と満腹感が伸びる", risk: "腐敗しやすい" },
  poison: { benefit: "強い刺激と違法感", risk: "警察注目が上がる" },
  glow: { benefit: "評判と映えが伸びる", risk: "ラジオ干渉が増える" },
  fungus: { benefit: "ソースが育つ", risk: "異臭が増える" },
  tentacle: { benefit: "仕込みを手伝う", risk: "暴走しやすい" },
};

const addAttrs = (a: TowerAttributes, b: TowerAttributes): TowerAttributes => ({
  fat: a.fat + b.fat,
  poison: a.poison + b.poison,
  glow: a.glow + b.glow,
  fungus: a.fungus + b.fungus,
  tentacle: a.tentacle + b.tentacle,
});

const dominantType = (attributes: TowerAttributes): MeatTowerDominantType =>
  (Object.entries(attributes).sort((a, b) => b[1] - a[1])[0][0] as MeatTowerDominantType) ?? "fat";

const ingredientIcon = (ingredient: Ingredient) => towerGlyphs[dominantType(ingredient.towerAttributes)];

export function MeatTowerScene() {
  const { state, feedMeatTower } = useGame();
  const [dragIngredientId, setDragIngredientId] = useState<string | null>(null);
  const [stagedIds, setStagedIds] = useState<string[]>([]);

  const stagedIngredients = stagedIds
    .map((id) => state.inventory.find((ingredient) => ingredient.id === id))
    .filter((ingredient): ingredient is Ingredient => Boolean(ingredient));
  const addedAttributes = stagedIngredients.reduce((sum, ingredient) => addAttrs(sum, ingredient.towerAttributes), {
    fat: 0,
    poison: 0,
    glow: 0,
    fungus: 0,
    tentacle: 0,
  });
  const previewAttributes = addAttrs(state.meatTower.attributes, addedAttributes);
  const previewDominant = dominantType(previewAttributes);
  const previewRisk = state.meatTower.risk + addedAttributes.poison * 2 + addedAttributes.tentacle + stagedIngredients.length * 2;
  const previewRank = state.meatTower.level >= 5 ? "暴食体" : previewDominant === "glow" ? "発光変異" : previewDominant === "fat" ? "脂ギトギト化" : "分岐変異";
  const riskMeters = useMemo(() => ({
    rot: Math.min(100, previewAttributes.fat * 7 + previewRisk),
    runaway: Math.min(100, previewAttributes.tentacle * 9 + previewRisk),
    police: Math.min(100, previewAttributes.poison * 10 + state.policeAttention),
    monster: Math.min(100, state.meatTower.level * 12 + previewRisk),
    accident: Math.min(100, previewAttributes.fungus * 7 + previewAttributes.glow * 4 + previewRisk),
  }), [previewAttributes, previewRisk, state.meatTower.level, state.policeAttention]);

  const stageIngredient = (id: string | null) => {
    if (!id || stagedIds.length >= 5) return;
    setStagedIds((current) => current.includes(id) ? current : [...current, id]);
  };

  return (
    <section className="tower-screen">
      <header className="prep-header">
        <div>
          <p className="eyebrow">Meat Tower / Branch Growth</p>
          <h1>余った素材を、明日の姿へ継ぎ足す</h1>
        </div>
        <div className="prep-status-mini">
          <span>Lv.{state.meatTower.level}</span>
          <span>{towerLabels[state.meatTower.dominantType]}</span>
          <span>Risk {state.meatTower.risk}</span>
        </div>
      </header>

      <div className="tower-layout">
        <aside className="tower-feed-panel">
          <div className="panel-title-row">
            <h2>投入素材</h2>
            <span className="temptation">{stagedIngredients.length}/5</span>
          </div>
          <div className="tower-slot-stack">
            {[0, 1, 2, 3, 4].map((slot) => {
              const ingredient = stagedIngredients[slot];
              return (
                <button
                  className={`tower-feed-slot ${ingredient ? "is-filled" : ""}`}
                  key={slot}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    stageIngredient(dragIngredientId);
                    setDragIngredientId(null);
                  }}
                  onClick={() => ingredient && setStagedIds((current) => current.filter((_, index) => index !== slot))}
                >
                  {ingredient ? (
                    <>
                      <span>{ingredientIcon(ingredient)}</span>
                      <strong>{ingredient.name}</strong>
                    </>
                  ) : (
                    <span>+</span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="tower-ingredient-strip">
            {state.inventory.map((ingredient, index) => (
              <div
                className="tower-feed-card"
                draggable
                key={`${ingredient.id}-${index}`}
                onDragStart={() => setDragIngredientId(ingredient.id)}
                onClick={() => stageIngredient(ingredient.id)}
              >
                <span>{ingredientIcon(ingredient)}</span>
                <strong>{ingredient.name}</strong>
                <small>
                  脂{ingredient.towerAttributes.fat} 毒{ingredient.towerAttributes.poison} 光{ingredient.towerAttributes.glow} 菌{ingredient.towerAttributes.fungus} 触{ingredient.towerAttributes.tentacle}
                </small>
              </div>
            ))}
          </div>
        </aside>

        <main className="tower-visual-stage">
          <div className={`meat-tower-illustration tower-form-${previewDominant} level-${Math.min(5, state.meatTower.level)}`}>
            <div className="tower-core">{towerGlyphs[previewDominant]}</div>
            <span className="tower-blob blob-a" />
            <span className="tower-blob blob-b" />
            <span className="tower-blob blob-c" />
            <span className="tower-branch branch-a" />
            <span className="tower-branch branch-b" />
          </div>
          <div className="tower-stage-labels">
            <span>通常の肉タワー</span>
            <i />
            <span>脂ギトギト化</span>
            <i />
            <span>発光変異</span>
            <i />
            <span>{previewRank}</span>
          </div>
        </main>

        <aside className="tower-preview-panel">
          <h2>分岐プレビュー</h2>
          <strong className="preview-kebab-name">{towerLabels[previewDominant]}へ傾く</strong>
          <p>{towerEffects[previewDominant].benefit}</p>
          <p className="danger-text">{towerEffects[previewDominant].risk}</p>
          <div className="tower-trend-list">
            {Object.entries(previewAttributes).map(([key, value]) => (
              <div key={key}>
                <span>{towerLabels[key as MeatTowerDominantType]}</span>
                <div><i style={{ width: `${Math.min(100, value * 8)}%` }} /></div>
                <b>{value}</b>
              </div>
            ))}
          </div>

          <h2>朝の予測</h2>
          <div className="morning-prediction-card">
            <span>{previewRank}</span>
            <strong>変異ランク予測 {state.meatTower.level >= 4 ? "A" : state.meatTower.level >= 2 ? "B" : "C"}</strong>
            <small>店: {towerEffects[previewDominant].benefit} / 客: 欲望ログ増加 / FM88.8: 混線増加</small>
          </div>

          <h2>リスク</h2>
          <div className="risk-meter-list">
            {[
              ["腐敗", riskMeters.rot],
              ["暴走", riskMeters.runaway],
              ["警察注目", riskMeters.police],
              ["怪物化", riskMeters.monster],
              ["店内事故", riskMeters.accident],
            ].map(([label, value]) => (
              <div key={label as string}>
                <span>{label}</span>
                <div><i style={{ width: `${value}%` }} /></div>
                <b>{value}</b>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <footer className="action-dock">
        <button className="primary-action" onClick={() => feedMeatTower(stagedIds.length > 0 ? stagedIds : undefined)}>
          一晩まかせる
        </button>
      </footer>
    </section>
  );
}
