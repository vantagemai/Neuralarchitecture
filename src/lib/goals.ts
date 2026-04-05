import { db, getSession, getTodayFills, getMonthSales, calcScore } from './store';

export interface UserGoals {
  dailyContacts: number;  // target contacts per day
  dailyScore: number;     // target fill score per day
  monthlySales: number;   // target sales per month
  monthlyRevenue: number; // target revenue per month
}

const DEFAULT_GOALS: UserGoals = {
  dailyContacts: 50,
  dailyScore: 50,
  monthlySales: 5,
  monthlyRevenue: 5000,
};

function goalsKey(userId?: string): string {
  const id = userId || getSession()?.id || 'anon';
  return `goals_${id}`;
}

export function getGoals(userId?: string): UserGoals {
  return db.get<UserGoals>(goalsKey(userId)) || DEFAULT_GOALS;
}

export function setGoals(goals: UserGoals, userId?: string): void {
  db.set(goalsKey(userId), goals);
}

export interface GoalProgress {
  dailyContacts: { current: number; target: number; pct: number };
  dailyScore: { current: number; target: number; pct: number };
  monthlySales: { current: number; target: number; pct: number };
  monthlyRevenue: { current: number; target: number; pct: number };
  overall: number; // 0-100
}

export function getGoalProgress(userId?: string): GoalProgress {
  const id = userId || getSession()?.id || 'anon';
  const goals = getGoals(userId);
  const fills = getTodayFills();
  const sales = getMonthSales();

  const myFill = fills.find(f => f.userId === id);
  const myScore = myFill ? calcScore(myFill) : 0;
  const myContacts = myFill
    ? Object.values(myFill.channels).reduce((t, ch) => t + (parseInt(ch.a) || 0), 0)
    : 0;

  const mySales = sales.filter(s => s.sellerId === id || s.sellerName === (myFill?.userName || ''));
  const myRevenue = mySales.reduce((t, s) => t + (s.sellerSetupComm || 0) + (s.sellerRecComm || 0), 0);

  const pct = (current: number, target: number) =>
    target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

  const dc = { current: myContacts, target: goals.dailyContacts, pct: pct(myContacts, goals.dailyContacts) };
  const ds = { current: myScore, target: goals.dailyScore, pct: pct(myScore, goals.dailyScore) };
  const ms = { current: mySales.length, target: goals.monthlySales, pct: pct(mySales.length, goals.monthlySales) };
  const mr = { current: myRevenue, target: goals.monthlyRevenue, pct: pct(myRevenue, goals.monthlyRevenue) };

  const overall = Math.round((dc.pct + ds.pct + ms.pct + mr.pct) / 4);

  return { dailyContacts: dc, dailyScore: ds, monthlySales: ms, monthlyRevenue: mr, overall };
}
