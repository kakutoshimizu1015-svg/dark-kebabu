import { useState } from "react";
import { useGame } from "../state/GameContext";
import type { Goal, RadioBroadcast } from "../types";
import { SceneFrame } from "./SceneFrame";
import { StoryLog } from "./StoryLog";

const categoryLabels: Record<RadioBroadcast["category"], string> = {
  normal: "通常放送",
  interference: "混線",
  predecessor: "先代の声",
};

const categoryHints: Record<RadioBroadcast["category"], string> = {
  normal: "効果の一部が読める",
  interference: "ノイズが多く、効果が伏せられることがある",
  predecessor: "前夜の記録や客の変異に反応する",
};

const goalTypeLabels: Record<Goal["type"], string> = {
  shortTerm: "短期",
  midTerm: "中期",
  longTerm: "長期",
};

export function RadioScene() {
  const { state, chooseBroadcast } = useGame();
  const [isStoryLogOpen, setIsStoryLogOpen] = useState(false);
  const recommended = state.broadcasts[0];
  const activeGoals = state.goals.filter((goal) => !goal.completed).slice(0, 4);

  return (
    <SceneFrame
      className="radio-scene-frame"
      kicker="ラジオ"
      title="FM88.8は昨夜の結果を覚えている"
      description="今夜の目標を確認し、どの放送を追うか決める。混線は街と客の欲望に反応する。"
      state={state}
      action={
        <div className="action-row">
          <button
            className="primary-action"
            disabled={!recommended}
            onClick={() => recommended && chooseBroadcast(recommended)}
          >
            {recommended ? `${recommended.station} を聞く` : "放送を待つ"}
          </button>
          <button className="secondary-action" onClick={() => setIsStoryLogOpen(true)}>
            StoryLog
          </button>
        </div>
      }
    >
      {isStoryLogOpen ? <StoryLog onClose={() => setIsStoryLogOpen(false)} /> : null}
      <article className="panel panel-wide goal-panel">
        <div className="panel-title-row">
          <h2>今夜の目標</h2>
          <span className="temptation">{activeGoals.length} active</span>
        </div>
        {activeGoals.length > 0 ? (
          <div className="goal-grid">
            {activeGoals.map((goal) => (
              <div className={`goal-card goal-${goal.type}`} key={goal.id}>
                <span>{goalTypeLabels[goal.type]}</span>
                <strong>{goal.title}</strong>
                <p>{goal.description}</p>
                <small>報酬: {goal.reward.label}</small>
              </div>
            ))}
          </div>
        ) : (
          <p className="signal-text">今夜の目標はない。好きに汚く稼げる。</p>
        )}
      </article>

      <article className="panel panel-wide broadcast-panel">
        <div className="panel-title-row">
          <h2>今夜の放送</h2>
          <span className="temptation">前夜の痕跡に反応中</span>
        </div>
        <div className="radio-list">
          {state.broadcasts.map((broadcast) => (
            <button
              className={`radio-card radio-${broadcast.category}`}
              key={broadcast.id}
              onClick={() => chooseBroadcast(broadcast)}
            >
              <span>{broadcast.station}</span>
              <small className="broadcast-category">
                {categoryLabels[broadcast.category]} / {categoryHints[broadcast.category]}
              </small>
              <strong>{broadcast.title}</strong>
              <small>{broadcast.transcript}</small>
              <em>
                効果: {broadcast.isEffectHidden ? "??? ザー……効果不明" : broadcast.effectPreview}
              </em>
            </button>
          ))}
        </div>
      </article>

      <article className="panel">
        <h2>FM88.8</h2>
        <p className="signal-text">
          {recommended?.transcript ?? "ザー……まだ何も聞こえない……。"}
        </p>
        <dl className="compact-list">
          <div>
            <dt>分類</dt>
            <dd>{recommended ? categoryLabels[recommended.category] : "-"}</dd>
          </div>
          <div>
            <dt>ノイズ</dt>
            <dd>{recommended?.signalNoise ?? 0}</dd>
          </div>
          <div>
            <dt>効果予告</dt>
            <dd>{recommended?.isEffectHidden ? "伏せられている" : recommended?.effectPreview ?? "-"}</dd>
          </div>
        </dl>
        <div className="meter">
          <span style={{ width: `${Math.min(100, recommended?.signalNoise ?? 0)}%` }} />
        </div>
      </article>
    </SceneFrame>
  );
}
