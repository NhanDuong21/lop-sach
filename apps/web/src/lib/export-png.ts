import type { DutyWeek } from '@lop-sach/contracts';
import { formatWeekRange } from './date-labels.js';
import { warningCountText } from './week-warnings.js';

const WIDTH = 1080;
const SIDE_MARGIN = 48;
const TABLE_WIDTH = WIDTH - SIDE_MARGIN * 2;
const TABLE_HEADER_HEIGHT = 64;
const TABLE_CELL_PADDING = 18;
const TABLE_LINE_HEIGHT = 31;
const MIN_ROW_HEIGHT = 112;
const COLORS = {
  background: '#ffffff',
  border: '#176b39',
  grid: '#a9cfae',
  header: '#23854c',
  date: '#f5fbf6',
  title: '#176b39',
  text: '#17211b',
  muted: '#3f5146',
} as const;

type TableRow = {
  readonly weekday: string;
  readonly date: string;
  readonly values: readonly string[][];
};

function vietnameseDateLabel(date: string): { weekday: string; date: string } {
  const parsed = new Date(`${date}T00:00:00Z`);
  const weekday = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    timeZone: 'UTC',
  })
    .format(parsed)
    .toLocaleUpperCase('vi-VN');
  const formattedDate = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsed);
  return { weekday, date: formattedDate };
}

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

function roundRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const right = x + width;
  const bottom = y + height;
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(right - radius, y);
  context.arcTo(right, y, right, y + radius, radius);
  context.lineTo(right, bottom - radius);
  context.arcTo(right, bottom, right - radius, bottom, radius);
  context.lineTo(x + radius, bottom);
  context.arcTo(x, bottom, x, bottom - radius, radius);
  context.lineTo(x, y + radius);
  context.arcTo(x, y, x + radius, y, radius);
  context.closePath();
}

function topRoundedRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const right = x + width;
  const bottom = y + height;
  context.beginPath();
  context.moveTo(x, bottom);
  context.lineTo(x, y + radius);
  context.arcTo(x, y, x + radius, y, radius);
  context.lineTo(right - radius, y);
  context.arcTo(right, y, right, y + radius, radius);
  context.lineTo(right, bottom);
  context.closePath();
}

function drawCenteredLines(
  context: CanvasRenderingContext2D,
  lines: readonly string[],
  centerX: number,
  centerY: number,
  lineHeight: number,
): void {
  const blockHeight = lines.length * lineHeight;
  let y = centerY - blockHeight / 2;
  for (const line of lines) {
    context.fillText(line, centerX, y);
    y += lineHeight;
  }
}

function getTableData(week: DutyWeek): { columns: string[]; rows: TableRow[]; endDate?: string } {
  const occurrences = week.taskOccurrences
    .filter((item) => item.enabled)
    .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));
  const columns = [...new Set(occurrences.map((item) => item.taskName))];
  const dates = [...new Set(occurrences.map((item) => item.date))].sort();
  const rows = dates.map((date) => {
    const labels = vietnameseDateLabel(date);
    const values = columns.map((column) =>
      occurrences
        .filter((item) => item.date === date && item.taskName === column)
        .map((occurrence) =>
          occurrence.slots
            .map((slot) => {
              const assignment = week.assignments.find((item) => item.slotId === slot.id);
              return (
                assignment?.actualStudentDisplayName ??
                assignment?.studentDisplayName ??
                'Chưa phân công'
              );
            })
            .join(', '),
        ),
    );
    return { weekday: labels.weekday, date: labels.date, values };
  });
  const endDate = dates.at(-1);
  return endDate ? { columns, rows, endDate } : { columns, rows };
}

