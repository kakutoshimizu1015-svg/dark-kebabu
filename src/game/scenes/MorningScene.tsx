import { useEffect, useMemo } from "react";
import { getCustomerMutationDescription, getMutationStageLabel } from "../customerMutation";
import { useGame } from "../state/GameContext";
import type { MorningLog, NightHistoryEntry } from "../types";

type MorningEventCategory = "customer" | "shop" | "city" | "radio" | "meatTower";

type MorningEventCard = {
  id: string;
  title: string;
  shortDescription: string;
  category: MorningEventCategory;
  impactSummary: string;
  icon: string;
};

const categoryMeta: Record<MorningEventCategory, { label: string; icon: string }> = {
  customer: { label: "Customer", icon: "客" },
  shop: { label: "Shop", icon: "店" },
  city: { label: "City", icon: "街" },
  radio: { label: "FM88.8", icon: "88" },
  meatTower: { label: "Meat Tower", icon: "塔" },
};

const desireWidth = (value: number) => `${Math.min(100, Math.max(0, value))}%`;

const categorizeLog = (log: MorningLog): MorningEventCategory => {
  const text = `${log.title} ${log.message}`.toLowerCase();
  if (text.includes("fm") || text.includes("radio") || text.includes("88.8")) return "radio";
  if (text.includes("tower") || text.includes("肉") || text.includes("閧")) return "meatTower";
  if (text.includes("customer") || text.includes("客") || text.includes("desire") || text.includes("mutation")) return "customer";
  if (text.includes("police") || text.includes("route") || text.includes("district") || text.includes("city")) return "city";
  return "shop";
};

const shortText = (message: string) => {
  const cleaned = message.replace(/\s+/g, " ").trim();
  return cleaned.length > 74 ? `${cleaned.slice(0, 74)}...` : cleaned;
};

const impactFor = (category: MorningEventCategory, latestHistory?: NightHistoryEntry) => {
  switch (category) {
    case "customer":
      return "常連の欲望進行・来店傾向に影響";
    case "shop":
      return latestHistory ? `売上 ¥${latestHistory.earnedMoney.toLocaleString()} / 評判 ${latestHistory.reputationChange >= 0 ? "+" : ""}${latestHistory.reputationChange}` : "屋台の見た目と評判に影響";
    case "city":
      return latestHistory ? `警察注目 ${latestHistory.policeAttentionChange >= 0 ? "+" : ""}${latestHistory.policeAttentionChange}` : "探索リスクと帰還難度に影響";
    case "radio":
      return "FM88.8の次回放送候補に影響";
    case "meatTower":
      return latestHistory
        ? `Lv.${latestHistory.meatTowerChanges.levelBefore} → Lv.${latestHistory.meatTowerChanges.levelAfter}`
        : "肉タワー分岐と朝の変化に影響";
  }
};

const buildEventCards = (logs: MorningLog[], latestHistory?: NightHistoryEntry): MorningEventCard[] => {
  const seen = new Set<MorningEventCategory>();
  const cards: MorningEventCard[] = [];
  for (const log of logs) {
    const category = categorizeLog(log);
    if (cards.length >= 5) break;
    if (seen.has(category) && cards.length >= 3) continue;
    seen.add(category);
    cards.push({
      id: log.id,
      title: log.title,
      shortDescription: shortText(log.message),
      category,
      impactSummary: impactFor(category, latestHistory),
      icon: categoryMeta[category].icon,
    });
  }
  return cards;
};

const buildPlaytestNotes = (history: NightHistoryEntry[]) => {
  const notes: string[] = [];
  const recent = history.slice(0, 5);
  if (recent.length < 3) {
    notes.push("3夜分の履歴が溜まると、短期プレイ感触を確認できます。");
    return notes;
  }
  const repeatedTopLogs = recent
    .map((night) => night.morningLogs[0]?.title)
    .filter(Boolean);
  if (new Set(repeatedTopLogs).size <= 2) notes.push("同じ朝イベントが少し目立っています。ログ候補の偏りを確認。");
  if (recent.every((night) => night.meatTowerChanges.levelBefore === night.meatTowerChanges.levelAfter)) {
    notes.push("肉タワーのレベル変化が見えにくいです。投入量か演出を強める余地あり。");
  }
  const maxMutation = Math.max(...recent.flatMap((night) => night.customerChanges.map((customer) => customer.mutationStage)), 0);
  if (maxMutation <= 1) notes.push("客の変化はまだ控えめです。欲望ログの見せ方を強めると良さそう。");
  const avgIngredients = recent.reduce((sum, night) => sum + night.ingredientsCollected.length, 0) / recent.length;
  if (avgIngredients < 2) notes.push("探索報酬が弱く感じる可能性があります。素材獲得量を確認。");
  if (notes.length === 0) notes.push("3〜5夜の流れは大きく破綻していません。次は演出密度を見ます。");
  return notes;
};

