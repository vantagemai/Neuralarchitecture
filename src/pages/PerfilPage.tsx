import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Zap, Flame, Award, Target, DollarSign, Calendar } from 'lucide-react';
import { getUsers, getMonthSales, db, fmt$, calcScore, type FillData } from '../lib/store';
import { getTotalXp } from '../lib/xp';
import { getStreak } from '../lib/streaks';
import { getLevel, getNextLevel } from '../lib/levels';
import { getUnlocked, ACHIEVEMENTS } from '../lib/achievements';
import { getGoalProgress } from '../lib/goals';
import { getScorecard } from '../lib/scorecard';
import { Badge } from '../components/ui/Badge';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { getTheme } from '../lib/theme';

const roleVariant = (r: string) => r === 'Setter' ? 'purp' as const : r === 'Founder' ? 'red' as const : 'gold' as const;

export function PerfilPage() {
  const { userId } = useParams<{ userId: string }>();
  const users = getUsers();
  const user = users.find(u => u.id === userId);

  if (!user) {
    return (
      <div className="text-center py-20">
        <div className="text-2xl mb-3">👤</div>
        <p className="text-t3">Membro nao encontrado</p>
        <Link to="/ranking" className="text-vred text-sm mt-2 inline-block">← Voltar ao Ranking</Link>
      </div>
    );
  }

  const xp = getTotalXp(userId);
  const level = getLevel(userId);
  const { next, progress, xpNeeded } = getNextLevel(userId);
  const streak = getStreak(userId);
  const badges = getUnlocked(userId);
  const scorecard = getScorecard(userId);
  const goalProgress = getGoalProgress(userId);
  const sales = useMemo(() => getMonthSales(), []);
  const mySales = sales.filter(s => s.sellerId === userId || s.sellerName === user.name);
  const totalComm = mySales.reduce((t, s) => t + (s.sellerSetupComm || 0) + (s.sellerRecComm || 0), 0);
  const avatar = localStorage.getItem(`vantagem_avatar_${userId}`);
  const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  // Fill history last 14 days
  const fillHistory = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const fill = db.get<FillData>(`ops_fill_${dateStr}_${userId}`);
    return { date: dateStr, score: fill ? calcScore(fill) : 0, filled: !!fill };
  });

  const dark = getTheme() === 'dark';
  const radarData = [
    { m: 'Atividade', v: scorecard.activity },
    { m: 'Receita', v: scorecard.revenue },
    { m: 'Consistencia', v: scorecard.consistency },
    { m: 'Fichas', v: scorecard.xp },
    { m: 'Badges', v: scorecard.badges },
  ];

  return (
    <div className="space-y-4 animate-in">
      {/* Back */}
      <Link to="/ranking" className="inline-flex items-center gap-1.5 text-xs text-t3 hover:text-t1 transition-colors">
        <ArrowLeft size={14} /> Voltar ao Ranking
      </Link>

      {/* Hero */}
      <div className="flex items-center gap-4 border-b border-b1 pb-4">
        {avatar ? (
          <img src={avatar} alt={user.name} className="w-20 h-20 rounded-lg object-cover border-2 border-b1" />
        ) : (
          <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-vred to-vred-dark flex items-center justify-center text-white text-2xl font-bold">{initials}</div>
        )}
        <div className="flex-1">
          <h1 className="text-lg font-bold">{user.name}</h1>
          <div className="flex items-center gap-3 mt-1.5">
            <Badge variant={roleVariant(user.role)}>{user.role}</Badge>
            <span className={`text-sm font-bold ${level.color}`}>{level.icon} {level.name}</span>
            <span className="text-xs font-mono text-vgold neon-gold">🪙 {xp.toLocaleString()}</span>
            {streak.current > 0 && <span className="text-xs font-mono text-orange-400">🔥 {streak.current}d</span>}
          </div>
          {/* Fichas progress */}
          {next && (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 max-w-[200px] h-2 bg-overlay rounded-sm overflow-hidden">
                <div className="h-full bg-vred rounded-sm transition-all" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-[10px] text-t4 font-mono">{xpNeeded} fichas para {next.icon} {next.name}</span>
            </div>
          )}
        </div>
        <div className="text-right hidden sm:block">
          <div className="text-xl font-bold font-mono text-vred neon-red">{scorecard.overall}</div>
          <div className="text-[10px] text-t4 uppercase tracking-wider">Scorecard</div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: 'Vendas Mes', value: mySales.length, icon: Target, color: 'text-vgold' },
          { label: 'Comissao', value: fmt$(totalComm), icon: DollarSign, color: 'text-vgreen' },
          { label: '🪙 Fichas Total', value: xp.toLocaleString(), icon: Zap, color: 'text-vgold' },
          { label: 'Streak', value: `${streak.current}d`, icon: Flame, color: 'text-orange-400' },
          { label: 'Best Streak', value: `${streak.best}d`, icon: Flame, color: 'text-t3' },
          { label: 'Badges', value: `${badges.length}/${ACHIEVEMENTS.length}`, icon: Award, color: 'text-vpurp' },
        ].map(s => (
          <div key={s.label} className="bg-surface border border-b1 border-l-[3px] border-l-b3 rounded-lg p-3">
            <div className="flex items-center gap-1 mb-1">
              <s.icon size={12} className="text-t4" />
              <span className="text-[9px] text-t4 uppercase tracking-wider">{s.label}</span>
            </div>
            <div className={`text-lg font-bold font-mono ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Scorecard radar */}
        <div className="bg-surface border border-b1 rounded-lg p-4">
          <h2 className="text-[11px] font-bold text-t3 uppercase tracking-wider mb-2">Scorecard</h2>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData}>
              <PolarGrid stroke={dark ? 'rgba(100,116,139,.15)' : 'rgba(0,0,0,.06)'} />
              <PolarAngleAxis dataKey="m" tick={{ fontSize: 10, fill: dark ? '#6B6B76' : '#7A7A88' }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar dataKey="v" stroke="#D4634B" fill="#D4634B" fillOpacity={0.2} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Goals */}
        <div className="bg-surface border border-b1 rounded-lg p-4">
          <h2 className="text-[11px] font-bold text-t3 uppercase tracking-wider mb-3">Metas</h2>
          <div className="space-y-3">
            {[
              { label: 'Contatos/dia', ...goalProgress.dailyContacts, color: 'bg-vred' },
              { label: 'Score/dia', ...goalProgress.dailyScore, color: 'bg-vpurp' },
              { label: 'Vendas/mes', ...goalProgress.monthlySales, color: 'bg-vgreen' },
              { label: 'Receita/mes', ...goalProgress.monthlyRevenue, color: 'bg-vgold' },
            ].map(g => (
              <div key={g.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-t3">{g.label}</span>
                  <span className="font-mono text-t2">{g.current}/{g.target} <span className={g.pct >= 100 ? 'text-vgreen' : 'text-t4'}>({g.pct}%)</span></span>
                </div>
                <div className="h-2 bg-overlay rounded-sm overflow-hidden">
                  <div className={`h-full ${g.color} rounded-sm transition-all`} style={{ width: `${g.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fill heatmap mini */}
      <div className="bg-surface border border-b1 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={14} className="text-t3" />
          <h2 className="text-[11px] font-bold text-t3 uppercase tracking-wider">Fills — Ultimos 14 dias</h2>
          <span className="text-[10px] font-mono text-t4 ml-auto">{fillHistory.filter(f => f.filled).length}/14 dias</span>
        </div>
        <div className="flex gap-1">
          {fillHistory.reverse().map(h => {
            const intensity = !h.filled ? 0 : h.score < 30 ? 1 : h.score < 70 ? 2 : 3;
            const colors = ['bg-overlay', 'bg-vred/20', 'bg-vred/45', 'bg-vred'];
            return (
              <div key={h.date} className="flex-1" title={`${h.date} · ${h.score} pts`}>
                <div className={`h-6 rounded-sm ${colors[intensity]}`} />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-t4 font-mono">14d atras</span>
          <span className="text-[9px] text-t4 font-mono">Hoje</span>
        </div>
      </div>

      {/* Badges */}
      <div className="bg-surface border border-b1 rounded-lg p-4">
        <h2 className="text-[11px] font-bold text-t3 uppercase tracking-wider mb-3">Conquistas ({badges.length}/{ACHIEVEMENTS.length})</h2>
        <div className="flex flex-wrap gap-2">
          {ACHIEVEMENTS.map(ach => {
            const unlocked = badges.some(b => b.id === ach.id);
            return (
              <div key={ach.id} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs ${
                unlocked ? 'bg-vgold/5 border-vgold/15 text-t1' : 'bg-elevated border-b1 text-t4 opacity-40'
              }`}>
                <span>{ach.icon}</span>
                <span className="font-semibold">{ach.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