export async function dutyWeekPng(week: DutyWeek, classroomName: string): Promise<Blob> {
  const { columns, rows, endDate } = getTableData(week);
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  const sizingContext = canvas.getContext('2d');
  if (!sizingContext) throw new Error('Trình duyệt không hỗ trợ xuất PNG.');

  const columnCount = Math.max(columns.length + 1, 2);
  const dateColumnWidth = Math.min(220, TABLE_WIDTH * 0.23);
  const taskColumnWidth = (TABLE_WIDTH - dateColumnWidth) / (columnCount - 1);
  const bodyFont = '500 25px system-ui, sans-serif';
  const contentWidth = taskColumnWidth - TABLE_CELL_PADDING * 2;
  sizingContext.font = bodyFont;
  const rowHeights = rows.map((row) => {
    const taskLines = row.values.map((cell) =>
      cell.reduce((total, value) => total + wrapLine(sizingContext, value, contentWidth).length, 0),
    );
    const lineCount = Math.max(2, ...taskLines, 1);
    return Math.max(MIN_ROW_HEIGHT, lineCount * TABLE_LINE_HEIGHT + TABLE_CELL_PADDING * 2);
  });
  const titleTop = 48;
  const subtitleTop = 111;
  const tableTop = 164;
  const tableHeight = TABLE_HEADER_HEIGHT + rowHeights.reduce((sum, height) => sum + height, 0);
  const warningHeight = week.warnings.length > 0 ? 48 : 0;
  canvas.height = Math.max(720, tableTop + tableHeight + warningHeight + 48);

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Trình duyệt không hỗ trợ xuất PNG.');
  context.fillStyle = COLORS.background;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.textAlign = 'center';
  context.textBaseline = 'top';

  context.fillStyle = COLORS.title;
  context.font = '800 46px system-ui, sans-serif';
  context.fillText(
    week.status === 'DRAFT' ? 'BẢNG KIỂM TRA PHÂN CÔNG' : 'LỊCH TRỰC NHẬT',
    WIDTH / 2,
    titleTop,
  );
  context.fillStyle = COLORS.text;
  context.font = '500 25px system-ui, sans-serif';
  const range = formatWeekRange(week.weekStart, endDate);
  const revision =
    week.status === 'DRAFT'
      ? ' · BẢN NHÁP'
      : week.publicationRevision > 1
        ? ` · Lần cập nhật ${String(week.publicationRevision)}`
        : '';
  context.fillText(
    `LỚP ${classroomName}  •  Tuần ${range}  •  ${week.groupSnapshot.name}${revision}`,
    WIDTH / 2,
    subtitleTop,
  );

  const tableX = SIDE_MARGIN;
  const tableY = tableTop;
  context.lineWidth = 2;
  roundRectPath(context, tableX, tableY, TABLE_WIDTH, tableHeight, 18);
  context.fillStyle = COLORS.background;
  context.fill();
  context.strokeStyle = COLORS.border;
  context.stroke();

  topRoundedRectPath(context, tableX, tableY, TABLE_WIDTH, TABLE_HEADER_HEIGHT, 18);
  context.fillStyle = COLORS.header;
  context.fill();

  context.font = '750 21px system-ui, sans-serif';
  context.fillStyle = '#ffffff';
  const headers = ['THỨ / NGÀY', ...columns.map((column) => column.toLocaleUpperCase('vi-VN'))];
  const columnWidths = [dateColumnWidth, ...columns.map(() => taskColumnWidth)];
  let columnX = tableX;
  for (let index = 0; index < headers.length; index += 1) {
    const width = columnWidths[index] ?? taskColumnWidth;
    const headerLines = wrapLine(context, headers[index] ?? '', width - TABLE_CELL_PADDING * 2);
    drawCenteredLines(
      context,
      headerLines,
      columnX + width / 2,
      tableY + TABLE_HEADER_HEIGHT / 2,
      25,
    );
    columnX += width;
  }

  context.font = bodyFont;
  let rowY = tableY + TABLE_HEADER_HEIGHT;
  rows.forEach((row, rowIndex) => {
    const rowHeight = rowHeights[rowIndex] ?? MIN_ROW_HEIGHT;
    context.fillStyle = COLORS.date;
    context.fillRect(tableX, rowY, dateColumnWidth, rowHeight);
    const dateCenterX = tableX + dateColumnWidth / 2;
    context.fillStyle = COLORS.title;
    context.font = '750 25px system-ui, sans-serif';
    context.fillText(row.weekday, dateCenterX, rowY + rowHeight / 2 - 30);
    context.fillStyle = COLORS.text;
    context.font = '500 22px system-ui, sans-serif';
    context.fillText(row.date, dateCenterX, rowY + rowHeight / 2 + 5);

    let cellX = tableX + dateColumnWidth;
    row.values.forEach((cell) => {
      const width = taskColumnWidth;
      const lines = cell.flatMap((value) =>
        wrapLine(context, value, width - TABLE_CELL_PADDING * 2),
      );
      context.fillStyle = COLORS.text;
      context.font = bodyFont;
      drawCenteredLines(
        context,
        lines.length > 0 ? lines : ['—'],
        cellX + width / 2,
        rowY + rowHeight / 2,
        TABLE_LINE_HEIGHT,
      );
      cellX += width;
    });
    rowY += rowHeight;
  });

  context.strokeStyle = COLORS.grid;
  context.lineWidth = 1;
  let verticalX = tableX + dateColumnWidth;
  context.beginPath();
  context.moveTo(verticalX, tableY);
  context.lineTo(verticalX, tableY + tableHeight);
  for (let index = 1; index < columns.length; index += 1) {
    verticalX += taskColumnWidth;
    context.moveTo(verticalX, tableY);
    context.lineTo(verticalX, tableY + tableHeight);
  }
  context.stroke();

  context.beginPath();
  context.moveTo(tableX, tableY + TABLE_HEADER_HEIGHT);
  context.lineTo(tableX + TABLE_WIDTH, tableY + TABLE_HEADER_HEIGHT);
  rowY = tableY + TABLE_HEADER_HEIGHT;
  for (const rowHeight of rowHeights) {
    rowY += rowHeight;
    context.moveTo(tableX, rowY);
    context.lineTo(tableX + TABLE_WIDTH, rowY);
  }
  context.stroke();

  context.strokeStyle = COLORS.border;
  context.lineWidth = 2;
  roundRectPath(context, tableX, tableY, TABLE_WIDTH, tableHeight, 18);
  context.stroke();

  if (week.warnings.length > 0) {
    context.fillStyle = COLORS.muted;
    context.font = '500 19px system-ui, sans-serif';
    context.textAlign = 'left';
    context.fillText(`Lưu ý: Có ${warningCountText(week)}.`, tableX, tableY + tableHeight + 22);
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
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
