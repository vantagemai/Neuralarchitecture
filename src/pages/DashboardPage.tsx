import { useMemo, useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { KpiCard } from '../components/ui/KpiCard';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import {
  DollarSign, Users, Target, TrendingUp,
  AlertTriangle, CheckCircle2, Clock, Activity,
  Settings2, GripVertical, Eye, EyeOff, ChevronUp, ChevronDown, RotateCcw,
  Flame, Zap, Gift, Star, ArrowRight
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { getUsers, getTodayFills, getMonthSales, calcScore, db, today, fmt$, CHANNELS, type FillData, getSession, getMyMonthCommission } from '../lib/store';

import { CardBase } from '../components/ui/CardBase';
import { getScorecard } from '../lib/scorecard';
import { getGoalProgress } from '../lib/goals';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { chartColors } from '../lib/theme';
import { getStreak } from '../lib/streaks';
import { getLevel, getNextLevel } from '../lib/levels';
import { getTotalXp, getTotalFichas } from '../lib/xp';
import { getMonthBonus } from '../lib/bonus';
import { roleVariant } from '../lib/roles';
import { getNextRedeemablePrize } from '../lib/prizes';
import { getPersonalAlerts } from '../lib/personalAlerts';
import type { NIProfile } from './IdentidadePage';

const MEDALS = ['🥇', '🥈', '🥉'];

function getLast7DaysFills(): { date: string; label: string; score: number }[] {
  const result: { date: string; label: string; score: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const label = d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' });
    const keys = db.list(`ops_fill_${dateStr}_`);
    const fills = keys.map(k => db.get<FillData>(k)).filter(Boolean) as FillData[];
  const totalScore = fills.reduce((t, f) => t + calcScore(f), 0);
    result.push({ date: dateStr, label, score: totalScore });
  }
  return result;
}

function getMonthSalesTrend(): { label: string; vendas: number; comissao: number }[] {
  const result: { label: string; vendas: number; comissao: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const label = d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' });
    const keys = db.list(`ops_sale_${dateStr}`);
    const sales = keys.map(k => db.get<any>(k)).filter(Boolean);
    const comissao = sales.reduce((t: number, s: any) => t + (s.sellerSetupComm || 0) + (s.sellerRecComm || 0), 0);
    result.push({ label, vendas: sales.length, comissao });
  }
  return result;
}

// ── Dashboard Layout System ──
type SectionId = 'objetivo' | 'goals' | 'ganhos' | 'evolucao' | 'alertas' | 'kpis' | 'charts' | 'team' | 'heatmap';

interface SectionConfig { id: SectionId; visible: boolean }

const DEFAULT_SECTIONS: SectionConfig[] = [
  { id: 'objetivo', visible: true },
  { id: 'goals', visible: true },
  { id: 'ganhos', visible: true },
  { id: 'evolucao', visible: true },
  { id: 'alertas', visible: true },
  { id: 'kpis', visible: false },
  { id: 'charts', visible: false },
  { id: 'team', visible: false },
  { id: 'heatmap', visible: false },
];

const SECTION_LABELS: Record<SectionId, { label: string; icon: string }> = {
  objetivo: { label: 'Meu Objetivo', icon: '🎯' },
  goals: { label: 'Minhas Metas', icon: '📊' },
  ganhos: { label: 'Meus Ganhos', icon: '💰' },
  evolucao: { label: 'Minha Evolucao', icon: '⭐' },
  alertas: { label: 'Alertas Pessoais', icon: '🔔' },
  kpis: { label: 'KPIs Time', icon: '📊' },
  charts: { label: 'Graficos Time', icon: '📈' },
  team: { label: 'Time', icon: '👥' },
  heatmap: { label: 'Heatmap Time', icon: '🔥' },
};

const LAYOUT_KEY = 'vops_dashboard_layout';

function loadLayout(): SectionConfig[] {
  try {
    // v2 migration: reset to personal-first layout
    const migrated = localStorage.getItem('vops_dashboard_v2');
    if (!migrated) {
      localStorage.setItem('vops_dashboard_v2', '1');
      saveLayout(DEFAULT_SECTIONS);
      return DEFAULT_SECTIONS;
    }
    const saved = localStorage.getItem(LAYOUT_KEY);
    if (!saved) return DEFAULT_SECTIONS;
    const parsed = JSON.parse(saved) as SectionConfig[];
    // Ensure all sections exist (in case new ones were added)
    const ids = new Set(parsed.map(s => s.id));
    const merged = [...parsed];
    for (const def of DEFAULT_SECTIONS) {
      if (!ids.has(def.id)) merged.push(def);
    }
    return merged.filter(s => SECTION_LABELS[s.id]);
  } catch { return DEFAULT_SECTIONS; }
}

function saveLayout(sections: SectionConfig[]) {
  localStorage.setItem(LAYOUT_KEY, JSON.stringify(sections));
}

export function DashboardPage() {
  const [editMode, setEditMode] = useState(false);
  const [sections, setSections] = useState<SectionConfig[]>(loadLayout);

  const moveSection = useCallback((idx: number, dir: -1 | 1) => {
    const next = idx + dir;
    if (next < 0 || next >= sections.length) return;
    const copy = [...sections];
    [copy[idx], copy[next]] = [copy[next], copy[idx]];
    setSections(copy);
    saveLayout(copy);
  }, [sections]);

  const toggleVisible = useCallback((id: SectionId) => {
    const copy = sections.map(s => s.id === id ? { ...s, visible: !s.visible } : s);
    setSections(copy);
    saveLayout(copy);
  }, [sections]);

  const resetLayout = useCallback(() => {
    setSections(DEFAULT_SECTIONS);
    saveLayout(DEFAULT_SECTIONS);
  }, []);

  // Refresh key: incremented when xp-update fires (fill/sale added)
  const [dataKey, setDataKey] = useState(0);
  useEffect(() => {
    const refresh = () => setDataKey(k => k + 1);
    document.addEventListener('xp-update', refresh);
    return () => document.removeEventListener('xp-update', refresh);
  }, []);

  const users = useMemo(() => getUsers().filter(u => u.active), [dataKey]);
  const fills = useMemo(() => getTodayFills(), [dataKey]);
  const sales = useMemo(() => getMonthSales(), [dataKey]);
  const activityTrend = useMemo(() => getLast7DaysFills(), [dataKey]);
  const salesTrend = useMemo(() => getMonthSalesTrend(), [dataKey]);


  // KPI calculations
  const todayStr = today();
  const totalScore = fills.reduce((t, f) => t + calcScore(f), 0);
  const totalSalesMonth = sales.length;
  const totalComm = sales.reduce((t, s) => t + (s.sellerSetupComm || 0) + (s.sellerRecComm || 0), 0);
  const filledCount = fills.length;
  const totalMembers = users.length || 1;

  // Team sorted by score
  const teamData = users.map(u => {
    const fill = fills.find(f => f.userId === u.id || f.userName === u.name);
    return {
      id: u.id,
      name: u.name,
      role: u.role,
      score: fill ? calcScore(fill) : 0,
      filled: !!fill,
      time: fill ? new Date(fill.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
      channels: fill?.channels || {},
      obs: fill?.obs || '',
    };
  }).sort((a, b) => b.score - a.score);

  // Alerts
  const alerts: { type: 'warn' | 'ok' | 'info'; msg: string; time: string }[] = [];
  const missing = teamData.filter(t => !t.filled);
  if (missing.length > 0) {
    alerts.push({ type: 'warn', msg: `${missing.length} membro(s) não preencheu o fill hoje`, time: 'agora' });
  }
  const todaySales = sales.filter(s => s.date === todayStr);
  if (todaySales.length > 0) {
    const todayComm = todaySales.reduce((t, s) => t + (s.sellerSetupComm || 0) + (s.sellerRecComm || 0), 0);
    alerts.push({ type: 'ok', msg: `${todaySales.length} venda(s) hoje — ${fmt$(todayComm)} em comissões`, time: 'hoje' });
  }
  if (totalScore === 0 && fills.length === 0) {
    alerts.push({ type: 'info', msg: 'Nenhum fill registrado hoje. Cadastre membros em Time e preencha em Fill Diário.', time: '' });
  }

  const now = new Date();
  const session = getSession();
  const greeting = now.getHours() < 12 ? 'Bom dia' : now.getHours() < 18 ? 'Boa tarde' : 'Boa noite';
  const myLevel = getLevel();
  const myStreak = getStreak();
  const myXp = getTotalXp();

  // Personal data for new sections
  const myId = session?.id || 'anon';
  const myFillToday = db.get<FillData>(`ops_fill_${todayStr}_${myId}`);
  const gp = useMemo(() => getGoalProgress(myId), [dataKey]);
  const myComm = useMemo(() => getMyMonthCommission(myId), [dataKey]);
  const niProfile = useMemo(() => db.get<NIProfile>(`ni_profile_${myId}`), [dataKey]);
  const myBonus = useMemo(() => getMonthBonus(myId), [dataKey]);
  const myFichas = useMemo(() => getTotalFichas(myId), [dataKey]);
  const nextLevel = useMemo(() => getNextLevel(myId), [dataKey]);
  const nextPrize = useMemo(() => getNextRedeemablePrize(myId), [dataKey]);
  const personalAlerts = useMemo(() => getPersonalAlerts(myId), [dataKey]);

  // Today's meetings from fill
  const meetingsToday = myFillToday?.channels?.visitas
    ? { agendadas: parseInt(myFillToday.channels.visitas.a) || 0, realizadas: parseInt(myFillToday.channels.visitas.b) || 0 }
    : { agendadas: 0, realizadas: 0 };

  return (
    <div className="space-y-5">
      {/* Terminal header bar */}
      <div className="flex items-center justify-between border-b border-b1 pb-3">
        <div className="flex items-center gap-3">
          <Avatar userId={session?.id || ''} name={session?.name || 'U'} size="w-10 h-10" />
          <div>
            <h1 className="text-lg font-bold font-mono">{greeting}, {session?.name?.split(' ')[0] || 'User'}</h1>
            <div className="flex items-center gap-3">
              <span className={`text-2xs font-bold font-mono ${myLevel.color}`}>{myLevel.icon} {myLevel.name}</span>
              <span className="text-2xs font-mono text-vgold neon-gold">🪙 {myXp.toLocaleString()} Fichas</span>
              {myStreak.current > 0 && <span className="text-2xs font-mono text-orange-400">🔥{myStreak.current}d</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-t3 font-mono hidden sm:block">
            {now.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
          <span className="flex items-center gap-1.5 text-2xs text-vgreen font-mono">
            <span className="relative w-2 h-2"><span className="absolute inset-0 rounded-full bg-vgreen animate-pulse" /><span className="absolute inset-0 rounded-full tv-live-ring text-vgreen" /></span>
            LIVE
          </span>
          <button onClick={() => setEditMode(!editMode)}
            className={`p-2 rounded-lg transition-colors ${editMode ? 'bg-vred/15 text-vred' : 'text-t4 hover:text-t2'}`}
            title="Editar layout">
            <Settings2 size={16} />
          </button>
        </div>
      </div>

      {/* Daily Activities — Atividades Geradoras de Lucro */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface border border-b1 rounded-lg px-3 py-2.5 flex items-center gap-2.5">
          <span className="text-base">📞</span>
          <div className="min-w-0">
            <div className="text-2xs text-t4">Contatos</div>
            <div className="font-mono text-sm font-bold text-t1">{gp.dailyContacts.current}<span className="text-t4 font-normal">/{gp.dailyContacts.target}</span></div>
          </div>
        </div>
        <div className="bg-surface border border-b1 rounded-lg px-3 py-2.5 flex items-center gap-2.5">
          <span className="text-base">🤝</span>
          <div className="min-w-0">
            <div className="text-2xs text-t4">Reunioes</div>
            <div className="font-mono text-sm font-bold text-t1">{meetingsToday.realizadas}<span className="text-t4 font-normal">/{meetingsToday.agendadas || '—'}</span></div>
          </div>
        </div>
        <div className="bg-surface border border-b1 rounded-lg px-3 py-2.5 flex items-center gap-2.5">
          <span className="text-base">📋</span>
          <div className="min-w-0">
            <div className="text-2xs text-t4">Fill Diario</div>
            {myFillToday
              ? <div className="text-sm font-bold text-vgreen">Feito ✓</div>
              : <div className="text-sm font-bold text-vred">Pendente</div>
            }
          </div>
        </div>
        <div className="bg-surface border border-b1 rounded-lg px-3 py-2.5 flex items-center gap-2.5">
          <span className="text-base">🔥</span>
          <div className="min-w-0">
            <div className="text-2xs text-t4">Streak</div>
            <div className="font-mono text-sm font-bold text-orange-400">{myStreak.current}d</div>
          </div>
        </div>
      </div>

      {/* Edit Mode Panel */}
      {editMode && (
        <div className="bg-surface border border-vred/20 rounded-lg p-4 animate-in">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold">Editar Dashboard</h2>
              <p className="text-2xs text-t4">Reordene e mostre/oculte secoes</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={resetLayout} className="flex items-center gap-1 text-2xs text-t3 hover:text-t1 px-2 py-1 rounded border border-b1 hover:border-b3 transition-colors">
                <RotateCcw size={12} /> Reset
              </button>
              <button onClick={() => setEditMode(false)} className="flex items-center gap-1 text-2xs text-white bg-vred hover:bg-vred-dark px-3 py-1 rounded-lg transition-colors font-bold">
                Pronto
              </button>
            </div>
          </div>
          <div className="space-y-1">
            {sections.map((sec, idx) => (
              <div key={sec.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${sec.visible ? 'bg-elevated/50' : 'bg-elevated/20 opacity-60'}`}>
                <GripVertical size={14} className="text-t4 shrink-0" />
                <span className="text-sm">{SECTION_LABELS[sec.id].icon}</span>
                <span className="text-xs font-semibold flex-1">{SECTION_LABELS[sec.id].label}</span>
                <button onClick={() => moveSection(idx, -1)} disabled={idx === 0}
                  className="p-1 text-t4 hover:text-t1 disabled:opacity-20 transition-colors" title="Mover acima">
                  <ChevronUp size={14} />
                </button>
                <button onClick={() => moveSection(idx, 1)} disabled={idx === sections.length - 1}
                  className="p-1 text-t4 hover:text-t1 disabled:opacity-20 transition-colors" title="Mover abaixo">
                  <ChevronDown size={14} />
                </button>
                <button onClick={() => toggleVisible(sec.id)}
                  className={`p-1 transition-colors ${sec.visible ? 'text-vgreen' : 'text-t4 hover:text-t2'}`}
                  title={sec.visible ? 'Ocultar' : 'Mostrar'}>
                  {sec.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Rendered sections in user-defined order ── */}
      {sections.filter(s => s.visible).map(sec => {
        switch (sec.id) {

      case 'objetivo': return (
      <div key="objetivo">
      {/* ── MEU OBJETIVO ── */}
      {niProfile ? (() => {
        const fp = niProfile.metaM > 0 ? Math.min(100, Math.round((myComm / niProfile.metaM) * 100)) : 0;
        const dreamLabel = niProfile.dreamItemLabel || '';
        const dreamItems = [
          { key: 'car', icon: '🚗', label: 'Carro', text: niProfile.car },
          { key: 'home', icon: '🏠', label: 'Moradia', text: niProfile.home },
          { key: 'body', icon: '💪', label: 'Corpo', text: niProfile.body },
          { key: 'style', icon: '✨', label: 'Estilo', text: niProfile.style },
        ].filter(d => d.text);
        const primaryItem = dreamItems.find(d => d.key === dreamLabel) || dreamItems[0];
        const primaryImage = primaryItem && niProfile.images?.[primaryItem.key];
        const otherItems = dreamItems.filter(d => d.key !== primaryItem?.key);
        const dreamValue = niProfile.dreamItemValue;
        // Ring SVG
        const radius = 50;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (fp / 100) * circumference;
        const ringColor = fp >= 100 ? '#5A9E6F' : fp >= 60 ? '#D4A843' : '#D4634B';
        return (
          <CardBase padding="none" className="overflow-hidden">
            <div className="px-5 py-4 border-b border-b1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target size={18} className="text-vgold" />
                <h2 className="text-sm font-bold">Meu Objetivo</h2>
              </div>
              {niProfile.anchor && <span className="text-2xs text-t4 italic hidden sm:block truncate max-w-[250px]">"{niProfile.anchor}"</span>}
            </div>

            <div className="px-5 py-5">
              {/* Top: Ring + Financial info + Primary image */}
              <div className="flex flex-col sm:flex-row items-center gap-5">
                {/* Primary image — big */}
                {primaryImage && (
                  <div className="shrink-0 relative">
                    <img src={primaryImage} alt={primaryItem.text} className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl object-cover border-2 border-vgold/30 shadow-lg" />
                    <div className="absolute -bottom-1 -right-1 bg-surface border border-vgold/30 rounded-full px-2 py-0.5 text-2xs font-bold text-vgold shadow-sm">
                      {primaryItem.icon} #{1}
                    </div>
                  </div>
                )}

                {/* Ring */}
                <div className="relative shrink-0">
                  <svg width="120" height="120" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-overlay" />
                    <circle cx="60" cy="60" r={radius} fill="none" stroke={ringColor} strokeWidth="8"
                      strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
                      transform="rotate(-90 60 60)" className="transition-all duration-1000" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black font-mono" style={{ color: ringColor }}>{fp}%</span>
                    <span className="text-[9px] text-t4">da meta</span>
                  </div>
                </div>

                {/* Financial info */}
                <div className="flex-1 w-full space-y-2">
                  <div>
                    <div className="text-xs text-t4">Meta mensal</div>
                    <div className="text-xl font-black font-mono text-vgold">{fmt$(niProfile.metaM)}</div>
                    <div className="text-sm text-t3 mt-0.5">Ganho este mes: <span className="font-mono font-bold text-vgreen">{fmt$(myComm)}</span></div>
                    {niProfile.metaM > myComm && (
                      <div className="text-xs text-t4 mt-0.5">Faltam <span className="font-mono font-bold text-vred">{fmt$(niProfile.metaM - myComm)}</span></div>
                    )}
                  </div>
                  {dreamValue && dreamValue > 0 && primaryItem && (() => {
                    const allTimeComm = sales.filter(s => s.sellerId === myId || s.sellerName === (session?.name || '')).reduce((t, s) => t + (s.sellerSetupComm || 0) + (s.sellerRecComm || 0), 0);
                    const dreamPct = Math.min(100, Math.round((allTimeComm / dreamValue) * 100));
                    return (
                      <div className="bg-elevated/50 rounded-lg px-3 py-2">
                        <div className="flex justify-between text-2xs mb-1">
                          <span className="text-t3">{primaryItem.icon} {primaryItem.text}</span>
                          <span className="font-mono text-t2">{dreamPct}%</span>
                        </div>
                        <div className="h-2 bg-overlay rounded-full overflow-hidden">
                          <div className="h-full bg-vgold rounded-full transition-all duration-1000" style={{ width: `${dreamPct}%` }} />
                        </div>
                        <div className="text-2xs text-t4 mt-1">{fmt$(allTimeComm)} / {fmt$(dreamValue)}</div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Bottom: Other objectives gallery */}
              {otherItems.length > 0 && (
                <div className="mt-5 pt-4 border-t border-b1">
                  <div className="text-2xs text-t4 uppercase tracking-wider mb-3">Outros Objetivos</div>
                  <div className="grid grid-cols-3 gap-3">
                    {otherItems.map(item => {
                      const img = niProfile.images?.[item.key];
                      return (
                        <div key={item.key} className="text-center">
                          {img ? (
                            <img src={img} alt={item.text} className="w-full aspect-square rounded-xl object-cover border border-b1 mb-1.5" />
                          ) : (
                            <div className="w-full aspect-square rounded-xl bg-elevated border border-b1 flex items-center justify-center text-2xl mb-1.5">
                              {item.icon}
                            </div>
                          )}
                          <div className="text-2xs text-t3 truncate">{item.text}</div>
                          <div className="text-[10px] text-t4">{item.label}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </CardBase>
        );
      })() : (
        <CardBase className="text-center py-8">
          <Target size={32} className="mx-auto mb-3 text-t4 opacity-30" />
          <p className="text-sm text-t3 mb-3">Configure seu objetivo financeiro</p>
          <Link to="/identidade" className="inline-flex items-center gap-2 bg-vred hover:bg-vred-dark text-white font-bold px-5 py-2.5 rounded-lg transition-colors text-sm">
            Ir para Identidade <ArrowRight size={14} />
          </Link>
        </CardBase>
      )}
      </div>
      ); case 'goals': return (
      <div key="goals">
      {/* ── HERO: Minhas Metas ── */}
      {(() => {
        const gp = getGoalProgress();
        const goalItems = [
          { label: 'Contatos hoje', icon: '📞', ...gp.dailyContacts, color: 'text-vred', bg: 'bg-vred', border: 'border-vred/25' },
          { label: 'Score hoje', icon: '⚡', ...gp.dailyScore, color: 'text-vpurp', bg: 'bg-vpurp', border: 'border-vpurp/25' },
          { label: 'Vendas mês', icon: '🤝', ...gp.monthlySales, color: 'text-vgreen', bg: 'bg-vgreen', border: 'border-vgreen/25' },
          { label: 'Receita mês', icon: '💰', ...gp.monthlyRevenue, color: 'text-vgold', bg: 'bg-vgold', border: 'border-vgold/25' },
        ];
        const completedGoals = goalItems.filter(g => g.pct >= 100).length;
        const overallPct = gp.overall;
        // SVG ring params
        const radius = 54;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (overallPct / 100) * circumference;
        const ringColor = overallPct >= 100 ? '#5A9E6F' : overallPct >= 75 ? '#D4A843' : '#D4634B';
        return (
          <CardBase padding="none" className="overflow-hidden">
            {/* Top hero band */}
            <div className="px-5 py-4 border-b border-b1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target size={18} className="text-vred" />
                <h2 className="text-sm font-bold">Minhas Metas</h2>
              </div>
              <div className="flex items-center gap-2 text-2xs text-t4">
                <span>{completedGoals}/{goalItems.length} concluídas</span>
                {completedGoals === goalItems.length && <Flame size={14} className="text-vgold" />}
              </div>
            </div>

            <div className="px-5 py-5 flex flex-col md:flex-row items-center gap-6">
              {/* Big ring */}
              <div className="relative shrink-0">
                <svg width="140" height="140" viewBox="0 0 140 140">
                  <circle cx="70" cy="70" r={radius} fill="none" stroke="currentColor" strokeWidth="10"
                    className="text-overlay" />
                  <circle cx="70" cy="70" r={radius} fill="none" stroke={ringColor} strokeWidth="10"
                    strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
                    transform="rotate(-90 70 70)"
                    className="transition-all duration-1000" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black font-mono" style={{ color: ringColor }}>{overallPct}%</span>
                  <span className="text-2xs text-t4 -mt-0.5">progresso geral</span>
                </div>
              </div>

              {/* Goal bars — full width */}
              <div className="flex-1 w-full space-y-3">
                {goalItems.map(g => (
                  <div key={g.label}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{g.icon}</span>
                        <span className="text-xs font-semibold text-t2">{g.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-mono text-sm font-bold ${g.color}`}>
                          {g.label.includes('Receita') ? fmt$(g.current) : g.current}
                        </span>
                        <span className="text-2xs text-t4">
                          / {g.label.includes('Receita') ? fmt$(g.target) : g.target}
                        </span>
                        {g.pct >= 100 && <CheckCircle2 size={14} className="text-vgreen" />}
                      </div>
                    </div>
                    <div className="h-3 bg-overlay rounded-full overflow-hidden">
                      <div
                        className={`h-full ${g.bg} rounded-full transition-all duration-1000 relative`}
                        style={{ width: `${Math.min(g.pct, 100)}%` }}
                      >
                        {g.pct >= 15 && (
                          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-white/90 font-mono">
                            {g.pct}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Motivational footer */}
            {overallPct < 100 && (
              <div className="px-5 py-2.5 bg-elevated/30 border-t border-b1 flex items-center gap-2">
                <Zap size={13} className="text-vgold shrink-0" />
                <span className="text-2xs text-t3">
                  {overallPct < 25 ? 'Comece forte! Cada contato te aproxima da meta.' :
                   overallPct < 50 ? 'Bom começo! Continue nesse ritmo.' :
                   overallPct < 75 ? 'Mais da metade! Falta pouco para bater tudo.' :
                   'Quase lá! Sprint final para fechar todas as metas!'}
                </span>
              </div>
            )}
            {overallPct >= 100 && (
              <div className="px-5 py-2.5 bg-vgreen/10 border-t border-vgreen/20 flex items-center gap-2">
                <CheckCircle2 size={13} className="text-vgreen shrink-0" />
                <span className="text-2xs text-vgreen font-bold">Todas as metas batidas! Dia de campeão 🏆</span>
              </div>
            )}
          </CardBase>
        );
      })()}
      </div>
      ); case 'kpis': return (
      <div key="kpis">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Receita Mês" value={fmt$(totalComm)} icon={DollarSign} color="green" trendLabel={`${totalSalesMonth} vendas`} sparkData={salesTrend.map(d => d.comissao)} />
        <KpiCard label="Vendas Mês" value={totalSalesMonth} icon={Target} color="gold" sparkData={salesTrend.map(d => d.vendas)} />
        <KpiCard label="Time" value={`${filledCount}/${totalMembers}`} icon={Users} color="blue" trendLabel="preencheram" />
        <KpiCard label="Score Total" value={totalScore} icon={TrendingUp} color="red" trendLabel="pts hoje" sparkData={activityTrend.map(d => d.score)} />
      </div>
      </div>
      ); case 'ganhos': return (
      <div key="ganhos">
      {/* ── MEUS GANHOS ── */}
      <CardBase padding="none" className="overflow-hidden">
        <div className="px-5 py-3 border-b border-b1 flex items-center gap-2">
          <DollarSign size={16} className="text-vgreen" />
          <h2 className="text-sm font-bold">Meus Ganhos</h2>
        </div>
        <div className={`grid grid-cols-2 ${(session?.role === 'Setter' || session?.role === 'Social Seller') ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} divide-y sm:divide-y-0 sm:divide-x divide-b1`}>
          {/* Commission */}
          <div className="px-4 py-4 text-center">
            <div className="text-2xs text-t4 uppercase tracking-wider mb-1">Comissao Mes</div>
            <div className="font-mono text-xl font-black text-vgreen">{fmt$(myComm)}</div>
            <div className="text-2xs text-t4 mt-1">{sales.filter(s => s.sellerId === myId || s.sellerName === (session?.name || '')).length} vendas</div>
          </div>

          {/* Bonus (Setter/Social Seller) */}
          {(session?.role === 'Setter' || session?.role === 'Social Seller') && (
            <div className="px-4 py-4 text-center">
              <div className="text-2xs text-t4 uppercase tracking-wider mb-1">Bonus</div>
              <div className="font-mono text-xl font-black text-vgold">${myBonus.bonus}</div>
              <div className="h-1.5 bg-overlay rounded-full overflow-hidden mt-2 max-w-[100px] mx-auto">
                <div className="h-full bg-vgold rounded-full transition-all" style={{ width: `${myBonus.progress}%` }} />
              </div>
              <div className="text-2xs text-t4 mt-1">{myBonus.nextAt > 0 ? `${myBonus.nextAt} p/ +$100` : 'Ciclo completo!'}</div>
            </div>
          )}

          {/* Fichas + Level */}
          <div className="px-4 py-4 text-center">
            <div className="text-2xs text-t4 uppercase tracking-wider mb-1">Fichas</div>
            <div className="font-mono text-xl font-black text-vpurp">🪙 {myFichas.toLocaleString()}</div>
            {nextLevel.next && (
              <>
                <div className="h-1.5 bg-overlay rounded-full overflow-hidden mt-2 max-w-[100px] mx-auto">
                  <div className="h-full bg-vpurp rounded-full transition-all" style={{ width: `${nextLevel.progress}%` }} />
                </div>
                <div className="text-2xs text-t4 mt-1">{nextLevel.next.icon} {nextLevel.next.name} em {nextLevel.xpNeeded.toLocaleString()}</div>
              </>
            )}
          </div>

          {/* Next Prize */}
          <div className="px-4 py-4 text-center">
            <div className="text-2xs text-t4 uppercase tracking-wider mb-1">Proximo Premio</div>
            {nextPrize ? (
              <>
                <div className="text-2xl mb-1">{nextPrize.prize.icon}</div>
                <div className="text-xs font-semibold text-t2 truncate">{nextPrize.prize.name}</div>
                <div className="h-1.5 bg-overlay rounded-full overflow-hidden mt-2 max-w-[100px] mx-auto">
                  <div className="h-full bg-vred rounded-full transition-all" style={{ width: `${nextPrize.pct}%` }} />
                </div>
                <div className="text-2xs text-t4 mt-1">{nextPrize.pct}% — faltam {nextPrize.fichasNeeded.toLocaleString()}</div>
              </>
            ) : (
              <>
                <div className="text-2xl mb-1">🏆</div>
                <div className="text-xs font-bold text-vgreen">Todos disponiveis!</div>
                <Link to="/premiacoes" className="text-2xs text-vred hover:underline mt-1 inline-block">Resgatar →</Link>
              </>
            )}
          </div>
        </div>
      </CardBase>
      </div>
      ); case 'charts': return (
      <div key="charts">
      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        {/* Activity trend */}
        <CardBase>
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} className="text-vred" />
            <h2 className="text-sm font-bold">Atividade — Últimos 7 dias</h2>
          </div>
          {(() => { const cc = chartColors(); return (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={activityTrend}>
              <CartesianGrid strokeDasharray="1 1" stroke={cc.grid} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: cc.tick }} />
              <YAxis tick={{ fontSize: 10, fill: cc.tick }} />
              <Tooltip
                contentStyle={{ background: cc.tooltipBg, border: cc.tooltipBorder, borderRadius: 0, fontSize: 11 }}
                labelStyle={{ color: cc.tooltipLabel }}
              />
              <Bar dataKey="score" fill="#D4634B" radius={0} />
            </BarChart>
          </ResponsiveContainer>
          ); })()}
        </CardBase>

        {/* Sales trend */}
        <CardBase>
          <div className="flex items-center gap-2 mb-4">
            <DollarSign size={16} className="text-vgreen" />
            <h2 className="text-sm font-bold">Comissões — Últimos 7 dias</h2>
          </div>
          {(() => { const cc = chartColors(); return (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={salesTrend}>
              <CartesianGrid strokeDasharray="1 1" stroke={cc.grid} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: cc.tick }} />
              <YAxis tick={{ fontSize: 10, fill: cc.tick }} />
              <Tooltip
                contentStyle={{ background: cc.tooltipBg, border: cc.tooltipBorder, borderRadius: 0, fontSize: 11 }}
                formatter={(value: any) => ['$' + value, 'Comissão']}
              />
              <Line type="monotone" dataKey="comissao" stroke="#5A9E6F" strokeWidth={2} dot={{ fill: '#5A9E6F', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
          ); })()}
        </CardBase>
      </div>
      </div>
      ); case 'evolucao': return (
      <div key="evolucao">
      {/* ── MINHA EVOLUCAO ── */}
      {(() => {
        const sc = getScorecard();
        const radarData = [
          { metric: 'Atividade', value: sc.activity },
          { metric: 'Receita', value: sc.revenue },
          { metric: 'Consistencia', value: sc.consistency },
          { metric: 'Fichas', value: sc.xp },
          { metric: 'Badges', value: sc.badges },
        ];
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Scorecard */}
            <CardBase>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-bold">Scorecard Pessoal</h2>
                <span className="font-mono text-2xl font-bold text-vred">{sc.overall}<span className="text-xs text-t4">/100</span></span>
              </div>
              {(() => { const cc = chartColors(); return (
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke={cc.grid} />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: cc.tick }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar dataKey="value" stroke="#D4634B" fill="#D4634B" fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
              ); })()}
            </CardBase>

            {/* Level progression */}
            <CardBase>
              <h2 className="text-sm font-bold mb-4">Minha Evolucao</h2>
              <div className="flex items-center gap-4 mb-4">
                <div className="text-center">
                  <span className="text-3xl">{myLevel.icon}</span>
                  <div className={`text-xs font-bold mt-1 ${myLevel.color}`}>{myLevel.name}</div>
                </div>
                {nextLevel.next && (
                  <>
                    <div className="flex-1">
                      <div className="h-2 bg-overlay rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-vpurp to-vred rounded-full transition-all duration-1000" style={{ width: `${nextLevel.progress}%` }} />
                      </div>
                      <div className="text-2xs text-t4 mt-1 text-center">{nextLevel.progress}%</div>
                    </div>
                    <div className="text-center opacity-50">
                      <span className="text-3xl">{nextLevel.next.icon}</span>
                      <div className={`text-xs font-bold mt-1 ${nextLevel.next.color}`}>{nextLevel.next.name}</div>
                    </div>
                  </>
                )}
              </div>
              {nextLevel.next && (
                <div className="space-y-2">
                  <div className="bg-elevated/50 rounded-lg px-3 py-2 flex justify-between items-center">
                    <span className="text-xs text-t3">Fichas atuais</span>
                    <span className="font-mono text-sm font-bold text-vpurp">🪙 {myFichas.toLocaleString()}</span>
                  </div>
                  <div className="bg-elevated/50 rounded-lg px-3 py-2 flex justify-between items-center">
                    <span className="text-xs text-t3">Faltam para {nextLevel.next.name}</span>
                    <span className="font-mono text-sm font-bold text-t2">{nextLevel.xpNeeded.toLocaleString()}</span>
                  </div>
                  {nextLevel.next.award && (
                    <div className="bg-vgold/5 border border-vgold/15 rounded-lg px-3 py-2 flex items-center gap-2">
                      <Gift size={14} className="text-vgold shrink-0" />
                      <span className="text-xs text-t3">Premio: <span className="text-vgold font-semibold">{nextLevel.next.award}</span></span>
                    </div>
                  )}
                </div>
              )}
              <div className="mt-4 flex items-center gap-3">
                <Star size={14} className="text-vgold" />
                <span className="text-2xs text-t4">Streak: <span className="font-mono font-bold text-orange-400">{myStreak.current}d</span> (melhor: {myStreak.best}d)</span>
              </div>
            </CardBase>
          </div>
        );
      })()}
      </div>
      ); case 'alertas': return (
      <div key="alertas">
      {/* ── ALERTAS PESSOAIS ── */}
      <CardBase padding="none" className="overflow-hidden">
        <div className="px-4 py-3 border-b border-b1 flex items-center gap-2">
          <span className="text-sm">🔔</span>
          <h2 className="text-xs font-bold">Alertas Pessoais</h2>
        </div>
        <div className="divide-y divide-b1">
          {personalAlerts.length === 0 ? (
            <div className="text-center py-8 text-t3 text-sm">
              <CheckCircle2 size={24} className="mx-auto mb-2 text-vgreen opacity-50" />
              Tudo em dia! Continue assim 💪
            </div>
          ) : (
            personalAlerts.map((alert, i) => (
              <div key={i} className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <span className="text-base mt-0.5 shrink-0">{alert.icon}</span>
                  <p className="text-sm text-t2">{alert.msg}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardBase>
      </div>
      ); case 'team': return (
      <div key="team">
      {/* Team + Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Team */}
        <CardBase padding="none" className="lg:col-span-2 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-b1">
            <div>
              <h2 className="text-xs font-bold">Atividade do Time</h2>
              <p className="text-xs text-t3 mt-0.5">Score por canal — hoje</p>
            </div>
            <Badge variant={filledCount === totalMembers ? 'green' : 'red'}>
              {filledCount}/{totalMembers} preenchidos
            </Badge>
          </div>
          {teamData.length === 0 ? (
            <div className="text-center py-12 text-t3 text-sm">
              Sem membros. Cadastre em <strong>Time</strong> e preencha em <strong>Fill Diário</strong>.
            </div>
          ) : (
            <div className="divide-y divide-b1">
              {teamData.map((member, i) => (
                <div key={member.name} className="flex items-center gap-3 px-4 py-2.5 hover:bg-elevated/30 transition-colors">
                  <span className="w-7 text-center text-lg">
                    {i < 3 ? MEDALS[i] : <span className="text-xs text-t4 font-mono">#{i + 1}</span>}
                  </span>
                  <Avatar userId={member.id} name={member.name} size="w-9 h-9" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link to={`/perfil/${member.id}`} className="text-sm font-semibold truncate hover:text-vred transition-colors">{member.name}</Link>
                      <Badge variant={roleVariant(member.role)}>{member.role}</Badge>
                    </div>
                    {member.filled && (
                      <>
                        <div className="flex gap-2 mt-1">
                          {CHANNELS.map(ch => {
                            const val = member.channels[ch.id];
                            const v = typeof val === 'object' ? (val as any).a : val;
                            return (
                              <span key={ch.id} className="text-2xs text-t4">
                                {ch.icon} <span className="font-mono">{v || 0}</span>
                              </span>
                            );
                          })}
                        </div>
                        {member.obs && (
                          <div className="text-2xs text-t3 mt-1 italic truncate max-w-[300px]" title={member.obs}>
                            💬 {member.obs}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="text-right">
                    {member.filled ? (
                      <>
                        <div className="text-sm font-bold font-mono text-vred">{member.score} pts</div>
                        <div className="text-2xs text-t4 font-mono">{member.time}</div>
                      </>
                    ) : (
                      <Badge variant="red">Pendente</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBase>

        {/* Alerts */}
        <CardBase padding="none" className="overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-b1">
            <h2 className="text-xs font-bold">Alertas</h2>
          </div>
          <div className="divide-y divide-b1">
            {alerts.length === 0 ? (
              <div className="text-center py-12 text-t3 text-sm">Sem alertas</div>
            ) : (
              alerts.map((alert, i) => (
                <div key={i} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    {alert.type === 'warn' && <AlertTriangle size={16} className="text-vred mt-0.5 shrink-0" />}
                    {alert.type === 'ok' && <CheckCircle2 size={16} className="text-vgreen mt-0.5 shrink-0" />}
                    {alert.type === 'info' && <Clock size={16} className="text-vgold mt-0.5 shrink-0" />}
                    <div>
                      <p className="text-sm text-t2">{alert.msg}</p>
                      {alert.time && <p className="text-2xs text-t4 mt-1 font-mono">{alert.time}</p>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardBase>
      </div>
      </div>
      ); case 'heatmap': return (
      <div key="heatmap">
      {/* Activity heatmap — last 7 days */}
      <CardBase>
        <h2 className="text-xs font-bold text-t3 uppercase tracking-wider mb-3">Atividade do Time — 7 dias</h2>
        <div className="overflow-x-auto">
          <div className="min-w-[500px]">
            {/* Day headers */}
            <div className="flex items-center gap-1 mb-1 pl-24">
              {Array.from({ length: 7 }, (_, i) => {
                const d = new Date(); d.setDate(d.getDate() - (6 - i));
                return <div key={i} className="flex-1 text-center text-2xs text-t4 font-mono">{d.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3)}</div>;
              })}
            </div>
            {/* Member rows */}
            {users.slice(0, 10).map(u => {
              const cells = Array.from({ length: 7 }, (_, i) => {
                const d = new Date(); d.setDate(d.getDate() - (6 - i));
                const dateStr = d.toISOString().split('T')[0];
                const fillKey = `ops_fill_${dateStr}_${u.id}`;
                const fill = db.get<FillData>(fillKey);
                const score = fill ? calcScore(fill) : 0;
                // Intensity: 0=none, 1=low, 2=med, 3=high
                const intensity = score === 0 ? 0 : score < 30 ? 1 : score < 70 ? 2 : 3;
                const colors = ['bg-overlay', 'bg-vred/20', 'bg-vred/45', 'bg-vred'];
                return (
                  <div key={i} className="flex-1 px-0.5">
                    <div className={`h-5 rounded-sm ${colors[intensity]} transition-colors`}
                      title={`${u.name} · ${dateStr} · ${score} pts`} />
                  </div>
                );
              });
              return (
                <div key={u.id} className="flex items-center gap-1 mb-1">
                  <span className="w-24 text-2xs text-t3 truncate shrink-0 font-mono">{u.name.split(' ')[0]}</span>
                  {cells}
                </div>
              );
            })}
            {/* Legend */}
            <div className="flex items-center gap-2 mt-2 pl-24">
              <span className="text-2xs text-t4">Menos</span>
              {['bg-overlay', 'bg-vred/20', 'bg-vred/45', 'bg-vred'].map((c, i) => (
                <div key={i} className={`w-4 h-4 rounded-sm ${c}`} />
              ))}
              <span className="text-2xs text-t4">Mais</span>
            </div>
          </div>
        </div>
      </CardBase>
      </div>
      ); default: return null;
      }
      })}
    </div>
  );
}
