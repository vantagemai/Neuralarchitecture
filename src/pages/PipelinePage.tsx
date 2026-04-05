import { useState, useMemo } from 'react';
import { Target, Users, CheckCircle2, TrendingUp, Plus, GripVertical } from 'lucide-react';
import { KpiCard } from '../components/ui/KpiCard';
import { db, getMonthSales, getUsers, fmt$, today } from '../lib/store';
import { showToast } from '../components/ui/Toast';

type Stage = 'lead' | 'contact' | 'proposal' | 'negotiation' | 'closed';

interface Deal {
  id: string;
  name: string;
  company: string;
  value: number;
  stage: Stage;
  assignedTo: string;
  assignedName: string;
  createdAt: string;
  probability: number;
  notes: string;
  ts: number;
}

const STAGES: { key: Stage; label: string; color: string; prob: number }[] = [
  { key: 'lead', label: 'Lead', color: 'border-t-vpurp', prob: 10 },
  { key: 'contact', label: 'Contato', color: 'border-t-vblue', prob: 30 },
  { key: 'proposal', label: 'Proposta', color: 'border-t-vgold', prob: 60 },
  { key: 'negotiation', label: 'Negociacao', color: 'border-t-orange-400', prob: 80 },
  { key: 'closed', label: 'Fechado', color: 'border-t-vgreen', prob: 100 },
];

function getDeals(): Deal[] {
  const keys = db.list('ops_deal_');
  return keys.map(k => db.get<Deal>(k)).filter(Boolean) as Deal[];
}

