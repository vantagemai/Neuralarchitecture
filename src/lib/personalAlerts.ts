import { getGoalProgress } from './goals';
import { getStreak } from './streaks';
import { getMonthBonus } from './bonus';
import { getSession, getMonthSales, today, db, type FillData } from './store';
import { getUnlocked, ACHIEVEMENTS } from './achievements';

export interface PersonalAlert {
  type: 'warn' | 'ok' | 'info' | 'milestone';
  msg: string;
  icon: string;
  priority: number; // lower = higher priority
}

export function getPersonalAlerts(userId?: string): PersonalAlert[] {
  const id = userId || getSession()?.id || 'anon';
  const session = getSession();
  const alerts: PersonalAlert[] = [];

  // 1. Fill not done today
  const fillKey = `ops_fill_${today()}_${id}`;
  const hasFill = !!db.get<FillData>(fillKey);
  if (!hasFill) {
    const streak = getStreak(id);
    if (streak.current > 0) {
      alerts.push({
        type: 'warn',
        msg: `Preencha o fill para manter sua streak de ${streak.current}d!`,
        icon: '🔥',
        priority: 1,
      });
    } else {
      alerts.push({
        type: 'info',
        msg: 'Voce ainda nao preencheu o fill de hoje',
        icon: '📋',
        priority: 2,
      });
    }
  }

  // 2. Goal progress warnings (after 14h)
  const hour = new Date().getHours();
  if (hour >= 14 && hasFill) {
    const gp = getGoalProgress(id);
    if (gp.dailyContacts.pct < 50) {
      alerts.push({
        type: 'warn',
        msg: `Voce esta em ${gp.dailyContacts.pct}% da meta de contatos (${gp.dailyContacts.current}/${gp.dailyContacts.target})`,
        icon: '📞',
        priority: 3,
      });
    }
    if (gp.dailyScore.pct < 50) {
      alerts.push({
        type: 'warn',
        msg: `Score hoje em ${gp.dailyScore.pct}% da meta (${gp.dailyScore.current}/${gp.dailyScore.target})`,
        icon: '⚡',
        priority: 4,
      });
    }
  }

  // 3. Bonus proximity (Setter/Social Seller)
  const role = session?.role || '';
  if (role === 'Setter' || role === 'Social Seller') {
    const bonus = getMonthBonus(id);
    if (bonus.nextAt <= 2 && bonus.meetings > 0) {
      alerts.push({
        type: 'milestone',
        msg: `Mais ${bonus.nextAt} reuniao(oes) para ganhar +$100!`,
        icon: '🎯',
        priority: 5,
      });
    }
  }

  // 4. Commission milestones
  const name = session?.name || '';
  const mySales = getMonthSales().filter(s => s.sellerId === id || s.sellerName === name);
  const myComm = mySales.reduce((t, s) => t + (s.sellerSetupComm || 0) + (s.sellerRecComm || 0), 0);
  const milestones = [5000, 2000, 1000, 500];
  for (const m of milestones) {
    if (myComm >= m) {
      alerts.push({
        type: 'ok',
        msg: `Voce passou de $${m.toLocaleString()} em comissoes este mes!`,
        icon: '💰',
        priority: 10,
      });
      break; // only show highest milestone
    }
  }

  // 5. Achievement proximity
  const unlocked = getUnlocked(id);
  const unlockedIds = new Set(unlocked.map(a => a.id));
  const thresholds: Record<string, { current: () => number; target: number }> = {
    sales_5: { current: () => mySales.length, target: 5 },
    sales_20: { current: () => mySales.length, target: 20 },
    fill_10: { current: () => db.list('ops_fill_').filter(k => db.get<{ userId: string }>(k)?.userId === id).length, target: 10 },
    fill_50: { current: () => db.list('ops_fill_').filter(k => db.get<{ userId: string }>(k)?.userId === id).length, target: 50 },
  };
  for (const ach of ACHIEVEMENTS) {
    if (unlockedIds.has(ach.id)) continue;
    const t = thresholds[ach.id];
    if (!t) continue;
    const curr = t.current();
    const remaining = t.target - curr;
    if (remaining > 0 && remaining <= 3) {
      alerts.push({
        type: 'info',
        msg: `Faltam ${remaining} para o badge '${ach.name}'`,
        icon: ach.icon,
        priority: 8,
      });
      break; // only show closest
    }
  }

  // 6. Fill done + goals on track → positive
  if (hasFill) {
    const gp = getGoalProgress(id);
    if (gp.overall >= 80) {
      alerts.push({
        type: 'ok',
        msg: `Metas em ${gp.overall}% — excelente ritmo!`,
        icon: '🚀',
        priority: 15,
      });
    }
  }

  return alerts.sort((a, b) => a.priority - b.priority).slice(0, 5);
}
