import { sauces } from "../data";
import { calculateKebabStats, useGame } from "../state/GameContext";
import type { Ingredient } from "../types";
import { SceneFrame } from "./SceneFrame";

const meterMax = {
  umami: 120,
  spice: 90,
  stink: 90,
  addictiveness: 90,
  price: 3000,
};

const meterWidth = (value: number, max: number) => `${Math.min(100, Math.round((value / max) * 100))}%`;

const previewName = (ingredients: Ingredient[], sauceId: string) => {
  const ids = new Set(ingredients.map((ingredient) => ingredient.id));
  if (ids.has("twitch-tentacle")) return "触手スペシャル・ケバブ";
  if (ids.has("glow-cheese")) return "発光チーズ・ケバブ";
  if (ids.has("hell-chili") || sauceId === "hell-red") return "地獄辛味・ケバブ";
  if (sauceId === "brain-mayo" || ids.has("after-dark-meat")) return "脳みそマヨ・ケバブ";
  if (ids.has("mushroom-silt")) return "菌糸熟成・ケバブ";
  return "深夜まかない・ケバブ";
};

export function PrepScene() {
  const { state, togglePrepIngredient, selectSauce, prepareKebab } = useGame();
  const selectedIngredients = state.selectedPrepIngredientIds
    .map((id) => state.inventory.find((ingredient) => ingredient.id === id))
    .filter((ingredient): ingredient is Ingredient => Boolean(ingredient))
    .slice(0, 3);
  const selectedSauce = sauces.find((sauce) => sauce.id === state.selectedSauceId) ?? sauces[0];
  const preview = calculateKebabStats(selectedIngredients, selectedSauce);
  const canCook = selectedIngredients.length >= 1;

  return (
    <SceneFrame
      kicker="仕込み"
      title="素材を選び、ソースで欲望をまとめる"
      description="探索で拾った素材を1〜3個選び、ソースを1つ合わせる。作成したケバブは営業で提供される。"
      state={state}
      action={
        <button className="primary-action" disabled={!canCook} onClick={prepareKebab}>
          仕込み開始
        </button>
      }
    >
      <article className="panel panel-wide">
        <div className="panel-title-row">
          <h2>素材を選択</h2>
          <span className="temptation">{selectedIngredients.length} / 3 個選択中</span>
        </div>
        <div className="ingredient-grid">
          {state.inventory.map((ingredient, index) => {
            const selected = state.selectedPrepIngredientIds.includes(ingredient.id);
            const disabled = !selected && state.selectedPrepIngredientIds.length >= 3;
            return (
              <button
                className={`ingredient-card selectable-card ${selected ? "is-selected" : ""}`}
                disabled={disabled}
                key={`${ingredient.id}-${index}`}
                onClick={() => togglePrepIngredient(ingredient.id)}
              >
                <strong>{ingredient.name}</strong>
                <p>{ingredient.description}</p>
                <small>
                  {ingredient.rarity} / 重量 {ingredient.weight} / 旨味 {ingredient.umami} / 刺激 {ingredient.spice}
                </small>
              </button>
            );
          })}
        </div>

        <div className="sauce-list">
          <h2>ソース</h2>
          {sauces.map((sauce) => (
            <button
              className={`sauce-card ${sauce.id === state.selectedSauceId ? "is-selected" : ""}`}
              key={sauce.id}
              onClick={() => selectSauce(sauce.id)}
            >
              <strong>{sauce.name}</strong>
              <span>{sauce.description}</span>
            </button>
          ))}
        </div>
      </article>

      <article className="panel kebab-preview">
        <h2>完成予測</h2>
        <strong>{canCook ? previewName(selectedIngredients, selectedSauce.id) : "素材未選択"}</strong>
        <p className="signal-text">{selectedSauce.name}: {selectedSauce.description}</p>
        <div className="stat-meters">
          <div className="stat-meter">
            <span>旨味</span>
            <div><i style={{ width: meterWidth(preview.umami, meterMax.umami) }} /></div>
            <b>{preview.umami}</b>
          </div>
          <div className="stat-meter">
            <span>刺激</span>
            <div><i style={{ width: meterWidth(preview.spice, meterMax.spice) }} /></div>
            <b>{preview.spice}</b>
          </div>
          <div className="stat-meter">
            <span>異臭</span>
            <div><i style={{ width: meterWidth(preview.stink, meterMax.stink) }} /></div>
            <b>{preview.stink}</b>
          </div>
          <div className="stat-meter">
            <span>中毒性</span>
            <div><i style={{ width: meterWidth(preview.addictiveness, meterMax.addictiveness) }} /></div>
            <b>{preview.addictiveness}</b>
          </div>
          <div className="stat-meter">
            <span>価格</span>
            <div><i style={{ width: meterWidth(preview.price, meterMax.price) }} /></div>
            <b>¥{preview.price.toLocaleString()}</b>
          </div>
        </div>
        <dl className="compact-list">
          <div><dt>奇妙さ</dt><dd>{preview.weirdness}</dd></div>
          <div><dt>リスク</dt><dd>{preview.risk}</dd></div>
          <div><dt>完成済み</dt><dd>{state.cookedKebabs.length}</dd></div>
        </dl>
      </article>
    </SceneFrame>
  );
}
