import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface AppLayoutProps {
  userName: string;
  userRole: string;
  userAvatar?: string;
  onLogout: () => void;
}

export function AppLayout({ userName, userRole, userAvatar, onLogout }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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
        <main className="flex-1 overflow-y-auto bg-canvas p-4 sm:p-6">
          <div className="animate-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
