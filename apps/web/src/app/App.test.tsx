import type { AuthBootstrap, Classroom } from '@lop-sach/contracts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAuthBootstrap, login, logout } from '../features/auth/auth.api.js';
import { getClassroom } from '../features/classroom/classroom.api.js';
import { getDutyWeekOverview } from '../features/duty-weeks/duty-weeks.api.js';
import { useOnlineState } from '../lib/online-state.js';
import { App } from './App.js';

vi.mock('../features/auth/auth.api.js', () => ({
  getAuthBootstrap: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
}));
vi.mock('../features/classroom/classroom.api.js', () => ({ getClassroom: vi.fn() }));
vi.mock('../features/duty-weeks/duty-weeks.api.js', () => ({
  deleteDutyWeek: vi.fn(),
  getDutyWeekOverview: vi.fn(),
}));
vi.mock('../lib/offline-cache.js', () => ({
  cacheCurrentWeek: vi.fn(),
  readCachedCurrentWeek: vi.fn().mockResolvedValue(null),
}));
vi.mock('../lib/online-state.js', () => ({ useOnlineState: vi.fn() }));

const classroom: Classroom = {
  id: 'classroom-1',
  name: '10C8',
  schoolYear: '2026-2027',
  timezone: 'Asia/Ho_Chi_Minh',
  schoolDays: ['MONDAY'],
  groups: [{ id: 'group-1', name: 'Tổ 1', order: 0, active: true }],
  onboarding: { currentStep: 6, completedAt: '2026-08-29T00:00:00.000Z' },
  revisionCounters: { classroom: 1, students: 0, tasks: 1 },
  version: 1,
};
const bootstrap: AuthBootstrap = {
  user: {
    id: 'owner-1',
    displayName: 'Lớp phó lao động',
    username: 'owner',
    hasClassroom: true,
    onboardingCompleted: true,
  },
  classroom,
};

function renderApp(pathname: string): void {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[pathname]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useOnlineState).mockReturnValue(true);
  vi.mocked(getDutyWeekOverview).mockReturnValue(new Promise(() => undefined));
  vi.mocked(logout).mockResolvedValue(undefined);
});

afterEach(cleanup);

describe('App startup', () => {
  it('shows stable application chrome instead of a blank auth loader', () => {
    vi.mocked(getAuthBootstrap).mockReturnValue(new Promise(() => undefined));
    renderApp('/');

    expect(screen.getByRole('status', { name: 'Đang mở Lớp Sạch' })).toBeInTheDocument();
    expect(screen.getByText('Tuần này')).toBeInTheDocument();
    expect(screen.queryByText('Đang kiểm tra phiên đăng nhập')).not.toBeInTheDocument();
  });

  it('renders the login form immediately while a login-route session check is pending', () => {
    vi.mocked(getAuthBootstrap).mockReturnValue(new Promise(() => undefined));
    renderApp('/login');

    expect(
      screen.getByRole('heading', { name: 'Đăng nhập để phân công trực nhật' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Đang mở Lớp Sạch' })).not.toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it('renders the install landing as a public route without starting auth bootstrap', async () => {
    vi.mocked(getAuthBootstrap).mockReturnValue(new Promise(() => undefined));
    renderApp('/install');

    expect(
      await screen.findByRole('heading', { name: /Ứng dụng phân công trực nhật lớp/u }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Đăng xuất' })).not.toBeInTheDocument();
    expect(getAuthBootstrap).not.toHaveBeenCalled();
  });

  it('hydrates the classroom cache from one bootstrap request', async () => {
    vi.mocked(getAuthBootstrap).mockResolvedValue(bootstrap);
    renderApp('/');

    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: 'Đăng xuất' })).toHaveLength(2),
    );
    expect(getAuthBootstrap).toHaveBeenCalledOnce();
    expect(getClassroom).not.toHaveBeenCalled();
  });
});
