import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { EmptyState } from '../components/ui/EmptyState';
import { roleVariant } from '../lib/roles';
import { CHANNELS, getTodayFills, getMonthSales, getUsers, calcScore, fmt$, getSession, db, currentMonth } from '../lib/store';
import { getTotalFichas } from '../lib/xp';
import { getStreak } from '../lib/streaks';
import { getLevel, getLevelByXp } from '../lib/levels';
import { getUnlocked } from '../lib/achievements';

const MEDALS = ['🥇', '🥈', '🥉'];

type Tab = 'activity' | 'revenue' | 'xp';
type RoleFilter = 'all' | 'Setter' | 'Vendedor' | 'Partner' | 'Founder' | 'Social Seller';

const ROLE_FILTERS: { key: RoleFilter; label: string; icon: string }[] = [
  { key: 'all', label: 'Todos', icon: '👥' },
  { key: 'Setter', label: 'Setters', icon: '📞' },
  { key: 'Vendedor', label: 'Closers', icon: '🎯' },
  { key: 'Partner', label: 'Partners', icon: '🤝' },
  { key: 'Founder', label: 'Founders', icon: '👑' },
  { key: 'Social Seller', label: 'Social', icon: '📱' },
];

export function RankingPage() {
  const [tab, setTab] = useState<Tab>('activity');
  const [month, setMonth] = useState(currentMonth());
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const session = getSession();
  const fills = useMemo(() => getTodayFills(), []);
  const sales = useMemo(() => getMonthSales(month), [month]);

  const months = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    return { value: d.toISOString().slice(0, 7), label: d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) };
  }), []);
  const users = useMemo(() => getUsers().filter(u => u.active), []);

  const filterByRole = <T extends { role: string }>(data: T[]) =>
    roleFilter === 'all' ? data : data.filter(d => d.role === roleFilter);

  // Activity ranking
  const actDataAll = fills.map(f => {
    const channelBreakdown: Record<string, number> = {};
    CHANNELS.forEach(ch => {
      const v = f.channels?.[ch.id];
      channelBreakdown[ch.id] = typeof v === 'object' ? (parseInt(v.a) || 0) : (parseInt(String(v)) || 0);
    });
    return {
      id: f.userId, name: f.userName, role: f.userRole,
      score: calcScore(f), channels: channelBreakdown,
      streak: getStreak(f.userId).current, level: getLevel(f.userId),
    };
  }).sort((a, b) => b.score - a.score);
  const actData = filterByRole(actDataAll);

  // Revenue ranking
  const revMapAll: Record<string, { id: string; name: string; role: string; comm: number; sales: number; setterName?: string }> = {};
  sales.forEach(s => {
    const id = s.sellerId || s.sellerName;
    if (!revMapAll[id]) revMapAll[id] = {
      id, name: s.sellerName, role: s.sellerRole, comm: 0, sales: 0,
    };
    revMapAll[id].comm += (s.sellerSetupComm || 0) + (s.sellerRecComm || 0);
    revMapAll[id].sales++;
    if (s.setterName) revMapAll[id].setterName = s.setterName;
  });
  const revDataAll = Object.values(revMapAll).sort((a, b) => b.comm - a.comm);
  const revData = filterByRole(revDataAll);

  // Revenue by role (for donut)
  const revByRole = useMemo(() => {
    const map: Record<string, number> = {};
    revDataAll.forEach(r => { map[r.role] = (map[r.role] || 0) + r.comm; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [sales]);

  // Fichas ranking
  const xpDataAll = users.map(u => {
    const xp = getTotalFichas(u.id);
    return {
      id: u.id, name: u.name, role: u.role, xp, level: getLevelByXp(xp),
      streak: getStreak(u.id).current, badges: getUnlocked(u.id).length,
    };
  }).filter(u => u.xp > 0).sort((a, b) => b.xp - a.xp);
  const xpData = filterByRole(xpDataAll);

  const maxScore = actData[0]?.score || 1;
  const maxComm = revData[0]?.comm || 1;
  const maxXp = xpData[0]?.xp || 1;

  const cfg = db.get<{ awards?: { prizes?: Record<string, string> } }>('ops_config');
  const prizes = cfg?.awards?.prizes || {};

  const myFichas = getTotalFichas();
  const myLevel = getLevel();
  const myStreak = getStreak();

  // Role color for donut
  const roleColor = (r: string) =>
    r === 'Founder' ? '#D4634B' : r === 'Partner' ? '#8B7EC8' : r === 'Vendedor' ? '#5A9E6F' : r === 'Setter' ? '#6B8FBF' : '#C8963E';

  // Active role counts
  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const source = tab === 'activity' ? actDataAll : tab === 'revenue' ? revDataAll : xpDataAll;
    source.forEach(d => { counts[d.role] = (counts[d.role] || 0) + 1; });
    return counts;
  }, [tab, actDataAll, revDataAll, xpDataAll]);

  return (
    <div className="space-y-3 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Ranking</h1>
          <p className="text-sm text-t3 mt-0.5">Atividade vs Resultado vs Fichas</p>
        </div>
        <select value={month} onChange={e => setMonth(e.target.value)}
          className="bg-elevated border border-b1 rounded-lg px-3 py-2 text-sm font-mono outline-none cursor-pointer">
          {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>

      {/* My stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: myLevel.name, value: myLevel.icon, color: myLevel.color },
          { label: 'Fichas', value: `🪙 ${myFichas.toLocaleString()}`, color: 'text-vgold' },
          { label: 'Streak', value: `🔥 ${myStreak.current}d`, color: 'text-orange-400' },
          { label: 'Filtro', value: roleFilter === 'all' ? 'Todos' : roleFilter, color: 'text-vpurp' },
        ].map((s, i) => (
          <div key={i} className="bg-surface border border-b1 rounded-lg p-2 text-center">
            <div className={`font-mono text-sm font-bold ${s.color}`}>{s.value}</div>
            <div className="text-2xs text-t4 uppercase">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Role filter pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {ROLE_FILTERS.filter(rf => rf.key === 'all' || (roleCounts[rf.key] || 0) > 0).map(rf => (
          <button key={rf.key} onClick={() => setRoleFilter(rf.key)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              roleFilter === rf.key
                ? 'bg-vred/15 text-vred border border-vred/30'
                : 'text-t3 hover:text-t2 border border-transparent hover:border-b1'
            }`}>
            {rf.icon} {rf.label}
            {rf.key !== 'all' && roleCounts[rf.key] ? <span className="text-2xs text-t4 ml-0.5">({roleCounts[rf.key]})</span> : null}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-elevated rounded-lg p-1">
        {([
          { key: 'activity' as Tab, label: '📊 Atividade' },
          { key: 'revenue' as Tab, label: '💰 Receita' },
          { key: 'xp' as Tab, label: '🪙 Fichas' },
        ]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
              tab === t.key ? 'bg-surface text-t1 shadow-sm' : 'text-t3 hover:text-t2'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Revenue by role mini donut (only on revenue tab) */}
      {tab === 'revenue' && revByRole.length > 1 && (
        <div className="bg-surface border border-b1 rounded-lg p-3">
          <div className="text-2xs font-bold text-t3 uppercase tracking-wider mb-2">Receita por tipo</div>
          <div className="flex items-center gap-4">
            {/* Simple bar chart */}
            <div className="flex-1 space-y-1.5">
              {revByRole.map(([role, comm]) => {
                const totalComm = revByRole.reduce((s, [, c]) => s + c, 0);
                const pct = totalComm > 0 ? Math.round((comm / totalComm) * 100) : 0;
                return (
                  <div key={role} className="flex items-center gap-2">
                    <span className="text-2xs text-t3 w-16 truncate">{role}</span>
                    <div className="flex-1 h-3 bg-overlay rounded-sm overflow-hidden">
                      <div className="h-full rounded-sm transition-all" style={{ width: `${pct}%`, backgroundColor: roleColor(role) }} />
                    </div>
                    <span className="text-2xs font-mono text-t3 w-12 text-right">{fmt$(comm)}</span>
                    <span className="text-2xs text-t4 w-8 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="bg-surface border border-b1 rounded-lg overflow-hidden">
        {tab === 'activity' && (
          actData.length === 0 ? <EmptyState icon="🏆" message={'Sem fills registrados hoje' + (roleFilter !== 'all' ? ` (${roleFilter})` : '')} /> : (
            <div className="divide-y divide-b1">
              {actData.map((person, i) => (
                <div key={person.id + i} className={`px-3 py-2 hover:bg-elevated/30 transition-colors ${person.id === session?.id ? 'bg-vred/5 border-l-2 border-l-vred' : ''}`}>
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="w-6 text-center" style={{ fontSize: i < 3 ? '16px' : '11px' }}>
                      {MEDALS[i] || <span className="text-t4 font-mono">#{i + 1}</span>}
                    </span>
                    <Avatar userId={person.id} name={person.name} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Link to={`/perfil/${person.id}`} className="text-sm font-semibold truncate hover:text-vred transition-colors">{person.name}</Link>
                        <Badge variant={roleVariant(person.role)}>{person.role}</Badge>
                      </div>
                      {person.streak > 0 && <span className="text-2xs text-orange-400">🔥 {person.streak}d</span>}
                    </div>
                    <span className="font-mono font-bold text-vred">{person.score}</span>
                  </div>
                  <div className="flex gap-2 ml-9">
                    {CHANNELS.map(ch => (
                      <span key={ch.id} className="text-2xs text-t4">
                        {ch.icon} <span className="font-mono">{person.channels[ch.id] || 0}</span>
                      </span>
                    ))}
                  </div>
                  <div className="ml-9 mt-1 h-1.5 bg-overlay rounded-sm overflow-hidden">
                    <div className="h-full bg-vred rounded-sm transition-all duration-700" style={{ width: `${Math.round((person.score / maxScore) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'revenue' && (
          revData.length === 0 ? <EmptyState icon="🏆" message={'Sem vendas' + (roleFilter !== 'all' ? ` (${roleFilter})` : '')} /> : (
            <div className="divide-y divide-b1">
              {revData.map((person, i) => (
                <div key={person.id + i} className={`px-4 py-3 hover:bg-elevated/30 transition-colors ${person.id === session?.id ? 'bg-vgreen/5 border-l-2 border-l-vgreen' : ''}`}>
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="w-6 text-center" style={{ fontSize: i < 3 ? '16px' : '11px' }}>
                      {MEDALS[i] || <span className="text-t4 font-mono">#{i + 1}</span>}
                    </span>
                    <Avatar userId={person.id} name={person.name} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Link to={`/perfil/${person.id}`} className="text-sm font-semibold truncate hover:text-vred transition-colors">{person.name}</Link>
                        <Badge variant={roleVariant(person.role)}>{person.role}</Badge>
                      </div>
                      <div className="text-2xs text-t4 mt-0.5">
                        {person.sales} venda(s)
                        {person.setterName && <span className="ml-1 text-vpurp">via {person.setterName}</span>}
                        {i === 0 && prizes.top_closer && <span className="ml-2 text-vgold">🏆 {prizes.top_closer}</span>}
                      </div>
                    </div>
                    <span className="font-mono font-bold text-vgreen">{fmt$(person.comm)}</span>
                  </div>
                  <div className="ml-9 h-1.5 bg-overlay rounded-sm overflow-hidden">
                    <div className="h-full bg-vgreen rounded-sm transition-all duration-700" style={{ width: `${Math.round((person.comm / maxComm) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'xp' && (
          xpData.length === 0 ? <EmptyState icon="🏆" message={'Nenhuma ficha' + (roleFilter !== 'all' ? ` (${roleFilter})` : '')} /> : (
            <div className="divide-y divide-b1">
              {xpData.map((person, i) => (
                <div key={person.id} className={`px-4 py-3 hover:bg-elevated/30 transition-colors ${person.id === session?.id ? 'bg-vgold/5 border-l-2 border-l-vgold' : ''}`}>
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center" style={{ fontSize: i < 3 ? '16px' : '11px' }}>
                      {MEDALS[i] || <span className="text-t4 font-mono">#{i + 1}</span>}
                    </span>
                    <Avatar userId={person.id} name={person.name} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Link to={`/perfil/${person.id}`} className="text-sm font-semibold truncate hover:text-vred transition-colors">{person.name}</Link>
                        <span className={`text-xs ${person.level.color}`}>{person.level.icon} {person.level.name}</span>
                        <Badge variant={roleVariant(person.role)}>{person.role}</Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {person.streak > 0 && <span className="text-2xs text-orange-400">🔥 {person.streak}d</span>}
                        <span className="text-2xs text-vpurp">{person.badges} badges</span>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-vgold">🪙 {person.xp.toLocaleString()}</span>
                  </div>
                  <div className="ml-9 mt-1.5 h-1.5 bg-overlay rounded-sm overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-vgold-dark to-vgold rounded-sm transition-all duration-700" style={{ width: `${Math.round((person.xp / maxXp) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
