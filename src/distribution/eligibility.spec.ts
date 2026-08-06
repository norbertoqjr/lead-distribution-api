import {
  computeDeficit,
  isBrokerOpen,
  isUnderDailyCap,
  normalizeEmail,
  parseWorkingDays,
  selectByDeficit,
  startOfBrokerDay,
} from './eligibility';

const manila = {
  timezone: 'Asia/Manila',
  openMinute: 9 * 60,
  closeMinute: 18 * 60,
  workingDays: '1,2,3,4,5',
};

/** Manila is UTC+8 year round. 01:00Z on a Monday is 09:00 Monday there. */
const at = (iso: string) => new Date(iso);

describe('parseWorkingDays', () => {
  it('parses a comma-separated list', () => {
    expect(parseWorkingDays('1,2,3,4,5')).toEqual([1, 2, 3, 4, 5]);
  });

  it('ignores blanks and out-of-range values', () => {
    expect(parseWorkingDays('1, ,9,0,7')).toEqual([1, 7]);
  });
});

describe('isBrokerOpen', () => {
  it('is open at the start of the window', () => {
    // 2024-01-01 is a Monday. 01:00Z = 09:00 Manila.
    expect(isBrokerOpen(manila, at('2024-01-01T01:00:00Z'))).toBe(true);
  });

  it('is closed before opening', () => {
    expect(isBrokerOpen(manila, at('2024-01-01T00:59:00Z'))).toBe(false);
  });

  it('treats the closing minute as closed', () => {
    // 10:00Z = 18:00 Manila exactly.
    expect(isBrokerOpen(manila, at('2024-01-01T10:00:00Z'))).toBe(false);
  });

  it('is closed on a non-working day', () => {
    // 2024-01-06 is a Saturday.
    expect(isBrokerOpen(manila, at('2024-01-06T02:00:00Z'))).toBe(false);
  });

  it('uses the broker timezone, not the server clock', () => {
    // 23:00Z Sunday is already 07:00 Monday in Manila — still before opening,
    // but the weekday check must have moved to Monday.
    expect(
      isBrokerOpen(
        { ...manila, openMinute: 6 * 60 },
        at('2024-01-07T23:00:00Z'),
      ),
    ).toBe(true);
  });

  it('handles a window that wraps midnight', () => {
    const nightShift = { ...manila, openMinute: 22 * 60, closeMinute: 6 * 60 };
    // 15:00Z = 23:00 Manila Monday.
    expect(isBrokerOpen(nightShift, at('2024-01-01T15:00:00Z'))).toBe(true);
    // 06:00Z = 14:00 Manila — outside the night window.
    expect(isBrokerOpen(nightShift, at('2024-01-01T06:00:00Z'))).toBe(false);
  });

  it('treats an identical open and close as closed, not always open', () => {
    expect(
      isBrokerOpen({ ...manila, openMinute: 540, closeMinute: 540 }, at('2024-01-01T01:00:00Z')),
    ).toBe(false);
  });

  it('treats an invalid timezone as closed rather than falling back', () => {
    expect(
      isBrokerOpen({ ...manila, timezone: 'Not/AZone' }, at('2024-01-01T01:00:00Z')),
    ).toBe(false);
  });
});

describe('startOfBrokerDay', () => {
  it('resets at midnight in the broker timezone', () => {
    // 2024-01-01T15:00Z is 23:00 Manila on the 1st, so the day started at
    // 2023-12-31T16:00Z (00:00 Manila on the 1st).
    expect(startOfBrokerDay('Asia/Manila', at('2024-01-01T15:00:00Z'))).toEqual(
      at('2023-12-31T16:00:00Z'),
    );
  });
});

describe('isUnderDailyCap', () => {
  it('allows leads below the cap', () => {
    expect(isUnderDailyCap(10, 9)).toBe(true);
  });

  it('blocks once the cap is reached', () => {
    expect(isUnderDailyCap(10, 10)).toBe(false);
  });

  it('treats zero as unlimited', () => {
    expect(isUnderDailyCap(0, 500)).toBe(true);
  });
});

describe('computeDeficit', () => {
  it('matches the worked example from the specification', () => {
    const total = 10;
    expect(
      computeDeficit({ brokerId: 1, percentage: 50, sentToday: 4 }, total),
    ).toBeCloseTo(1.5);
    expect(
      computeDeficit({ brokerId: 2, percentage: 30, sentToday: 3 }, total),
    ).toBeCloseTo(0.3);
    expect(
      computeDeficit({ brokerId: 3, percentage: 20, sentToday: 3 }, total),
    ).toBeCloseTo(-0.8);
  });
});

describe('selectByDeficit', () => {
  it('picks the highest deficit', () => {
    const candidates = [
      { brokerId: 1, percentage: 50, sentToday: 4 },
      { brokerId: 2, percentage: 30, sentToday: 3 },
      { brokerId: 3, percentage: 20, sentToday: 3 },
    ];
    expect(selectByDeficit(candidates, 10)).toBe(1);
  });

  it('still assigns when every broker is above target', () => {
    // All deficits negative; someone must still receive the lead.
    const candidates = [
      { brokerId: 1, percentage: 10, sentToday: 8 },
      { brokerId: 2, percentage: 10, sentToday: 5 },
    ];
    expect(selectByDeficit(candidates, 10)).toBe(2);
  });

  it('breaks ties on fewer leads sent today', () => {
    const candidates = [
      { brokerId: 1, percentage: 50, sentToday: 3 },
      { brokerId: 2, percentage: 50, sentToday: 1 },
    ];
    expect(selectByDeficit(candidates, 4)).toBe(2);
  });

  it('returns null when nobody is eligible', () => {
    expect(selectByDeficit([], 10)).toBeNull();
  });

  it('spreads leads towards the configured split over many rounds', () => {
    const state = [
      { brokerId: 1, percentage: 50, sentToday: 0 },
      { brokerId: 2, percentage: 30, sentToday: 0 },
      { brokerId: 3, percentage: 20, sentToday: 0 },
    ];

    for (let total = 0; total < 100; total += 1) {
      const winner = selectByDeficit(state, total);
      const broker = state.find((entry) => entry.brokerId === winner);
      if (broker) broker.sentToday += 1;
    }

    // Exactly the configured split after 100 leads.
    expect(state.map((entry) => entry.sentToday)).toEqual([50, 30, 20]);
  });
});

describe('normalizeEmail', () => {
  it('trims and lowercases so duplicates match', () => {
    expect(normalizeEmail('  Foo@Example.COM ')).toBe('foo@example.com');
  });
});
