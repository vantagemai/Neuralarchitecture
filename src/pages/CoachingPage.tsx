import { useState } from 'react';
import { MessageSquare, Star, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { db, getUsers, getSession, today } from '../lib/store';
import { showToast } from '../components/ui/Toast';
import { getLevel } from '../lib/levels';
import { getStreak } from '../lib/streaks';
import { getTotalXp } from '../lib/xp';

interface CoachingNote {
  id: string;
  managerId: string;
  memberId: string;
  date: string;
  rating: number; // 1-5
  notes: string;
  actionItems: string;
  ts: number;
}

function getCoachingNotes(memberId: string): CoachingNote[] {
  const keys = db.list(`coaching_${memberId}_`);
  return keys.map(k => db.get<CoachingNote>(k)).filter(Boolean).sort((a, b) => (b as CoachingNote).ts - (a as CoachingNote).ts) as CoachingNote[];
}

export function CoachingPage() {
  const session = getSession();
  const users = getUsers().filter(u => u.active);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [actionItems, setActionItems] = useState('');
  const [rating, setRating] = useState(3);
  const [expanded, setExpanded] = useState<string | null>(null);

  const selected = users.find(u => u.id === selectedId);
  const history = selectedId ? getCoachingNotes(selectedId) : [];

  const saveNote = () => {
    if (!selectedId || !notes.trim()) { showToast('error', 'Selecione membro e escreva notas'); return; }
    const note: CoachingNote = {
      id: `coaching_${selectedId}_${Date.now()}`,
      managerId: session?.id || '',
      memberId: selectedId,
      date: today(),
      rating,
      notes: notes.trim(),
      actionItems: actionItems.trim(),
      ts: Date.now(),
    };
    db.set(note.id, note);
    showToast('success', 'Nota de coaching salva');
    setNotes('');
    setActionItems('');
    setRating(3);
  };

  return (
    <div className="space-y-4 animate-in">
      <div>
        <h1 className="text-lg font-bold">Coaching 1:1</h1>
        <p className="text-sm text-t3 mt-1">Notas de acompanhamento por membro</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Member list */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-t3 uppercase tracking-wider mb-2">Selecione um membro</h2>
          {users.map(u => {
            const level = getLevel(u.id);
            const streak = getStreak(u.id);
            const noteCount = getCoachingNotes(u.id).length;
            return (
              <button
                key={u.id}
                onClick={() => setSelectedId(u.id)}
                className={`w-full flex items-center gap-3 bg-surface border rounded-lg px-4 py-3 text-left transition-colors ${
                  selectedId === u.id ? 'border-vred/30 bg-vred/5' : 'border-b1 hover:border-b3'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-vred to-vred-dark flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                  {u.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate flex items-center gap-1.5">
                    {u.name}
                    <span className={`text-[10px] ${level.color}`}>{level.icon}</span>
                  </div>
                  <div className="text-[10px] text-t4">
                    {u.role} · {getTotalXp(u.id)} XP
                    {streak.current > 0 && <> · 🔥{streak.current}d</>}
                  </div>
                </div>
                {noteCount > 0 && (
                  <span className="text-[9px] text-t4 bg-elevated px-1.5 py-0.5 rounded-full font-mono">{noteCount}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Coaching form + history */}
        <div className="lg:col-span-2 space-y-4">
          {!selected ? (
            <div className="text-center py-16 bg-surface border border-b1 rounded-lg">
              <MessageSquare size={32} className="mx-auto mb-3 text-t4 opacity-30" />
              <p className="text-sm text-t3">Selecione um membro para registrar coaching</p>
            </div>
          ) : (
            <>
              {/* New note form */}
              <div className="bg-surface border border-b1 rounded-lg p-5">
                <h3 className="font-bold text-sm mb-4">Nova nota para {selected.name}</h3>

                {/* Rating */}
                <div className="mb-4">
                  <label className="text-[11px] text-t3 uppercase tracking-wider font-semibold">Performance (1-5)</label>
                  <div className="flex gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} onClick={() => setRating(n)}
                        className={`p-1.5 rounded transition-colors ${rating >= n ? 'text-vgold' : 'text-t4 hover:text-t3'}`}>
                        <Star size={20} fill={rating >= n ? 'currentColor' : 'none'} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-3">
                  <label className="text-[11px] text-t3 uppercase tracking-wider font-semibold">Notas</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="Pontos fortes, areas de melhoria, observacoes..."
                    className="mt-1 w-full bg-elevated border border-b1 rounded-lg px-4 py-3 text-sm outline-none focus:border-vred/40 min-h-[100px] resize-none" />
                </div>

                <div className="mb-4">
                  <label className="text-[11px] text-t3 uppercase tracking-wider font-semibold">Action Items</label>
                  <textarea value={actionItems} onChange={e => setActionItems(e.target.value)}
                    placeholder="Tarefas, metas, proximos passos..."
                    className="mt-1 w-full bg-elevated border border-b1 rounded-lg px-4 py-3 text-sm outline-none focus:border-vred/40 min-h-[60px] resize-none" />
                </div>

                <button onClick={saveNote} className="flex items-center gap-2 bg-vred hover:bg-vred-dark text-white font-bold px-5 py-2.5 rounded-lg transition-colors">
                  <Save size={14} /> Salvar Nota
                </button>
              </div>

              {/* History */}
              <div>
                <h3 className="font-bold text-sm mb-3">Historico ({history.length})</h3>
                {history.length === 0 ? (
                  <div className="text-center py-5 bg-surface border border-b1 rounded-lg text-t4 text-sm">
                    Primeira sessao de coaching
                  </div>
                ) : (
                  <div className="space-y-2">
                    {history.map(n => (
                      <div key={n.id} className="bg-surface border border-b1 rounded-lg">
                        <button
                          onClick={() => setExpanded(expanded === n.id ? null : n.id)}
                          className="w-full flex items-center justify-between px-5 py-3 text-left"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono text-t4">{n.date}</span>
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map(i => (
                                <Star key={i} size={10} className={n.rating >= i ? 'text-vgold' : 'text-t4'} fill={n.rating >= i ? 'currentColor' : 'none'} />
                              ))}
                            </div>
                          </div>
                          {expanded === n.id ? <ChevronUp size={14} className="text-t4" /> : <ChevronDown size={14} className="text-t4" />}
                        </button>
                        {expanded === n.id && (
                          <div className="px-5 pb-4 space-y-2 border-t border-b1 pt-3">
                            <p className="text-sm text-t2 whitespace-pre-wrap">{n.notes}</p>
                            {n.actionItems && (
                              <div className="bg-vgold/5 border border-vgold/15 rounded-lg px-3 py-2">
                                <div className="text-[10px] text-vgold uppercase font-bold mb-1">Action Items</div>
                                <p className="text-xs text-t2 whitespace-pre-wrap">{n.actionItems}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
