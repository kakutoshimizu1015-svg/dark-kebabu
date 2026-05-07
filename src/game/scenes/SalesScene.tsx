import { useMemo, useState } from "react";
import { getCustomerMutationDescription, getMutationStageLabel } from "../customerMutation";
import { useGame } from "../state/GameContext";
import type { Customer, Kebab, KebabStatKey, SalesLog } from "../types";

const desireWidth = (value: number) => `${Math.min(100, Math.max(0, value))}%`;
const meterWidth = (value: number, max = 100) => `${Math.min(100, Math.max(0, (value / max) * 100))}%`;

const statLabels: Record<KebabStatKey, string> = {
  umami: "旨味",
  spice: "刺激",
  stink: "異臭",
  addictiveness: "中毒",
  weirdness: "変さ",
  risk: "危険",
};

const customerPortraits: Record<string, string> = {
  bandage_man: "包",
  crying_zombie: "泣",
  influencer: "映",
  night_watch: "警",
};

const desireHints: Record<string, string> = {
  包帯男: "火災、焦げ臭さ、裏路地ルートに影響",
  泣くゾンビ: "雨、涙、帰れない客に影響",
  インフルエンサー: "看板、配信、評判と炎上に影響",
  夜警: "警察注目度、検問、監視に影響",
};

type MatchForecast = {
  label: string;
  tone: "great" | "ok" | "danger" | "viral" | "police";
  score: number;
  details: string;
};

const statValue = (kebab: Kebab, key: KebabStatKey) => kebab[key];

const forecastMatch = (customer?: Customer, kebab?: Kebab): MatchForecast => {
  if (!customer || !kebab) {
    return {
      label: "提供待ち",
      tone: "ok",
      score: 0,
      details: "客とケバブを選ぶと、相性予測が点灯する。",
    };
  }

  const favoriteScore = customer.favoriteStats.reduce((sum, key) => sum + statValue(kebab, key), 0);
  const dislikeScore = customer.dislikeStats.reduce((sum, key) => sum + statValue(kebab, key), 0);
  const policePressure = kebab.risk + kebab.stink + Math.floor(kebab.weirdness / 2);
  const score = favoriteScore - dislikeScore * 0.8 + customer.regularity * 0.4;

  if (policePressure >= 150 || (customer.id === "night_watch" && kebab.risk >= 55)) {
    return {
      label: "警察に見つかりそう",
      tone: "police",
      score,
      details: "異臭と危険度が高い。出せば注目度が跳ねる。",
    };
  }
  if (customer.id === "influencer" && kebab.weirdness + kebab.stink >= 110) {
    return {
      label: "炎上しそう",
      tone: "viral",
      score,
      details: "映えるが危うい。評判と欲望進行が同時に燃える。",
    };
  }
  if (score >= 95) {
    return {
      label: "かなり好み",
      tone: "great",
      score,
      details: "好みと噛み合っている。売上と満足度に期待。",
    };
  }
  if (score >= 35) {
    return {
      label: "まあまあ",
      tone: "ok",
      score,
      details: "悪くない。安定した営業結果になりそう。",
    };
  }
  return {
    label: "危険",
    tone: "danger",
    score,
    details: "苦手な味が強い。断る判断もあり。",
  };
};

const summarizeSales = (logs: SalesLog[]) => {
  const servedLogs = logs.filter((log) => log.kebabName !== "提供拒否");
  return {
    earned: logs.reduce((sum, log) => sum + log.moneyEarned, 0),
    served: servedLogs.length,
    happy: servedLogs.filter((log) => log.satisfactionChange > 0).length,
    desireMoved: servedLogs.filter((log) => log.desireProgressChange > 0).length,
    police: logs.reduce((sum, log) => sum + log.policeAttentionChange, 0),
    hooks: logs
      .filter((log) => log.desireProgressChange >= 6 || log.policeAttentionChange >= 4 || log.mutationStageAfter >= 2)
      .slice(0, 3),
  };
};

