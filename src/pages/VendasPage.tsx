import { useState } from 'react';
import { Plus, X, Pencil, Trash2, Download } from 'lucide-react';
import { KpiCard } from '../components/ui/KpiCard';
import { DollarSign, Target, TrendingUp } from 'lucide-react';
import { db, today, getMonthSales, getUsers, getSession, fmt$, currentMonth, type SaleData } from '../lib/store';
import { awardSaleXp } from '../lib/xp';
import { checkAchievements } from '../lib/achievements';
import { showToast } from '../components/ui/Toast';
import { triggerConfetti } from '../components/ui/Confetti';
import { broadcastNotification } from '../lib/notifications';
import { playSale } from '../lib/sounds';
import { exportSalesCSV } from '../lib/export';

const MIN_SETUP = 97;
const MAX_SETUP = 2997;
const MIN_REC = 47;
const MAX_REC = 997;

export function VendasPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [setup, setSetup] = useState('789');
  const [rec, setRec] = useState('297');
  const [setterId, setSetterId] = useState('');
  const [saved, setSaved] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [month, setMonth] = useState(currentMonth());

  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    return { value: d.toISOString().slice(0, 7), label: d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) };
  });

  const session = getSession() || { id: 'anon', name: 'Anon', role: 'Setter', email: '' };
  const isManager = session.role === 'Head' || session.role === 'Founder' || session.role === 'Partner';
  const users = getUsers().filter(u => u.active && u.role === 'Setter');
  const sales = getMonthSales(month);
  const mySales = isManager ? sales : sales.filter(s => s.sellerId === session.id || s.sellerName === session.name);

  const totalSetupComm = mySales.reduce((t, s) => t + (s.sellerSetupComm || 0), 0);
  const totalRecComm = mySales.reduce((t, s) => t + (s.sellerRecComm || 0), 0);

  const validate = (): string | null => {
    const s = parseFloat(setup) || 0;
    const r = parseFloat(rec) || 0;
    if (s < MIN_SETUP || s > MAX_SETUP) return `Setup deve ser entre $${MIN_SETUP} e $${MAX_SETUP}`;
    if (r < MIN_REC || r > MAX_REC) return `Rec deve ser entre $${MIN_REC} e $${MAX_REC}`;
    return null;
  };

  const handleSubmit = () => {
    const err = validate();
    if (err) { showToast('error', err); return; }

    const s = parseFloat(setup) || 0;
    const r = parseFloat(rec) || 0;
    const setter = users.find(u => u.id === setterId);
    const saleKey = editingId || `ops_sale_${today()}_${Date.now()}`;

    const saleData: SaleData = {
      id: saleKey,
      date: editingId ? (db.get<SaleData>(editingId)?.date || today()) : today(),
      sellerId: session.id || session.name?.replace(/\s/g, '_').toLowerCase(),
      sellerName: session.name,
      sellerRole: session.role,
      setterId: setter?.id,
      setterName: setter?.name,
      setupValue: s,
      recValue: r,
      sellerSetupComm: Math.round(s * 0.5),
      sellerRecComm: Math.round(r * 0.4),
      setterSetupComm: setter ? Math.round(s * 0.05) : 0,
      setterRecComm: setter ? Math.round(r * 0.05) : 0,
      ts: editingId ? (db.get<SaleData>(editingId)?.ts || Date.now()) : Date.now(),
    };

    db.set(saleKey, saleData);

    if (!editingId) {
      const xpGained = awardSaleXp();
      showToast('xp', `+${xpGained} Fichas`, 'Venda registrada!');
      triggerConfetti();
      playSale();
      broadcastNotification({
        type: 'sale', title: `${session.name} fechou uma venda!`,
        detail: `Setup $${s} + Rec $${r}/mes`, icon: '💰'
      }, session.id);
      const newAch = checkAchievements();
      for (const ach of newAch) {
        setTimeout(() => showToast('achievement', `${ach.icon} ${ach.name}`, ach.description), 500);
      }
      document.dispatchEvent(new Event('xp-update'));
    } else {
      showToast('success', 'Venda atualizada');
    }

    setSaved(editingId ? 'Venda atualizada!' : `Venda salva! Comissao: ${fmt$(Math.round(s * 0.5 + r * 0.4))}`);
    setEditingId(null);
    setRefreshKey(k => k + 1);
    setTimeout(() => { setSaved(''); setShowForm(false); }, 2000);
  };

  const handleEdit = (sale: SaleData) => {
    setSetup(sale.setupValue.toString());
    setRec(sale.recValue.toString());
    setSetterId(sale.setterId || '');
    setEditingId(sale.id);
    setShowForm(true);
  };

  const handleDelete = (sale: SaleData) => {
    if (!confirm(`Deletar venda de ${fmt$(sale.setupValue)}? Esta acao nao pode ser desfeita.`)) return;
    db.remove(sale.id);
    setRefreshKey(k => k + 1);
    showToast('info', 'Venda removida');
  };

  const openNewForm = () => {
    setSetup('789');
    setRec('297');
    setSetterId('');
    setEditingId(null);
    setShowForm(!showForm);
  };

  const canEditSale = (sale: SaleData) =>
    isManager || sale.sellerId === session.id || sale.sellerName === session.name;

  return (
    <div className="space-y-4 animate-in" key={refreshKey}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Vendas</h1>
          <p className="text-sm text-t3 mt-1">Registre vendas e acompanhe comissoes</p>
        </div>
        <div className="flex items-center gap-2">
        <select value={month} onChange={e => setMonth(e.target.value)}
          className="bg-elevated border border-b1 rounded-lg px-3 py-2.5 text-sm font-mono outline-none cursor-pointer">
          {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <button onClick={() => exportSalesCSV(month)} className="flex items-center gap-1.5 bg-elevated border border-b1 rounded-lg px-3 py-2.5 text-sm text-t3 hover:text-t1 hover:border-b3 transition-colors">
          <Download size={14} /> CSV
        </button>
        <button
          onClick={openNewForm}
          className="flex items-center gap-2 bg-vgreen hover:bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-lg transition-colors"
        >
          {showForm ? <><X size={16} /> Fechar</> : <><Plus size={16} /> Nova Venda</>}
        </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Vendas no Mes" value={mySales.length} icon={Target} color="gold" />
        <KpiCard label="Comissao Setup" value={fmt$(totalSetupComm)} icon={DollarSign} color="green" />
        <KpiCard label="Comissao Rec" value={fmt$(totalRecComm)} icon={TrendingUp} color="blue" />
        <KpiCard label="Ticket Medio" value={mySales.length > 0 ? fmt$(Math.round(mySales.reduce((t, s) => t + s.setupValue, 0) / mySales.length)) : '$0'} icon={TrendingUp} color="red" />
      </div>

      {/* Analytics: Setter → Founder flow */}
      {isManager && sales.length > 0 && (() => {
        // Build setter→founder pairs
        const pairs: Record<string, { setter: string; founders: Record<string, { name: string; count: number; comm: number }> }> = {};
        let directSales = 0;
        sales.forEach(s => {
          if (s.setterName && s.setterId) {
            if (!pairs[s.setterId]) pairs[s.setterId] = { setter: s.setterName, founders: {} };
            const fid = s.sellerId || s.sellerName;
            if (!pairs[s.setterId].founders[fid]) pairs[s.setterId].founders[fid] = { name: s.sellerName, count: 0, comm: 0 };
            pairs[s.setterId].founders[fid].count++;
            pairs[s.setterId].founders[fid].comm += (s.sellerSetupComm || 0) + (s.sellerRecComm || 0);
          } else {
            directSales++;
          }
        });
        const pairEntries = Object.entries(pairs).sort((a, b) => {
          const totalA = Object.values(a[1].founders).reduce((t, f) => t + f.count, 0);
          const totalB = Object.values(b[1].founders).reduce((t, f) => t + f.count, 0);
          return totalB - totalA;
        });
        if (pairEntries.length === 0) return null;

        return (
          <div className="bg-surface border border-b1 rounded-lg p-4">
            <div className="text-[11px] font-bold text-t3 uppercase tracking-wider mb-3">
              Setter → Closer — Quem originou, quem fechou
            </div>
            <div className="space-y-3">
              {pairEntries.map(([sid, data]) => {
                const totalFromSetter = Object.values(data.founders).reduce((t, f) => t + f.count, 0);
                const foundersSorted = Object.values(data.founders).sort((a, b) => b.count - a.count);
                return (
                  <div key={sid} className="bg-elevated/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-vpurp text-xs font-bold">📞 {data.setter}</span>
                      <span className="text-t4 text-xs">→ {totalFromSetter} vendas originadas</span>
                    </div>
                    <div className="space-y-1">
                      {foundersSorted.map(f => {
                        const pct = totalFromSetter > 0 ? Math.round((f.count / totalFromSetter) * 100) : 0;
                        return (
                          <div key={f.name} className="flex items-center gap-2">
                            <span className="text-xs text-t2 w-28 truncate">{f.name}</span>
                            <div className="flex-1 h-4 bg-overlay rounded-sm overflow-hidden relative">
                              <div className="h-full bg-vgreen/60 rounded-sm transition-all" style={{ width: `${pct}%` }} />
                              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-mono font-bold text-t1">{f.count} ({pct}%)</span>
                            </div>
                            <span className="text-[10px] font-mono text-vgreen w-14 text-right">{fmt$(f.comm)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {directSales > 0 && (
                <div className="text-[10px] text-t4 text-center mt-1">
                  + {directSales} venda(s) direta(s) sem setter
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Sale form */}
      {showForm && (
        <div className="bg-surface border border-b1 rounded-lg p-4 animate-in">
          <h3 className="font-bold mb-4">{editingId ? 'Editar Venda' : 'Registrar Nova Venda'}</h3>
          {saved && (
            <div className="bg-vgreen/10 border border-vgreen/20 text-vgreen rounded-lg px-4 py-3 mb-4 text-sm font-medium">
              {saved}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-[11px] text-t3 uppercase tracking-wider font-semibold">Setup ($) <span className="text-t4 normal-case">({MIN_SETUP}-{MAX_SETUP})</span></label>
              <input
                type="number" min={MIN_SETUP} max={MAX_SETUP} value={setup} onChange={e => setSetup(e.target.value)}
                className="mt-1 w-full bg-elevated border border-b1 rounded-lg px-3 py-2.5 font-mono text-center text-lg outline-none focus:border-vred/40"
              />
            </div>
            <div>
              <label className="text-[11px] text-t3 uppercase tracking-wider font-semibold">Rec/mes ($) <span className="text-t4 normal-case">({MIN_REC}-{MAX_REC})</span></label>
              <input
                type="number" min={MIN_REC} max={MAX_REC} value={rec} onChange={e => setRec(e.target.value)}
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
            <div className="text-xs text-vgreen uppercase tracking-wider font-semibold mb-2">Comissao calculada</div>
            <div className="flex gap-4">
              <div>
                <div className="text-xs text-t3">Setup (50%)</div>
                <div className="font-mono font-bold text-vgreen">{fmt$(Math.round(parseFloat(setup || '0') * 0.5))}</div>
              </div>
              <div>
                <div className="text-xs text-t3">Rec (40%)</div>
                <div className="font-mono font-bold text-vgreen">{fmt$(Math.round(parseFloat(rec || '0') * 0.4))}/mes</div>
              </div>
            </div>
          </div>
          <button onClick={handleSubmit} className="bg-vgreen hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-lg w-full transition-colors">
            {editingId ? '💾 Salvar Alteracoes' : '✅ Confirmar Venda'}
          </button>
        </div>
      )}

      {/* Sales list */}
      <div className="bg-surface border border-b1 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-b1">
          <h2 className="text-[12px] font-bold">Vendas deste mes ({sales.length})</h2>
        </div>
        {sales.length ? (
          <div className="divide-y divide-b1">
            {sales.sort((a, b) => b.ts - a.ts).slice(0, 20).map(s => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-elevated/30 transition-colors">
                {(() => {
                  const av = localStorage.getItem(`vantagem_avatar_${s.sellerId}`);
                  const ini = s.sellerName.split(' ').map(n => n[0]).join('').slice(0, 2);
                  return av ? <img src={av} alt="" className="w-8 h-8 rounded-full object-cover border border-b1 shrink-0" /> : <div className="w-8 h-8 rounded-full bg-gradient-to-br from-vred to-vred-dark flex items-center justify-center text-white text-[9px] font-bold shrink-0">{ini}</div>;
                })()}
                <div className="flex-1">
                  <div className="text-sm font-semibold">{s.sellerName}</div>
                  <div className="text-xs text-t3 mt-0.5">
                    Setup {fmt$(s.setupValue)} · Rec {fmt$(s.recValue)}/mes
                    {s.setterName && <> · Setter: <span className="text-vpurp">{s.setterName}</span></>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-vgreen text-sm">{fmt$(s.sellerSetupComm + s.sellerRecComm)}</div>
                  <div className="text-[10px] text-t4 font-mono">{new Date(s.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                {canEditSale(s) && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleEdit(s)} className="p-1.5 text-t4 hover:text-vblue transition-colors" title="Editar">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => handleDelete(s)} className="p-1.5 text-t4 hover:text-vred transition-colors" title="Deletar">
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-t3 text-sm">Nenhuma venda registrada este mes</div>
        )}
      </div>
    </div>
  );
}