export function MorningScene() {
  const { state, beginNextNight, manualSave } = useGame();
  const effects = state.nextNightEffects;
  const latestHistory = state.nightHistory[0];
  const eventCards = useMemo(
    () => buildEventCards((latestHistory?.morningLogs ?? state.morningLogs).slice(0, 12), latestHistory),
    [latestHistory, state.morningLogs],
  );
  const playtestNotes = useMemo(() => buildPlaytestNotes(state.nightHistory), [state.nightHistory]);
  const mostChangedCustomer = [...state.customers].sort((a, b) => b.desireProgress - a.desireProgress)[0];

  useEffect(() => {
    manualSave();
  }, [manualSave]);

  return (
    <section className="morning-results-screen">
      <header className="morning-results-hero">
        <div>
          <p className="eyebrow">Morning Change / Result Show</p>
          <h1>昨夜の欲張りが、街から返ってきた</h1>
          <p>探索、営業、常連、肉タワー、FM88.8。昨夜触ったものだけが、朝の形を変えて戻ってくる。</p>
        </div>
        <aside className="morning-score-card">
          <span>Night {latestHistory?.nightNumber ?? state.nightNumber}</span>
          <strong>{eventCards.length} Events</strong>
          <small>次夜ヒントあり</small>
        </aside>
      </header>

      <main className="morning-results-grid">
        <section className="morning-event-stage">
          <div className="panel-title-row">
            <h2>Morning Event Cards</h2>
            <span className="temptation">重要変化 3〜5件</span>
          </div>
          <div className="morning-event-grid">
            {eventCards.map((card) => (
              <article className={`morning-event-card event-${card.category}`} key={card.id}>
                <div className="event-visual">
                  <span>{card.icon}</span>
                </div>
                <small>{categoryMeta[card.category].label}</small>
                <strong>{card.title}</strong>
                <p>{card.shortDescription}</p>
                <em>{card.impactSummary}</em>
              </article>
            ))}
          </div>

          <article className="tonight-teaser-card">
            <div className="event-visual">
              <span>次</span>
            </div>
            <div>
              <small>Tonight Teaser</small>
              <strong>{state.nextNightHint}</strong>
              <p>この予告は、肉タワー・警察注目・常連の欲望・FM88.8の状態から決まります。</p>
            </div>
          </article>
        </section>

        <aside className="morning-side-summary">
          <article className="morning-summary-card">
            <h2>昨夜の結果</h2>
            {latestHistory ? (
              <dl className="compact-list">
                <div><dt>売上</dt><dd>¥{latestHistory.earnedMoney.toLocaleString()}</dd></div>
                <div><dt>評判</dt><dd>{latestHistory.reputationChange >= 0 ? "+" : ""}{latestHistory.reputationChange}</dd></div>
                <div><dt>警察</dt><dd>{latestHistory.policeAttentionChange >= 0 ? "+" : ""}{latestHistory.policeAttentionChange}</dd></div>
                <div><dt>素材</dt><dd>{latestHistory.ingredientsCollected.length}</dd></div>
                <div><dt>ケバブ</dt><dd>{latestHistory.kebabsServed.length}</dd></div>
                <div><dt>肉タワー</dt><dd>Lv.{latestHistory.meatTowerChanges.levelBefore} → Lv.{latestHistory.meatTowerChanges.levelAfter}</dd></div>
              </dl>
            ) : (
              <p className="signal-text">まだ昨夜の履歴がありません。</p>
            )}
          </article>

          <article className="morning-summary-card">
            <h2>次夜への影響</h2>
            <dl className="compact-list">
              <div><dt>探索リスク</dt><dd>+{effects.explorationRiskBonus}</dd></div>
              <div><dt>警察</dt><dd>{effects.policeAttentionDelta >= 0 ? "+" : ""}{effects.policeAttentionDelta}</dd></div>
              <div><dt>評判</dt><dd>{effects.reputationDelta >= 0 ? "+" : ""}{effects.reputationDelta}</dd></div>
              <div><dt>臭気</dt><dd>{effects.playerStinkDelta >= 0 ? "+" : ""}{effects.playerStinkDelta}</dd></div>
              <div><dt>臨時売上</dt><dd>¥{effects.bonusMoney.toLocaleString()}</dd></div>
            </dl>
          </article>

          {mostChangedCustomer ? (
            <article className="morning-summary-card customer-focus-card">
              <h2>常連変化</h2>
              <strong>{mostChangedCustomer.name}</strong>
              <div className="desire-meter">
                <i style={{ width: desireWidth(mostChangedCustomer.desireProgress) }} />
              </div>
              <p>Stage {mostChangedCustomer.mutationStage}: {getMutationStageLabel(mostChangedCustomer.mutationStage)}</p>
              <small>{getCustomerMutationDescription(mostChangedCustomer)}</small>
            </article>
          ) : null}
        </aside>
      </main>

      <section className="playtest-loop-panel">
        <div>
          <p className="eyebrow">J6 Playtest Summary</p>
          <h2>3〜5夜の感触メモ</h2>
        </div>
        <div className="playtest-loop-grid">
          <article><span>現在</span><strong>Night {state.nightNumber}</strong></article>
          <article><span>履歴</span><strong>{Math.min(5, state.nightHistory.length)} / 5夜</strong></article>
          <article><span>肉タワー</span><strong>Lv.{state.meatTower.level}</strong></article>
          <article><span>FM反応</span><strong>{state.radioBroadcastHistory.length}件</strong></article>
        </div>
        <ul className="playtest-note-list">
          {playtestNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </section>

      <details className="morning-detail-log">
        <summary>詳細ログを見る</summary>
        <ul className="log-list morning-log-list">
          {state.morningLogs.slice(0, 18).map((entry) => (
            <li key={entry.id}>
              <strong>{entry.title}: </strong>
              {entry.message}
            </li>
          ))}
        </ul>
      </details>

      <footer className="action-dock">
        <button className="primary-action" onClick={beginNextNight}>次の夜へ</button>
      </footer>
    </section>
  );
}
