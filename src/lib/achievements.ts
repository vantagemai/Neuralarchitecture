import { db, getSession } from './store';
import { getTotalXp } from './xp';
import { getStreak } from './streaks';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'activity' | 'sales' | 'streak' | 'social' | 'milestone';
  check: (userId?: string) => boolean;
}

export interface UnlockedAchievement {
  id: string;
  unlockedAt: number;
}

function achKey(userId?: string): string {
  const id = userId || getSession()?.id || 'anon';
  return `achievements_${id}`;
}

export function getUnlocked(userId?: string): UnlockedAchievement[] {
  return db.get<UnlockedAchievement[]>(achKey(userId)) || [];
}

export function isUnlocked(achievementId: string, userId?: string): boolean {
  return getUnlocked(userId).some(a => a.id === achievementId);
}

function unlockAchievement(achievementId: string, userId?: string): void {
  const list = getUnlocked(userId);
  if (list.some(a => a.id === achievementId)) return;
  list.push({ id: achievementId, unlockedAt: Date.now() });
  db.set(achKey(userId), list);
}

// Count fills for user
function countFills(userId?: string): number {
  const id = userId || getSession()?.id || 'anon';
  return db.list(`ops_fill_`).filter(k => {
    const fill = db.get<{ userId: string }>(k);
    return fill?.userId === id;
  }).length;
}

// Count sales for user
function countSales(userId?: string): number {
  const id = userId || getSession()?.id || 'anon';
  return db.list('ops_sale_').filter(k => {
    const sale = db.get<{ sellerId: string }>(k);
    return sale?.sellerId === id;
  }).length;
}

export const ACHIEVEMENTS: Achievement[] = [
  // Activity
  { id: 'first_fill', name: 'Primeiro Passo', description: 'Complete seu primeiro fill diario', icon: '📋', category: 'activity',
    check: (uid) => countFills(uid) >= 1 },
  { id: 'fill_10', name: 'Consistente', description: 'Complete 10 fills', icon: '📊', category: 'activity',
    check: (uid) => countFills(uid) >= 10 },
  { id: 'fill_50', name: 'Maquina', description: 'Complete 50 fills', icon: '⚙️', category: 'activity',
    check: (uid) => countFills(uid) >= 50 },

  // Sales
  { id: 'first_sale', name: 'Primeira Venda', description: 'Registre sua primeira venda', icon: '💰', category: 'sales',
    check: (uid) => countSales(uid) >= 1 },
  { id: 'sales_5', name: 'Vendedor', description: 'Registre 5 vendas', icon: '🤑', category: 'sales',
    check: (uid) => countSales(uid) >= 5 },
  { id: 'sales_20', name: 'Closer Elite', description: 'Registre 20 vendas', icon: '💎', category: 'sales',
    check: (uid) => countSales(uid) >= 20 },

  // Streak
  { id: 'streak_7', name: 'Semana de Fogo', description: '7 dias consecutivos de fill', icon: '🔥', category: 'streak',
    check: (uid) => getStreak(uid).best >= 7 },
  { id: 'streak_14', name: 'Duas Semanas', description: '14 dias consecutivos de fill', icon: '⚡', category: 'streak',
    check: (uid) => getStreak(uid).best >= 14 },
  { id: 'streak_30', name: 'Mes de Ferro', description: '30 dias consecutivos de fill', icon: '🏆', category: 'streak',
    check: (uid) => getStreak(uid).best >= 30 },
  { id: 'streak_60', name: 'Inarparavel', description: '60 dias consecutivos de fill', icon: '👑', category: 'streak',
    check: (uid) => getStreak(uid).best >= 60 },

  // Milestones
  { id: 'xp_1000', name: '1K Club', description: 'Alcance 1.000 XP', icon: '⭐', category: 'milestone',
    check: (uid) => getTotalXp(uid) >= 1000 },
  { id: 'xp_10000', name: '10K Club', description: 'Alcance 10.000 XP', icon: '🌟', category: 'milestone',
    check: (uid) => getTotalXp(uid) >= 10000 },
];

// Check all achievements and return newly unlocked ones
export function checkAchievements(userId?: string): Achievement[] {
  const newlyUnlocked: Achievement[] = [];
  for (const ach of ACHIEVEMENTS) {
    if (!isUnlocked(ach.id, userId) && ach.check(userId)) {
      unlockAchievement(ach.id, userId);
      newlyUnlocked.push(ach);
    }
  }
  return newlyUnlocked;
}
