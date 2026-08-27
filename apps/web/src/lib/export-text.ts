import type { DutyWeek } from '@lop-sach/contracts';
import { warningCountText } from './week-warnings.js';

function vietnameseDateLabel(date: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

export function sanitizedExportFilename(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/gu, '')
    .replace(/[^a-zA-Z0-9_-]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .toLowerCase()
    .slice(0, 80);
}

export function dutyWeekText(week: DutyWeek, classroomName: string): string {
  const lines = [
    `LỚP SẠCH — ${classroomName}`,
    `Tuần ${week.weekStart} · ${week.groupSnapshot.name} · Bản phát hành ${String(week.publicationRevision)}`,
    '',
  ];
  for (const date of [
    ...new Set(week.taskOccurrences.filter((item) => item.enabled).map((item) => item.date)),
  ].sort()) {
    lines.push(vietnameseDateLabel(date));
    for (const occurrence of week.taskOccurrences
      .filter((item) => item.enabled && item.date === date)
      .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id))) {
      const performers = occurrence.slots.map((slot) => {
        const assignment = week.assignments.find((item) => item.slotId === slot.id);
        return (
          assignment?.actualStudentDisplayName ?? assignment?.studentDisplayName ?? 'Chưa phân công'
        );
      });
      lines.push(`- ${occurrence.taskName}: ${performers.join(', ')}`);
    }
    lines.push('');
  }
  if (week.warnings.length > 0) lines.push(`Lưu ý đã duyệt: ${warningCountText(week)}`);
  return `${lines.join('\n').trim()}\n`;
}

export function downloadTextFile(text: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
