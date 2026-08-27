import { LogOut } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import { BottomNavigation } from '../components/layout/BottomNavigation.js';
import { OfflineBanner } from '../components/layout/OfflineBanner.js';
import { SidebarNavigation } from '../components/layout/SidebarNavigation.js';
import { Button } from '../components/ui/Button.js';

export function AppShell({ classroomName, displayName, onLogout }: { readonly classroomName: string; readonly displayName: string; readonly onLogout: () => void }): React.JSX.Element {
  return <div className="app-layout"><OfflineBanner /><SidebarNavigation classroomName={classroomName} /><div className="app-column"><header className="topbar"><div><span className="mobile-brand">Lớp Sạch</span><small>{displayName}</small></div><Button variant="secondary" className="logout-button" onClick={onLogout}><LogOut size={17} aria-hidden="true" /><span>Đăng xuất</span></Button></header><div className="page-container"><Outlet /></div></div><BottomNavigation /></div>;
}
