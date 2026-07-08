import { formatSeconds } from "../../lib/format";
import type { RunRecord, WeekSummary } from "../../lib/runHistory";
import { buildRaidNightSummaries, buildWeekWingRows, formatClock, formatCountDelta, formatPercent, formatResult, formatTimeDelta, formatWing, getResultClass, getRunStart } from "./utils";
import { StatCard } from "./shared";

export function WeeksTab({
  weeks,
  expandedWeekKeys,
  filteredRuns,
  onToggleWeek,
  onDeleteWeek,
  onSelectEncounter,
}: {
  weeks: WeekSummary[];
  expandedWeekKeys: string[];
  filteredRuns: RunRecord[];
  onToggleWeek: (weekKey: string) => void;
  onDeleteWeek: (weekKey: string) => void;
  onSelectEncounter: (encounterKey: string) => void;
}) {
  const current = weeks[0];
  const previous = weeks[1];
  const wingRows = buildWeekWingRows(current, previous);
  const runsByWeek = new Map(weeks.map((week) => [week.weekKey, filteredRuns.filter((run) => run.weekKey === week.weekKey)]));
  const currentTiming = summarizeWeekTiming(runsByWeek.get(current?.weekKey ?? "") ?? []);
  const previousTiming = summarizeWeekTiming(runsByWeek.get(previous?.weekKey ?? "") ?? []);

  return (
    <>
      <div className="panel">
        <div className="section-heading">
          <h3>Run history</h3>
        </div>
        {current ? (
          <div className="history-stat-grid">
            <StatCard
              label="Total run time"
              value={formatSeconds(currentTiming.totalTime)}
              detail={formatTimeDelta(currentTiming.totalTime, previous ? previousTiming.totalTime : undefined)}
            />
            <StatCard
              label="Combat time"
              value={formatSeconds(currentTiming.combatTime)}
              detail={formatTimeDelta(currentTiming.combatTime, previous ? previousTiming.combatTime : undefined)}
            />
            <StatCard
              label="Downtime"
              value={formatSeconds(currentTiming.downtime)}
              detail={formatTimeDelta(currentTiming.downtime, previous ? previousTiming.downtime : undefined)}
            />
            <StatCard label="Wipes" value={String(current.wipes)} detail={formatCountDelta(current.wipes, previous?.wipes, "fewer")} />
          </div>
        ) : null}
      </div>

      <div className="panel">
        <div className="section-heading">
          <h3>Wing performance</h3>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Wing</th>
                <th>This week</th>
                <th>Last week</th>
                <th>Change</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {wingRows.map((row) => (
                <tr key={row.wing}>
                  <td>Wing {row.wing}</td>
                  <td>{row.current == null ? "N/A" : formatSeconds(row.current)}</td>
                  <td>{row.previous == null ? "N/A" : formatSeconds(row.previous)}</td>
                  <td>{formatTimeDelta(row.current, row.previous)}</td>
                  <td>{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="section-heading">
          <h3>Weekly summaries</h3>
        </div>
        <div className="weekly-list">
          {weeks.map((week) => (
            <WeekSummaryCard
              week={week}
              runs={runsByWeek.get(week.weekKey) ?? []}
              expanded={expandedWeekKeys.includes(week.weekKey)}
              onToggle={() => onToggleWeek(week.weekKey)}
              onDeleteWeek={() => onDeleteWeek(week.weekKey)}
              onSelectEncounter={onSelectEncounter}
              key={week.weekKey}
            />
          ))}
        </div>
      </div>
    </>
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

function WeekSummaryCard({
  week,
  runs,
  expanded,
  onToggle,
  onDeleteWeek,
  onSelectEncounter,
}: {
  week: WeekSummary;
  runs: RunRecord[];
  expanded: boolean;
  onToggle: () => void;
  onDeleteWeek: () => void;
  onSelectEncounter: (encounterKey: string) => void;
}) {
  const runsByWing = buildWeekRunGroups(runs);
  const totalDowntime = buildRaidNightSummaries(runs).reduce((sum, night) => sum + night.downtime, 0);
  const weekLabel = formatWeekSummaryLabel(week.weekKey, runs);

  return (
    <article className="week-card">
      <button type="button" className="week-card-header week-card-toggle" onClick={onToggle} aria-expanded={expanded}>
        <div>
          <span className="eyebrow">{weekLabel}</span>
          <h4>{week.runs} saved runs</h4>
        </div>
        <div className="week-card-header-actions">
          <span className="pill">{formatPercent(week.killRate)} kill rate</span>
          <span className="week-card-affordance" aria-hidden="true">
            <span>{expanded ? "Hide runs" : "View runs"}</span>
            <span className={`week-card-chevron ${expanded ? "expanded" : ""}`}>v</span>
          </span>
        </div>
      </button>

      <div className="history-bar" aria-label={`Kill rate ${formatPercent(week.killRate)}`}>
        <span style={{ width: `${Math.round((week.killRate ?? 0) * 100)}%` }} />
      </div>

      <div className="week-summary-inline muted">
        <span>Kills {week.kills}</span>
        <span>Wipes {week.wipes}</span>
        <span>Combat {formatSeconds(week.totalDuration)}</span>
        <span>Downtime {formatSeconds(totalDowntime)}</span>
      </div>

      {expanded ? (
        <>
          <div className="week-run-groups">
            {runsByWing.map((group) => (
              <section className="week-run-group" key={group.label}>
                <div className="week-run-group-header">
                  <h5>{group.label}</h5>
                  <span className="pill">{group.runs.length} run{group.runs.length === 1 ? "" : "s"}</span>
                </div>
                <div className="encounter-run-list">
                  <div className="week-run-header" aria-hidden="true">
                    <span>Saved</span>
                    <span>Encounter</span>
                    <span>Result</span>
                    <span>Time</span>
                  </div>
                  {group.runs.map((run) => (
                    <button
                      type="button"
                      className={`week-run-row ${getResultClass(run.success)}`}
                      onClick={() => onSelectEncounter(run.encounterKey)}
                      key={run.id}
                    >
                      <span>{formatClock(getRunStart(run))}</span>
                      <span>
                        {run.bossName}
                        {run.isCm ? <span className="pill">CM</span> : null}
                      </span>
                      <strong>{formatResult(run.success)}</strong>
                      <span>{formatSeconds(run.duration)}</span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
          <div className="inline-actions">
            <button type="button" className="ghost" onClick={onDeleteWeek}>
              Delete week
            </button>
          </div>
        </>
      ) : null}
    </article>
  );
}

function buildWeekRunGroups(runs: RunRecord[]): Array<{ label: string; runs: RunRecord[] }> {
  const byWing = new Map<number | null, RunRecord[]>();

  for (const run of runs) {
    byWing.set(run.wing, [...(byWing.get(run.wing) ?? []), run]);
  }

  return Array.from(byWing.entries())
    .sort(([leftWing], [rightWing]) => (leftWing ?? Number.POSITIVE_INFINITY) - (rightWing ?? Number.POSITIVE_INFINITY))
    .map(([wing, wingRuns]) => ({
      label: formatWing(wing),
      runs: [...wingRuns].sort((left, right) => getRunStart(left) - getRunStart(right) || left.bossName.localeCompare(right.bossName)),
    }));
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