export function SalesScene() {
  const {
    state,
    selectSalesKebab,
    selectSalesCustomer,
    serveCustomer,
    refuseCustomer,
    goToScene,
  } = useGame();
  const [draggedKebabId, setDraggedKebabId] = useState<string | undefined>();
  const [hoverCustomerId, setHoverCustomerId] = useState<string | undefined>();

  const selectedCustomer =
    state.customers.find((customer) => customer.id === (hoverCustomerId ?? state.selectedSalesCustomerId)) ??
    state.customers[0];
  const selectedKebab =
    state.cookedKebabs.find((kebab) => kebab.id === (draggedKebabId ?? state.selectedSalesKebabId)) ??
    state.cookedKebabs[0];
  const forecast = forecastMatch(selectedCustomer, selectedKebab);
  const latestResult = state.salesLogs[0];
  const summary = useMemo(() => summarizeSales(state.salesLogs), [state.salesLogs]);

  const handleDropCustomer = (customerId: string) => {
    if (!draggedKebabId) return;
    serveCustomer(customerId, draggedKebabId);
    setDraggedKebabId(undefined);
    setHoverCustomerId(undefined);
  };

  return (
    <section className="service-screen">
      <header className="service-status-bar">
        <div><span>所持金</span><strong>¥{state.money.toLocaleString()}</strong></div>
        <div><span>評判</span><strong>{state.reputation}</strong></div>
        <div><span>警察注目</span><strong>{state.policeAttention}%</strong></div>
        <div><span>体力</span><strong>{state.playerStats.hp}/{state.playerStats.maxHp}</strong></div>
        <div><span>在庫</span><strong>{state.inventory.length + state.cookedKebabs.length}</strong></div>
        <div><span>肉タワー</span><strong>Lv.{state.meatTower.level} {state.meatTower.dominantType}</strong></div>
      </header>

      <main className="service-layout">
        <aside className="service-queue-panel">
          <div className="panel-title-row">
            <h2>来店客の列</h2>
            <span className="temptation">待たせるほど不満</span>
          </div>
          <div className="customer-queue">
            {state.customers.map((customer, index) => {
              const wait = Math.min(100, 22 + index * 17 + state.salesLogs.length * 5);
              const isSelected = customer.id === selectedCustomer?.id;
              const isRefused = state.refusedCustomerIds.includes(customer.id);
              return (
                <button
                  className={`service-customer-card ${isSelected ? "is-selected" : ""} ${customer.mutationStage >= 2 ? "is-mutating" : ""} ${isRefused ? "is-refused" : ""}`}
                  key={customer.id}
                  onClick={() => selectSalesCustomer(customer.id)}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setHoverCustomerId(customer.id);
                  }}
                  onDragLeave={() => setHoverCustomerId(undefined)}
                  onDrop={() => handleDropCustomer(customer.id)}
                >
                  <span className="customer-portrait">{customerPortraits[customer.id] ?? customer.name.slice(0, 1)}</span>
                  <div>
                    <strong>{customer.name}</strong>
                    <small>{customer.desireType}</small>
                  </div>
                  <div className="mini-meter"><i style={{ width: desireWidth(customer.satisfaction) }} /></div>
                  <div className="mini-meter desire"><i style={{ width: desireWidth(customer.desireProgress) }} /></div>
                  <em>Stage {customer.mutationStage}</em>
                  <span className="wait-chip">待ち {wait}%</span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="service-counter-panel">
          <div className="stall-counter-visual">
            <div className={`compatibility-orb match-${forecast.tone}`}>
              <span>{forecast.label}</span>
              <strong>{Math.round(forecast.score)}</strong>
            </div>
            <div
              className={`kebab-serve-plate ${state.cookedKebabs.length === 0 ? "is-empty" : ""}`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => selectedCustomer && draggedKebabId && handleDropCustomer(selectedCustomer.id)}
            >
              {selectedKebab ? (
                <>
                  <span>皿</span>
                  <strong>{selectedKebab.name}</strong>
                  <small>ドラッグして客へ重ねる / ここに置いて提供</small>
                </>
              ) : (
                <>
                  <span>空</span>
                  <strong>提供できるケバブがない</strong>
                  <small>先に仕込みでケバブを作ろう。</small>
                  <button className="mini-neon-button" onClick={() => goToScene("prep")}>仕込みへ行く</button>
                </>
              )}
            </div>
            <div className="counter-light-strip">
              <i style={{ width: meterWidth(state.policeAttention) }} />
            </div>
          </div>

          <article className={`service-forecast-card match-${forecast.tone}`}>
            <small>相性予測</small>
            <h2>{forecast.label}</h2>
            <p>{forecast.details}</p>
            <div className="service-action-row">
              <button
                className="primary-action compact-action"
                disabled={!selectedCustomer || !selectedKebab}
                onClick={() => selectedCustomer && selectedKebab && serveCustomer(selectedCustomer.id, selectedKebab.id)}
              >
                提供する
              </button>
              <button
                className="danger-action"
                disabled={!selectedCustomer}
                onClick={() => selectedCustomer && refuseCustomer(selectedCustomer.id)}
              >
                危険だから出さない
              </button>
            </div>
          </article>

          {latestResult ? (
            <article className="service-result-card">
              <small>提供結果</small>
              <strong>{latestResult.customerName}</strong>
              <p>{latestResult.message}</p>
              <dl className="service-result-grid">
                <div><dt>売上</dt><dd>¥{latestResult.moneyEarned.toLocaleString()}</dd></div>
                <div><dt>評判</dt><dd>{latestResult.reputationChange >= 0 ? "+" : ""}{latestResult.reputationChange}</dd></div>
                <div><dt>警察</dt><dd>{latestResult.policeAttentionChange >= 0 ? "+" : ""}{latestResult.policeAttentionChange}</dd></div>
                <div><dt>満足</dt><dd>{latestResult.satisfactionChange >= 0 ? "+" : ""}{latestResult.satisfactionChange}</dd></div>
                <div><dt>欲望</dt><dd>+{latestResult.desireProgressChange}</dd></div>
                <div><dt>変異</dt><dd>Stage {latestResult.mutationStageAfter}</dd></div>
              </dl>
            </article>
          ) : null}
        </section>

        <aside className="service-detail-panel">
          {selectedCustomer ? (
            <>
              <div className="selected-customer-visual">
                <span>{customerPortraits[selectedCustomer.id] ?? selectedCustomer.name.slice(0, 1)}</span>
                <div>
                  <small>選択中の客</small>
                  <h2>{selectedCustomer.name}</h2>
                  <p>{desireHints[selectedCustomer.name] ?? "欲望が街の状態に影響する。"}</p>
                </div>
              </div>
              <dl className="compact-list">
                <div><dt>欲望</dt><dd>{selectedCustomer.desireType}</dd></div>
                <div><dt>好み</dt><dd>{selectedCustomer.favoriteStats.map((stat) => statLabels[stat]).join(" / ")}</dd></div>
                <div><dt>苦手</dt><dd>{selectedCustomer.dislikeStats.map((stat) => statLabels[stat]).join(" / ")}</dd></div>
              </dl>
              <div className="desire-block service-desire-block">
                <div className="desire-header">
                  <span>満足度</span>
                  <b>{selectedCustomer.satisfaction}/100</b>
                </div>
                <div className="desire-meter"><i style={{ width: desireWidth(selectedCustomer.satisfaction) }} /></div>
                <div className="desire-header">
                  <span>欲望進行</span>
                  <b>{selectedCustomer.desireProgress}/100</b>
                </div>
                <div className="desire-meter desire-danger"><i style={{ width: desireWidth(selectedCustomer.desireProgress) }} /></div>
                <small>Stage {selectedCustomer.mutationStage}: {getMutationStageLabel(selectedCustomer.mutationStage)}</small>
                <p>{getCustomerMutationDescription(selectedCustomer)}</p>
              </div>
            </>
          ) : (
            <p className="signal-text">客を選ぶと詳細が表示される。</p>
          )}
        </aside>
      </main>

      <section className="service-kebab-dock">
        <div className="panel-title-row">
          <h2>所持ケバブ / 提供候補</h2>
          <span className="temptation">ドラッグ提供 / タップ選択</span>
        </div>
        <div className="service-kebab-grid">
          {state.cookedKebabs.length === 0 && <p className="signal-text">完成したケバブがない。仕込みへ戻ろう。</p>}
          {state.cookedKebabs.map((kebab) => (
            <button
              className={`service-kebab-card ${kebab.id === selectedKebab?.id ? "is-selected" : ""}`}
              draggable
              key={kebab.id}
              onClick={() => selectSalesKebab(kebab.id)}
              onDragStart={() => {
                selectSalesKebab(kebab.id);
                setDraggedKebabId(kebab.id);
              }}
              onDragEnd={() => {
                setDraggedKebabId(undefined);
                setHoverCustomerId(undefined);
              }}
            >
              <span className="kebab-card-art">肉</span>
              <strong>{kebab.name}</strong>
              <small>¥{kebab.price.toLocaleString()} / Risk {kebab.risk}</small>
              <div className="kebab-stat-chips">
                <span>旨 {kebab.umami}</span>
                <span>刺 {kebab.spice}</span>
                <span>臭 {kebab.stink}</span>
                <span>中 {kebab.addictiveness}</span>
                <span>変 {kebab.weirdness}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="service-summary-panel">
        <div>
          <p className="eyebrow">Sales Summary</p>
          <h2>今夜の営業まとめ</h2>
        </div>
        <div className="service-summary-grid">
          <article><span>売上合計</span><strong>¥{summary.earned.toLocaleString()}</strong></article>
          <article><span>提供数</span><strong>{summary.served}</strong></article>
          <article><span>満足した客</span><strong>{summary.happy}</strong></article>
          <article><span>欲望が進んだ客</span><strong>{summary.desireMoved}</strong></article>
          <article><span>警察注目変化</span><strong>{summary.police >= 0 ? "+" : ""}{summary.police}</strong></article>
        </div>
        <div className="service-morning-hooks">
          {summary.hooks.length === 0 ? (
            <p className="signal-text">翌朝に響きそうな大事件はまだない。</p>
          ) : (
            summary.hooks.map((hook) => (
              <span key={hook.id}>{hook.customerName}: {hook.kebabName} が朝の事件になりそう</span>
            ))
          )}
        </div>
      </section>

      <footer className="action-dock service-action-dock">
        <button className="secondary-action" onClick={() => goToScene("hub")}>拠点へ戻る</button>
        <button className="primary-action" onClick={() => goToScene("meatTower")}>営業終了して肉タワーへ</button>
      </footer>
    </section>
  );
}
