import {
  parseDateOnly,
  type Classroom,
  type HistoryMetric,
  type HistorySummaryItem,
} from '@lop-sach/contracts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getClassroom } from '../classroom/classroom.api.js';
import { getHistoryMetrics, getHistorySummary } from './history.api.js';
import { HistoryPage } from './HistoryPage.js';

vi.mock('../classroom/classroom.api.js', () => ({ getClassroom: vi.fn() }));
vi.mock('./history.api.js', () => ({
  getHistoryMetrics: vi.fn(),
  getHistorySummary: vi.fn(),
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

const summaries: HistorySummaryItem[] = [
  {
    id: 'week-1',
    weekStart: parseDateOnly('2026-08-24'),
    weekEnd: parseDateOnly('2026-08-29'),
    groupId: 'group-1',
    groupName: 'Tổ 1',
    status: 'COMPLETED',
    publicationRevision: 1,
    fairness: null,
    warningCount: 0,
    actualPoints: 9,
    usedAssignedPerformerFallback: false,
  },
  {
    id: 'week-2',
    weekStart: parseDateOnly('2026-08-17'),
    weekEnd: parseDateOnly('2026-08-22'),
    groupId: 'group-2',
    groupName: 'Tổ 2',
    status: 'COMPLETED',
    publicationRevision: 1,
    fairness: null,
    warningCount: 0,
    actualPoints: 4,
    usedAssignedPerformerFallback: false,
  },
];

const metrics: HistoryMetric[] = [
  {
    groupId: 'group-1',
    groupName: 'Tổ 1',
    studentId: 'student-z',
    studentDisplayName: 'Zuy',
    actualPoints: 1,
    opportunityPoints: 1,
    dutyCount: 1,
    completedWeekCount: 1,
  },
  {
    groupId: 'group-1',
    groupName: 'Tổ 1',
    studentId: 'student-a',
    studentDisplayName: 'An',
    actualPoints: 9,
    opportunityPoints: 9,
    dutyCount: 6,
    completedWeekCount: 1,
  },
  {
    groupId: 'group-2',
    groupName: 'Tổ 2',
    studentId: 'student-b',
    studentDisplayName: 'Bình',
    actualPoints: 4,
    opportunityPoints: 4,
    dutyCount: 2,
    completedWeekCount: 1,
  },
];

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.mocked(getClassroom).mockResolvedValue(classroom);
  vi.mocked(getHistorySummary).mockResolvedValue(summaries);
  vi.mocked(getHistoryMetrics).mockResolvedValue(metrics);
});

describe('HistoryPage', () => {
  it('scopes history by group and sorts members by name by default', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <HistoryPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole('heading', { name: '1 tuần đã hoàn thành' }),
    ).toBeInTheDocument();
    const table = screen.getByRole('table', { name: 'Khối lượng Tổ 1' });
    expect(
      within(table)
        .getAllByRole('row')
        .map((row) => row.textContent),
    ).toEqual(['An6 công việc9 điểm', 'Zuy1 công việc1 điểm']);
    expect(screen.queryByText('Bình')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Các tuần của Tổ 1' })).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Sắp xếp'), 'LOW_LOAD');
    expect(
      within(table)
        .getAllByRole('row')
        .map((row) => row.textContent),
    ).toEqual(['Zuy1 công việc1 điểm', 'An6 công việc9 điểm']);

    await userEvent.click(screen.getByRole('tab', { name: 'Tổ 2' }));
    expect(screen.getByRole('table', { name: 'Khối lượng Tổ 2' })).toHaveTextContent('Bình');
    expect(screen.queryByText('An')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Các tuần của Tổ 2' })).toBeInTheDocument();
  });
});
