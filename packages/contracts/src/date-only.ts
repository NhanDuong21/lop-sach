import { z } from 'zod';

export type DateOnly = string & { readonly __dateOnly: unique symbol };

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/u;

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number): number {
  const monthLengths = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return monthLengths[month - 1] ?? 0;
}

export function isDateOnly(value: string): value is DateOnly {
  const match = DATE_ONLY_PATTERN.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

export const DateOnlySchema = z
  .string()
  .refine(isDateOnly, 'Ngày phải có định dạng YYYY-MM-DD và tồn tại trong lịch.')
  .transform((value) => value as DateOnly);

export function parseDateOnly(value: string): DateOnly {
  return DateOnlySchema.parse(value);
}

function utcDate(value: DateOnly): Date {
  const [year, month, day] = value.split('-').map(Number) as [number, number, number];
  const result = new Date(0);
  result.setUTCHours(0, 0, 0, 0);
  result.setUTCFullYear(year, month - 1, day);
  return result;
}

function fromUtcDate(value: Date): DateOnly {
  const year = String(value.getUTCFullYear()).padStart(4, '0');
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  const day = String(value.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}` as DateOnly;
}

export function compareDateOnly(left: DateOnly, right: DateOnly): number {
  return left.localeCompare(right);
}

export function addDateOnlyDays(value: DateOnly, days: number): DateOnly {
  if (!Number.isInteger(days)) throw new TypeError('Số ngày phải là số nguyên.');
  const date = utcDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return fromUtcDate(date);
}

export function mondayOfWeek(value: DateOnly): DateOnly {
  const day = utcDate(value).getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  return addDateOnlyDays(value, offset);
}

export function dateOnlyWeekday(value: DateOnly): SchoolDay {
  const day = utcDate(value).getUTCDay();
  return SCHOOL_DAYS[day === 0 ? 6 : day - 1] as SchoolDay;
}

export const SCHOOL_DAYS = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const;

export type SchoolDay = (typeof SCHOOL_DAYS)[number];
export const SchoolDaySchema = z.enum(SCHOOL_DAYS);

export function weekDates(weekStart: DateOnly): readonly DateOnly[] {
  if (mondayOfWeek(weekStart) !== weekStart) throw new RangeError('weekStart phải là Thứ Hai.');
  return Array.from({ length: 7 }, (_, index) => addDateOnlyDays(weekStart, index));
}
