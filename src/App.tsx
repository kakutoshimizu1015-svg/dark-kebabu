import { GameProvider, useGame } from "./game/state/GameContext";
import { ExplorationScene } from "./game/scenes/ExplorationScene";
import { MeatTowerScene } from "./game/scenes/MeatTowerScene";
import { MorningScene } from "./game/scenes/MorningScene";
import { PrepScene } from "./game/scenes/PrepScene";
import { RadioScene } from "./game/scenes/RadioScene";
import { SalesScene } from "./game/scenes/SalesScene";

function Shell() {
  const { state, startNight } = useGame();

  if (state.scene === "title") {
    return (
      <main className="app-shell title-screen">
        <section className="hero-panel">
          <p className="eyebrow">終末ネオン街 / 深夜営業 24:00-5:00</p>
          <h1>KEBAB AFTER DARK</h1>
          <p className="tagline">汚いのに、絶対うまい。でも食べるほど街も客も少しずつおかしくなる。</p>
          <div className="title-stats">
            <span>夜 {state.nightNumber}</span>
            <span>評判 {state.reputation}</span>
            <span>資金 ¥{state.money.toLocaleString()}</span>
          </div>
        </section>
        <button className="primary-action" onClick={startNight}>
          夜を開始
        </button>
      </main>
    );
  }

  const scene = {
    radio: <RadioScene />,
    exploration: <ExplorationScene />,
    prep: <PrepScene />,
    sales: <SalesScene />,
    meatTower: <MeatTowerScene />,
    morning: <MorningScene />,
  }[state.scene];

  return <main className="app-shell">{scene}</main>;
}

export default function App() {
  return (
    <GameProvider>
      <Shell />
    </GameProvider>
  );
}
