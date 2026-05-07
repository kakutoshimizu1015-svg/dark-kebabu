import { useGame } from "../state/GameContext";
import { SceneFrame } from "./SceneFrame";

export function MorningScene() {
  const { state, beginNextNight } = useGame();
  const latestLog = state.morningLogs[0]?.message ?? "朝になった。店はまだある。";
  const effects = state.nextNightEffects;

  return (
    <SceneFrame
      kicker="翌朝変化"
      title="朝日が、昨夜の失敗と成功を照らす"
      description="探索、営業、客の欲望、肉タワー成長から街が変化する。一部は次の夜の数値へ反映される。"
      state={state}
      action={<button className="primary-action" onClick={beginNextNight}>次の夜へ</button>}
    >
      <article className="panel panel-wide morning-panel">
        <h2>今朝の異変</h2>
        <p>{latestLog}</p>
        <ul className="log-list morning-log-list">
          {state.morningLogs.slice(0, 10).map((entry) => (
            <li key={entry.id}>
              <strong>{entry.title}: </strong>
              {entry.message}
            </li>
          ))}
        </ul>
      </article>

      <article className="panel">
        <h2>次の夜への影響</h2>
        <dl className="compact-list">
          <div><dt>探索リスク</dt><dd>+{effects.explorationRiskBonus}</dd></div>
          <div><dt>警察注目</dt><dd>{effects.policeAttentionDelta >= 0 ? "+" : ""}{effects.policeAttentionDelta}</dd></div>
          <div><dt>評判</dt><dd>{effects.reputationDelta >= 0 ? "+" : ""}{effects.reputationDelta}</dd></div>
          <div><dt>臭気</dt><dd>{effects.playerStinkDelta >= 0 ? "+" : ""}{effects.playerStinkDelta}</dd></div>
          <div><dt>騒音</dt><dd>{effects.playerNoiseDelta >= 0 ? "+" : ""}{effects.playerNoiseDelta}</dd></div>
          <div><dt>臨時売上</dt><dd>¥{effects.bonusMoney.toLocaleString()}</dd></div>
          <div><dt>常連度</dt><dd>+{effects.customerRegularityDelta}</dd></div>
          <div><dt>特殊イベント</dt><dd>{effects.specialEventUnlocked ? "解放" : "なし"}</dd></div>
        </dl>

        <div className="sales-log-list">
          <h2>欲望進行</h2>
          {state.customers.map((customer) => (
            <div className="sales-log" key={customer.id}>
              <strong>{customer.name}</strong>
              <p>
                欲望 {customer.desireProgress} / 変異段階 {customer.mutationStage}
              </p>
            </div>
          ))}
        </div>
      </article>
    </SceneFrame>
  );
}
