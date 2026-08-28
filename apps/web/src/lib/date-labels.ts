import { addDateOnlyDays, parseDateOnly } from '@lop-sach/contracts';

function dateOnlyUtc(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

export function currentDateInVietnam(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year ?? ''}-${values.month ?? ''}-${values.day ?? ''}`;
}

export function formatDutyDate(date: string): string {
  const weekday = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'][
    dateOnlyUtc(date).getUTCDay()
  ];
  return `${weekday ?? ''}, ${date.slice(8, 10)}/${date.slice(5, 7)}`;
}

export function formatShortDate(date: string, includeYear = false): string {
  return `${date.slice(8, 10)}/${date.slice(5, 7)}${includeYear ? `/${date.slice(0, 4)}` : ''}`;
}

export function formatWeekRange(weekStart: string, weekEnd?: string): string {
  const end = weekEnd ?? addDateOnlyDays(parseDateOnly(weekStart), 6);
  return `${formatShortDate(weekStart)} – ${formatShortDate(end, true)}`;
}

export function formatPoints(value: number): string {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value);
}
