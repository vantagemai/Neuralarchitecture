import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, CheckCircle2, Clock, Crown } from 'lucide-react';
import { db, getUsers, getMonthSales, getTodayFills, calcScore, fmt$, getSession } from '../lib/store';
import { getStreak } from '../lib/streaks';
import { showToast } from '../components/ui/Toast';
import { Badge } from '../components/ui/Badge';
import { playAchievement } from '../lib/sounds';
import { triggerConfetti } from '../components/ui/Confetti';

interface PrizeWinner {
  odId: string;
  prizeId: string;
  userId: string;
  userName: string;
  value: string;
  approvedAt: number;
  approvedBy: string;
}

const PRIZE_DEFS = [
  { id: 'top_closer',  label: 'Top Closer da Semana', icon: '🏆', metric: 'revenue', description: 'Maior comissao acumulada no mes' },
  { id: 'top_setter',  label: 'Top Setter da Semana', icon: '🎯', metric: 'setter_score', description: 'Setter com maior score de atividade' },
  { id: 'iron_streak', label: 'Sequencia de Ferro', icon: '🔥', metric: 'streak', description: 'Maior streak consecutivo de fills' },
  { id: 'first10',     label: 'First 10 Closes', icon: '📱', metric: 'sales_count', description: 'Primeiro a atingir 10 vendas no mes' },
  { id: 'diamond',     label: 'Diamond Month', icon: '💎', metric: 'revenue', description: 'Maior receita total do mes' },
  { id: 'century',     label: 'Century Club', icon: '🚀', metric: 'contacts', description: '100+ contatos em um unico dia' },
];

function Avatar({ userId, name, size = 'w-10 h-10' }: { userId: string; name: string; size?: string }) {
  const url = localStorage.getItem(`vantagem_avatar_${userId}`);
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return url ? (
    <img src={url} alt={name} className={`${size} rounded-full object-cover border border-b1 shrink-0`} />
  ) : (
    <div className={`${size} rounded-full bg-gradient-to-br from-vred to-vred-dark flex items-center justify-center text-white text-[10px] font-bold shrink-0`}>
      {initials}
    </div>
  );
}

