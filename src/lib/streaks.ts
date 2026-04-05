import { db, getSession, today } from './store';

export interface StreakData {
  current: number;        // current streak days
  best: number;           // all-time best streak
  lastFillDate: string;   // YYYY-MM-DD of last fill
  freezesUsed: number;    // freeze uses this month
  freezeMonth: string;    // YYYY-MM for freeze tracking
}

function streakKey(userId?: string): string {
  const id = userId || getSession()?.id || 'anon';
  return `streak_${id}`;
}

export function getStreak(userId?: string): StreakData {
  return db.get<StreakData>(streakKey(userId)) || {
    current: 0,
    best: 0,
    lastFillDate: '',
    freezesUsed: 0,
    freezeMonth: '',
  };
}

export function updateStreak(userId?: string): { streak: StreakData; isNew: boolean; milestone: number | null } {
  const data = getStreak(userId);
  const todayStr = today();

  // Already filled today
  if (data.lastFillDate === todayStr) {
    return { streak: data, isNew: false, milestone: null };
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  let isNew = true;

  if (data.lastFillDate === yesterdayStr) {
    // Consecutive day
    data.current += 1;
  } else if (data.lastFillDate && data.lastFillDate < yesterdayStr) {
    // Missed a day — check freeze
    const currentMonth = todayStr.slice(0, 7);
    if (data.freezeMonth !== currentMonth) {
      data.freezesUsed = 0;
      data.freezeMonth = currentMonth;
    }
    if (data.freezesUsed < 1) {
      // Use freeze: keep streak but consume freeze
      data.freezesUsed += 1;
      data.current += 1;
    } else {
      // Streak broken
      data.current = 1;
    }
  } else {
    // First fill ever or long gap
    data.current = 1;
  }

  data.lastFillDate = todayStr;
  if (data.current > data.best) data.best = data.current;

  db.set(streakKey(userId), data);

  // Check milestones
  const milestones = [60, 30, 14, 7];
  let milestone: number | null = null;
  for (const m of milestones) {
    if (data.current === m) {
      milestone = m;
      break;
    }
  }

  return { streak: data, isNew, milestone };
}
