import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { KpiCard } from '../components/ui/KpiCard';
import { DollarSign, Target, TrendingUp } from 'lucide-react';
import { db, today, getMonthSales, getUsers, fmt$ } from '../lib/store';

export function VendasPage() {
  const [showForm, setShowForm] = useState(false);
  const [setup, setSetup] = useState('789');
  const [rec, setRec] = useState('297');
  const [setterId, setSetterId] = useState('');
  const [saved, setSaved] = useState('');

  const session = JSON.parse(localStorage.getItem('vantagem_session') || '{}');
  const users = getUsers().filter(u => u.active && u.role === 'Setter');
  const sales = getMonthSales();
  const mySales = sales.filter(s => s.sellerName === session.name);

  const totalSetupComm = mySales.reduce((t, s) => t + (s.sellerSetupComm || 0), 0);
  const totalRecComm = mySales.reduce((t, s) => t + (s.sellerRecComm || 0), 0);

  const handleSubmit = () => {
    const s = parseFloat(setup) || 0;
    const r = parseFloat(rec) || 0;
    if (!s || !r) return;

    const setter = users.find(u => u.id === setterId);
    const saleKey = `ops_sale_${today()}_${Date.now()}`;

    db.set(saleKey, {
      id: saleKey,
      date: today(),
      sellerId: session.name?.replace(/\s/g, '_').toLowerCase(),
      sellerName: session.name,
      sellerRole: session.role,
      setterId: setter?.id || null,
      setterName: setter?.name || null,
      setupValue: s,
      recValue: r,
      sellerSetupComm: Math.round(s * 0.5),
      sellerRecComm: Math.round(r * 0.4),
      setterSetupComm: setter ? Math.round(s * 0.05) : 0,
      setterRecComm: setter ? Math.round(r * 0.05) : 0,
      ts: Date.now(),
    });

    setSaved(`Venda salva! Comissão: ${fmt$(Math.round(s * 0.5 + r * 0.4))}`);
    setTimeout(() => { setSaved(''); setShowForm(false); }, 2000);
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vendas</h1>
          <p className="text-sm text-t3 mt-1">Registre vendas e acompanhe comissões</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-vgreen hover:bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-lg transition-colors"
        >
          {showForm ? <><X size={16} /> Fechar</> : <><Plus size={16} /> Nova Venda</>}
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard label="Vendas no Mês" value={mySales.length} icon={Target} color="gold" />
        <KpiCard label="Comissão Setup" value={fmt$(totalSetupComm)} icon={DollarSign} color="green" />
        <KpiCard label="Comissão Rec" value={fmt$(totalRecComm)} icon={TrendingUp} color="blue" />
      </div>

      {/* Sale form */}
      {showForm && (
        <div className="bg-surface border border-b1 rounded-xl p-6 animate-in">
          <h3 className="font-bold mb-4">Registrar Nova Venda</h3>
          {saved && (
            <div className="bg-vgreen/10 border border-vgreen/20 text-vgreen rounded-lg px-4 py-3 mb-4 text-sm font-medium">
              {saved}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-[11px] text-t3 uppercase tracking-wider font-semibold">Setup ($)</label>
              <input
                type="number" value={setup} onChange={e => setSetup(e.target.value)}
                className="mt-1 w-full bg-elevated border border-b1 rounded-lg px-3 py-2.5 font-mono text-center text-lg outline-none focus:border-vred/40"
              />
            </div>
            <div>
              <label className="text-[11px] text-t3 uppercase tracking-wider font-semibold">Rec/mês ($)</label>
              <input
                type="number" value={rec} onChange={e => setRec(e.target.value)}
                className="mt-1 w-full bg-elevated border border-b1 rounded-lg px-3 py-2.5 font-mono text-center text-lg outline-none focus:border-vred/40"
              />
            </div>
            <div>
              <label className="text-[11px] text-t3 uppercase tracking-wider font-semibold">Setter (opcional)</label>
              <select
                value={setterId} onChange={e => setSetterId(e.target.value)}
                className="mt-1 w-full bg-elevated border border-b1 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-vred/40 cursor-pointer"
              >
                <option value="">— Sem setter</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>
          {/* Preview */}
          <div className="bg-vgreen/8 border border-vgreen/20 rounded-lg p-4 mb-4">
            <div className="text-xs text-vgreen uppercase tracking-wider font-semibold mb-2">Comissão calculada</div>
            <div className="flex gap-6">
              <div>
                <div className="text-xs text-t3">Setup (50%)</div>
                <div className="font-mono font-bold text-vgreen">{fmt$(Math.round(parseFloat(setup || '0') * 0.5))}</div>
              </div>
              <div>
                <div className="text-xs text-t3">Rec (40%)</div>
                <div className="font-mono font-bold text-vgreen">{fmt$(Math.round(parseFloat(rec || '0') * 0.4))}/mês</div>
              </div>
            </div>
          </div>
          <button onClick={handleSubmit} className="bg-vgreen hover:bg-emerald-600 text-white font-bold px-6 py-3 rounded-lg w-full transition-colors">
            ✅ Confirmar Venda
          </button>
        </div>
      )}

      {/* Sales list */}
      <div className="bg-surface border border-b1 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-b1">
          <h2 className="text-[15px] font-bold">Vendas deste mês ({sales.length})</h2>
        </div>
        {sales.length ? (
          <div className="divide-y divide-b1">
            {sales.sort((a, b) => b.ts - a.ts).slice(0, 10).map(s => (
              <div key={s.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-elevated/50 transition-colors">
                <div className="flex-1">
                  <div className="text-sm font-semibold">{s.sellerName}</div>
                  <div className="text-xs text-t3 mt-0.5">
                    Setup {fmt$(s.setupValue)} · Rec {fmt$(s.recValue)}/mês
                    {s.setterName && <> · Setter: <span className="text-vpurp">{s.setterName}</span></>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-vgreen text-sm">{fmt$(s.sellerSetupComm + s.sellerRecComm)}</div>
                  <div className="text-[10px] text-t4 font-mono">{new Date(s.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-t3 text-sm">Nenhuma venda registrada este mês</div>
        )}
      </div>
    </div>
  );
}
