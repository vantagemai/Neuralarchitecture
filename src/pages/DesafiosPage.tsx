import { useState, useEffect } from 'react';
import { Plus, X, Clock, Trophy, Target, Flame, Zap } from 'lucide-react';
import { db, getSession, getUsers, getMonthSales, getTodayFills, calcScore } from '../lib/store';
import { Badge } from '../components/ui/Badge';
import { showToast } from '../components/ui/Toast';

interface Challenge {
  id: string;
  title: string;
  description: string;
  metric: 'sales' | 'score' | 'fill_days';
  target: number;
  prize: string;
  createdBy: string;
  startDate: string;
  endDate: string;
  ts: number;
}

interface ChallengeProgress {
  userId: string;
  userName: string;
  value: number;
}

function getChallenges(): Challenge[] {
  const keys = db.list('ops_challenge_');
  return keys.map(k => db.get<Challenge>(k)).filter(Boolean) as Challenge[];
}

function getProgress(challenge: Challenge): ChallengeProgress[] {
  const users = getUsers().filter(u => u.active);
  const sales = getMonthSales();
  const fills = getTodayFills();

  return users.map(u => {
    let value = 0;
    if (challenge.metric === 'sales') {
      value = sales.filter(s => s.sellerId === u.id || s.sellerName === u.name).length;
    } else if (challenge.metric === 'score') {
      const fill = fills.find(f => f.userId === u.id);
      value = fill ? calcScore(fill) : 0;
    } else if (challenge.metric === 'fill_days') {
      const keys = db.list('ops_fill_');
      value = keys.filter(k => {
        const f = db.get<{ userId: string }>(k);
        return f?.userId === u.id;
      }).length;
    }
    return { userId: u.id, userName: u.name, value };
  }).filter(p => p.value > 0).sort((a, b) => b.value - a.value);
}

