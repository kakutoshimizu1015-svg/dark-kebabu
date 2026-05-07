import { useGame } from "../state/GameContext";
import type { RadioBroadcast } from "../types";
import { SceneFrame } from "./SceneFrame";

export function RadioScene() {
  const { state, chooseBroadcast } = useGame();
  const recommended = state.broadcasts[0];

  return (
    <SceneFrame
      kicker="ラジオ"
      title="深夜ラジオ"
      description="どの噂を追うか。放送は探索ルートと客層の温度を変える。"
      state={state}
      action={
        <button className="primary-action" onClick={() => chooseBroadcast(recommended)}>
          {recommended.station} を聞く
        </button>
      }
    >
      <article className="panel panel-wide broadcast-panel">
        <h2>今夜の混線</h2>
        <div className="radio-list">
          {state.broadcasts.map((broadcast: RadioBroadcast) => (
            <button
              className="radio-card"
              key={broadcast.id}
              onClick={() => chooseBroadcast(broadcast)}
            >
              <span>{broadcast.station}</span>
              <strong>{broadcast.title}</strong>
              <small>{broadcast.transcript}</small>
              <em>効果: {broadcast.effect}</em>
            </button>
          ))}
        </div>
      </article>
      <article className="panel">
        <h2>FM88.8</h2>
        <p className="signal-text">「食わせろ……腹が減ってるやつに……新しい路地が一本、焼き上がりました……」</p>
        <div className="meter">
          <span style={{ width: `${Math.min(100, recommended.signalNoise)}%` }} />
        </div>
      </article>
    </SceneFrame>
  );
}
