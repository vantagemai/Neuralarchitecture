// Dual storage: localStorage (instant) + Supabase (persistent)
// Reads from localStorage, writes to both.
// Supabase sync is fire-and-forget (non-blocking).

import * as sync from './supabaseSync';

const PREFIX = 'vops_';

export const db = {
  get<T = unknown>(key: string): T | null {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  set(key: string, value: unknown): boolean {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
      // Async sync to Supabase based on key pattern
      queueSync(key, value);
      return true;
    } catch {
      return false;
    }
  },

  list(prefix: string): string[] {
    const keys: string[] = [];
    const fullPrefix = PREFIX + prefix;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(fullPrefix)) {
        keys.push(k.slice(PREFIX.length));
      }
    }
    return keys;
  },

  remove(key: string): void {
    localStorage.removeItem(PREFIX + key);
    queueRemove(key);
  },
};

// Fire-and-forget Supabase sync based on key patterns
function queueSync(key: string, value: unknown): void {
  try {
    if (key === 'ops_users') {
      sync.upsertUsers(value as UserData[]);
    } else if (key.startsWith('ops_sale_')) {
      sync.insertSale(value as SaleData);
    } else if (key.startsWith('ops_fill_')) {
      const dateMatch = key.match(/ops_fill_(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) sync.upsertFill(value as FillData, dateMatch[1]);
    } else if (key.startsWith('ops_deal_')) {
      sync.upsertDeal(value as Record<string, unknown>);
    } else if (key.startsWith('ops_opp_')) {
      sync.upsertOpp(value as Record<string, unknown>);
    } else if (key.startsWith('ops_shoutout_')) {
      sync.insertShoutout(value as Record<string, unknown>);
    } else if (key.startsWith('coaching_')) {
      sync.insertCoachingNote(value as Record<string, unknown>);
    } else if (key === 'ops_config') {
      sync.upsertConfig('ops_config', value);
    } else if (key.startsWith('xp_') && !key.startsWith('xp_events_')) {
      const userId = key.replace('xp_', '');
      sync.upsertXpTotal(userId, value as number);
    } else if (key.startsWith('streak_')) {
      const userId = key.replace('streak_', '');
      sync.upsertStreak(userId, value as { current: number; best: number; lastFillDate: string; freezesUsed: number; freezeMonth: string });
    } else if (key.startsWith('achievements_')) {
      // Achievements are synced individually by achievements.ts
    } else if (key.startsWith('goals_')) {
      const userId = key.replace('goals_', '');
      sync.upsertGoals(userId, value as { dailyContacts: number; dailyScore: number; monthlySales: number; monthlyRevenue: number });
    }
  } catch {
    // Non-blocking: Supabase sync failures don't affect app
  }
}

function queueRemove(key: string): void {
  try {
    if (key.startsWith('ops_sale_')) {
      sync.deleteSale(key);
    } else if (key.startsWith('ops_deal_')) {
      sync.removeDeal(key);
    }
  } catch {
    // Non-blocking
  }
}

// Session helper — single source of truth for current user
export function getSession(): { id: string; name: string; role: string; email: string } | null {
  try {
    const raw = localStorage.getItem('vantagem_session');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// Helpers
export const today = () => new Date().toISOString().split('T')[0];
export const currentMonth = () => new Date().toISOString().slice(0, 7);
export const fmtDate = (d: string) => {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};
export const fmt$ = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

export function getMyMonthCommission(userId?: string): number {
  const id = userId || getSession()?.id || 'anon';
  const name = getSession()?.name || '';
  return getMonthSales()
    .filter(s => s.sellerId === id || s.sellerName === name)
    .reduce((t, s) => t + (s.sellerSetupComm || 0) + (s.sellerRecComm || 0), 0);
}

// Channel definitions
export const CHANNELS = [
  { id: 'coldcall',  icon: '📵', label: 'Cold Call',  fieldA: 'Contatos',   fieldB: 'Respostas' },
  { id: 'instagram', icon: '📸', label: 'Instagram',  fieldA: 'DMs Enviadas', fieldB: 'Respostas' },
  { id: 'whatsapp',  icon: '💬', label: 'WhatsApp',   fieldA: 'Mensagens',  fieldB: 'Respostas' },
  { id: 'calls',     icon: '📞', label: 'Calls',      fieldA: 'Ligações',   fieldB: 'Conectadas' },
  { id: 'visitas',   icon: '🤝', label: 'Visitas',    fieldA: 'Agendadas',  fieldB: 'Realizadas' },
] as const;

export type ChannelId = typeof CHANNELS[number]['id'];

export interface ChannelData {
  a: string;
  b: string;
}

export interface FillData {
  userId: string;
  userName: string;
  userRole: string;
  channels: Record<string, ChannelData>;
  obs: string;
  score: number;
  ts: number;
}

export interface SaleData {
  id: string;
  date: string;
  sellerId: string;
  sellerName: string;
  sellerRole: string;
  setterId?: string;
  setterName?: string;
  setupValue: number;
  recValue: number;
  sellerSetupComm: number;
  sellerRecComm: number;
  setterSetupComm?: number;
  setterRecComm?: number;
  ts: number;
}

export interface UserData {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
  plan?: string;
  active: boolean;
  createdAt: number;
  avatar?: string;
}

export function calcScore(fill: FillData | null): number {
  if (!fill?.channels) return 0;
  let total = 0;
  for (const ch of Object.values(fill.channels)) {
    total += parseInt(ch.a) || 0;
  }
  return total;
}

export function getUsers(): UserData[] {
  return db.get<UserData[]>('ops_users') || [];
}

export function getTodayFills(): FillData[] {
  const keys = db.list(`ops_fill_${today()}_`);
  return keys.map(k => db.get<FillData>(k)).filter(Boolean) as FillData[];
}

export function getMonthSales(ym?: string): SaleData[] {
  ym = ym || currentMonth();
  const keys = db.list('ops_sale_');
  return keys
    .map(k => db.get<SaleData>(k))
    .filter((s): s is SaleData => s !== null && s.date?.startsWith(ym!));
}
