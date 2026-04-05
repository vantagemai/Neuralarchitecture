import { useState, useEffect } from 'react';
import { Plus, X, Clock, Trophy, Target } from 'lucide-react';
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
      // Count fill days in challenge period
      const keys = db.list('ops_fill_');
      value = keys.filter(k => {
        const f = db.get<{ userId: string }>(k);
        return f?.userId === u.id;
      }).length;
    }
    return { userId: u.id, userName: u.name, value };
  }).filter(p => p.value > 0).sort((a, b) => b.value - a.value);
}

function timeRemaining(endDate: string): string {
  const end = new Date(endDate + 'T23:59:59');
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  if (diff <= 0) return 'Encerrado';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((diff % 3600000) / 60000);
  return `${hours}h ${mins}m`;
}

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

  // Countdown tick
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

  const MEDALS = ['🥇', '🥈', '🥉'];
  const METRIC_LABELS = { sales: 'Vendas', score: 'Score', fill_days: 'Dias de Fill' };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Desafios</h1>
          <p className="text-sm text-t3 mt-1">Competicoes com prazo e premio</p>
        </div>
        {isManager && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-vgold hover:bg-vgold-dark text-canvas font-bold px-5 py-2.5 rounded-lg transition-colors"
          >
            {showForm ? <><X size={16} /> Fechar</> : <><Plus size={16} /> Novo Desafio</>}
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-surface border border-vgold/20 rounded-xl p-6 animate-in">
          <h3 className="font-bold mb-4">Criar Desafio</h3>
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
              <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Detalhes do desafio..."
                className="mt-1 w-full bg-elevated border border-b1 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-vgold/40" />
            </div>
            <div>
              <label className="text-[11px] text-t3 uppercase tracking-wider font-semibold">Data final</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={now}
                className="mt-1 w-full bg-elevated border border-b1 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-vgold/40" />
            </div>
          </div>
          <button onClick={handleCreate} className="bg-vgold hover:bg-vgold-dark text-canvas font-bold px-6 py-3 rounded-lg w-full transition-colors">
            🏆 Criar Desafio
          </button>
        </div>
      )}

      {/* Active challenges */}
      {active.length === 0 && ended.length === 0 && (
        <div className="text-center py-16 bg-surface border border-b1 rounded-xl">
          <div className="text-4xl mb-3">🎯</div>
          <p className="text-sm text-t3">Nenhum desafio criado ainda</p>
          {isManager && <p className="text-xs text-t4 mt-1">Crie um desafio para motivar o time!</p>}
        </div>
      )}

      {active.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-t3 uppercase tracking-wider">Desafios Ativos</h2>
          {active.map(c => {
            const progress = getProgress(c);
            const remaining = timeRemaining(c.endDate);
            return (
              <div key={c.id} className="bg-surface border border-vgold/20 rounded-xl p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Target size={16} className="text-vgold" />
                      <h3 className="font-bold">{c.title}</h3>
                    </div>
                    {c.description && <p className="text-xs text-t3 mt-1">{c.description}</p>}
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-orange-400 text-xs font-mono">
                      <Clock size={12} />
                      {remaining}
                    </div>
                    <div className="text-[10px] text-t4 mt-0.5">ate {c.endDate}</div>
                  </div>
                </div>

                <div className="flex gap-3 flex-wrap">
                  <Badge variant="gold">{METRIC_LABELS[c.metric]}</Badge>
                  <Badge variant="green">Meta: {c.target}</Badge>
                  <Badge variant="purp">🏆 {c.prize}</Badge>
                </div>

                {/* Leaderboard */}
                {progress.length > 0 ? (
                  <div className="space-y-2">
                    {progress.slice(0, 5).map((p, i) => (
                      <div key={p.userId} className="flex items-center gap-3">
                        <span className="w-5 text-center text-sm">{MEDALS[i] || `#${i + 1}`}</span>
                        <span className="flex-1 text-sm font-semibold truncate">{p.userName}</span>
                        <div className="w-24 h-1.5 bg-overlay rounded-full overflow-hidden">
                          <div className="h-full bg-vgold rounded-full" style={{ width: `${Math.min(100, (p.value / c.target) * 100)}%` }} />
                        </div>
                        <span className="font-mono text-xs font-bold text-vgold">{p.value}/{c.target}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-t4">Nenhum progresso ainda</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Ended challenges */}
      {ended.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-t3 uppercase tracking-wider">Encerrados</h2>
          {ended.map(c => {
            const progress = getProgress(c);
            const winner = progress[0];
            return (
              <div key={c.id} className="bg-surface border border-b1 rounded-xl p-5 opacity-70">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy size={16} className="text-vgold" />
                    <h3 className="font-bold text-sm">{c.title}</h3>
                  </div>
                  {winner && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🥇</span>
                      <span className="text-sm font-bold">{winner.userName}</span>
                      <span className="text-xs text-vgold font-mono">({winner.value})</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
