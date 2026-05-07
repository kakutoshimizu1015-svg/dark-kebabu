import { useEffect, useMemo, useState } from "react";
import { useGame } from "../state/GameContext";
import type { ExplorationNode, ExplorationNodeType } from "../types";

type InteractionMode = "scavenge" | "stealth" | "butcher" | "trade";

const nodeIcons: Record<ExplorationNodeType, string> = {
  ingredient: "瓶",
  bargain: "値",
  stealth: "潜",
  anomaly: "異",
  rest: "休",
  miniboss: "中",
  story: "話",
  risk: "潜",
  rare: "瓶",
  monster: "中",
  merchant: "商",
  fakeIngredient: "偽",
  infoBroker: "情",
  blackDeal: "違",
  marketPolice: "警",
};

const nodeLabels: Record<ExplorationNodeType, string> = {
  ingredient: "素材回収",
  bargain: "値切り",
  stealth: "潜伏",
  anomaly: "怪異",
  rest: "休息",
  miniboss: "中ボス",
  story: "物語",
  risk: "潜伏",
  rare: "素材回収",
  monster: "中ボス",
  merchant: "商人",
  fakeIngredient: "偽物",
  infoBroker: "情報屋",
  blackDeal: "違法取引",
  marketPolice: "摘発",
};

const nodeResultFlavor: Record<InteractionMode, string> = {
  scavenge: "バッグの底で瓶が小さく笑った。",
  stealth: "息を止めた跡だけが、ネオンに残った。",
  butcher: "切り分けた肉片が、まだ皿の上で探している。",
  trade: "商人は釣り銭の代わりに噂を置いていった。",
};

const interactionForNode = (node: ExplorationNode): InteractionMode => {
  if (node.type === "risk" || node.type === "stealth" || node.type === "marketPolice") return "stealth";
  if (node.type === "monster" || node.type === "miniboss" || node.type === "anomaly") return "butcher";
  if (node.market || node.type === "bargain" || node.type === "merchant" || node.type === "blackDeal") return "trade";
  return "scavenge";
};

const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

const ingredientIcon = (id: string) => {
  if (id.includes("cheese") || id.includes("glow")) return "光";
  if (id.includes("spice") || id.includes("chili") || id.includes("sauce")) return "辛";
  if (id.includes("mushroom") || id.includes("fungus")) return "菌";
  if (id.includes("tentacle")) return "触";
  if (id.includes("meat") || id.includes("fat")) return "肉";
  return "瓶";
};

