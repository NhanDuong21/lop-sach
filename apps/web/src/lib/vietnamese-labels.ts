import type { SchoolDay, StudentGender, TaskEligibilityRule } from '@lop-sach/contracts';

export const schoolDayLabels: Record<SchoolDay, string> = {
  MONDAY: 'Thứ Hai', TUESDAY: 'Thứ Ba', WEDNESDAY: 'Thứ Tư', THURSDAY: 'Thứ Năm', FRIDAY: 'Thứ Sáu', SATURDAY: 'Thứ Bảy', SUNDAY: 'Chủ Nhật',
};
export const genderLabels: Record<StudentGender, string> = { MALE: 'Nam', FEMALE: 'Nữ', UNSPECIFIED: 'Không chỉ định' };
export const eligibilityLabels: Record<TaskEligibilityRule, string> = {
  ANY: 'Mọi học sinh', PREFER_MALE: 'Ưu tiên nam', MALE_ONLY: 'Chỉ nam', PREFER_FEMALE: 'Ưu tiên nữ', FEMALE_ONLY: 'Chỉ nữ',
};
