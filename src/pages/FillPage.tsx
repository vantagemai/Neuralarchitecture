import { useState, useCallback } from 'react';
import { Send, RefreshCw, CheckCircle2, Target, Flame } from 'lucide-react';
import { db, today, CHANNELS, getSession, type FillData, type ChannelData } from '../lib/store';
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

    // Award XP
    const xpGained = awardFillXp(totalContacts, totalResponses);
    if (xpGained > 0) {
      showToast('xp', `+${xpGained} XP`, 'Fill diario registrado');
      playSuccess();
      addNotification({ type: 'badge', title: `+${xpGained} XP ganho`, detail: `${totalContacts} contatos, ${totalResponses} respostas`, icon: '⚡' });
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
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fill Diário</h1>
          <p className="text-sm text-t3 mt-1">Registre sua atividade de prospecção por canal</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-t4 uppercase tracking-wider">Score</div>
            <div className="text-2xl font-bold font-mono text-vred">{score} pts</div>
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
            className="bg-surface border border-b1 rounded-lg p-5 hover:border-b3 transition-colors focus-within:border-vred/30"
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
          className="flex items-center gap-2 bg-vred hover:bg-vred-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold px-6 py-3 rounded-lg transition-all duration-200 shadow-lg shadow-vred/20 hover:shadow-vred/40"
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
    </div>
  );
}
