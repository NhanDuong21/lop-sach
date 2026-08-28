import type { Classroom, Student, TaskTemplate } from '@lop-sach/contracts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listStudents } from '../students/students.api.js';
import { listTasks } from '../tasks/tasks.api.js';
import { getClassroom } from './classroom.api.js';
import { ClassroomPage } from './ClassroomPage.js';

vi.mock('./classroom.api.js', () => ({
  addGroup: vi.fn(),
  getClassroom: vi.fn(),
  patchClassroom: vi.fn(),
  patchGroup: vi.fn(),
  setGroupActive: vi.fn(),
}));
vi.mock('../students/students.api.js', () => ({ listStudents: vi.fn() }));
vi.mock('../tasks/tasks.api.js', () => ({ listTasks: vi.fn() }));

const classroom: Classroom = {
  id: 'classroom-1',
  name: '10C8',
  schoolYear: '2026-2027',
  timezone: 'Asia/Ho_Chi_Minh',
  schoolDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
  groups: [
    { id: 'group-1', name: 'Tổ 1', order: 0, active: true },
    { id: 'group-2', name: 'Tổ 2', order: 1, active: true },
    { id: 'group-3', name: 'Tổ cũ', order: 2, active: false },
  ],
  onboarding: { currentStep: 6, completedAt: '2026-08-01T00:00:00.000Z' },
  revisionCounters: { classroom: 1, students: 1, tasks: 1 },
  version: 0,
};

const students: Student[] = [
  {
    id: 'student-1',
    classroomId: classroom.id,
    displayName: 'Nguyễn Minh An',
    groupId: 'group-1',
    active: true,
    gender: 'UNSPECIFIED',
    participationStart: null,
    participationEnd: null,
    restrictions: [],
    version: 0,
  },
  {
    id: 'student-2',
    classroomId: classroom.id,
    displayName: 'Trần Bảo Chi',
    groupId: 'group-1',
    active: true,
    gender: 'UNSPECIFIED',
    participationStart: null,
    participationEnd: null,
    restrictions: [],
    version: 0,
  },
  {
    id: 'student-3',
    classroomId: classroom.id,
    displayName: 'Lê Hoàng Dũng',
    groupId: 'group-2',
    active: true,
    gender: 'UNSPECIFIED',
    participationStart: null,
    participationEnd: null,
    restrictions: [],
    version: 0,
  },
  {
    id: 'student-4',
    classroomId: classroom.id,
    displayName: 'Phạm Thu Hà',
    groupId: 'group-2',
    active: false,
    gender: 'UNSPECIFIED',
    participationStart: null,
    participationEnd: null,
    restrictions: [],
    version: 0,
  },
];

const tasks: TaskTemplate[] = [
  {
    id: 'task-1',
    classroomId: classroom.id,
    name: 'Lau bảng',
    active: true,
    order: 0,
    schoolDays: classroom.schoolDays,
    requiredStudents: 1,
    workloadLevel: 1,
    eligibilityRule: 'ANY',
    version: 0,
  },
  {
    id: 'task-2',
    classroomId: classroom.id,
    name: 'Quét lớp',
    active: true,
    order: 1,
    schoolDays: classroom.schoolDays,
    requiredStudents: 2,
    workloadLevel: 2,
    eligibilityRule: 'ANY',
    version: 0,
  },
  {
    id: 'task-3',
    classroomId: classroom.id,
    name: 'Công việc cũ',
    active: false,
    order: 2,
    schoolDays: ['MONDAY'],
    requiredStudents: 1,
    workloadLevel: 2,
    eligibilityRule: 'ANY',
    version: 0,
  },
];

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.mocked(getClassroom).mockResolvedValue(classroom);
  vi.mocked(listStudents).mockResolvedValue(students);
  vi.mocked(listTasks).mockResolvedValue(tasks);
});

describe('ClassroomPage', () => {
  it('builds the class hub from live classroom, student and task data', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ClassroomPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('heading', { name: '10C8' })).toBeInTheDocument();
    const hero = container.querySelector('.class-hub-hero');
    expect(hero).not.toBeNull();
    expect(within(hero as HTMLElement).getByText('3')).toBeInTheDocument();
    expect(within(hero as HTMLElement).getAllByText('2')).toHaveLength(2);
    expect(within(hero as HTMLElement).getByText('2026–2027')).toBeInTheDocument();
    expect(hero?.querySelector('img')).toHaveAttribute('src', '/images/meoconcamchoi.png');
    expect(screen.getByText('Nguyễn Minh An')).toBeInTheDocument();
    expect(screen.getByText('Lau bảng')).toBeInTheDocument();
    expect(screen.queryByText('Công việc cũ')).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Xem tất cả' })).toHaveLength(2);

    await userEvent.click(screen.getByRole('button', { name: 'Chỉnh sửa' }));
    expect(screen.getByLabelText('Tên lớp')).toHaveValue('10C8');
    expect(screen.getByLabelText('Năm học')).toHaveValue('2026-2027');
  });
});
