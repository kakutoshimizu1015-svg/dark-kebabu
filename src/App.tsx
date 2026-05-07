import { DebugPanel } from "./game/debug/DebugPanel";
import { EndingScene } from "./game/scenes/EndingScene";
import { ExplorationScene } from "./game/scenes/ExplorationScene";
import { HubScene } from "./game/scenes/HubScene";
import { MeatTowerScene } from "./game/scenes/MeatTowerScene";
import { MorningScene } from "./game/scenes/MorningScene";
import { PrepScene } from "./game/scenes/PrepScene";
import { RadioScene } from "./game/scenes/RadioScene";
import { SalesScene } from "./game/scenes/SalesScene";
import { GameProvider, useGame } from "./game/state/GameContext";

function Shell() {
  const { state, startNight, manualSave, loadSavedGame, savedGameAvailable } = useGame();

  if (state.scene === "title") {
    return (
      <main className="app-shell title-screen">
        <DebugPanel />
        <section className="hero-panel">
          <p className="eyebrow">終末ネオン街 / 深夜営業 24:00-5:00</p>
          <h1>KEBAB AFTER DARK</h1>
          <p className="tagline">汚いのに、絶対うまい。でも、食べるほど街も客も少しずつおかしくなる。</p>
          <div className="title-stats">
            <span>夜 {state.nightNumber}</span>
            <span>評判 {state.reputation}</span>
            <span>所持金 ¥{state.money.toLocaleString()}</span>
          </div>
        </section>
        <div className="title-actions">
          <button className="primary-action" onClick={startNight}>
            新しい夜を始める
          </button>
          <button className="secondary-action" disabled={!savedGameAvailable} onClick={loadSavedGame}>
            続きから
          </button>
        </div>
      </main>
    );
  }

  const scene = {
    hub: <HubScene />,
    radio: <RadioScene />,
    exploration: <ExplorationScene />,
    prep: <PrepScene />,
    sales: <SalesScene />,
    meatTower: <MeatTowerScene />,
    morning: <MorningScene />,
    ending: <EndingScene />,
  }[state.scene];

  return (
    <main className="app-shell">
      <DebugPanel />
      <button className="secondary-action manual-save-button" onClick={manualSave}>
        手動セーブ
      </button>
      {scene}
    </main>
  );
}

export default function App() {
  return (
    <GameProvider>
      <Shell />
    </GameProvider>
  );
}