// Legacy opps support
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
  const [view, setView] = useState<'kanban' | 'funnel'>('kanban');
  const [showForm, setShowForm] = useState(false);
  const [dragDeal, setDragDeal] = useState<string | null>(null);

  // Form
  const [fName, setFName] = useState('');
  const [fCompany, setFCompany] = useState('');
  const [fValue, setFValue] = useState('');
  const [fAssignee, setFAssignee] = useState('');

  const deals = useMemo(() => getDeals(), [refresh]);
  const opps = useMemo(() => getMonthOpps(), [refresh]);
  const sales = useMemo(() => getMonthSales(), [refresh]);
  const users = getUsers().filter(u => u.active);

  // KPIs
  const totalValue = deals.filter(d => d.stage !== 'closed').reduce((t, d) => t + d.value, 0);
  const weightedValue = deals.filter(d => d.stage !== 'closed').reduce((t, d) => t + d.value * (d.probability / 100), 0);
  const closedDeals = deals.filter(d => d.stage === 'closed');

  const createDeal = () => {
    if (!fName.trim()) { showToast('error', 'Nome do deal obrigatorio'); return; }
    const assignee = users.find(u => u.id === fAssignee);
    const deal: Deal = {
      id: `ops_deal_${Date.now()}`,
      name: fName.trim(),
      company: fCompany.trim(),
      value: parseFloat(fValue) || 0,
      stage: 'lead',
      assignedTo: fAssignee,
      assignedName: assignee?.name || '',
      createdAt: today(),
      probability: 10,
      notes: '',
      ts: Date.now(),
    };
    db.set(deal.id, deal);
    setFName(''); setFCompany(''); setFValue(''); setFAssignee('');
    setShowForm(false);
    setRefresh(r => r + 1);
    showToast('success', 'Deal criado');
  };

  const moveDeal = (dealId: string, newStage: Stage) => {
    const deal = db.get<Deal>(dealId);
    if (!deal) return;
    const stageInfo = STAGES.find(s => s.key === newStage);
    deal.stage = newStage;
    deal.probability = stageInfo?.prob || deal.probability;
    db.set(dealId, deal);
    setRefresh(r => r + 1);
    if (newStage === 'closed') showToast('success', `Deal "${deal.name}" fechado!`);
  };

  const deleteDeal = (dealId: string) => {
    if (!confirm('Remover este deal?')) return;
    db.remove(dealId);
    setRefresh(r => r + 1);
  };

  // Drag handlers
  const handleDragStart = (dealId: string) => setDragDeal(dealId);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (stage: Stage) => {
    if (dragDeal) moveDeal(dragDeal, stage);
    setDragDeal(null);
  };

  // Legacy funnel
  const declared = opps.reduce((t, o) => t + o.count, 0);
  const confirmed = opps.filter(o => o.status !== 'pending').reduce((t, o) => t + (o.confirmedCount ?? o.count), 0);
  const closed = sales.length;

  const daysInStage = (d: Deal) => {
    const created = new Date(d.createdAt).getTime();
    return Math.max(1, Math.floor((Date.now() - created) / 86400000));
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pipeline</h1>
          <p className="text-sm text-t3 mt-1">Gestao visual de oportunidades</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-elevated rounded-lg p-0.5">
            <button onClick={() => setView('kanban')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${view === 'kanban' ? 'bg-surface text-t1 shadow-sm' : 'text-t3'}`}>Kanban</button>
            <button onClick={() => setView('funnel')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${view === 'funnel' ? 'bg-surface text-t1 shadow-sm' : 'text-t3'}`}>Funil</button>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 bg-vred hover:bg-vred-dark text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors">
            <Plus size={14} /> Deal
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Pipeline Total" value={fmt$(totalValue)} icon={Target} color="gold" />
        <KpiCard label="Ponderado" value={fmt$(Math.round(weightedValue))} icon={TrendingUp} color="blue" />
        <KpiCard label="Deals Abertos" value={deals.filter(d => d.stage !== 'closed').length} icon={Users} color="purp" />
        <KpiCard label="Fechados" value={closedDeals.length} icon={CheckCircle2} color="green" />
      </div>

      {/* New deal form */}
      {showForm && (
        <div className="bg-surface border border-b1 rounded-xl p-5 animate-in">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input value={fName} onChange={e => setFName(e.target.value)} placeholder="Nome do deal"
              className="bg-elevated border border-b1 rounded-lg px-3 py-2 text-sm outline-none focus:border-vred/40" />
            <input value={fCompany} onChange={e => setFCompany(e.target.value)} placeholder="Empresa"
              className="bg-elevated border border-b1 rounded-lg px-3 py-2 text-sm outline-none focus:border-vred/40" />
            <input type="number" value={fValue} onChange={e => setFValue(e.target.value)} placeholder="Valor ($)"
              className="bg-elevated border border-b1 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-vred/40" />
            <select value={fAssignee} onChange={e => setFAssignee(e.target.value)}
              className="bg-elevated border border-b1 rounded-lg px-3 py-2 text-sm outline-none cursor-pointer">
              <option value="">Responsavel...</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <button onClick={createDeal} className="mt-3 bg-vred hover:bg-vred-dark text-white font-bold px-5 py-2 rounded-lg text-sm transition-colors">
            Criar Deal
          </button>
        </div>
      )}

      {/* Kanban view */}
      {view === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map(stage => {
            const stageDeals = deals.filter(d => d.stage === stage.key);
            const stageValue = stageDeals.reduce((t, d) => t + d.value, 0);
            return (
              <div
                key={stage.key}
                className={`min-w-[240px] flex-1 bg-surface border border-b1 border-t-2 ${stage.color} rounded-xl overflow-hidden`}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(stage.key)}
              >
                <div className="px-4 py-3 border-b border-b1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider">{stage.label}</span>
                    <span className="text-[10px] text-t4 font-mono">{stageDeals.length}</span>
                  </div>
                  {stageValue > 0 && <div className="text-[10px] text-t4 font-mono mt-0.5">{fmt$(stageValue)}</div>}
                </div>
                <div className="p-2 space-y-2 min-h-[120px]">
                  {stageDeals.map(deal => (
                    <div
                      key={deal.id}
                      draggable
                      onDragStart={() => handleDragStart(deal.id)}
                      className="bg-elevated border border-b1 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-b3 transition-colors group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold truncate">{deal.name}</div>
                          {deal.company && <div className="text-[10px] text-t4 truncate">{deal.company}</div>}
                        </div>
                        <GripVertical size={12} className="text-t4 shrink-0 mt-1 opacity-0 group-hover:opacity-100" />
                      </div>
                      {deal.value > 0 && <div className="text-xs font-mono font-bold text-vgreen mt-1.5">{fmt$(deal.value)}</div>}
                      <div className="flex items-center justify-between mt-2">
                        {deal.assignedName && <span className="text-[9px] text-t4">{deal.assignedName}</span>}
                        <span className="text-[9px] text-t4 font-mono">{daysInStage(deal)}d</span>
                      </div>
                      <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {stage.key !== 'closed' && (
                          <button onClick={() => {
                            const idx = STAGES.findIndex(s => s.key === stage.key);
                            if (idx < STAGES.length - 1) moveDeal(deal.id, STAGES[idx + 1].key);
                          }} className="text-[9px] bg-vgreen/10 text-vgreen px-2 py-0.5 rounded hover:bg-vgreen/20">Avancar →</button>
                        )}
                        <button onClick={() => deleteDeal(deal.id)} className="text-[9px] bg-vred/10 text-vred px-2 py-0.5 rounded hover:bg-vred/20">Remover</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Funnel view */}
      {view === 'funnel' && (
        <div className="bg-surface border border-b1 rounded-xl p-6">
          <h2 className="text-sm font-bold mb-4">📊 Funil do Time</h2>
          <div className="space-y-3">
            {[
              { label: 'Geradas (Setters)', value: declared, color: '#9B7FE0' },
              { label: 'Confirmadas', value: confirmed, color: '#5B9AF5' },
              { label: 'Vendas Fechadas', value: closed, color: '#00C864' },
            ].map((step, i, arr) => {
              const maxVal = Math.max(...arr.map(f => f.value), 1);
              const width = Math.round((step.value / maxVal) * 100);
              const prev = i > 0 ? arr[i - 1].value : null;
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
      )}
    </div>
  );
}
