import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCurrentUser, logout } from '../features/auth/auth.api.js';
import { LoginPage } from '../features/auth/LoginPage.js';

export function App(): React.JSX.Element {
  const queryClient = useQueryClient();
  const user = useQuery({ queryKey: ['auth', 'me'], queryFn: getCurrentUser, retry: false });
  if (user.isPending) return <main className="center-state">Đang kiểm tra phiên đăng nhập</main>;
  if (!user.data) return <LoginPage onAuthenticated={() => void user.refetch()} />;
  return (
    <main className="home-shell">
      <header><div><p className="eyebrow">Lớp Sạch</p><h1>Chào {user.data.displayName}</h1></div>
        <button className="secondary-button" onClick={() => void logout().then(() => queryClient.clear())}>Đăng xuất</button>
      </header>
      <section className="empty-state"><h2>Chưa thiết lập lớp học</h2><p>Hãy bắt đầu thiết lập thông tin lớp.</p></section>
    </main>
  );
}
