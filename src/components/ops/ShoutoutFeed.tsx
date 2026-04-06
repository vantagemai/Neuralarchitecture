import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Send } from 'lucide-react';
import { db, getSession, getUsers } from '../../lib/store';
import { broadcastNotification } from '../../lib/notifications';

interface Shoutout {
  id: string;
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  message: string;
  emoji: string;
  ts: number;
  reactions: Record<string, number>;
}

const EMOJIS = ['🔥', '💪', '🎯', '👑', '🚀', '⭐'];

function getShoutouts(): Shoutout[] {
  const keys = db.list('ops_shoutout_');
  return keys.map(k => db.get<Shoutout>(k)).filter(Boolean).sort((a, b) => (b as Shoutout).ts - (a as Shoutout).ts) as Shoutout[];
}

function Avatar({ userId, name }: { userId: string; name: string }) {
  const url = localStorage.getItem(`vantagem_avatar_${userId}`);
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return url ? (
    <img src={url} alt={name} className="w-8 h-8 rounded-full object-cover border border-b1 shrink-0" />
  ) : (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-vred to-vred-dark flex items-center justify-center text-white text-[10px] font-bold shrink-0">
      {initials}
    </div>
  );
}

export function ShoutoutFeed() {
  const session = getSession();
  const users = getUsers().filter(u => u.active && u.id !== session?.id);
  const [toId, setToId] = useState('');
  const [message, setMessage] = useState('');
  const [emoji, setEmoji] = useState('🔥');
  const [shoutouts, setShoutouts] = useState(getShoutouts);

  const handleSend = () => {
    if (!toId || !message.trim()) return;
    const to = users.find(u => u.id === toId);
    if (!to) return;

    const s: Shoutout = {
      id: `ops_shoutout_${Date.now()}`,
      fromId: session?.id || 'anon',
      fromName: session?.name || 'Anon',
      toId: to.id,
      toName: to.name,
      message: message.trim(),
      emoji,
      ts: Date.now(),
      reactions: {},
    };
    db.set(s.id, s);
    setShoutouts([s, ...shoutouts]);
    setMessage('');
    setToId('');
    // Notify recipient
    broadcastNotification(
      { type: 'shoutout', title: `${session?.name} te reconheceu!`, detail: message.trim(), icon: emoji },
      session?.id
    );
  };

  const addReaction = (shoutout: Shoutout, reactionEmoji: string) => {
    const updated = {
      ...shoutout,
      reactions: {
        ...shoutout.reactions,
        [reactionEmoji]: (shoutout.reactions[reactionEmoji] || 0) + 1,
      },
    };
    db.set(shoutout.id, updated);
    setShoutouts(prev => prev.map(s => s.id === shoutout.id ? updated : s));
  };

  const relativeTime = (ts: number) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  return (
    <div className="space-y-4">
      {/* Compose */}
      <div className="bg-surface border border-b1 rounded-lg p-4">
        <div className="text-[10px] text-t4 uppercase tracking-wider font-bold mb-3">Reconhecer alguem</div>
        <div className="flex gap-3 mb-3">
          <select value={toId} onChange={e => setToId(e.target.value)}
            className="flex-1 bg-elevated border border-b1 rounded-lg px-3 py-2 text-sm outline-none cursor-pointer">
            <option value="">Para quem?</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <div className="flex gap-1">
            {EMOJIS.map(e => (
              <button key={e} onClick={() => setEmoji(e)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all ${
                  emoji === e ? 'bg-vred/20 border border-vred/30 scale-110' : 'bg-elevated hover:bg-muted'
                }`}>
                {e}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <input value={message} onChange={e => setMessage(e.target.value)}
            placeholder="Mandou bem na call hoje!"
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            className="flex-1 bg-elevated border border-b1 rounded-lg px-3 py-2 text-sm outline-none focus:border-vred/40" />
          <button onClick={handleSend} disabled={!toId || !message.trim()}
            className="bg-vred hover:bg-vred-dark disabled:opacity-40 text-white px-4 py-2 rounded-lg transition-colors">
            <Send size={14} />
          </button>
        </div>
      </div>

      {/* Feed */}
      {shoutouts.length === 0 ? (
        <div className="text-center py-8 text-t4 text-sm">
          <Heart size={24} className="mx-auto mb-2 opacity-30" />
          Nenhum reconhecimento ainda. Seja o primeiro!
        </div>
      ) : (
        <div className="space-y-2">
          {shoutouts.slice(0, 10).map(s => (
            <div key={s.id} className="bg-surface border border-b1 rounded-lg px-4 py-3 hover:border-b3 transition-colors animate-in">
              <div className="flex items-start gap-3">
                <Avatar userId={s.fromId} name={s.fromName} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-sm">
                    <Link to={`/perfil/${s.fromId}`} className="font-bold hover:text-vred transition-colors">{s.fromName}</Link>
                    <span className="text-t4">→</span>
                    <Avatar userId={s.toId} name={s.toName} />
                    <Link to={`/perfil/${s.toId}`} className="font-bold text-vred hover:text-vred-dark transition-colors">{s.toName}</Link>
                    <span className="text-xl ml-0.5">{s.emoji}</span>
                    <span className="text-t4 text-[10px] ml-auto font-mono shrink-0">{relativeTime(s.ts)}</span>
                  </div>
                  <div className="bg-elevated/50 rounded-lg px-3 py-2 mt-1.5 border-l-2 border-l-vred/30">
                    <p className="text-sm text-t2">{s.message}</p>
                  </div>
                  {/* Reactions */}
                  <div className="flex gap-1.5 mt-2">
                    {EMOJIS.slice(0, 4).map(e => {
                      const count = s.reactions[e] || 0;
                      return (
                        <button key={e} onClick={() => addReaction(s, e)}
                          className={`text-xs px-2.5 py-1 rounded-full transition-all hover:scale-105 ${
                            count > 0 ? 'bg-vred/10 border border-vred/20' : 'bg-elevated hover:bg-muted border border-transparent'
                          }`}>
                          {e} {count > 0 && <span className="font-mono ml-0.5 font-bold">{count}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
