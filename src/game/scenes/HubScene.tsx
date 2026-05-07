import { useMemo } from "react";
import { getEndingProgressSignals } from "../endings";
import { useGame } from "../state/GameContext";
import type { GameScene, GameState, MeatTowerDominantType } from "../types";

const towerLabels: Record<MeatTowerDominantType, string> = {
  fat: "脂肪系",
  poison: "毒性系",
  glow: "発光系",
  fungus: "菌糸系",
  tentacle: "触手系",
};

const towerIcons: Record<MeatTowerDominantType, string> = {
  fat: "脂",
  poison: "毒",
  glow: "光",
  fungus: "菌",
  tentacle: "触",
};

const statPercent = (value: number, max = 100) => `${Math.min(100, Math.max(0, Math.round((value / max) * 100)))}%`;

function getRecommendedHubAction(state: GameState): {
  label: string;
  detail: string;
  icon: string;
  scene: GameScene;
} {
  if (!state.selectedBroadcast) {
    return { label: "放送を選ぶ", detail: "FM88.8で今夜の流れを決める", icon: "88.8", scene: "radio" };
  }
  if (state.inventory.length < 3) {
    return { label: "探索へ進む", detail: "素材を集め、帰るか進むか判断する", icon: "探索", scene: "exploration" };
  }
  if (state.cookedKebabs.length === 0) {
    return { label: "仕込みへ進む", detail: "素材から今夜のケバブを1つ作る", icon: "調理", scene: "prep" };
  }
  if (state.salesLogs.length === 0) {
    return { label: "営業へ進む", detail: "誰に何を出すか決める", icon: "提供", scene: "sales" };
  }
  return { label: "肉タワーへ進む", detail: "余った素材を投入して朝を待つ", icon: "塔", scene: "meatTower" };
}

function HubButton({
  label,
  detail,
  icon,
  scene,
  disabled,
}: {
  label: string;
  detail: string;
  icon: string;
  scene: GameScene;
  disabled?: boolean;
}) {
  const { goToScene } = useGame();
  return (
    <button className="hub-action-card" disabled={disabled} onClick={() => goToScene(scene)}>
      <span>{icon}</span>
      <strong>{label}</strong>
      <small>{detail}</small>
    </button>
  );
}

