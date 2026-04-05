import { useState } from 'react';
import { UserPlus, Trash2 } from 'lucide-react';
import { db, getUsers, type UserData } from '../lib/store';
import { Badge } from '../components/ui/Badge';

const ROLES = ['Setter', 'Vendedor', 'Partner', 'Founder'];
const roleVariant = (r: string) => r === 'Setter' ? 'purp' as const : r === 'Founder' ? 'red' as const : r === 'Partner' ? 'blue' as const : 'gold' as const;

export function TimePage() {
  const [users, setUsers] = useState(getUsers);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Setter');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');

  const active = users.filter(u => u.active);

  const addUser = () => {
    if (!name.trim() || !email.trim() || !password.trim()) { setMsg('Preencha todos os campos'); return; }
    if (users.find(u => u.email === email.toLowerCase())) { setMsg('Email já cadastrado'); return; }
    const newUser: UserData = {
      id: 'u_' + Date.now(),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role,
      plan: role === 'Setter' ? 'SETTER' : role === 'Founder' ? 'FOUNDER' : 'PARTNER',
      active: true,
      createdAt: Date.now(),
    };
    const updated = [...users, newUser];
    db.set('ops_users', updated);
    setUsers(updated);
    setName(''); setEmail(''); setPassword('');
    setMsg(`✅ ${newUser.name} adicionado como ${role}`);
    setTimeout(() => setMsg(''), 2000);
  };

  const removeUser = (id: string) => {
    if (!confirm('Remover este membro?')) return;
    const updated = users.map(u => u.id === id ? { ...u, active: false } : u);
    db.set('ops_users', updated);
    setUsers(updated);
  };

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold">Time</h1>
        <p className="text-sm text-t3 mt-1">Gerencie os colaboradores do sistema</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Add form */}
        <div className="bg-surface border border-b1 rounded-xl p-6">
          <h2 className="text-[15px] font-bold mb-5">➕ Adicionar Membro</h2>

          {msg && (
            <div className={`rounded-lg px-4 py-3 text-sm mb-4 ${msg.startsWith('✅') ? 'bg-vgreen/10 border border-vgreen/20 text-vgreen' : 'bg-vred/10 border border-vred/20 text-vred'}`}>
              {msg}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-[11px] text-t3 uppercase tracking-wider font-semibold">Nome completo</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: João Silva"
                className="mt-1 w-full bg-elevated border border-b1 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-vred/40" />
            </div>
            <div>
              <label className="text-[11px] text-t3 uppercase tracking-wider font-semibold">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="joao@email.com"
                className="mt-1 w-full bg-elevated border border-b1 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-vred/40" />
            </div>
            <div>
              <label className="text-[11px] text-t3 uppercase tracking-wider font-semibold">Função</label>
              <select value={role} onChange={e => setRole(e.target.value)}
                className="mt-1 w-full bg-elevated border border-b1 rounded-lg px-4 py-2.5 text-sm outline-none cursor-pointer appearance-none">
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-t3 uppercase tracking-wider font-semibold">Senha inicial</label>
              <input value={password} onChange={e => setPassword(e.target.value)} placeholder="vantagem2024"
                className="mt-1 w-full bg-elevated border border-b1 rounded-lg px-4 py-2.5 text-sm font-mono outline-none focus:border-vred/40" />
            </div>
            <button onClick={addUser} className="w-full flex items-center justify-center gap-2 bg-vred hover:bg-vred-dark text-white font-bold py-3 rounded-lg transition-colors">
              <UserPlus size={16} /> Adicionar ao Time
            </button>
          </div>
        </div>

        {/* Member list */}
        <div>
          <h2 className="text-[15px] font-bold mb-4">👥 Time ({active.length})</h2>
          {active.length === 0 ? (
            <div className="text-center py-12 text-t3 text-sm bg-surface border border-b1 rounded-xl">Sem colaboradores cadastrados</div>
          ) : (
            <div className="space-y-2">
              {active.map(u => (
                <div key={u.id} className="flex items-center gap-3 bg-surface border border-b1 rounded-xl px-5 py-3.5 hover:border-b3 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-vred to-vred-dark flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                    {u.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{u.name}</div>
                    <div className="text-[11px] text-t4 font-mono">{u.email}</div>
                  </div>
                  <Badge variant={roleVariant(u.role)}>{u.role}</Badge>
                  <button onClick={() => removeUser(u.id)} className="p-2 text-t4 hover:text-vred transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
