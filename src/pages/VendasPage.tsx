import { useState, useMemo } from 'react';
import { Plus, X, Pencil, Trash2, Download } from 'lucide-react';
import { KpiCard } from '../components/ui/KpiCard';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { DollarSign, Target, TrendingUp } from 'lucide-react';
import { db, today, getMonthSales, getUsers, getSession, fmt$, currentMonth, type SaleData } from '../lib/store';
import { awardSaleXp } from '../lib/xp';
import { checkAchievements } from '../lib/achievements';
import { showToast } from '../components/ui/Toast';
import { triggerConfetti } from '../components/ui/Confetti';
import { broadcastNotification } from '../lib/notifications';
import { playSale } from '../lib/sounds';
import { exportSalesCSV } from '../lib/export';
import { chartColors } from '../lib/theme';
import { roleVariant } from '../lib/roles';
import { getMonthMeetings, getMonthBonus, getMonthScheduled } from '../lib/bonus';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const MIN_SETUP = 97;
const MAX_SETUP = 2997;
const MIN_REC = 47;
const MAX_REC = 997;

const MEDALS = ['🥇', '🥈', '🥉'];

const ROLE_COLORS: Record<string, string> = {
  Founder: '#D4634B', Partner: '#8B7EC8', Vendedor: '#C8963E', Setter: '#6B8FBF', 'Social Seller': '#EC4899',
};

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
  const allUsers = getUsers().filter(u => u.active);
  const setterUsers = allUsers.filter(u => u.role === 'Setter' || u.role === 'Social Seller');
  const sales = getMonthSales(month);
  const mySales = isManager ? sales : sales.filter(s => s.sellerId === session.id || s.sellerName === session.name);

  // ── Analytics data (memoized) ──
  const analytics = useMemo(() => {
    const totalSetupComm = mySales.reduce((t, s) => t + (s.sellerSetupComm || 0), 0);
    const totalRecComm = mySales.reduce((t, s) => t + (s.sellerRecComm || 0), 0);
    const totalRevenue = mySales.reduce((t, s) => t + s.setupValue + s.recValue, 0);
    const ticketMedio = mySales.length > 0 ? Math.round(totalRevenue / mySales.length) : 0;

    // Previous month for trends
    const prevMonth = (() => { const d = new Date(month + '-01'); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 7); })();
    const prevSales = getMonthSales(prevMonth);
    const prevMySales = isManager ? prevSales : prevSales.filter(s => s.sellerId === session.id || s.sellerName === session.name);
    const prevRevenue = prevMySales.reduce((t, s) => t + s.setupValue + s.recValue, 0);
    const prevComm = prevMySales.reduce((t, s) => t + (s.sellerSetupComm || 0) + (s.sellerRecComm || 0), 0);
    const prevTicket = prevMySales.length > 0 ? Math.round(prevRevenue / prevMySales.length) : 0;

    const trendPct = (curr: number, prev: number) => prev > 0 ? Math.round(((curr - prev) / prev) * 100) : curr > 0 ? 100 : 0;

    // Sparkline: sales count per day (last 7 days)
    const spark = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      const ds = d.toISOString().slice(0, 10);
      return mySales.filter(s => s.date === ds).length;
    });

    // Sales by day of month (for bar chart)
    const daysInMonth = new Date(parseInt(month.slice(0, 4)), parseInt(month.slice(5, 7)), 0).getDate();
    const salesByDay = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dayStr = `${month}-${String(day).padStart(2, '0')}`;
      const daySales = mySales.filter(s => s.date === dayStr);
      return { day: String(day), vendas: daySales.length, receita: daySales.reduce((t, s) => t + s.setupValue + s.recValue, 0) };
    });

    // Revenue by role
    const revByRole: Record<string, number> = {};
    mySales.forEach(s => { revByRole[s.sellerRole] = (revByRole[s.sellerRole] || 0) + s.setupValue + s.recValue; });
    const revByRoleSorted = Object.entries(revByRole).sort((a, b) => b[1] - a[1]);
    const totalRevByRole = revByRoleSorted.reduce((t, [, v]) => t + v, 0);

    // Top 5 sellers
    const sellerMap: Record<string, { id: string; name: string; role: string; comm: number; cnt: number }> = {};
    mySales.forEach(s => {
      if (!sellerMap[s.sellerId]) sellerMap[s.sellerId] = { id: s.sellerId, name: s.sellerName, role: s.sellerRole, comm: 0, cnt: 0 };
      sellerMap[s.sellerId].comm += (s.sellerSetupComm || 0) + (s.sellerRecComm || 0);
      sellerMap[s.sellerId].cnt++;
    });
    const topSellers = Object.values(sellerMap).sort((a, b) => b.comm - a.comm).slice(0, 5);

    // Setter pipeline (manager only)
    const setterPipeline = setterUsers.map(u => {
      const scheduled = getMonthScheduled(u.id, month);
      const realized = getMonthMeetings(u.id, month);
      const salesClosed = sales.filter(s => s.setterId === u.id).length;
      const bonus = getMonthBonus(u.id, month);
      return { id: u.id, name: u.name, role: u.role, scheduled, realized, salesClosed, bonus: bonus.bonus };
    }).filter(p => p.scheduled > 0 || p.realized > 0 || p.salesClosed > 0).sort((a, b) => b.realized - a.realized);

    return {
      totalSetupComm, totalRecComm, totalRevenue, ticketMedio,
      trendSales: trendPct(mySales.length, prevMySales.length),
      trendRevenue: trendPct(totalRevenue, prevRevenue),
      trendComm: trendPct(totalSetupComm + totalRecComm, prevComm),
      trendTicket: trendPct(ticketMedio, prevTicket),
      spark, salesByDay, revByRoleSorted, totalRevByRole, topSellers, setterPipeline,
    };
  }, [mySales, sales, month, isManager, session.id, setterUsers]);

  // ── Form logic (unchanged) ──
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
    const setter = setterUsers.find(u => u.id === setterId);
    const saleKey = editingId || `ops_sale_${today()}_${Date.now()}`;
    const saleData: SaleData = {
      id: saleKey,
      date: editingId ? (db.get<SaleData>(editingId)?.date || today()) : today(),
      sellerId: session.id || session.name?.replace(/\s/g, '_').toLowerCase(),
      sellerName: session.name,
      sellerRole: session.role,
      setterId: setter?.id,
      setterName: setter?.name,
      setupValue: s, recValue: r,
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
      broadcastNotification({ type: 'sale', title: `${session.name} fechou uma venda!`, detail: `Setup $${s} + Rec $${r}/mes`, icon: '💰' }, session.id);
      const newAch = checkAchievements();
      for (const ach of newAch) setTimeout(() => showToast('achievement', `${ach.icon} ${ach.name}`, ach.description), 500);
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
    setSetup('789'); setRec('297'); setSetterId(''); setEditingId(null);
    setShowForm(!showForm);
  };

  const canEditSale = (sale: SaleData) =>
    isManager || sale.sellerId === session.id || sale.sellerName === session.name;

  const cc = chartColors();

  return (
    <div className="space-y-4 animate-in" key={refreshKey}>
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg font-bold">Vendas</h1>
          <p className="text-sm text-t3 mt-1">Analytics de vendas e comissoes</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={month} onChange={e => setMonth(e.target.value)}
            className="bg-elevated border border-b1 rounded-lg px-4 py-2.5 text-sm font-mono outline-none cursor-pointer">
            {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <button onClick={() => exportSalesCSV(month)} className="flex items-center gap-1.5 bg-elevated border border-b1 rounded-lg px-4 py-2.5 text-sm text-t3 hover:text-t1 hover:border-b3 transition-colors">
            <Download size={14} /> CSV
          </button>
          <button onClick={openNewForm}
            className="flex items-center gap-2 bg-vgreen hover:bg-emerald-600 text-white font-bold px-3 py-2 rounded-lg transition-colors">
            {showForm ? <><X size={16} /> Fechar</> : <><Plus size={16} /> Nova Venda</>}
          </button>
        </div>
      </div>

      {/* ── KPIs with trends ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Vendas no Mes" value={mySales.length} icon={Target} color="gold"
          trend={analytics.trendSales} trendLabel="vs mes anterior" sparkData={analytics.spark} />
        <KpiCard label="Receita Total" value={fmt$(analytics.totalRevenue)} icon={DollarSign} color="green"
          trend={analytics.trendRevenue} trendLabel="vs mes anterior" />
        <KpiCard label="Ticket Medio" value={analytics.ticketMedio > 0 ? fmt$(analytics.ticketMedio) : '$0'} icon={TrendingUp} color="red"
          trend={analytics.trendTicket} trendLabel="vs mes anterior" />
        <KpiCard label="Comissao Total" value={fmt$(analytics.totalSetupComm + analytics.totalRecComm)} icon={TrendingUp} color="blue"
          trend={analytics.trendComm} trendLabel="vs mes anterior" />
      </div>

      {/* ── Charts: Vendas/dia + Receita por role ── */}
      {mySales.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Sales per day */}
          <div className="bg-surface border border-b1 rounded-lg p-4">
            <h2 className="text-xs font-bold text-t3 uppercase tracking-wider mb-3">Vendas por dia</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={analytics.salesByDay}>
                <CartesianGrid strokeDasharray="1 1" stroke={cc.grid} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: cc.tick }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: cc.tick }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: cc.tooltipBg, border: cc.tooltipBorder, borderRadius: 4, fontSize: 11 }}
                  labelStyle={{ color: cc.tooltipLabel }}
                  formatter={(value: unknown) => [`${value} venda(s)`, 'Qtd']}
                  labelFormatter={(label) => `Dia ${label}`}
                />
                <Bar dataKey="vendas" fill={cc.green} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue by role */}
          <div className="bg-surface border border-b1 rounded-lg p-4">
            <h2 className="text-xs font-bold text-t3 uppercase tracking-wider mb-3">Receita por tipo</h2>
            {analytics.revByRoleSorted.length > 0 ? (
              <div className="space-y-3">
                {analytics.revByRoleSorted.map(([role, rev]) => {
                  const pct = analytics.totalRevByRole > 0 ? Math.round((rev / analytics.totalRevByRole) * 100) : 0;
                  return (
                    <div key={role}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={roleVariant(role)}>{role}</Badge>
                          <span className="text-xs text-t3">{pct}%</span>
                        </div>
                        <span className="font-mono font-bold text-sm">{fmt$(rev)}</span>
                      </div>
                      <div className="h-3 bg-overlay rounded-sm overflow-hidden">
                        <div className="h-full rounded-sm transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: ROLE_COLORS[role] || cc.gold }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-t4 text-sm">Sem dados</div>
            )}
          </div>
        </div>
      )}

      {/* ── Top Sellers ── */}
      {analytics.topSellers.length > 0 && (
        <div className="bg-surface border border-b1 rounded-lg p-4">
          <h2 className="text-xs font-bold text-t3 uppercase tracking-wider mb-3">Top Vendedores do Mes</h2>
          <div className="space-y-2">
            {analytics.topSellers.map((seller, i) => {
              const maxComm = analytics.topSellers[0]?.comm || 1;
              return (
                <div key={seller.id} className={`flex items-center gap-3 p-2 rounded-lg ${i === 0 ? 'bg-vgold/5' : ''}`}>
                  <span className="w-6 text-center" style={{ fontSize: i < 3 ? '18px' : '12px' }}>
                    {MEDALS[i] || <span className="text-t4 font-mono">#{i + 1}</span>}
                  </span>
                  <Avatar userId={seller.id} name={seller.name} size="w-8 h-8" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold truncate">{seller.name}</span>
                      <Badge variant={roleVariant(seller.role)}>{seller.role}</Badge>
                    </div>
                    <div className="h-1.5 bg-overlay rounded-sm overflow-hidden mt-1">
                      <div className="h-full bg-vgreen rounded-sm transition-all duration-500" style={{ width: `${Math.round((seller.comm / maxComm) * 100)}%` }} />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono font-bold text-vgreen text-sm">{fmt$(seller.comm)}</div>
                    <div className="text-2xs text-t4">{seller.cnt} venda(s)</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Setter Pipeline Funnel (manager only) ── */}
      {isManager && analytics.setterPipeline.length > 0 && (
        <div className="bg-surface border border-b1 rounded-lg p-4">
          <h2 className="text-xs font-bold text-t3 uppercase tracking-wider mb-1">Pipeline Setter — Agendamento → Venda</h2>
          <p className="text-2xs text-t4 mb-3">Reunioes agendadas → realizadas → vendas fechadas → bonus</p>
          <div className="space-y-2">
            {analytics.setterPipeline.map(p => {
              const maxVal = Math.max(p.scheduled, p.realized, 1);
              const convRate = p.scheduled > 0 ? Math.round((p.realized / p.scheduled) * 100) : 0;
              const closeRate = p.realized > 0 ? Math.round((p.salesClosed / p.realized) * 100) : 0;
              return (
                <div key={p.id} className="bg-elevated/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar userId={p.id} name={p.name} size="w-6 h-6" />
                    <span className="text-xs font-bold">{p.name}</span>
                    <Badge variant={roleVariant(p.role)}>{p.role}</Badge>
                    {p.bonus > 0 && <span className="text-2xs font-mono text-vgold ml-auto">${p.bonus} bonus</span>}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-2xs text-t3 w-20">Agendadas</span>
                      <div className="flex-1 h-4 bg-overlay rounded-sm overflow-hidden relative">
                        <div className="h-full bg-vblue/60 rounded-sm" style={{ width: `${Math.round((p.scheduled / maxVal) * 100)}%` }} />
                        <span className="absolute inset-0 flex items-center px-2 text-2xs font-mono font-bold text-t1">{p.scheduled}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xs text-t3 w-20">Realizadas</span>
                      <div className="flex-1 h-4 bg-overlay rounded-sm overflow-hidden relative">
                        <div className="h-full bg-vpurp/60 rounded-sm" style={{ width: `${Math.round((p.realized / maxVal) * 100)}%` }} />
                        <span className="absolute inset-0 flex items-center px-2 text-2xs font-mono font-bold text-t1">{p.realized}</span>
                      </div>
                      <span className="text-2xs text-t4 w-10 text-right">{convRate}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xs text-t3 w-20">Vendas</span>
                      <div className="flex-1 h-4 bg-overlay rounded-sm overflow-hidden relative">
                        <div className="h-full bg-vgreen/60 rounded-sm" style={{ width: `${Math.round((p.salesClosed / maxVal) * 100)}%` }} />
                        <span className="absolute inset-0 flex items-center px-2 text-2xs font-mono font-bold text-t1">{p.salesClosed}</span>
                      </div>
                      <span className="text-2xs text-t4 w-10 text-right">{closeRate}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Setter → Closer flow (existing, cleaned up) ── */}
      {isManager && sales.length > 0 && (() => {
        const pairs: Record<string, { setter: string; founders: Record<string, { name: string; count: number; comm: number }> }> = {};
        let directSales = 0;
        sales.forEach(s => {
          if (s.setterName && s.setterId) {
            if (!pairs[s.setterId]) pairs[s.setterId] = { setter: s.setterName, founders: {} };
            const fid = s.sellerId || s.sellerName;
            if (!pairs[s.setterId].founders[fid]) pairs[s.setterId].founders[fid] = { name: s.sellerName, count: 0, comm: 0 };
            pairs[s.setterId].founders[fid].count++;
            pairs[s.setterId].founders[fid].comm += (s.sellerSetupComm || 0) + (s.sellerRecComm || 0);
          } else { directSales++; }
        });
        const pairEntries = Object.entries(pairs).sort((a, b) => {
          const totalA = Object.values(a[1].founders).reduce((t, f) => t + f.count, 0);
          const totalB = Object.values(b[1].founders).reduce((t, f) => t + f.count, 0);
          return totalB - totalA;
        });
        if (pairEntries.length === 0) return null;
        return (
          <div className="bg-surface border border-b1 rounded-lg p-4">
            <h2 className="text-xs font-bold text-t3 uppercase tracking-wider mb-3">Setter → Closer — Quem originou, quem fechou</h2>
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
                              <span className="absolute inset-0 flex items-center justify-center text-2xs font-mono font-bold text-t1">{f.count} ({pct}%)</span>
                            </div>
                            <span className="text-2xs font-mono text-vgreen w-14 text-right">{fmt$(f.comm)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {directSales > 0 && <div className="text-2xs text-t4 text-center mt-1">+ {directSales} venda(s) direta(s) sem setter</div>}
            </div>
          </div>
        );
      })()}

      {/* ── Sale form ── */}
      {showForm && (
        <div className="bg-surface border border-b1 rounded-lg p-4 animate-in">
          <h3 className="font-bold mb-4">{editingId ? 'Editar Venda' : 'Registrar Nova Venda'}</h3>
          {saved && (
            <div className="bg-vgreen/10 border border-vgreen/20 text-vgreen rounded-lg px-4 py-3 mb-4 text-sm font-medium">{saved}</div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-xs text-t3 uppercase tracking-wider font-semibold">Setup ($) <span className="text-t4 normal-case">({MIN_SETUP}-{MAX_SETUP})</span></label>
              <input type="number" min={MIN_SETUP} max={MAX_SETUP} value={setup} onChange={e => setSetup(e.target.value)}
                className="mt-1 w-full bg-elevated border border-b1 rounded-lg px-3 py-2.5 font-mono text-center text-lg outline-none focus:border-vred/40" />
            </div>
            <div>
              <label className="text-xs text-t3 uppercase tracking-wider font-semibold">Rec/mes ($) <span className="text-t4 normal-case">({MIN_REC}-{MAX_REC})</span></label>
              <input type="number" min={MIN_REC} max={MAX_REC} value={rec} onChange={e => setRec(e.target.value)}
                className="mt-1 w-full bg-elevated border border-b1 rounded-lg px-3 py-2.5 font-mono text-center text-lg outline-none focus:border-vred/40" />
            </div>
            <div>
              <label className="text-xs text-t3 uppercase tracking-wider font-semibold">Setter (opcional)</label>
              <select value={setterId} onChange={e => setSetterId(e.target.value)}
                className="mt-1 w-full bg-elevated border border-b1 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-vred/40 cursor-pointer">
                <option value="">— Sem setter</option>
                {setterUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>
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
          <button onClick={handleSubmit} className="bg-vgreen hover:bg-emerald-600 text-white font-bold px-4 py-2.5 rounded-lg w-full transition-colors">
            {editingId ? '💾 Salvar Alteracoes' : '✅ Confirmar Venda'}
          </button>
        </div>
      )}

      {/* ── Sales list ── */}
      <div className="bg-surface border border-b1 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-b1 flex items-center justify-between">
          <h2 className="text-xs font-bold">Vendas deste mes ({sales.length})</h2>
        </div>
        {sales.length ? (
          <div className="divide-y divide-b1">
            {sales.sort((a, b) => b.ts - a.ts).slice(0, 20).map(s => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-elevated/30 transition-colors">
                <Avatar userId={s.sellerId} name={s.sellerName} size="w-8 h-8" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{s.sellerName}</div>
                  <div className="text-xs text-t3 mt-0.5">
                    Setup {fmt$(s.setupValue)} · Rec {fmt$(s.recValue)}/mes
                    {s.setterName && <> · Setter: <span className="text-vpurp">{s.setterName}</span></>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono font-bold text-vgreen text-sm">{fmt$(s.sellerSetupComm + s.sellerRecComm)}</div>
                  <div className="text-2xs text-t4 font-mono">{new Date(s.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
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
