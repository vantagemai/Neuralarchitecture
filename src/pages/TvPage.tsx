import { useEffect, useState } from 'react';
import { getUsers, getTodayFills, getMonthSales, calcScore, fmt$ } from '../lib/store';

const MEDALS = ['🥇', '🥈', '🥉'];

export function TvPage() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const users = getUsers().filter(u => u.active);
  const fills = getTodayFills();
  const sales = getMonthSales();

  const totalScore = fills.reduce((t, f) => t + calcScore(f), 0);
  const filledPct = users.length > 0 ? Math.round((fills.length / users.length) * 100) : 0;
  const totalComm = sales.reduce((t, s) => t + (s.sellerSetupComm || 0) + (s.sellerRecComm || 0), 0);

  const actSorted = [...fills].sort((a, b) => calcScore(b) - calcScore(a)).slice(0, 8);
  const maxScore = actSorted[0] ? calcScore(actSorted[0]) : 1;

  // Revenue map
  const revMap: Record<string, { name: string; comm: number; cnt: number }> = {};
  sales.forEach(s => {
    const id = s.sellerName;
    if (!revMap[id]) revMap[id] = { name: s.sellerName, comm: 0, cnt: 0 };
    revMap[id].comm += (s.sellerSetupComm || 0) + (s.sellerRecComm || 0);
    revMap[id].cnt++;
  });
  const revSorted = Object.values(revMap).sort((a, b) => b.comm - a.comm).slice(0, 8);
  const maxComm = revSorted[0]?.comm || 1;

  return (
    <div className="space-y-5">
      {/* TV Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-vred flex items-center justify-center">
            <span className="text-white font-black text-lg">V</span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wide">
              VANTAGEM<span className="text-vred">.ai</span>
              <span className="text-t4 text-sm ml-3">OPS DIÁRIO</span>
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono text-vgreen">
          <span className="w-2 h-2 rounded-full bg-vgreen animate-pulse" />
          AO VIVO
          <span className="text-t4 ml-2">
            {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { val: `${filledPct}%`, label: 'Fill Hoje', color: filledPct >= 100 ? 'text-vgreen' : 'text-vred' },
          { val: totalScore.toString(), label: 'Score Total', color: 'text-vred' },
          { val: sales.length.toString(), label: 'Vendas Mês', color: 'text-vgold' },
          { val: fmt$(totalComm), label: 'Comissões', color: 'text-vgreen' },
        ].map((kpi, i) => (
          <div key={i} className="bg-surface border border-b1 rounded-xl p-5 text-center">
            <div className={`font-mono text-3xl font-bold ${kpi.color}`}>{kpi.val}</div>
            <div className="text-[10px] text-t4 uppercase tracking-wider mt-2">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-2 gap-6">
        {/* Activity */}
        <div className="bg-surface border border-b1 rounded-xl p-5">
          <h2 className="text-vred font-bold text-sm uppercase tracking-wider mb-4">📊 Atividade — Hoje</h2>
          {actSorted.length === 0 ? (
            <div className="text-center py-8 text-t4 text-sm">Sem dados hoje</div>
          ) : (
            <div className="space-y-3">
              {actSorted.map((f, i) => {
                const score = calcScore(f);
                return (
                  <div key={f.userId}>
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-center text-lg">{MEDALS[i] || `#${i + 1}`}</span>
                      <span className="flex-1 text-sm font-semibold truncate">{f.userName}</span>
                      <span className="font-mono font-bold text-vred">{score} pts</span>
                    </div>
                    <div className="ml-9 mt-1 h-1.5 bg-overlay rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-vred to-red-400 rounded-full transition-all duration-1000"
                        style={{ width: `${Math.round((score / maxScore) * 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Revenue */}
        <div className="bg-surface border border-b1 rounded-xl p-5">
          <h2 className="text-vgreen font-bold text-sm uppercase tracking-wider mb-4">💰 Receita — Mês</h2>
          {revSorted.length === 0 ? (
            <div className="text-center py-8 text-t4 text-sm">Sem vendas no mês</div>
          ) : (
            <div className="space-y-3">
              {revSorted.map((r, i) => (
                <div key={r.name}>
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center text-lg">{MEDALS[i] || `#${i + 1}`}</span>
                    <span className="flex-1 text-sm font-semibold truncate">
                      {r.name} <span className="text-t4 text-xs">({r.cnt})</span>
                    </span>
                    <span className="font-mono font-bold text-vgreen">{fmt$(r.comm)}</span>
                  </div>
                  <div className="ml-9 mt-1 h-1.5 bg-overlay rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-600 to-vgreen rounded-full transition-all duration-1000"
                      style={{ width: `${Math.round((r.comm / maxComm) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
