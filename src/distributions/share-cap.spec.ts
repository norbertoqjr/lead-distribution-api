import { activeTotal, capActiveBrokers } from './share-cap';

/** Terse row builder: id, percentage, and an optional active flag. */
const row = (brokerId: number, percentage: number, isActive?: boolean) => ({
  brokerId,
  percentage,
  ...(isActive === undefined ? {} : { isActive }),
});

describe('capActiveBrokers', () => {
  it('leaves a total under 100 untouched', () => {
    const capped = capActiveBrokers([row(1, 50), row(2, 30)]);

    expect(capped.map((entry) => entry.isActive)).toEqual([true, true]);
    expect(activeTotal(capped)).toBe(80);
  });

  it('leaves a total of exactly 100 untouched', () => {
    const capped = capActiveBrokers([row(1, 60), row(2, 40)]);

    expect(capped.every((entry) => entry.isActive)).toBe(true);
    expect(activeTotal(capped)).toBe(100);
  });

  it('deactivates the lowest shares once the total would exceed 100', () => {
    const capped = capActiveBrokers([row(1, 60), row(2, 30), row(3, 25)]);

    expect(capped).toEqual([
      { brokerId: 1, percentage: 60, isActive: true },
      { brokerId: 2, percentage: 30, isActive: true },
      { brokerId: 3, percentage: 25, isActive: false },
    ]);
    expect(activeTotal(capped)).toBe(90);
  });

  it('still admits a later broker that fits in the leftover room', () => {
    // 60 + 30 leaves 10: the 25 is dropped but the 10 fills the gap exactly.
    const capped = capActiveBrokers([
      row(1, 60),
      row(2, 30),
      row(3, 25),
      row(4, 10),
    ]);

    expect(capped.map((entry) => entry.isActive)).toEqual([
      true,
      true,
      false,
      true,
    ]);
    expect(activeTotal(capped)).toBe(100);
  });

  it('keeps a smaller share that still fits after a bigger one is dropped', () => {
    // 70 + 40 overflows, but 5 fits in the remaining 30.
    const capped = capActiveBrokers([row(1, 70), row(2, 40), row(3, 5)]);

    expect(capped.map((entry) => entry.isActive)).toEqual([true, false, true]);
    expect(activeTotal(capped)).toBe(75);
  });

  it('breaks ties on the lower broker id', () => {
    const capped = capActiveBrokers([row(3, 60), row(1, 60), row(2, 60)]);

    // Only one 60 fits under the limit; broker 1 wins the tie.
    expect(capped).toEqual([
      { brokerId: 3, percentage: 60, isActive: false },
      { brokerId: 1, percentage: 60, isActive: true },
      { brokerId: 2, percentage: 60, isActive: false },
    ]);
  });

  it('ignores inactive rows and keeps their percentage', () => {
    const capped = capActiveBrokers([
      row(1, 100),
      row(2, 80, false),
      row(3, 20),
    ]);

    expect(capped).toEqual([
      { brokerId: 1, percentage: 100, isActive: true },
      { brokerId: 2, percentage: 80, isActive: false },
      { brokerId: 3, percentage: 20, isActive: false },
    ]);
  });

  it('never drops a zero-share broker', () => {
    const capped = capActiveBrokers([row(1, 100), row(2, 0)]);

    expect(capped.map((entry) => entry.isActive)).toEqual([true, true]);
  });

  it('treats a missing flag as active', () => {
    expect(capActiveBrokers([row(1, 10)])).toEqual([
      { brokerId: 1, percentage: 10, isActive: true },
    ]);
  });

  it('sums fractional shares without float drift', () => {
    // 33.33 * 3 = 99.99 in decimal, but 99.99000000000001 in binary floats.
    const capped = capActiveBrokers([
      row(1, 33.33),
      row(2, 33.33),
      row(3, 33.33),
      row(4, 0.01),
    ]);

    expect(capped.every((entry) => entry.isActive)).toBe(true);
    expect(activeTotal(capped)).toBe(100);
  });

  it('handles an empty list', () => {
    expect(capActiveBrokers([])).toEqual([]);
  });

  it('does not mutate the input rows', () => {
    const input = [row(1, 90, true), row(2, 90, true)];
    capActiveBrokers(input);

    expect(input[1].isActive).toBe(true);
  });
});
