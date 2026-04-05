import { Target, Users, CheckCircle2, XCircle, TrendingUp, AlertTriangle } from 'lucide-react';
import { KpiCard } from '../components/ui/KpiCard';

// Demo pipeline data
const FUNNEL = [
  { label: 'Geradas (Setters)',  value: 87,  color: '#9B7FE0' },
  { label: 'Confirmadas',       value: 64,  color: '#5B9AF5' },
  { label: 'Qualificadas',      value: 42,  color: '#FFD130' },
  { label: 'Em Fechamento',     value: 18,  color: '#F77737' },
  { label: 'Vendas Fechadas',   value: 14,  color: '#00C864' },
  { label: 'Perdidas',          value: 9,   color: '#F11013' },
];

const PENDING = [
  { setter: 'Ana Costa', founder: 'Patricia Santos', count: 5, date: '03/04/2026', hours: 28 },
  { setter: 'Rodrigo Silva', founder: 'Marcus Oliveira', count: 3, date: '02/04/2026', hours: 52 },
];

export function PipelinePage() {
  const maxVal = Math.max(...FUNNEL.map(f => f.value), 1);

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold">Pipeline</h1>
        <p className="text-sm text-t3 mt-1">Funil de oportunidades do time</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Geradas" value="87" icon={Target} color="purp" />
        <KpiCard label="Qualificadas" value="42" icon={Users} color="gold" />
        <KpiCard label="Vendas" value="14" icon={CheckCircle2} color="green" />
        <KpiCard label="Perdidas" value="9" icon={XCircle} color="red" />
      </div>

      {/* Funnel */}
      <div className="bg-surface border border-b1 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-[15px] font-bold">📊 Funil do Time</h2>
            <p className="text-xs text-t3 mt-1">% = conversão vs etapa anterior</p>
          </div>
        </div>
        <div className="space-y-3">
          {FUNNEL.map((step, i) => {
            const width = Math.round((step.value / maxVal) * 100);
            const prev = i > 0 ? FUNNEL[i - 1].value : null;
            const rate = prev && prev > 0 ? Math.round((step.value / prev) * 100) : null;
            return (
              <div key={step.label} className="flex items-center gap-4">
                <div className="w-[140px] text-right text-xs text-t3 font-mono shrink-0">
                  {step.label}
                </div>
                <div className="flex-1 h-7 bg-overlay rounded relative overflow-hidden">
                  <div
                    className="h-full rounded flex items-center pl-3 transition-all duration-1000"
                    style={{ width: `${width}%`, backgroundColor: step.color }}
                  >
                    <span className="text-[10px] font-bold text-white font-mono">{step.value}</span>
                  </div>
                </div>
                <div className="w-[44px] text-right text-xs font-mono text-t4">
                  {rate !== null ? `${rate}%` : ''}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending > 24h */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface border border-b1 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={16} className="text-vred" />
            <h2 className="text-[15px] font-bold">Pendentes há mais de 24h</h2>
          </div>
          {PENDING.map((p, i) => (
            <div key={i} className="bg-elevated border border-vred/15 rounded-lg p-4 mb-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-semibold">{p.setter}</span>
                  <span className="text-t4 mx-2">→</span>
                  <span className="text-sm font-semibold">{p.founder}</span>
                </div>
                <span className="text-[10px] font-mono text-vred bg-vred/10 px-2 py-0.5 rounded-full">
                  +{p.hours}h sem confirmar
                </span>
              </div>
              <div className="text-xs text-t3">
                {p.count} oportunidades · {p.date}
              </div>
              <div className="flex gap-2 mt-3">
                <input
                  type="number"
                  defaultValue={p.count}
                  className="w-20 bg-surface border border-b1 rounded-lg px-2 py-1.5 text-center font-mono text-sm outline-none focus:border-vred/40"
                />
                <button className="bg-vred text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-vred-dark transition-colors">
                  👑 Definir
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-surface border border-b1 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-vgold" />
            <h2 className="text-[15px] font-bold">Conversão por Etapa</h2>
          </div>
          <div className="space-y-4">
            {[
              { from: 'Gerada → Confirmada', rate: 74, color: 'bg-vblue' },
              { from: 'Confirmada → Qualificada', rate: 66, color: 'bg-vgold' },
              { from: 'Qualificada → Fechamento', rate: 43, color: 'bg-orange-500' },
              { from: 'Fechamento → Venda', rate: 78, color: 'bg-vgreen' },
            ].map(item => (
              <div key={item.from}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-t3">{item.from}</span>
                  <span className="font-mono font-bold text-t1">{item.rate}%</span>
                </div>
                <div className="h-2 bg-overlay rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${item.color} transition-all duration-1000`} style={{ width: `${item.rate}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
