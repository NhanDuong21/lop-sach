import { LogOut } from 'lucide-react';
import { Outlet, useLocation } from 'react-router-dom';
import { BottomNavigation } from '../components/layout/BottomNavigation.js';
import { OfflineBanner } from '../components/layout/OfflineBanner.js';
import { SidebarNavigation } from '../components/layout/SidebarNavigation.js';
import { Button } from '../components/ui/Button.js';

export function AppShell({
  classroomName,
  displayName,
  onLogout,
}: {
  readonly classroomName: string;
  readonly displayName: string;
  readonly onLogout: () => void;
}): React.JSX.Element {
  const location = useLocation();
  const currentWeekRoute = location.pathname === '/';
  const classroomRoute = location.pathname === '/class' || location.pathname.startsWith('/class/');
  return (
    <div className="app-layout">
      <OfflineBanner />
      <SidebarNavigation
        classroomName={classroomName}
        displayName={displayName}
        onLogout={onLogout}
      />
      <div className="app-column">
        <header className="topbar">
          <div className="topbar-brand">
            <img
              className="mobile-brand-logo"
              src="/icons/logo-nobackground.png"
              alt=""
              aria-hidden="true"
            />
            <div>
              <strong>Lớp Sạch</strong>
              <small>{classroomName}</small>
            </div>
          </div>
          <Button
            variant="secondary"
            className="logout-button"
            aria-label="Đăng xuất"
            onClick={onLogout}
          >
            <LogOut size={17} aria-hidden="true" />
            <span className="sr-only">Đăng xuất</span>
          </Button>
        </header>
        <div
          className={`page-container${currentWeekRoute ? ' current-week-container' : ''}${classroomRoute ? ' classroom-container' : ''}`}
        >
          <Outlet />
        </div>
      </div>
      <BottomNavigation />
    </div>
  );
}
