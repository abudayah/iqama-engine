/**
 * Per-day comparison of one prayer, current rules vs proposed rules, used by the
 * preview summary. "Moved" means a guardrail changed the time (iqama_clamped).
 */
export interface PrayerDayView {
  iqama: string;
  iqama_clamped?: boolean;
}

export interface DayClass {
  /** The Iqama time differs between current and proposed. */
  changed: boolean;
  /** Moved by a guardrail today. */
  movedNow: boolean;
  /** Would be moved by a guardrail under the proposal. */
  movedProposed: boolean;
  /**
   * New effect of the proposal: moved under the proposal AND (not moved today, or
   * moved to a different time). An already moved day that stays exactly the same
   * is NOT newly moved.
   */
  newlyMoved: boolean;
  /** Moved today but not under the proposal. */
  noLongerMoved: boolean;
}

export function classifyDay(
  current: PrayerDayView,
  proposed: PrayerDayView,
): DayClass {
  const movedNow = current.iqama_clamped === true;
  const movedProposed = proposed.iqama_clamped === true;
  const changed = current.iqama !== proposed.iqama;
  return {
    changed,
    movedNow,
    movedProposed,
    newlyMoved: movedProposed && (!movedNow || changed),
    noLongerMoved: movedNow && !movedProposed,
  };
}

export interface MovedStats {
  changedDays: number;
  movedNow: number;
  movedProposed: number;
  newlyMoved: number;
  /** First dates (YYYY-MM-DD) with a newly moved time. */
  newlyMovedDates: string[];
  noLongerMoved: number;
}

export const emptyStats = (): MovedStats => ({
  changedDays: 0,
  movedNow: 0,
  movedProposed: 0,
  newlyMoved: 0,
  newlyMovedDates: [],
  noLongerMoved: 0,
});

export function addDay(
  stats: MovedStats,
  date: string,
  c: DayClass,
  maxDates: number,
): void {
  if (c.changed) stats.changedDays++;
  if (c.movedNow) stats.movedNow++;
  if (c.movedProposed) stats.movedProposed++;
  if (c.noLongerMoved) stats.noLongerMoved++;
  if (c.newlyMoved) {
    stats.newlyMoved++;
    if (stats.newlyMovedDates.length < maxDates) {
      stats.newlyMovedDates.push(date);
    }
  }
}
