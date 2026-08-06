import { DateTime } from 'luxon';

/**
 * Pure assignment logic. No database, no HTTP — everything here is a function
 * of its arguments, which is what makes the exam's timezone and cap rules
 * testable without standing up MySQL.
 */

export type BrokerSchedule = {
  timezone: string;
  openMinute: number;
  closeMinute: number;
  /** Comma-separated ISO weekdays, e.g. "1,2,3,4,5". */
  workingDays: string;
};

export type Candidate = {
  brokerId: number;
  percentage: number;
  sentToday: number;
};

export function parseWorkingDays(value: string): number[] {
  return value
    .split(',')
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((day) => Number.isInteger(day) && day >= 1 && day <= 7);
}

/**
 * Whether `instant` falls on a working day inside the broker's opening hours,
 * evaluated in the broker's own zone. An unknown zone means "closed" rather
 * than silently falling back to the server clock, which would hand leads to a
 * broker outside its hours.
 */
export function isBrokerOpen(schedule: BrokerSchedule, instant: Date): boolean {
  const local = DateTime.fromJSDate(instant).setZone(schedule.timezone);

  if (!local.isValid) return false;

  if (!parseWorkingDays(schedule.workingDays).includes(local.weekday)) {
    return false;
  }

  const minutes = local.hour * 60 + local.minute;
  const { openMinute, closeMinute } = schedule;

  // Same open and close means a zero-length window, not "always open".
  if (openMinute === closeMinute) return false;

  // A window that wraps midnight (22:00-06:00) is two ranges, not one.
  if (closeMinute < openMinute) {
    return minutes >= openMinute || minutes < closeMinute;
  }

  return minutes >= openMinute && minutes < closeMinute;
}

/** Start of "today" for a broker, expressed as a UTC instant. */
export function startOfBrokerDay(timezone: string, instant: Date): Date {
  const local = DateTime.fromJSDate(instant).setZone(timezone);
  const zoned = local.isValid ? local : DateTime.fromJSDate(instant).toUTC();
  return zoned.startOf('day').toUTC().toJSDate();
}

export function isUnderDailyCap(dailyCap: number, sentToday: number): boolean {
  // A cap of 0 means unlimited — the column defaults to 0 and a broker with no
  // configured cap should still receive leads.
  if (dailyCap <= 0) return true;
  return sentToday < dailyCap;
}

export function computeDeficit(
  candidate: Candidate,
  totalSentToday: number,
): number {
  const targetAfterLead = ((totalSentToday + 1) * candidate.percentage) / 100;
  return targetAfterLead - candidate.sentToday;
}

/**
 * The eligible broker with the highest deficit against its target share.
 * Ties go to whoever has sent fewer leads today; if still tied, the lower id
 * wins so selection is deterministic and testable.
 */
export function selectByDeficit(
  candidates: Candidate[],
  totalSentToday: number,
): number | null {
  if (candidates.length === 0) return null;

  const ranked = candidates
    .map((candidate) => ({
      candidate,
      deficit: computeDeficit(candidate, totalSentToday),
    }))
    .sort((a, b) => {
      if (b.deficit !== a.deficit) return b.deficit - a.deficit;
      if (a.candidate.sentToday !== b.candidate.sentToday) {
        return a.candidate.sentToday - b.candidate.sentToday;
      }
      return a.candidate.brokerId - b.candidate.brokerId;
    });

  return ranked[0].candidate.brokerId;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
