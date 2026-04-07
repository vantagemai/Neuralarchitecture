import { db, getSession } from './store';

// Ficha values per action (formerly XP)
export const FICHA_VALUES = {
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

/** @deprecated Use FICHA_VALUES */
export const XP_VALUES = FICHA_VALUES;

export interface FichaEvent {
  type: keyof typeof FICHA_VALUES;
  amount: number;
  ts: number;
  description: string;
}

/** @deprecated Use FichaEvent */
export type XpEvent = FichaEvent;

function fichaKey(userId?: string): string {
  const id = userId || getSession()?.id || 'anon';
  return `xp_${id}`; // keep storage key for backward compat
}

function eventsKey(userId?: string): string {
  const id = userId || getSession()?.id || 'anon';
  return `xp_events_${id}`;
}

export function getTotalFichas(userId?: string): number {
  return db.get<number>(fichaKey(userId)) || 0;
}

/** @deprecated Use getTotalFichas */
export const getTotalXp = getTotalFichas;

export function getFichaEvents(userId?: string): FichaEvent[] {
  return db.get<FichaEvent[]>(eventsKey(userId)) || [];
}

/** @deprecated Use getFichaEvents */
export const getXpEvents = getFichaEvents;

export function awardFichas(type: keyof typeof FICHA_VALUES, amount?: number, description?: string, userId?: string): number {
  const pts = amount ?? FICHA_VALUES[type];
  const total = getTotalFichas(userId) + pts;
  db.set(fichaKey(userId), total);

  // Log event (keep last 100)
  const events = getFichaEvents(userId);
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

/** @deprecated Use awardFichas */
export const awardXp = awardFichas;

// Calculate fichas from a fill submission
export function awardFillFichas(contacts: number, responses: number): number {
  let total = 0;
  if (contacts > 0) {
    total += awardFichas('fill_contact', contacts * FICHA_VALUES.fill_contact, `${contacts} contatos`);
  }
  if (responses > 0) {
    total += awardFichas('fill_response', responses * FICHA_VALUES.fill_response, `${responses} respostas`);
  }
  if (contacts > 0) {
    total += awardFichas('fill_complete', FICHA_VALUES.fill_complete, 'Fill diario completo');
  }
  return total;
}

/** @deprecated Use awardFillFichas */
export const awardFillXp = awardFillFichas;

export function awardSaleFichas(): number {
  return awardFichas('sale_setup', FICHA_VALUES.sale_setup, 'Venda registrada');
}

/** @deprecated Use awardSaleFichas */
export const awardSaleXp = awardSaleFichas;
