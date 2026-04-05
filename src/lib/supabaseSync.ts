/**
 * Supabase Sync Layer
 * Strategy: localStorage for instant reads, Supabase for persistence + real-time
 * All writes go to both. Reads prioritize localStorage (zero latency).
 * On init, we pull from Supabase to hydrate localStorage.
 */

import { supabase, isOnline } from './supabase';
import type { UserData, SaleData, FillData } from './store';

// ============================================
// USERS
// ============================================

export async function syncUsers(): Promise<UserData[]> {
  if (!isOnline()) return [];
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return data.map(mapUserFromDb);
}

export async function upsertUser(user: UserData): Promise<void> {
  if (!isOnline()) return;
  await supabase.from('users').upsert(mapUserToDb(user));
}

export async function upsertUsers(users: UserData[]): Promise<void> {
  if (!isOnline()) return;
  await supabase.from('users').upsert(users.map(mapUserToDb));
}

function mapUserFromDb(row: Record<string, unknown>): UserData {
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    password: row.password as string,
    role: row.role as string,
    plan: row.plan as string | undefined,
    active: row.active as boolean,
    avatar: row.avatar as string | undefined,
    createdAt: row.created_at as number,
  };
}

function mapUserToDb(u: UserData): Record<string, unknown> {
  return {
    id: u.id, name: u.name, email: u.email, password: u.password,
    role: u.role, plan: u.plan, active: u.active, avatar: u.avatar,
    created_at: u.createdAt,
  };
}

// ============================================
// SALES
// ============================================

export async function syncSales(ym?: string): Promise<SaleData[]> {
  if (!isOnline()) return [];
  let query = supabase.from('sales').select('*').order('ts', { ascending: false });
  if (ym) query = query.like('date', `${ym}%`);
  const { data, error } = await query;
  if (error || !data) return [];
  return data.map(mapSaleFromDb);
}

export async function insertSale(sale: SaleData): Promise<void> {
  if (!isOnline()) return;
  await supabase.from('sales').upsert(mapSaleToDb(sale));
}

export async function deleteSale(id: string): Promise<void> {
  if (!isOnline()) return;
  await supabase.from('sales').delete().eq('id', id);
}

function mapSaleFromDb(row: Record<string, unknown>): SaleData {
  return {
    id: row.id as string,
    date: row.date as string,
    sellerId: row.seller_id as string,
    sellerName: row.seller_name as string,
    sellerRole: row.seller_role as string,
    setterId: row.setter_id as string | undefined,
    setterName: row.setter_name as string | undefined,
    setupValue: Number(row.setup_value),
    recValue: Number(row.rec_value),
    sellerSetupComm: Number(row.seller_setup_comm),
    sellerRecComm: Number(row.seller_rec_comm),
    setterSetupComm: Number(row.setter_setup_comm),
    setterRecComm: Number(row.setter_rec_comm),
    ts: row.ts as number,
  };
}

function mapSaleToDb(s: SaleData): Record<string, unknown> {
  return {
    id: s.id, date: s.date,
    seller_id: s.sellerId, seller_name: s.sellerName, seller_role: s.sellerRole,
    setter_id: s.setterId || null, setter_name: s.setterName || null,
    setup_value: s.setupValue, rec_value: s.recValue,
    seller_setup_comm: s.sellerSetupComm, seller_rec_comm: s.sellerRecComm,
    setter_setup_comm: s.setterSetupComm || 0, setter_rec_comm: s.setterRecComm || 0,
    ts: s.ts,
  };
}

// ============================================
// FILLS
// ============================================

export async function syncFills(date: string): Promise<FillData[]> {
  if (!isOnline()) return [];
  const { data, error } = await supabase
    .from('fills')
    .select('*')
    .eq('fill_date', date);
  if (error || !data) return [];
  return data.map(mapFillFromDb);
}

export async function upsertFill(fill: FillData, fillDate: string): Promise<void> {
  if (!isOnline()) return;
  const id = `ops_fill_${fillDate}_${fill.userId}`;
  await supabase.from('fills').upsert({
    id,
    user_id: fill.userId,
    user_name: fill.userName,
    user_role: fill.userRole,
    channels: fill.channels,
    obs: fill.obs,
    score: fill.score,
    fill_date: fillDate,
    ts: fill.ts,
  });
}

