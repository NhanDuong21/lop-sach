import type { AuthLoginResult } from '@lop-sach/contracts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { lazy, Suspense, useEffect, type PropsWithChildren } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { OfflineBanner } from '../components/layout/OfflineBanner.js';
import { LoadingState } from '../components/ui/LoadingState.js';
import { getAuthBootstrap, logout } from '../features/auth/auth.api.js';
import { LoginPage } from '../features/auth/LoginPage.js';
import { getClassroom } from '../features/classroom/classroom.api.js';
import { useOnlineState } from '../lib/online-state.js';
import { AppShell } from './AppShell.js';
import { AppStartupShell } from './AppStartupShell.js';

const CurrentWeekPage = lazy(async () => ({
  default: (await import('../features/current-week/CurrentWeekPage.js')).CurrentWeekPage,
}));
const NewWeekPage = lazy(async () => ({
  default: (await import('../features/duty-weeks/NewWeekPage.js')).NewWeekPage,
}));
const WeekEditorPage = lazy(async () => ({
  default: (await import('../features/duty-weeks/WeekEditorPage.js')).WeekEditorPage,
}));
const ClassroomPage = lazy(async () => ({
  default: (await import('../features/classroom/ClassroomPage.js')).ClassroomPage,
}));
const StudentsPage = lazy(async () => ({
  default: (await import('../features/students/StudentsPage.js')).StudentsPage,
}));
const TaskTemplatesPage = lazy(async () => ({
  default: (await import('../features/tasks/TaskTemplatesPage.js')).TaskTemplatesPage,
}));
const HistoryPage = lazy(async () => ({
  default: (await import('../features/history/HistoryPage.js')).HistoryPage,
}));
const HistoryDetailPage = lazy(async () => ({
  default: (await import('../features/history/HistoryDetailPage.js')).HistoryDetailPage,
}));
const OnboardingPage = lazy(async () => ({
  default: (await import('../features/onboarding/OnboardingPage.js')).OnboardingPage,
}));
const SettingsPage = lazy(async () => ({
  default: (await import('../features/settings/SettingsPage.js')).SettingsPage,
}));
const InstallLandingPage = lazy(async () => ({
  default: (await import('../features/pwa-install/InstallLandingPage.js')).InstallLandingPage,
}));

function preloadRoute(pathname: string): void {
  if (pathname === '/install') void import('../features/pwa-install/InstallLandingPage.js');
  else if (pathname === '/') void import('../features/current-week/CurrentWeekPage.js');
  else if (pathname === '/weeks/new') void import('../features/duty-weeks/NewWeekPage.js');
  else if (pathname.startsWith('/weeks/')) void import('../features/duty-weeks/WeekEditorPage.js');
  else if (pathname === '/class/students') void import('../features/students/StudentsPage.js');
  else if (pathname === '/class/tasks' || pathname === '/settings/tasks')
    void import('../features/tasks/TaskTemplatesPage.js');
  else if (pathname === '/class') void import('../features/classroom/ClassroomPage.js');
  else if (pathname === '/history') void import('../features/history/HistoryPage.js');
  else if (pathname.startsWith('/history/'))
    void import('../features/history/HistoryDetailPage.js');
  else if (pathname === '/onboarding') void import('../features/onboarding/OnboardingPage.js');
  else if (pathname === '/settings') void import('../features/settings/SettingsPage.js');
}

function RoutePending({
  children,
  label = 'Đang mở trang',
}: PropsWithChildren<{ readonly label?: string }>): React.JSX.Element {
  return <Suspense fallback={<LoadingState label={label} />}>{children}</Suspense>;
}

