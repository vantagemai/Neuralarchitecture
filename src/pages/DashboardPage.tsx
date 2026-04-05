import { useMemo } from 'react';
import { KpiCard } from '../components/ui/KpiCard';
import { Badge } from '../components/ui/Badge';
import {
  DollarSign, Users, Target, TrendingUp,
  AlertTriangle, CheckCircle2, Clock, Activity, Flame
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { getUsers, getTodayFills, getMonthSales, calcScore, db, today, fmt$, CHANNELS, type FillData, getSession } from '../lib/store';
import { ShoutoutFeed } from '../components/ops/ShoutoutFeed';
import { getScorecard } from '../lib/scorecard';
import { getGoalProgress } from '../lib/goals';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { getTheme } from '../lib/theme';
import { getStreak } from '../lib/streaks';
import { getLevel } from '../lib/levels';
import { getTotalXp } from '../lib/xp';

// Theme-aware chart colors
function chartColors() {
  const dark = getTheme() === 'dark';
  return {
    grid: dark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.07)',
    tick: dark ? '#6B6B76' : '#7A7A88',
    tooltipBg: dark ? '#17171C' : '#FFFFFF',
    tooltipBorder: dark ? '1px solid rgba(255,255,255,.1)' : '1px solid rgba(0,0,0,.1)',
    tooltipLabel: dark ? '#A8A8B0' : '#4A4A55',
    polarGrid: dark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.08)',
  };
}

const MEDALS = ['🥇', '🥈', '🥉'];
const roleVariant = (r: string) => r === 'Setter' ? 'purp' as const : r === 'Founder' ? 'red' as const : 'gold' as const;

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