function timeRemaining(endDate: string): { text: string; urgent: boolean } {
  const end = new Date(endDate + 'T23:59:59');
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  if (diff <= 0) return { text: 'Encerrado', urgent: false };
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return { text: `${days}d ${hours}h`, urgent: days <= 1 };
  const mins = Math.floor((diff % 3600000) / 60000);
  return { text: `${hours}h ${mins}m`, urgent: true };
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

const MEDALS = ['🥇', '🥈', '🥉'];
const METRIC_LABELS = { sales: 'Vendas', score: 'Score', fill_days: 'Dias de Fill' };
const METRIC_ICONS = { sales: Zap, score: Target, fill_days: Flame };

export function DesafiosPage() {
  const session = getSession();
  const isManager = session?.role === 'Head' || session?.role === 'Founder' || session?.role === 'Partner';
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [metric, setMetric] = useState<'sales' | 'score' | 'fill_days'>('sales');
  const [target, setTarget] = useState('5');
  const [prize, setPrize] = useState('');
  const [endDate, setEndDate] = useState('');
  const [, setTick] = useState(0);

  const challenges = getChallenges();
  const now = new Date().toISOString().split('T')[0];
  const active = challenges.filter(c => c.endDate >= now);
  const ended = challenges.filter(c => c.endDate < now);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const handleCreate = () => {
    if (!title.trim() || !endDate || !prize.trim()) {
      showToast('error', 'Preencha titulo, premio e data final');
      return;
    }
    const challenge: Challenge = {
      id: `ops_challenge_${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      metric,
      target: parseInt(target) || 5,
      prize: prize.trim(),
      createdBy: session?.name || 'Manager',
      startDate: now,
      endDate,
      ts: Date.now(),
    };
    db.set(challenge.id, challenge);
    showToast('success', 'Desafio criado!', challenge.title);
    setShowForm(false);
    setTitle(''); setDescription(''); setPrize(''); setEndDate('');
  };

  return (
    <div className="space-y-4 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Desafios</h1>
          <p className="text-sm text-t3 mt-1">Competicoes com prazo e premio</p>
        </div>
        {isManager && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-vgold hover:bg-vgold-dark text-canvas font-bold px-5 py-2.5 rounded-lg transition-colors shadow-sm shadow-vgold/15"
          >
            {showForm ? <><X size={16} /> Fechar</> : <><Plus size={16} /> Novo Desafio</>}
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-surface border border-vgold/20 rounded-lg p-4 animate-in shadow-sm shadow-vgold/5">
          <h3 className="font-bold mb-4 flex items-center gap-2"><Trophy size={18} className="text-vgold" /> Criar Desafio</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-[11px] text-t3 uppercase tracking-wider font-semibold">Titulo</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Sprint de Vendas"
                className="mt-1 w-full bg-elevated border border-b1 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-vgold/40" />
            </div>
            <div>
              <label className="text-[11px] text-t3 uppercase tracking-wider font-semibold">Premio</label>
              <input value={prize} onChange={e => setPrize(e.target.value)} placeholder="Ex: $100 bonus"
                className="mt-1 w-full bg-elevated border border-b1 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-vgold/40" />
            </div>
            <div>
              <label className="text-[11px] text-t3 uppercase tracking-wider font-semibold">Metrica</label>
              <select value={metric} onChange={e => setMetric(e.target.value as typeof metric)}
                className="mt-1 w-full bg-elevated border border-b1 rounded-lg px-4 py-2.5 text-sm outline-none cursor-pointer">
                <option value="sales">Vendas</option>
                <option value="score">Score de Atividade</option>
                <option value="fill_days">Dias de Fill</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-t3 uppercase tracking-wider font-semibold">Meta</label>
              <input type="number" min="1" value={target} onChange={e => setTarget(e.target.value)}
                className="mt-1 w-full bg-elevated border border-b1 rounded-lg px-4 py-2.5 text-sm font-mono outline-none focus:border-vgold/40" />
            </div>
            <div>
              <label className="text-[11px] text-t3 uppercase tracking-wider font-semibold">Descricao (opcional)</label>
              <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Detalhes..."
                className="mt-1 w-full bg-elevated border border-b1 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-vgold/40" />
            </div>
            <div>
              <label className="text-[11px] text-t3 uppercase tracking-wider font-semibold">Data final</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={now}
                className="mt-1 w-full bg-elevated border border-b1 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-vgold/40" />
            </div>
          </div>
          <button onClick={handleCreate} className="bg-vgold hover:bg-vgold-dark text-canvas font-bold px-4 py-2 rounded-lg w-full transition-colors shadow-sm shadow-vgold/15">
            🏆 Criar Desafio
          </button>
        </div>
      )}

      {/* Empty state */}
      {active.length === 0 && ended.length === 0 && (
        <div className="text-center py-16 bg-surface border border-b1 rounded-lg">
          <div className="text-5xl mb-4">🎯</div>
          <p className="text-sm text-t3">Nenhum desafio criado ainda</p>
          {isManager && <p className="text-xs text-t4 mt-1">Crie um desafio para motivar o time!</p>}
        </div>
      )}

      {/* Active */}
      {active.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-vgold uppercase tracking-wider flex items-center gap-2">
            <Flame size={14} /> Desafios Ativos ({active.length})
          </h2>
          {active.map(c => {
            const progress = getProgress(c);
            const remaining = timeRemaining(c.endDate);
            const MetricIcon = METRIC_ICONS[c.metric];
            return (
              <div key={c.id} className="bg-surface border border-vgold/15 rounded-lg overflow-hidden shadow-sm shadow-vgold/5 hover:shadow-vgold/10 transition-shadow">
                {/* Header */}
                <div className="px-4 py-2.5 border-b border-vgold/10">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-vgold/15 flex items-center justify-center">
                        <MetricIcon size={20} className="text-vgold" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{c.title}</h3>
                        {c.description && <p className="text-xs text-t3 mt-0.5">{c.description}</p>}
                      </div>
                    </div>
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                      remaining.urgent ? 'bg-vred/10 text-vred border border-vred/20 animate-pulse' : 'bg-elevated text-t3 border border-b1'
                    }`}>
                      <Clock size={12} />
                      {remaining.text}
                    </div>
                  </div>

                  {/* Prize + Meta badges */}
                  <div className="flex gap-2 mt-3">
                    <div className="flex items-center gap-1.5 bg-vgold/10 border border-vgold/15 rounded-lg px-3 py-1.5">
                      <Trophy size={12} className="text-vgold" />
                      <span className="text-xs font-bold text-vgold">{c.prize}</span>
                    </div>
                    <Badge variant="green">Meta: {c.target} {METRIC_LABELS[c.metric].toLowerCase()}</Badge>
                  </div>
                </div>

                {/* Leaderboard */}
                <div className="px-4 py-2.5">
                  {progress.length > 0 ? (
                    <div className="space-y-2.5">
                      {progress.slice(0, 5).map((p, i) => {
                        const pct = Math.min(100, Math.round((p.value / c.target) * 100));
                        const completed = pct >= 100;
                        return (
                          <div key={p.userId} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${i === 0 ? 'bg-vgold/5' : 'hover:bg-elevated/50'}`}>
                            <span className="w-6 text-center" style={{ fontSize: i < 3 ? '18px' : '13px' }}>
                              {MEDALS[i] || <span className="text-[10px] text-t4 font-mono">#{i + 1}</span>}
                            </span>
                            <Avatar userId={p.userId} name={p.userName} />
                            <a href={`/Neuralarchitecture/perfil/${p.userId}`} className="flex-1 text-sm font-semibold truncate hover:text-vred transition-colors">{p.userName}</a>
                            <div className="w-28 h-2 bg-overlay rounded-sm overflow-hidden">
                              <div className={`h-full rounded-sm transition-all duration-700 ${completed ? 'bg-vgreen' : 'bg-gradient-to-r from-vgold-dark to-vgold'}`}
                                style={{ width: `${pct}%` }} />
                            </div>
                            <span className={`font-mono text-xs font-bold ${completed ? 'text-vgreen' : 'text-vgold'}`}>
                              {p.value}/{c.target}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-t4 text-center py-4">Nenhum progresso ainda — quem sera o primeiro?</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ended */}
      {ended.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-t3 uppercase tracking-wider flex items-center gap-2">
            <Trophy size={14} /> Encerrados ({ended.length})
          </h2>
          {ended.map(c => {
            const progress = getProgress(c);
            const top3 = progress.slice(0, 3);
            return (
              <div key={c.id} className="bg-surface border border-b1 rounded-lg overflow-hidden">
                <div className="px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-vgold/10 flex items-center justify-center">
                      <Trophy size={16} className="text-vgold" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">{c.title}</h3>
                      <div className="text-[10px] text-t4">{c.prize} · {METRIC_LABELS[c.metric]}</div>
                    </div>
                  </div>
                </div>
                {top3.length > 0 && (
                  <div className="border-t border-b1 px-5 py-3 flex items-center gap-4">
                    {top3.map((w, i) => (
                      <div key={w.userId} className="flex items-center gap-2">
                        <span style={{ fontSize: i === 0 ? '20px' : '14px' }}>{MEDALS[i]}</span>
                        <Avatar userId={w.userId} name={w.userName} />
                        <div>
                          <div className={`text-xs font-bold ${i === 0 ? 'text-vgold' : 'text-t2'}`}>{w.userName}</div>
                          <div className="text-[10px] font-mono text-t4">{w.value} {METRIC_LABELS[c.metric].toLowerCase()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
