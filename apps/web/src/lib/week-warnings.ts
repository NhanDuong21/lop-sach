import type { DutyWeek } from '@lop-sach/contracts';

export const warningLabels: Readonly<Record<string, string>> = {
  UNASSIGNED_SLOT:
    'Còn vị trí chưa phân công. Hãy giảm số học sinh cần cho công việc, tạm bỏ công việc, đổi điều kiện hoặc kiểm tra vắng mặt rồi tạo lại.',
  SAME_DAY_ASSIGNMENT_RELAXED:
    'Một học sinh được giao nhiều công việc trong cùng ngày vì không có phương án phù hợp hơn.',
  RECENT_TASK_REPEAT_RELAXED: 'Có học sinh lặp lại công việc gần đây.',
  CONSECUTIVE_DATES_RELAXED: 'Có học sinh trực ở các ngày liên tiếp.',
  WORKLOAD_BALANCE_RELAXED: 'Đã nới mức cân bằng khối lượng để đủ người.',
};

export function uniqueWarningCodes(week: DutyWeek): readonly string[] {
  return [...new Set(week.warnings.map((warning) => warning.code))];
}

export function warningCountText(week: DutyWeek): string {
  const typeCount = uniqueWarningCodes(week).length;
  return `${String(week.warnings.length)} lượt cần lưu ý thuộc ${String(typeCount)} loại cảnh báo`;
}
