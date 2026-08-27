import type { DutyWeek } from '@lop-sach/contracts';
import { dutyWeekText } from './export-text.js';

const WIDTH = 1080;
const PADDING = 72;
const LINE_HEIGHT = 38;

function wrapLine(context: CanvasRenderingContext2D, line: string, maxWidth: number): string[] {
  if (line.length === 0) return [''];
  const words = line.split(' ');
  const wrapped: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current.length === 0 ? word : `${current} ${word}`;
    if (context.measureText(candidate).width <= maxWidth || current.length === 0)
      current = candidate;
    else {
      wrapped.push(current);
      current = word;
    }
  }
  if (current.length > 0) wrapped.push(current);
  return wrapped;
}

export async function dutyWeekPng(week: DutyWeek, classroomName: string): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  const sizingContext = canvas.getContext('2d');
  if (!sizingContext) throw new Error('Trình duyệt không hỗ trợ xuất PNG.');
  sizingContext.font = '500 28px system-ui, sans-serif';
  const lines = dutyWeekText(week, classroomName)
    .trimEnd()
    .split('\n')
    .flatMap((line) => wrapLine(sizingContext, line, WIDTH - PADDING * 2));
  canvas.height = Math.max(1080, PADDING * 2 + 84 + lines.length * LINE_HEIGHT);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Trình duyệt không hỗ trợ xuất PNG.');
  context.fillStyle = '#f6f8f6';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#247045';
  context.fillRect(PADDING, PADDING, 12, canvas.height - PADDING * 2);
  context.fillStyle = '#17211b';
  context.font = '700 42px system-ui, sans-serif';
  context.fillText('Lớp Sạch', PADDING + 36, PADDING + 38);
  context.font = '500 28px system-ui, sans-serif';
  let y = PADDING + 96;
  for (const line of lines) {
    context.fillStyle = line.match(/^\d{4}-\d{2}-\d{2}$/u) ? '#247045' : '#26342b';
    context.font = line.match(/^\d{4}-\d{2}-\d{2}$/u)
      ? '700 30px system-ui, sans-serif'
      : '500 28px system-ui, sans-serif';
    context.fillText(line, PADDING + 36, y);
    y += LINE_HEIGHT;
  }
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Không thể tạo tệp PNG.');
  return blob;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
