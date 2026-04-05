import { Bell, Search, LogOut, Camera } from 'lucide-react';
import { useRef } from 'react';

interface HeaderProps {
  userName: string;
  userRole: string;
  userAvatar?: string;
  onLogout: () => void;
}

export function Header({ userName, userRole, userAvatar, onLogout }: HeaderProps) {
  const fileRef = useRef<HTMLInputElement>(null);
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
        localStorage.setItem('vantagem_avatar', b64);
        window.location.reload();
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const avatar = userAvatar || localStorage.getItem('vantagem_avatar') || null;

  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <header className="h-16 bg-surface border-b border-b1 flex items-center justify-between px-6 shrink-0">
      {/* Search */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <div className="flex items-center gap-2 bg-elevated border border-b1 rounded-lg px-3 py-2 w-full focus-within:border-vred/40 transition-colors">
          <Search size={16} className="text-t4" />
          <input
            type="text"
            placeholder="Buscar colaborador, venda..."
            className="bg-transparent text-sm text-t1 placeholder:text-t4 outline-none w-full"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        <span className="text-xs text-t3 font-mono hidden md:block">
          {dateStr} · {timeStr}
        </span>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg text-t3 hover:text-t1 hover:bg-elevated transition-colors">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-vred rounded-full" />
        </button>

        {/* User */}
        <div className="flex items-center gap-3 pl-4 border-l border-b1">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold text-t1">{userName}</div>
            <div className="text-[10px] text-t3 uppercase tracking-wider">{userRole}</div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          <button
            onClick={() => fileRef.current?.click()}
            className="relative group"
            title="Clique para alterar foto"
          >
            {avatar ? (
              <img src={avatar} alt={userName} className="w-9 h-9 rounded-full object-cover border-2 border-vred/30" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-vred to-vred-dark flex items-center justify-center text-white text-xs font-bold">
                {initials}
              </div>
            )}
            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera size={12} className="text-white" />
            </div>
          </button>
          <button
            onClick={onLogout}
            className="p-2 rounded-lg text-t4 hover:text-vred hover:bg-vred/5 transition-colors"
            title="Sair"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
