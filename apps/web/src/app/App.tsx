import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { LoadingState } from '../components/ui/LoadingState.js';
import { getCurrentUser, logout } from '../features/auth/auth.api.js';
import { LoginPage } from '../features/auth/LoginPage.js';
import { getClassroom } from '../features/classroom/classroom.api.js';
import { ClassroomPage } from '../features/classroom/ClassroomPage.js';
import { CurrentWeekPage } from '../features/current-week/CurrentWeekPage.js';
import { NewWeekPage } from '../features/duty-weeks/NewWeekPage.js';
import { WeekEditorPage } from '../features/duty-weeks/WeekEditorPage.js';
import { HistoryPage } from '../features/history/HistoryPage.js';
import { OnboardingPage } from '../features/onboarding/OnboardingPage.js';
import { SettingsPage } from '../features/settings/SettingsPage.js';
import { StudentsPage } from '../features/students/StudentsPage.js';
import { TaskTemplatesPage } from '../features/tasks/TaskTemplatesPage.js';
import { AppShell } from './AppShell.js';

export function App(): React.JSX.Element {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const user = useQuery({ queryKey: ['auth', 'me'], queryFn: getCurrentUser, retry: false });
  const classroom = useQuery({
    queryKey: ['classroom'],
    queryFn: getClassroom,
    enabled: Boolean(user.data?.hasClassroom),
    retry: false,
  });
  if (user.isPending) return <LoadingState label="Đang kiểm tra phiên đăng nhập" />;
  if (!user.data)
    return (
      <Routes>
        <Route path="*" element={<LoginPage onAuthenticated={() => void user.refetch()} />} />
      </Routes>
    );
  if (!user.data.hasClassroom || !user.data.onboardingCompleted)
    return (
      <Routes>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    );
  if (classroom.isPending) return <LoadingState label="Đang tải thông tin lớp" />;
  if (!classroom.data)
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
            classroomName={classroom.data.name}
            displayName={user.data.displayName}
            onLogout={signOut}
          />
        }
      >
        <Route index element={<CurrentWeekPage classroomName={classroom.data.name} />} />
        <Route path="weeks/new" element={<NewWeekPage />} />
        <Route path="weeks/:weekId" element={<WeekEditorPage />} />
        <Route path="class" element={<ClassroomPage />} />
        <Route path="class/students" element={<StudentsPage />} />
        <Route path="settings/tasks" element={<TaskTemplatesPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="onboarding" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
