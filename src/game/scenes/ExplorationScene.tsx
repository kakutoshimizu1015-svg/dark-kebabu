import { useGame } from "../state/GameContext";
import type { ExplorationNode } from "../types";
import { SceneFrame } from "./SceneFrame";

const nodeLabels: Record<ExplorationNode["type"], string> = {
  ingredient: "素材",
  risk: "危険",
  rest: "休憩",
  story: "物語",
  rare: "希少",
  monster: "怪物",
};

export function ExplorationScene() {
  const { state, exploreNode, returnFromExploration, discardIngredient } = useGame();
  const cargoWeight = state.inventory.reduce((sum, ingredient) => sum + ingredient.weight, 0);
  const isOverCapacity = cargoWeight > state.cargoCapacity;
  const recommended = state.currentExplorationNodes[0];

  return (
    <SceneFrame
      kicker="探索"
      title="もう1ノード進むか、帰るか"
      description="奥へ行くほど素材は強くなる。だが臭気、騒音、警戒、体力のどれかが先に壊れる。"
      state={state}
      action={
        <div className="action-row">
          <button
            className="primary-action"
            disabled={isOverCapacity || !recommended}
            onClick={() => recommended && exploreNode(recommended)}
          >
            もう1ノード進む
          </button>
          <button className="secondary-action" disabled={isOverCapacity} onClick={returnFromExploration}>
            帰還する
          </button>
        </div>
      }
    >
      <article className="panel panel-wide">
        <div className="panel-title-row">
          <h2>探索ルート</h2>
          <span className="temptation">深度 {state.explorationDepth}: 奥ほど報酬アップ</span>
        </div>
        {state.lastExplorationResult && (
          <p className="result-line">
            {state.lastExplorationResult.title}: {state.lastExplorationResult.message}
          </p>
        )}
        <div className="node-map">
          {state.currentExplorationNodes.map((node: ExplorationNode) => (
            <button
              className={`node-card node-${node.type}`}
              disabled={isOverCapacity}
              key={node.id}
              onClick={() => exploreNode(node)}
            >
              <span className="node-index">深度 {node.depth}</span>
              <strong>{node.name}</strong>
              <small>
                {node.area} / {nodeLabels[node.type]}
              </small>
              <p>{node.description}</p>
              <dl className="node-forecast">
                <div>
                  <dt>リスク</dt>
                  <dd>{node.risk} / {node.riskPreview}</dd>
                </div>
                <div>
                  <dt>報酬</dt>
                  <dd>{node.rewardPreview}</dd>
                </div>
              </dl>
            </button>
          ))}
        </div>
      </article>

      <aside className="panel">
        <h2>探索ステータス</h2>
        <dl className="compact-list">
          <div>
            <dt>体力</dt>
            <dd>{state.playerStats.hp} / {state.playerStats.maxHp}</dd>
          </div>
          <div>
            <dt>臭気</dt>
            <dd>{state.playerStats.stink}</dd>
          </div>
          <div>
            <dt>騒音</dt>
            <dd>{state.playerStats.noise}</dd>
          </div>
          <div>
            <dt>警戒度</dt>
            <dd>{state.policeAttention}</dd>
          </div>
          <div>
            <dt>荷物容量</dt>
            <dd className={isOverCapacity ? "danger-text" : undefined}>
              {cargoWeight} / {state.cargoCapacity}
            </dd>
          </div>
        </dl>

        <div className="inventory-stack">
          <h2>持ち帰る素材</h2>
          {state.inventory.map((ingredient, index) => (
            <button
              className="discard-card"
              key={`${ingredient.id}-${index}`}
              onClick={() => discardIngredient(index)}
            >
              <strong>{ingredient.name}</strong>
              <span>重量 {ingredient.weight}</span>
              <small>捨てる</small>
            </button>
          ))}
        </div>

        {isOverCapacity && (
          <div className="over-capacity">
            <strong>荷物容量オーバー</strong>
            <p>素材を選んで捨てるまで、進むことも帰還することもできない。</p>
          </div>
        )}
      </aside>
    </SceneFrame>
  );
}
