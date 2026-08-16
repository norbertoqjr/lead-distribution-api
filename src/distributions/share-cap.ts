/**
 * Pure share-capping logic. No database, no HTTP — the rule that active broker
 * shares can never total more than 100% is expressed once, here, so it can be
 * tested on its own and applied identically on both sides of the wire.
 */

export type ShareRow = {
  brokerId: number;
  percentage: number;
  isActive?: boolean;
};

export type CappedShareRow<T extends ShareRow> = T & { isActive: boolean };

/** Percentages are DECIMAL(5,2), so whole cents are exact where floats are not. */
function toCents(percentage: number): number {
  return Math.round((Number(percentage) || 0) * 100);
}

const LIMIT_CENTS = 100_00;

/**
 * Deactivates the brokers whose share would push the active total past 100%.
 *
 * Rows are ranked by share, highest first, and accepted until one no longer
 * fits under the limit. That broker and every smaller one below it are flipped
 * to `isActive: false` and so stop receiving leads — the cut runs from the
 * bottom of the ranking up, rather than skipping the offender and refilling
 * with whatever happens to fit in the gap.
 *
 * Rows that were already inactive are left alone, and every row keeps its
 * entered percentage so a deactivated broker can be brought back by lowering
 * someone else.
 *
 * The returned array preserves the input order; only the flags change.
 */
export function capActiveBrokers<T extends ShareRow>(
  rows: T[],
): CappedShareRow<T>[] {
  const result = rows.map((row) => ({
    ...row,
    isActive: row.isActive ?? true,
  })) as CappedShareRow<T>[];

  const ranked = result
    .filter((row) => row.isActive)
    // Ties go to the lower id, matching selectByDeficit, so the outcome is
    // deterministic rather than dependent on form ordering.
    .sort((a, b) => {
      const diff = toCents(b.percentage) - toCents(a.percentage);
      return diff !== 0 ? diff : a.brokerId - b.brokerId;
    });

  let running = 0;
  let overflowed = false;

  for (const row of ranked) {
    const cents = toCents(row.percentage);

    // Once one broker overflows, everything ranked below it goes too: the
    // smallest shares are the ones that lose their slot.
    if (overflowed || running + cents > LIMIT_CENTS) {
      overflowed = true;
      row.isActive = false;
    } else {
      running += cents;
    }
  }

  return result;
}

/** Total share of the rows left active, in percent. */
export function activeTotal(rows: ShareRow[]): number {
  const cents = rows
    .filter((row) => row.isActive ?? true)
    .reduce((sum, row) => sum + toCents(row.percentage), 0);

  return cents / 100;
}
