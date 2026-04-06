import { useState } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, Trash2, Pencil, X, Check, Target } from 'lucide-react';
import { db, getUsers, type UserData } from '../lib/store';
import { Badge } from '../components/ui/Badge';
import { showToast } from '../components/ui/Toast';
import { getGoals, setGoals, type UserGoals } from '../lib/goals';
import { getTotalXp } from '../lib/xp';
import { getStreak } from '../lib/streaks';

const ROLES = ['Setter', 'Vendedor', 'Partner', 'Founder'];
const roleVariant = (r: string) => r === 'Setter' ? 'purp' as const : r === 'Founder' ? 'red' as const : r === 'Partner' ? 'blue' as const : 'gold' as const;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function TimePage() {
  const [users, setUsers] = useState(getUsers);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Setter');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');

  // Editing state
  const [goalsId, setGoalsId] = useState<string | null>(null);
  const [editGoals, setEditGoals] = useState<UserGoals>({ dailyContacts: 50, dailyScore: 50, monthlySales: 5, monthlyRevenue: 5000 });
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editEmail, setEditEmail] = useState('');

  const active = users.filter(u => u.active);

  const addUser = () => {
    if (!name.trim() || !email.trim() || !password.trim()) { setMsg('Preencha todos os campos'); return; }
    if (!EMAIL_REGEX.test(email.trim())) { setMsg('Email invalido'); return; }
    if (users.find(u => u.email === email.toLowerCase())) { setMsg('Email ja cadastrado'); return; }
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
    showToast('success', `${newUser.name} adicionado`, role);
    setMsg('');
  };

  const removeUser = (id: string) => {
    if (!confirm('Remover este membro?')) return;
    const updated = users.map(u => u.id === id ? { ...u, active: false } : u);
    db.set('ops_users', updated);
    setUsers(updated);
    showToast('info', 'Membro removido');
  };

  const startEdit = (u: UserData) => {
    setEditId(u.id);
    setEditName(u.name);
    setEditRole(u.role);
    setEditEmail(u.email);
  };

  const cancelEdit = () => {
    setEditId(null);
  };

  const saveEdit = () => {
    if (!editName.trim()) { showToast('error', 'Nome obrigatorio'); return; }
    if (!EMAIL_REGEX.test(editEmail.trim())) { showToast('error', 'Email invalido'); return; }
    const updated = users.map(u => {
      if (u.id !== editId) return u;
      return {
        ...u,
        name: editName.trim(),
        email: editEmail.toLowerCase().trim(),
        role: editRole,
        plan: editRole === 'Setter' ? 'SETTER' : editRole === 'Founder' ? 'FOUNDER' : 'PARTNER',
      };
    });
    db.set('ops_users', updated);
    setUsers(updated);
    setEditId(null);
    showToast('success', 'Membro atualizado');
  };

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold">Time</h1>
        <p className="text-sm text-t3 mt-1">Gerencie os colaboradores do sistema</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Add form */}
        <div className="bg-surface border border-b1 rounded-lg p-6">
          <h2 className="text-[15px] font-bold mb-5">➕ Adicionar Membro</h2>

          {msg && (
            <div className={`rounded-lg px-4 py-3 text-sm mb-4 bg-vred/10 border border-vred/20 text-vred`}>
              {msg}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-[11px] text-t3 uppercase tracking-wider font-semibold">Nome completo</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Joao Silva"
                className="mt-1 w-full bg-elevated border border-b1 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-vred/40" />
            </div>
            <div>
              <label className="text-[11px] text-t3 uppercase tracking-wider font-semibold">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="joao@email.com"
                className="mt-1 w-full bg-elevated border border-b1 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-vred/40" />
            </div>
            <div>
              <label className="text-[11px] text-t3 uppercase tracking-wider font-semibold">Funcao</label>
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
            <div className="text-center py-12 text-t3 text-sm bg-surface border border-b1 rounded-lg">Sem colaboradores cadastrados</div>
          ) : (
            <div className="space-y-2">
              {active.map(u => (
                <div key={u.id} className="bg-surface border border-b1 rounded-lg px-5 py-3.5 hover:border-b3 transition-colors">
                  {editId === u.id ? (
                    /* Edit mode */
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input value={editName} onChange={e => setEditName(e.target.value)}
                          className="flex-1 bg-elevated border border-b1 rounded-lg px-3 py-2 text-sm outline-none focus:border-vred/40" />
                        <select value={editRole} onChange={e => setEditRole(e.target.value)}
                          className="bg-elevated border border-b1 rounded-lg px-3 py-2 text-sm outline-none cursor-pointer">
                          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <input value={editEmail} onChange={e => setEditEmail(e.target.value)}
                        className="w-full bg-elevated border border-b1 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-vred/40" />
                      <div className="flex gap-2">
                        <button onClick={saveEdit} className="flex-1 flex items-center justify-center gap-1 bg-vgreen hover:bg-emerald-600 text-white text-xs font-bold py-2 rounded-lg transition-colors">
                          <Check size={14} /> Salvar
                        </button>
                        <button onClick={cancelEdit} className="flex-1 flex items-center justify-center gap-1 bg-elevated hover:bg-muted text-t3 text-xs font-bold py-2 rounded-lg transition-colors">
                          <X size={14} /> Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* View mode */
                    <>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-vred to-vred-dark flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                        {u.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link to={`/perfil/${u.id}`} className="text-sm font-semibold truncate hover:text-vred transition-colors block">{u.name}</Link>
                        <div className="text-[11px] text-t4 font-mono">{u.email}</div>
                      </div>
                      <Badge variant={roleVariant(u.role)}>{u.role}</Badge>
                      <span className="text-[10px] text-t4 font-mono">{getTotalXp(u.id)} XP</span>
                      {getStreak(u.id).current > 0 && <span className="text-[10px] text-orange-400">🔥{getStreak(u.id).current}</span>}
                      <button onClick={() => { setGoalsId(goalsId === u.id ? null : u.id); setEditGoals(getGoals(u.id)); }} className="p-2 text-t4 hover:text-vgold transition-colors" title="Metas">
                        <Target size={14} />
                      </button>
                      <button onClick={() => startEdit(u)} className="p-2 text-t4 hover:text-vblue transition-colors" title="Editar">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => removeUser(u.id)} className="p-2 text-t4 hover:text-vred transition-colors" title="Remover">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {/* Goals panel */}
                    {goalsId === u.id && (
                      <div className="mt-3 pt-3 border-t border-b1 animate-in">
                        <div className="text-[10px] text-t3 uppercase font-bold mb-2">Metas de {u.name.split(' ')[0]}</div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div>
                            <label className="text-[9px] text-t4 uppercase">Contatos/dia</label>
                            <input type="number" value={editGoals.dailyContacts} onChange={e => setEditGoals({ ...editGoals, dailyContacts: parseInt(e.target.value) || 0 })}
                              className="mt-0.5 w-full bg-elevated border border-b1 rounded-lg px-2 py-1.5 text-center font-mono text-xs outline-none focus:border-vred/40" />
                          </div>
                          <div>
                            <label className="text-[9px] text-t4 uppercase">Score/dia</label>
                            <input type="number" value={editGoals.dailyScore} onChange={e => setEditGoals({ ...editGoals, dailyScore: parseInt(e.target.value) || 0 })}
                              className="mt-0.5 w-full bg-elevated border border-b1 rounded-lg px-2 py-1.5 text-center font-mono text-xs outline-none focus:border-vred/40" />
                          </div>
                          <div>
                            <label className="text-[9px] text-t4 uppercase">Vendas/mes</label>
                            <input type="number" value={editGoals.monthlySales} onChange={e => setEditGoals({ ...editGoals, monthlySales: parseInt(e.target.value) || 0 })}
                              className="mt-0.5 w-full bg-elevated border border-b1 rounded-lg px-2 py-1.5 text-center font-mono text-xs outline-none focus:border-vred/40" />
                          </div>
                          <div>
                            <label className="text-[9px] text-t4 uppercase">Receita/mes ($)</label>
                            <input type="number" value={editGoals.monthlyRevenue} onChange={e => setEditGoals({ ...editGoals, monthlyRevenue: parseInt(e.target.value) || 0 })}
                              className="mt-0.5 w-full bg-elevated border border-b1 rounded-lg px-2 py-1.5 text-center font-mono text-xs outline-none focus:border-vred/40" />
                          </div>
                        </div>
                        <button onClick={() => { setGoals(editGoals, u.id); setGoalsId(null); showToast('success', `Metas de ${u.name.split(' ')[0]} salvas`); }}
                          className="mt-2 text-xs bg-vgold/15 text-vgold border border-vgold/20 font-bold px-3 py-1.5 rounded-lg hover:bg-vgold/25 transition-colors">
                          Salvar Metas
                        </button>
                      </div>
                    )}
                  </>
                )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
