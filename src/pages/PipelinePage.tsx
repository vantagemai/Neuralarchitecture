import { useState, useMemo } from 'react';
import { Target, Users, CheckCircle2, XCircle, TrendingUp } from 'lucide-react';
import { KpiCard } from '../components/ui/KpiCard';
import { db, getMonthSales, getUsers } from '../lib/store';

interface Opp {
  id: string; date: string; setterId: string; setterName: string;
  founderId: string; founderName: string; count: number;
  status: 'pending' | 'confirmed' | 'resolved'; confirmedCount?: number; ts: number;
}

function getMonthOpps(): Opp[] {
  const keys = db.list('ops_opp_');
  return keys.map(k => db.get<Opp>(k)).filter(Boolean) as Opp[];
}

export function PipelinePage() {
  const [refresh, setRefresh] = useState(0);
  const opps = useMemo(() => getMonthOpps(), [refresh]);
  const sales = useMemo(() => getMonthSales(), [refresh]);
  const users = useMemo(() => getUsers().filter(u => u.active), []);
  const setters = users.filter(u => u.role === 'Setter');
  const founders = users.filter(u => ['Founder', 'Partner', 'Vendedor'].includes(u.role));

  // Form state
  const [setterId, setSetterId] = useState('');
  const [founderId, setFounderId] = useState('');
  const [oppCount, setOppCount] = useState('');
  const [formMsg, setFormMsg] = useState('');

  // Funnel data
  const declared = opps.reduce((t, o) => t + o.count, 0);
  const confirmed = opps.filter(o => o.status !== 'pending').reduce((t, o) => t + (o.confirmedCount ?? o.count), 0);
  const closed = sales.length;
  const pending = opps.filter(o => o.status === 'pending');

  const FUNNEL = [
    { label: 'Geradas (Setters)', value: declared, color: '#9B7FE0' },
    { label: 'Confirmadas', value: confirmed, color: '#5B9AF5' },
    { label: 'Vendas Fechadas', value: closed, color: '#00C864' },
  ];
  const maxVal = Math.max(...FUNNEL.map(f => f.value), 1);

  const submitOpp = () => {
    const count = parseInt(oppCount);
    if (!setterId || !count || count <= 0) { setFormMsg('Selecione setter e quantidade'); return; }
    const setter = users.find(u => u.id === setterId);
    const founder = users.find(u => u.id === founderId);
    const id = `ops_opp_${Date.now()}`;
    const opp: Opp = {
      id, date: new Date().toISOString().split('T')[0],
      setterId, setterName: setter?.name || '',
      founderId: founderId || '', founderName: founder?.name || '',
      count, status: 'pending', ts: Date.now(),
    };
    db.set(id, opp);
    setOppCount(''); setFormMsg('✅ Oportunidades registradas!');
    setRefresh(r => r + 1);
    setTimeout(() => setFormMsg(''), 2000);
  };

  const resolveOpp = (oppId: string) => {
    const input = document.getElementById(`resolve_${oppId}`) as HTMLInputElement;
    const val = parseInt(input?.value);
    if (isNaN(val)) return;
    const opp = db.get<Opp>(oppId);
    if (!opp) return;
    opp.status = 'resolved'; opp.confirmedCount = val;
    db.set(oppId, opp);
    setRefresh(r => r + 1);
  };

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold">Pipeline</h1>
        <p className="text-sm text-t3 mt-1">Funil de oportunidades do time</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Geradas" value={declared} icon={Target} color="purp" />
        <KpiCard label="Confirmadas" value={confirmed} icon={Users} color="gold" />
        <KpiCard label="Vendas" value={closed} icon={CheckCircle2} color="green" />
        <KpiCard label="Pendentes" value={pending.length} icon={XCircle} color="red" />
      </div>

      {/* Funnel */}
      <div className="bg-surface border border-b1 rounded-xl p-6">
        <h2 className="text-sm font-bold mb-4">📊 Funil do Time</h2>
        <div className="space-y-3">
          {FUNNEL.map((step, i) => {
            const width = Math.round((step.value / maxVal) * 100);
            const prev = i > 0 ? FUNNEL[i - 1].value : null;
            const rate = prev && prev > 0 ? Math.round((step.value / prev) * 100) : null;
            return (
              <div key={step.label} className="flex items-center gap-4">
                <div className="w-[140px] text-right text-xs text-t3 font-mono shrink-0">{step.label}</div>
                <div className="flex-1 h-7 bg-overlay rounded overflow-hidden">
                  <div className="h-full rounded flex items-center pl-3 transition-all duration-1000"
                    style={{ width: `${Math.max(width, 2)}%`, backgroundColor: step.color }}>
                    <span className="text-[10px] font-bold text-white font-mono">{step.value}</span>
                  </div>
                </div>
                <div className="w-[44px] text-right text-xs font-mono text-t4">{rate !== null ? `${rate}%` : ''}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Register opp */}
        <div className="bg-surface border border-b1 rounded-xl p-6">
          <h2 className="text-sm font-bold mb-4">🎯 Registrar Oportunidades</h2>
          {formMsg && (
            <div className={`rounded-lg px-4 py-2 text-sm mb-4 ${formMsg.startsWith('✅') ? 'bg-vgreen/10 border border-vgreen/20 text-vgreen' : 'bg-vred/10 border border-vred/20 text-vred'}`}>
              {formMsg}
            </div>
          )}
          <div className="space-y-3">
            <div>
              <label className="text-[11px] text-t3 uppercase tracking-wider font-semibold">Setter</label>
              <select value={setterId} onChange={e => setSetterId(e.target.value)}
                className="mt-1 w-full bg-elevated border border-b1 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-vred/40 cursor-pointer">
                <option value="">Selecionar setter...</option>
                {setters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-t3 uppercase tracking-wider font-semibold">Founder destinatário</label>
              <select value={founderId} onChange={e => setFounderId(e.target.value)}
                className="mt-1 w-full bg-elevated border border-b1 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-vred/40 cursor-pointer">
                <option value="">Opcional...</option>
                {founders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-t3 uppercase tracking-wider font-semibold">Quantidade</label>
              <input type="number" value={oppCount} onChange={e => setOppCount(e.target.value)} min="1" placeholder="Ex: 8"
                className="mt-1 w-full bg-elevated border border-b1 rounded-lg px-3 py-2.5 text-center font-mono text-lg outline-none focus:border-vred/40" />
            </div>
            <button onClick={submitOpp}
              className="w-full bg-vgold/15 hover:bg-vgold/25 text-vgold border border-vgold/20 font-bold py-3 rounded-lg transition-colors">
              + Registrar Oportunidades
            </button>
          </div>
        </div>

        {/* Pending */}
        <div className="bg-surface border border-b1 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold">⏳ Pendentes ({pending.length})</h2>
          </div>
          {pending.length === 0 ? (
            <div className="text-center py-8 text-t3 text-sm">Sem oportunidades pendentes</div>
          ) : (
            <div className="space-y-3">
              {pending.map(o => (
                <div key={o.id} className="bg-elevated border border-vgold/15 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm">
                      <span className="font-semibold">{o.setterName}</span>
                      {o.founderName && <><span className="text-t4 mx-1">→</span><span className="font-semibold">{o.founderName}</span></>}
                    </div>
                    <span className="text-xs font-mono text-vgold bg-vgold/10 px-2 py-0.5 rounded-full">
                      {o.count} opps
                    </span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <input id={`resolve_${o.id}`} type="number" defaultValue={o.count} min="0"
                      className="w-20 bg-surface border border-b1 rounded-lg px-2 py-1.5 text-center font-mono text-sm outline-none focus:border-vred/40" />
                    <button onClick={() => resolveOpp(o.id)}
                      className="bg-vred text-white text-xs font-bold px-4 py-1.5 rounded-lg hover:bg-vred-dark transition-colors">
                      ✅ Confirmar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Conversion rates */}
      <div className="bg-surface border border-b1 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} className="text-vgold" />
          <h2 className="text-sm font-bold">Conversão por Etapa</h2>
        </div>
        <div className="space-y-4">
          {[
            { from: 'Gerada → Confirmada', rate: declared > 0 ? Math.round((confirmed / declared) * 100) : 0, color: 'bg-vblue' },
            { from: 'Confirmada → Venda', rate: confirmed > 0 ? Math.round((closed / confirmed) * 100) : 0, color: 'bg-vgreen' },
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
  );
}
