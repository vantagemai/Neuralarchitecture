import { useState, useCallback } from 'react';
import { Send, RefreshCw, CheckCircle2, Target, Flame, Calendar } from 'lucide-react';
import { db, today, CHANNELS, getSession, calcScore, type FillData, type ChannelData } from '../lib/store';
import { Badge } from '../components/ui/Badge';
import { awardFillXp } from '../lib/xp';
import { updateStreak } from '../lib/streaks';
import { getStreak } from '../lib/streaks';
import { checkAchievements } from '../lib/achievements';
import { showToast } from '../components/ui/Toast';
import { triggerConfetti } from '../components/ui/Confetti';
import { playSuccess, playAchievement } from '../lib/sounds';
import { addNotification } from '../lib/notifications';
import { getGoalProgress } from '../lib/goals';
import { getMonthBonus } from '../lib/bonus';

export function FillPage() {
  const session = getSession();
  const userId = session?.id || 'anon';
  const fillKey = `ops_fill_${today()}_${userId}`;

  const [channels, setChannels] = useState<Record<string, ChannelData>>(() => {
    const ex = db.get<FillData>(fillKey);
    if (ex?.channels) return ex.channels;
    const init: Record<string, ChannelData> = {};
    CHANNELS.forEach(ch => { init[ch.id] = { a: '', b: '' }; });
    return init;
  });
  const [obs, setObs] = useState(() => db.get<FillData>(fillKey)?.obs || '');
  const [saved, setSaved] = useState(() => !!db.get<FillData>(fillKey));
  const [saving, setSaving] = useState(false);

  const score = Object.values(channels).reduce((t, ch) => t + (parseInt(ch.a) || 0), 0);

  const updateChannel = useCallback((chId: string, field: 'a' | 'b', value: string) => {
    // Prevent negative values
    const num = parseInt(value);
    if (value !== '' && num < 0) return;
    setChannels(prev => ({
      ...prev,
      [chId]: { ...prev[chId], [field]: value }
    }));
  }, []);

  const handleSubmit = () => {
    setSaving(true);
    const fill: FillData = {
      userId,
      userName: session?.name || 'Anônimo',
      userRole: session?.role || 'Setter',
      channels,
      obs,
      score,
      ts: Date.now(),
    };
    db.set(fillKey, fill);

    // Calculate totals for XP
    const totalContacts = Object.values(channels).reduce((t, ch) => t + (parseInt(ch.a) || 0), 0);
    const totalResponses = Object.values(channels).reduce((t, ch) => t + (parseInt(ch.b) || 0), 0);

    // Award Fichas
    const xpGained = awardFillXp(totalContacts, totalResponses);
    if (xpGained > 0) {
      showToast('xp', `+${xpGained} Fichas`, 'Fill diario registrado');
      playSuccess();
      addNotification({ type: 'badge', title: `+${xpGained} fichas ganhas`, detail: `${totalContacts} contatos, ${totalResponses} respostas`, icon: '🪙' });
    }

    // Update streak
    const { streak, isNew, milestone } = updateStreak();
    if (isNew && streak.current > 1) {
      showToast('streak', `${streak.current} dias seguidos!`, 'Streak atualizado');
    }
    if (milestone) {
      showToast('achievement', `Streak ${milestone}d!`, 'Milestone desbloqueado');
      triggerConfetti();
    }

    // Check achievements
    const newAch = checkAchievements();
    for (const ach of newAch) {
      setTimeout(() => {
        showToast('achievement', `${ach.icon} ${ach.name}`, ach.description);
        triggerConfetti();
        playAchievement();
      }, 500);
    }

    // Notify header to refresh XP
    document.dispatchEvent(new Event('xp-update'));

    setTimeout(() => {
      setSaving(false);
      setSaved(true);
    }, 600);
  };

  const existingFill = db.get<FillData>(fillKey);
  const filledTime = existingFill?.ts
    ? new Date(existingFill.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="space-y-4 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Fill Diário</h1>
          <p className="text-sm text-t3 mt-1">Registre sua atividade de prospecção por canal</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-t4 uppercase tracking-wider">Score</div>
            <div className="text-lg font-bold font-mono text-vred">{score} pts</div>
          </div>
        </div>
      </div>

      {/* Status banner */}
      {saved && filledTime && (
        <div className="flex items-center gap-3 bg-vgreen/8 border border-vgreen/20 rounded-lg px-5 py-3">
          <CheckCircle2 size={18} className="text-vgreen" />
          <span className="text-sm text-vgreen font-medium">
            Preenchido hoje às {filledTime} — score: {existingFill?.score} pts
          </span>
        </div>
      )}

      {/* Setter Bonus Card — $100 per 10 meetings */}
      {(() => {
        const isSetter = session?.role === 'Setter' || session?.role === 'Social Seller';
        if (!isSetter) return null;
        const b = getMonthBonus(userId);
        return (
          <div className="bg-surface border border-vgold/20 border-l-[3px] border-l-vgold rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">🎯</span>
                <div>
                  <div className="text-xs font-bold text-vgold uppercase tracking-wider">Bonus Setter</div>
                  <div className="text-[10px] text-t4">$100 a cada 10 reunioes realizadas</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-lg font-bold text-vgold">${b.bonus}</div>
                <div className="text-[10px] text-t4">acumulado no mes</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex justify-between text-[10px] text-t3 mb-1">
                  <span>{b.meetings} reunioes realizadas</span>
                  <span>{b.meetings > 0 && b.nextAt > 0 ? `faltam ${b.nextAt} para +$100` : b.meetings > 0 ? 'Ciclo completo!' : 'Preencha visitas realizadas'}</span>
                </div>
                <div className="h-2 bg-overlay rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-vgold-dark to-vgold rounded-full transition-all duration-700"
                    style={{ width: `${b.progress}%` }} />
                </div>
              </div>
              {/* Cycle dots */}
              <div className="flex gap-1 shrink-0">
                {Array.from({ length: Math.min(10, Math.max(1, b.cyclesDone + 1)) }, (_, i) => (
                  <div key={i} className={`w-3 h-3 rounded-full border ${
                    i < b.cyclesDone
                      ? 'bg-vgold border-vgold'
                      : 'border-vgold/30 bg-transparent'
                  }`} />
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Goal progress */}
      {(() => {
        const gp = getGoalProgress();
        const streak = getStreak();
        return (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-surface border border-b1 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Target size={12} className="text-vred" />
                <span className="text-[10px] text-t3 uppercase font-bold">Contatos</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold">{score}/{gp.dailyContacts.target}</span>
                <span className={`text-[10px] font-bold ${gp.dailyContacts.pct >= 100 ? 'text-vgreen' : 'text-t4'}`}>{gp.dailyContacts.pct}%</span>
              </div>
              <div className="h-1 bg-overlay rounded-full overflow-hidden mt-1">
                <div className={`h-full rounded-full transition-all ${gp.dailyContacts.pct >= 100 ? 'bg-vgreen' : 'bg-vred'}`} style={{ width: `${Math.min(100, Math.round((score / gp.dailyContacts.target) * 100))}%` }} />
              </div>
            </div>
            <div className="bg-surface border border-b1 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Target size={12} className="text-vpurp" />
                <span className="text-[10px] text-t3 uppercase font-bold">Score</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold">{score}/{gp.dailyScore.target}</span>
                <span className={`text-[10px] font-bold ${gp.dailyScore.pct >= 100 ? 'text-vgreen' : 'text-t4'}`}>{Math.min(100, Math.round((score / gp.dailyScore.target) * 100))}%</span>
              </div>
              <div className="h-1 bg-overlay rounded-full overflow-hidden mt-1">
                <div className={`h-full rounded-full transition-all ${gp.dailyScore.pct >= 100 ? 'bg-vgreen' : 'bg-vpurp'}`} style={{ width: `${Math.min(100, Math.round((score / gp.dailyScore.target) * 100))}%` }} />
              </div>
            </div>
            <div className="bg-surface border border-b1 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Flame size={12} className="text-orange-400" />
                <span className="text-[10px] text-t3 uppercase font-bold">Streak</span>
              </div>
              <div className="font-mono text-sm font-bold text-orange-400">
                {streak.current > 0 ? `🔥 ${streak.current}d` : 'Comece hoje!'}
              </div>
              <div className="text-[10px] text-t4 mt-0.5">Recorde: {streak.best}d</div>
            </div>
            <div className="bg-surface border border-b1 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Target size={12} className="text-vgreen" />
                <span className="text-[10px] text-t3 uppercase font-bold">Vendas Mes</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold">{gp.monthlySales.current}/{gp.monthlySales.target}</span>
                <span className={`text-[10px] font-bold ${gp.monthlySales.pct >= 100 ? 'text-vgreen' : 'text-t4'}`}>{gp.monthlySales.pct}%</span>
              </div>
              <div className="h-1 bg-overlay rounded-full overflow-hidden mt-1">
                <div className={`h-full rounded-full transition-all ${gp.monthlySales.pct >= 100 ? 'bg-vgreen' : 'bg-vgreen/60'}`} style={{ width: `${gp.monthlySales.pct}%` }} />
              </div>
            </div>
          </div>
        );
      })()}

      {/* Channel cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {CHANNELS.map(ch => (
          <div
            key={ch.id}
            className="bg-surface border border-b1 rounded-lg p-4 hover:border-b3 transition-colors focus-within:border-vred/30"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{ch.icon}</span>
              <span className="font-semibold text-sm">{ch.label}</span>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-t4 uppercase tracking-wider font-semibold">{ch.fieldA}</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={channels[ch.id]?.a || ''}
                  onChange={e => updateChannel(ch.id, 'a', e.target.value)}
                  className="mt-1 w-full bg-elevated border border-b1 rounded-lg px-3 py-2.5 text-center font-mono text-lg font-bold text-t1 outline-none focus:border-vred/40 transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] text-t4 uppercase tracking-wider font-semibold">{ch.fieldB}</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={channels[ch.id]?.b || ''}
                  onChange={e => updateChannel(ch.id, 'b', e.target.value)}
                  className="mt-1 w-full bg-elevated border border-b1 rounded-lg px-3 py-2.5 text-center font-mono text-lg text-t2 outline-none focus:border-vred/40 transition-colors"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Observation */}
      <div>
        <label className="text-[11px] text-t3 uppercase tracking-wider font-semibold">
          Observação / Bloqueios (opcional)
        </label>
        <textarea
          value={obs}
          onChange={e => setObs(e.target.value)}
          placeholder="Ex: leads frios na região X, WhatsApp bloqueado..."
          className="mt-2 w-full bg-surface border border-b1 rounded-lg px-4 py-3 text-sm text-t2 placeholder:text-t4 outline-none focus:border-vred/40 transition-colors min-h-[80px] resize-none"
        />
      </div>

      {/* Submit */}
      <div className="flex items-center justify-between bg-surface border border-b1 rounded-lg px-6 py-4">
        <div className="flex items-center gap-4">
          <span className="text-sm text-t3">Score estimado:</span>
          <span className="font-mono font-bold text-xl text-vred">{score} pts</span>
          {score >= 100 && <Badge variant="green">🔥 Volume forte</Badge>}
          {score >= 50 && score < 100 && <Badge variant="gold">📈 Bom ritmo</Badge>}
          {score > 0 && score < 50 && <Badge variant="dim">Aquecer</Badge>}
        </div>
        <button
          onClick={handleSubmit}
          disabled={saving || score === 0}
          className="flex items-center gap-2 bg-vred hover:bg-vred-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold px-4 py-2 rounded-lg transition-all duration-200 shadow-sm shadow-vred/15 hover:shadow-vred/40"
        >
          {saving ? (
            <><RefreshCw size={16} className="animate-spin" /> Salvando...</>
          ) : saved ? (
            <><RefreshCw size={16} /> Atualizar</>
          ) : (
            <><Send size={16} /> Enviar Atividades</>
          )}
        </button>
      </div>

      {/* Fill history — last 14 days */}
      {(() => {
        const history = Array.from({ length: 14 }, (_, i) => {
          const d = new Date(); d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          const key = `ops_fill_${dateStr}_${userId}`;
          const fill = db.get<FillData>(key);
          const sc = fill ? calcScore(fill) : 0;
          const label = d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
          const time = fill ? new Date(fill.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
          return { dateStr, fill, score: sc, label, time, isToday: i === 0 };
        });
        const streak = history.filter(h => h.fill).length;
        return (
          <div className="bg-surface border border-b1 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-b1">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-t3" />
                <span className="text-[11px] font-bold text-t3 uppercase tracking-wider">Historico de Fills</span>
              </div>
              <span className="text-[10px] font-mono text-t4">{streak}/14 dias preenchidos</span>
            </div>
            <div className="divide-y divide-b1">
              {history.map(h => (
                <div key={h.dateStr} className={`flex items-center gap-3 px-4 py-2 ${h.isToday ? 'bg-vred/5' : 'hover:bg-elevated/30'} transition-colors`}>
                  <div className={`w-2 h-2 rounded-full shrink-0 ${h.fill ? 'bg-vgreen' : 'bg-overlay'}`} />
                  <span className="text-xs text-t3 font-mono w-32 shrink-0">{h.label}</span>
                  {h.fill ? (
                    <>
                      <div className="flex-1 flex gap-2">
                        {CHANNELS.map(ch => {
                          const v = h.fill!.channels?.[ch.id];
                          const val = typeof v === 'object' ? parseInt(v.a) || 0 : 0;
                          return <span key={ch.id} className="text-[10px] text-t4">{ch.icon}<span className="font-mono ml-0.5">{val}</span></span>;
                        })}
                      </div>
                      <span className="font-mono text-xs font-bold text-vred">{h.score} pts</span>
                      <span className="text-[10px] text-t4 font-mono w-12 text-right">{h.time}</span>
                    </>
                  ) : (
                    <span className="flex-1 text-[10px] text-t4 italic">{h.isToday ? 'Preencha acima' : 'Nao preenchido'}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
