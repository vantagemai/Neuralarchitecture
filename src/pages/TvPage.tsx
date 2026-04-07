import { useEffect, useState, useRef } from 'react';
import { getUsers, getTodayFills, getMonthSales, calcScore, fmt$, db, type UserData, type FillData, type SaleData } from '../lib/store';
import { getTotalXp } from '../lib/xp';
import { getStreak } from '../lib/streaks';
import { getLevelByXp } from '../lib/levels';
import { getUnlocked, ACHIEVEMENTS } from '../lib/achievements';
import { getGoals } from '../lib/goals';
import { Logo } from '../components/ui/Logo';

const MEDALS = ['🥇', '🥈', '🥉'];

// ─── Role Groups ───
interface RoleGroup {
  key: string;
  label: string;
  icon: string;
  color: string;
  barColor: string;
  roles: string[];
}

const ROLE_GROUPS: RoleGroup[] = [
  { key: 'founders', label: 'FOUNDERS', icon: '👑', color: 'text-vgold', barColor: 'bg-gradient-to-r from-vgold-dark to-vgold', roles: ['Founder'] },
  { key: 'partners', label: 'PARTNERS', icon: '🤝', color: 'text-vpurp', barColor: 'bg-gradient-to-r from-vpurp to-purple-400', roles: ['Partner'] },
  { key: 'closers', label: 'CLOSERS', icon: '🎯', color: 'text-vgreen', barColor: 'bg-gradient-to-r from-emerald-600 to-vgreen', roles: ['Vendedor'] },
  { key: 'setters', label: 'SETTERS', icon: '📞', color: 'text-sky-400', barColor: 'bg-gradient-to-r from-sky-600 to-sky-400', roles: ['Setter'] },
  { key: 'social', label: 'SOCIAL SELLERS', icon: '📱', color: 'text-pink-400', barColor: 'bg-gradient-to-r from-pink-600 to-pink-400', roles: ['Social Seller'] },
];

