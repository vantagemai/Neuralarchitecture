import { useMemo } from 'react';
import { Badge } from '../components/ui/Badge';
import { CHANNELS, getTodayFills, getMonthSales, calcScore, fmt$ } from '../lib/store';

const MEDALS = ['🥇', '🥈', '🥉'];
const roleVariant = (r: string) => r === 'Setter' ? 'purp' as const : r === 'Founder' ? 'red' as const : 'gold' as const;

export function RankingPage() {
  const fills = useMemo(() => getTodayFills(), []);
  const sales = useMemo(() => getMonthSales(), []);

  // Activity ranking from real fills
  const actData = fills.map(f => {
    const channelBreakdown: Record<string, number> = {};
    CHANNELS.forEach(ch => {
      const v = f.channels?.[ch.id];
      channelBreakdown[ch.id] = typeof v === 'object' ? (parseInt(v.a) || 0) : (parseInt(String(v)) || 0);
    });
    return { name: f.userName, role: f.userRole, score: calcScore(f), channels: channelBreakdown };
  }).sort((a, b) => b.score - a.score);

  // Revenue ranking from real sales
  const revMap: Record<string, { name: string; role: string; comm: number; sales: number }> = {};
  sales.forEach(s => {
    const id = s.sellerName;
    if (!revMap[id]) revMap[id] = { name: s.sellerName, role: s.sellerRole, comm: 0, sales: 0 };
    revMap[id].comm += (s.sellerSetupComm || 0) + (s.sellerRecComm || 0);
    revMap[id].sales++;
  });
  const revData = Object.values(revMap).sort((a, b) => b.comm - a.comm);

  const maxScore = actData[0]?.score || 1;
  const maxComm = revData[0]?.comm || 1;

  const emptyMsg = (text: string) => (
    <div className="text-center py-16">
      <div className="text-3xl mb-3">🏆</div>
      <p className="text-sm text-t3">{text}</p>
      <p className="text-xs text-t4 mt-2">Os dados aparecem quando alguém preenche o Fill Diário ou registra vendas.</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold">Ranking</h1>
        <p className="text-sm text-t3 mt-1">Atividade vs Resultado — dados reais</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity */}
        <div className="bg-surface border border-b1 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-b1">
            <h2 className="text-[15px] font-bold">📊 Atividade — Score Hoje</h2>
            <p className="text-xs text-t3 mt-0.5">Volume de contatos por canal</p>
          </div>
          {actData.length === 0 ? emptyMsg('Sem fills registrados hoje') : (
            <div className="divide-y divide-b1">
              {actData.map((person, i) => (
                <div key={person.name} className="px-5 py-3.5 hover:bg-elevated/50 transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="w-7 text-center text-lg">
                      {MEDALS[i] || <span className="text-xs text-t4 font-mono">#{i + 1}</span>}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-vred to-vred-dark flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                      {person.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold truncate">{person.name}</span>
                        <Badge variant={roleVariant(person.role)}>{person.role}</Badge>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-vred">{person.score} pts</span>
                  </div>
                  <div className="flex gap-2 ml-10">
                    {CHANNELS.map(ch => (
                      <span key={ch.id} className="text-[10px] text-t4">
                        {ch.icon} <span className="font-mono">{person.channels[ch.id] || 0}</span>
                      </span>
                    ))}
                  </div>
                  <div className="ml-10 mt-2 h-1.5 bg-overlay rounded-full overflow-hidden">
                    <div className="h-full bg-vred rounded-full transition-all duration-1000" style={{ width: `${Math.round((person.score / maxScore) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Revenue */}
        <div className="bg-surface border border-b1 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-b1">
            <h2 className="text-[15px] font-bold">💰 Resultado — Comissão Mês</h2>
            <p className="text-xs text-t3 mt-0.5">Receita gerada este mês</p>
          </div>
          {revData.length === 0 ? emptyMsg('Sem vendas registradas este mês') : (
            <div className="divide-y divide-b1">
              {revData.map((person, i) => (
                <div key={person.name} className="px-5 py-4 hover:bg-elevated/50 transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="w-7 text-center text-lg">
                      {MEDALS[i] || <span className="text-xs text-t4 font-mono">#{i + 1}</span>}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-vgreen to-emerald-700 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                      {person.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold truncate">{person.name}</span>
                        <Badge variant={roleVariant(person.role)}>{person.role}</Badge>
                      </div>
                      <div className="text-[10px] text-t4 mt-0.5">{person.sales} venda(s)</div>
                    </div>
                    <span className="font-mono font-bold text-vgreen">{fmt$(person.comm)}</span>
                  </div>
                  <div className="ml-10 h-1.5 bg-overlay rounded-full overflow-hidden">
                    <div className="h-full bg-vgreen rounded-full transition-all duration-1000" style={{ width: `${Math.round((person.comm / maxComm) * 100)}%` }} />
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
