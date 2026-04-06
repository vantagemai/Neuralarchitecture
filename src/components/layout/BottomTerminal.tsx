import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getMonthSales, fmt$, db, getUsers, type FillData, calcScore, today } from '../../lib/store';
import { PanelHeader } from '../ui/PanelHeader';
import { ShoutoutFeed } from '../ops/ShoutoutFeed';

type Tab = 'vendas' | 'shoutouts' | 'journal';

export function BottomTerminal() {
  const [tab, setTab] = useState<Tab>('vendas');
  const [collapsed, setCollapsed] = useState(false);

  const sales = getMonthSales();
  const users = getUsers().filter(u => u.active);

  // Journal: today's fills
  const journal = users.map(u => {
    const fill = db.get<FillData>(`ops_fill_${today()}_${u.id}`);
    const score = fill ? calcScore(fill) : 0;
    const time = fill ? new Date(fill.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
    return { id: u.id, name: u.name, filled: !!fill, score, time };
  }).sort((a, b) => b.score - a.score);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'vendas', label: 'Vendas Recentes' },
    { key: 'shoutouts', label: 'Reconhecimentos' },
    { key: 'journal', label: 'Journal' },
  ];

  return (
    <div className="bg-surface border-t border-b1 flex flex-col shrink-0 hidden lg:flex">
      {/* Panel header */}
      <PanelHeader title="Terminal" onCollapse={() => setCollapsed(!collapsed)} collapsed={collapsed} />

      {/* Tab strip */}
      <div className="flex border-b border-b1 shrink-0">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); if (collapsed) setCollapsed(false); }}
            className={`px-3 py-1 text-[10px] transition-colors border-r border-b1 ${
              tab === t.key ? 'bg-elevated text-t1 border-b-2 border-b-vred' : 'text-t3 hover:text-t2 hover:bg-elevated/50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {!collapsed && (
        <div className="h-[160px] overflow-y-auto">
          {tab === 'vendas' && (
            <table className="w-full">
              <thead>
                <tr className="bg-elevated/50">
                  {['Vendedor', 'Data', 'Setup', 'Rec/mês', 'Comissão'].map(h => (
                    <th key={h} className="text-left text-[9px] text-t3 uppercase tracking-wider px-3 py-1">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sales.sort((a, b) => b.ts - a.ts).slice(0, 20).map((s, i) => (
                  <tr key={s.id} className={`hover:bg-elevated/50 transition-colors ${i % 2 === 0 ? '' : 'bg-elevated/20'}`}>
                    <td className="px-3 py-1 text-[11px]"><Link to={`/perfil/${s.sellerId}`} className="hover:text-vred transition-colors">{s.sellerName}</Link></td>
                    <td className="px-3 py-1 text-[11px] text-t3">{s.date}</td>
                    <td className="px-3 py-1 text-[11px]">${s.setupValue}</td>
                    <td className="px-3 py-1 text-[11px]">${s.recValue}</td>
                    <td className="px-3 py-1 text-[11px] font-bold text-vgreen">{fmt$(s.sellerSetupComm + s.sellerRecComm)}</td>
                  </tr>
                ))}
                {sales.length === 0 && <tr><td colSpan={5} className="text-center py-4 text-t4 text-[11px]">Sem vendas este mes</td></tr>}
              </tbody>
            </table>
          )}

          {tab === 'shoutouts' && (
            <div className="p-2">
              <ShoutoutFeed />
            </div>
          )}

          {tab === 'journal' && (
            <table className="w-full">
              <thead>
                <tr className="bg-elevated/50">
                  {['Membro', 'Status', 'Score', 'Horario'].map(h => (
                    <th key={h} className="text-left text-[9px] text-t3 uppercase tracking-wider px-3 py-1">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {journal.map((j, i) => (
                  <tr key={j.id} className={`hover:bg-elevated/50 ${i % 2 === 0 ? '' : 'bg-elevated/20'}`}>
                    <td className="px-3 py-1 text-[11px]"><Link to={`/perfil/${j.id}`} className="hover:text-vred transition-colors">{j.name}</Link></td>
                    <td className="px-3 py-1 text-[11px]">
                      <span className={j.filled ? 'text-vgreen' : 'text-t4'}>
                        {j.filled ? '● Preenchido' : '○ Pendente'}
                      </span>
                    </td>
                    <td className="px-3 py-1 text-[11px] font-bold text-vred">{j.score > 0 ? `${j.score} pts` : '—'}</td>
                    <td className="px-3 py-1 text-[11px] text-t3">{j.time || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
