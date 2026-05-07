import { storyFragmentsWithDiscovery } from "../story";
import { useGame } from "../state/GameContext";
import { getEndingProgressSignals } from "../endings";
import type { StoryFragmentCategory } from "../types";

const categoryLabels: Record<StoryFragmentCategory, string> = {
  predecessor: "先代店主",
  meat: "夜肉の正体",
  radio: "FM88.8",
  city: "街の終末化",
  customer: "常連客の過去",
  authority: "衛生局・警察",
};

export function StoryLog({ onClose }: { onClose: () => void }) {
  const { state } = useGame();
  const fragments = storyFragmentsWithDiscovery(state.unlockedStoryFlags);
  const discoveredCount = fragments.filter((fragment) => fragment.discovered).length;
  const endingSignals = getEndingProgressSignals(state);

  return (
    <div className="story-log-backdrop" role="dialog" aria-modal="true" aria-label="Story Log">
      <section className="story-log">
        <header className="story-log-header">
          <div>
            <p className="eyebrow">Story Log</p>
            <h1>終末資料棚</h1>
            <p className="signal-text">
              {discoveredCount} / {fragments.length} fragments discovered
            </p>
          </div>
          <button className="secondary-action" onClick={onClose}>Close</button>
        </header>

        <div className="story-card-grid">
          <article className="story-card story-radio is-discovered ending-progress-card">
            <div className="story-card-icon">END</div>
            <span>Ending Progress / FM88.8</span>
            <strong>結末の気配</strong>
            {endingSignals.map((signal) => (
              <p key={signal}>{signal}</p>
            ))}
          </article>
          {fragments.map((fragment) => (
            <article
              className={`story-card story-${fragment.category} ${fragment.discovered ? "is-discovered" : "is-hidden"}`}
              key={fragment.id}
            >
              <div className="story-card-icon">{fragment.discovered ? "FM" : "??"}</div>
              <span>{categoryLabels[fragment.category]} / {fragment.source}</span>
              <strong>{fragment.discovered ? fragment.title : "？？？"}</strong>
              <p>{fragment.discovered ? fragment.summary : "未発見の資料。夜のどこかに、まだ湿った紙片が残っている。"}</p>
              {fragment.discovered ? (
                <details>
                  <summary>全文を読む</summary>
                  <p>{fragment.fullText}</p>
                  <small>Ending flags: {fragment.relatedEndingFlags.join(", ") || "-"}</small>
                </details>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