type Panel = 'activity' | 'revenue' | 'xp' | 'streaks' | 'achievements';
const PANELS: Panel[] = ['activity', 'revenue', 'xp', 'streaks', 'achievements'];
const PANEL_DURATION = 10000;
const PANEL_LABELS: Record<Panel, string> = {
  activity: '📊 ATIVIDADE',
  revenue: '💰 RECEITA',
  xp: '⚡ XP',
  streaks: '🔥 STREAKS',
  achievements: '⭐ CONQUISTAS',
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
      const eased = 1 - Math.pow(1 - progress, 3);
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

function getUserGroup(user: UserData): RoleGroup | undefined {
  return ROLE_GROUPS.find(g => g.roles.includes(user.role));
}

// ─── Group Section ───
function GroupSection({ group, users, fills, sales, panel }: {
  group: RoleGroup;
  users: UserData[];
  fills: FillData[];
  sales: SaleData[];
  panel: Panel;
}) {
  if (users.length === 0) return null;
  const userIds = new Set(users.map(u => u.id));

  // Activity data
  const groupFills = fills.filter(f => userIds.has(f.userId));
  const actSorted = [...groupFills].sort((a, b) => calcScore(b) - calcScore(a)).slice(0, 5);
  const maxScore = actSorted[0] ? calcScore(actSorted[0]) : 1;
  const filledCount = groupFills.length;
  const filledPct = users.length > 0 ? Math.round((filledCount / users.length) * 100) : 0;

  // Revenue data
  const groupSales = sales.filter(s => userIds.has(s.sellerId));
  const revMap: Record<string, { id: string; name: string; comm: number; cnt: number }> = {};
  groupSales.forEach(s => {
    const id = s.sellerId;
    if (!revMap[id]) revMap[id] = { id, name: s.sellerName, comm: 0, cnt: 0 };
    revMap[id].comm += (s.sellerSetupComm || 0) + (s.sellerRecComm || 0);
    revMap[id].cnt++;
  });
  // Also count setter commissions for setters
  if (group.key === 'setters') {
    sales.filter(s => s.setterId && userIds.has(s.setterId)).forEach(s => {
      const id = s.setterId!;
      if (!revMap[id]) {
        const u = users.find(u => u.id === id);
        revMap[id] = { id, name: u?.name || s.setterName || '', comm: 0, cnt: 0 };
      }
      revMap[id].comm += (s.setterSetupComm || 0) + (s.setterRecComm || 0);
      revMap[id].cnt++;
    });
  }
  const revSorted = Object.values(revMap).sort((a, b) => b.comm - a.comm).slice(0, 5);
  const maxComm = revSorted[0]?.comm || 1;

  // XP data
  const xpData = users.map(u => {
    const xp = getTotalXp(u.id);
    return { id: u.id, name: u.name, xp, level: getLevelByXp(xp) };
  }).filter(u => u.xp > 0).sort((a, b) => b.xp - a.xp).slice(0, 5);

  // Streak data
  const streakData = users.map(u => ({
    id: u.id, name: u.name, streak: getStreak(u.id).current,
  })).filter(u => u.streak > 0).sort((a, b) => b.streak - a.streak).slice(0, 5);

  // Achievements
  const recentAch = users.flatMap(u =>
    getUnlocked(u.id).map(a => ({
      userId: u.id, userName: u.name,
      achievement: ACHIEVEMENTS.find(ach => ach.id === a.id),
      unlockedAt: a.unlockedAt,
    }))
  ).filter(a => a.achievement).sort((a, b) => b.unlockedAt - a.unlockedAt).slice(0, 4);

  // Group meta
  const groupGoal = users.reduce((t, u) => t + (getGoals(u.id).monthlyRevenue || 0), 0);
  const groupRevenue = Object.values(revMap).reduce((t, r) => t + r.comm, 0);
  const goalPct = groupGoal > 0 ? Math.min(100, Math.round((groupRevenue / groupGoal) * 100)) : 0;

  const renderRow = (i: number, userId: string, name: string, rightValue: string, barPct: number, sub?: string) => (
    <div key={userId + i} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${i === 0 ? 'tv-gold-shimmer' : ''}`}>
      <span className="w-6 text-center" style={{ fontSize: i < 3 ? '20px' : '13px' }}>
        {MEDALS[i] || <span className="text-t4 font-mono">#{i + 1}</span>}
      </span>
      <Avatar userId={userId} name={name} size={i === 0 ? 'w-10 h-10' : 'w-8 h-8'} ring={i === 0} />
      <div className="flex-1 min-w-0">
        <div className="font-bold truncate" style={{ fontSize: '14px' }}>{name}</div>
        {sub && <div className="text-[11px] text-t4">{sub}</div>}
        <div className="relative h-1.5 bg-overlay rounded-full overflow-hidden mt-1">
          <div className={`h-full ${group.barColor} rounded-full transition-all duration-700 tv-bar-shine`}
            style={{ width: `${barPct}%` }} />
        </div>
      </div>
      <span className={`font-mono font-bold ${group.color} shrink-0`} style={{ fontSize: i === 0 ? '18px' : '15px' }}>
        {rightValue}
      </span>
    </div>
  );

  const renderContent = () => {
    switch (panel) {
      case 'activity':
        if (actSorted.length === 0) return <div className="text-center py-4 text-t4 text-sm">Sem dados hoje</div>;
        return actSorted.map((f, i) => {
          const score = calcScore(f);
          const streak = getStreak(f.userId);
          return renderRow(i, f.userId, f.userName, `${score} pts`, Math.round((score / maxScore) * 100),
            streak.current > 0 ? `🔥 ${streak.current}d` : undefined);
        });
      case 'revenue':
        if (revSorted.length === 0) return <div className="text-center py-4 text-t4 text-sm">Sem vendas</div>;
        return revSorted.map((r, i) => renderRow(i, r.id, r.name, fmt$(r.comm), Math.round((r.comm / maxComm) * 100), `${r.cnt} venda(s)`));
      case 'xp':
        if (xpData.length === 0) return <div className="text-center py-4 text-t4 text-sm">Sem XP</div>;
        return xpData.map((u, i) => renderRow(i, u.id, u.name, u.xp.toLocaleString(), Math.round((u.xp / (xpData[0]?.xp || 1)) * 100), `${u.level.icon} ${u.level.name}`));
      case 'streaks':
        if (streakData.length === 0) return <div className="text-center py-4 text-t4 text-sm">Nenhum streak</div>;
        return streakData.map((u, i) => renderRow(i, u.id, u.name, `🔥 ${u.streak}d`, Math.round((u.streak / (streakData[0]?.streak || 1)) * 100)));
      case 'achievements':
        if (recentAch.length === 0) return <div className="text-center py-4 text-t4 text-sm">Nenhuma conquista</div>;
        return recentAch.map((a, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg">
            <span style={{ fontSize: '24px' }}>{a.achievement!.icon}</span>
            <Avatar userId={a.userId} name={a.userName} size="w-8 h-8" />
            <div className="flex-1 min-w-0">
              <div className="font-bold truncate" style={{ fontSize: '14px' }}>{a.achievement!.name}</div>
              <div className="text-[11px] text-t4">{a.userName}</div>
            </div>
          </div>
        ));
    }
  };

  return (
    <div className="tv-glass rounded-lg p-4 flex flex-col overflow-hidden">
      {/* Group header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: '20px' }}>{group.icon}</span>
          <h3 className={`font-bold uppercase tracking-wider ${group.color}`} style={{ fontSize: '15px' }}>{group.label}</h3>
          <span className="text-t4 text-xs font-mono">({users.length})</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className={filledPct >= 100 ? 'text-vgreen' : 'text-t3'}>
            Fill: <span className="font-bold">{filledPct}%</span>
          </span>
          {groupGoal > 0 && (
            <span className="text-t3">
              Meta: <span className={`font-bold ${goalPct >= 100 ? 'text-vgreen' : group.color}`}>{goalPct}%</span>
              <span className="text-t4 ml-1">{fmt$(groupRevenue)}/{fmt$(groupGoal)}</span>
            </span>
          )}
        </div>
      </div>
      {/* Content */}
      <div className="flex-1 overflow-hidden space-y-0.5">
        {renderContent()}
      </div>
    </div>
  );
}

// ─── Main TV Page ───
export function TvPage() {
  const [time, setTime] = useState(new Date());
  const [activePanel, setActivePanel] = useState<Panel>('activity');
  const [, setPanelKey] = useState(0);

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

  // Global KPIs
  const rawScore = fills.reduce((t, f) => t + calcScore(f), 0);
  const filledPct = users.length > 0 ? Math.round((fills.length / users.length) * 100) : 0;
  const rawComm = sales.reduce((t, s) => t + (s.sellerSetupComm || 0) + (s.sellerRecComm || 0), 0);
  const teamGoal = users.reduce((t, u) => t + (getGoals(u.id).monthlyRevenue || 0), 0);
  const teamProgress = teamGoal > 0 ? Math.min(100, Math.round((rawComm / teamGoal) * 100)) : 0;

  const animScore = useCountUp(rawScore);
  const animComm = useCountUp(rawComm);
  const animSales = useCountUp(sales.length);
  const animFill = useCountUp(filledPct);

  // Recent sale
  const recentSale = sales.find(s => Date.now() - s.ts < 300000);

  // Shoutouts
  const shoutouts = db.list('ops_shoutout_')
    .map(k => db.get<{ fromName: string; toName: string; message: string; emoji: string; ts: number }>(k))
    .filter(Boolean)
    .sort((a, b) => b!.ts - a!.ts)
    .slice(0, 10);

  // Group users by role
  const groupedUsers: Record<string, UserData[]> = {};
  ROLE_GROUPS.forEach(g => { groupedUsers[g.key] = []; });
  users.forEach(u => {
    const g = getUserGroup(u);
    if (g) groupedUsers[g.key].push(u);
    else {
      // Fallback: Head goes to founders
      if (u.role === 'Head') groupedUsers['founders'].push(u);
    }
  });

  // Only show groups that have users
  const activeGroups = ROLE_GROUPS.filter(g => groupedUsers[g.key].length > 0);

  return (
    <div className="h-full flex flex-col gap-3 p-2">
      {/* Header */}
      <div className="flex items-center justify-between px-2">
        <Logo size="lg" />
        <div className="flex items-center gap-6">
          {teamGoal > 0 && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs text-t4 uppercase tracking-wider">Meta Time</div>
                <div className="font-mono font-bold text-lg">
                  <span className="text-vgreen">{fmt$(rawComm)}</span>
                  <span className="text-t4 text-sm"> / {fmt$(teamGoal)}</span>
                </div>
              </div>
              <div className="w-14 h-14 relative">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6" className="text-overlay" />
                  <circle cx="50" cy="50" r="42" fill="none" strokeWidth="6"
                    className="text-vgreen" stroke="currentColor"
                    strokeDasharray={`${teamProgress * 2.64} ${264 - teamProgress * 2.64}`}
                    strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-mono font-bold text-xs text-vgreen">{teamProgress}%</span>
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
        <div className="tv-sale-flash tv-glass rounded-lg px-6 py-4 flex items-center gap-5 border-l-4 border-l-vgreen">
          <Avatar userId={recentSale.sellerId} name={recentSale.sellerName} size="w-12 h-12" ring />
          <div className="flex-1">
            <div className="text-vgreen font-bold uppercase tracking-wider text-xs">NOVA VENDA</div>
            <div className="font-bold text-xl">{recentSale.sellerName}</div>
          </div>
          <div className="text-right">
            <div className="font-mono font-bold text-vgreen tv-breathe" style={{ fontSize: '32px' }}>{fmt$(recentSale.setupValue)}</div>
            <div className="text-t4 text-xs">+ {fmt$(recentSale.recValue)}/mes</div>
          </div>
        </div>
      )}

      {/* Hero KPIs */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { val: `${animFill}%`, label: 'FILL HOJE', color: filledPct >= 100 ? 'text-vgreen' : 'text-vred', bg: filledPct >= 100 ? 'from-vgreen/10 to-vgreen/5' : 'from-vred/10 to-vred/5' },
          { val: animScore.toLocaleString(), label: 'SCORE TOTAL', color: 'text-vred', bg: 'from-vred/10 to-vred/5' },
          { val: animSales.toString(), label: 'VENDAS MES', color: 'text-vgold', bg: 'from-vgold/10 to-vgold/5' },
          { val: `$${animComm.toLocaleString()}`, label: 'COMISSOES', color: 'text-vgreen', bg: 'from-vgreen/10 to-vgreen/5' },
        ].map((kpi, i) => (
          <div key={i} className={`tv-glass rounded-lg p-4 text-center bg-gradient-to-br ${kpi.bg}`}>
            <div className={`font-mono font-bold ${kpi.color} tv-breathe`} style={{ fontSize: '36px', lineHeight: 1.1 }}>
              {kpi.val}
            </div>
            <div className="text-t3 uppercase tracking-[0.12em] font-bold mt-1" style={{ fontSize: '11px' }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Panel selector */}
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

      {/* Groups grid — each role group gets its own section */}
      <div className={`flex-1 grid gap-3 min-h-0 ${
        activeGroups.length <= 2 ? 'grid-cols-2' :
        activeGroups.length <= 3 ? 'grid-cols-3' :
        activeGroups.length <= 4 ? 'grid-cols-2 grid-rows-2' :
        'grid-cols-3 grid-rows-2'
      }`}>
        {activeGroups.map(g => (
          <GroupSection
            key={g.key}
            group={g}
            users={groupedUsers[g.key]}
            fills={fills}
            sales={sales}
            panel={activePanel}
          />
        ))}
      </div>

      {/* Shoutout ticker */}
      {shoutouts.length > 0 && (
        <div className="tv-glass rounded-xl overflow-hidden">
          <div className="flex items-center h-10">
            <div className="shrink-0 px-4 bg-vred/10 h-full flex items-center border-r border-b1">
              <span className="font-bold text-vred uppercase tracking-wider" style={{ fontSize: '11px' }}>Shoutouts</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="animate-marquee whitespace-nowrap flex gap-10 px-6">
                {[...shoutouts, ...shoutouts].map((s, i) => (
                  <span key={i} className="inline-flex items-center gap-2 text-sm">
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
