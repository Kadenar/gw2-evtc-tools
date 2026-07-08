import { useEffect, useMemo, useState } from "react";
import { getEncounterSortOrder } from "../../data/encounters";
import { formatSeconds } from "../../lib/format";
import { hasCurrentPhaseData, type RunRecord, type WeekSummary } from "../../lib/runHistory";
import type { EncounterSummary, HistoryFilterActions, HistoryFilters, RaidNightSummary } from "./types";
import {
  buildRaidNightSummaries,
  buildTimelineRows,
  buildWeekWingRows,
  formatCountDelta,
  formatDps,
  formatPercent,
  formatTimeDelta,
  formatWing,
  getRunStart,
  summarizeEncounters,
  summarizeRunSet,
} from "./utils";
import { HistoryFilterPanel, StatCard } from "./shared";

type DetailTab = "overview" | "encounters" | "downtime" | "players";

type WingWeekDetail = ReturnType<typeof buildWingWeekDetail>;
type AggregatedPlayer = {
  player: { name: string; account: string | null; professions: string[] };
  dpsValues: number[];
  encounterValues: Map<string, number[]>;
  averageTargetDps: number | null;
  encounterEntries: Array<{ encounter: string; dps: number | null }>;
};

export function WeeksTab({
  filters,
  filterActions,
  weekOptions,
  wingOptions,
  weeks,
  weekRuns,
  onSelectEncounter,
  onEnsureRunPhaseData,
}: {
  filters: HistoryFilters;
  filterActions: HistoryFilterActions;
  weekOptions: string[];
  wingOptions: number[];
  weeks: WeekSummary[];
  weekRuns: RunRecord[];
  onSelectEncounter: (encounterKey: string) => void;
  onEnsureRunPhaseData: (runs: RunRecord[]) => void;
}) {
  const [selectedWeekKey, setSelectedWeekKey] = useState<string>(weeks[0]?.weekKey ?? "none");
  const [compareWeekKey, setCompareWeekKey] = useState<string>(weeks[1]?.weekKey ?? "none");
  const [selectedWing, setSelectedWing] = useState<number | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("overview");

  const runsByWeek = useMemo(
    () => new Map(weeks.map((week) => [week.weekKey, weekRuns.filter((run) => run.weekKey === week.weekKey)])),
    [weeks, weekRuns],
  );
  const selectedWeek = selectedWeekKey === "none" ? null : weeks.find((week) => week.weekKey === selectedWeekKey) ?? null;
  const compareWeek = compareWeekKey === "none" ? null : weeks.find((week) => week.weekKey === compareWeekKey) ?? null;
  const selectedRuns = selectedWeek ? runsByWeek.get(selectedWeek.weekKey) ?? [] : [];
  const compareRuns = compareWeek ? runsByWeek.get(compareWeek.weekKey) ?? [] : [];
  const selectedTiming = summarizeWeekTiming(selectedRuns);
  const compareTiming = summarizeWeekTiming(compareRuns);
  const wingRows = useMemo(() => buildWeekWingRows(selectedRuns, compareRuns), [compareRuns, selectedRuns]);
  const selectedWingDetail = useMemo(() => buildWingWeekDetail(selectedRuns, selectedWing), [selectedRuns, selectedWing]);
  const compareWingDetail = useMemo(() => buildWingWeekDetail(compareRuns, selectedWing), [compareRuns, selectedWing]);
  const encounterRows = useMemo(
    () => buildEncounterComparisonRows(selectedWingDetail?.encounters ?? [], compareWingDetail?.encounters ?? []),
    [compareWingDetail?.encounters, selectedWingDetail?.encounters],
  );
  const downtimeRows = useMemo(
    () => buildDowntimeRows(selectedWingDetail?.raidNights ?? [], compareWingDetail?.raidNights ?? []),
    [compareWingDetail?.raidNights, selectedWingDetail?.raidNights],
  );
  const playerRows = useMemo(
    () => buildPlayerComparisonRows(selectedWingDetail?.runList ?? [], compareWingDetail?.runList ?? []),
    [compareWingDetail?.runList, selectedWingDetail?.runList],
  );

  useEffect(() => {
    if (!weeks.length) {
      setSelectedWeekKey("none");
      setCompareWeekKey("none");
      return;
    }

    setSelectedWeekKey((current) => {
      if (current !== "none" && weeks.some((week) => week.weekKey === current)) return current;
      return weeks[0].weekKey;
    });

    setCompareWeekKey((current) => {
      if (current === "none") return current;
      if (weeks.some((week) => week.weekKey === current) && current !== weeks[0].weekKey) return current;
      return weeks[1]?.weekKey ?? "none";
    });
  }, [weeks]);

  useEffect(() => {
    if (selectedWeekKey === "none" || compareWeekKey === "none") return;
    if (selectedWeekKey !== compareWeekKey) return;
    setCompareWeekKey(weeks.find((week) => week.weekKey !== selectedWeekKey)?.weekKey ?? "none");
  }, [compareWeekKey, selectedWeekKey, weeks]);

  useEffect(() => {
    if (!wingRows.length) {
      setSelectedWing(null);
      return;
    }

    setSelectedWing((current) => {
      if (current != null && wingRows.some((row) => row.wing === current)) return current;
      return wingRows.find((row) => row.current != null)?.wing ?? wingRows[0].wing;
    });
  }, [wingRows]);

  useEffect(() => {
    if (detailTab !== "players") return;
    if (!selectedWingDetail && !compareWingDetail) return;
    onEnsureRunPhaseData([...(selectedWingDetail?.runList ?? []), ...(compareWingDetail?.runList ?? [])]);
  }, [compareWeekKey, detailTab, selectedWeekKey, selectedWing]);

  return (
    <>
      <HistoryFilterPanel
        filters={filters}
        filterActions={filterActions}
        weekOptions={weekOptions}
        wingOptions={wingOptions}
        title="Weeks"
        showWeekFilter={false}
        showSortFilter={false}
      />

      <div className="panel">
        <div className="section-heading">
          <div>
            <h3>Week comparison</h3>
            <p className="muted">Choose the saved weeks to compare.</p>
          </div>
        </div>
        <div className="week-compare-controls">
          <label className="field compact">
            <span>Selected week</span>
            <select value={selectedWeekKey} onChange={(event) => setSelectedWeekKey(event.target.value)}>
              {weeks.map((week) => (
                <option value={week.weekKey} key={week.weekKey}>
                  {week.weekKey}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="week-compare-swap"
            disabled={!selectedWeek || !compareWeek}
            onClick={() => {
              if (!selectedWeek || !compareWeek) return;
              setSelectedWeekKey(compareWeek.weekKey);
              setCompareWeekKey(selectedWeek.weekKey);
            }}
            aria-label="Swap selected and comparison weeks"
          >
            <span aria-hidden="true">&lt;&gt;</span>
          </button>
          <label className="field compact">
            <span>Compare against</span>
            <select value={compareWeekKey} onChange={(event) => setCompareWeekKey(event.target.value)}>
              <option value="none">No comparison</option>
              {weeks.map((week) => (
                <option value={week.weekKey} key={week.weekKey}>
                  {week.weekKey}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="panel">
        <div className="section-heading">
          <div>
            <h3>{selectedWeek ? `Comparing ${selectedWeek.weekKey}` : "Week comparison"}</h3>
            <p className="muted">{compareWeek ? `Against ${compareWeek.weekKey}` : "Select a second week to compare against."}</p>
          </div>
        </div>
        {selectedWeek ? (
          <div className="history-stat-grid">
            <StatCard
              label="Total"
              value={formatSeconds(selectedTiming.totalTime)}
              detail={formatTimeDelta(selectedTiming.totalTime, compareWeek ? compareTiming.totalTime : undefined)}
            />
            <StatCard
              label="Combat"
              value={formatSeconds(selectedTiming.combatTime)}
              detail={formatTimeDelta(selectedTiming.combatTime, compareWeek ? compareTiming.combatTime : undefined)}
            />
            <StatCard
              label="Downtime"
              value={formatSeconds(selectedTiming.downtime)}
              detail={formatTimeDelta(selectedTiming.downtime, compareWeek ? compareTiming.downtime : undefined)}
            />
            <StatCard
              label="Wipes"
              value={String(selectedWeek.wipes)}
              detail={formatCountDelta(selectedWeek.wipes, compareWeek?.wipes, "fewer")}
            />
          </div>
        ) : (
          <p className="muted">No weeks match the current filters.</p>
        )}
      </div>

      <div className="panel">
        <div className="section-heading">
          <div>
            <h3>Wing performance</h3>
            <p className="muted">
              {selectedWeek ? `Click a wing to inspect encounter, downtime, and player detail.` : "Select a week to compare wing performance."}
            </p>
          </div>
        </div>
        {selectedWeek ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Wing</th>
                  <th>{selectedWeek.weekKey}</th>
                  <th>{compareWeek?.weekKey ?? "Compare"}</th>
                  <th>Change</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {wingRows.map((row) => (
                  <tr className={selectedWing === row.wing ? "selected-row" : ""} onClick={() => setSelectedWing(row.wing)} key={row.wing}>
                    <td>Wing {row.wing}</td>
                    <td>{row.current == null ? "N/A" : formatSeconds(row.current)}</td>
                    <td>{row.previous == null ? "N/A" : formatSeconds(row.previous)}</td>
                    <td>{row.change}</td>
                    <td>{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No week is currently selected.</p>
        )}
      </div>

      <div className="panel">
        <div className="section-heading">
          <div>
            <h3>Selected wing detail</h3>
            <p className="muted">
              {selectedWing != null
                ? `${formatWing(selectedWing)}${selectedWeek ? ` - ${selectedWeek.weekKey}` : ""}${compareWeek ? ` vs ${compareWeek.weekKey}` : ""}`
                : "Pick a wing from the comparison table above."}
            </p>
          </div>
        </div>

        {selectedWing != null && (selectedWingDetail || compareWingDetail) ? (
          <>
            <div role="tablist" className="tabs tabs-box">
              {(["overview", "encounters", "downtime", "players"] as const).map((tab) => (
                <button
                  type="button"
                  role="tab"
                  className={`tab ${detailTab === tab ? "tab-active" : ""}`}
                  aria-selected={detailTab === tab}
                  onClick={() => setDetailTab(tab)}
                  key={tab}
                >
                  {formatDetailTabLabel(tab)}
                </button>
              ))}
            </div>

            {detailTab === "overview" ? (
              <WingOverviewPanel
                selectedWeek={selectedWeek}
                compareWeek={compareWeek}
                selectedDetail={selectedWingDetail}
                compareDetail={compareWingDetail}
              />
            ) : null}

            {detailTab === "encounters" ? (
              <WingEncounterPanel
                selectedWeek={selectedWeek}
                compareWeek={compareWeek}
                rows={encounterRows}
                onSelectEncounter={onSelectEncounter}
              />
            ) : null}

            {detailTab === "downtime" ? (
              <WingDowntimePanel selectedWeek={selectedWeek} compareWeek={compareWeek} rows={downtimeRows} />
            ) : null}

            {detailTab === "players" ? (
              <WingPlayersPanel
                selectedWeek={selectedWeek}
                compareWeek={compareWeek}
                rows={playerRows}
                selectedRuns={selectedWingDetail?.runList ?? []}
                compareRuns={compareWingDetail?.runList ?? []}
              />
            ) : null}
          </>
        ) : (
          <p className="muted">No wing detail is available for the current comparison.</p>
        )}
      </div>

      <div className="panel">
        <div className="section-heading">
          <div>
            <h3>Weekly summaries</h3>
            <p className="muted">Saved week archive.</p>
          </div>
        </div>
        <div className="weekly-list week-archive-list">
          {weeks.map((week) => (
            <WeekSummaryCard
              week={week}
              runs={runsByWeek.get(week.weekKey) ?? []}
              isSelected={selectedWeek?.weekKey === week.weekKey}
              isCompare={compareWeek?.weekKey === week.weekKey}
              key={week.weekKey}
            />
          ))}
        </div>
      </div>
    </>
  );
}

function WingOverviewPanel({
  selectedWeek,
  compareWeek,
  selectedDetail,
  compareDetail,
}: {
  selectedWeek: WeekSummary | null;
  compareWeek: WeekSummary | null;
  selectedDetail: WingWeekDetail;
  compareDetail: WingWeekDetail;
}) {
  return (
    <div className="history-overview-grid">
      <article className="record-card">
        <span>{selectedWeek?.weekKey ?? "Selected week"}</span>
        <strong>{selectedDetail ? formatSeconds(selectedDetail.totalTime) : "N/A"}</strong>
        <small>{selectedDetail?.encounterLabel ?? "No selected-week data for this wing"}</small>
        <small>
          Combat {selectedDetail ? formatSeconds(selectedDetail.combatTime) : "N/A"} | Downtime {selectedDetail ? formatSeconds(selectedDetail.downtime) : "N/A"} |{" "}
          {selectedDetail ? `${selectedDetail.kills} kills / ${selectedDetail.wipes} wipes` : "No data"}
        </small>
      </article>
      <article className="record-card">
        <span>{compareWeek?.weekKey ?? "Comparison"}</span>
        <strong>{compareDetail ? formatSeconds(compareDetail.totalTime) : "N/A"}</strong>
        <small>{compareDetail?.encounterLabel ?? "No comparison selected"}</small>
        <small>
          Combat {compareDetail ? formatSeconds(compareDetail.combatTime) : "N/A"} | Downtime {compareDetail ? formatSeconds(compareDetail.downtime) : "N/A"} |{" "}
          {compareDetail ? `${compareDetail.kills} kills / ${compareDetail.wipes} wipes` : "No data"}
        </small>
      </article>
      <article className="record-card">
        <span>Time change</span>
        <strong>{formatTimeDelta(selectedDetail?.totalTime, compareDetail?.totalTime)}</strong>
        <small>{formatTimeDelta(selectedDetail?.combatTime, compareDetail?.combatTime)} combat</small>
        <small>{formatTimeDelta(selectedDetail?.downtime, compareDetail?.downtime)} downtime</small>
      </article>
      <article className="record-card">
        <span>Squad DPS</span>
        <strong>{formatDps(selectedDetail?.averageCompDps ?? null)}</strong>
        <small>{selectedWeek?.weekKey ?? "Selected"} average comp DPS</small>
        <small>{compareWeek ? `${compareWeek.weekKey}: ${formatDps(compareDetail?.averageCompDps ?? null)}` : "No comparison selected"}</small>
      </article>
    </div>
  );
}

function WingEncounterPanel({
  selectedWeek,
  compareWeek,
  rows,
  onSelectEncounter,
}: {
  selectedWeek: WeekSummary | null;
  compareWeek: WeekSummary | null;
  rows: Array<{
    encounterKey: string;
    bossName: string;
    isCm: boolean;
    current: EncounterSummary | null;
    previous: EncounterSummary | null;
    change: string;
  }>;
  onSelectEncounter: (encounterKey: string) => void;
}) {
  if (!rows.length) {
    return <p className="muted">No encounters were logged for this wing.</p>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Encounter</th>
            <th>{selectedWeek?.weekKey ?? "Selected"} kills / wipes</th>
            <th>Best</th>
            <th>Avg DPS</th>
            <th>{compareWeek?.weekKey ?? "Compare"} kills / wipes</th>
            <th>Best</th>
            <th>Avg DPS</th>
            <th>Change</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr onClick={() => onSelectEncounter(row.encounterKey)} key={row.encounterKey}>
              <td>
                {row.bossName}
                {row.isCm ? <span className="badge badge-sm badge-outline ml-1">CM</span> : null}
              </td>
              <td>{formatEncounterRecord(row.current)}</td>
              <td>{formatEncounterBest(row.current)}</td>
              <td>{formatDps(row.current?.averageCompDps ?? null)}</td>
              <td>{formatEncounterRecord(row.previous)}</td>
              <td>{formatEncounterBest(row.previous)}</td>
              <td>{formatDps(row.previous?.averageCompDps ?? null)}</td>
              <td>{row.change}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WingDowntimePanel({
  selectedWeek,
  compareWeek,
  rows,
}: {
  selectedWeek: WeekSummary | null;
  compareWeek: WeekSummary | null;
  rows: Array<{
    key: string;
    label: string;
    current: RaidNightSummary | null;
    previous: RaidNightSummary | null;
    change: string;
    note: string;
  }>;
}) {
  if (!rows.length) {
    return <p className="muted">No downtime data is available for this wing.</p>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Raid night</th>
            <th>{selectedWeek?.weekKey ?? "Selected"} total</th>
            <th>{selectedWeek?.weekKey ?? "Selected"} downtime</th>
            <th>{compareWeek?.weekKey ?? "Compare"} total</th>
            <th>{compareWeek?.weekKey ?? "Compare"} downtime</th>
            <th>Change</th>
            <th>Largest gap</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td>{row.label}</td>
              <td>{row.current ? formatSeconds(row.current.totalTime) : "N/A"}</td>
              <td>{row.current ? formatSeconds(row.current.downtime) : "N/A"}</td>
              <td>{row.previous ? formatSeconds(row.previous.totalTime) : "N/A"}</td>
              <td>{row.previous ? formatSeconds(row.previous.downtime) : "N/A"}</td>
              <td>{row.change}</td>
              <td>{row.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WingPlayersPanel({
  selectedWeek,
  compareWeek,
  rows,
  selectedRuns,
  compareRuns,
}: {
  selectedWeek: WeekSummary | null;
  compareWeek: WeekSummary | null;
  rows: Array<{
    key: string;
    name: string;
    account: string | null;
    professions: string[];
    current: PlayerAggregate | null;
    previous: PlayerAggregate | null;
  }>;
  selectedRuns: RunRecord[];
  compareRuns: RunRecord[];
}) {
  const selectedCached = selectedRuns.filter((run) => hasCurrentPhaseData(run.phaseData)).length;
  const compareCached = compareRuns.filter((run) => hasCurrentPhaseData(run.phaseData)).length;

  if (!rows.length) {
    return (
      <p className="muted">
        No cached player DPS is available yet. Loaded {selectedCached}/{selectedRuns.length} run{selectedRuns.length === 1 ? "" : "s"}
        {compareWeek ? ` for ${selectedWeek?.weekKey ?? "selected"} and ${compareCached}/${compareRuns.length} for ${compareWeek.weekKey}` : ""}.
      </p>
    );
  }

  return (
    <>
      <p className="muted">
        Loaded {selectedCached}/{selectedRuns.length} run{selectedRuns.length === 1 ? "" : "s"} for {selectedWeek?.weekKey ?? "selected"}
        {compareWeek ? ` and ${compareCached}/${compareRuns.length} for ${compareWeek.weekKey}` : ""}.
      </p>
      <div className="table-wrap">
        <table className="week-player-table">
          <thead>
            <tr>
              <th>Player</th>
              <th>{selectedWeek?.weekKey ?? "Selected"} encounters</th>
              <th>{compareWeek?.weekKey ?? "Compare"} encounters</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td>
                  <div className="week-player-cell">
                    <strong>{row.name}</strong>
                    <small>{[row.professions.join(", "), row.account].filter(Boolean).join(" | ") || "No account data"}</small>
                  </div>
                </td>
                <td>{renderPlayerEncounterBreakdown(row.current)}</td>
                <td>{renderPlayerEncounterBreakdown(row.previous)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function WeekSummaryCard({
  week,
  runs,
  isSelected,
  isCompare,
}: {
  week: WeekSummary;
  runs: RunRecord[];
  isSelected: boolean;
  isCompare: boolean;
}) {
  const timing = summarizeWeekTiming(runs);
  const weekLabel = formatWeekSummaryLabel(week.weekKey, runs);

  return (
    <article className={`week-card ${isSelected ? "selected" : ""} ${isCompare ? "compare-selected" : ""}`}>
      <div className="week-card-header">
        <div>
          <span className="eyebrow">{weekLabel}</span>
          <h4>{week.runs} saved runs</h4>
        </div>
        <div className="week-card-header-actions">
          <span className="badge badge-outline">{formatPercent(week.killRate)} kill rate</span>
          {isSelected ? <span className="week-card-selected-label">Selected</span> : null}
          {isCompare ? <span className="week-card-selected-label">Compare</span> : null}
        </div>
      </div>

      <div className="history-bar" aria-label={`Kill rate ${formatPercent(week.killRate)}`}>
        <span style={{ width: `${Math.round((week.killRate ?? 0) * 100)}%` }} />
      </div>

      <div className="week-summary-inline muted">
        <span>Total {formatSeconds(timing.totalTime)}</span>
        <span>Combat {formatSeconds(timing.combatTime)}</span>
        <span>Downtime {formatSeconds(timing.downtime)}</span>
        <span>Wipes {week.wipes}</span>
      </div>
    </article>
  );
}

function summarizeWeekTiming(runs: RunRecord[]): { combatTime: number; downtime: number; totalTime: number } {
  return buildRaidNightSummaries(runs).reduce(
    (summary, night) => ({
      combatTime: summary.combatTime + night.combatTime,
      downtime: summary.downtime + night.downtime,
      totalTime: summary.totalTime + night.totalTime,
    }),
    { combatTime: 0, downtime: 0, totalTime: 0 },
  );
}

function buildWingWeekDetail(runs: RunRecord[], wing: number | null) {
  if (wing == null) return null;

  const wingRuns = runs.filter((run) => run.wing === wing);
  if (!wingRuns.length) return null;

  const encounterStats = summarizeRunSet(wingRuns);
  const encounterLabel = summarizeEncounters(wingRuns)
    .sort(compareEncounterSummaries)
    .map((encounter) => shortEncounterName(encounter.bossName))
    .join(", ");

  return {
    wing,
    runList: wingRuns,
    encounters: summarizeEncounters(wingRuns).sort(compareEncounterSummaries),
    raidNights: buildRaidNightSummaries(wingRuns).sort((left, right) => left.start - right.start),
    encounterLabel: encounterLabel || "No encounters logged",
    ...encounterStats,
    ...summarizeWeekTiming(wingRuns),
  };
}

function buildEncounterComparisonRows(current: EncounterSummary[], previous: EncounterSummary[]) {
  const currentByKey = new Map(current.map((encounter) => [encounter.encounterKey, encounter]));
  const previousByKey = new Map(previous.map((encounter) => [encounter.encounterKey, encounter]));
  const all = Array.from(new Set([...currentByKey.keys(), ...previousByKey.keys()]))
    .map((encounterKey) => currentByKey.get(encounterKey) ?? previousByKey.get(encounterKey))
    .filter((encounter): encounter is EncounterSummary => encounter != null)
    .sort(compareEncounterSummaries);

  return all.map((encounter) => {
    const currentEncounter = currentByKey.get(encounter.encounterKey) ?? null;
    const previousEncounter = previousByKey.get(encounter.encounterKey) ?? null;
    return {
      encounterKey: encounter.encounterKey,
      bossName: encounter.bossName,
      isCm: encounter.isCm,
      current: currentEncounter,
      previous: previousEncounter,
      change: formatTimeDelta(getComparableEncounterDuration(currentEncounter), getComparableEncounterDuration(previousEncounter)),
    };
  });
}

function buildDowntimeRows(current: RaidNightSummary[], previous: RaidNightSummary[]) {
  return Array.from({ length: Math.max(current.length, previous.length) }, (_, index) => {
    const currentNight = current[index] ?? null;
    const previousNight = previous[index] ?? null;

    return {
      key: `${currentNight?.key ?? "none"}:${previousNight?.key ?? "none"}:${index}`,
      label: currentNight?.label ?? previousNight?.label ?? `Night ${index + 1}`,
      current: currentNight,
      previous: previousNight,
      change: formatTimeDelta(currentNight?.downtime, previousNight?.downtime),
      note: largestGapLabel(currentNight) ?? largestGapLabel(previousNight) ?? "No downtime segments",
    };
  }).filter((row) => row.current || row.previous);
}

type PlayerAggregate = {
  averageTargetDps: number | null;
  encounterEntries: Array<{ encounter: string; dps: number | null }>;
};

function buildPlayerComparisonRows(currentRuns: RunRecord[], previousRuns: RunRecord[]) {
  const currentByPlayer = aggregatePlayers(currentRuns);
  const previousByPlayer = aggregatePlayers(previousRuns);
  const keys = Array.from(new Set([...currentByPlayer.keys(), ...previousByPlayer.keys()]));

  return keys
    .map((key) => {
      const current = currentByPlayer.get(key) ?? null;
      const previous = previousByPlayer.get(key) ?? null;
      const player = current?.player ?? previous?.player;
      if (!player) return null;

      return {
        key,
        name: player.name,
        account: player.account,
        professions: player.professions,
        current: current ? { averageTargetDps: current.averageTargetDps, encounterEntries: current.encounterEntries } : null,
        previous: previous ? { averageTargetDps: previous.averageTargetDps, encounterEntries: previous.encounterEntries } : null,
      };
      })
    .filter((row): row is NonNullable<typeof row> => row != null)
    .sort(
      (left, right) =>
        (right.current?.averageTargetDps ?? right.previous?.averageTargetDps ?? -1)
        - (left.current?.averageTargetDps ?? left.previous?.averageTargetDps ?? -1),
    );
}

function aggregatePlayers(runs: RunRecord[]) {
  const byPlayer = new Map<string, AggregatedPlayer>();

  runs
    .slice()
    .sort((left, right) => getRunStart(left) - getRunStart(right))
    .forEach((run) => {
      if (!run.phaseData || !hasCurrentPhaseData(run.phaseData)) return;

      run.phaseData.players.forEach((player) => {
        const key = player.account ?? player.name;
        const dps = player.targetDps ?? player.squadDps;
        if (dps == null) return;

        const existing = byPlayer.get(key) ?? {
          player: { name: player.name, account: player.account, professions: [] as string[] },
          dpsValues: [],
          encounterValues: new Map<string, number[]>(),
          averageTargetDps: null,
          encounterEntries: [],
        };

        if (player.profession && !existing.player.professions.includes(player.profession)) {
          existing.player.professions.push(player.profession);
        }

        existing.dpsValues.push(dps);
        existing.encounterValues.set(shortEncounterName(run.bossName), [...(existing.encounterValues.get(shortEncounterName(run.bossName)) ?? []), dps]);
        byPlayer.set(key, existing);
      });
    });

  for (const [key, value] of byPlayer.entries()) {
    const encounterEntries = Array.from(value.encounterValues.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([encounter, values]) => ({ encounter, dps: average(values) }));

    byPlayer.set(key, {
      ...value,
      averageTargetDps: average(value.dpsValues),
      encounterEntries,
    });
  }

  return byPlayer;
}

function largestGapLabel(night: RaidNightSummary | null): string | null {
  if (!night) return null;

  const gap = buildTimelineRows(night)
    .filter((row): row is Extract<ReturnType<typeof buildTimelineRows>[number], { type: "gap" }> => row.type === "gap")
    .sort((left, right) => right.seconds - left.seconds)[0];

  if (!gap) return "No downtime segments";
  return `${gap.label} (${formatSeconds(gap.seconds)})`;
}

function compareEncounterSummaries(left: EncounterSummary, right: EncounterSummary): number {
  return getEncounterSortOrder(left.runsList[0]?.bossId ?? null, left.bossName)
    - getEncounterSortOrder(right.runsList[0]?.bossId ?? null, right.bossName)
    || left.bossName.localeCompare(right.bossName)
    || Number(left.isCm) - Number(right.isCm);
}

function average(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getComparableEncounterDuration(encounter: EncounterSummary | null): number | null {
  if (!encounter) return null;
  return encounter.bestDuration ?? (encounter.averageDuration > 0 ? encounter.averageDuration : null);
}

function formatEncounterRecord(encounter: EncounterSummary | null): string {
  if (!encounter) return "N/A";
  return `${encounter.kills} kill${encounter.kills === 1 ? "" : "s"} / ${encounter.wipes} wipe${encounter.wipes === 1 ? "" : "s"}`;
}

function formatEncounterBest(encounter: EncounterSummary | null): string {
  const duration = getComparableEncounterDuration(encounter);
  return duration == null ? "N/A" : formatSeconds(duration);
}

function renderPlayerEncounterBreakdown(player: PlayerAggregate | null) {
  if (!player?.encounterEntries.length) {
    return <span className="muted">N/A</span>;
  }

  return (
    <div className="week-player-encounters">
      {player.encounterEntries.map((entry) => (
        <div className="week-player-encounter-row" key={entry.encounter}>
          <span>{entry.encounter}</span>
          <strong>{formatDps(entry.dps)}</strong>
        </div>
      ))}
    </div>
  );
}

function shortEncounterName(name: string): string {
  return name.replace(/^Bandit Trio - /, "Trio ").replace(/\s+CM$/, "");
}

function formatDetailTabLabel(tab: DetailTab): string {
  if (tab === "overview") return "Overview";
  if (tab === "encounters") return "Encounters";
  if (tab === "downtime") return "Downtime";
  return "Players";
}

function formatWeekSummaryLabel(weekKey: string, runs: RunRecord[]): string {
  if (!runs.length) return weekKey;

  const sortedRuns = [...runs].sort((left, right) => getRunStart(left) - getRunStart(right));
  const firstDate = new Date(getRunStart(sortedRuns[0]) * 1000);
  const lastDate = new Date(getRunStart(sortedRuns[sortedRuns.length - 1]) * 1000);
  const monthFormatter = new Intl.DateTimeFormat(undefined, { month: "short" });
  const dayFormatter = new Intl.DateTimeFormat(undefined, { day: "numeric" });

  const firstMonth = monthFormatter.format(firstDate);
  const lastMonth = monthFormatter.format(lastDate);
  const firstDay = dayFormatter.format(firstDate);
  const lastDay = dayFormatter.format(lastDate);

  let dateLabel = `${firstMonth} ${firstDay}`;
  if (firstDate.toDateString() !== lastDate.toDateString()) {
    dateLabel = firstMonth === lastMonth ? `${firstMonth} ${firstDay}-${lastDay}` : `${firstMonth} ${firstDay}-${lastMonth} ${lastDay}`;
  }

  return `${weekKey} - ${dateLabel}`;
}
