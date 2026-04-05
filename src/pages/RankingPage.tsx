import { Badge } from '../components/ui/Badge';
import { CHANNELS } from '../lib/store';

const MEDALS = ['🥇', '🥈', '🥉'];

const ACT_DATA = [
  { name: 'Rodrigo Silva', role: 'Setter', score: 127, channels: { coldcall: 32, instagram: 45, whatsapp: 28, calls: 12, visitas: 10 } },
  { name: 'Patricia Santos', role: 'Founder', score: 89, channels: { coldcall: 18, instagram: 30, whatsapp: 22, calls: 10, visitas: 9 } },
  { name: 'Marcus Oliveira', role: 'Partner', score: 64, channels: { coldcall: 10, instagram: 22, whatsapp: 18, calls: 8, visitas: 6 } },
  { name: 'Ana Costa', role: 'Setter', score: 45, channels: { coldcall: 8, instagram: 15, whatsapp: 12, calls: 6, visitas: 4 } },
  { name: 'Carlos Mendes', role: 'Vendedor', score: 33, channels: { coldcall: 5, instagram: 10, whatsapp: 10, calls: 5, visitas: 3 } },
];

const REV_DATA = [
  { name: 'Patricia Santos', role: 'Founder', comm: 2480, sales: 5 },
  { name: 'Marcus Oliveira', role: 'Partner', comm: 1230, sales: 3 },
  { name: 'Rodrigo Silva', role: 'Setter', comm: 680, sales: 0 },
  { name: 'Ana Costa', role: 'Setter', comm: 340, sales: 0 },
];

const roleVariant = (r: string) => r === 'Setter' ? 'purp' as const : r === 'Founder' ? 'red' as const : 'gold' as const;

export function RankingPage() {
  const maxScore = ACT_DATA[0]?.score || 1;
  const maxComm = REV_DATA[0]?.comm || 1;

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold">Ranking</h1>
        <p className="text-sm text-t3 mt-1">Atividade vs Resultado — Hoje</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity ranking */}
        <div className="bg-surface border border-b1 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-b1">
            <h2 className="text-[15px] font-bold">📊 Atividade — Score</h2>
            <p className="text-xs text-t3 mt-0.5">Volume de contatos por canal</p>
          </div>
          <div className="divide-y divide-b1">
            {ACT_DATA.map((person, i) => (
              <div key={person.name} className="px-5 py-3.5 hover:bg-elevated/50 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-7 text-center text-lg">
                    {MEDALS[i] || <span className="text-xs text-t4 font-mono">#{i + 1}</span>}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-vred to-vred-dark flex items-center justify-center text-white text-[10px] font-bold">
                    {person.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{person.name}</span>
                      <Badge variant={roleVariant(person.role)}>{person.role}</Badge>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-vred">{person.score} pts</span>
                </div>
                {/* Channel breakdown mini */}
                <div className="flex gap-2 ml-10">
                  {CHANNELS.map(ch => (
                    <div key={ch.id} className="flex items-center gap-1 text-[10px] text-t4">
                      <span>{ch.icon}</span>
                      <span className="font-mono">{person.channels[ch.id as keyof typeof person.channels] || 0}</span>
                    </div>
                  ))}
                </div>
                {/* Progress bar */}
                <div className="ml-10 mt-2 h-1.5 bg-overlay rounded-full overflow-hidden">
                  <div
                    className="h-full bg-vred rounded-full transition-all duration-1000"
                    style={{ width: `${Math.round((person.score / maxScore) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue ranking */}
        <div className="bg-surface border border-b1 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-b1">
            <h2 className="text-[15px] font-bold">💰 Resultado — Comissão</h2>
            <p className="text-xs text-t3 mt-0.5">Receita gerada este mês</p>
          </div>
          <div className="divide-y divide-b1">
            {REV_DATA.map((person, i) => (
              <div key={person.name} className="px-5 py-4 hover:bg-elevated/50 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-7 text-center text-lg">
                    {MEDALS[i] || <span className="text-xs text-t4 font-mono">#{i + 1}</span>}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-vgreen to-emerald-700 flex items-center justify-center text-white text-[10px] font-bold">
                    {person.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{person.name}</span>
                      <Badge variant={roleVariant(person.role)}>{person.role}</Badge>
                    </div>
                    <div className="text-[10px] text-t4 mt-0.5">{person.sales} vendas diretas</div>
                  </div>
                  <span className="font-mono font-bold text-vgreen">${person.comm.toLocaleString()}</span>
                </div>
                <div className="ml-10 h-1.5 bg-overlay rounded-full overflow-hidden">
                  <div
                    className="h-full bg-vgreen rounded-full transition-all duration-1000"
                    style={{ width: `${Math.round((person.comm / maxComm) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
