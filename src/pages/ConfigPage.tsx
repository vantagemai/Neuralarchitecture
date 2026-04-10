import { useState } from 'react';
import { Save, Shield, Trophy, Volume2, Cloud, CloudOff, Users, Sun, Moon } from 'lucide-react';
import { db } from '../lib/store';
import { playSuccess } from '../lib/sounds';
import { isOnline } from '../lib/supabase';
import { getTheme, toggleTheme } from '../lib/theme';
import { pushLocalToSupabase, hydrateFromSupabase } from '../lib/supabaseSync';
import { runDemoSeed, clearAllData } from '../lib/demoSeed';
import { CardBase } from '../components/ui/CardBase';

const PLANS = [
  { key: 'SETTER',   label: 'Setter',   setup: '10%', rec: '3%',  color: '#8B7EC8' },
  { key: 'AUTONOMO', label: 'Autônomo', setup: '10%', rec: '10%', color: '#888' },
  { key: 'PARTNER',  label: 'Partner',  setup: '30%', rec: '20%', color: '#6B8FBF' },
  { key: 'FOUNDER',  label: 'Founder',  setup: '50%', rec: '40%', color: '#C8963E' },
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
  const [dark, setDark] = useState(getTheme() === 'dark');
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
    <div className="space-y-5 animate-in max-w-4xl">
      <div>
        <h1 className="text-lg font-bold">Configurações</h1>
        <p className="text-sm text-t3 mt-1">PINs, comissões e premiações</p>
      </div>

      {saved && (
        <div className="bg-vgreen/10 border border-vgreen/20 text-vgreen rounded-lg px-4 py-3 text-sm font-medium animate-in">
          ✅ {saved}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        {/* PIN */}
        <CardBase>
          <div className="flex items-center gap-2 mb-5">
            <Shield size={18} className="text-vred" />
            <h2 className="text-sm font-bold">Acesso Head</h2>
          </div>
          <div>
            <label className="text-xs text-t3 uppercase tracking-wider font-semibold">PIN do Head</label>
            <input value={pin} onChange={e => setPin(e.target.value)} maxLength={6}
              className="mt-1 w-full bg-elevated border border-b1 rounded-lg px-4 py-3 font-mono text-lg text-center tracking-[12px] outline-none focus:border-vred/40" />
          </div>
          <button onClick={savePin} className="mt-4 w-full flex items-center justify-center gap-2 bg-vred hover:bg-vred-dark text-white font-bold py-3 rounded-lg transition-colors">
            <Save size={16} /> Salvar PIN
          </button>
        </CardBase>

        {/* Commissions */}
        <CardBase>
          <h2 className="text-sm font-bold mb-5">💰 Tabela de Comissões</h2>
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
        </CardBase>
      </div>

      {/* Cloud Sync */}
      <CardBase>
        <div className="flex items-center gap-2 mb-4">
          {isOnline() ? <Cloud size={18} className="text-vgreen" /> : <CloudOff size={18} className="text-t4" />}
          <h2 className="text-sm font-bold">Supabase Cloud</h2>
          <span className={`text-2xs font-mono px-2 py-0.5 rounded-full ${isOnline() ? 'bg-vgreen/10 text-vgreen' : 'bg-muted text-t4'}`}>
            {isOnline() ? 'Conectado' : 'Offline'}
          </span>
        </div>
        <p className="text-xs text-t3 mb-4">Sincronize dados locais com o banco de dados na nuvem. Dados ficam acessiveis de qualquer navegador.</p>
        <div className="flex gap-3">
          <button
            onClick={async () => {
              setSaved('Enviando dados...');
              const { pushed } = await pushLocalToSupabase();
              setSaved(`${pushed} registros enviados para a nuvem!`);
              setTimeout(() => setSaved(''), 3000);
            }}
            disabled={!isOnline()}
            className="flex items-center gap-2 bg-vblue/15 hover:bg-vblue/25 text-vblue border border-vblue/20 font-bold px-4 py-2.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Cloud size={14} /> Enviar Local → Nuvem
          </button>
          <button
            onClick={async () => {
              setSaved('Baixando dados...');
              await hydrateFromSupabase();
              setSaved('Dados sincronizados da nuvem!');
              setTimeout(() => setSaved(''), 3000);
            }}
            disabled={!isOnline()}
            className="flex items-center gap-2 bg-elevated border border-b1 text-t2 font-bold px-4 py-2.5 rounded-lg transition-colors hover:border-b3 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Cloud size={14} /> Baixar Nuvem → Local
          </button>
        </div>
      </CardBase>

      {/* Data Management */}
      <CardBase>
        <div className="flex items-center gap-2 mb-4">
          <Users size={18} className="text-vpurp" />
          <h2 className="text-sm font-bold">Gerenciamento de Dados</h2>
        </div>

        {/* Clear Data */}
        <div className="mb-4 pb-4 border-b border-b1">
          <p className="text-xs text-t3 mb-3">Remove todos os dados (usuarios, vendas, fills, fichas, etc.) para comecar do zero. Configuracoes sao preservadas.</p>
          <button
            onClick={() => {
              const pin = window.prompt('Digite a senha de 4 digitos para confirmar:');
              if (pin !== '1173') { if (pin !== null) setSaved('Senha incorreta.'); return; }
              if (!window.confirm('Tem certeza? Todos os dados serao removidos permanentemente. Configuracoes serao mantidas.')) return;
              const result = clearAllData();
              setSaved(`Dados limpos! ${result.removed} registros removidos.`);
              setTimeout(() => setSaved(''), 5000);
            }}
            className="flex items-center gap-2 bg-vred/10 hover:bg-vred/20 text-vred border border-vred/20 font-bold px-4 py-2.5 rounded-lg transition-colors"
          >
            <Shield size={14} /> Limpar Todos os Dados
          </button>
        </div>

        {/* Demo Seed */}
        <div>
          <p className="text-xs text-t3 mb-3">Gera 100 usuarios com 90 dias de dados realistas — vendas, fills, fichas, streaks, conquistas, pipeline. Ideal para apresentacao ao time.</p>
          <button
            onClick={async () => {
              if (!window.confirm('Isso vai limpar os dados atuais e gerar 100 usuarios demo com 90 dias de historico. Continuar?')) return;
              setSaved('Limpando dados antigos...');
              clearAllData();
              setSaved('Gerando 100 usuarios + 90 dias...');
              const result = await runDemoSeed();
              playSuccess();
              setSaved(`Demo criado! ${result.users} membros, ${result.sales} vendas, ${result.fills} fills`);
              setTimeout(() => setSaved(''), 5000);
            }}
            className="flex items-center gap-2 bg-vpurp/15 hover:bg-vpurp/25 text-vpurp border border-vpurp/20 font-bold px-4 py-2.5 rounded-lg transition-colors"
          >
            <Users size={14} /> Demo 100 Usuarios (90 dias)
          </button>
          <p className="text-2xs text-t4 mt-2">Senha de todos os demo: demo123</p>
        </div>
      </CardBase>

      {/* Sound Effects */}
      <CardBase>
        <div className="flex items-center gap-2 mb-4">
          <Volume2 size={18} className="text-vblue" />
          <h2 className="text-sm font-bold">Som</h2>
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
      </CardBase>

      {/* Theme */}
      <CardBase>
        <div className="flex items-center gap-2 mb-4">
          {dark ? <Moon size={18} className="text-vpurp" /> : <Sun size={18} className="text-vgold" />}
          <h2 className="text-sm font-bold">Tema</h2>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">{dark ? 'Modo escuro' : 'Modo claro'}</div>
            <div className="text-xs text-t4">Alterne entre tema escuro e claro</div>
          </div>
          <button
            onClick={() => { toggleTheme(); setDark(!dark); }}
            className={`w-12 h-6 rounded-full transition-colors relative ${dark ? 'bg-vpurp' : 'bg-vgold'}`}
          >
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${dark ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </CardBase>

      {/* Prizes */}
      <CardBase>
        <div className="flex items-center gap-2 mb-5">
          <Trophy size={18} className="text-vgold" />
          <h2 className="text-sm font-bold">Premiações</h2>
        </div>
        <p className="text-xs text-t3 mb-5">Esses prêmios aparecem no Painel TV e no Ranking</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4">
          {PRIZES.map(p => (
            <div key={p.id}>
              <label className="text-xs text-t3 font-semibold">{p.label}</label>
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
      </CardBase>
    </div>
  );
}
