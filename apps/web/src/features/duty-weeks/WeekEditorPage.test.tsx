import { parseDateOnly, type Classroom, type DutyWeek } from '@lop-sach/contracts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getClassroom } from '../classroom/classroom.api.js';
import { getDutyWeek } from './duty-weeks.api.js';
import { WeekEditorPage } from './WeekEditorPage.js';

vi.mock('../classroom/classroom.api.js', () => ({ getClassroom: vi.fn() }));
vi.mock('./duty-weeks.api.js', () => ({
  completeDutyWeek: vi.fn(),
  createOneOff: vi.fn(),
  deleteOccurrence: vi.fn(),
  generateDutyWeek: vi.fn(),
  getDutyWeek: vi.fn(),
  getGenerationContext: vi.fn(),
  getReplacementSuggestions: vi.fn(),
  patchDutyWeek: vi.fn(),
  patchOccurrence: vi.fn(),
  preflightDutyWeek: vi.fn(),
  publishDutyWeek: vi.fn(),
  replaceAbsences: vi.fn(),
  replaceAssignment: vi.fn(),
  setAssignmentLock: vi.fn(),
  swapAssignments: vi.fn(),
  writeAssignment: vi.fn(),
}));

const classroom: Classroom = {
  id: 'classroom-1',
  name: '10C8',
  schoolYear: '2026-2027',
  timezone: 'Asia/Ho_Chi_Minh',
  schoolDays: ['MONDAY'],
  groups: [
    { id: 'group-1', name: 'Tổ 1', order: 0, active: true },
    { id: 'group-2', name: 'Tổ 2', order: 1, active: true },
  ],
  onboarding: { currentStep: 6, completedAt: '2026-08-01T00:00:00.000Z' },
  revisionCounters: { classroom: 1, students: 1, tasks: 1 },
  version: 0,
};

const week: DutyWeek = {
  id: 'week-1',
  classroomId: classroom.id,
  weekStart: parseDateOnly('2026-08-24'),
  status: 'DRAFT',
  selectedGroupId: 'group-1',
  selectionBasis: 'MANUAL',
  selectionNote: '',
  groupSnapshot: { id: 'group-1', name: 'Tổ 1' },
  studentSnapshots: [
    {
      id: 'student-1',
      displayName: 'Nguyễn An',
      groupId: 'group-1',
      groupName: 'Tổ 1',
      active: true,
      gender: 'UNSPECIFIED',
      participationStart: null,
      participationEnd: null,
      restrictions: [],
      revision: 0,
    },
  ],
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
      locked: true,
      reasonCodes: [],
      explanation: [],
      actualStudentId: null,
      actualStudentDisplayName: null,
    },
  ],
  warnings: [{ code: 'SAME_DAY_ASSIGNMENT_RELAXED', slotId: 'slot-1', studentId: 'student-1' }],
  relaxedRules: ['SAME_DAY_ASSIGNMENT_RELAXED'],
  fairness: null,
  fairnessBaseline: [],
  completionLedger: [],
  schedulerEngineVersion: '1.0.0',
  generationRevision: 1,
  generationContextHash: null,
  generationDataRevisions: null,
  generationValidationSource: null,
  configurationRevision: 2,
  requiresGeneration: true,
  generationStale: true,
  publicationRevision: 0,
  version: 3,
  changeLog: [],
  changeLogSummary: {
    totalCompacted: 0,
    firstAt: null,
    lastAt: null,
    countsByAction: {},
    chainedDigest: null,
  },
};

beforeEach(() => {
  vi.mocked(getClassroom).mockResolvedValue(classroom);
  vi.mocked(getDutyWeek).mockResolvedValue(week);
});

describe('WeekEditorPage', () => {
  it('shows stale, same-day relaxation and locked-group safeguards', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/weeks/week-1']}>
          <Routes>
            <Route path="/weeks/:weekId" element={<WeekEditorPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(await screen.findByRole('heading', { name: 'Tuần 2026-08-24' })).toBeInTheDocument();
    expect(screen.getByText(/Dữ liệu lớp đã thay đổi/u)).toBeInTheDocument();
    expect(screen.getByText(/nhiều công việc trong cùng ngày/u)).toBeInTheDocument();
    expect(screen.getByText(/mở khóa toàn bộ phân công/u)).toBeInTheDocument();
    expect(screen.getByLabelText('Tổ trực')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Phát hành' })).toBeDisabled();
    expect(screen.queryByText(/time overlap/iu)).not.toBeInTheDocument();
  });
});
