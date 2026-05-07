import type { ReactNode } from "react";
import type { GameState } from "../types";

type SceneFrameProps = {
  kicker: string;
  title: string;
  description: string;
  state: GameState;
  children: ReactNode;
  action: ReactNode;
  className?: string;
};

export function SceneFrame({ kicker, title, description, state, children, action, className }: SceneFrameProps) {
  return (
    <section className={`scene ${className ?? ""}`}>
      <header className="scene-header">
        <div>
          <p className="eyebrow">{kicker}</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <aside className="status-strip" aria-label="共通ステータス">
          <span>夜 {state.nightNumber}</span>
          <span>¥{state.money.toLocaleString()}</span>
          <span>評判 {state.reputation}</span>
          <span>警戒 {state.policeAttention}</span>
          <span>HP {state.playerStats.hp}/{state.playerStats.maxHp}</span>
          <span>臭気 {state.playerStats.stink}</span>
          <span>騒音 {state.playerStats.noise}</span>
          <span>警報 {state.playerStats.alert}</span>
        </aside>
      </header>

      <div className="scene-grid">{children}</div>

      <footer className="action-dock">{action}</footer>
    </section>
  );
}