export function HubScene() {
  const { state, goToScene } = useGame();
  const latestBroadcast = state.selectedBroadcast ?? state.broadcasts[0];
  const latestMorning = state.morningLogs[0];
  const activeGoals = state.goals.filter((goal) => !goal.completed).slice(0, 2);
  const endingSignals = useMemo(() => getEndingProgressSignals(state).slice(0, 2), [state]);
  const cargoWeight = state.inventory.reduce((sum, ingredient) => sum + ingredient.weight, 0);
  const towerTotal = Object.values(state.meatTower.attributes).reduce((sum, value) => sum + value, 0) || 1;
  const canPrep = state.inventory.length > 0;
  const canSales = state.cookedKebabs.length > 0 || state.inventory.length > 0;
  const recommendedAction = getRecommendedHubAction(state);
  const allActions: Array<{ label: string; detail: string; icon: string; scene: GameScene; disabled?: boolean }> = [
    { label: "放送", detail: "FM88.8", icon: "88", scene: "radio" },
    { label: "探索", detail: `${state.explorationAreas.length}エリア`, icon: "路", scene: "exploration" },
    { label: "仕込み", detail: `${state.inventory.length}素材`, icon: "皿", scene: "prep", disabled: !canPrep },
    { label: "営業", detail: `${state.cookedKebabs.length}品`, icon: "客", scene: "sales", disabled: !canSales },
    { label: "肉塔", detail: `Lv.${state.meatTower.level}`, icon: "塔", scene: "meatTower" },
  ];
  const secondaryActions = allActions.filter((action) => action.scene !== recommendedAction.scene);

  return (
    <section className="hub-scene">
      <header className="hub-status-bar">
        <div><span>所持金</span><strong>¥{state.money.toLocaleString()}</strong></div>
        <div><span>評判</span><strong>{state.reputation}</strong></div>
        <div><span>警察注目</span><strong>{state.policeAttention}</strong></div>
        <div><span>体力</span><strong>{state.playerStats.hp}/{state.playerStats.maxHp}</strong></div>
        <div><span>在庫</span><strong>{state.inventory.length}個 / {cargoWeight}w</strong></div>
        <div><span>肉タワー</span><strong>Lv.{state.meatTower.level} {towerLabels[state.meatTower.dominantType]}</strong></div>
      </header>

      <main className="hub-focus-layout">
        <article className="hub-card stall-hub-card hub-primary-panel">
          <div className="stall-visual asset-stall">
            <div className="neon-sign">KEBAB AFTER DARK</div>
            <div className="stall-counter">
              <span className="jar jar-pink" />
              <span className="jar jar-lime" />
              <span className="kebab-wrap-placeholder" />
              <span className="jar jar-orange" />
            </div>
          </div>
          <div className="panel-title-row">
            <div>
              <p className="eyebrow">Hub / Night {state.nightNumber}</p>
              <h1>今夜どこから始めるかを決める</h1>
            </div>
            <span className="temptation">{recommendedAction.label}</span>
          </div>
          <p className="hub-main-copy">{latestMorning?.message ?? "屋台はまだ開店前。肉タワーだけが先に息をしている。"}</p>
          <div className="hub-mini-grid">
            {activeGoals.map((goal) => (
              <div className={`goal-chip goal-${goal.type}`} key={goal.id}>
                <span>{goal.type}</span>
                <strong>{goal.title}</strong>
              </div>
            ))}
          </div>
        </article>

        <aside className="hub-side-stack">
          <article className="hub-card radio-hub-card">
            <div className="hub-card-head">
              <span className="hub-icon asset-radio">FM</span>
              <div>
                <p className="eyebrow">FM88.8</p>
                <h2>{latestBroadcast?.station ?? "ZOMBIE FM 88.8"}</h2>
              </div>
            </div>
            <strong className="hub-main-copy">{latestBroadcast?.title ?? "放送待ち"}</strong>
            <p>{latestBroadcast?.effectPreview ?? "ラジオは昨夜の結果に合わせて喋り始める。"}</p>
          </article>

          <article className="hub-card tower-hub-card">
            <div className={`tower-figure tower-${state.meatTower.dominantType} asset-tower`}>
              <span>{towerIcons[state.meatTower.dominantType]}</span>
            </div>
            <div className="panel-title-row">
              <h2>肉タワー</h2>
              <span className="temptation">Risk {state.meatTower.risk}</span>
            </div>
            <strong className="hub-main-copy">Lv.{state.meatTower.level} / {towerLabels[state.meatTower.dominantType]}</strong>
            <div className="tower-trend-list">
              {Object.entries(state.meatTower.attributes).map(([key, value]) => (
                <div key={key}>
                  <span>{towerLabels[key as MeatTowerDominantType]}</span>
                  <div><i style={{ width: statPercent(value, towerTotal) }} /></div>
                  <b>{value}</b>
                </div>
              ))}
            </div>
          </article>

          <article className="hub-card ending-signal-box">
            {endingSignals.map((signal) => (
              <p key={signal}>{signal}</p>
            ))}
          </article>
        </aside>
      </main>

      <footer className="hub-guided-actions">
        <button className="hub-primary-next" onClick={() => goToScene(recommendedAction.scene)}>
          <span>{recommendedAction.icon}</span>
          <strong>{recommendedAction.label}</strong>
          <small>{recommendedAction.detail}</small>
        </button>
        <div className="hub-secondary-actions">
          {secondaryActions.slice(0, 4).map((action) => (
            <HubButton
              detail={action.detail}
              disabled={action.disabled}
              icon={action.icon}
              key={action.scene}
              label={action.label}
              scene={action.scene}
            />
          ))}
        </div>
      </footer>
    </section>
  );
}
