import { useMemo, useState } from "react";
import { ingredients, sauces } from "../data";
import { checkEndingConditions } from "../endings";
import { calculateKebabStats, useGame } from "../state/GameContext";
import { PlaytestReport } from "./PlaytestReport";
import { simulateRun, type SimulationSummary } from "./simulateRun";
import type {
  Customer,
  EndingType,
  GameState,
  Ingredient,
  Kebab,
  KebabStats,
  MeatTowerDominantType,
  TowerAttributes,
} from "../types";

const towerTypes: MeatTowerDominantType[] = ["fat", "poison", "glow", "fungus", "tentacle"];
const towerKeys: Array<keyof TowerAttributes> = ["fat", "poison", "glow", "fungus", "tentacle"];
const kebabStatKeys: Array<keyof KebabStats> = [
  "umami",
  "spice",
  "stink",
  "addictiveness",
  "weirdness",
  "price",
  "risk",
];

const clampNumber = (value: number, min = 0, max = 999999) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? Math.round(value) : min));

const logId = () => `debug-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const createDebugKebab = (nightNumber: number): Kebab => {
  const baseIngredients = ingredients.slice(0, 2);
  const sauce = sauces[0];
  const stats = calculateKebabStats(baseIngredients, sauce);
  return {
    id: `debug-kebab-${Date.now()}`,
    name: `DEBUG ${sauce.name} KEBAB`,
    ingredients: baseIngredients,
    sauce,
    ...stats,
  };
};

const createMorningLogs = (state: GameState) => {
  const sales = state.salesLogs.reduce((sum, log) => sum + log.moneyEarned, 0);
  const topCustomer = [...state.customers].sort((a, b) => b.desireProgress - a.desireProgress)[0];
  return [
    {
      id: logId(),
      title: "DEBUG FM88.8",
      message: `昨夜の売上 ${sales.toLocaleString()} / 評判 ${state.reputation} / 警察注目度 ${state.policeAttention}`,
    },
    {
      id: logId(),
      title: "DEBUG 探索圧",
      message: `臭気 ${state.playerStats.stink}、騒音 ${state.playerStats.noise}、警戒 ${state.playerStats.alert} が次夜の探索に染み出す。`,
    },
    {
      id: logId(),
      title: "DEBUG 肉タワー",
      message: `Lv.${state.meatTower.level} / ${state.meatTower.dominantType} / risk ${state.meatTower.risk}`,
    },
    {
      id: logId(),
      title: "DEBUG 常連変化",
      message: topCustomer
        ? `${topCustomer.name}: desire ${topCustomer.desireProgress}, mutation ${topCustomer.mutationStage}`
        : "常連データなし",
    },
  ];
};

function NumberInput({
  label,
  value,
  onChange,
  max = 999999,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  max?: number;
}) {
  return (
    <label className="debug-field">
      <span>{label}</span>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(clampNumber(event.currentTarget.valueAsNumber, 0, max))}
      />
    </label>
  );
}

function CustomerDebugRow({
  customer,
  onChange,
}: {
  customer: Customer;
  onChange: (customer: Customer) => void;
}) {
  return (
    <div className="debug-row">
      <strong>{customer.name}</strong>
      <NumberInput
        label="desire"
        value={customer.desireProgress}
        max={100}
        onChange={(desireProgress) => onChange({ ...customer, desireProgress })}
      />
      <NumberInput
        label="mutation"
        value={customer.mutationStage}
        max={9}
        onChange={(mutationStage) => onChange({ ...customer, mutationStage })}
      />
    </div>
  );
}

export function DebugPanel() {
  const { state, debugUpdateState, debugResetGame } = useGame();
  const [isOpen, setIsOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [simulationSummary, setSimulationSummary] = useState<SimulationSummary | null>(null);

  const cargoWeight = useMemo(
    () => state.inventory.reduce((sum, ingredient) => sum + ingredient.weight, 0),
    [state.inventory],
  );

  if (!import.meta.env.DEV) return null;

  const patchState = (patch: Partial<GameState>) => {
    debugUpdateState((current) => ({ ...current, ...patch }));
  };

  const patchPlayerStats = (patch: Partial<GameState["playerStats"]>) => {
    debugUpdateState((current) => ({
      ...current,
      playerStats: { ...current.playerStats, ...patch },
    }));
  };

  const patchTower = (patch: Partial<GameState["meatTower"]>) => {
    debugUpdateState((current) => ({
      ...current,
      meatTower: { ...current.meatTower, ...patch },
    }));
  };

  const addIngredient = (ingredient: Ingredient, count = 1) => {
    debugUpdateState((current) => ({
      ...current,
      inventory: [...current.inventory, ...Array.from({ length: count }, () => ingredient)],
    }));
  };

  const updateKebab = (kebabId: string, patch: Partial<Kebab>) => {
    debugUpdateState((current) => ({
      ...current,
      cookedKebabs: current.cookedKebabs.map((kebab) =>
        kebab.id === kebabId ? { ...kebab, ...patch } : kebab,
      ),
    }));
  };

  const updateCustomer = (customer: Customer) => {
    debugUpdateState((current) => ({
      ...current,
      customers: current.customers.map((entry) => (entry.id === customer.id ? customer : entry)),
    }));
  };

  const evolveTower = () => {
    debugUpdateState((current) => {
      const dominantType = current.meatTower.dominantType;
      return {
        ...current,
        meatTower: {
          ...current.meatTower,
          level: current.meatTower.level + 1,
          exp: current.meatTower.exp + 40,
          risk: current.meatTower.risk + 6,
          attributes: {
            ...current.meatTower.attributes,
            [dominantType]: current.meatTower.attributes[dominantType] + 10,
          },
          nextMorningEffects: [
            `DEBUG: ${dominantType} 系へ1段階進化`,
            ...current.meatTower.nextMorningEffects,
          ],
        },
      };
    });
  };

  const pushTowardEnding = (type: EndingType) => {
    debugUpdateState((current) => {
      const base = {
        ...current,
        endingFlags: [...new Set([...current.endingFlags, `debug:near-${type}`])],
      };
      const tuned: GameState =
        type === "burn"
          ? {
              ...base,
              policeAttention: 90,
              meatTower: { ...base.meatTower, risk: 72, level: Math.max(base.meatTower.level, 4) },
              unlockedStoryFlags: [...new Set([...base.unlockedStoryFlags, "burn-order-blockade", "underground-market-permit"])],
              unlockedFlags: [...new Set([...base.unlockedFlags, "ending:burn", "truth:city"])],
            }
          : type === "exposure"
            ? {
                ...base,
                radioBroadcastHistory: [
                  ...base.radioBroadcastHistory,
                  ...Array.from({ length: 6 }, (_, index) => ({
                    id: `debug-interference-${index}`,
                    category: "interference" as const,
                    nightNumber: base.nightNumber,
                  })),
                ],
                unlockedStoryFlags: [...new Set([...base.unlockedStoryFlags, "fm88-emergency-log", "info-broker-fm-chart", "sanitation-warning"])],
                unlockedFlags: [...new Set([...base.unlockedFlags, "ending:expose", "truth:radio"])],
              }
            : type === "inheritance"
              ? {
                  ...base,
                  policeAttention: Math.max(base.policeAttention, 62),
                  meatTower: {
                    ...base.meatTower,
                    level: Math.max(base.meatTower.level, 5),
                    dominantType: "tentacle",
                    risk: Math.max(base.meatTower.risk, 58),
                  },
                  unlockedStoryFlags: [...new Set([...base.unlockedStoryFlags, "predecessor-oil-note", "last-added-meat"])],
                  unlockedFlags: [...new Set([...base.unlockedFlags, "ending:inherit", "truth:tower"])],
                }
              : {
                  ...base,
                  policeAttention: 38,
                  meatTower: {
                    ...base.meatTower,
                    level: Math.max(base.meatTower.level, 3),
                    risk: Math.min(base.meatTower.risk, 45),
                    dominantType: "glow",
                  },
                  customers: base.customers.map((customer) => ({
                    ...customer,
                    desireProgress: Math.min(customer.desireProgress, 55),
                    mutationStage: Math.min(customer.mutationStage, 1),
                  })),
                  unlockedStoryFlags: [...new Set([...base.unlockedStoryFlags, "tower-observation", "underground-market-permit"])],
                  unlockedFlags: [...new Set([...base.unlockedFlags, "truth:tower", "truth:market"])],
                };
      const ending = checkEndingConditions(tuned);
      return ending
        ? {
            ...tuned,
            scene: "ending",
            currentEnding: ending,
            endingFlags: [...new Set([...tuned.endingFlags, `ending:${ending.type}`])],
          }
        : tuned;
    });
  };

  return (
    <div className="debug-panel-root">
      <button className="debug-toggle" onClick={() => setIsOpen((open) => !open)}>
        Debug
      </button>
      {isReportOpen ? <PlaytestReport state={state} onClose={() => setIsReportOpen(false)} /> : null}

      {isOpen ? (
        <aside className="debug-panel" aria-label="Debug Panel">
          <div className="debug-header">
            <strong>Debug Panel</strong>
            <button onClick={() => setIsOpen(false)}>Close</button>
          </div>

          <section>
            <h2>Playtest</h2>
            <div className="debug-actions">
              <button onClick={() => setIsReportOpen(true)}>Open Playtest Report</button>
              <button onClick={() => setIsReportOpen(true)}>nightHistory: {state.nightHistory.length}</button>
              <button onClick={() => setSimulationSummary(simulateRun(state, 3))}>3夜テスト開始</button>
              <button onClick={() => setSimulationSummary(simulateRun(state, 5))}>5夜テスト開始</button>
              <button onClick={() => setSimulationSummary(simulateRun(state, 10))}>10夜シミュレーション</button>
              <button onClick={() => setSimulationSummary(simulateRun(state, 30))}>30夜シミュレーション</button>
              <button onClick={() => setSimulationSummary(simulateRun(state, 100))}>100夜シミュレーション</button>
            </div>
            {simulationSummary ? (
              <div className="simulation-result">
                <strong>{simulationSummary.nightsRequested} nights simulation</strong>
                <dl className="compact-list">
                  <div><dt>final night</dt><dd>{simulationSummary.finalNightNumber}</dd></div>
                  <div><dt>money</dt><dd>¥{simulationSummary.finalMoney.toLocaleString()}</dd></div>
                  <div><dt>reputation</dt><dd>{simulationSummary.finalReputation}</dd></div>
                  <div><dt>police</dt><dd>{simulationSummary.finalPoliceAttention}</dd></div>
                  <div><dt>tower</dt><dd>Lv.{simulationSummary.meatTowerLevel} / {simulationSummary.meatTowerDominantType}</dd></div>
                  <div><dt>blocked</dt><dd>{simulationSummary.blocked ? "yes" : "no"}</dd></div>
                  <div><dt>saveable</dt><dd>{simulationSummary.saveable ? "yes" : "no"}</dd></div>
                  <div><dt>error</dt><dd>{simulationSummary.error ?? "-"}</dd></div>
                </dl>
                <div className="debug-list">
                  {simulationSummary.customerMutationStages.map((customer) => (
                    <div className="debug-row" key={customer.customerId}>
                      <span>{customer.name}</span>
                      <small>Stage {customer.mutationStage}</small>
                    </div>
                  ))}
                </div>
                {simulationSummary.warnings.length > 0 ? (
                  <ul className="simulation-warnings">
                    {simulationSummary.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="signal-text">異常値警告はありません。</p>
                )}
              </div>
            ) : null}
          </section>

          <section>
            <h2>Core</h2>
            <div className="debug-grid">
              <NumberInput label="night" value={state.nightNumber} onChange={(nightNumber) => patchState({ nightNumber })} />
              <NumberInput label="money" value={state.money} onChange={(money) => patchState({ money })} />
              <NumberInput label="reputation" value={state.reputation} max={999} onChange={(reputation) => patchState({ reputation })} />
              <NumberInput label="police" value={state.policeAttention} max={100} onChange={(policeAttention) => patchState({ policeAttention })} />
              <NumberInput label="hp" value={state.playerStats.hp} max={state.playerStats.maxHp} onChange={(hp) => patchPlayerStats({ hp })} />
              <NumberInput label="stink" value={state.playerStats.stink} max={999} onChange={(stink) => patchPlayerStats({ stink })} />
              <NumberInput label="noise" value={state.playerStats.noise} max={999} onChange={(noise) => patchPlayerStats({ noise })} />
              <NumberInput label="alert" value={state.playerStats.alert} max={999} onChange={(alert) => patchPlayerStats({ alert })} />
            </div>
          </section>

          <section>
            <h2>Quick Actions</h2>
            <div className="debug-actions">
              <button onClick={() => addIngredient(ingredients[0], 10)}>素材を10個追加</button>
              <button onClick={evolveTower}>肉タワーを1段階進化</button>
              <button onClick={() => patchState({ policeAttention: 100 })}>警察注目度を最大にする</button>
              <button
                onClick={() =>
                  debugUpdateState((current) => ({
                    ...current,
                    customers: current.customers.map((customer) => ({
                      ...customer,
                      desireProgress: clampNumber(customer.desireProgress + 25, 0, 100),
                      mutationStage: clampNumber(customer.mutationStage + 1, 0, 9),
                    })),
                  }))
                }
              >
                全常連を1段階変異
              </button>
              <button onClick={() => patchState({ morningLogs: createMorningLogs(state) })}>翌朝ログを再生成</button>
              <button className="debug-danger" onClick={debugResetGame}>ゲーム状態をリセット</button>
            </div>
          </section>

          <section>
            <h2>Ending Shortcuts</h2>
            <div className="debug-actions">
              <button onClick={() => pushTowardEnding("inheritance")}>継承エンドへ近づける</button>
              <button onClick={() => pushTowardEnding("burn")}>焼却エンドへ近づける</button>
              <button onClick={() => pushTowardEnding("coexistence")}>共存エンドへ近づける</button>
              <button onClick={() => pushTowardEnding("exposure")}>暴露エンドへ近づける</button>
            </div>
          </section>

          <section>
            <h2>Inventory {cargoWeight}/{state.cargoCapacity}</h2>
            <div className="debug-actions">
              {ingredients.map((ingredient) => (
                <button key={ingredient.id} onClick={() => addIngredient(ingredient)}>
                  + {ingredient.name}
                </button>
              ))}
            </div>
            <div className="debug-list">
              {state.inventory.map((ingredient, index) => (
                <div className="debug-row" key={`${ingredient.id}-${index}`}>
                  <span>{ingredient.name}</span>
                  <small>w{ingredient.weight}</small>
                  <button
                    onClick={() =>
                      debugUpdateState((current) => ({
                        ...current,
                        inventory: current.inventory.filter((_, entryIndex) => entryIndex !== index),
                      }))
                    }
                  >
                    remove
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2>Cooked Kebabs</h2>
            <div className="debug-actions">
              <button
                onClick={() =>
                  debugUpdateState((current) => ({
                    ...current,
                    cookedKebabs: [...current.cookedKebabs, createDebugKebab(current.nightNumber)],
                  }))
                }
              >
                DEBUGケバブ追加
              </button>
              <button onClick={() => patchState({ cookedKebabs: [] })}>完成品を空にする</button>
            </div>
            <div className="debug-list">
              {state.cookedKebabs.map((kebab) => (
                <div className="debug-card" key={kebab.id}>
                  <input value={kebab.name} onChange={(event) => updateKebab(kebab.id, { name: event.currentTarget.value })} />
                  <div className="debug-grid">
                    {kebabStatKeys.map((key) => (
                      <NumberInput
                        key={key}
                        label={key}
                        value={kebab[key]}
                        max={9999}
                        onChange={(value) => updateKebab(kebab.id, { [key]: value })}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() =>
                      debugUpdateState((current) => ({
                        ...current,
                        cookedKebabs: current.cookedKebabs.filter((entry) => entry.id !== kebab.id),
                      }))
                    }
                  >
                    remove kebab
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2>Meat Tower</h2>
            <div className="debug-grid">
              <NumberInput label="level" value={state.meatTower.level} onChange={(level) => patchTower({ level })} />
              <NumberInput label="exp" value={state.meatTower.exp} onChange={(exp) => patchTower({ exp })} />
              <label className="debug-field">
                <span>dominant</span>
                <select
                  value={state.meatTower.dominantType}
                  onChange={(event) => patchTower({ dominantType: event.currentTarget.value as MeatTowerDominantType })}
                >
                  {towerTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </label>
              {towerKeys.map((key) => (
                <NumberInput
                  key={key}
                  label={key}
                  value={state.meatTower.attributes[key]}
                  onChange={(value) =>
                    patchTower({
                      attributes: { ...state.meatTower.attributes, [key]: value },
                    })
                  }
                />
              ))}
            </div>
          </section>

          <section>
            <h2>Customers</h2>
            <div className="debug-list">
              {state.customers.map((customer) => (
                <CustomerDebugRow key={customer.id} customer={customer} onChange={updateCustomer} />
              ))}
            </div>
          </section>
        </aside>
      ) : null}
    </div>
  );
}