export function DashboardPage() {
  const users = useMemo(() => getUsers().filter(u => u.active), []);
  const fills = useMemo(() => getTodayFills(), []);
  const sales = useMemo(() => getMonthSales(), []);
  const activityTrend = useMemo(() => getLast7DaysFills(), []);
  const salesTrend = useMemo(() => getMonthSalesTrend(), []);


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
    <div className="space-y-6">
      {/* Hero header */}
      <div className="bg-gradient-to-r from-vred/8 via-surface to-surface border border-b1 rounded-2xl px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {(() => {
              const avatar = localStorage.getItem(`vantagem_avatar_${session?.id || ''}`);
              const initials = (session?.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
              return avatar ? (
                <img src={avatar} alt="" className="w-14 h-14 rounded-2xl object-cover border-2 border-vred/20" />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-vred to-vred-dark flex items-center justify-center text-white text-lg font-bold">{initials}</div>
              );
            })()}
            <div>
              <h1 className="text-2xl font-bold">{greeting}, {session?.name?.split(' ')[0] || 'Usuario'}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className={`text-xs font-bold ${myLevel.color}`}>{myLevel.icon} {myLevel.name}</span>
                <span className="text-xs font-mono text-vgold">{myXp.toLocaleString()} XP</span>
                {myStreak.current > 0 && <span className="text-xs text-orange-400 flex items-center gap-0.5"><Flame size={11} />{myStreak.current}d</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-t3 font-mono hidden sm:block">
              {now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-vgreen bg-vgreen/8 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-vgreen animate-pulse" />
              Ao vivo
            </span>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Receita Mês" value={fmt$(totalComm)} icon={DollarSign} color="green" trendLabel={`${totalSalesMonth} vendas`} highlight />
        <KpiCard label="Vendas Mês" value={totalSalesMonth} icon={Target} color="gold" />
        <KpiCard label="Time" value={`${filledCount}/${totalMembers}`} icon={Users} color="blue" trendLabel="preencheram hoje" />
        <KpiCard label="Score Total" value={totalScore} icon={TrendingUp} color="red" trendLabel="pts hoje" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity trend */}
        <div className="bg-surface border border-b1 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} className="text-vred" />
            <h2 className="text-sm font-bold">Atividade — Últimos 7 dias</h2>
          </div>
          {(() => { const cc = chartColors(); return (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={activityTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke={cc.grid} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: cc.tick }} />
              <YAxis tick={{ fontSize: 10, fill: cc.tick }} />
              <Tooltip
                contentStyle={{ background: cc.tooltipBg, border: cc.tooltipBorder, borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: cc.tooltipLabel }}
              />
              <Bar dataKey="score" fill="#F11013" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          ); })()}
        </div>

        {/* Sales trend */}
        <div className="bg-surface border border-b1 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign size={16} className="text-vgreen" />
            <h2 className="text-sm font-bold">Comissões — Últimos 7 dias</h2>
          </div>
          {(() => { const cc = chartColors(); return (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={salesTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke={cc.grid} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: cc.tick }} />
              <YAxis tick={{ fontSize: 10, fill: cc.tick }} />
              <Tooltip
                contentStyle={{ background: cc.tooltipBg, border: cc.tooltipBorder, borderRadius: 8, fontSize: 12 }}
                formatter={(value: any) => ['$' + value, 'Comissão']}
              />
              <Line type="monotone" dataKey="comissao" stroke="#00C864" strokeWidth={2} dot={{ fill: '#00C864', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
          ); })()}
        </div>
      </div>

      {/* Scorecard + Goals */}
      {(() => {
        const sc = getScorecard();
        const gp = getGoalProgress();
        const radarData = [
          { metric: 'Atividade', value: sc.activity },
          { metric: 'Receita', value: sc.revenue },
          { metric: 'Consistencia', value: sc.consistency },
          { metric: 'XP', value: sc.xp },
          { metric: 'Badges', value: sc.badges },
        ];
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Scorecard */}
            <div className="bg-surface border border-b1 rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-bold">Scorecard Pessoal</h2>
                <span className="font-mono text-2xl font-bold text-vred">{sc.overall}<span className="text-xs text-t4">/100</span></span>
              </div>
              {(() => { const cc = chartColors(); return (
              <ResponsiveContainer width="100%" height={180}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke={cc.polarGrid} />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: cc.tick }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar dataKey="value" stroke="#F11013" fill="#F11013" fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
              ); })()}
            </div>

            {/* Goals progress */}
            <div className="bg-surface border border-b1 rounded-xl p-5">
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
                    <div className="h-1.5 bg-overlay rounded-full overflow-hidden">
                      <div className={`h-full ${g.color} rounded-full transition-all duration-1000`} style={{ width: `${g.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Team + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team */}
        <div className="lg:col-span-2 bg-surface border border-b1 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-b1">
            <div>
              <h2 className="text-[15px] font-bold">Atividade do Time</h2>
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
                <div key={member.name} className="flex items-center gap-4 px-5 py-3.5 hover:bg-elevated/50 transition-colors">
                  <span className="w-7 text-center text-lg">
                    {i < 3 ? MEDALS[i] : <span className="text-xs text-t4 font-mono">#{i + 1}</span>}
                  </span>
                  {(() => {
                    const u = users.find(x => x.name === member.name);
                    const av = u ? localStorage.getItem(`vantagem_avatar_${u.id}`) : null;
                    const ini = member.name.split(' ').map(n => n[0]).join('').slice(0, 2);
                    return av ? (
                      <img src={av} alt={member.name} className="w-9 h-9 rounded-full object-cover border border-b1 shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-vred to-vred-dark flex items-center justify-center text-white text-[10px] font-bold shrink-0">{ini}</div>
                    );
                  })()}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold truncate">{member.name}</span>
                      <Badge variant={roleVariant(member.role)}>{member.role}</Badge>
                    </div>
                    {member.filled && (
                      <>
                        <div className="flex gap-2 mt-1">
                          {CHANNELS.map(ch => {
                            const val = member.channels[ch.id];
                            const v = typeof val === 'object' ? (val as any).a : val;
                            return (
                              <span key={ch.id} className="text-[10px] text-t4">
                                {ch.icon} <span className="font-mono">{v || 0}</span>
                              </span>
                            );
                          })}
                        </div>
                        {member.obs && (
                          <div className="text-[10px] text-t3 mt-1 italic truncate max-w-[300px]" title={member.obs}>
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
                        <div className="text-[10px] text-t4 font-mono">{member.time}</div>
                      </>
                    ) : (
                      <Badge variant="red">Pendente</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alerts */}
        <div className="bg-surface border border-b1 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-b1">
            <h2 className="text-[15px] font-bold">Alertas</h2>
          </div>
          <div className="divide-y divide-b1">
            {alerts.length === 0 ? (
              <div className="text-center py-12 text-t3 text-sm">Sem alertas</div>
            ) : (
              alerts.map((alert, i) => (
                <div key={i} className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    {alert.type === 'warn' && <AlertTriangle size={16} className="text-vred mt-0.5 shrink-0" />}
                    {alert.type === 'ok' && <CheckCircle2 size={16} className="text-vgreen mt-0.5 shrink-0" />}
                    {alert.type === 'info' && <Clock size={16} className="text-vgold mt-0.5 shrink-0" />}
                    <div>
                      <p className="text-sm text-t2">{alert.msg}</p>
                      {alert.time && <p className="text-[10px] text-t4 mt-1 font-mono">{alert.time}</p>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Shoutouts */}
      <div>
        <h2 className="text-[15px] font-bold mb-3">💬 Reconhecimentos</h2>
        <ShoutoutFeed />
      </div>

      {/* Recent sales */}
      <div className="bg-surface border border-b1 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-b1">
          <h2 className="text-[15px] font-bold">Vendas Recentes</h2>
        </div>
        {sales.length === 0 ? (
          <div className="text-center py-12 text-t3 text-sm">Registre vendas em <strong>Vendas</strong></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-elevated/50">
                  {['Vendedor', 'Data', 'Setup', 'Rec/mês', 'Comissão'].map(h => (
                    <th key={h} className="text-left text-[10px] text-t4 uppercase tracking-wider font-semibold px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-b1">
                {sales.sort((a, b) => b.ts - a.ts).slice(0, 5).map(s => (
                  <tr key={s.id} className="hover:bg-elevated/30 transition-colors">
                    <td className="px-5 py-3.5 text-sm font-semibold">{s.sellerName}</td>
                    <td className="px-5 py-3.5 text-sm text-t3 font-mono">{s.date}</td>
                    <td className="px-5 py-3.5 text-sm font-mono">${s.setupValue}</td>
                    <td className="px-5 py-3.5 text-sm font-mono">${s.recValue}</td>
                    <td className="px-5 py-3.5 text-sm font-mono font-bold text-vgreen">{fmt$(s.sellerSetupComm + s.sellerRecComm)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
