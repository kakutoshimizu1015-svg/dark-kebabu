import { useGame } from "../state/GameContext";
import { SceneFrame } from "./SceneFrame";

const towerLabels = {
  fat: "脂肪系",
  poison: "毒性混入系",
  glow: "発光系",
  fungus: "菌糸成熟系",
  tentacle: "触手系",
};

export function MeatTowerScene() {
  const { state, feedMeatTower } = useGame();
  const leftoverWeight = state.inventory.reduce((sum, ingredient) => sum + ingredient.weight, 0);
  const hasLeftovers = state.inventory.length > 0;

  return (
    <SceneFrame
      kicker="肉タワー"
      title="余った素材で、明日の街を太らせる"
      description="投入素材の属性が肉タワーへ加算され、最も高い属性が分岐成長の系統になる。"
      state={state}
      action={
        <button className="primary-action" disabled={!hasLeftovers} onClick={feedMeatTower}>
          余った素材を投入する
        </button>
      }
    >
      <article className="panel tower-panel">
        <h2>肉タワー状態</h2>
        <div className="tower-visual" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
        <dl className="compact-list">
          <div><dt>Lv.</dt><dd>{state.meatTower.level}</dd></div>
          <div><dt>EXP</dt><dd>{state.meatTower.exp}</dd></div>
          <div><dt>優勢系統</dt><dd>{towerLabels[state.meatTower.dominantType]}</dd></div>
          <div><dt>リスク</dt><dd>{state.meatTower.risk}</dd></div>
          <div><dt>脂肪</dt><dd>{state.meatTower.attributes.fat}</dd></div>
          <div><dt>毒性</dt><dd>{state.meatTower.attributes.poison}</dd></div>
          <div><dt>発光</dt><dd>{state.meatTower.attributes.glow}</dd></div>
          <div><dt>菌糸</dt><dd>{state.meatTower.attributes.fungus}</dd></div>
          <div><dt>触手</dt><dd>{state.meatTower.attributes.tentacle}</dd></div>
        </dl>
      </article>

      <article className="panel panel-wide">
        <div className="panel-title-row">
          <h2>投入待ち素材</h2>
          <span className="temptation">{state.inventory.length}個 / 重量 {leftoverWeight}</span>
        </div>
        <div className="ingredient-grid">
          {state.inventory.map((ingredient, index) => (
            <div className="ingredient-card" key={`${ingredient.id}-${index}`}>
              <strong>{ingredient.name}</strong>
              <p>{ingredient.description}</p>
              <small>
                脂肪 {ingredient.towerAttributes.fat} / 毒性 {ingredient.towerAttributes.poison} / 発光 {ingredient.towerAttributes.glow} / 菌糸 {ingredient.towerAttributes.fungus} / 触手 {ingredient.towerAttributes.tentacle}
              </small>
            </div>
          ))}
          {!hasLeftovers && <p className="signal-text">投入できる余り素材はない。肉タワーは腹を鳴らしている。</p>}
        </div>

        <div className="sales-log-list">
          <h2>翌朝変化候補</h2>
          {state.meatTower.nextMorningEffects.map((effect, index) => (
            <div className="sales-log" key={`${effect}-${index}`}>
              <strong>{towerLabels[state.meatTower.dominantType]}</strong>
              <p>{effect}</p>
            </div>
          ))}
        </div>
      </article>
    </SceneFrame>
  );
}
