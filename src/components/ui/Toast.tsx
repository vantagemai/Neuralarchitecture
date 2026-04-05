import { useState, useEffect, useCallback } from 'react';
import { X, Zap, Trophy, AlertCircle, CheckCircle2 } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'xp' | 'achievement' | 'streak';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
  detail?: string;
}

let toastId = 0;
let addToastFn: ((t: Omit<ToastItem, 'id'>) => void) | null = null;

// Global function to show toasts from anywhere
export function showToast(type: ToastType, message: string, detail?: string) {
  addToastFn?.({ type, message, detail });
}

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 size={16} />,
  error: <AlertCircle size={16} />,
  info: <AlertCircle size={16} />,
  xp: <Zap size={16} />,
  achievement: <Trophy size={16} />,
  streak: <span className="text-sm">🔥</span>,
};

const COLORS: Record<ToastType, string> = {
  success: 'border-vgreen/40 bg-vgreen/10 text-vgreen',
  error: 'border-vred/40 bg-vred/10 text-vred',
  info: 'border-vblue/40 bg-vblue/10 text-vblue',
  xp: 'border-vgold/40 bg-vgold/10 text-vgold',
  achievement: 'border-vpurp/40 bg-vpurp/10 text-vpurp',
  streak: 'border-orange-400/40 bg-orange-400/10 text-orange-400',
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { ...t, id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(x => x.id !== id));
    }, 4000);
  }, []);

  useEffect(() => {
    addToastFn = addToast;
    return () => { addToastFn = null; };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm shadow-xl animate-slide-up ${COLORS[t.type]}`}
        >
          {ICONS[t.type]}
          <div className="min-w-0">
            <div className="text-sm font-bold">{t.message}</div>
            {t.detail && <div className="text-xs opacity-80">{t.detail}</div>}
          </div>
          <button
            onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
            className="ml-2 opacity-60 hover:opacity-100 transition-opacity"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
