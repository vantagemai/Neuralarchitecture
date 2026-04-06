import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, Trophy, DollarSign,
  BarChart3, Users, Flame, Settings, Tv, ChevronLeft, ChevronRight, ChevronDown, X, Award, Swords, MessageSquare, Gift
} from 'lucide-react';
import { getSession } from '../../lib/store';
import { Logo } from '../ui/Logo';
import { PanelHeader } from '../ui/PanelHeader';

type Role = 'all' | 'manager' | 'head';
interface NavItem { to: string; icon: typeof LayoutDashboard; label: string; minRole?: Role }

interface NavGroup {
  name: string;
  items: NavItem[];
}

const GROUPS: NavGroup[] = [
  {
    name: 'Operacional',
    items: [
      { to: '/',       icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/fill',   icon: ClipboardList,   label: 'Fill Diario' },
      { to: '/vendas', icon: DollarSign,      label: 'Vendas' },
    ],
  },
  {
    name: 'Performance',
    items: [
      { to: '/ranking',    icon: Trophy,  label: 'Ranking' },
      { to: '/badges',     icon: Award,   label: 'Conquistas' },
      { to: '/desafios',   icon: Swords,  label: 'Desafios' },
      { to: '/premiacoes', icon: Gift,    label: 'Premiacoes' },
    ],
  },
  {
    name: 'Gestao',
    items: [
      { to: '/identidade', icon: Flame,          label: 'Identidade' },
      { to: '/coaching',   icon: MessageSquare,   label: 'Coaching',  minRole: 'manager' },
      { to: '/extratos',   icon: BarChart3,       label: 'Extratos',  minRole: 'manager' },
      { to: '/time',       icon: Users,           label: 'Time',      minRole: 'head' },
    ],
  },
  {
    name: 'Sistema',
    items: [
      { to: '/tv',     icon: Tv,       label: 'Painel TV' },
      { to: '/config', icon: Settings, label: 'Config', minRole: 'head' },
    ],
  },
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
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    Operacional: true, Performance: true, Gestao: true, Sistema: true,
  });

  const toggleGroup = (name: string) => {
    setExpandedGroups(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-2 py-1.5 text-[11px] transition-all duration-100 border-l-2 ${
      isActive
        ? 'bg-elevated text-t1 border-l-vred'
        : 'text-t3 hover:text-t1 hover:bg-elevated/50 border-l-transparent'
    }`;

  const content = (
    <>
      {/* Panel header */}
      <PanelHeader title="Navigator" />

      {/* Logo */}
      <div className="flex items-center gap-2 px-3 h-10 border-b border-b1 shrink-0">
        {collapsed ? (
          <Logo size="sm" iconOnly />
        ) : (
          <Logo size="sm" />
        )}
        <button onClick={onMobileClose} className="lg:hidden ml-auto p-1 text-t4 hover:text-t1" aria-label="Fechar menu">
          <X size={14} />
        </button>
      </div>

      {/* Tree navigation */}
      <nav className="flex-1 py-1 overflow-y-auto">
        {GROUPS.map(group => {
          const visibleItems = group.items.filter(item => hasAccess(item.minRole, userRole));
          if (visibleItems.length === 0) return null;
          const expanded = expandedGroups[group.name] !== false;

          return (
            <div key={group.name}>
              {/* Group header */}
              {!collapsed && (
                <button
                  onClick={() => toggleGroup(group.name)}
                  className="w-full flex items-center gap-1 px-3 py-1 text-[9px] text-t4 uppercase tracking-[0.15em] hover:text-t3 transition-colors"
                >
                  <ChevronDown size={8} className={`transition-transform ${expanded ? '' : '-rotate-90'}`} />
                  {group.name}
                </button>
              )}
              {/* Items */}
              {(collapsed || expanded) && (
                <div className={collapsed ? 'py-1' : ''}>
                  {visibleItems.map(({ to, icon: Icon, label }) => (
                    <NavLink
                      key={to} to={to} end={to === '/'}
                      className={linkClass} title={label}
                      onClick={onMobileClose}
                    >
                      <Icon size={collapsed ? 16 : 13} className="shrink-0" />
                      {!collapsed && <span className="truncate">{label}</span>}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="hidden lg:flex items-center justify-center h-8 border-t border-b1 text-t4 hover:text-t2 transition-colors"
        aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </>
  );

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={onMobileClose} />
      )}
      <aside className={`
        flex flex-col bg-surface border-r border-b1 transition-all duration-200 z-50
        fixed lg:relative
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${collapsed ? 'w-[52px]' : 'w-[200px]'}
        h-full
      `}>
        {content}
      </aside>
    </>
  );
}
