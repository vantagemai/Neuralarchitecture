import { getMonthSales, getTodayFills, getUsers } from './store';

function escapeCSV(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function downloadCSV(filename: string, csv: string): void {
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportSalesCSV(ym?: string): void {
  const sales = getMonthSales(ym);
  const headers = ['Data', 'Vendedor', 'Funcao', 'Setup ($)', 'Rec ($)', 'Comissao Setup', 'Comissao Rec', 'Total Comissao', 'Setter'];
  const rows = sales.sort((a, b) => b.ts - a.ts).map(s => [
    s.date,
    escapeCSV(s.sellerName),
    s.sellerRole,
    s.setupValue.toString(),
    s.recValue.toString(),
    s.sellerSetupComm.toString(),
    s.sellerRecComm.toString(),
    (s.sellerSetupComm + s.sellerRecComm).toString(),
    s.setterName || '',
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadCSV(`vendas_${ym || 'all'}.csv`, csv);
}

export function exportCommissionsCSV(ym?: string): void {
  const sales = getMonthSales(ym);
  const totals: Record<string, { name: string; role: string; su: number; re: number; cnt: number }> = {};
  sales.forEach(s => {
    const id = s.sellerName;
    if (!totals[id]) totals[id] = { name: s.sellerName, role: s.sellerRole, su: 0, re: 0, cnt: 0 };
    totals[id].su += s.sellerSetupComm || 0;
    totals[id].re += s.sellerRecComm || 0;
    totals[id].cnt++;
  });
  const sorted = Object.values(totals).sort((a, b) => (b.su + b.re) - (a.su + a.re));
  const headers = ['Membro', 'Funcao', 'Vendas', 'Comissao Setup', 'Comissao Rec', 'Total'];
  const rows = sorted.map(r => [
    escapeCSV(r.name), r.role, r.cnt.toString(),
    r.su.toString(), r.re.toString(), (r.su + r.re).toString(),
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadCSV(`comissoes_${ym || 'all'}.csv`, csv);
}

export function exportFillsCSV(): void {
  const fills = getTodayFills();
  const headers = ['Usuario', 'Funcao', 'Score', 'Observacao', 'Horario'];
  const rows = fills.map(f => [
    escapeCSV(f.userName),
    f.userRole,
    f.score.toString(),
    escapeCSV(f.obs || ''),
    new Date(f.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadCSV(`fills_${new Date().toISOString().split('T')[0]}.csv`, csv);
}

export function exportRankingCSV(): void {
  const users = getUsers().filter(u => u.active);
  const fills = getTodayFills();
  const sales = getMonthSales();

  const headers = ['Membro', 'Funcao', 'Score Hoje', 'Vendas Mes', 'Comissao Total'];
  const rows = users.map(u => {
    const fill = fills.find(f => f.userId === u.id);
    const mySales = sales.filter(s => s.sellerId === u.id || s.sellerName === u.name);
    const comm = mySales.reduce((t, s) => t + (s.sellerSetupComm || 0) + (s.sellerRecComm || 0), 0);
    return [
      escapeCSV(u.name), u.role,
      fill ? fill.score.toString() : '0',
      mySales.length.toString(),
      comm.toString(),
    ];
  });
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadCSV(`ranking_${new Date().toISOString().split('T')[0]}.csv`, csv);
}
