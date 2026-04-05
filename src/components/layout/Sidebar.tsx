import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, Target, Trophy, DollarSign,
  BarChart3, Users, Flame, Settings, Tv, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useState } from 'react';

const NAV = [
  { to: '/',           icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/fill',       icon: ClipboardList,   label: 'Fill Diário' },
  { to: '/pipeline',   icon: Target,          label: 'Pipeline' },
  { to: '/ranking',    icon: Trophy,          label: 'Ranking' },
  { to: '/vendas',     icon: DollarSign,      label: 'Vendas' },
  { to: '/extratos',   icon: BarChart3,       label: 'Extratos' },
  { to: '/time',       icon: Users,           label: 'Time' },
  { to: '/identidade', icon: Flame,           label: 'Identidade' },
];

const BOTTOM = [
  { to: '/tv',       icon: Tv,       label: 'Painel TV' },
  { to: '/config',   icon: Settings, label: 'Config' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${
      isActive
        ? 'bg-vred/10 text-vred border border-vred/20'
        : 'text-t3 hover:text-t1 hover:bg-elevated border border-transparent'
    }`;

  return (
    <aside
      className={`flex flex-col h-screen bg-surface border-r border-b1 transition-all duration-200 ${
        collapsed ? 'w-[68px]' : 'w-[240px]'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-b1 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-vred flex items-center justify-center shrink-0">
          <span className="text-white font-black text-sm">V</span>
        </div>
        {!collapsed && (
          <div className="animate-slide">
            <div className="font-bold text-[15px] tracking-wide text-t1">
              VANTAGEM<span className="text-vred">.ai</span>
            </div>
            <div className="text-[9px] text-t4 tracking-[0.15em] uppercase">OPS Sistema</div>
          </div>
        )}
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="text-[10px] text-t4 uppercase tracking-[0.12em] px-3 mb-2 font-semibold">
          {collapsed ? '•' : 'Menu Principal'}
        </div>
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={linkClass} title={label}>
            <Icon size={18} className="shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom nav */}
      <div className="px-3 py-3 border-t border-b1 space-y-1">
        {BOTTOM.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={linkClass} title={label}>
            <Icon size={18} className="shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-10 border-t border-b1 text-t4 hover:text-t2 transition-colors"
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  );
}
