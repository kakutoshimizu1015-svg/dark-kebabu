import type { GameState, NightHistoryEntry } from "../types";

type CountEntry = {
  name: string;
  count: number;
};

const average = (values: number[]) =>
  values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;

const formatSigned = (value: number) => `${value >= 0 ? "+" : ""}${value}`;

const topCount = (entries: string[]): CountEntry => {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    counts.set(entry, (counts.get(entry) ?? 0) + 1);
  }
  const [name = "-", count = 0] =
    [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0] ?? [];
  return { name, count };
};

const chronological = (history: NightHistoryEntry[]) =>
  [...history].sort((a, b) => a.nightNumber - b.nightNumber);

const customerMutationText = (night: NightHistoryEntry) =>
  night.customerChanges
    .map((customer) => `${customer.name}: S${customer.mutationStage} / desire ${customer.desireProgress}`)
    .join(", ");

const repeatedMorningLogWarning = (history: NightHistoryEntry[]) => {
  const nights = chronological(history);
  let streak = 0;
  let previous = "";

  for (const night of nights) {
    const key = night.morningLogs[0] ? `${night.morningLogs[0].title}:${night.morningLogs[0].message}` : "";
    streak = key && key === previous ? streak + 1 : 1;
    previous = key;
    if (key && streak >= 3) return true;
  }

  return false;
};

const buildWarnings = (state: GameState, history: NightHistoryEntry[]) => {
  const nights = chronological(history);
  const warnings: string[] = [];
  const firstFive = nights.slice(0, 5);
  const firstFivePolice = firstFive.reduce((sum, night) => sum + night.policeAttentionChange, 18);

  if (firstFive.length >= 1 && firstFivePolice >= 80) {
    warnings.push("警察注目度が上がりすぎ: 5夜以内に80%以上へ到達するペースです。");
  }

  const moneyGains = nights.map((night) => night.earnedMoney);
  const lastFiveMoney = moneyGains.slice(-5);
  const moneyKeepsClimbing =
    lastFiveMoney.length >= 3 && lastFiveMoney.every((value, index) => index === 0 || value >= lastFiveMoney[index - 1]);
  if (average(moneyGains) >= 1800 || moneyKeepsClimbing) {
    warnings.push("報酬過多: 所持金が増え続けすぎている可能性があります。");
  }

  if (firstFive.some((night) => night.meatTowerChanges.levelAfter >= 5) || state.meatTower.level >= 6) {
    warnings.push("肉タワー成長が早すぎ: 5夜以内に高レベルへ近づいています。");
  }

  if (repeatedMorningLogWarning(history)) {
    warnings.push("ログ重複が多い: 同じ翌朝ログが3回以上連続しています。");
  }

  const mutationJump = nights.some((night, nightIndex) => {
    if (nightIndex === 0) return false;
    const previous = nights[nightIndex - 1];
    return night.customerChanges.some((customer) => {
      const previousCustomer = previous.customerChanges.find((entry) => entry.customerId === customer.customerId);
      return previousCustomer ? customer.mutationStage - previousCustomer.mutationStage >= 2 : false;
    });
  });
  if (mutationJump || state.customers.some((customer) => customer.mutationStage >= 3 && state.nightNumber <= 5)) {
    warnings.push("欲望進行が早すぎ: 客のmutationStageが急激に上がっています。");
  }

  return warnings;
};

const buildSummary = (state: GameState, history: NightHistoryEntry[]) => {
  const ingredientNames = history.flatMap((night) => {
    const used = night.kebabsServed.flatMap((kebab) => kebab.ingredients.map((ingredient) => ingredient.name));
    return used.length > 0 ? used : night.ingredientsCollected.map((ingredient) => ingredient.name);
  });
  const kebabNames = history.flatMap((night) => night.kebabsServed.map((kebab) => kebab.name));
  const morningLogTitles = history.flatMap((night) => night.morningLogs.map((log) => log.title));
  const mostMutatedCustomer =
    [...state.customers].sort(
      (a, b) => b.mutationStage - a.mutationStage || b.desireProgress - a.desireProgress,
    )[0] ?? null;

  return {
    averageMoney: average(history.map((night) => night.earnedMoney)),
    averagePolice: average(history.map((night) => night.policeAttentionChange)),
    averageReputation: average(history.map((night) => night.reputationChange)),
    topIngredient: topCount(ingredientNames),
    topKebab: topCount(kebabNames),
    mostMutatedCustomer,
    topMorningLog: topCount(morningLogTitles),
  };
};

