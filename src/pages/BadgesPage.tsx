import { ACHIEVEMENTS, getUnlocked, checkAchievements } from '../lib/achievements';
import { getTotalFichas } from '../lib/xp';
import { getStreak } from '../lib/streaks';
import { getLevel, getNextLevel, LEVELS } from '../lib/levels';
import { Badge } from '../components/ui/Badge';

export function BadgesPage() {
  checkAchievements();

  const unlocked = getUnlocked();
  const unlockedIds = new Set(unlocked.map(a => a.id));
  const fichas = getTotalFichas();
  const streak = getStreak();
  const level = getLevel();
  const { next, progress, xpNeeded } = getNextLevel();

  const categories = [
    { key: 'activity', label: 'Atividade', icon: '📊' },
    { key: 'sales', label: 'Vendas', icon: '💰' },
    { key: 'streak', label: 'Streak', icon: '🔥' },
    { key: 'milestone', label: 'Milestones', icon: '🪙' },
  ];

  const uniqueAchs = ACHIEVEMENTS;

  return (
    <div className="space-y-4 animate-in">
      <div>
        <h1 className="text-lg font-bold">Conquistas & Carreira</h1>
        <p className="text-sm text-t3 mt-1">Seus badges, fichas e plano de carreira</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface border border-b1 rounded-lg p-3 text-center">
          <div className="text-2xl mb-1">{level.icon}</div>
          <div className={`text-base font-bold ${level.color}`}>{level.name}</div>
          <div className="text-[10px] text-t4 uppercase">Nivel {level.rank}</div>
        </div>
        <div className="bg-surface border border-b1 rounded-lg p-3 text-center">
          <div className="text-lg mb-0.5">🪙</div>
          <div className="font-mono text-base font-bold text-vgold">{fichas.toLocaleString()}</div>
          <div className="text-[10px] text-t4 uppercase">Fichas Total</div>
        </div>
        <div className="bg-surface border border-b1 rounded-lg p-3 text-center">
          <div className="font-mono text-base font-bold text-orange-400">{streak.current}d</div>
          <div className="text-[10px] text-t4 uppercase">Streak Atual</div>
        </div>
        <div className="bg-surface border border-b1 rounded-lg p-3 text-center">
          <div className="font-mono text-base font-bold text-vpurp">{unlocked.length}/{uniqueAchs.length}</div>
          <div className="text-[10px] text-t4 uppercase">Badges</div>
        </div>
      </div>

      {/* Level progress bar */}
      {next && (
        <div className="bg-surface border border-b1 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <span>{level.icon}</span>
              <span className={`text-sm font-bold ${level.color}`}>{level.name}</span>
              <span className="text-t4 text-xs">→</span>
              <span>{next.icon}</span>
              <span className={`text-sm font-bold ${next.color}`}>{next.name}</span>
            </div>
            <span className="text-xs text-t3 font-mono">🪙 {xpNeeded.toLocaleString()} fichas restam</span>
          </div>
          <div className="h-2 bg-overlay rounded-sm overflow-hidden">
            <div className="h-full bg-gradient-to-r from-vred to-vgold rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Career Staircase — Spark → Diamond */}
      <div className="bg-surface border border-b1 rounded-lg p-4">
        <h2 className="text-[11px] font-bold text-t3 uppercase tracking-wider mb-4 flex items-center gap-2">
          🏆 Plano de Carreira
        </h2>
        <div className="space-y-1">
          {LEVELS.map((lvl, i) => {
            const isCurrentOrPast = fichas >= lvl.minXp;
            const isCurrent = lvl.rank === level.rank;
            const nextLvl = LEVELS[i + 1];
            const lvlProgress = isCurrent && nextLvl
              ? Math.min(100, Math.round(((fichas - lvl.minXp) / (nextLvl.minXp - lvl.minXp)) * 100))
              : isCurrentOrPast ? 100 : 0;

            return (
              <div key={lvl.rank} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all ${
                isCurrent ? 'bg-vgold/8 border border-vgold/20' : isCurrentOrPast ? 'bg-vgreen/5' : 'opacity-50'
              }`}>
                {/* Rank indicator */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${
                  isCurrent ? 'bg-vgold/20 border-2 border-vgold' :
                  isCurrentOrPast ? 'bg-vgreen/20 border border-vgreen/40' :
                  'bg-overlay border border-b1'
                }`}>
                  {isCurrentOrPast ? (isCurrent ? lvl.icon : '✓') : lvl.icon}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${isCurrent ? 'text-vgold' : isCurrentOrPast ? 'text-vgreen' : 'text-t3'}`}>
                      {lvl.name}
                    </span>
                    {isCurrent && <Badge variant="gold">Voce esta aqui</Badge>}
                    {isCurrentOrPast && !isCurrent && <span className="text-[10px] text-vgreen">✓</span>}
                  </div>
                  {lvl.criteria && (
                    <div className="text-[10px] text-t4 mt-0.5">{lvl.criteria}</div>
                  )}
                  {/* Progress bar for current level */}
                  {(isCurrent || isCurrentOrPast) && (
                    <div className="h-1 bg-overlay rounded-full overflow-hidden mt-1.5 max-w-[200px]">
                      <div className={`h-full rounded-full transition-all duration-700 ${
                        isCurrent ? 'bg-vgold' : 'bg-vgreen'
                      }`} style={{ width: `${lvlProgress}%` }} />
                    </div>
                  )}
                </div>

                {/* Fichas requirement */}
                <div className="text-right shrink-0">
                  <div className="text-[10px] font-mono text-t4">🪙 {lvl.minXp.toLocaleString()}</div>
                  {lvl.award && (
                    <div className="text-[9px] text-vgold mt-0.5 max-w-[120px] truncate">{lvl.award}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Badge categories */}
      {categories.map(cat => {
        const badges = uniqueAchs.filter(a => a.category === cat.key);
        if (badges.length === 0) return null;
        return (
          <div key={cat.key}>
            <h2 className="text-sm font-bold text-t3 uppercase tracking-wider mb-3 flex items-center gap-2">
              {cat.icon} {cat.label}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {badges.map(ach => {
                const earned = unlockedIds.has(ach.id);
                const earnedAt = unlocked.find(a => a.id === ach.id)?.unlockedAt;
                return (
                  <div key={ach.id} className={`bg-surface border rounded-lg p-4 flex items-center gap-4 transition-all ${
                    earned ? 'border-vpurp/30 bg-vpurp/5' : 'border-b1 opacity-50 grayscale'
                  }`}>
                    <div className="text-xl">{ach.icon}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold truncate">{ach.name}</span>
                        {earned && <Badge variant="purp">Earned</Badge>}
                      </div>
                      <div className="text-xs text-t3 mt-0.5">{ach.description}</div>
                      {earnedAt && (
                        <div className="text-[10px] text-t4 mt-1">
                          {new Date(earnedAt).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