function mapFillFromDb(row: Record<string, unknown>): FillData {
  return {
    userId: row.user_id as string,
    userName: row.user_name as string,
    userRole: row.user_role as string,
    channels: row.channels as Record<string, { a: string; b: string }>,
    obs: row.obs as string,
    score: row.score as number,
    ts: row.ts as number,
  };
}

// ============================================
// DEALS (Kanban)
// ============================================

export async function syncDeals(): Promise<Record<string, unknown>[]> {
  if (!isOnline()) return [];
  const { data, error } = await supabase.from('deals').select('*').order('ts');
  if (error || !data) return [];
  return data;
}

export async function upsertDeal(deal: Record<string, unknown>): Promise<void> {
  if (!isOnline()) return;
  await supabase.from('deals').upsert({
    id: deal.id,
    name: deal.name,
    company: deal.company,
    value: deal.value,
    stage: deal.stage,
    assigned_to: deal.assignedTo,
    assigned_name: deal.assignedName,
    probability: deal.probability,
    notes: deal.notes,
    created_at: deal.createdAt,
    ts: deal.ts,
  });
}

export async function removeDeal(id: string): Promise<void> {
  if (!isOnline()) return;
  await supabase.from('deals').delete().eq('id', id);
}

// ============================================
// OPPORTUNITIES
// ============================================

export async function syncOpps(): Promise<Record<string, unknown>[]> {
  if (!isOnline()) return [];
  const { data, error } = await supabase.from('opportunities').select('*').order('ts');
  if (error || !data) return [];
  return data;
}

export async function upsertOpp(opp: Record<string, unknown>): Promise<void> {
  if (!isOnline()) return;
  await supabase.from('opportunities').upsert({
    id: opp.id, date: opp.date,
    setter_id: opp.setterId, setter_name: opp.setterName,
    founder_id: opp.founderId, founder_name: opp.founderName,
    count: opp.count, status: opp.status,
    confirmed_count: opp.confirmedCount, ts: opp.ts,
  });
}

// ============================================
// NOTIFICATIONS
// ============================================

export async function syncNotifications(userId: string): Promise<Record<string, unknown>[]> {
  if (!isOnline()) return [];
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('ts', { ascending: false })
    .limit(50);
  if (error || !data) return [];
  return data;
}

export async function insertNotification(n: { id: string; userId: string; type: string; title: string; detail?: string; icon: string; ts: number }): Promise<void> {
  if (!isOnline()) return;
  await supabase.from('notifications').insert({
    id: n.id, user_id: n.userId, type: n.type,
    title: n.title, detail: n.detail, icon: n.icon, ts: n.ts,
  });
}

export async function markNotificationsRead(userId: string): Promise<void> {
  if (!isOnline()) return;
  await supabase.from('notifications').update({ read: true }).eq('user_id', userId);
}

// ============================================
// XP & GAMIFICATION
// ============================================

export async function syncXpTotal(userId: string): Promise<number> {
  if (!isOnline()) return 0;
  const { data } = await supabase.from('xp_totals').select('total').eq('user_id', userId).single();
  return data?.total || 0;
}

export async function upsertXpTotal(userId: string, total: number): Promise<void> {
  if (!isOnline()) return;
  await supabase.from('xp_totals').upsert({ user_id: userId, total });
}

export async function insertXpEvent(userId: string, event: { type: string; amount: number; description: string; ts: number }): Promise<void> {
  if (!isOnline()) return;
  await supabase.from('xp_events').insert({
    user_id: userId, type: event.type, amount: event.amount,
    description: event.description, ts: event.ts,
  });
}

export async function syncAchievements(userId: string): Promise<{ id: string; unlockedAt: number }[]> {
  if (!isOnline()) return [];
  const { data, error } = await supabase.from('achievements').select('*').eq('user_id', userId);
  if (error || !data) return [];
  return data.map(r => ({ id: r.achievement_id, unlockedAt: r.unlocked_at }));
}

export async function insertAchievement(userId: string, achievementId: string): Promise<void> {
  if (!isOnline()) return;
  await supabase.from('achievements').upsert({
    user_id: userId, achievement_id: achievementId, unlocked_at: Date.now(),
  });
}

export async function syncStreak(userId: string): Promise<Record<string, unknown> | null> {
  if (!isOnline()) return null;
  const { data } = await supabase.from('streaks').select('*').eq('user_id', userId).single();
  return data;
}