export function PlaytestReport({ state, onClose }: { state: GameState; onClose: () => void }) {
  const history = chronological(state.nightHistory);
  const summary = buildSummary(state, history);
  const warnings = buildWarnings(state, history);

  return (
    <div className="playtest-report-backdrop" role="dialog" aria-modal="true" aria-label="Playtest Report">
      <section className="playtest-report">
        <header className="playtest-report-header">
          <div>
            <p className="eyebrow">Step 14</p>
            <h1>Playtest Report</h1>
          </div>
          <button onClick={onClose}>Close</button>
        </header>

        <section className="playtest-summary-grid">
          <article>
            <span>平均獲得金額</span>
            <strong>¥{Math.round(summary.averageMoney).toLocaleString()}</strong>
          </article>
          <article>
            <span>平均警察注目度上昇</span>
            <strong>{formatSigned(Math.round(summary.averagePolice))}</strong>
          </article>
          <article>
            <span>平均評判上昇</span>
            <strong>{formatSigned(Math.round(summary.averageReputation))}</strong>
          </article>
          <article>
            <span>最も多く使われた素材</span>
            <strong>{summary.topIngredient.name}</strong>
            <small>{summary.topIngredient.count}回</small>
          </article>
          <article>
            <span>最も多く提供されたケバブ</span>
            <strong>{summary.topKebab.name}</strong>
            <small>{summary.topKebab.count}回</small>
          </article>
          <article>
            <span>最も変異が進んだ客</span>
            <strong>{summary.mostMutatedCustomer?.name ?? "-"}</strong>
            <small>
              Stage {summary.mostMutatedCustomer?.mutationStage ?? 0} / desire{" "}
              {summary.mostMutatedCustomer?.desireProgress ?? 0}
            </small>
          </article>
          <article>
            <span>最も多く出た翌朝ログ</span>
            <strong>{summary.topMorningLog.name}</strong>
            <small>{summary.topMorningLog.count}回</small>
          </article>
        </section>

        <section className="playtest-warning-panel">
          <h2>Balance Warnings</h2>
          {warnings.length > 0 ? (
            <ul>
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : (
            <p>大きな破綻警告はまだ出ていません。</p>
          )}
        </section>

        <section className="playtest-table-wrap">
          <h2>Night History</h2>
          {history.length > 0 ? (
            <table className="playtest-table">
              <thead>
                <tr>
                  <th>Night</th>
                  <th>Money</th>
                  <th>Rep</th>
                  <th>Police</th>
                  <th>Ingredients</th>
                  <th>Kebabs</th>
                  <th>Customers</th>
                  <th>Tower</th>
                  <th>Dominant</th>
                  <th>Logs</th>
                </tr>
              </thead>
              <tbody>
                {history.map((night) => (
                  <tr key={night.nightNumber}>
                    <td>{night.nightNumber}</td>
                    <td>¥{night.earnedMoney.toLocaleString()}</td>
                    <td>{formatSigned(night.reputationChange)}</td>
                    <td>{formatSigned(night.policeAttentionChange)}</td>
                    <td>{night.ingredientsCollected.length}</td>
                    <td>{night.kebabsServed.length}</td>
                    <td>{night.customerChanges.length}</td>
                    <td>
                      Lv.{night.meatTowerChanges.levelBefore} → Lv.{night.meatTowerChanges.levelAfter}
                    </td>
                    <td>{night.meatTowerChanges.dominantTypeAfter}</td>
                    <td>{night.morningLogs.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="signal-text">まだnightHistoryがありません。1夜終えるとここに記録されます。</p>
          )}
        </section>

        <section className="playtest-details-list">
          <h2>Details</h2>
          {history.map((night) => (
            <details key={`details-${night.nightNumber}`}>
              <summary>Night {night.nightNumber} details</summary>
              <dl className="compact-list">
                <div>
                  <dt>customer mutation changes</dt>
                  <dd>{customerMutationText(night) || "-"}</dd>
                </div>
                <div>
                  <dt>ingredients</dt>
                  <dd>{night.ingredientsCollected.map((ingredient) => ingredient.name).join(", ") || "-"}</dd>
                </div>
                <div>
                  <dt>kebabs</dt>
                  <dd>{night.kebabsServed.map((kebab) => kebab.name).join(", ") || "-"}</dd>
                </div>
                <div>
                  <dt>morning logs</dt>
                  <dd>{night.morningLogs.map((log) => log.title).join(", ") || "-"}</dd>
                </div>
              </dl>
            </details>
          ))}
        </section>
      </section>
    </div>
  );
}
