import { parseDateOnly, type Classroom, type DutyWeek } from '@lop-sach/contracts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as dateLabels from '../../lib/date-labels.js';
import { getClassroom } from '../classroom/classroom.api.js';
import { createDutyWeek, deleteDutyWeek, listDutyWeeks } from './duty-weeks.api.js';
import { NewWeekPage } from './NewWeekPage.js';

vi.mock('../classroom/classroom.api.js', () => ({ getClassroom: vi.fn() }));
vi.mock('../../lib/date-labels.js', async (importOriginal) => ({
  ...(await importOriginal<typeof dateLabels>()),
  currentDateInVietnam: () => '2026-08-28',
}));
vi.mock('./duty-weeks.api.js', () => ({
  createDutyWeek: vi.fn(),
  deleteDutyWeek: vi.fn(),
  listDutyWeeks: vi.fn(),
}));

const classroom: Classroom = {
  id: 'classroom-1',
  name: '10C8',
  schoolYear: '2026-2027',
  timezone: 'Asia/Ho_Chi_Minh',
  schoolDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
  groups: [
    { id: 'group-1', name: 'Tổ 1', order: 0, active: true },
    { id: 'group-2', name: 'Tổ 2', order: 1, active: true },
  ],
  onboarding: { currentStep: 6, completedAt: '2026-08-01T00:00:00.000Z' },
  revisionCounters: { classroom: 1, students: 1, tasks: 1 },
  version: 0,
};

const draft = {
  id: 'draft-week',
  classroomId: classroom.id,
  weekStart: parseDateOnly('2026-08-31'),
  status: 'DRAFT',
  groupSnapshot: { id: 'group-2', name: 'Tổ 2' },
} as DutyWeek;

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.mocked(getClassroom).mockResolvedValue(classroom);
  vi.mocked(listDutyWeeks).mockResolvedValue([draft]);
  vi.mocked(deleteDutyWeek).mockResolvedValue(undefined);
});

describe('NewWeekPage', () => {
  it('offers to resume an existing draft instead of attempting a duplicate create', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/weeks/new?weekStart=2026-08-31']}>
          <NewWeekPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Tuần 31/08 – 05/09/2026 đã có lịch.')).toBeInTheDocument();
    expect(screen.getByText('Tổ trực: Tổ 2 · Trạng thái: Bản nháp')).toBeInTheDocument();
    expect(screen.queryByText(/Tuần này đã được tạo/u)).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Tuần hiện tại 24\/08 – 29\/08\/2026/u }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Tuần kế tiếp 31\/08 – 05\/09\/2026/u }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('link', { name: 'Tiếp tục chuẩn bị' })).toHaveAttribute(
      'href',
      '/weeks/draft-week',
    );
    expect(screen.queryByRole('button', { name: 'Bắt đầu chuẩn bị tuần' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Xóa bản nháp' })).toBeInTheDocument();
    expect(createDutyWeek).not.toHaveBeenCalled();
  });
});
