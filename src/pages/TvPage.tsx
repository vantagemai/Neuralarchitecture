import { useEffect, useState } from 'react';
import { getUsers, getTodayFills, getMonthSales, calcScore, fmt$ } from '../lib/store';
import { getTotalXp } from '../lib/xp';
import { getStreak } from '../lib/streaks';
import { getLevelByXp } from '../lib/levels';
import { getUnlocked, ACHIEVEMENTS } from '../lib/achievements';

const MEDALS = ['🥇', '🥈', '🥉'];
type Panel = 'activity' | 'revenue' | 'streaks' | 'achievements';
const PANELS: Panel[] = ['activity', 'revenue', 'streaks', 'achievements'];
const PANEL_DURATION = 8000; // 8s per panel

export function TvPage() {
  const [time, setTime] = useState(new Date());
  const [activePanel, setActivePanel] = useState<Panel>('activity');

  useEffect(() => {
    const clock = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(clock);
  }, []);

  // Auto-rotate panels
  useEffect(() => {
    const rotation = setInterval(() => {
      setActivePanel(prev => {
        const idx = PANELS.indexOf(prev);
        return PANELS[(idx + 1) % PANELS.length];
      });
    }, PANEL_DURATION);
    return () => clearInterval(rotation);
  }, []);

  const users = getUsers().filter(u => u.active);
  const fills = getTodayFills();
  const sales = getMonthSales();

  const totalScore = fills.reduce((t, f) => t + calcScore(f), 0);
  const filledPct = users.length > 0 ? Math.round((fills.length / users.length) * 100) : 0;
  const totalComm = sales.reduce((t, s) => t + (s.sellerSetupComm || 0) + (s.sellerRecComm || 0), 0);

  // Activity leaderboard
  const actSorted = [...fills].sort((a, b) => calcScore(b) - calcScore(a)).slice(0, 8);
  const maxScore = actSorted[0] ? calcScore(actSorted[0]) : 1;

  // Revenue leaderboard
  const revMap: Record<string, { name: string; comm: number; cnt: number }> = {};
  sales.forEach(s => {
    const id = s.sellerName;
    if (!revMap[id]) revMap[id] = { name: s.sellerName, comm: 0, cnt: 0 };
    revMap[id].comm += (s.sellerSetupComm || 0) + (s.sellerRecComm || 0);
    revMap[id].cnt++;
  });
  const revSorted = Object.values(revMap).sort((a, b) => b.comm - a.comm).slice(0, 8);
  const maxComm = revSorted[0]?.comm || 1;

  // Streak leaderboard
  const streakData = users.map(u => ({
    name: u.name, streak: getStreak(u.id).current,
    avatar: localStorage.getItem(`vantagem_avatar_${u.id}`) || null,
  })).filter(u => u.streak > 0).sort((a, b) => b.streak - a.streak).slice(0, 8);

  // XP/Level leaderboard
  const xpData = users.map(u => {
    const xp = getTotalXp(u.id);
    return { name: u.name, xp, level: getLevelByXp(xp), badges: getUnlocked(u.id).length };
  }).filter(u => u.xp > 0).sort((a, b) => b.xp - a.xp).slice(0, 8);

  // Recent achievements across all users
  const recentAch = users.flatMap(u => {
    return getUnlocked(u.id).map(a => ({
      userName: u.name,
      achievement: ACHIEVEMENTS.find(ach => ach.id === a.id),
      unlockedAt: a.unlockedAt,
    }));
  }).filter(a => a.achievement).sort((a, b) => b.unlockedAt - a.unlockedAt).slice(0, 6);

  return (
    <div className="space-y-5">
      {/* TV Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-vred flex items-center justify-center animate-pulse-glow">
            <span className="text-white font-black text-lg">V</span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wide">
              VANTAGEM<span className="text-vred">.ai</span>
              <span className="text-t4 text-sm ml-3">OPS GAMIFICADO</span>
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono text-vgreen">
          <span className="w-2 h-2 rounded-full bg-vgreen animate-pulse" />
          AO VIVO
          <span className="text-t4 ml-2">
            {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { val: `${filledPct}%`, label: 'Fill Hoje', color: filledPct >= 100 ? 'text-vgreen' : 'text-vred' },
          { val: totalScore.toString(), label: 'Score Total', color: 'text-vred' },
          { val: sales.length.toString(), label: 'Vendas Mes', color: 'text-vgold' },
          { val: fmt$(totalComm), label: 'Comissoes', color: 'text-vgreen' },
        ].map((kpi, i) => (
          <div key={i} className="bg-surface border border-b1 rounded-xl p-5 text-center">
            <div className={`font-mono text-3xl font-bold ${kpi.color}`}>{kpi.val}</div>
            <div className="text-[10px] text-t4 uppercase tracking-wider mt-2">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Panel indicator */}
      <div className="flex gap-1 justify-center">
        {PANELS.map(p => (
          <button
            key={p}
            onClick={() => setActivePanel(p)}
            className={`h-1 rounded-full transition-all duration-500 ${
              activePanel === p ? 'w-8 bg-vred' : 'w-4 bg-muted'
            }`}
          />
        ))}
      </div>

      {/* Two columns — always show activity + rotating right panel */}
      <div className="grid grid-cols-2 gap-6">
        {/* Left: Activity */}
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
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-center text-lg">{MEDALS[i] || `#${i + 1}`}</span>
                      <span className="flex-1 text-sm font-semibold truncate">
                        {f.userName}
                        <span className={`ml-1.5 text-xs ${level.color}`}>{level.icon}</span>
                        {streak.current > 0 && <span className="ml-1 text-[10px] text-orange-400">🔥{streak.current}</span>}
                      </span>
                      <span className="font-mono font-bold text-vred">{score} pts</span>
                    </div>
                    <div className="ml-9 mt-1 h-1.5 bg-overlay rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-vred to-red-400 rounded-full transition-all duration-1000"
                        style={{ width: `${Math.round((score / maxScore) * 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: rotating panel */}
        <div className="bg-surface border border-b1 rounded-xl p-5">
          {activePanel === 'activity' && (
            <>
              <h2 className="text-vgreen font-bold text-sm uppercase tracking-wider mb-4">💰 Receita — Mes</h2>
              {revSorted.length === 0 ? (
                <div className="text-center py-8 text-t4 text-sm">Sem vendas no mes</div>
              ) : (
                <div className="space-y-3">
                  {revSorted.map((r, i) => (
                    <div key={r.name} className="animate-in">
                      <div className="flex items-center gap-3">
                        <span className="w-6 text-center text-lg">{MEDALS[i] || `#${i + 1}`}</span>
                        <span className="flex-1 text-sm font-semibold truncate">
                          {r.name} <span className="text-t4 text-xs">({r.cnt})</span>
                        </span>
                        <span className="font-mono font-bold text-vgreen">{fmt$(r.comm)}</span>
                      </div>
                      <div className="ml-9 mt-1 h-1.5 bg-overlay rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-600 to-vgreen rounded-full transition-all duration-1000"
                          style={{ width: `${Math.round((r.comm / maxComm) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activePanel === 'revenue' && (
            <>
              <h2 className="text-vgold font-bold text-sm uppercase tracking-wider mb-4">⚡ XP Ranking</h2>
              {xpData.length === 0 ? (
                <div className="text-center py-8 text-t4 text-sm">Nenhum XP registrado</div>
              ) : (
                <div className="space-y-3">
                  {xpData.map((u, i) => (
                    <div key={u.name} className="animate-in">
                      <div className="flex items-center gap-3">
                        <span className="w-6 text-center text-lg">{MEDALS[i] || `#${i + 1}`}</span>
                        <span className="flex-1 text-sm font-semibold truncate">
                          {u.name}
                          <span className={`ml-1.5 text-xs ${u.level.color}`}>{u.level.icon} {u.level.name}</span>
                        </span>
                        <span className="font-mono font-bold text-vgold">{u.xp.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activePanel === 'streaks' && (
            <>
              <h2 className="text-orange-400 font-bold text-sm uppercase tracking-wider mb-4">🔥 Streaks — Dias Consecutivos</h2>
              {streakData.length === 0 ? (
                <div className="text-center py-8 text-t4 text-sm">Nenhum streak ativo</div>
              ) : (
                <div className="space-y-3">
                  {streakData.map((u, i) => (
                    <div key={u.name} className="flex items-center gap-3 animate-in">
                      <span className="w-6 text-center text-lg">{MEDALS[i] || `#${i + 1}`}</span>
                      <span className="flex-1 text-sm font-semibold truncate">{u.name}</span>
                      <span className="font-mono font-bold text-orange-400">🔥 {u.streak}d</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activePanel === 'achievements' && (
            <>
              <h2 className="text-vpurp font-bold text-sm uppercase tracking-wider mb-4">🏆 Conquistas Recentes</h2>
              {recentAch.length === 0 ? (
                <div className="text-center py-8 text-t4 text-sm">Nenhuma conquista desbloqueada</div>
              ) : (
                <div className="space-y-3">
                  {recentAch.map((a, i) => (
                    <div key={i} className="flex items-center gap-3 animate-in">
                      <span className="text-2xl">{a.achievement!.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{a.achievement!.name}</div>
                        <div className="text-[10px] text-t4">{a.userName} · {new Date(a.unlockedAt).toLocaleDateString('pt-BR')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
