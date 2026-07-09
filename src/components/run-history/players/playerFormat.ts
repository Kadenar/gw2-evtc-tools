// Formatting utilities for player DPS comparisons and consistency metrics.
// Pure functions used across player UI components (cells, charts, expanded details).

import { average, formatDps, formatShortDate } from "../utils";

export function formatPlayerDpsDelta(current: number | null, averageValue: number | null): string {
  // Handle missing data cases.
  if (current == null && averageValue == null) return "N/A";
  if (current == null) return "No current";
  if (averageValue == null) return "No average";
  if (!Number.isFinite(current) || !Number.isFinite(averageValue)) return "N/A";

  const delta = current - averageValue;

  // If delta is tiny (< 0.5 DPS), call it "same" to reduce noise from rounding.
  if (Math.abs(delta) < 0.5) return "same";

  // If average is near-zero, show absolute delta (avoid dividing by near-zero).
  if (Math.abs(averageValue) < 0.5) return `${delta > 0 ? "+" : ""}${formatDps(delta)}`;

  // Otherwise show as percentage of average.
  return `${delta > 0 ? "+" : ""}${((delta / averageValue) * 100).toFixed(1)}%`;
}

export function getPlayerDeltaClass(current: number | null, averageValue: number | null): string {
  if (current == null || averageValue == null || !Number.isFinite(current) || !Number.isFinite(averageValue)) {
    return "text-muted";
  }

  const delta = current - averageValue;
  if (Math.abs(delta) < 0.5) return "text-muted";
  return delta > 0 ? "text-[color:var(--color-success)]" : "text-[color:var(--color-danger)]";
}

export function calculateConsistency(values: number[]): number | null {
  // Filter out invalid values (NaN, negative, zero).
  const validValues = values.filter((value) => Number.isFinite(value) && value > 0);
  // Need at least 2 pulls to measure consistency.
  if (validValues.length < 2) return null;

  const mean = average(validValues);
  if (mean == null || mean <= 0) return null;

  // Coefficient of variation: std dev / mean. Normalized by mean to account for different average DPS levels.
  // High CV = inconsistent (pulls vary a lot); low CV = consistent (pulls similar).
  const variance = validValues.reduce((sum, value) => sum + (value - mean) ** 2, 0) / validValues.length;
  return Math.sqrt(variance) / mean;
}

export function formatConsistency(value: number | null): string {
  if (value == null) return "N/A";
  return `${(value * 100).toFixed(1)}%`;
}

export function formatCompactDpsTick(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return String(Math.round(value));
}

export function formatHistoryTick(start: number, index: number, total: number): string {
  // Fallback for missing/invalid dates.
  if (!Number.isFinite(start) || start <= 0) return `Pull ${index + 1}`;

  // For dense charts (>8 pulls), skip every other tick to reduce crowding. Recharts will use the returned label.
  if (total > 8 && index % 2 === 1) return "";

  // Format as short date (e.g., "Jan 15").
  return formatShortDate(new Date(start * 1000));
}
