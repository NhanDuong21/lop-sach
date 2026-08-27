import { parseDateOnly, type DutyWeek } from '@lop-sach/contracts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cacheCurrentWeek, readCachedCurrentWeek } from '../../lib/offline-cache.js';
import { useOnlineState } from '../../lib/online-state.js';
import { deleteDutyWeek, listDutyWeeks } from '../duty-weeks/duty-weeks.api.js';
import { CurrentWeekPage } from './CurrentWeekPage.js';

vi.mock('../../lib/offline-cache.js', () => ({
  cacheCurrentWeek: vi.fn(),
  readCachedCurrentWeek: vi.fn(),
}));
vi.mock('../../lib/online-state.js', () => ({ useOnlineState: vi.fn() }));
vi.mock('../duty-weeks/duty-weeks.api.js', () => ({
  deleteDutyWeek: vi.fn(),
  listDutyWeeks: vi.fn(),
}));

function makeWeek(id: string, weekStart: string, status: DutyWeek['status']): DutyWeek {
  return {
    id,
    classroomId: 'classroom-1',
    weekStart: parseDateOnly(weekStart),
    status,
    selectedGroupId: 'group-1',
    selectionBasis: 'MANUAL',
    selectionNote: '',
    groupSnapshot: { id: 'group-1', name: 'Tổ 1' },
    studentSnapshots: [],
    taskOccurrences: [],
    absences: [],
    assignments: [],
    warnings: [],
    relaxedRules: [],
    fairness: null,
    fairnessBaseline: [],
    completionLedger: [],
    schedulerEngineVersion: '1.0.0',
    generationRevision: 0,
    generationContextHash: null,
    generationDataRevisions: null,
    generationValidationSource: null,
    configurationRevision: 0,
    requiresGeneration: status === 'DRAFT',
    generationStale: status === 'DRAFT',
    publicationRevision: status === 'DRAFT' ? 0 : 1,
    version: 0,
    changeLog: [],
    changeLogSummary: {
      totalCompacted: 0,
      firstAt: null,
      lastAt: null,
      countsByAction: {},
      chainedDigest: null,
    },
  };
}

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.mocked(useOnlineState).mockReturnValue(true);
  vi.mocked(readCachedCurrentWeek).mockResolvedValue(null);
  vi.mocked(cacheCurrentWeek).mockResolvedValue(undefined);
  vi.mocked(deleteDutyWeek).mockResolvedValue(undefined);
});

describe('CurrentWeekPage', () => {
  it('keeps a visible resume path to a saved draft from the home page', async () => {
    const published = makeWeek('published-week', '2026-08-24', 'PUBLISHED');
    const draft: DutyWeek = {
      ...makeWeek('draft-week', '2026-08-31', 'DRAFT'),
      selectedGroupId: 'group-2',
      groupSnapshot: { id: 'group-2', name: 'Tổ 2' },
    };
    vi.mocked(listDutyWeeks).mockImplementation((filters) =>
      Promise.resolve(filters?.status === 'DRAFT' ? [draft] : [published]),
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CurrentWeekPage classroomName="10C8" />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('heading', { name: 'Tuần đang chuẩn bị' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Bản nháp được lưu tự động; bạn có thể tiếp tục sau khi thoát hoặc tải lại trang.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tiếp tục chuẩn bị' })).toHaveAttribute(
      'href',
      '/weeks/draft-week',
    );
    expect(screen.getByText('Tổ trực: Tổ 2')).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Xóa bản nháp tuần 31/08 – 06/09/2026' }),
    );
    expect(deleteDutyWeek).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Xóa bản nháp?' })).toBeInTheDocument();
    expect(screen.getByText(/sẽ bị xóa vĩnh viễn/u)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Xóa bản nháp' }));
    await waitFor(() => expect(deleteDutyWeek).toHaveBeenCalledWith('draft-week', draft.version));
  });
});
