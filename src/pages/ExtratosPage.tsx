import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getUsers, getMonthSales, currentMonth, fmt$ } from '../lib/store';
import { getTotalFichas } from '../lib/xp';
import { getMonthBonus } from '../lib/bonus';
import { Badge } from '../components/ui/Badge';
import { KpiCard } from '../components/ui/KpiCard';
import { DollarSign, BarChart3, Download } from 'lucide-react';
import { exportCommissionsCSV, exportSalesCSV } from '../lib/export';
import { roleVariant } from '../lib/roles';
import { CardBase } from '../components/ui/CardBase';

export function ExtratosPage() {
  const [uid, setUid] = useState('all');
  const [ym, setYm] = useState(currentMonth());

  const users = getUsers().filter(u => u.active);
  const sales = getMonthSales(ym);

  // Aggregate per user
  const totals: Record<string, { userId: string; name: string; role: string; su: number; re: number; cnt: number }> = {};
  sales.forEach(s => {
    const id = s.sellerName;
    if (!totals[id]) totals[id] = { userId: s.sellerId, name: s.sellerName, role: s.sellerRole, su: 0, re: 0, cnt: 0 };
    totals[id].su += s.sellerSetupComm || 0;
    totals[id].re += s.sellerRecComm || 0;
    totals[id].cnt++;
  });
  const sorted = Object.values(totals).sort((a, b) => (b.su + b.re) - (a.su + a.re));
  const grandTotal = sorted.reduce((t, r) => t + r.su + r.re, 0);

  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    return { value: d.toISOString().slice(0, 7), label: d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) };
  });

  const filtered = uid === 'all' ? sorted : sorted.filter(r => r.name === uid);

  return (
    <div className="space-y-5 animate-in">
      <div>
        <h1 className="text-lg font-bold">Extratos</h1>
        <p className="text-sm text-t3 mt-1">Comissões detalhadas por membro</p>
      </div>

      {/* Filters + Export */}
      <div className="flex gap-3 flex-wrap items-center">
        <select value={uid} onChange={e => setUid(e.target.value)}
          className="bg-elevated border border-b1 rounded-lg px-4 py-2.5 text-sm outline-none cursor-pointer">
          <option value="all">Todos</option>
          {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
        </select>
        <select value={ym} onChange={e => setYm(e.target.value)}
          className="bg-elevated border border-b1 rounded-lg px-4 py-2.5 text-sm outline-none cursor-pointer">
          {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <button onClick={() => exportCommissionsCSV(ym)} className="flex items-center gap-1.5 bg-elevated border border-b1 rounded-lg px-4 py-2.5 text-sm text-t3 hover:text-t1 hover:border-b3 transition-colors">
          <Download size={14} /> Exportar CSV
        </button>
        <button onClick={() => exportSalesCSV(ym)} className="flex items-center gap-1.5 bg-elevated border border-b1 rounded-lg px-4 py-2.5 text-sm text-t3 hover:text-t1 hover:border-b3 transition-colors">
          <Download size={14} /> Vendas CSV
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard label="Vendas Período" value={sales.length} icon={BarChart3} color="gold" />
        <KpiCard label="Comissões Totais" value={fmt$(grandTotal)} icon={DollarSign} color="green" highlight />
        <KpiCard label="Membros com Venda" value={sorted.length} color="blue" />
      </div>

      {/* Table */}
      <CardBase padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" aria-label="Comissoes por membro">
            <thead>
              <tr className="bg-elevated/30">
                {['Membro', 'Funcao', 'Vendas', 'C. Setup', 'C. Rec', '🪙 Fichas', 'Bonus', 'Total'].map(h => (
                  <th key={h} className="text-left text-2xs text-t4 uppercase tracking-wider font-semibold px-3 py-1">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-b1">
              {filtered.map(r => (
                <tr key={r.name} className="hover:bg-elevated/30 transition-colors">
                  <td className="px-3 py-1.5 font-semibold text-sm"><Link to={`/perfil/${r.userId}`} className="hover:text-vred transition-colors">{r.name}</Link></td>
                  <td className="px-3 py-1.5"><Badge variant={roleVariant(r.role)}>{r.role}</Badge></td>
                  <td className="px-3 py-1.5 font-mono text-sm">{r.cnt}</td>
                  <td className="px-3 py-1.5 font-mono text-sm text-vgreen">{fmt$(r.su)}</td>
                  <td className="px-3 py-1.5 font-mono text-sm text-vgold">{fmt$(r.re)}</td>
                  <td className="px-3 py-1.5 font-mono text-sm text-vpurp">{getTotalFichas(r.userId).toLocaleString()}</td>
                  <td className="px-3 py-1.5 font-mono text-sm text-orange-400">${getMonthBonus(r.userId).bonus}</td>
                  <td className="px-3 py-1.5 font-mono text-sm font-bold text-vred">{fmt$(r.su + r.re)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-t3 text-sm">Sem dados no período</td></tr>
              )}
              {filtered.length > 0 && (
                <tr className="bg-elevated/30">
                  <td colSpan={3} className="px-3 py-1 font-bold text-sm">TOTAL</td>
                  <td className="px-3 py-1 font-mono font-bold text-vgreen">{fmt$(filtered.reduce((t, r) => t + r.su, 0))}</td>
                  <td className="px-3 py-1 font-mono font-bold text-vgold">{fmt$(filtered.reduce((t, r) => t + r.re, 0))}</td>
                  <td className="px-3 py-1 font-mono font-bold text-vpurp">{filtered.reduce((t, r) => t + getTotalFichas(r.userId), 0).toLocaleString()}</td>
                  <td className="px-3 py-1 font-mono font-bold text-orange-400">${filtered.reduce((t, r) => t + getMonthBonus(r.userId).bonus, 0)}</td>
                  <td className="px-3 py-1 font-mono font-bold text-vred">{fmt$(filtered.reduce((t, r) => t + r.su + r.re, 0))}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardBase>
    </div>
  );
}
