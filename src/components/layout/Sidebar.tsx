import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, Trophy, DollarSign,
  BarChart3, Users, Flame, Settings, Tv, ChevronLeft, ChevronRight, ChevronDown, X, Award, Swords, MessageSquare, Gift
} from 'lucide-react';
import { getSession, getMonthSales, fmt$, db, getUsers, type FillData, calcScore, today } from '../../lib/store';
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

type TermTab = 'vendas' | 'shoutouts' | 'journal';

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
  const [termTab, setTermTab] = useState<TermTab>('vendas');
  const [termCollapsed, setTermCollapsed] = useState(false);

  const toggleGroup = (name: string) => {
    setExpandedGroups(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-2 py-1.5 text-xs transition-all duration-100 border-l-2 ${
      isActive
        ? 'bg-elevated text-t1 border-l-vred'
        : 'text-t3 hover:text-t1 hover:bg-elevated/50 border-l-transparent'
    }`;

  // Terminal data
  const sales = getMonthSales();
  const users = getUsers().filter(u => u.active);
  const journal = users.map(u => {
    const fill = db.get<FillData>(`ops_fill_${today()}_${u.id}`);
    const score = fill ? calcScore(fill) : 0;
    const time = fill ? new Date(fill.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
    return { id: u.id, name: u.name, filled: !!fill, score, time };
  }).sort((a, b) => b.score - a.score);

  // Shoutouts
  interface Shoutout { id: string; fromName: string; fromId: string; toName: string; toId: string; message: string; emoji: string; ts: number }
  const shoutouts: Shoutout[] = db.list('ops_shoutout_')
    .map(k => db.get<Shoutout>(k)).filter(Boolean)
    .sort((a, b) => (b as Shoutout).ts - (a as Shoutout).ts) as Shoutout[];

  const relTime = (ts: number) => {
    const d = Math.floor((Date.now() - ts) / 60000);
    if (d < 1) return 'agora';
    if (d < 60) return `${d}m`;
    if (d < 1440) return `${Math.floor(d / 60)}h`;
    return `${Math.floor(d / 1440)}d`;
  };

  const termTabs: { key: TermTab; label: string }[] = [
    { key: 'vendas', label: 'Vendas' },
    { key: 'shoutouts', label: 'Shouts' },
    { key: 'journal', label: 'Journal' },
  ];

  const content = (
    <>
      {/* Navigator panel header */}
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
      <nav className="flex-1 py-1 overflow-y-auto min-h-0">
        {GROUPS.map(group => {
          const visibleItems = group.items.filter(item => hasAccess(item.minRole, userRole));
          if (visibleItems.length === 0) return null;
          const expanded = expandedGroups[group.name] !== false;

          return (
            <div key={group.name}>
              {!collapsed && (
                <button
                  onClick={() => toggleGroup(group.name)}
                  className="w-full flex items-center gap-1 px-3 py-1 text-2xs text-t4 uppercase tracking-[0.15em] hover:text-t3 transition-colors"
                >
                  <ChevronDown size={8} className={`transition-transform ${expanded ? '' : '-rotate-90'}`} />
                  {group.name}
                </button>
              )}
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

      {/* ── Terminal panel (below nav) ── */}
      {!collapsed && (
        <div className="flex flex-col border-t border-b1 shrink-0">
          <PanelHeader title="Terminal" onCollapse={() => setTermCollapsed(!termCollapsed)} collapsed={termCollapsed} />

          {/* Tab strip */}
          <div className="flex border-b border-b1 shrink-0">
            {termTabs.map(t => (
              <button
                key={t.key}
                onClick={() => { setTermTab(t.key); if (termCollapsed) setTermCollapsed(false); }}
                className={`flex-1 px-1 py-1 text-2xs transition-colors border-r border-b1 last:border-r-0 ${
                  termTab === t.key ? 'bg-elevated text-t1 border-b-2 border-b-vred' : 'text-t3 hover:text-t2 hover:bg-elevated/50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Terminal content */}
          {!termCollapsed && (
            <div className="h-[200px] overflow-y-auto text-2xs">
              {termTab === 'vendas' && (
                <div>
                  {sales.sort((a, b) => b.ts - a.ts).slice(0, 15).map((s, i) => (
                    <div key={s.id} className={`flex items-center justify-between px-2 py-1 ${i % 2 === 0 ? '' : 'bg-elevated/20'} hover:bg-elevated/40 transition-colors`}>
                      <div className="min-w-0 flex-1">
                        <Link to={`/perfil/${s.sellerId}`} className="hover:text-vred transition-colors truncate block">{s.sellerName}</Link>
                        <span className="text-2xs text-t4">{s.date}</span>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <div className="text-t2">${s.setupValue}</div>
                        <div className="text-vgreen font-bold">{fmt$(s.sellerSetupComm + s.sellerRecComm)}</div>
                      </div>
                    </div>
                  ))}
                  {sales.length === 0 && <div className="text-center py-4 text-t4">Sem vendas</div>}
                </div>
              )}

              {termTab === 'shoutouts' && (
                <div>
                  {shoutouts.length === 0 ? (
                    <div className="text-center py-4 text-t4">Sem reconhecimentos</div>
                  ) : (
                    shoutouts.slice(0, 15).map((s, i) => (
                      <div key={s.id} className={`flex items-center justify-between px-2 py-1 ${i % 2 === 0 ? '' : 'bg-elevated/20'} hover:bg-elevated/40 transition-colors`}>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1 truncate">
                            <span>{s.emoji}</span>
                            <Link to={`/perfil/${s.fromId}`} className="hover:text-vred transition-colors font-medium truncate">{s.fromName.split(' ')[0]}</Link>
                            <span className="text-t4">→</span>
                            <Link to={`/perfil/${s.toId}`} className="hover:text-vred transition-colors text-vred truncate">{s.toName.split(' ')[0]}</Link>
                          </div>
                          <div className="text-2xs text-t3 truncate">{s.message}</div>
                        </div>
                        <span className="text-2xs text-t4 shrink-0 ml-1">{relTime(s.ts)}</span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {termTab === 'journal' && (
                <div>
                  {journal.map((j, i) => (
                    <div key={j.id} className={`flex items-center justify-between px-2 py-1 ${i % 2 === 0 ? '' : 'bg-elevated/20'} hover:bg-elevated/40 transition-colors`}>
                      <div className="min-w-0 flex-1">
                        <Link to={`/perfil/${j.id}`} className="hover:text-vred transition-colors truncate block">{j.name}</Link>
                        <span className={`text-2xs ${j.filled ? 'text-vgreen' : 'text-t4'}`}>
                          {j.filled ? '● OK' : '○ Pend.'}
                        </span>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <div className={`font-bold ${j.score > 0 ? 'text-vred' : 'text-t4'}`}>{j.score > 0 ? `${j.score}pts` : '—'}</div>
                        <div className="text-2xs text-t4">{j.time || ''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="hidden lg:flex items-center justify-center h-8 border-t border-b1 text-t4 hover:text-t2 transition-colors shrink-0"
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
        ${collapsed ? 'w-[52px]' : 'w-[220px]'}
        h-full
      `}>
        {content}
      </aside>
    </>
  );
}
