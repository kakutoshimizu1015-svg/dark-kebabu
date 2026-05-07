import { useGame } from "../state/GameContext";

const dominantLabel: Record<string, string> = {
  fat: "脂肪系",
  poison: "毒性混入系",
  glow: "発光系",
  fungus: "菌糸成熟系",
  tentacle: "触手系",
};

export function EndingScene() {
  const { state, returnToTitle, continueFromEnding, newGame } = useGame();
  const ending = state.currentEnding;
  const latestHistory = state.nightHistory[0];
  const maxMutation = Math.max(...state.customers.map((customer) => customer.mutationStage), 0);
  const totalInterference = state.radioBroadcastHistory.filter((broadcast) => broadcast.category === "interference").length;

  return (
    <section className="ending-scene">
      <header className="ending-hero">
        <p className="eyebrow">ENDING / FM88.8 final readout</p>
        <h1>{ending?.name ?? "夜明けエンド"}</h1>
        <p>{ending?.description ?? "街は、まだ終わり方を選びきれていない。"}</p>
      </header>

      <div className="ending-grid">
        <article className="panel panel-wide ending-panel">
          <h2>到達理由</h2>
          <p>{ending?.reason ?? "条件ログが見つからない。FM88.8だけが笑っている。"}</p>
        </article>

        <article className="panel">
          <h2>最終状態サマリー</h2>
          <dl className="compact-list">
            <div><dt>夜</dt><dd>{state.nightNumber}</dd></div>
            <div><dt>所持金</dt><dd>¥{state.money.toLocaleString()}</dd></div>
            <div><dt>評判</dt><dd>{state.reputation}</dd></div>
            <div><dt>警察注目度</dt><dd>{state.policeAttention}</dd></div>
            <div><dt>肉タワー</dt><dd>Lv.{state.meatTower.level} / {dominantLabel[state.meatTower.dominantType]}</dd></div>
            <div><dt>危険度</dt><dd>{state.meatTower.risk}</dd></div>
            <div><dt>最大変異</dt><dd>Stage {maxMutation}</dd></div>
            <div><dt>混線放送</dt><dd>{totalInterference}</dd></div>
            <div><dt>発見資料</dt><dd>{state.unlockedStoryFlags.length}</dd></div>
          </dl>
        </article>

        <article className="panel">
          <h2>最後の夜</h2>
          {latestHistory ? (
            <dl className="compact-list">
              <div><dt>売上</dt><dd>¥{latestHistory.earnedMoney.toLocaleString()}</dd></div>
              <div><dt>評判変化</dt><dd>{latestHistory.reputationChange >= 0 ? "+" : ""}{latestHistory.reputationChange}</dd></div>
              <div><dt>警察変化</dt><dd>{latestHistory.policeAttentionChange >= 0 ? "+" : ""}{latestHistory.policeAttentionChange}</dd></div>
              <div><dt>回収素材</dt><dd>{latestHistory.ingredientsCollected.length}</dd></div>
              <div><dt>提供</dt><dd>{latestHistory.kebabsServed.length}</dd></div>
              <div><dt>朝ログ</dt><dd>{latestHistory.morningLogs.length}</dd></div>
            </dl>
          ) : (
            <p className="signal-text">最後の夜の履歴はまだ記録されていない。</p>
          )}
        </article>
      </div>

      <footer className="action-dock ending-actions">
        <button className="secondary-action" onClick={returnToTitle}>タイトルへ戻る</button>
        <button className="primary-action" onClick={continueFromEnding}>直前の朝から続ける</button>
        <button className="secondary-action" onClick={newGame}>新規開始</button>
      </footer>
    </section>
  );
}