function SessionApp(): React.JSX.Element {
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const online = useOnlineState();
  const bootstrap = useQuery({
    queryKey: ['auth', 'bootstrap'],
    queryFn: async () => {
      const data = await getAuthBootstrap();
      if (data.classroom) queryClient.setQueryData(['classroom'], data.classroom);
      return data;
    },
    retry: false,
    enabled: online,
  });
  const classroomQuery = useQuery({
    queryKey: ['classroom'],
    queryFn: getClassroom,
    enabled: online && Boolean(bootstrap.data?.user.hasClassroom),
    retry: false,
    staleTime: Infinity,
  });
  const acceptAuthenticated = (result: AuthLoginResult): void => {
    const { classroom, ...user } = result;
    queryClient.setQueryData(['auth', 'bootstrap'], { user, classroom });
    if (classroom) queryClient.setQueryData(['classroom'], classroom);
    else queryClient.removeQueries({ queryKey: ['classroom'], exact: true });
  };
  if (!online)
    return (
      <main className="offline-shell">
        <OfflineBanner />
        <RoutePending label="Đang mở lịch tuần đã lưu">
          <CurrentWeekPage classroomName="" />
        </RoutePending>
      </main>
    );
  if (bootstrap.isPending) {
    if (location.pathname === '/login') return <LoginPage onAuthenticated={acceptAuthenticated} />;
    return <AppStartupShell />;
  }
  if (!bootstrap.data)
    return (
      <Routes>
        <Route path="*" element={<LoginPage onAuthenticated={acceptAuthenticated} />} />
      </Routes>
    );
  const { user } = bootstrap.data;
  const classroom = classroomQuery.data ?? bootstrap.data.classroom;
  if (!user.hasClassroom || !user.onboardingCompleted)
    return (
      <Routes>
        <Route
          path="/onboarding"
          element={
            <RoutePending label="Đang mở thiết lập lớp">
              <OnboardingPage />
            </RoutePending>
          }
        />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    );
  if (!classroom)
    return <main className="center-state">Không tải được lớp học. Hãy tải lại trang.</main>;
  const signOut = (): void => {
    void logout().finally(() => {
      queryClient.clear();
      void navigate('/login');
    });
  };
  return (
    <Routes>
      <Route
        element={
          <AppShell
            classroomName={classroom.name}
            displayName={user.displayName}
            onLogout={signOut}
          />
        }
      >
        <Route
          index
          element={
            <RoutePending label="Đang mở tuần này">
              <CurrentWeekPage classroomName={classroom.name} />
            </RoutePending>
          }
        />
        <Route
          path="weeks/new"
          element={
            <RoutePending label="Đang mở bước chuẩn bị tuần">
              <NewWeekPage />
            </RoutePending>
          }
        />
        <Route
          path="weeks/:weekId"
          element={
            <RoutePending label="Đang mở lịch trực">
              <WeekEditorPage />
            </RoutePending>
          }
        />
        <Route
          path="class"
          element={
            <RoutePending label="Đang mở lớp học">
              <ClassroomPage />
            </RoutePending>
          }
        />
        <Route
          path="class/students"
          element={
            <RoutePending label="Đang mở danh sách học sinh">
              <StudentsPage />
            </RoutePending>
          }
        />
        <Route
          path="class/tasks"
          element={
            <RoutePending label="Đang mở danh sách công việc">
              <TaskTemplatesPage />
            </RoutePending>
          }
        />
        <Route path="settings/tasks" element={<Navigate to="/class/tasks" replace />} />
        <Route
          path="history"
          element={
            <RoutePending label="Đang mở lịch sử">
              <HistoryPage />
            </RoutePending>
          }
        />
        <Route
          path="history/:weekId"
          element={
            <RoutePending label="Đang mở chi tiết lịch sử">
              <HistoryDetailPage />
            </RoutePending>
          }
        />
        <Route
          path="settings"
          element={
            <RoutePending label="Đang mở cài đặt">
              <SettingsPage />
            </RoutePending>
          }
        />
        <Route path="onboarding" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export function App(): React.JSX.Element {
  const location = useLocation();
  useEffect(() => preloadRoute(location.pathname), [location.pathname]);
  if (location.pathname === '/install')
    return (
      <Routes>
        <Route
          path="/install"
          element={
            <RoutePending label="Đang mở trang cài đặt">
              <InstallLandingPage />
            </RoutePending>
          }
        />
      </Routes>
    );
  return <SessionApp />;
}