export async function upsertStreak(userId: string, streak: { current: number; best: number; lastFillDate: string; freezesUsed: number; freezeMonth: string }): Promise<void> {
  if (!isOnline()) return;
  await supabase.from('streaks').upsert({
    user_id: userId, current: streak.current, best: streak.best,
    last_fill_date: streak.lastFillDate, freezes_used: streak.freezesUsed,
    freeze_month: streak.freezeMonth,
  });
}

// ============================================
// GOALS
// ============================================

export async function syncGoals(userId: string): Promise<Record<string, unknown> | null> {
  if (!isOnline()) return null;
  const { data } = await supabase.from('goals').select('*').eq('user_id', userId).single();
  return data;
}

export async function upsertGoals(userId: string, goals: { dailyContacts: number; dailyScore: number; monthlySales: number; monthlyRevenue: number }): Promise<void> {
  if (!isOnline()) return;
  await supabase.from('goals').upsert({
    user_id: userId, daily_contacts: goals.dailyContacts,
    daily_score: goals.dailyScore, monthly_sales: goals.monthlySales,
    monthly_revenue: goals.monthlyRevenue,
  });
}

// ============================================
// SHOUTOUTS
// ============================================

export async function syncShoutouts(): Promise<Record<string, unknown>[]> {
  if (!isOnline()) return [];
  const { data, error } = await supabase
    .from('shoutouts')
    .select('*')
    .order('ts', { ascending: false })
    .limit(20);
  if (error || !data) return [];
  return data;
}

export async function insertShoutout(s: Record<string, unknown>): Promise<void> {
  if (!isOnline()) return;
  await supabase.from('shoutouts').upsert({
    id: s.id, from_id: s.fromId, from_name: s.fromName,
    to_id: s.toId, to_name: s.toName,
    message: s.message, emoji: s.emoji, reactions: s.reactions, ts: s.ts,
  });
}

// ============================================
// COACHING
// ============================================

export async function syncCoachingNotes(memberId: string): Promise<Record<string, unknown>[]> {
  if (!isOnline()) return [];
  const { data, error } = await supabase
    .from('coaching_notes')
    .select('*')
    .eq('member_id', memberId)
    .order('ts', { ascending: false });
  if (error || !data) return [];
  return data;
}

export async function insertCoachingNote(note: Record<string, unknown>): Promise<void> {
  if (!isOnline()) return;
  await supabase.from('coaching_notes').insert({
    id: note.id, manager_id: note.managerId, member_id: note.memberId,
    date: note.date, rating: note.rating, notes: note.notes,
    action_items: note.actionItems, ts: note.ts,
  });
}

// ============================================
// CONFIG
// ============================================

export async function syncConfig(key: string): Promise<unknown> {
  if (!isOnline()) return null;
  const { data } = await supabase.from('config').select('value').eq('key', key).single();
  return data?.value || null;
}

export async function upsertConfig(key: string, value: unknown): Promise<void> {
  if (!isOnline()) return;
  await supabase.from('config').upsert({ key, value, updated_at: Date.now() });
}

// ============================================
// REAL-TIME SUBSCRIPTIONS
// ============================================

type Callback = () => void;

