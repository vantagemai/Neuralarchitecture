import { useEffect, useState } from 'react';
import { getUsers, getTodayFills, getMonthSales, calcScore, fmt$, db } from '../lib/store';
import { getTotalXp } from '../lib/xp';
import { getStreak } from '../lib/streaks';
import { getLevelByXp } from '../lib/levels';
import { getUnlocked, ACHIEVEMENTS } from '../lib/achievements';
import { getGoals } from '../lib/goals';

const MEDALS = ['🥇', '🥈', '🥉'];
type Panel = 'activity' | 'revenue' | 'streaks' | 'achievements' | 'prizes';
const PANELS: Panel[] = ['activity', 'revenue', 'prizes', 'streaks', 'achievements'];
const PANEL_DURATION = 8000;

// Prize config
const PRIZE_LABELS: Record<string, string> = {
  top_closer: '🏆 Top Closer da Semana',
  top_setter: '🎯 Top Setter da Semana',
  iron_streak: '🔥 Sequência de Ferro',
  first10: '📱 First 10 Closes',
  diamond: '💎 Diamond Month',
  century: '🚀 Century Club',
};

function getAvatar(userId: string, name: string): { url: string | null; initials: string } {
  return {
    url: localStorage.getItem(`vantagem_avatar_${userId}`),
    initials: name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
  };
}

function Avatar({ userId, name, size = 'w-8 h-8' }: { userId: string; name: string; size?: string }) {
  const { url, initials } = getAvatar(userId, name);
  return url ? (
    <img src={url} alt={name} className={`${size} rounded-full object-cover border border-b1 shrink-0`} />
  ) : (
    <div className={`${size} rounded-full bg-gradient-to-br from-vred to-vred-dark flex items-center justify-center text-white text-[10px] font-bold shrink-0`}>
      {initials}
    </div>
  );
}

