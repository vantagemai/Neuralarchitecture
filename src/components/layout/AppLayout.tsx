import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { RightSidebar } from './RightSidebar';

interface AppLayoutProps {
  userName: string;
  userRole: string;
  userAvatar?: string;
  onLogout: () => void;
}

export function AppLayout({ userName, userRole, userAvatar, onLogout }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Show right sidebar only on dashboard
  const showRightSidebar = location.pathname === '/' || location.pathname === '';

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          userName={userName}
          userRole={userRole}
          userAvatar={userAvatar}
          onLogout={onLogout}
          onToggleSidebar={() => setMobileOpen(!mobileOpen)}
        />
        <div className="flex-1 flex overflow-hidden">
          <main className="flex-1 overflow-y-auto bg-canvas p-4 sm:p-6">
            <div className="animate-in">
              <Outlet />
            </div>
          </main>
          {showRightSidebar && <RightSidebar />}
        </div>
      </div>
    </div>
  );
}
