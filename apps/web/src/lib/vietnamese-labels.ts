import type {
  SchoolDay,
  StudentGender,
  TaskEligibilityRule,
  WorkloadLevel,
} from '@lop-sach/contracts';

export const schoolDayLabels: Record<SchoolDay, string> = {
  MONDAY: 'Thứ Hai',
  TUESDAY: 'Thứ Ba',
  WEDNESDAY: 'Thứ Tư',
  THURSDAY: 'Thứ Năm',
  FRIDAY: 'Thứ Sáu',
  SATURDAY: 'Thứ Bảy',
  SUNDAY: 'Chủ Nhật',
};
export const genderLabels: Record<StudentGender, string> = {
  MALE: 'Nam',
  FEMALE: 'Nữ',
  UNSPECIFIED: 'Chưa xác định',
};
export const eligibilityLabels: Record<TaskEligibilityRule, string> = {
  ANY: 'Tất cả học sinh',
  PREFER_MALE: 'Ưu tiên nam',
  MALE_ONLY: 'Chỉ nam',
  PREFER_FEMALE: 'Ưu tiên nữ',
  FEMALE_ONLY: 'Chỉ nữ',
};
export const workloadLabels: Record<WorkloadLevel, string> = {
  1: 'Nhẹ',
  2: 'Vừa',
  3: 'Nặng',
  4: 'Rất nặng',
};
