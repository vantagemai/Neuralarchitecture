import { Bell, Search, LogOut, Camera, Menu, Flame, Zap, X, Sun, Moon } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import { getSession, getUsers, getMonthSales, getTodayFills } from '../../lib/store';
import { getTotalXp } from '../../lib/xp';
import { getStreak } from '../../lib/streaks';
import { getLevel, getNextLevel } from '../../lib/levels';
import { getNotifications, getUnreadCount, markAllRead, type Notification } from '../../lib/notifications';
import { getTheme, toggleTheme } from '../../lib/theme';

interface HeaderProps {
  userName: string;
  userRole: string;
  userAvatar?: string;
  onLogout: () => void;
  onToggleSidebar?: () => void;
  onAvatarChange?: (b64: string) => void;
}

function avatarKey(): string {
  const session = getSession();
  return `vantagem_avatar_${session?.id || 'anon'}`;
}

interface SearchResult {
  type: 'user' | 'sale' | 'fill';
  label: string;
  detail: string;
  url: string;
}

export function Header({ userName, userRole, onLogout, onToggleSidebar, onAvatarChange }: HeaderProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatar, setAvatar] = useState(() => localStorage.getItem(avatarKey()) || null);
  const [xp, setXp] = useState(() => getTotalXp());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [unreadCount, setUnreadCount] = useState(() => getUnreadCount());
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [theme, setThemeState] = useState(getTheme);
  const streak = getStreak();
  const level = getLevel();
  const { next, progress } = getNextLevel();
  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxW = 200;
        let w = img.width, h = img.height;
        if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
        const b64 = canvas.toDataURL('image/jpeg', 0.7);
        localStorage.setItem(avatarKey(), b64);
        setAvatar(b64);
        onAvatarChange?.(b64);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Refresh XP and notifications
  useEffect(() => {
    const refresh = () => {
      setXp(getTotalXp());
      setUnreadCount(getUnreadCount());
    };
    document.addEventListener('xp-update', refresh);
    const interval = setInterval(() => setUnreadCount(getUnreadCount()), 10000);
    return () => {
      document.removeEventListener('xp-update', refresh);
      clearInterval(interval);
    };
  }, []);

  // Search logic
  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); setShowSearch(false); return; }
    const query = q.toLowerCase();
    const results: SearchResult[] = [];

    // Search users
    getUsers().filter(u => u.active && u.name.toLowerCase().includes(query))
      .slice(0, 3).forEach(u => results.push({
        type: 'user', label: u.name, detail: u.role, url: '/time'
      }));

    // Search sales
    getMonthSales().filter(s => s.sellerName.toLowerCase().includes(query))
      .slice(0, 3).forEach(s => results.push({
        type: 'sale', label: `Venda ${s.sellerName}`, detail: `$${s.setupValue} - ${s.date}`, url: '/vendas'
      }));

    // Search fills
    getTodayFills().filter(f => f.userName.toLowerCase().includes(query))
      .slice(0, 2).forEach(f => results.push({
        type: 'fill', label: `Fill ${f.userName}`, detail: `${f.score} pts`, url: '/fill'
      }));

    setSearchResults(results);
    setShowSearch(results.length > 0);
  };

  const openNotifs = () => {
    setNotifications(getNotifications());
    setShowNotifs(!showNotifs);
    if (!showNotifs) {
      markAllRead();
      setUnreadCount(0);
    }
  };

  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const relTime = (ts: number) => {
    const d = Math.floor((Date.now() - ts) / 60000);
    if (d < 1) return 'agora';
    if (d < 60) return `${d}m`;
    if (d < 1440) return `${Math.floor(d / 60)}h`;
    return `${Math.floor(d / 1440)}d`;
  };

  return (
    <header className="h-16 bg-surface border-b border-b1 flex items-center justify-between px-4 sm:px-6 shrink-0">
      {/* Left: hamburger + search */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <button onClick={onToggleSidebar} className="lg:hidden p-2 rounded-lg text-t3 hover:text-t1 hover:bg-elevated transition-colors" aria-label="Menu">
          <Menu size={20} />
        </button>
        <div className="hidden sm:flex items-center gap-2 bg-elevated border border-b1 rounded-lg px-3 py-2 w-full focus-within:border-vred/40 transition-colors relative">
          <Search size={16} className="text-t4" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowSearch(true)}
            onBlur={() => setTimeout(() => setShowSearch(false), 200)}
            placeholder="Buscar colaborador, venda..."
            className="bg-transparent text-sm text-t1 placeholder:text-t4 outline-none w-full"
            aria-label="Buscar"
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); setSearchResults([]); setShowSearch(false); }} className="text-t4 hover:text-t2">
              <X size={14} />
            </button>
          )}
          {/* Search dropdown */}
          {showSearch && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-b1 rounded-xl shadow-xl z-50 overflow-hidden">
              {searchResults.map((r, i) => (
                <a
                  key={i}
                  href={`/Neuralarchitecture${r.url}`}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-elevated transition-colors"
                  onClick={() => setShowSearch(false)}
                >
                  <span className="text-xs text-t4 uppercase w-8">{r.type === 'user' ? '👤' : r.type === 'sale' ? '💰' : '📋'}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{r.label}</div>
                    <div className="text-[10px] text-t4">{r.detail}</div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* XP + Level + Streak */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-elevated border border-b1 rounded-lg px-2.5 py-1.5" title={`Level: ${level.name} (${xp} XP)`}>
            <span className="text-sm">{level.icon}</span>
            <span className={`text-[11px] font-bold ${level.color}`}>{level.name}</span>
            {next && (
              <div className="w-12 h-1 bg-overlay rounded-full overflow-hidden ml-1">
                <div className="h-full bg-vred rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-vgold" title={`${xp} XP total`}>
            <Zap size={12} />
            {xp.toLocaleString()}
          </div>
          {streak.current > 0 && (
            <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-orange-400" title={`${streak.current} dias consecutivos`}>
              <Flame size={12} />
              {streak.current}d
            </div>
          )}
        </div>

        <span className="text-[11px] text-t3 font-mono hidden md:block">
          {dateStr} · {timeStr}
        </span>

        {/* Theme toggle */}
        <button
          onClick={() => { const t = toggleTheme(); setThemeState(t); }}
          className="p-2 rounded-lg text-t3 hover:text-t1 hover:bg-elevated transition-colors"
          title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          aria-label="Alternar tema"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={openNotifs}
            className="relative p-2 rounded-lg text-t3 hover:text-t1 hover:bg-elevated transition-colors"
            aria-label="Notificacoes"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-vred rounded-full text-[9px] font-bold text-white flex items-center justify-center px-1">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {/* Notifications dropdown */}
          {showNotifs && (
            <div className="absolute top-full right-0 mt-1 w-80 bg-surface border border-b1 rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-b1 flex items-center justify-between">
                <span className="text-sm font-bold">Notificacoes</span>
                <button onClick={() => setShowNotifs(false)} className="text-t4 hover:text-t2"><X size={14} /></button>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="text-center py-8 text-t4 text-xs">Sem notificacoes</div>
                ) : (
                  notifications.slice(0, 15).map(n => (
                    <div key={n.id} className={`px-4 py-2.5 border-b border-b1 hover:bg-elevated/50 transition-colors ${!n.read ? 'bg-vred/5' : ''}`}>
                      <div className="flex items-start gap-2">
                        <span className="text-sm mt-0.5">{n.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate">{n.title}</div>
                          {n.detail && <div className="text-[10px] text-t4 truncate">{n.detail}</div>}
                        </div>
                        <span className="text-[9px] text-t4 font-mono shrink-0">{relTime(n.ts)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 pl-3 sm:pl-4 border-l border-b1">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold text-t1 truncate max-w-[120px]">{userName}</div>
            <div className="text-[10px] text-t3 uppercase tracking-wider">{userRole}</div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          <button
            onClick={() => fileRef.current?.click()}
            className="relative group shrink-0"
            title="Clique para alterar foto"
            aria-label="Alterar foto de perfil"
          >
            {avatar ? (
              <img src={avatar} alt={`Foto de ${userName}`} className="w-10 h-10 rounded-full object-cover border-2 border-vred/30" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-vred to-vred-dark flex items-center justify-center text-white text-xs font-bold">
                {initials}
              </div>
            )}
            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera size={14} className="text-white" />
            </div>
          </button>
          <button
            onClick={onLogout}
            className="p-2 rounded-lg text-t4 hover:text-vred hover:bg-vred/5 transition-colors hidden sm:block"
            title="Sair"
            aria-label="Sair"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
