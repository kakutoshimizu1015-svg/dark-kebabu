import { useEffect, useMemo, useState } from "react";
import { sauces } from "../data";
import { calculateKebabStats, useGame } from "../state/GameContext";
import type { Ingredient, KebabStats, TowerAttributes } from "../types";

type SortMode = "rarity" | "stink" | "weight";

const rarityRank: Record<Ingredient["rarity"], number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  cursed: 4,
};

const meterMax: Record<keyof Pick<KebabStats, "umami" | "spice" | "stink" | "addictiveness" | "price" | "risk">, number> = {
  umami: 120,
  spice: 90,
  stink: 90,
  addictiveness: 90,
  price: 3000,
  risk: 80,
};

const meterWidth = (value: number, max: number) => `${Math.min(100, Math.round((value / max) * 100))}%`;

const ingredientIcon = (ingredient: Ingredient) => {
  const strongest = Object.entries(ingredient.towerAttributes).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "fat";
  const icons: Record<keyof TowerAttributes, string> = {
    fat: "脂",
    poison: "毒",
    glow: "光",
    fungus: "菌",
    tentacle: "触",
  };
  return icons[strongest as keyof TowerAttributes];
};

const kebabName = (ingredients: Ingredient[], sauceId: string) => {
  const ids = new Set(ingredients.map((ingredient) => ingredient.id));
  if (ids.has("twitch-tentacle") || ids.has("radio-marinated-meat")) return "触手スペシャル・ケバブ";
  if (ids.has("glow-cheese") || ids.has("market-glow-cheese-shard")) return "発光チーズ・ケバブ";
  if (ids.has("hell-chili") || sauceId === "hell-red" || ids.has("stolen-power-hot-sauce")) return "地獄辛味・ケバブ";
  if (sauceId === "brain-mayo" || ids.has("after-dark-meat")) return "脳みそマヨ・ケバブ";
  if (ids.has("mushroom-silt") || ids.has("watchlight-mushroom")) return "地下菌糸・ケバブ";
  return "深夜まかない・ケバブ";
};

const sortIngredients = (ingredients: Ingredient[], mode: SortMode) =>
  [...ingredients].sort((a, b) => {
    if (mode === "rarity") return rarityRank[b.rarity] - rarityRank[a.rarity];
    if (mode === "stink") return b.stink - a.stink;
    return b.weight - a.weight;
  });

