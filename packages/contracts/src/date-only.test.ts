import { describe, expect, it } from 'vitest';
import { addDateOnlyDays, dateOnlyWeekday, isDateOnly, mondayOfWeek, parseDateOnly, weekDates } from './date-only.js';

describe('date-only domain', () => {
  it('validates real Gregorian dates', () => {
    expect(isDateOnly('2024-02-29')).toBe(true);
    expect(isDateOnly('2023-02-29')).toBe(false);
    expect(isDateOnly('2026-13-01')).toBe(false);
  });
  it('adds dates without local timezone behavior', () => {
    expect(addDateOnlyDays(parseDateOnly('2024-02-28'), 2)).toBe('2024-03-01');
    expect(addDateOnlyDays(parseDateOnly('2025-12-31'), 1)).toBe('2026-01-01');
  });
  it('uses Monday as the stable week boundary', () => {
    expect(mondayOfWeek(parseDateOnly('2026-08-27'))).toBe('2026-08-24');
    expect(dateOnlyWeekday(parseDateOnly('2026-08-30'))).toBe('SUNDAY');
    expect(weekDates(parseDateOnly('2026-08-24'))).toHaveLength(7);
  });
});
