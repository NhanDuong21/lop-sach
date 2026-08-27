import type { DutyWeek } from '@lop-sach/contracts';

export const warningLabels: Readonly<Record<string, string>> = {
  UNASSIGNED_SLOT:
    'Còn vị trí chưa phân công. Hãy giảm số học sinh cần cho công việc, tạm bỏ công việc, đổi điều kiện hoặc kiểm tra vắng mặt rồi tạo lại.',
  SAME_DAY_ASSIGNMENT_RELAXED: 'Một số bạn nhận thêm việc trong cùng ngày vì tuần này thiếu người.',
  RECENT_TASK_REPEAT_RELAXED: 'Một số bạn làm lại công việc đã làm gần đây.',
  CONSECUTIVE_DATES_RELAXED: 'Một số bạn trực ở các ngày liên tiếp.',
  WORKLOAD_BALANCE_RELAXED: 'Một số bạn được giao thêm việc vì tuần này thiếu người.',
};

export function uniqueWarningCodes(week: DutyWeek): readonly string[] {
  return [...new Set(week.warnings.map((warning) => warning.code))];
}

export function warningCountText(week: DutyWeek): string {
  const count = uniqueWarningCodes(week).length;
  return `${String(count)} lưu ý khi phân công`;
}
