import { parseDateOnly, type DutyWeek } from '@lop-sach/contracts';
import { describe, expect, it } from 'vitest';
import { dutyWeekText } from './export-text.js';

const week = {
  id: 'week-1',
  classroomId: 'classroom-1',
  weekStart: parseDateOnly('2026-08-24'),
  status: 'PUBLISHED',
  selectedGroupId: 'group-1',
  selectionBasis: 'MANUAL',
  selectionNote: '',
  groupSnapshot: { id: 'group-1', name: 'Tổ 1' },
  studentSnapshots: [],
  taskOccurrences: [
    {
      id: 'occurrence-1',
      date: parseDateOnly('2026-08-24'),
      source: 'RECURRING',
      taskTemplateId: 'task-1',
      taskTemplateRevision: 0,
      taskFingerprint: 'template:task-1',
      taskName: 'Lau bảng',
      workloadLevel: 1,
      eligibilityRule: 'ANY',
      requiredStudents: 1,
      enabled: true,
      order: 0,
      slots: [{ id: 'slot-1', index: 0 }],
    },
  ],
  absences: [],
  assignments: [
    {
      slotId: 'slot-1',
      occurrenceId: 'occurrence-1',
      slotIndex: 0,
      studentId: 'student-1',
      studentDisplayName: 'Nguyễn An',
      source: 'AUTO',
      locked: false,
      reasonCodes: [],
      explanation: [],
      actualStudentId: null,
      actualStudentDisplayName: null,
    },
  ],
  warnings: [
    { code: 'CONSECUTIVE_DATES_RELAXED', slotId: 'slot-1', studentId: 'student-1' },
    { code: 'CONSECUTIVE_DATES_RELAXED', slotId: 'slot-2', studentId: 'student-1' },
  ],
  relaxedRules: ['CONSECUTIVE_DATES_RELAXED'],
  fairness: null,
  fairnessBaseline: [],
  completionLedger: [],
  schedulerEngineVersion: '1.0.0',
  generationRevision: 1,
  generationContextHash: null,
  generationDataRevisions: null,
  generationValidationSource: null,
  configurationRevision: 1,
  requiresGeneration: false,
  generationStale: false,
  publicationRevision: 1,
  version: 1,
  changeLog: [],
  changeLogSummary: {
    totalCompacted: 0,
    firstAt: null,
    lastAt: null,
    countsByAction: {},
    chainedDigest: null,
  },
} satisfies DutyWeek;

describe('dutyWeekText', () => {
  it('formats a Vietnamese chat-ready schedule and explains warning counts', () => {
    const text = dutyWeekText(week, '10C8');
    expect(text).toContain('Tuần 24/08 – 24/08/2026 · Tổ 1');
    expect(text).toContain('Thứ Hai, 24/08/2026');
    expect(text).toContain('- Lau bảng: Nguyễn An');
    expect(text).toContain('Có 1 lưu ý khi phân công');
    expect(text).not.toContain('\n2026-08-24\n');
  });
});
