import { useEffect, useState, useRef } from 'react';
import { getUsers, getTodayFills, getMonthSales, calcScore, fmt$, db } from '../lib/store';
import { getTotalXp } from '../lib/xp';
import { getStreak } from '../lib/streaks';
import { getLevelByXp } from '../lib/levels';
import { getUnlocked, ACHIEVEMENTS } from '../lib/achievements';
import { getGoals } from '../lib/goals';
import { Logo } from '../components/ui/Logo';

const MEDALS = ['🥇', '🥈', '🥉'];
type Panel = 'revenue' | 'xp' | 'prizes' | 'streaks' | 'achievements';
const PANELS: Panel[] = ['revenue', 'xp', 'prizes', 'streaks', 'achievements'];
const PANEL_DURATION = 10000;
const PANEL_LABELS: Record<Panel, string> = {
  revenue: '💰 RECEITA',
  xp: '⚡ XP RANKING',
  prizes: '🏆 PREMIACOES',
  streaks: '🔥 STREAKS',
  achievements: '⭐ CONQUISTAS',
};

const PRIZE_LABELS: Record<string, string> = {
  top_closer: '🏆 Top Closer', top_setter: '🎯 Top Setter',
  iron_streak: '🔥 Streak Ferro', first10: '📱 First 10',
  diamond: '💎 Diamond', century: '🚀 Century',
};

// Count-up hook
function useCountUp(target: number, duration = 1200): number {
  const [val, setVal] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const start = prev.current;
    const diff = target - start;
    if (diff === 0) return;
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setVal(Math.round(start + diff * eased));
      if (progress < 1) requestAnimationFrame(step);
      else prev.current = target;
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return val;
}

function Avatar({ userId, name, size = 'w-10 h-10', ring = false }: { userId: string; name: string; size?: string; ring?: boolean }) {
  const url = localStorage.getItem(`vantagem_avatar_${userId}`);
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const img = url ? (
    <img src={url} alt={name} className={`${size} rounded-full object-cover`} />
  ) : (
    <div className={`${size} rounded-full bg-gradient-to-br from-vred to-vred-dark flex items-center justify-center text-white font-bold`}
      style={{ fontSize: size.includes('12') ? '16px' : size.includes('10') ? '13px' : '11px' }}>
      {initials}
    </div>
  );
  if (ring) return <div className="tv-avatar-ring shrink-0">{img}</div>;
  return <div className="shrink-0">{img}</div>;
}

