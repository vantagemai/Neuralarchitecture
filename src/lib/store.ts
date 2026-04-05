// Simple localStorage-based storage for demo
// In production, replace with Supabase calls

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
  },
};

// Helpers
export const today = () => new Date().toISOString().split('T')[0];
export const currentMonth = () => new Date().toISOString().slice(0, 7);
export const fmtDate = (d: string) => {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};
export const fmt$ = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

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