export function TvPage() {
  const [time, setTime] = useState(new Date());
  const [activePanel, setActivePanel] = useState<Panel>('activity');
  const [panelKey, setPanelKey] = useState(0);

  useEffect(() => {
    const clock = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    const rotation = setInterval(() => {
      setActivePanel(prev => {
        const idx = PANELS.indexOf(prev);
        return PANELS[(idx + 1) % PANELS.length];
      });
      setPanelKey(k => k + 1);
    }, PANEL_DURATION);
    return () => clearInterval(rotation);
  }, []);

  const users = getUsers().filter(u => u.active);
  const fills = getTodayFills();
  const sales = getMonthSales();

  const totalScore = fills.reduce((t, f) => t + calcScore(f), 0);
  const filledPct = users.length > 0 ? Math.round((fills.length / users.length) * 100) : 0;
  const totalComm = sales.reduce((t, s) => t + (s.sellerSetupComm || 0) + (s.sellerRecComm || 0), 0);

  // Team goal (sum of individual monthly revenue goals)
  const teamGoal = users.reduce((t, u) => t + (getGoals(u.id).monthlyRevenue || 0), 0);
  const teamProgress = teamGoal > 0 ? Math.min(100, Math.round((totalComm / teamGoal) * 100)) : 0;

  // Activity leaderboard
  const actSorted = [...fills].sort((a, b) => calcScore(b) - calcScore(a)).slice(0, 8);
  const maxScore = actSorted[0] ? calcScore(actSorted[0]) : 1;

  // Revenue leaderboard
  const revMap: Record<string, { id: string; name: string; comm: number; cnt: number }> = {};
  sales.forEach(s => {
    const id = s.sellerId || s.sellerName;
    if (!revMap[id]) revMap[id] = { id, name: s.sellerName, comm: 0, cnt: 0 };
    revMap[id].comm += (s.sellerSetupComm || 0) + (s.sellerRecComm || 0);
    revMap[id].cnt++;
  });
  const revSorted = Object.values(revMap).sort((a, b) => b.comm - a.comm).slice(0, 8);
  const maxComm = revSorted[0]?.comm || 1;

  // Streak leaderboard
  const streakData = users.map(u => ({
    id: u.id, name: u.name, streak: getStreak(u.id).current,
  })).filter(u => u.streak > 0).sort((a, b) => b.streak - a.streak).slice(0, 8);

  // XP/Level leaderboard
  const xpData = users.map(u => {
    const xp = getTotalXp(u.id);
    return { id: u.id, name: u.name, xp, level: getLevelByXp(xp), badges: getUnlocked(u.id).length };
  }).filter(u => u.xp > 0).sort((a, b) => b.xp - a.xp).slice(0, 8);

  // Recent achievements
  const recentAch = users.flatMap(u =>
    getUnlocked(u.id).map(a => ({
      userId: u.id, userName: u.name,
      achievement: ACHIEVEMENTS.find(ach => ach.id === a.id),
      unlockedAt: a.unlockedAt,
    }))
  ).filter(a => a.achievement).sort((a, b) => b.unlockedAt - a.unlockedAt).slice(0, 6);

  // Prizes from config
  const cfg = db.get<{ awards?: { prizes?: Record<string, string> } }>('ops_config');
  const prizes = cfg?.awards?.prizes || {};
  const prizeEntries = Object.entries(prizes).filter(([_, v]) => v);

  // Recent sale (last 5 min)
  const now = Date.now();
  const recentSale = sales.find(s => now - s.ts < 300000);

  // Shoutouts
  const shoutoutKeys = db.list('ops_shoutout_');
  const shoutouts = shoutoutKeys
    .map(k => db.get<{ fromName: string; toName: string; message: string; emoji: string; ts: number }>(k))
    .filter(Boolean)
    .sort((a, b) => b!.ts - a!.ts)
    .slice(0, 10);

  // Active challenges
  const challengeKeys = db.list('ops_challenge_');
  const activeChallenge = challengeKeys
    .map(k => db.get<{ id: string; title: string; prize: string; endDate: string; metric: string; target: number }>(k))
    .filter(c => c && new Date(c.endDate || '2099-01-01') > new Date())
    .sort((a, b) => new Date(a!.endDate).getTime() - new Date(b!.endDate).getTime())[0];

  const challengeCountdown = activeChallenge?.endDate
    ? (() => {
        const diff = new Date(activeChallenge.endDate).getTime() - now;
        if (diff <= 0) return 'Encerrado';
        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff % 86400000) / 3600000);
        return `${d}d ${h}h`;
      })()
    : null;

  return (
    <div className="space-y-4">
      {/* TV Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-vred flex items-center justify-center animate-pulse-glow">
            <span className="text-white font-black text-lg">V</span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wide">
              VANTAGEM<span className="text-vred">.ai</span>
              <span className="text-t4 text-sm ml-3">SALES FLOOR</span>
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Active challenge mini */}
          {activeChallenge && (
            <div className="flex items-center gap-2 bg-vgold/10 border border-vgold/20 rounded-lg px-3 py-1.5">
              <span className="text-xs font-bold text-vgold">🎯 {activeChallenge.title}</span>
              <span className="text-[10px] font-mono text-vgold">{challengeCountdown}</span>
            </div>
          )}
          <div className="flex items-center gap-3 text-xs font-mono text-vgreen">
            <span className="w-2 h-2 rounded-full bg-vgreen animate-pulse" />
            AO VIVO
            <span className="text-t4 ml-1">
              {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>
      </div>

      {/* Sale celebration banner */}
      {recentSale && (
        <div className="animate-sale-banner animate-sale-glow bg-vgreen/10 border border-vgreen/20 rounded-xl px-6 py-4 flex items-center gap-4">
          <Avatar userId={recentSale.sellerId} name={recentSale.sellerName} size="w-12 h-12" />
          <div className="flex-1">
            <div className="text-sm font-bold text-vgreen">NOVA VENDA!</div>
            <div className="text-lg font-bold">{recentSale.sellerName}</div>
          </div>
          <div className="text-right">
            <div className="font-mono text-2xl font-bold text-vgreen">{fmt$(recentSale.setupValue)}</div>
            <div className="text-[10px] text-t4">Setup + {fmt$(recentSale.recValue)}/mes</div>
          </div>
        </div>
      )}

      {/* Team goal progress */}
      {teamGoal > 0 && (
        <div className="bg-surface border border-b1 rounded-xl px-5 py-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-t3 uppercase tracking-wider font-bold">Meta do Time — Mes</span>
            <span className="font-mono text-sm font-bold">
              <span className="text-vgreen">{fmt$(totalComm)}</span>
              <span className="text-t4"> / {fmt$(teamGoal)}</span>
              <span className={`ml-2 ${teamProgress >= 100 ? 'text-vgreen' : 'text-vgold'}`}>{teamProgress}%</span>
            </span>
          </div>
          <div className="h-2 bg-overlay rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-1000 ${teamProgress >= 100 ? 'bg-vgreen' : 'bg-gradient-to-r from-vgold to-vgreen'}`}
              style={{ width: `${teamProgress}%` }} />
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { val: `${filledPct}%`, label: 'Fill Hoje', color: filledPct >= 100 ? 'text-vgreen' : 'text-vred' },
          { val: totalScore.toString(), label: 'Score Total', color: 'text-vred' },
          { val: sales.length.toString(), label: 'Vendas Mes', color: 'text-vgold' },
          { val: fmt$(totalComm), label: 'Comissoes', color: 'text-vgreen' },
        ].map((kpi, i) => (
          <div key={i} className="bg-surface border border-b1 rounded-xl p-4 text-center">
            <div className={`font-mono text-2xl font-bold ${kpi.color}`}>{kpi.val}</div>
            <div className="text-[10px] text-t4 uppercase tracking-wider mt-1">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Panel indicator */}
      <div className="flex gap-1 justify-center">
        {PANELS.map(p => (
          <button
            key={p}
            onClick={() => { setActivePanel(p); setPanelKey(k => k + 1); }}
            className={`h-1 rounded-full transition-all duration-500 ${
              activePanel === p ? 'w-8 bg-vred' : 'w-4 bg-muted'
            }`}
          />
        ))}
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-2 gap-5">
        {/* Left: Activity with avatars */}
        <div className="bg-surface border border-b1 rounded-xl p-5">
          <h2 className="text-vred font-bold text-sm uppercase tracking-wider mb-4">📊 Atividade — Hoje</h2>
          {actSorted.length === 0 ? (
            <div className="text-center py-8 text-t4 text-sm">Sem dados hoje</div>
          ) : (
            <div className="space-y-3">
              {actSorted.map((f, i) => {
                const score = calcScore(f);
                const level = getLevelByXp(getTotalXp(f.userId));
                const streak = getStreak(f.userId);
                return (
                  <div key={f.userId} className="animate-in">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 text-center text-base">{MEDALS[i] || <span className="text-[10px] text-t4 font-mono">#{i+1}</span>}</span>
                      <Avatar userId={f.userId} name={f.userName} size="w-7 h-7" />
                      <span className="flex-1 text-sm font-semibold truncate">
                        {f.userName}
                        <span className={`ml-1 text-xs ${level.color}`}>{level.icon}</span>
                        {streak.current > 0 && <span className="ml-1 text-[10px] text-orange-400">🔥{streak.current}</span>}
                      </span>
                      <span className="font-mono font-bold text-vred text-sm">{score}</span>
                    </div>
                    <div className="ml-[54px] mt-1 h-1.5 bg-overlay rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-vred to-red-400 rounded-full transition-all duration-1000"
                        style={{ width: `${Math.round((score / maxScore) * 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: rotating panel with animation */}
        <div className="bg-surface border border-b1 rounded-xl p-5 overflow-hidden">
          <div key={panelKey} className="animate-panel-in">
            {/* Revenue */}
            {activePanel === 'activity' && (
              <>
                <h2 className="text-vgreen font-bold text-sm uppercase tracking-wider mb-4">💰 Receita — Mes</h2>
                {revSorted.length === 0 ? (
                  <div className="text-center py-8 text-t4 text-sm">Sem vendas</div>
                ) : (
                  <div className="space-y-3">
                    {revSorted.map((r, i) => (
                      <div key={r.name} className="animate-in">
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 text-center text-base">{MEDALS[i] || <span className="text-[10px] text-t4 font-mono">#{i+1}</span>}</span>
                          <Avatar userId={r.id} name={r.name} size="w-7 h-7" />
                          <span className="flex-1 text-sm font-semibold truncate">
                            {r.name} <span className="text-t4 text-xs">({r.cnt})</span>
                          </span>
                          <span className="font-mono font-bold text-vgreen text-sm">{fmt$(r.comm)}</span>
                        </div>
                        <div className="ml-[54px] mt-1 h-1.5 bg-overlay rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-emerald-600 to-vgreen rounded-full transition-all duration-1000"
                            style={{ width: `${Math.round((r.comm / maxComm) * 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* XP */}
            {activePanel === 'revenue' && (
              <>
                <h2 className="text-vgold font-bold text-sm uppercase tracking-wider mb-4">⚡ XP Ranking</h2>
                <div className="space-y-3">
                  {xpData.map((u, i) => (
                    <div key={u.name} className="flex items-center gap-2.5 animate-in">
                      <span className="w-5 text-center text-base">{MEDALS[i] || <span className="text-[10px] text-t4 font-mono">#{i+1}</span>}</span>
                      <Avatar userId={u.id} name={u.name} size="w-7 h-7" />
                      <span className="flex-1 text-sm font-semibold truncate">
                        {u.name}
                        <span className={`ml-1 text-xs ${u.level.color}`}>{u.level.icon} {u.level.name}</span>
                      </span>
                      <span className="font-mono font-bold text-vgold text-sm">{u.xp.toLocaleString()}</span>
                    </div>
                  ))}
                  {xpData.length === 0 && <div className="text-center py-8 text-t4 text-sm">Nenhum XP</div>}
                </div>
              </>
            )}

            {/* Prizes */}
            {activePanel === 'prizes' && (
              <>
                <h2 className="text-vgold font-bold text-sm uppercase tracking-wider mb-4">🏆 Premiacoes do Mes</h2>
                {prizeEntries.length === 0 ? (
                  <div className="text-center py-8 text-t4 text-sm">Configure premiacoes em Config</div>
                ) : (
                  <div className="space-y-3">
                    {prizeEntries.map(([key, value]) => {
                      // Match prize to current leader
                      let leader: { name: string; id: string; value: string } | null = null;
                      if (key === 'top_closer' && revSorted[0]) leader = { name: revSorted[0].name, id: revSorted[0].id, value: fmt$(revSorted[0].comm) };
                      else if (key === 'top_setter') {
                        const setterFills = actSorted.filter(f => f.userRole === 'Setter');
                        if (setterFills[0]) leader = { name: setterFills[0].userName, id: setterFills[0].userId, value: `${calcScore(setterFills[0])} pts` };
                      }
                      else if (key === 'iron_streak' && streakData[0]) leader = { name: streakData[0].name, id: streakData[0].id, value: `${streakData[0].streak}d` };
                      else if (key === 'diamond' && revSorted[0]) leader = { name: revSorted[0].name, id: revSorted[0].id, value: fmt$(revSorted[0].comm) };

                      return (
                        <div key={key} className="bg-elevated border border-vgold/15 rounded-lg p-3 flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold">{PRIZE_LABELS[key] || key}</div>
                            <div className="text-sm font-bold text-vgold mt-0.5">{value}</div>
                          </div>
                          {leader && (
                            <div className="flex items-center gap-2 shrink-0">
                              <Avatar userId={leader.id} name={leader.name} size="w-8 h-8" />
                              <div className="text-right">
                                <div className="text-[11px] font-semibold">{leader.name}</div>
                                <div className="text-[10px] font-mono text-vgold">{leader.value}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* Streaks */}
            {activePanel === 'streaks' && (
              <>
                <h2 className="text-orange-400 font-bold text-sm uppercase tracking-wider mb-4">🔥 Streaks</h2>
                <div className="space-y-3">
                  {streakData.map((u, i) => (
                    <div key={u.name} className="flex items-center gap-2.5 animate-in">
                      <span className="w-5 text-center text-base">{MEDALS[i] || <span className="text-[10px] text-t4 font-mono">#{i+1}</span>}</span>
                      <Avatar userId={u.id} name={u.name} size="w-7 h-7" />
                      <span className="flex-1 text-sm font-semibold truncate">{u.name}</span>
                      <span className="font-mono font-bold text-orange-400">🔥 {u.streak}d</span>
                    </div>
                  ))}
                  {streakData.length === 0 && <div className="text-center py-8 text-t4 text-sm">Nenhum streak</div>}
                </div>
              </>
            )}

            {/* Achievements */}
            {activePanel === 'achievements' && (
              <>
                <h2 className="text-vpurp font-bold text-sm uppercase tracking-wider mb-4">⭐ Conquistas Recentes</h2>
                <div className="space-y-3">
                  {recentAch.map((a, i) => (
                    <div key={i} className="flex items-center gap-2.5 animate-in">
                      <span className="text-2xl">{a.achievement!.icon}</span>
                      <Avatar userId={a.userId} name={a.userName} size="w-7 h-7" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{a.achievement!.name}</div>
                        <div className="text-[10px] text-t4">{a.userName}</div>
                      </div>
                    </div>
                  ))}
                  {recentAch.length === 0 && <div className="text-center py-8 text-t4 text-sm">Nenhuma conquista</div>}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Shoutout ticker */}
      {shoutouts.length > 0 && (
        <div className="bg-surface border border-b1 rounded-xl overflow-hidden">
          <div className="flex items-center h-10">
            <div className="shrink-0 px-3 bg-elevated h-full flex items-center border-r border-b1">
              <span className="text-[10px] font-bold text-t3 uppercase tracking-wider">Shoutouts</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="animate-marquee whitespace-nowrap flex gap-8 px-4">
                {[...shoutouts, ...shoutouts].map((s, i) => (
                  <span key={i} className="text-xs text-t2 inline-flex items-center gap-1.5">
                    <span>{s!.emoji}</span>
                    <span className="font-semibold">{s!.fromName}</span>
                    <span className="text-t4">→</span>
                    <span className="font-semibold">{s!.toName}:</span>
                    <span className="text-t3">{s!.message}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
