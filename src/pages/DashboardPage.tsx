import { KpiCard } from '../components/ui/KpiCard';
import { Badge } from '../components/ui/Badge';
import {
  DollarSign, Users, Target, TrendingUp,
  AlertTriangle, CheckCircle2, Clock
} from 'lucide-react';

// Demo data
const TEAM = [
  { name: 'Rodrigo Silva', role: 'Setter', score: 127, filled: true, time: '08:42' },
  { name: 'Patricia Santos', role: 'Founder', score: 89, filled: true, time: '09:15' },
  { name: 'Marcus Oliveira', role: 'Partner', score: 64, filled: true, time: '10:03' },
  { name: 'Ana Costa', role: 'Setter', score: 45, filled: true, time: '11:22' },
  { name: 'Carlos Mendes', role: 'Vendedor', score: 0, filled: false, time: '' },
];

const RECENT_SALES = [
  { seller: 'Patricia Santos', date: 'Hoje', setup: 789, rec: 297, comm: 513 },
  { seller: 'Marcus Oliveira', date: 'Hoje', setup: 789, rec: 197, comm: 296 },
  { seller: 'Rodrigo Silva', date: 'Ontem', setup: 397, rec: 97, comm: 148 },
];

const ALERTS = [
  { type: 'warn', msg: 'Carlos Mendes não preencheu o fill hoje', time: '2h atrás' },
  { type: 'ok', msg: '2 vendas fechadas hoje — $809 em comissões', time: '1h atrás' },
  { type: 'info', msg: '3 oportunidades pendentes há mais de 24h', time: '30min' },
];

const medals = ['🥇', '🥈', '🥉'];

export function DashboardPage() {
  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Bom dia' : now.getHours() < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-t1">Operations Dashboard</h1>
          <p className="text-sm text-t3 mt-1">
            {greeting} · {now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs text-vgreen">
            <span className="w-2 h-2 rounded-full bg-vgreen animate-pulse" />
            Ao vivo
          </span>
          <span className="text-xs text-t4 font-mono">
            Atualizado: {now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Receita Mês" value="$4,230" icon={DollarSign} color="green" trend={29} trendLabel="vs mês anterior" highlight />
        <KpiCard label="Vendas Mês" value="14" icon={Target} color="gold" trend={12} trendLabel="vs mês anterior" />
        <KpiCard label="Time Ativo" value="4/5" icon={Users} color="blue" trendLabel="preencheram hoje" />
        <KpiCard label="Score Total" value="325" icon={TrendingUp} color="red" trend={18} trendLabel="pts hoje" />
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Team activity */}
        <div className="lg:col-span-2 bg-surface border border-b1 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-b1">
            <div>
              <h2 className="text-[15px] font-bold text-t1">Atividade do Time</h2>
              <p className="text-xs text-t3 mt-0.5">Score de prospecção por canal — hoje</p>
            </div>
            <Badge variant="green">{TEAM.filter(t => t.filled).length} preenchidos</Badge>
          </div>
          <div className="divide-y divide-b1">
            {TEAM.map((member, i) => (
              <div key={member.name} className="flex items-center gap-4 px-5 py-3.5 hover:bg-elevated/50 transition-colors">
                <span className="w-7 text-center text-lg">
                  {i < 3 ? medals[i] : <span className="text-xs text-t4 font-mono">#{i + 1}</span>}
                </span>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-vred to-vred-dark flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                  {member.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-t1 truncate">{member.name}</span>
                    <Badge variant={member.role === 'Setter' ? 'purp' : member.role === 'Founder' ? 'red' : 'gold'}>
                      {member.role}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  {member.filled ? (
                    <>
                      <div className="text-sm font-bold font-mono text-vred">{member.score} pts</div>
                      <div className="text-[10px] text-t4 font-mono">{member.time}</div>
                    </>
                  ) : (
                    <Badge variant="red">Pendente</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Alerts */}
        <div className="bg-surface border border-b1 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-b1">
            <h2 className="text-[15px] font-bold text-t1">Alertas</h2>
            <Badge variant="red">{ALERTS.filter(a => a.type === 'warn').length} atenção</Badge>
          </div>
          <div className="divide-y divide-b1">
            {ALERTS.map((alert, i) => (
              <div key={i} className="px-5 py-4">
                <div className="flex items-start gap-3">
                  {alert.type === 'warn' && <AlertTriangle size={16} className="text-vred mt-0.5 shrink-0" />}
                  {alert.type === 'ok' && <CheckCircle2 size={16} className="text-vgreen mt-0.5 shrink-0" />}
                  {alert.type === 'info' && <Clock size={16} className="text-vgold mt-0.5 shrink-0" />}
                  <div className="flex-1">
                    <p className="text-sm text-t2">{alert.msg}</p>
                    <p className="text-[10px] text-t4 mt-1 font-mono">{alert.time}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent sales */}
      <div className="bg-surface border border-b1 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-b1">
          <div>
            <h2 className="text-[15px] font-bold text-t1">Vendas Recentes</h2>
            <p className="text-xs text-t3 mt-0.5">Últimas vendas registradas no sistema</p>
          </div>
          <button className="text-xs text-vred font-semibold hover:underline">Ver todas →</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-elevated/50">
                <th className="text-left text-[10px] text-t4 uppercase tracking-wider font-semibold px-5 py-3">Vendedor</th>
                <th className="text-left text-[10px] text-t4 uppercase tracking-wider font-semibold px-5 py-3">Data</th>
                <th className="text-right text-[10px] text-t4 uppercase tracking-wider font-semibold px-5 py-3">Setup</th>
                <th className="text-right text-[10px] text-t4 uppercase tracking-wider font-semibold px-5 py-3">Rec/mês</th>
                <th className="text-right text-[10px] text-t4 uppercase tracking-wider font-semibold px-5 py-3">Comissão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-b1">
              {RECENT_SALES.map((sale, i) => (
                <tr key={i} className="hover:bg-elevated/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <span className="text-sm font-semibold text-t1">{sale.seller}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-t3">{sale.date}</span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="text-sm font-mono text-t2">${sale.setup}</span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="text-sm font-mono text-t2">${sale.rec}</span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="text-sm font-mono font-bold text-vgreen">${sale.comm}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
