const EXPLANATIONS: Readonly<Record<string, string>> = {
  ELIGIBILITY_SATISFIED: 'Học sinh đáp ứng đầy đủ điều kiện bắt buộc của công việc.',
  LOWER_NORMALIZED_LOAD: 'Mức trực lịch sử đã chuẩn hóa đang thấp hơn hoặc bằng mức chung của tổ.',
  NO_SAME_DAY_ASSIGNMENT: 'Học sinh chưa có phân công khác trong ngày này.',
  TASK_NOT_RECENT: 'Học sinh chưa làm công việc này trong lịch sử gần đây được xét.',
  FIXED_ASSIGNMENT: 'Phân công thủ công hoặc đã khóa được giữ nguyên.',
  TEACHER_ASSIGNED:
    'Học sinh được giáo viên chỉ định vào vị trí này và lượt làm không tính điểm cân bằng.',
  LOCAL_IMPROVEMENT: 'Hoán đổi này giảm tổng mức phạt mà vẫn giữ mọi điều kiện bắt buộc.',
};

export function explainReasonCodes(reasonCodes: readonly string[]): readonly string[] {
  return reasonCodes.flatMap((code) => {
    const explanation = EXPLANATIONS[code];
    return explanation === undefined ? [] : [explanation];
  });
}
