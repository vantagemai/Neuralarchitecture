import { useState } from 'react';
import { Save, Shield, Trophy, Volume2 } from 'lucide-react';
import { db } from '../lib/store';
import { playSuccess } from '../lib/sounds';

const PLANS = [
  { key: 'SETTER',   label: 'Setter',   setup: '10%', rec: '3%',  color: '#9B7FE0' },
  { key: 'AUTONOMO', label: 'Autônomo', setup: '10%', rec: '10%', color: '#888' },
  { key: 'PARTNER',  label: 'Partner',  setup: '30%', rec: '20%', color: '#5B9AF5' },
  { key: 'FOUNDER',  label: 'Founder',  setup: '50%', rec: '40%', color: '#FFD130' },
];

const PRIZES = [
  { id: 'top_closer',    label: '🏆 Top Closer da Semana' },
  { id: 'top_setter',    label: '🎯 Top Setter da Semana' },
  { id: 'iron_streak',   label: '🔥 Sequência de Ferro (7d)' },
  { id: 'first10',       label: '📱 First 10 Closes' },
  { id: 'diamond',       label: '💎 Diamond Month' },
  { id: 'century',       label: '🚀 Century Club (100 leads)' },
];

export function ConfigPage() {
  const cfg = db.get<{ headPin?: string; soundEnabled?: boolean; awards?: { prizes?: Record<string, string> } }>('ops_config') || {};
  const [pin, setPin] = useState(cfg.headPin || '1111');
  const [soundEnabled, setSoundEnabled] = useState(cfg.soundEnabled !== false);
  const [prizes, setPrizes] = useState<Record<string, string>>(cfg.awards?.prizes || {});
  const [saved, setSaved] = useState('');

  const savePin = () => {
    db.set('ops_config', { ...cfg, headPin: pin });
    setSaved('PIN salvo!');
    setTimeout(() => setSaved(''), 1500);
  };

  const savePrizes = () => {
    db.set('ops_config', { ...cfg, awards: { prizes, updatedAt: Date.now() } });
    setSaved('Premiações salvas!');
    setTimeout(() => setSaved(''), 1500);
  };

  return (
    <div className="space-y-6 animate-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-t3 mt-1">PINs, comissões e premiações</p>
      </div>

      {saved && (
        <div className="bg-vgreen/10 border border-vgreen/20 text-vgreen rounded-lg px-4 py-3 text-sm font-medium animate-in">
          ✅ {saved}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PIN */}
        <div className="bg-surface border border-b1 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Shield size={18} className="text-vred" />
            <h2 className="text-[15px] font-bold">Acesso Head</h2>
          </div>
          <div>
            <label className="text-[11px] text-t3 uppercase tracking-wider font-semibold">PIN do Head</label>
            <input value={pin} onChange={e => setPin(e.target.value)} maxLength={6}
              className="mt-1 w-full bg-elevated border border-b1 rounded-lg px-4 py-3 font-mono text-2xl text-center tracking-[12px] outline-none focus:border-vred/40" />
          </div>
          <button onClick={savePin} className="mt-4 w-full flex items-center justify-center gap-2 bg-vred hover:bg-vred-dark text-white font-bold py-3 rounded-lg transition-colors">
            <Save size={16} /> Salvar PIN
          </button>
        </div>

        {/* Commissions */}
        <div className="bg-surface border border-b1 rounded-xl p-6">
          <h2 className="text-[15px] font-bold mb-5">💰 Tabela de Comissões</h2>
          <div className="space-y-3">
            {PLANS.map(p => (
              <div key={p.key} className="flex items-center justify-between bg-elevated rounded-lg px-4 py-3 border border-b1">
                <span className="text-sm font-bold" style={{ color: p.color }}>{p.label}</span>
                <span className="text-xs text-t3 font-mono">
                  Setup <strong>{p.setup}</strong> · Rec <strong>{p.rec}</strong>/mês
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 text-xs text-t4 border-t border-b1 pt-3">
            Setter bônus: 10 leads qualificados = $100 bloqueado · 1 venda = $100 liberado
          </div>
        </div>
      </div>

      {/* Sound Effects */}
      <div className="bg-surface border border-b1 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Volume2 size={18} className="text-vblue" />
          <h2 className="text-[15px] font-bold">Som</h2>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Efeitos sonoros</div>
            <div className="text-xs text-t4">Sons de celebracao ao fechar venda, subir de nivel, etc.</div>
          </div>
          <button
            onClick={() => {
              const newVal = !soundEnabled;
              setSoundEnabled(newVal);
              db.set('ops_config', { ...cfg, soundEnabled: newVal });
              if (newVal) playSuccess();
            }}
            className={`w-12 h-6 rounded-full transition-colors relative ${soundEnabled ? 'bg-vgreen' : 'bg-muted'}`}
          >
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${soundEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </div>

      {/* Prizes */}
      <div className="bg-surface border border-b1 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Trophy size={18} className="text-vgold" />
          <h2 className="text-[15px] font-bold">Premiações</h2>
        </div>
        <p className="text-xs text-t3 mb-5">Esses prêmios aparecem no Painel TV e no Ranking</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PRIZES.map(p => (
            <div key={p.id}>
              <label className="text-[11px] text-t3 font-semibold">{p.label}</label>
              <input
                value={prizes[p.id] || ''}
                onChange={e => setPrizes({ ...prizes, [p.id]: e.target.value })}
                placeholder="Ex: $500 cash"
                className="mt-1 w-full bg-elevated border border-b1 rounded-lg px-3 py-2 text-sm outline-none focus:border-vred/40"
              />
            </div>
          ))}
        </div>
        <button onClick={savePrizes} className="mt-5 flex items-center gap-2 bg-vgold/15 hover:bg-vgold/25 text-vgold border border-vgold/20 font-bold px-5 py-2.5 rounded-lg transition-colors">
          <Trophy size={16} /> Salvar Premiações
        </button>
      </div>
    </div>
  );
}
