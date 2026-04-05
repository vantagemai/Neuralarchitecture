import { db, getSession } from './store';
import { insertNotification as syncNotif, markNotificationsRead as syncMarkRead } from './supabaseSync';

export interface Notification {
  id: string;
  type: 'sale' | 'badge' | 'challenge' | 'shoutout' | 'levelup' | 'streak';
  title: string;
  detail?: string;
  icon: string;
  ts: number;
  read: boolean;
}

function notiKey(userId?: string): string {
  const id = userId || getSession()?.id || 'anon';
  return `notifications_${id}`;
}

export function getNotifications(userId?: string): Notification[] {
  return db.get<Notification[]>(notiKey(userId)) || [];
}

export function getUnreadCount(userId?: string): number {
  return getNotifications(userId).filter(n => !n.read).length;
}

export function addNotification(n: Omit<Notification, 'id' | 'ts' | 'read'>, userId?: string): void {
  const list = getNotifications(userId);
  const id = `noti_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const uid = userId || getSession()?.id || 'anon';
  list.unshift({
    ...n,
    id,
    ts: Date.now(),
    read: false,
  });
  // Keep max 50
  if (list.length > 50) list.length = 50;
  db.set(notiKey(userId), list);
  // Sync to Supabase
  syncNotif({ id, userId: uid, type: n.type, title: n.title, detail: n.detail, icon: n.icon, ts: Date.now() });
}

export function markAllRead(userId?: string): void {
  const list = getNotifications(userId);
  list.forEach(n => n.read = true);
  db.set(notiKey(userId), list);
  const uid = userId || getSession()?.id || 'anon';
  syncMarkRead(uid);
}

export function markRead(notificationId: string, userId?: string): void {
  const list = getNotifications(userId);
  const n = list.find(x => x.id === notificationId);
  if (n) n.read = true;
  db.set(notiKey(userId), list);
}

// Broadcast notification to all active users (except sender)
export function broadcastNotification(
  n: Omit<Notification, 'id' | 'ts' | 'read'>,
  excludeUserId?: string
): void {
  const users = db.get<{ id: string; active: boolean }[]>('ops_users') || [];
  users
    .filter(u => u.active && u.id !== excludeUserId)
    .forEach(u => addNotification(n, u.id));
}
