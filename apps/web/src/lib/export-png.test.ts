import type { DutyWeek } from '@lop-sach/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { dutyWeekPng } from './export-png.js';

const week = {
  status: 'DRAFT',
  weekStart: '2026-08-24',
  groupSnapshot: { name: 'Tổ 1' },
  taskOccurrences: [
    {
      id: 'occurrence-1',
      date: '2026-08-24',
      taskName: 'Lau bảng',
      enabled: true,
      order: 0,
      slots: [{ id: 'slot-1' }],
    },
  ],
  assignments: [{ slotId: 'slot-1', studentDisplayName: 'Nguyễn An' }],
  warnings: [],
  publicationRevision: 0,
} as unknown as DutyWeek;

afterEach(() => vi.restoreAllMocks());

describe('dutyWeekPng', () => {
  it('marks a draft table clearly without changing the published title', async () => {
    const fillText = vi.fn();
    const context = {
      arcTo: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      fillRect: vi.fn(),
      fillStyle: '',
      fillText,
      font: '',
      lineTo: vi.fn(),
      lineWidth: 1,
      measureText: (text: string) => ({ width: text.length * 13 }),
      moveTo: vi.fn(),
      stroke: vi.fn(),
      strokeStyle: '',
      textAlign: 'start',
      textBaseline: 'alphabetic',
    } as unknown as CanvasRenderingContext2D;
    const canvas = {
      getContext: () => context,
      height: 0,
      toBlob: (callback: BlobCallback) => callback(new Blob(['png'], { type: 'image/png' })),
      width: 0,
    } as unknown as HTMLCanvasElement;
    vi.spyOn(document, 'createElement').mockReturnValue(canvas);

    await dutyWeekPng(week, '10C8');
    expect(fillText).toHaveBeenCalledWith('BẢNG KIỂM TRA PHÂN CÔNG', 540, 48);
    expect(fillText.mock.calls.some(([text]) => String(text).includes('BẢN NHÁP'))).toBe(true);

    fillText.mockClear();
    await dutyWeekPng({ ...week, status: 'PUBLISHED', publicationRevision: 1 }, '10C8');
    expect(fillText).toHaveBeenCalledWith('LỊCH TRỰC NHẬT', 540, 48);
    expect(fillText.mock.calls.some(([text]) => String(text).includes('BẢN NHÁP'))).toBe(false);
  });
});
