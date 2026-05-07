import { useGame } from "../state/GameContext";
import { SceneFrame } from "./SceneFrame";

export function SalesScene() {
  const { state, selectSalesKebab, completeSales } = useGame();
  const selectedKebab =
    state.cookedKebabs.find((kebab) => kebab.id === state.selectedSalesKebabId) ??
    state.cookedKebabs.at(-1);

  return (
    <SceneFrame
      kicker="営業"
      title="客の欲望に、今夜の肉を合わせる"
      description="提供するケバブを選ぶ。好みに合うほど売上と評判が上がり、異臭と中毒性は欲望と警察を呼ぶ。"
      state={state}
      action={
        <button className="primary-action" disabled={!selectedKebab} onClick={completeSales}>
          選んだケバブを提供する
        </button>
      }
    >
      <article className="panel panel-wide">
        <div className="panel-title-row">
          <h2>今夜の客</h2>
          <span className="temptation">3〜4人の常連が腹を鳴らしている</span>
        </div>
        <div className="customer-row">
          {state.customers.map((customer) => (
            <div className="customer-card" key={customer.id}>
              <strong>{customer.name}</strong>
              <span>欲望: {customer.desireType}</span>
              <p>
                好き: {customer.favoriteStats.join(" / ")}
                <br />
                苦手: {customer.dislikeStats.join(" / ")}
              </p>
              <dl className="compact-list">
                <div><dt>満足</dt><dd>{customer.satisfaction}</dd></div>
                <div><dt>常連度</dt><dd>{customer.regularity}</dd></div>
                <div><dt>欲望進行</dt><dd>{customer.desireProgress}</dd></div>
                <div><dt>変異段階</dt><dd>{customer.mutationStage}</dd></div>
              </dl>
            </div>
          ))}
        </div>

        {state.salesLogs.length > 0 && (
          <div className="sales-log-list">
            <h2>営業ログ</h2>
            {state.salesLogs.map((log) => (
              <div className="sales-log" key={log.id}>
                <strong>{log.customerName}</strong>
                <p>{log.message}</p>
                <small>
                  売上 ¥{log.moneyEarned.toLocaleString()} / 評判 {log.reputationChange >= 0 ? "+" : ""}
                  {log.reputationChange} / 警察 +{log.policeAttentionChange} / 変異 {log.mutationStageAfter}
                </small>
              </div>
            ))}
          </div>
        )}
      </article>

      <article className="panel kebab-preview">
        <h2>提供するケバブ</h2>
        <div className="kebab-choice-list">
          {state.cookedKebabs.length === 0 && <p className="signal-text">まだ完成したケバブがない。</p>}
          {state.cookedKebabs.map((kebab) => (
            <button
              className={`sauce-card ${kebab.id === selectedKebab?.id ? "is-selected" : ""}`}
              key={kebab.id}
              onClick={() => selectSalesKebab(kebab.id)}
            >
              <strong>{kebab.name}</strong>
              <span>¥{kebab.price.toLocaleString()} / リスク {kebab.risk}</span>
            </button>
          ))}
        </div>

        <strong>{selectedKebab?.name ?? "未選択"}</strong>
        <dl className="compact-list">
          <div><dt>価格</dt><dd>¥{(selectedKebab?.price ?? 0).toLocaleString()}</dd></div>
          <div><dt>旨味</dt><dd>{selectedKebab?.umami ?? 0}</dd></div>
          <div><dt>刺激</dt><dd>{selectedKebab?.spice ?? 0}</dd></div>
          <div><dt>異臭</dt><dd>{selectedKebab?.stink ?? 0}</dd></div>
          <div><dt>中毒性</dt><dd>{selectedKebab?.addictiveness ?? 0}</dd></div>
          <div><dt>奇妙さ</dt><dd>{selectedKebab?.weirdness ?? 0}</dd></div>
          <div><dt>リスク</dt><dd>{selectedKebab?.risk ?? 0}</dd></div>
        </dl>
      </article>
    </SceneFrame>
  );
}
