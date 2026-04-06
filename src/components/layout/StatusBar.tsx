import { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { isOnline } from '../../lib/supabase';
import { getTotalXp } from '../../lib/xp';
import { getLevel } from '../../lib/levels';
import { getStreak } from '../../lib/streaks';

export function StatusBar() {
  const [time, setTime] = useState(new Date());
  const online = isOnline();
  const xp = getTotalXp();
  const level = getLevel();
  const streak = getStreak();

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="h-[22px] bg-surface border-t border-b1 flex items-center justify-between px-3 text-[10px] text-t3 shrink-0">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1">
          {online ? <Wifi size={9} className="text-vgreen" /> : <WifiOff size={9} className="text-vred" />}
          {online ? 'Conectado' : 'Offline'}
        </span>
        <span className={`${level.color}`}>{level.icon} {level.name}</span>
        <span className="text-vgold">{xp.toLocaleString()} XP</span>
        {streak.current > 0 && <span className="text-orange-400">🔥{streak.current}d</span>}
      </div>
      <div className="flex items-center gap-4">
        <span>{time.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
        <span className="text-t2">{time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
      </div>
    </div>
  );
}