export function PremiacoesPage() {
  const session = getSession();
  const isManager = session?.role === 'Head' || session?.role === 'Founder' || session?.role === 'Partner';
  const [refresh, setRefresh] = useState(0);

  const users = useMemo(() => getUsers().filter(u => u.active), []);
  const sales = useMemo(() => getMonthSales(), [refresh]);
  const fills = useMemo(() => getTodayFills(), [refresh]);

  // Prize config from Config page
  const cfg = db.get<{ awards?: { prizes?: Record<string, string> } }>('ops_config');
  const prizeValues = cfg?.awards?.prizes || {};

  // Approved winners
  const approvedWinners = db.get<PrizeWinner[]>('ops_prize_winners') || [];
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthWinners = approvedWinners.filter(w => w.approvedAt && new Date(w.approvedAt).toISOString().startsWith(currentMonth));

  // Calculate rankings per prize
  const rankings = useMemo(() => {
    // Revenue ranking
    const revMap: Record<string, { id: string; name: string; role: string; comm: number; cnt: number }> = {};
    sales.forEach(s => {
      const id = s.sellerId || s.sellerName;
      if (!revMap[id]) revMap[id] = { id, name: s.sellerName, role: s.sellerRole, comm: 0, cnt: 0 };
      revMap[id].comm += (s.sellerSetupComm || 0) + (s.sellerRecComm || 0);
      revMap[id].cnt++;
    });
    const revSorted = Object.values(revMap).sort((a, b) => b.comm - a.comm);

    // Activity (setters only)
    const setterFills = fills.filter(f => {
      const u = users.find(x => x.id === f.userId);
      return u?.role === 'Setter';
    });
    const setterScores = setterFills.map(f => ({
      id: f.userId, name: f.userName, value: calcScore(f)
    })).sort((a, b) => b.value - a.value);

    // Streaks
    const streaks = users.map(u => ({
      id: u.id, name: u.name, value: getStreak(u.id).current
    })).filter(u => u.value > 0).sort((a, b) => b.value - a.value);

    // Sales count
    const salesCount = revSorted.map(r => ({ id: r.id, name: r.name, value: r.cnt }));

    // Contacts today
    const contacts = fills.map(f => ({
      id: f.userId, name: f.userName,
      value: Object.values(f.channels).reduce((t, ch) => t + (parseInt(ch.a) || 0), 0)
    })).sort((a, b) => b.value - a.value);

    return {
      revenue: revSorted.map(r => ({ id: r.id, name: r.name, value: r.comm, display: fmt$(r.comm) })),
      setter_score: setterScores.map(s => ({ ...s, display: `${s.value} pts` })),
      streak: streaks.map(s => ({ ...s, display: `${s.value} dias` })),
      sales_count: salesCount.map(s => ({ ...s, display: `${s.value} vendas` })),
      contacts: contacts.map(c => ({ ...c, display: `${c.value} contatos` })),
    };
  }, [sales, fills, users, refresh]);

  const getMetricRanking = (metric: string) => {
    return (rankings as Record<string, { id: string; name: string; value: number; display: string }[]>)[metric] || [];
  };

  const approveWinner = (prizeId: string, userId: string, userName: string, value: string) => {
    const winners = db.get<PrizeWinner[]>('ops_prize_winners') || [];
    // Check if already approved this month
    if (winners.some(w => w.prizeId === prizeId && new Date(w.approvedAt).toISOString().startsWith(currentMonth))) {
      showToast('error', 'Premio ja aprovado este mes');
      return;
    }
    winners.push({
      odId: `pw_${Date.now()}`,
      prizeId,
      userId,
      userName,
      value,
      approvedAt: Date.now(),
      approvedBy: session?.name || 'Manager',
    });
    db.set('ops_prize_winners', winners);
    showToast('success', `${userName} premiado!`);
    playAchievement();
    triggerConfetti();
    setRefresh(r => r + 1);
  };

  const MEDALS = ['🥇', '🥈', '🥉'];

  return (
    <div className="space-y-5 animate-in">
      <div className="flex items-center justify-between border-b border-b1 pb-3">
        <div>
          <h1 className="text-lg font-bold font-mono">PREMIACOES</h1>
          <p className="text-[11px] text-t4 font-mono">Rankings ao vivo · Aprove vencedores</p>
        </div>
        <div className="text-[10px] font-mono text-t4">{new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}</div>
      </div>

      {/* Month winners summary */}
      {monthWinners.length > 0 && (
        <div className="bg-surface border border-b1 border-l-[3px] border-l-vgold rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Crown size={14} className="text-vgold" />
            <span className="text-[11px] font-bold text-vgold uppercase tracking-[0.12em] font-mono">Vencedores Aprovados</span>
          </div>
          <div className="flex gap-4 flex-wrap">
            {monthWinners.map(w => {
              const def = PRIZE_DEFS.find(p => p.id === w.prizeId);
              return (
                <div key={w.odId} className="flex items-center gap-2 bg-vgold/5 border border-vgold/10 rounded-lg px-4 py-2.5">
                  <span className="text-xl">{def?.icon || '🏆'}</span>
                  <Avatar userId={w.userId} name={w.userName} size="w-8 h-8" />
                  <div>
                    <Link to={`/perfil/${w.userId}`} className="text-xs font-bold hover:text-vred transition-colors">{w.userName}</Link>
                    <div className="text-[10px] text-vgold">{def?.label} · {w.value}</div>
                  </div>
                  <CheckCircle2 size={14} className="text-vgreen ml-1" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Prize cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {PRIZE_DEFS.map(prize => {
          const prizeValue = prizeValues[prize.id];
          const ranking = getMetricRanking(prize.metric);
          const top5 = ranking.slice(0, 5);
          const isApproved = monthWinners.some(w => w.prizeId === prize.id);
          const winner = monthWinners.find(w => w.prizeId === prize.id);

          return (
            <div key={prize.id} className={`rounded-lg overflow-hidden border transition-all hover:border-b2 ${
              isApproved ? 'bg-surface border-vgreen/20 border-l-[3px] border-l-vgreen' : 'bg-surface border-b1 border-l-[3px] border-l-vgold'
            }`}>
              {/* Prize header */}
              <div className="px-5 py-4 border-b border-b1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{prize.icon}</span>
                    <div>
                      <h3 className="font-bold">{prize.label}</h3>
                      <p className="text-[11px] text-t4">{prize.description}</p>
                    </div>
                  </div>
                  {isApproved ? (
                    <Badge variant="green">Aprovado</Badge>
                  ) : prizeValue ? (
                    <div className="bg-vgold/10 border border-vgold/15 rounded-lg px-3 py-1.5">
                      <span className="text-sm font-bold text-vgold">{prizeValue}</span>
                    </div>
                  ) : (
                    <Badge variant="dim">Sem premio</Badge>
                  )}
                </div>
              </div>

              {/* Ranking */}
              <div className="px-5 py-4">
                {isApproved && winner ? (
                  <div className="flex items-center gap-4 bg-vgreen/5 border border-vgreen/15 rounded-lg px-4 py-3">
                    <span className="text-2xl">🏆</span>
                    <Avatar userId={winner.userId} name={winner.userName} size="w-12 h-12" />
                    <div className="flex-1">
                      <Link to={`/perfil/${winner.userId}`} className="font-bold text-lg hover:text-vred transition-colors">{winner.userName}</Link>
                      <div className="text-xs text-vgreen">Vencedor — {winner.value}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-t4">Aprovado por</div>
                      <div className="text-xs font-semibold">{winner.approvedBy}</div>
                    </div>
                  </div>
                ) : top5.length === 0 ? (
                  <div className="text-center py-6 text-t4 text-sm">
                    <Clock size={20} className="mx-auto mb-2 opacity-30" />
                    Sem dados ainda
                  </div>
                ) : (
                  <div className="space-y-2">
                    {top5.map((person, i) => {
                      const isTop = i === 0;
                      const pct = ranking[0]?.value > 0 ? Math.round((person.value / ranking[0].value) * 100) : 0;
                      return (
                        <div key={person.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                          isTop ? 'bg-vgold/5 border border-vgold/10' : 'hover:bg-elevated/50'
                        }`}>
                          <span style={{ fontSize: i < 3 ? '18px' : '13px' }}>
                            {MEDALS[i] || <span className="text-[10px] text-t4 font-mono">#{i + 1}</span>}
                          </span>
                          <Avatar userId={person.id} name={person.name} size={isTop ? 'w-10 h-10' : 'w-8 h-8'} />
                          <div className="flex-1 min-w-0">
                            <Link to={`/perfil/${person.id}`} className={`text-sm font-semibold truncate block hover:text-vred transition-colors ${isTop ? 'text-vgold' : ''}`}>{person.name}</Link>
                            <div className="h-2 bg-overlay rounded-sm overflow-hidden mt-1">
                              <div className={`h-full rounded-sm transition-all duration-700 ${isTop ? 'bg-gradient-to-r from-vgold-dark to-vgold' : 'bg-vgold/40'}`}
                                style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                          <span className={`font-mono text-sm font-bold shrink-0 ${isTop ? 'text-vgold' : 'text-t2'}`}>
                            {person.display}
                          </span>
                        </div>
                      );
                    })}

                    {/* Approve button for managers */}
                    {isManager && top5[0] && prizeValue && (
                      <button
                        onClick={() => approveWinner(prize.id, top5[0].id, top5[0].name, top5[0].display)}
                        className="w-full mt-2 flex items-center justify-center gap-2 bg-transparent hover:bg-vgold/10 text-vgold border border-vgold/30 font-bold font-mono py-2 rounded-lg transition-colors text-xs uppercase tracking-wider"
                      >
                        <Trophy size={14} /> Aprovar {top5[0].name} como vencedor
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
