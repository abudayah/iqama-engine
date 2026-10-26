import { Dayjs } from 'dayjs';

/**
 * Asr Iqama Calculation (FR4) - Friday-anchored Seasonal Static Times
 *
 * Uses fixed seasonal times for predictability and ease of communication.
 * Crucially, the Iqama only ever *changes* on a Friday: each season begins on
 * the first Friday of its anchor month (so the congregation always starts a
 * new time on a Jumu'ah, the day most people attend).
 *
 * Schedule (times take effect ON the transition Friday):
 * - Spring/Summer : Mar 15            → first Friday of Sep   = 6:00 PM (18:00)
 * - Early Fall    : first Friday Sep  → first Friday of Oct   = 5:00 PM (17:00)
 * - Fall          : first Friday Oct  → first Friday of Nov   = 4:30 PM (16:30)
 * - Winter        : first Friday Nov  → first Friday of Jan   = 3:45 PM (15:45)
 * - Late Winter   : first Friday Jan  → Mar 14                = 4:00 PM (16:00)
 *
 * Only ~5 changes/year, each landing on a Friday. Admin overrides (P0) still
 * take precedence over this schedule.
 */

/**
 * Return the date (1–7) of the first Friday of the given month.
 * dayjs .day(): 0 = Sun … 5 = Fri … 6 = Sat.
 */
function firstFridayDate(dateInMonth: Dayjs): number {
  const firstOfMonth = dateInMonth.date(1);
  const dow = firstOfMonth.day(); // 0 Sun … 6 Sat
  // Days to add to the 1st to reach the first Friday (Fri = 5).
  const offset = (5 - dow + 7) % 7;
  return 1 + offset;
}

export function computeAsrIqama(asrAzan: Dayjs): string {
  const month = asrAzan.month() + 1; // dayjs months are 0-indexed
  const day = asrAzan.date();

  // --- Late Winter: first Friday of Jan → Mar 14 = 4:00 PM ---
  // January from the first Friday onward
  if (month === 1 && day >= firstFridayDate(asrAzan)) {
    return '16:00';
  }
  // All of February, plus March 1–14
  if (month === 2 || (month === 3 && day <= 14)) {
    return '16:00';
  }

  // --- Spring/Summer: Mar 15 → first Friday of Sep = 6:00 PM ---
  // March 15 onward
  if (month === 3 && day >= 15) {
    return '18:00';
  }
  // All of April through August
  if (month >= 4 && month <= 8) {
    return '18:00';
  }
  // September before the first Friday
  if (month === 9 && day < firstFridayDate(asrAzan)) {
    return '18:00';
  }

  // --- Early Fall: first Friday of Sep → first Friday of Oct = 5:00 PM ---
  // September from the first Friday onward
  if (month === 9 && day >= firstFridayDate(asrAzan)) {
    return '17:00';
  }
  // October before the first Friday
  if (month === 10 && day < firstFridayDate(asrAzan)) {
    return '17:00';
  }

  // --- Fall: first Friday of Oct → first Friday of Nov = 4:30 PM ---
  // October from the first Friday onward
  if (month === 10 && day >= firstFridayDate(asrAzan)) {
    return '16:30';
  }
  // November before the first Friday
  if (month === 11 && day < firstFridayDate(asrAzan)) {
    return '16:30';
  }

  // --- Winter: first Friday of Nov → first Friday of Jan = 3:45 PM ---
  // November from the first Friday onward, and all of December
  if ((month === 11 && day >= firstFridayDate(asrAzan)) || month === 12) {
    return '15:45';
  }
  // January before the first Friday
  if (month === 1 && day < firstFridayDate(asrAzan)) {
    return '15:45';
  }

  // Unreachable: every calendar date is covered above. Safe default = 6:00 PM.
  return '18:00';
}
