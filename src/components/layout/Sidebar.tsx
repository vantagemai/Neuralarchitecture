import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, Trophy, DollarSign,
  BarChart3, Users, Flame, Settings, Tv, ChevronLeft, ChevronRight, X, Award, Swords, MessageSquare, Gift
} from 'lucide-react';
import { getSession } from '../../lib/store';

type Role = 'all' | 'manager' | 'head';
interface NavItem { to: string; icon: typeof LayoutDashboard; label: string; minRole?: Role }

const NAV: NavItem[] = [
  { to: '/',           icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/fill',       icon: ClipboardList,   label: 'Fill Diário' },
  { to: '/vendas',     icon: DollarSign,      label: 'Vendas' },
  { to: '/ranking',    icon: Trophy,          label: 'Ranking' },
  { to: '/identidade', icon: Flame,           label: 'Identidade' },
  { to: '/badges',     icon: Award,           label: 'Conquistas' },
  { to: '/desafios',   icon: Swords,          label: 'Desafios' },
  { to: '/premiacoes', icon: Gift,            label: 'Premiacoes' },
  { to: '/coaching',   icon: MessageSquare,   label: 'Coaching',  minRole: 'manager' },
  { to: '/extratos',   icon: BarChart3,       label: 'Extratos',  minRole: 'manager' },
  { to: '/time',       icon: Users,           label: 'Time',      minRole: 'head' },
];

const BOTTOM: NavItem[] = [
  { to: '/tv',       icon: Tv,       label: 'Painel TV' },
  { to: '/config',   icon: Settings, label: 'Config', minRole: 'head' },
];

function hasAccess(minRole: Role | undefined, userRole: string): boolean {
  if (!minRole || minRole === 'all') return true;
  const isHead = userRole === 'Head' || userRole === 'Founder';
  const isManager = isHead || userRole === 'Partner';
  if (minRole === 'head') return isHead;
  if (minRole === 'manager') return isManager;
  return true;
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const userRole = getSession()?.role || 'Setter';
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 min-h-[44px] ${
      isActive
        ? 'bg-vred/10 text-vred border border-vred/20'
        : 'text-t3 hover:text-t1 hover:bg-elevated border border-transparent'
    }`;

  const content = (
    <>
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
        {/* Mobile close */}
        <button onClick={onMobileClose} className="lg:hidden ml-auto p-1 text-t4 hover:text-t1" aria-label="Fechar menu">
          <X size={18} />
        </button>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="text-[10px] text-t4 uppercase tracking-[0.12em] px-3 mb-2 font-semibold">
          {collapsed ? '•' : 'Menu Principal'}
        </div>
        {NAV.filter(item => hasAccess(item.minRole, userRole)).map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'} className={linkClass} title={label} onClick={onMobileClose}>
            <Icon size={18} className="shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom nav */}
      <div className="px-3 py-3 border-t border-b1 space-y-1">
        {BOTTOM.filter(item => hasAccess(item.minRole, userRole)).map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={linkClass} title={label} onClick={onMobileClose}>
            <Icon size={18} className="shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </div>

      {/* Collapse toggle (desktop only) */}
      <button
        onClick={onToggle}
        className="hidden lg:flex items-center justify-center h-10 border-t border-b1 text-t4 hover:text-t2 transition-colors"
        aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </>
  );

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={onMobileClose} />
      )}

      {/* Sidebar */}
      <aside className={`
        flex flex-col h-screen bg-surface border-r border-b1 transition-all duration-200 z-50
        ${/* Mobile: fixed overlay drawer */''}
        fixed lg:relative
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${collapsed ? 'w-[68px]' : 'w-[240px]'}
      `}>
        {content}
      </aside>
    </>
  );
}
