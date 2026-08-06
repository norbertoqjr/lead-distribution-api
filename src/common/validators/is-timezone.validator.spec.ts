import { isValidTimezone } from './is-timezone.validator';

describe('isValidTimezone', () => {
  it.each(['UTC', 'Asia/Manila', 'America/New_York', 'Europe/London'])(
    'accepts %s',
    (zone) => {
      expect(isValidTimezone(zone)).toBe(true);
    },
  );

  it.each(['Mars/Olympus', 'Not A Zone', '', 'asia/manila '])(
    'rejects %s',
    (zone) => {
      expect(isValidTimezone(zone)).toBe(false);
    },
  );

  it('rejects non-string input rather than throwing', () => {
    expect(isValidTimezone(undefined)).toBe(false);
    expect(isValidTimezone(42)).toBe(false);
    expect(isValidTimezone(null)).toBe(false);
  });
});
