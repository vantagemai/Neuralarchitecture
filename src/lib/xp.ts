import { db, getSession } from './store';

// XP values per action
export const XP_VALUES = {
  fill_contact: 1,       // per contact in fill
  fill_response: 2,      // per response in fill
  fill_complete: 10,     // bonus for completing daily fill
  sale_setup: 500,       // registering a sale
  opp_confirmed: 50,     // opportunity confirmed
  streak_7d: 100,        // 7-day streak bonus
  streak_14d: 250,       // 14-day streak bonus
  streak_30d: 500,       // 30-day streak bonus
  streak_60d: 1000,      // 60-day streak bonus
} as const;

export interface XpEvent {
  type: keyof typeof XP_VALUES;
  amount: number;
  ts: number;
  description: string;
}

function xpKey(userId?: string): string {
  const id = userId || getSession()?.id || 'anon';
  return `xp_${id}`;
}

function eventsKey(userId?: string): string {
  const id = userId || getSession()?.id || 'anon';
  return `xp_events_${id}`;
}

export function getTotalXp(userId?: string): number {
  return db.get<number>(xpKey(userId)) || 0;
}

export function getXpEvents(userId?: string): XpEvent[] {
  return db.get<XpEvent[]>(eventsKey(userId)) || [];
}

export function awardXp(type: keyof typeof XP_VALUES, amount?: number, description?: string, userId?: string): number {
  const pts = amount ?? XP_VALUES[type];
  const total = getTotalXp(userId) + pts;
  db.set(xpKey(userId), total);

  // Log event (keep last 100)
  const events = getXpEvents(userId);
  events.unshift({
    type,
    amount: pts,
    ts: Date.now(),
    description: description || type.replace(/_/g, ' '),
  });
  if (events.length > 100) events.length = 100;
  db.set(eventsKey(userId), events);

  return pts;
}

// Calculate XP from a fill submission
export function awardFillXp(contacts: number, responses: number): number {
  let total = 0;
  if (contacts > 0) {
    total += awardXp('fill_contact', contacts * XP_VALUES.fill_contact, `${contacts} contatos`);
  }
  if (responses > 0) {
    total += awardXp('fill_response', responses * XP_VALUES.fill_response, `${responses} respostas`);
  }
  if (contacts > 0) {
    total += awardXp('fill_complete', XP_VALUES.fill_complete, 'Fill diario completo');
  }
  return total;
}

export function awardSaleXp(): number {
  return awardXp('sale_setup', XP_VALUES.sale_setup, 'Venda registrada');
}
