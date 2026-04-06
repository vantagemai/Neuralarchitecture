import { useMemo, useState } from 'react';
import { Badge } from '../components/ui/Badge';
import { CHANNELS, getTodayFills, getMonthSales, getUsers, calcScore, fmt$, getSession, db, currentMonth } from '../lib/store';
import { getTotalXp } from '../lib/xp';
import { getStreak } from '../lib/streaks';
import { getLevel, getLevelByXp } from '../lib/levels';
import { getUnlocked } from '../lib/achievements';

const MEDALS = ['🥇', '🥈', '🥉'];
const roleVariant = (r: string) => r === 'Setter' ? 'purp' as const : r === 'Founder' ? 'red' as const : 'gold' as const;

type Tab = 'activity' | 'revenue' | 'xp';

export function RankingPage() {
  const [tab, setTab] = useState<Tab>('activity');
  const [month, setMonth] = useState(currentMonth());
  const session = getSession();
  const fills = useMemo(() => getTodayFills(), []);
  const sales = useMemo(() => getMonthSales(month), [month]);

  const months = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    return { value: d.toISOString().slice(0, 7), label: d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) };
  }), []);
  const users = useMemo(() => getUsers().filter(u => u.active), []);

  // Activity ranking from real fills
  const actData = fills.map(f => {
    const channelBreakdown: Record<string, number> = {};
    CHANNELS.forEach(ch => {
      const v = f.channels?.[ch.id];
      channelBreakdown[ch.id] = typeof v === 'object' ? (parseInt(v.a) || 0) : (parseInt(String(v)) || 0);
    });
    const streak = getStreak(f.userId);
    const level = getLevel(f.userId);
    return {
      id: f.userId, name: f.userName, role: f.userRole,
      score: calcScore(f), channels: channelBreakdown,
      streak: streak.current, level,
      avatar: localStorage.getItem(`vantagem_avatar_${f.userId}`) || null,
    };
  }).sort((a, b) => b.score - a.score);

  // Revenue ranking from real sales
  const revMap: Record<string, { id: string; name: string; role: string; comm: number; sales: number; avatar: string | null }> = {};
  sales.forEach(s => {
    const id = s.sellerId || s.sellerName;
    if (!revMap[id]) revMap[id] = {
      id, name: s.sellerName, role: s.sellerRole, comm: 0, sales: 0,
      avatar: localStorage.getItem(`vantagem_avatar_${s.sellerId}`) || null,
    };
    revMap[id].comm += (s.sellerSetupComm || 0) + (s.sellerRecComm || 0);
    revMap[id].sales++;
  });
  const revData = Object.values(revMap).sort((a, b) => b.comm - a.comm);

  // Prizes config
  const cfg = db.get<{ awards?: { prizes?: Record<string, string> } }>('ops_config');
  const prizes = cfg?.awards?.prizes || {};

  const getPercentile = (rank: number, total: number) => total > 0 && rank > 0 ? Math.round(((total - rank + 1) / total) * 100) : 0;

  // XP ranking across all users
  const xpData = users.map(u => {
    const xp = getTotalXp(u.id);
    const level = getLevelByXp(xp);
    const streak = getStreak(u.id);
    const badges = getUnlocked(u.id).length;
    return {
      id: u.id, name: u.name, role: u.role, xp, level,
      streak: streak.current, badges,
      avatar: localStorage.getItem(`vantagem_avatar_${u.id}`) || null,
    };
  }).filter(u => u.xp > 0).sort((a, b) => b.xp - a.xp);

  const maxScore = actData[0]?.score || 1;
  const maxComm = revData[0]?.comm || 1;
  const maxXp = xpData[0]?.xp || 1;

  // My position
  const myActRank = actData.findIndex(a => a.id === session?.id) + 1;
  const myRevRank = revData.findIndex(r => r.id === session?.id) + 1;
  const myXpRank = xpData.findIndex(x => x.id === session?.id) + 1;

  // My stats for comparison
  const myXp = getTotalXp();
  const myLevel = getLevel();
  const myStreak = getStreak();
  const myBadges = getUnlocked().length;

  const emptyMsg = (text: string) => (
    <div className="text-center py-16">
      <div className="text-3xl mb-3">🏆</div>
      <p className="text-sm text-t3">{text}</p>
      <p className="text-xs text-t4 mt-2">Os dados aparecem quando alguem preenche o Fill Diario ou registra vendas.</p>
    </div>
  );

  const renderAvatar = (name: string, avatarUrl: string | null, size = 'w-8 h-8') => {
    const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2);
    return avatarUrl ? (
      <img src={avatarUrl} alt={name} className={`${size} rounded-full object-cover border border-b1`} />
    ) : (
      <div className={`${size} rounded-full bg-gradient-to-br from-vred to-vred-dark flex items-center justify-center text-white text-[10px] font-bold shrink-0`}>
        {initials}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ranking</h1>
          <p className="text-sm text-t3 mt-1">Atividade vs Resultado vs XP</p>
        </div>
        <select value={month} onChange={e => setMonth(e.target.value)}
          className="bg-elevated border border-b1 rounded-lg px-3 py-2 text-sm font-mono outline-none cursor-pointer">
          {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>

      {/* My stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-surface border border-b1 rounded-lg p-3 text-center">
          <div className="text-sm">{myLevel.icon}</div>
          <div className={`text-xs font-bold ${myLevel.color}`}>{myLevel.name}</div>
        </div>
        <div className="bg-surface border border-b1 rounded-lg p-3 text-center">
          <div className="font-mono text-sm font-bold text-vgold">{myXp.toLocaleString()} XP</div>
        </div>
        <div className="bg-surface border border-b1 rounded-lg p-3 text-center">
          <div className="font-mono text-sm font-bold text-orange-400">🔥 {myStreak.current}d</div>
        </div>
        <div className="bg-surface border border-b1 rounded-lg p-3 text-center">
          <div className="font-mono text-sm font-bold text-vpurp">{myBadges} badges</div>
        </div>
        <div className="bg-surface border border-b1 rounded-lg p-3 text-center">
          <div className="text-[10px] text-t3 uppercase">Posicao</div>
          <div className="font-mono text-sm font-bold text-vred">
            {tab === 'activity' && myActRank > 0 ? `#${myActRank}` : tab === 'revenue' && myRevRank > 0 ? `#${myRevRank}` : myXpRank > 0 ? `#${myXpRank}` : '—'}
            <span className="text-[10px] text-t4 ml-1">
              top {tab === 'activity' ? getPercentile(myActRank, actData.length) : tab === 'revenue' ? getPercentile(myRevRank, revData.length) : getPercentile(myXpRank, xpData.length)}%
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-elevated rounded-lg p-1">
        {[
          { key: 'activity' as Tab, label: '📊 Atividade Hoje' },
          { key: 'revenue' as Tab, label: '💰 Receita Mes' },
          { key: 'xp' as Tab, label: '⚡ XP Total' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
              tab === t.key ? 'bg-surface text-t1 shadow-sm' : 'text-t3 hover:text-t2'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-surface border border-b1 rounded-lg overflow-hidden">
        {tab === 'activity' && (
          actData.length === 0 ? emptyMsg('Sem fills registrados hoje') : (
            <div className="divide-y divide-b1">
              {actData.map((person, i) => (
                <div key={person.name} className={`px-5 py-3.5 hover:bg-elevated/50 transition-colors ${person.id === session?.id ? 'bg-vred/5 border-l-2 border-l-vred' : ''}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="w-7 text-center text-lg">
                      {MEDALS[i] || <span className="text-xs text-t4 font-mono">#{i + 1}</span>}
                    </span>
                    {renderAvatar(person.name, person.avatar)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold truncate">{person.name}</span>
                        <span className={`text-xs ${person.level.color}`}>{person.level.icon}</span>
                        <Badge variant={roleVariant(person.role)}>{person.role}</Badge>
                      </div>
                      {person.streak > 0 && (
                        <div className="text-[10px] text-orange-400 mt-0.5">🔥 {person.streak}d streak</div>
                      )}
                    </div>
                    <span className="font-mono font-bold text-vred">{person.score} pts</span>
                  </div>
                  <div className="flex gap-2 ml-10">
                    {CHANNELS.map(ch => (
                      <span key={ch.id} className="text-[10px] text-t4">
                        {ch.icon} <span className="font-mono">{person.channels[ch.id] || 0}</span>
                      </span>
                    ))}
                  </div>
                  <div className="ml-10 mt-2 h-2 bg-overlay rounded-sm overflow-hidden">
                    <div className="h-full bg-vred rounded-sm transition-all duration-1000" style={{ width: `${Math.round((person.score / maxScore) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'revenue' && (
          revData.length === 0 ? emptyMsg('Sem vendas registradas este mes') : (
            <div className="divide-y divide-b1">
              {revData.map((person, i) => (
                <div key={person.name} className={`px-5 py-4 hover:bg-elevated/50 transition-colors ${person.id === session?.id ? 'bg-vgreen/5 border-l-2 border-l-vgreen' : ''}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="w-7 text-center text-lg">
                      {MEDALS[i] || <span className="text-xs text-t4 font-mono">#{i + 1}</span>}
                    </span>
                    {renderAvatar(person.name, person.avatar)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold truncate">{person.name}</span>
                        <Badge variant={roleVariant(person.role)}>{person.role}</Badge>
                      </div>
                      <div className="text-[10px] text-t4 mt-0.5">
                        {person.sales} venda(s)
                        {i === 0 && prizes.top_closer && <span className="ml-2 text-vgold">🏆 {prizes.top_closer}</span>}
                      </div>
                    </div>
                    <span className="font-mono font-bold text-vgreen">{fmt$(person.comm)}</span>
                  </div>
                  <div className="ml-10 h-2 bg-overlay rounded-sm overflow-hidden">
                    <div className="h-full bg-vgreen rounded-sm transition-all duration-1000" style={{ width: `${Math.round((person.comm / maxComm) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'xp' && (
          xpData.length === 0 ? emptyMsg('Nenhum XP registrado ainda') : (
            <div className="divide-y divide-b1">
              {xpData.map((person, i) => (
                <div key={person.id} className={`px-5 py-4 hover:bg-elevated/50 transition-colors ${person.id === session?.id ? 'bg-vgold/5 border-l-2 border-l-vgold' : ''}`}>
                  <div className="flex items-center gap-3">
                    <span className="w-7 text-center text-lg">
                      {MEDALS[i] || <span className="text-xs text-t4 font-mono">#{i + 1}</span>}
                    </span>
                    {renderAvatar(person.name, person.avatar)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold truncate">{person.name}</span>
                        <span className={`text-xs ${person.level.color}`}>{person.level.icon} {person.level.name}</span>
                        <Badge variant={roleVariant(person.role)}>{person.role}</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {person.streak > 0 && <span className="text-[10px] text-orange-400">🔥 {person.streak}d</span>}
                        <span className="text-[10px] text-vpurp">{person.badges} badges</span>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-vgold">{person.xp.toLocaleString()} XP</span>
                  </div>
                  <div className="ml-10 mt-2 h-2 bg-overlay rounded-sm overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-vgold-dark to-vgold rounded-sm transition-all duration-1000" style={{ width: `${Math.round((person.xp / maxXp) * 100)}%` }} />
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
