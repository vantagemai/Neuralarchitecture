import { useState } from 'react';
import { ChevronRight, ChevronLeft, Flame, Target, Star, Car, Home, Dumbbell, Sparkles } from 'lucide-react';
import { db, getSession, getMonthSales, fmt$ } from '../../lib/store';
import { getLevel } from '../../lib/levels';
import { getStreak } from '../../lib/streaks';
import { getTotalXp } from '../../lib/xp';
import { getScorecard } from '../../lib/scorecard';
import { getGoalProgress } from '../../lib/goals';
import { PanelHeader } from '../ui/PanelHeader';

interface NIProfile {
  metaM: number; meta180: number; car: string; home: string; body: string;
  style: string; impact: string; anchor: string; startDate: string;
  images?: Record<string, string>;
}

export function RightSidebar() {
  const [open, setOpen] = useState(true);
  const session = getSession();
  if (!session) return null;

  const userId = session.id;
  const profile = db.get<NIProfile>(`ni_profile_${userId}`);
  const level = getLevel(userId);
  const streak = getStreak(userId);
  const xp = getTotalXp(userId);
  const scorecard = getScorecard(userId);
  const goalProgress = getGoalProgress(userId);
  const avatar = localStorage.getItem(`vantagem_avatar_${userId}`);
  const initials = session.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  // Revenue progress toward 180d goal
  const sales = getMonthSales();
  const myComm = sales
    .filter(s => s.sellerId === userId || s.sellerName === session.name)
    .reduce((t, s) => t + (s.sellerSetupComm || 0) + (s.sellerRecComm || 0), 0);
  const meta180 = profile?.meta180 || 0;
  const metaProgress = meta180 > 0 ? Math.min(100, Math.round((myComm / meta180) * 100)) : 0;

  // Days into 180d plan
  const startDate = profile?.startDate ? new Date(profile.startDate) : null;
  const daysIn = startDate ? Math.floor((Date.now() - startDate.getTime()) / 86400000) : 0;
  const daysLeft = Math.max(0, 180 - daysIn);

  const DREAM_ITEMS = [
    { key: 'car', icon: Car, label: 'Carro' },
    { key: 'home', icon: Home, label: 'Casa' },
    { key: 'body', icon: Dumbbell, label: 'Corpo' },
    { key: 'style', icon: Sparkles, label: 'Estilo' },
  ];

  if (!open) {
    return (
      <div className="hidden xl:flex flex-col items-center w-10 bg-surface border-l border-b1 shrink-0">
        <button onClick={() => setOpen(true)} className="mt-4 p-1.5 rounded-lg text-t4 hover:text-t1 hover:bg-elevated transition-colors" title="Abrir Vision Board">
          <ChevronLeft size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="hidden xl:flex flex-col w-64 bg-surface border-l border-b1 shrink-0 overflow-y-auto">
      <PanelHeader
        title="Vision Board"
        actions={
          <button onClick={() => setOpen(false)} className="w-4 h-4 flex items-center justify-center text-t3 hover:text-t1 transition-colors">
            <ChevronRight size={10} />
          </button>
        }
      />

      <div className="p-3 space-y-3">
        {/* Avatar + Level */}
        <div className="text-center">
          {avatar ? (
            <img src={avatar} alt={session.name} className="w-12 h-12 object-cover border border-vred/30 mx-auto" />
          ) : (
            <div className="w-12 h-12 bg-gradient-to-br from-vred to-vred-dark flex items-center justify-center text-white text-sm font-bold mx-auto">
              {initials}
            </div>
          )}
          <div className="mt-1.5 font-bold text-xs">{session.name}</div>
          <div className="flex items-center justify-center gap-1.5 mt-1">
            <span className="text-sm">{level.icon}</span>
            <span className={`text-xs font-bold ${level.color}`}>{level.name}</span>
          </div>
          <div className="flex items-center justify-center gap-3 mt-2 text-2xs font-mono">
            <span className="text-vgold flex items-center gap-0.5">🪙 {xp.toLocaleString()} Fichas</span>
            {streak.current > 0 && (
              <span className="text-orange-400 flex items-center gap-0.5"><Flame size={10} />{streak.current}d</span>
            )}
          </div>
        </div>

        {/* 180d Goal Donut */}
        {meta180 > 0 && (
          <div className="bg-elevated p-3 border border-b1">
            <div className="flex items-center gap-2 mb-3">
              <Target size={14} className="text-vred" />
              <span className="text-xs font-bold uppercase tracking-wider">Meta 180 Dias</span>
            </div>
            {/* SVG Donut */}
            <div className="relative w-20 h-20 mx-auto">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-overlay" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8"
                  className="text-vred"
                  strokeDasharray={`${metaProgress * 2.51} ${251 - metaProgress * 2.51}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold font-mono">{metaProgress}%</span>
                <span className="text-2xs text-t4">{daysLeft}d restantes</span>
              </div>
            </div>
            <div className="text-center mt-2">
              <div className="text-xs font-mono text-vgreen">{fmt$(myComm)}</div>
              <div className="text-2xs text-t4">de {fmt$(meta180)}</div>
            </div>
          </div>
        )}

        {/* Scorecard */}
        <div className="bg-elevated p-3 border border-b1">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Star size={12} className="text-vgold" /> Scorecard
            </span>
            <span className="text-lg font-bold font-mono text-vred">{scorecard.overall}</span>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Atividade', value: scorecard.activity, color: 'bg-vred' },
              { label: 'Receita', value: scorecard.revenue, color: 'bg-vgreen' },
              { label: 'Consistencia', value: scorecard.consistency, color: 'bg-vgold' },
              { label: 'Fichas', value: scorecard.xp, color: 'bg-vpurp' },
              { label: 'Badges', value: scorecard.badges, color: 'bg-vblue' },
            ].map(m => (
              <div key={m.label}>
                <div className="flex justify-between text-2xs mb-0.5">
                  <span className="text-t3">{m.label}</span>
                  <span className="font-mono text-t2">{m.value}</span>
                </div>
                <div className="h-1 bg-overlay rounded-full overflow-hidden">
                  <div className={`h-full ${m.color} rounded-full transition-all`} style={{ width: `${m.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Goals today */}
        <div className="bg-elevated p-3 border border-b1">
          <span className="text-xs font-bold uppercase tracking-wider">Metas Hoje</span>
          <div className="mt-2 space-y-1.5">
            {[
              { label: 'Contatos', ...goalProgress.dailyContacts, color: 'text-vred' },
              { label: 'Score', ...goalProgress.dailyScore, color: 'text-vpurp' },
            ].map(g => (
              <div key={g.label} className="flex items-center justify-between text-2xs">
                <span className="text-t3">{g.label}</span>
                <span className={`font-mono font-bold ${g.pct >= 100 ? 'text-vgreen' : g.color}`}>
                  {g.current}/{g.target}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Dream images */}
        {profile && (
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-t3">Seus Objetivos</span>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {DREAM_ITEMS.map(d => {
                const img = profile.images?.[d.key];
                const text = (profile as unknown as Record<string, string>)[d.key];
                return (
                  <div key={d.key} className="bg-elevated rounded-lg border border-b1 overflow-hidden">
                    {img ? (
                      <img src={img} alt={d.label} className="w-full h-16 object-cover" />
                    ) : (
                      <div className="w-full h-16 bg-overlay flex items-center justify-center">
                        <d.icon size={16} className="text-t4" />
                      </div>
                    )}
                    <div className="px-2 py-1.5">
                      <div className="text-2xs text-t4 uppercase">{d.label}</div>
                      {text && <div className="text-2xs text-t2 truncate">{text}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Anchor phrase */}
        {profile?.anchor && (
          <div className="bg-vred/8 border border-vred/15 rounded-lg p-3 text-center">
            <div className="text-2xs text-vred uppercase font-bold mb-1">Frase Ancora</div>
            <p className="text-xs text-t2 italic leading-relaxed">"{profile.anchor}"</p>
          </div>
        )}

        {/* No profile message */}
        {!profile && (
          <div className="text-center py-4">
            <Sparkles size={24} className="mx-auto mb-2 text-t4 opacity-30" />
            <p className="text-xs text-t4">Configure sua Identidade 180d para ver seus objetivos aqui</p>
          </div>
        )}
      </div>
    </div>
  );
}