export function TvPage() {
  const [time, setTime] = useState(new Date());
  const [activePanel, setActivePanel] = useState<Panel>('revenue');
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

  const rawScore = fills.reduce((t, f) => t + calcScore(f), 0);
  const filledPct = users.length > 0 ? Math.round((fills.length / users.length) * 100) : 0;
  const rawComm = sales.reduce((t, s) => t + (s.sellerSetupComm || 0) + (s.sellerRecComm || 0), 0);
  const teamGoal = users.reduce((t, u) => t + (getGoals(u.id).monthlyRevenue || 0), 0);
  const teamProgress = teamGoal > 0 ? Math.min(100, Math.round((rawComm / teamGoal) * 100)) : 0;

  // Animated counters
  const animScore = useCountUp(rawScore);
  const animComm = useCountUp(rawComm);
  const animSales = useCountUp(sales.length);
  const animFill = useCountUp(filledPct);

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

  // Streaks
  const streakData = users.map(u => ({
    id: u.id, name: u.name, streak: getStreak(u.id).current,
  })).filter(u => u.streak > 0).sort((a, b) => b.streak - a.streak).slice(0, 8);

  // XP
  const xpData = users.map(u => {
    const xp = getTotalXp(u.id);
    return { id: u.id, name: u.name, xp, level: getLevelByXp(xp) };
  }).filter(u => u.xp > 0).sort((a, b) => b.xp - a.xp).slice(0, 8);

  // Achievements
  const recentAch = users.flatMap(u =>
    getUnlocked(u.id).map(a => ({
      userId: u.id, userName: u.name,
      achievement: ACHIEVEMENTS.find(ach => ach.id === a.id),
      unlockedAt: a.unlockedAt,
    }))
  ).filter(a => a.achievement).sort((a, b) => b.unlockedAt - a.unlockedAt).slice(0, 6);

  // Prizes
  const cfg = db.get<{ awards?: { prizes?: Record<string, string> } }>('ops_config');
  const prizes = cfg?.awards?.prizes || {};
  const prizeEntries = Object.entries(prizes).filter(([_, v]) => v);

  // Recent sale
  const recentSale = sales.find(s => Date.now() - s.ts < 300000);

  // Shoutouts
  const shoutouts = db.list('ops_shoutout_')
    .map(k => db.get<{ fromName: string; toName: string; message: string; emoji: string; ts: number }>(k))
    .filter(Boolean)
    .sort((a, b) => b!.ts - a!.ts)
    .slice(0, 10);

  // Render leaderboard row (reusable)
  const renderRow = (i: number, userId: string, name: string, rightValue: string, rightColor: string, barPct: number, barColor: string, sub?: string) => (
    <div key={userId + i} className={`tv-row-enter flex items-center gap-4 px-4 py-3 rounded-xl transition-colors ${i === 0 ? 'tv-gold-shimmer' : ''}`}>
      <span className="w-8 text-center" style={{ fontSize: i < 3 ? '28px' : '16px' }}>
        {MEDALS[i] || <span className="text-base text-t4 font-mono">#{i + 1}</span>}
      </span>
      <Avatar userId={userId} name={name} size={i === 0 ? 'w-12 h-12' : 'w-10 h-10'} ring={i === 0} />
      <div className="flex-1 min-w-0">
        <div className="font-bold truncate" style={{ fontSize: i === 0 ? '20px' : '17px' }}>{name}</div>
        {sub && <div className="text-xs text-t4 mt-0.5">{sub}</div>}
        <div className="relative h-2 bg-overlay rounded-full overflow-hidden mt-1.5">
          <div className={`h-full ${barColor} rounded-full transition-all duration-700 tv-bar-shine relative`}
            style={{ width: `${barPct}%` }} />
        </div>
      </div>
      <span className={`font-mono font-bold ${rightColor} shrink-0`} style={{ fontSize: i === 0 ? '24px' : '20px' }}>
        {rightValue}
      </span>
    </div>
  );

  return (
    <div className="h-full flex flex-col gap-4 p-2">
      {/* Header */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-4">
          <Logo size="lg" />
        </div>
        <div className="flex items-center gap-6">
          {/* Team goal */}
          {teamGoal > 0 && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs text-t4 uppercase tracking-wider">Meta Time</div>
                <div className="font-mono font-bold text-lg">
                  <span className="text-vgreen">{fmt$(rawComm)}</span>
                  <span className="text-t4 text-sm"> / {fmt$(teamGoal)}</span>
                </div>
              </div>
              <div className="w-16 h-16 relative">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6" className="text-overlay" />
                  <circle cx="50" cy="50" r="42" fill="none" strokeWidth="6"
                    className="text-vgreen"
                    stroke="currentColor"
                    strokeDasharray={`${teamProgress * 2.64} ${264 - teamProgress * 2.64}`}
                    strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-mono font-bold text-sm text-vgreen">{teamProgress}%</span>
                </div>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="relative w-3 h-3">
              <span className="absolute inset-0 rounded-full bg-vgreen animate-pulse" />
              <span className="absolute inset-0 rounded-full tv-live-ring text-vgreen" />
            </div>
            <span className="text-vgreen font-bold" style={{ fontSize: '16px' }}>AO VIVO</span>
            <span className="text-t3 font-mono" style={{ fontSize: '20px' }}>
              {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>
      </div>

      {/* Sale celebration */}
      {recentSale && (
        <div className="tv-sale-flash tv-glass rounded-2xl px-8 py-5 flex items-center gap-6 border-l-4 border-l-vgreen">
          <Avatar userId={recentSale.sellerId} name={recentSale.sellerName} size="w-14 h-14" ring />
          <div className="flex-1">
            <div className="text-vgreen font-bold uppercase tracking-wider" style={{ fontSize: '14px' }}>NOVA VENDA</div>
            <div className="font-bold" style={{ fontSize: '28px' }}>{recentSale.sellerName}</div>
          </div>
          <div className="text-right">
            <div className="font-mono font-bold text-vgreen tv-breathe" style={{ fontSize: '40px' }}>{fmt$(recentSale.setupValue)}</div>
            <div className="text-t4" style={{ fontSize: '14px' }}>+ {fmt$(recentSale.recValue)}/mes recorrente</div>
          </div>
        </div>
      )}

      {/* Hero KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { val: `${animFill}%`, label: 'FILL HOJE', color: filledPct >= 100 ? 'text-vgreen' : 'text-vred', bg: filledPct >= 100 ? 'from-vgreen/10 to-vgreen/5' : 'from-vred/10 to-vred/5', glow: filledPct >= 100 ? 'shadow-vgreen/10' : 'shadow-vred/10' },
          { val: animScore.toLocaleString(), label: 'SCORE TOTAL', color: 'text-vred', bg: 'from-vred/10 to-vred/5', glow: 'shadow-vred/10' },
          { val: animSales.toString(), label: 'VENDAS MES', color: 'text-vgold', bg: 'from-vgold/10 to-vgold/5', glow: 'shadow-vgold/10' },
          { val: `$${animComm.toLocaleString()}`, label: 'COMISSOES', color: 'text-vgreen', bg: 'from-vgreen/10 to-vgreen/5', glow: 'shadow-vgreen/10' },
        ].map((kpi, i) => (
          <div key={i} className={`tv-glass rounded-2xl p-5 text-center bg-gradient-to-br ${kpi.bg} shadow-lg ${kpi.glow} tv-kpi-glow`}>
            <div className={`font-mono font-bold ${kpi.color} tv-breathe`} style={{ fontSize: '48px', lineHeight: 1.1 }}>
              {kpi.val}
            </div>
            <div className="text-t3 uppercase tracking-[0.15em] font-bold mt-2" style={{ fontSize: '13px' }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Panel indicators */}
      <div className="flex gap-2 justify-center items-center">
        {PANELS.map(p => (
          <button key={p} onClick={() => { setActivePanel(p); setPanelKey(k => k + 1); }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition-all text-xs font-bold ${
              activePanel === p ? 'bg-vred/15 text-vred border border-vred/20' : 'text-t4 hover:text-t3'
            }`}>
            {PANEL_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Main content: Activity (fixed) + Rotating panel */}
      <div className="flex-1 grid grid-cols-2 gap-5 min-h-0">
        {/* Left: Activity */}
        <div className="tv-glass rounded-2xl p-5 overflow-hidden flex flex-col">
          <h2 className="text-vred font-bold uppercase tracking-wider mb-4" style={{ fontSize: '18px' }}>📊 ATIVIDADE — HOJE</h2>
          <div className="flex-1 overflow-hidden space-y-1">
            {actSorted.length === 0 ? (
              <div className="text-center py-12 text-t4" style={{ fontSize: '18px' }}>Sem dados hoje</div>
            ) : (
              actSorted.map((f, i) => {
                const score = calcScore(f);
                const level = getLevelByXp(getTotalXp(f.userId));
                const streak = getStreak(f.userId);
                return renderRow(
                  i, f.userId, f.userName,
                  `${score}`,
                  'text-vred',
                  Math.round((score / maxScore) * 100),
                  'bg-gradient-to-r from-vred to-red-400',
                  `${level.icon} ${level.name}${streak.current > 0 ? ` · 🔥${streak.current}d` : ''}`
                );
              })
            )}
          </div>
        </div>

        {/* Right: Rotating */}
        <div className="tv-glass rounded-2xl p-5 overflow-hidden flex flex-col">
          <div key={panelKey} className="animate-panel-in flex-1 flex flex-col">
            {/* Revenue */}
            {activePanel === 'revenue' && (
              <>
                <h2 className="text-vgreen font-bold uppercase tracking-wider mb-4" style={{ fontSize: '18px' }}>💰 RECEITA — MES</h2>
                <div className="flex-1 space-y-1">
                  {revSorted.map((r, i) => renderRow(
                    i, r.id, r.name, fmt$(r.comm), 'text-vgreen',
                    Math.round((r.comm / maxComm) * 100),
                    'bg-gradient-to-r from-emerald-600 to-vgreen',
                    `${r.cnt} venda(s)`
                  ))}
                  {revSorted.length === 0 && <div className="text-center py-12 text-t4" style={{ fontSize: '18px' }}>Sem vendas</div>}
                </div>
              </>
            )}

            {/* XP */}
            {activePanel === 'xp' && (
              <>
                <h2 className="text-vgold font-bold uppercase tracking-wider mb-4" style={{ fontSize: '18px' }}>⚡ XP RANKING</h2>
                <div className="flex-1 space-y-1">
                  {xpData.map((u, i) => renderRow(
                    i, u.id, u.name, u.xp.toLocaleString(), 'text-vgold',
                    Math.round((u.xp / (xpData[0]?.xp || 1)) * 100),
                    'bg-gradient-to-r from-vgold-dark to-vgold',
                    `${u.level.icon} ${u.level.name}`
                  ))}
                  {xpData.length === 0 && <div className="text-center py-12 text-t4" style={{ fontSize: '18px' }}>Sem XP</div>}
                </div>
              </>
            )}

            {/* Prizes */}
            {activePanel === 'prizes' && (
              <>
                <h2 className="text-vgold font-bold uppercase tracking-wider mb-4" style={{ fontSize: '18px' }}>🏆 PREMIACOES DO MES</h2>
                <div className="flex-1 space-y-3">
                  {prizeEntries.length === 0 ? (
                    <div className="text-center py-12 text-t4" style={{ fontSize: '18px' }}>Configure em Config</div>
                  ) : prizeEntries.map(([key, value]) => {
                    let leader: { name: string; id: string; val: string } | null = null;
                    if ((key === 'top_closer' || key === 'diamond') && revSorted[0])
                      leader = { name: revSorted[0].name, id: revSorted[0].id, val: fmt$(revSorted[0].comm) };
                    else if (key === 'top_setter') {
                      const sf = actSorted.filter(f => f.userRole === 'Setter');
                      if (sf[0]) leader = { name: sf[0].userName, id: sf[0].userId, val: `${calcScore(sf[0])} pts` };
                    } else if (key === 'iron_streak' && streakData[0])
                      leader = { name: streakData[0].name, id: streakData[0].id, val: `${streakData[0].streak}d` };

                    return (
                      <div key={key} className="flex items-center gap-4 bg-vgold/5 border border-vgold/15 rounded-xl px-5 py-4">
                        <div className="flex-1">
                          <div className="font-bold" style={{ fontSize: '16px' }}>{PRIZE_LABELS[key] || key}</div>
                          <div className="font-bold text-vgold mt-1" style={{ fontSize: '22px' }}>{value}</div>
                        </div>
                        {leader && (
                          <div className="flex items-center gap-3">
                            <Avatar userId={leader.id} name={leader.name} size="w-12 h-12" ring />
                            <div className="text-right">
                              <div className="font-semibold" style={{ fontSize: '15px' }}>{leader.name}</div>
                              <div className="font-mono text-vgold font-bold" style={{ fontSize: '14px' }}>{leader.val}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Streaks */}
            {activePanel === 'streaks' && (
              <>
                <h2 className="text-orange-400 font-bold uppercase tracking-wider mb-4" style={{ fontSize: '18px' }}>🔥 STREAKS — DIAS CONSECUTIVOS</h2>
                <div className="flex-1 space-y-1">
                  {streakData.map((u, i) => renderRow(
                    i, u.id, u.name, `🔥 ${u.streak}d`, 'text-orange-400',
                    Math.round((u.streak / (streakData[0]?.streak || 1)) * 100),
                    'bg-gradient-to-r from-orange-600 to-orange-400'
                  ))}
                  {streakData.length === 0 && <div className="text-center py-12 text-t4" style={{ fontSize: '18px' }}>Nenhum streak</div>}
                </div>
              </>
            )}

            {/* Achievements */}
            {activePanel === 'achievements' && (
              <>
                <h2 className="text-vpurp font-bold uppercase tracking-wider mb-4" style={{ fontSize: '18px' }}>⭐ CONQUISTAS RECENTES</h2>
                <div className="flex-1 space-y-2">
                  {recentAch.map((a, i) => (
                    <div key={i} className="tv-row-enter flex items-center gap-4 px-4 py-3 rounded-xl">
                      <span style={{ fontSize: '36px' }}>{a.achievement!.icon}</span>
                      <Avatar userId={a.userId} name={a.userName} size="w-10 h-10" />
                      <div className="flex-1">
                        <div className="font-bold" style={{ fontSize: '18px' }}>{a.achievement!.name}</div>
                        <div className="text-t4" style={{ fontSize: '13px' }}>{a.userName} · {new Date(a.unlockedAt).toLocaleDateString('pt-BR')}</div>
                      </div>
                    </div>
                  ))}
                  {recentAch.length === 0 && <div className="text-center py-12 text-t4" style={{ fontSize: '18px' }}>Nenhuma conquista</div>}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Shoutout ticker */}
      {shoutouts.length > 0 && (
        <div className="tv-glass rounded-xl overflow-hidden">
          <div className="flex items-center h-12">
            <div className="shrink-0 px-4 bg-vred/10 h-full flex items-center border-r border-b1">
              <span className="font-bold text-vred uppercase tracking-wider" style={{ fontSize: '12px' }}>Shoutouts</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="animate-marquee whitespace-nowrap flex gap-10 px-6">
                {[...shoutouts, ...shoutouts].map((s, i) => (
                  <span key={i} className="inline-flex items-center gap-2" style={{ fontSize: '14px' }}>
                    <span>{s!.emoji}</span>
                    <span className="font-bold">{s!.fromName}</span>
                    <span className="text-t4">→</span>
                    <span className="font-bold">{s!.toName}:</span>
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
