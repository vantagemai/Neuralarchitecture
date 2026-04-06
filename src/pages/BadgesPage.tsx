import { ACHIEVEMENTS, getUnlocked, checkAchievements } from '../lib/achievements';
import { getTotalXp } from '../lib/xp';
import { getStreak } from '../lib/streaks';
import { getLevel, getNextLevel } from '../lib/levels';
import { Badge } from '../components/ui/Badge';

export function BadgesPage() {
  // Check for new unlocks
  checkAchievements();

  const unlocked = getUnlocked();
  const unlockedIds = new Set(unlocked.map(a => a.id));
  const xp = getTotalXp();
  const streak = getStreak();
  const level = getLevel();
  const { next, progress, xpNeeded } = getNextLevel();

  const categories = [
    { key: 'activity', label: 'Atividade', icon: '📊' },
    { key: 'sales', label: 'Vendas', icon: '💰' },
    { key: 'streak', label: 'Streak', icon: '🔥' },
    { key: 'milestone', label: 'Milestones', icon: '⭐' },
  ];

  return (
    <div className="space-y-4 animate-in">
      {/* Header stats */}
      <div>
        <h1 className="text-lg font-bold">Conquistas</h1>
        <p className="text-sm text-t3 mt-1">Seus badges, XP e progresso</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-surface border border-b1 rounded-lg p-4 text-center">
          <div className="text-2xl mb-1">{level.icon}</div>
          <div className={`text-lg font-bold ${level.color}`}>{level.name}</div>
          <div className="text-[10px] text-t4 uppercase">Level {level.rank}</div>
        </div>
        <div className="bg-surface border border-b1 rounded-lg p-4 text-center">
          <div className="font-mono text-lg font-bold text-vgold">{xp.toLocaleString()}</div>
          <div className="text-[10px] text-t4 uppercase">XP Total</div>
        </div>
        <div className="bg-surface border border-b1 rounded-lg p-4 text-center">
          <div className="font-mono text-lg font-bold text-orange-400">{streak.current}d</div>
          <div className="text-[10px] text-t4 uppercase">Streak Atual</div>
        </div>
        <div className="bg-surface border border-b1 rounded-lg p-4 text-center">
          <div className="font-mono text-lg font-bold text-vpurp">{unlocked.length}/{ACHIEVEMENTS.length}</div>
          <div className="text-[10px] text-t4 uppercase">Badges</div>
        </div>
      </div>

      {/* Level progress */}
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
            <span className="text-xs text-t3 font-mono">{xpNeeded.toLocaleString()} XP restam</span>
          </div>
          <div className="h-2 bg-overlay rounded-sm overflow-hidden">
            <div className="h-full bg-gradient-to-r from-vred to-vgold rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Badge categories */}
      {categories.map(cat => {
        const badges = ACHIEVEMENTS.filter(a => a.category === cat.key);
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
                  <div
                    key={ach.id}
                    className={`bg-surface border rounded-lg p-4 flex items-center gap-4 transition-all ${
                      earned ? 'border-vpurp/30 bg-vpurp/5' : 'border-b1 opacity-50 grayscale'
                    }`}
                  >
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