export function ExplorationScene() {
  const { state, selectExplorationArea, exploreNode, returnFromExploration, discardIngredient, reorderInventory } = useGame();
  const [selectedNodeId, setSelectedNodeId] = useState(state.currentExplorationNodes[0]?.id ?? "");
  const [timing, setTiming] = useState(0);
  const [isTimingRunning, setIsTimingRunning] = useState(true);
  const [holdProgress, setHoldProgress] = useState(0);
  const [swipeStart, setSwipeStart] = useState<number | null>(null);
  const [swipeDistance, setSwipeDistance] = useState(0);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const selectedArea =
    state.explorationAreas.find((area) => area.id === state.selectedExplorationAreaId) ?? state.explorationAreas[0];
  const selectedNode = state.currentExplorationNodes.find((node) => node.id === selectedNodeId) ?? state.currentExplorationNodes[0];
  const interactionMode = selectedNode ? interactionForNode(selectedNode) : "scavenge";
  const cargoWeight = state.inventory.reduce((sum, ingredient) => sum + ingredient.weight, 0);
  const cargoValue = state.inventory.reduce((sum, ingredient) => sum + ingredient.priceValue, 0);
  const returnRisk = Math.min(
    75,
    Math.max(
      5,
      Math.round(
        state.playerStats.stink * 0.35 +
          state.playerStats.noise * 0.25 +
          state.playerStats.alert * 0.3 +
          state.policeAttention * 0.2 +
          state.explorationDepth * 4,
      ),
    ),
  );
  const returnSuccessRate = Math.min(95, Math.max(25, 100 - returnRisk));
  const isOverCapacity = cargoWeight > state.cargoCapacity;
  const interactionReady = useMemo(() => {
    if (interactionMode === "scavenge") return !isTimingRunning;
    if (interactionMode === "stealth") return holdProgress >= 100;
    if (interactionMode === "butcher") return swipeDistance >= 90;
    return true;
  }, [holdProgress, interactionMode, isTimingRunning, swipeDistance]);

  useEffect(() => {
    if (!isTimingRunning) return;
    const id = window.setInterval(() => {
      setTiming((value) => (value + 5) % 100);
    }, 80);
    return () => window.clearInterval(id);
  }, [isTimingRunning]);

  useEffect(() => {
    setSelectedNodeId(state.currentExplorationNodes[0]?.id ?? "");
    setIsTimingRunning(true);
    setHoldProgress(0);
    setSwipeDistance(0);
  }, [state.currentExplorationNodes]);

  const executeNode = () => {
    if (!selectedNode || !interactionReady || isOverCapacity) return;
    exploreNode(selectedNode);
    setIsTimingRunning(true);
    setHoldProgress(0);
    setSwipeDistance(0);
  };

  const holdStart = () => {
    setHoldProgress(0);
    const startedAt = Date.now();
    const id = window.setInterval(() => {
      const progress = Math.min(100, Math.round((Date.now() - startedAt) / 9));
      setHoldProgress(progress);
      if (progress >= 100) window.clearInterval(id);
    }, 40);
    const stop = () => window.clearInterval(id);
    window.addEventListener("pointerup", stop, { once: true });
  };

  return (
    <section className="explore-screen">
      <header className="explore-status">
        <div><span>HP</span><strong>{state.playerStats.hp}/{state.playerStats.maxHp}</strong><i style={{ width: `${state.playerStats.hp}%` }} /></div>
        <div><span>バッグ</span><strong>{cargoWeight}/{state.cargoCapacity}</strong><i style={{ width: `${clampPercent((cargoWeight / state.cargoCapacity) * 100)}%` }} /></div>
        <div><span>臭気</span><strong>{state.playerStats.stink}</strong><i style={{ width: `${clampPercent(state.playerStats.stink)}%` }} /></div>
        <div><span>騒音</span><strong>{state.playerStats.noise}</strong><i style={{ width: `${clampPercent(state.playerStats.noise)}%` }} /></div>
        <div><span>警戒</span><strong>{state.playerStats.alert}</strong><i style={{ width: `${clampPercent(state.playerStats.alert)}%` }} /></div>
      </header>

      <div className="explore-layout">
        <article className="explore-map-panel">
          <div className="panel-title-row">
            <div>
              <p className="eyebrow">Exploration Map</p>
              <h1>{selectedArea.name}</h1>
            </div>
            <span className="temptation">深度 {state.explorationDepth} / 帰還成功 {returnSuccessRate}%</span>
          </div>

          <div className="area-strip">
            {state.explorationAreas.map((area) => (
              <button
                className={`area-pill ${area.id === selectedArea.id ? "is-selected" : ""}`}
                key={area.id}
                onClick={() => selectExplorationArea(area.id)}
              >
                <span>{area.id === "underground-market" ? "市" : "路"}</span>
                <strong>{area.name}</strong>
                <small>Danger {area.dangerLevel}</small>
              </button>
            ))}
          </div>

          <div className={`route-map route-${selectedArea.id}`}>
            <div className="route-line route-line-a" />
            <div className="route-line route-line-b" />
            <div className="route-start">START</div>
            <div className="route-home">帰還</div>
            {state.currentExplorationNodes.map((node, index) => {
              const col = index % 4;
              const row = Math.floor(index / 4);
              return (
                <button
                  className={`map-node node-${node.type} ${node.id === selectedNode?.id ? "is-active" : ""}`}
                  key={node.id}
                  style={{ left: `${18 + col * 22 + row * 8}%`, top: `${22 + row * 32 + (col % 2) * 12}%` }}
                  onClick={() => {
                    setSelectedNodeId(node.id);
                    setIsTimingRunning(true);
                    setHoldProgress(0);
                    setSwipeDistance(0);
                  }}
                >
                  <span>{nodeIcons[node.type]}</span>
                  <small>{node.depth}</small>
                </button>
              );
            })}
          </div>

          <div className="node-legend">
            {["ingredient", "bargain", "stealth", "anomaly", "rest", "miniboss", "story"].map((type) => (
              <span key={type}><b>{nodeIcons[type as ExplorationNodeType]}</b>{nodeLabels[type as ExplorationNodeType]}</span>
            ))}
          </div>
        </article>

        <aside className="explore-side-panel">
          {selectedNode ? (
            <>
              <div className="node-detail-card">
                <span className="node-type-badge">{nodeIcons[selectedNode.type]} {nodeLabels[selectedNode.type]}</span>
                <h2>{selectedNode.name}</h2>
                <p>{selectedNode.description}</p>
                <dl className="node-forecast">
                  <div><dt>報酬</dt><dd>{selectedNode.rewardPreview}</dd></div>
                  <div><dt>危険</dt><dd>{selectedNode.risk} / {selectedNode.riskPreview}</dd></div>
                  {selectedNode.market ? (
                    <div><dt>価格</dt><dd>¥{selectedNode.market.price.toLocaleString()} / 偽物{selectedNode.market.fakeChance}%</dd></div>
                  ) : null}
                </dl>
              </div>

              <div className={`interaction-panel mode-${interactionMode}`}>
                <h2>{interactionMode === "scavenge" ? "漁り" : interactionMode === "stealth" ? "潜伏" : interactionMode === "butcher" ? "解体" : "取引"}</h2>
                {interactionMode === "scavenge" ? (
                  <>
                    <div className="timing-track"><i style={{ left: `${timing}%` }} /><b /></div>
                    <button className="mini-neon-button" onClick={() => setIsTimingRunning(false)}>
                      STOP
                    </button>
                  </>
                ) : interactionMode === "stealth" ? (
                  <>
                    <button className="hold-zone" onPointerDown={holdStart}>長押しで息を潜める</button>
                    <div className="hold-meter"><i style={{ width: `${holdProgress}%` }} /></div>
                  </>
                ) : interactionMode === "butcher" ? (
                  <div
                    className="swipe-zone"
                    onPointerDown={(event) => setSwipeStart(event.clientX)}
                    onPointerMove={(event) => {
                      if (swipeStart !== null) setSwipeDistance(Math.abs(event.clientX - swipeStart));
                    }}
                    onPointerUp={() => setSwipeStart(null)}
                  >
                    <span>短く横スワイプして部位を分ける</span>
                    <i style={{ width: `${clampPercent(swipeDistance)}%` }} />
                  </div>
                ) : (
                  <div className="trade-panel">
                    <strong>{selectedNode.market ? `¥${selectedNode.market.price.toLocaleString()}` : "情報交換"}</strong>
                    <span>値切りと真贋判定は結果ログに出る</span>
                  </div>
                )}
                <button className="primary-action compact-action" disabled={!interactionReady || isOverCapacity} onClick={executeNode}>
                  このノードへ進む
                </button>
              </div>

              {state.lastExplorationResult ? (
                <div className="exploration-result-card">
                  <small>操作結果</small>
                  <strong>{state.lastExplorationResult.title}</strong>
                  <p>{state.lastExplorationResult.message}</p>
                  <dl>
                    <div><dt>得た素材</dt><dd>{state.collectedIngredients.slice(-2).map((ingredient) => ingredient.name).join(" / ") || "なし"}</dd></div>
                    <div><dt>ステータス</dt><dd>HP {state.playerStats.hp} / 臭気 {state.playerStats.stink} / 警戒 {state.playerStats.alert}</dd></div>
                    <div><dt>危険変化</dt><dd>警察注目 {state.policeAttention}%</dd></div>
                  </dl>
                  <em>{nodeResultFlavor[interactionMode]}</em>
                </div>
              ) : null}
            </>
          ) : null}

          <div className="return-card">
            <strong>帰還ルート</strong>
            <p>持ち帰り価値 ¥{cargoValue.toLocaleString()} / 事故リスク {100 - returnSuccessRate}%</p>
            <button className="secondary-action compact-action" disabled={isOverCapacity} onClick={returnFromExploration}>
              店へ帰る
            </button>
          </div>
        </aside>
      </div>

      <section className="bag-panel">
        <div className="panel-title-row">
          <h2>探索バッグ</h2>
          <span className={isOverCapacity ? "danger-text" : "temptation"}>{cargoWeight}/{state.cargoCapacity} / ¥{cargoValue.toLocaleString()}</span>
        </div>
        <div className="bag-grid">
          {state.inventory.map((ingredient, index) => (
            <div
              className="bag-item-card"
              draggable
              key={`${ingredient.id}-${index}`}
              onDragStart={() => setDragIndex(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (dragIndex !== null) reorderInventory(dragIndex, index);
                setDragIndex(null);
              }}
            >
              <span>{ingredientIcon(ingredient.id)}</span>
              <strong>{ingredient.name}</strong>
              <small>w{ingredient.weight} / ¥{ingredient.priceValue}</small>
            </div>
          ))}
          <button
            className="bag-trash-slot"
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (dragIndex !== null) discardIngredient(dragIndex);
              setDragIndex(null);
            }}
          >
            破棄
          </button>
        </div>
        {isOverCapacity ? <p className="danger-text">荷物が重すぎる。破棄スロットへドラッグして軽くする。</p> : null}
      </section>
    </section>
  );
}
