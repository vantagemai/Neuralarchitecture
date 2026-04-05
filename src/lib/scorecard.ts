import { getTodayFills, getMonthSales, calcScore, getSession } from './store';
import { getTotalXp } from './xp';
import { getStreak } from './streaks';
import { getUnlocked } from './achievements';

export interface ScorecardData {
  activity: number;    // 0-100 based on today's fill score vs team avg
  revenue: number;     // 0-100 based on monthly commission vs team avg
  consistency: number; // 0-100 based on streak
  xp: number;          // 0-100 based on XP vs team avg
  badges: number;      // 0-100 based on % of achievements unlocked
  overall: number;     // weighted average
}

const WEIGHTS = {
  activity: 0.25,
  revenue: 0.25,
  consistency: 0.20,
  xp: 0.20,
  badges: 0.10,
};

function normalize(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(100, Math.round((value / max) * 100));
}

export function getScorecard(userId?: string): ScorecardData {
  const id = userId || getSession()?.id || 'anon';
  const fills = getTodayFills();
  const sales = getMonthSales();

  // Activity: my score vs max in team
  const myFill = fills.find(f => f.userId === id);
  const myScore = myFill ? calcScore(myFill) : 0;
  const maxScore = Math.max(1, ...fills.map(f => calcScore(f)));
  const activity = normalize(myScore, maxScore);

  // Revenue: my commission vs max
  const commByUser: Record<string, number> = {};
  sales.forEach(s => {
    const sid = s.sellerId || s.sellerName;
    commByUser[sid] = (commByUser[sid] || 0) + (s.sellerSetupComm || 0) + (s.sellerRecComm || 0);
  });
  const myComm = commByUser[id] || 0;
  const maxComm = Math.max(1, ...Object.values(commByUser));
  const revenue = normalize(myComm, maxComm);

  // Consistency: streak-based (30 days = 100%)
  const streak = getStreak(userId);
  const consistency = normalize(streak.current, 30);

  // XP: my XP vs max in team
  const myXp = getTotalXp(userId);
  // Approximate: 100% at 10000 XP
  const xp = normalize(myXp, 10000);

  // Badges: percentage unlocked
  const totalAch = 13; // from achievements.ts
  const unlocked = getUnlocked(userId).length;
  const badges = normalize(unlocked, totalAch);

  const overall = Math.round(
    activity * WEIGHTS.activity +
    revenue * WEIGHTS.revenue +
    consistency * WEIGHTS.consistency +
    xp * WEIGHTS.xp +
    badges * WEIGHTS.badges
  );

  return { activity, revenue, consistency, xp, badges, overall };
}