export function subscribeSales(cb: Callback) {
  return supabase.channel('sales-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, cb)
    .subscribe();
}

export function subscribeFills(date: string, cb: Callback) {
  return supabase.channel(`fills-${date}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'fills', filter: `fill_date=eq.${date}` }, cb)
    .subscribe();
}

export function subscribeShoutouts(cb: Callback) {
  return supabase.channel('shoutouts-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'shoutouts' }, cb)
    .subscribe();
}

export function subscribeDeals(cb: Callback) {
  return supabase.channel('deals-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'deals' }, cb)
    .subscribe();
}

export function subscribeNotifications(userId: string, cb: Callback) {
  return supabase.channel(`notifs-${userId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, cb)
    .subscribe();
}

// ============================================
// INITIAL HYDRATION (pull from Supabase → localStorage)
// ============================================

const PREFIX = 'vops_';

export async function hydrateFromSupabase(): Promise<void> {
  if (!isOnline()) return;
  console.log('[Sync] Hydrating from Supabase...');

  try {
    // 1. Users
    const users = await syncUsers();
    if (users.length > 0) {
      localStorage.setItem(PREFIX + 'ops_users', JSON.stringify(users));
    }

    // 2. Today's fills
    const todayStr = new Date().toISOString().split('T')[0];
    const fills = await syncFills(todayStr);
    fills.forEach(f => {
      const key = `ops_fill_${todayStr}_${f.userId}`;
      localStorage.setItem(PREFIX + key, JSON.stringify(f));
    });

    // 3. This month's sales
    const ym = new Date().toISOString().slice(0, 7);
    const sales = await syncSales(ym);
    sales.forEach(s => {
      localStorage.setItem(PREFIX + s.id, JSON.stringify(s));
    });

    // 4. Deals
    const deals = await syncDeals();
    deals.forEach(d => {
      const deal = {
        id: d.id, name: d.name, company: d.company, value: d.value,
        stage: d.stage, assignedTo: d.assigned_to, assignedName: d.assigned_name,
        probability: d.probability, notes: d.notes, createdAt: d.created_at, ts: d.ts,
      };
      localStorage.setItem(PREFIX + (d.id as string), JSON.stringify(deal));
    });

    // 5. Config
    const config = await syncConfig('ops_config');
    if (config) localStorage.setItem(PREFIX + 'ops_config', JSON.stringify(config));

    console.log('[Sync] Hydration complete');
  } catch (err) {
    console.warn('[Sync] Hydration error:', err);
  }
}

// ============================================
// PUSH local → Supabase (for initial migration)
// ============================================

export async function pushLocalToSupabase(): Promise<{ pushed: number }> {
  if (!isOnline()) return { pushed: 0 };
  let pushed = 0;

  try {
    // Users
    const usersRaw = localStorage.getItem(PREFIX + 'ops_users');
    if (usersRaw) {
      const users = JSON.parse(usersRaw) as UserData[];
      if (users.length > 0) {
        await upsertUsers(users);
        pushed += users.length;
      }
    }

    // Sales
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(PREFIX + 'ops_sale_')) {
        const sale = JSON.parse(localStorage.getItem(key)!) as SaleData;
        await insertSale(sale);
        pushed++;
      }
    }

    // Fills
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(PREFIX + 'ops_fill_')) {
        const fill = JSON.parse(localStorage.getItem(key)!) as FillData;
        const dateMatch = key.match(/ops_fill_(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) await upsertFill(fill, dateMatch[1]);
        pushed++;
      }
    }

    // Deals
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(PREFIX + 'ops_deal_')) {
        const deal = JSON.parse(localStorage.getItem(key)!);
        await upsertDeal(deal);
        pushed++;
      }
    }

    // Opps
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(PREFIX + 'ops_opp_')) {
        const opp = JSON.parse(localStorage.getItem(key)!);
        await upsertOpp(opp);
        pushed++;
      }
    }

    // Shoutouts
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(PREFIX + 'ops_shoutout_')) {
        const s = JSON.parse(localStorage.getItem(key)!);
        await insertShoutout(s);
        pushed++;
      }
    }

    // XP + Streaks + Achievements per user
    const usersForXp = JSON.parse(localStorage.getItem(PREFIX + 'ops_users') || '[]') as UserData[];
    for (const u of usersForXp) {
      const xp = localStorage.getItem(PREFIX + `xp_${u.id}`);
      if (xp) await upsertXpTotal(u.id, JSON.parse(xp));

      const streak = localStorage.getItem(PREFIX + `streak_${u.id}`);
      if (streak) await upsertStreak(u.id, JSON.parse(streak));

      const achs = localStorage.getItem(PREFIX + `achievements_${u.id}`);
      if (achs) {
        const list = JSON.parse(achs) as { id: string; unlockedAt: number }[];
        for (const a of list) await insertAchievement(u.id, a.id);
      }

      const goals = localStorage.getItem(PREFIX + `goals_${u.id}`);
      if (goals) await upsertGoals(u.id, JSON.parse(goals));
    }

    // Config
    const config = localStorage.getItem(PREFIX + 'ops_config');
    if (config) await upsertConfig('ops_config', JSON.parse(config));

    console.log(`[Sync] Pushed ${pushed} records to Supabase`);
  } catch (err) {
    console.warn('[Sync] Push error:', err);
  }

  return { pushed };
}
