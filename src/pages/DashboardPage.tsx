import { useMemo, useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { KpiCard } from '../components/ui/KpiCard';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import {
  DollarSign, Users, Target, TrendingUp,
  AlertTriangle, CheckCircle2, Clock, Activity,
  Settings2, GripVertical, Eye, EyeOff, ChevronUp, ChevronDown, RotateCcw
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { getUsers, getTodayFills, getMonthSales, calcScore, db, today, fmt$, CHANNELS, type FillData, getSession } from '../lib/store';

import { CardBase } from '../components/ui/CardBase';
import { getScorecard } from '../lib/scorecard';
import { getGoalProgress } from '../lib/goals';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { chartColors } from '../lib/theme';
import { getStreak } from '../lib/streaks';
import { getLevel } from '../lib/levels';
import { getTotalXp } from '../lib/xp';
import { getMonthBonus } from '../lib/bonus';
import { roleVariant } from '../lib/roles';

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
type SectionId = 'kpis' | 'bonus' | 'charts' | 'scorecard' | 'team' | 'heatmap';

interface SectionConfig { id: SectionId; visible: boolean }

const DEFAULT_SECTIONS: SectionConfig[] = [
  { id: 'kpis', visible: true },
  { id: 'bonus', visible: true },
  { id: 'charts', visible: true },
  { id: 'scorecard', visible: true },
  { id: 'team', visible: true },
  { id: 'heatmap', visible: true },
];

const SECTION_LABELS: Record<SectionId, { label: string; icon: string }> = {
  kpis: { label: 'KPIs', icon: '📊' },
  bonus: { label: 'Bonus Setter', icon: '🎯' },
  charts: { label: 'Graficos', icon: '📈' },
  scorecard: { label: 'Scorecard + Metas', icon: '🎯' },
  team: { label: 'Time + Alertas', icon: '👥' },
  heatmap: { label: 'Heatmap Atividade', icon: '🔥' },
};

const LAYOUT_KEY = 'vops_dashboard_layout';

function loadLayout(): SectionConfig[] {
  try {
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

      case 'kpis': return (
      <div key="kpis">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Receita Mês" value={fmt$(totalComm)} icon={DollarSign} color="green" trendLabel={`${totalSalesMonth} vendas`} sparkData={salesTrend.map(d => d.comissao)} />
        <KpiCard label="Vendas Mês" value={totalSalesMonth} icon={Target} color="gold" sparkData={salesTrend.map(d => d.vendas)} />
        <KpiCard label="Time" value={`${filledCount}/${totalMembers}`} icon={Users} color="blue" trendLabel="preencheram" />
        <KpiCard label="Score Total" value={totalScore} icon={TrendingUp} color="red" trendLabel="pts hoje" sparkData={activityTrend.map(d => d.score)} />
      </div>
      </div>
      ); case 'bonus': return (
      <div key="bonus">
      {/* Setter Bonus Mini Card */}
      {(session?.role === 'Setter' || session?.role === 'Social Seller') && (() => {
        const b = getMonthBonus(session?.id || 'anon');
        return (
          <div className="bg-surface border border-vgold/20 border-l-2 border-l-vgold rounded-lg px-4 py-3 flex items-center gap-4">
            <span className="text-lg">🎯</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-vgold">Bonus Setter</span>
                <span className="text-2xs text-t4">{b.meetings} reunioes realizadas</span>
              </div>
              <div className="h-1.5 bg-overlay rounded-full overflow-hidden mt-1 max-w-[200px]">
                <div className="h-full bg-vgold rounded-full transition-all" style={{ width: `${b.progress}%` }} />
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-mono font-bold text-vgold">${b.bonus}</div>
              <div className="text-2xs text-t4">{b.nextAt > 0 && b.meetings > 0 ? `${b.nextAt} para +$100` : ''}</div>
            </div>
          </div>
        );
      })()}
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
      ); case 'scorecard': return (
      <div key="scorecard">
      {/* Scorecard + Goals */}
      {(() => {
        const sc = getScorecard();
        const gp = getGoalProgress();
        const radarData = [
          { metric: 'Atividade', value: sc.activity },
          { metric: 'Receita', value: sc.revenue },
          { metric: 'Consistencia', value: sc.consistency },
          { metric: 'Fichas', value: sc.xp },
          { metric: 'Badges', value: sc.badges },
        ];
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
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

            {/* Goals progress */}
            <CardBase>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold">Metas</h2>
                <span className="font-mono text-sm font-bold text-vgold">{gp.overall}% geral</span>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Contatos hoje', ...gp.dailyContacts, color: 'bg-vred' },
                  { label: 'Score hoje', ...gp.dailyScore, color: 'bg-vpurp' },
                  { label: 'Vendas mes', ...gp.monthlySales, color: 'bg-vgreen' },
                  { label: 'Receita mes', ...gp.monthlyRevenue, color: 'bg-vgold' },
                ].map(g => (
                  <div key={g.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-t3">{g.label}</span>
                      <span className="font-mono text-t2">{g.current}/{g.target} ({g.pct}%)</span>
                    </div>
                    <div className="h-2 bg-overlay rounded-sm overflow-hidden">
                      <div className={`h-full ${g.color} rounded-full transition-all duration-1000`} style={{ width: `${g.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardBase>
          </div>
        );
      })()}
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
