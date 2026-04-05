import { getTotalXp } from './xp';

export interface Level {
  rank: number;
  name: string;
  minXp: number;
  color: string;       // tailwind color class
  icon: string;        // emoji
}

export const LEVELS: Level[] = [
  { rank: 1, name: 'Rookie',    minXp: 0,      color: 'text-t3',    icon: '⚪' },
  { rank: 2, name: 'Bronze',    minXp: 100,    color: 'text-amber-600', icon: '🟤' },
  { rank: 3, name: 'Silver',    minXp: 500,    color: 'text-gray-400',  icon: '⚪' },
  { rank: 4, name: 'Gold',      minXp: 1500,   color: 'text-vgold',  icon: '🟡' },
  { rank: 5, name: 'Platinum',  minXp: 5000,   color: 'text-cyan-400',  icon: '💎' },
  { rank: 6, name: 'Diamond',   minXp: 15000,  color: 'text-vblue',  icon: '💠' },
  { rank: 7, name: 'Elite',     minXp: 50000,  color: 'text-vpurp',  icon: '👑' },
  { rank: 8, name: 'Legend',    minXp: 150000, color: 'text-vred',   icon: '🔥' },
];

export function getLevel(userId?: string): Level {
  const xp = getTotalXp(userId);
  let current = LEVELS[0];
  for (const lvl of LEVELS) {
    if (xp >= lvl.minXp) current = lvl;
  }
  return current;
}

export function getNextLevel(userId?: string): { next: Level | null; progress: number; xpNeeded: number } {
  const xp = getTotalXp(userId);
  const current = getLevel(userId);
  const idx = LEVELS.indexOf(current);

  if (idx >= LEVELS.length - 1) {
    return { next: null, progress: 100, xpNeeded: 0 };
  }

  const next = LEVELS[idx + 1];
  const rangeStart = current.minXp;
  const rangeEnd = next.minXp;
  const progress = Math.min(100, Math.round(((xp - rangeStart) / (rangeEnd - rangeStart)) * 100));
  const xpNeeded = rangeEnd - xp;

  return { next, progress, xpNeeded };
}

export function getLevelByXp(xp: number): Level {
  let current = LEVELS[0];
  for (const lvl of LEVELS) {
    if (xp >= lvl.minXp) current = lvl;
  }
  return current;
}
