import { Bell, Search, LogOut, Camera, Menu, Flame, Zap } from 'lucide-react';
import { useRef, useState } from 'react';
import { getSession } from '../../lib/store';
import { getTotalXp } from '../../lib/xp';
import { getStreak } from '../../lib/streaks';
import { getLevel, getNextLevel } from '../../lib/levels';

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

export function Header({ userName, userRole, onLogout, onToggleSidebar, onAvatarChange }: HeaderProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatar, setAvatar] = useState(() => localStorage.getItem(avatarKey()) || null);
  const [xp, setXp] = useState(() => getTotalXp());
  const streak = getStreak();
  const level = getLevel();
  const { next, progress } = getNextLevel();
  const initials = userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

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

  // Refresh XP on visibility change (when returning from fill/vendas)
  const refreshXp = () => setXp(getTotalXp());
  if (typeof document !== 'undefined') {
    document.removeEventListener('xp-update', refreshXp);
    document.addEventListener('xp-update', refreshXp);
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <header className="h-16 bg-surface border-b border-b1 flex items-center justify-between px-4 sm:px-6 shrink-0">
      {/* Left: hamburger (mobile) + search */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-t3 hover:text-t1 hover:bg-elevated transition-colors"
          aria-label="Menu"
        >
          <Menu size={20} />
        </button>
        <div className="hidden sm:flex items-center gap-2 bg-elevated border border-b1 rounded-lg px-3 py-2 w-full focus-within:border-vred/40 transition-colors">
          <Search size={16} className="text-t4" />
          <input
            type="text"
            placeholder="Buscar colaborador, venda..."
            className="bg-transparent text-sm text-t1 placeholder:text-t4 outline-none w-full"
            aria-label="Buscar"
          />
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* XP + Level + Streak indicators */}
        <div className="hidden md:flex items-center gap-3">
          {/* Level badge */}
          <div className="flex items-center gap-1.5 bg-elevated border border-b1 rounded-lg px-2.5 py-1.5" title={`Level: ${level.name} (${xp} XP)`}>
            <span className="text-sm">{level.icon}</span>
            <span className={`text-[11px] font-bold ${level.color}`}>{level.name}</span>
            {next && (
              <div className="w-12 h-1 bg-overlay rounded-full overflow-hidden ml-1">
                <div className="h-full bg-vred rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            )}
          </div>

          {/* XP counter */}
          <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-vgold" title={`${xp} XP total`}>
            <Zap size={12} />
            {xp.toLocaleString()}
          </div>

          {/* Streak flame */}
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

        <button
          className="relative p-2 rounded-lg text-t3 hover:text-t1 hover:bg-elevated transition-colors"
          aria-label="Notificações"
        >
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-vred rounded-full" />
        </button>

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
