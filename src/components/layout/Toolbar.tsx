import { Bell, Search, LogOut, Camera, Menu, X, Sun, Moon } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSession, getUsers, getMonthSales, getTodayFills } from '../../lib/store';
import { getNotifications, getUnreadCount, markAllRead, type Notification } from '../../lib/notifications';
import { getTheme, toggleTheme } from '../../lib/theme';
import { Logo } from '../ui/Logo';

interface ToolbarProps {
  userName: string;
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

export function Toolbar({ userName, onLogout, onToggleSidebar, onAvatarChange }: ToolbarProps) {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatar, setAvatar] = useState(() => localStorage.getItem(avatarKey()) || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [unreadCount, setUnreadCount] = useState(() => getUnreadCount());
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [theme, setThemeState] = useState(getTheme);
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

  useEffect(() => {
    const refresh = () => setUnreadCount(getUnreadCount());
    document.addEventListener('xp-update', refresh);
    const interval = setInterval(refresh, 10000);
    return () => { document.removeEventListener('xp-update', refresh); clearInterval(interval); };
  }, []);

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); setShowSearch(false); return; }
    const query = q.toLowerCase();
    const results: SearchResult[] = [];
    getUsers().filter(u => u.active && u.name.toLowerCase().includes(query))
      .slice(0, 3).forEach(u => results.push({ type: 'user', label: u.name, detail: u.role, url: '/time' }));
    getMonthSales().filter(s => s.sellerName.toLowerCase().includes(query))
      .slice(0, 3).forEach(s => results.push({ type: 'sale', label: `Venda ${s.sellerName}`, detail: `$${s.setupValue} - ${s.date}`, url: '/vendas' }));
    getTodayFills().filter(f => f.userName.toLowerCase().includes(query))
      .slice(0, 2).forEach(f => results.push({ type: 'fill', label: `Fill ${f.userName}`, detail: `${f.score} pts`, url: '/fill' }));
    setSearchResults(results);
    setShowSearch(results.length > 0);
  };

  const openNotifs = () => {
    setNotifications(getNotifications());
    setShowNotifs(!showNotifs);
    if (!showNotifs) { markAllRead(); setUnreadCount(0); }
  };

  const relTime = (ts: number) => {
    const d = Math.floor((Date.now() - ts) / 60000);
    if (d < 1) return 'agora';
    if (d < 60) return `${d}m`;
    if (d < 1440) return `${Math.floor(d / 60)}h`;
    return `${Math.floor(d / 1440)}d`;
  };

  return (
    <header className="h-8 bg-mt4-header border-b border-b1 flex items-center justify-between px-2 shrink-0 z-30">
      {/* Left: hamburger + logo + search */}
      <div className="flex items-center gap-2 flex-1">
        <button onClick={onToggleSidebar} className="lg:hidden p-1 text-t3 hover:text-t1" aria-label="Menu">
          <Menu size={14} />
        </button>
        <div className="hidden lg:block">
          <Logo size="sm" iconOnly />
        </div>
        <div className="h-4 w-px bg-b1 hidden lg:block" />

        {/* Search */}
        <div className="hidden sm:flex items-center gap-1.5 bg-elevated/50 border border-b1 px-2 py-0.5 w-48 focus-within:border-vred/40 transition-colors relative">
          <Search size={11} className="text-t4" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowSearch(true)}
            onBlur={() => setTimeout(() => setShowSearch(false), 200)}
            placeholder="Buscar..."
            className="bg-transparent text-[11px] text-t1 placeholder:text-t4 outline-none w-full"
            aria-label="Buscar"
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); setSearchResults([]); setShowSearch(false); }} className="text-t4 hover:text-t2">
              <X size={10} />
            </button>
          )}
          {showSearch && (
            <div className="absolute top-full left-0 right-0 mt-px bg-surface border border-b1 shadow-xl z-50 overflow-hidden w-64">
              {searchResults.map((r, i) => (
                <a key={i} href={`/Neuralarchitecture${r.url}`}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-elevated transition-colors text-[11px]"
                  onClick={() => setShowSearch(false)}
                >
                  <span className="text-t4 w-5">{r.type === 'user' ? '👤' : r.type === 'sale' ? '💰' : '📋'}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{r.label}</div>
                    <div className="text-[9px] text-t4">{r.detail}</div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: icons */}
      <div className="flex items-center gap-1">
        {/* Theme toggle */}
        <button onClick={() => { toggleTheme(); setThemeState(getTheme()); }} className="w-6 h-6 flex items-center justify-center text-t3 hover:text-t1 transition-colors" aria-label="Tema">
          {theme === 'dark' ? <Sun size={12} /> : <Moon size={12} />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button onClick={openNotifs} className="w-6 h-6 flex items-center justify-center text-t3 hover:text-t1 transition-colors relative" aria-label="Notificacoes">
            <Bell size={12} />
            {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-vred text-white text-[7px] flex items-center justify-center font-bold">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>
          {showNotifs && (
            <div className="absolute right-0 top-full mt-px w-72 bg-surface border border-b1 shadow-xl z-50" onClick={e => e.stopPropagation()}>
              <div className="h-6 bg-mt4-header border-b border-b1 px-2 flex items-center">
                <span className="text-[10px] text-mt4-header-text uppercase tracking-wider">Notificacoes</span>
              </div>
              <div className="max-h-52 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="text-center py-6 text-t4 text-[10px]">Sem notificacoes</div>
                ) : (
                  notifications.slice(0, 15).map(n => {
                    const routes: Record<string, string> = { sale: '/vendas', badge: '/badges', challenge: '/desafios', shoutout: '/ranking', levelup: '/ranking', streak: '/fill' };
                    return (
                      <div key={n.id}
                        className={`px-3 py-1.5 border-b border-b1 hover:bg-elevated/50 transition-colors cursor-pointer ${!n.read ? 'bg-vred/5' : ''}`}
                        onClick={() => { setShowNotifs(false); navigate(routes[n.type] || '/'); }}
                      >
                        <div className="flex items-start gap-1.5">
                          <span className="text-[10px] mt-0.5">{n.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-medium truncate">{n.title}</div>
                            {n.detail && <div className="text-[9px] text-t4 truncate">{n.detail}</div>}
                          </div>
                          <span className="text-[8px] text-t4 shrink-0">{relTime(n.ts)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-b1 mx-1" />

        {/* User avatar */}
        <div className="relative group">
          <input type="file" ref={fileRef} accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          {avatar ? (
            <img src={avatar} alt="" className="w-5 h-5 object-cover border border-b1 cursor-pointer" onClick={() => fileRef.current?.click()} />
          ) : (
            <div className="w-5 h-5 bg-gradient-to-br from-vred to-vred-dark flex items-center justify-center text-white text-[8px] font-bold cursor-pointer" onClick={() => fileRef.current?.click()}>
              {initials}
            </div>
          )}
          <button className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => fileRef.current?.click()}>
            <Camera size={8} className="text-white" />
          </button>
        </div>

        <span className="text-[10px] text-t2 hidden md:block max-w-[80px] truncate">{userName.split(' ')[0]}</span>

        <button onClick={onLogout} className="w-6 h-6 flex items-center justify-center text-t3 hover:text-vred transition-colors" aria-label="Sair">
          <LogOut size={12} />
        </button>
      </div>
    </header>
  );
}
