import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Toolbar } from './Toolbar';
import { RightSidebar } from './RightSidebar';
import { StatusBar } from './StatusBar';

interface AppLayoutProps {
  userName: string;
  userRole: string;
  userAvatar?: string;
  onLogout: () => void;
}

export function AppLayout({ userName, onLogout }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const isDashboard = location.pathname === '/' || location.pathname === '';

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top toolbar (32px) */}
      <Toolbar
        userName={userName}
        onLogout={onLogout}
        onToggleSidebar={() => setMobileOpen(!mobileOpen)}
      />

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />
        <div className="flex-1 flex overflow-hidden">
          <main className="flex-1 overflow-y-auto bg-canvas p-3 sm:p-4 lg:p-6">
            <Outlet />
          </main>
          {isDashboard && <RightSidebar />}
        </div>
      </div>

      {/* Status bar (22px) */}
      <StatusBar />
    </div>
  );
}