export function PrepScene() {
  const { state, togglePrepIngredient, selectSauce, prepareKebab, discardIngredient } = useGame();
  const [dragIngredientId, setDragIngredientId] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("rarity");
  const [heat, setHeat] = useState(0);
  const [isHeating, setIsHeating] = useState(true);

  const selectedIngredients = state.selectedPrepIngredientIds
    .map((id) => state.inventory.find((ingredient) => ingredient.id === id))
    .filter((ingredient): ingredient is Ingredient => Boolean(ingredient))
    .slice(0, 3);
  const selectedSauce = sauces.find((sauce) => sauce.id === state.selectedSauceId) ?? sauces[0];
  const basePreview = calculateKebabStats(selectedIngredients, selectedSauce);
  const heatQuality = isHeating ? 0 : Math.max(0, 30 - Math.abs(heat - 56));
  const preview: KebabStats = {
    ...basePreview,
    umami: Math.round(basePreview.umami * (1 + heatQuality / 100)),
    spice: Math.round(basePreview.spice * (1 + heatQuality / 180)),
    stink: Math.round(basePreview.stink * (1 - heatQuality / 220)),
    addictiveness: Math.round(basePreview.addictiveness * (1 + heatQuality / 100)),
    price: Math.round(basePreview.price * (1 + heatQuality / 140)),
    risk: Math.round(basePreview.risk * (1 - heatQuality / 260)),
  };
  const canCook = selectedIngredients.length >= 1 && !isHeating;
  const sortedInventory = useMemo(() => sortIngredients(state.inventory, sortMode), [sortMode, state.inventory]);
  const latestKebab = state.cookedKebabs.at(-1);

  useEffect(() => {
    if (!isHeating) return;
    const id = window.setInterval(() => setHeat((value) => (value + 4) % 100), 70);
    return () => window.clearInterval(id);
  }, [isHeating]);

  const dropIntoSlot = (slotIndex: number) => {
    if (!dragIngredientId) return;
    const currentId = state.selectedPrepIngredientIds[slotIndex];
    if (currentId) togglePrepIngredient(currentId);
    if (!state.selectedPrepIngredientIds.includes(dragIngredientId)) togglePrepIngredient(dragIngredientId);
    setDragIngredientId(null);
  };

  return (
    <section className="prep-screen">
      <header className="prep-header">
        <div>
          <p className="eyebrow">Prep / Cooking</p>
          <h1>素材を掴んで、屋台の熱へ入れる</h1>
        </div>
        <div className="prep-status-mini">
          <span>在庫 {state.inventory.length}</span>
          <span>完成 {state.cookedKebabs.length}</span>
          <span>品質 +{heatQuality}</span>
        </div>
      </header>

      <div className="prep-layout">
        <aside className="prep-bag-panel">
          <div className="panel-title-row">
            <h2>素材バッグ</h2>
            <div className="segmented-control">
              <button className={sortMode === "rarity" ? "is-active" : ""} onClick={() => setSortMode("rarity")}>レア</button>
              <button className={sortMode === "stink" ? "is-active" : ""} onClick={() => setSortMode("stink")}>臭気</button>
              <button className={sortMode === "weight" ? "is-active" : ""} onClick={() => setSortMode("weight")}>重さ</button>
            </div>
          </div>
          <div className="prep-ingredient-grid">
            {sortedInventory.map((ingredient, index) => {
              const selected = state.selectedPrepIngredientIds.includes(ingredient.id);
              return (
                <div
                  className={`prep-ingredient-card rarity-${ingredient.rarity} ${selected ? "is-selected" : ""}`}
                  draggable
                  key={`${ingredient.id}-${index}`}
                  onClick={() => togglePrepIngredient(ingredient.id)}
                  onDragStart={() => setDragIngredientId(ingredient.id)}
                >
                  <span className="ingredient-art">{ingredientIcon(ingredient)}</span>
                  <strong>{ingredient.name}</strong>
                  <small>{ingredient.rarity} / w{ingredient.weight} / 臭{ingredient.stink}</small>
                  <div className="tower-attr-dots">
                    {Object.entries(ingredient.towerAttributes).map(([key, value]) => (
                      <i key={key} title={`${key}: ${value}`} style={{ opacity: value > 0 ? 1 : 0.25 }} />
                    ))}
                  </div>
                </div>
              );
            })}
            <button
              className="bag-trash-slot prep-trash"
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                const index = state.inventory.findIndex((ingredient) => ingredient.id === dragIngredientId);
                if (index >= 0) discardIngredient(index);
                setDragIngredientId(null);
              }}
            >
              破棄
            </button>
          </div>
        </aside>

        <main className="cooking-board">
          <div className="kebab-stage">
            <div className="kebab-plate">
              {selectedIngredients.length > 0 ? selectedIngredients.map((ingredient) => (
                <span className={`kebab-layer rarity-${ingredient.rarity}`} key={ingredient.id}>{ingredientIcon(ingredient)}</span>
              )) : <em>DROP</em>}
            </div>
            <div className="prep-slots">
              {[0, 1, 2].map((slot) => {
                const ingredient = selectedIngredients[slot];
                return (
                  <button
                    className={`prep-slot ${ingredient ? "is-filled" : ""}`}
                    key={slot}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => dropIntoSlot(slot)}
                    onClick={() => ingredient && togglePrepIngredient(ingredient.id)}
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
          </div>

          <section className="sauce-rack">
            <h2>ソース</h2>
            {sauces.map((sauce) => (
              <button
                className={`sauce-vial ${sauce.id === state.selectedSauceId ? "is-selected" : ""}`}
                key={sauce.id}
                onClick={() => selectSauce(sauce.id)}
              >
                <span />
                <strong>{sauce.name}</strong>
              </button>
            ))}
          </section>

          <section className="heat-control">
            <div className="panel-title-row">
              <h2>焼き加減</h2>
              <span className="temptation">中央の発光帯で止める</span>
            </div>
            <div className="heat-track">
              <i style={{ left: `${heat}%` }} />
              <b />
            </div>
            <button className="mini-neon-button" onClick={() => setIsHeating((running) => !running)}>
              {isHeating ? "焼きを止める" : "もう一度焼く"}
            </button>
          </section>
        </main>

        <aside className="prep-preview-panel">
          <h2>完成予測</h2>
          <div className="finished-kebab-preview">
            <span>{selectedIngredients.length > 0 ? "🥙" : "?"}</span>
          </div>
          <strong className="preview-kebab-name">{selectedIngredients.length ? kebabName(selectedIngredients, selectedSauce.id) : "素材を投入"}</strong>
          <div className="stat-meters">
            {[
              ["旨味", "umami"],
              ["刺激", "spice"],
              ["異臭", "stink"],
              ["中毒性", "addictiveness"],
              ["価格", "price"],
              ["リスク", "risk"],
            ].map(([label, key]) => (
              <div className="stat-meter" key={key}>
                <span>{label}</span>
                <div><i style={{ width: meterWidth(preview[key as keyof KebabStats], meterMax[key as keyof typeof meterMax]) }} /></div>
                <b>{key === "price" ? `¥${preview.price.toLocaleString()}` : preview[key as keyof KebabStats]}</b>
              </div>
            ))}
          </div>
          {latestKebab ? (
            <div className="last-kebab-card">
              <span>完成済み</span>
              <strong>{latestKebab.name}</strong>
              <small>¥{latestKebab.price.toLocaleString()} / risk {latestKebab.risk}</small>
            </div>
          ) : null}
        </aside>
      </div>

      <footer className="action-dock">
        <button className="primary-action" disabled={!canCook} onClick={() => prepareKebab(heatQuality)}>
          仕込み開始
        </button>
      </footer>
    </section>
  );
}
