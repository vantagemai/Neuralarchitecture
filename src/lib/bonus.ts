import { db, currentMonth } from './store';

const BONUS_PER_10 = 100;

/**
 * Count total "Realizadas" (completed meetings) for a user in a given month.
 * Reads from fill data channel "visitas" fieldB.
 */
export function getMonthMeetings(userId: string, ym?: string): number {
  ym = ym || currentMonth();
  const keys = db.list('ops_fill_');
  let total = 0;
  for (const k of keys) {
    // key format: ops_fill_YYYY-MM-DD_userId
    if (!k.includes(`_${userId}`)) continue;
    const dateMatch = k.match(/ops_fill_(\d{4}-\d{2})/);
    if (!dateMatch || dateMatch[1] !== ym) continue;
    const fill = db.get<{ channels?: Record<string, { a?: string; b?: string }> }>(k);
    if (!fill?.channels?.visitas?.b) continue;
    total += parseInt(fill.channels.visitas.b) || 0;
  }
  return total;
}

/**
 * Calculate setter bonus for the month.
 * $100 for every 10 qualified meetings (Realizadas).
 */
export function getMonthBonus(userId: string, ym?: string): {
  meetings: number;
  bonus: number;
  nextAt: number;
  progress: number;
  cyclesDone: number;
} {
  const meetings = getMonthMeetings(userId, ym);
  const cyclesDone = Math.floor(meetings / 10);
  const bonus = cyclesDone * BONUS_PER_10;
  const inCycle = meetings % 10;
  const nextAt = 10 - inCycle;
  const progress = Math.round((inCycle / 10) * 100);

  return { meetings, bonus, nextAt, progress, cyclesDone };
}

/**
 * Get total meetings scheduled (Agendadas) for a user in a given month.
 */
export function getMonthScheduled(userId: string, ym?: string): number {
  ym = ym || currentMonth();
  const keys = db.list('ops_fill_');
  let total = 0;
  for (const k of keys) {
    if (!k.includes(`_${userId}`)) continue;
    const dateMatch = k.match(/ops_fill_(\d{4}-\d{2})/);
    if (!dateMatch || dateMatch[1] !== ym) continue;
    const fill = db.get<{ channels?: Record<string, { a?: string; b?: string }> }>(k);
    if (!fill?.channels?.visitas?.a) continue;
    total += parseInt(fill.channels.visitas.a) || 0;
  }
  return total;
}
