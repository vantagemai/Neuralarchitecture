import { useState } from 'react';
import { Flame, Heart, Save, Camera, Plus, Trash2, ChevronUp as MoveUp, ChevronDown as MoveDown } from 'lucide-react';
import { db, today, fmt$, getSession } from '../lib/store';
import { CardBase } from '../components/ui/CardBase';
import { type NIProfile, type MaterialItem, type MaterialCategory, getNIProfile, CATEGORY_META, genMaterialId } from '../lib/niProfile';
import { getLifetimeCommission } from '../lib/store';

export function IdentidadePage() {
  const session = getSession() || { id: 'anon', name: 'Anon', role: 'Setter', email: '' };
  const userId = session.id || 'anon';
  const profileKey = `ni_profile_${userId}`;

  const [profile, setProfile] = useState<NIProfile | null>(() => getNIProfile(userId));
  const [editing, setEditing] = useState(!profile);
  const [form, setForm] = useState({
    metaM: profile?.metaM?.toString() || '',
    impact: profile?.impact || '',
    anchor: profile?.anchor || '',
  });
  const [materials, setMaterials] = useState<MaterialItem[]>(() => {
    if (profile?.materials && profile.materials.length > 0) return profile.materials;
    return [{ id: genMaterialId(), label: '', category: 'car' as MaterialCategory, value: 0, priority: 1 }];
  });

  const handleImageUpload = (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxW = 300;
        let w = img.width, h = img.height;
        if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
        const b64 = canvas.toDataURL('image/jpeg', 0.6);
        setMaterials(prev => prev.map(m => m.id === itemId ? { ...m, image: b64 } : m));
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const addMaterial = () => {
    if (materials.length >= 6) return;
    setMaterials(prev => [...prev, {
      id: genMaterialId(),
      label: '',
      category: 'custom' as MaterialCategory,
      value: 0,
      priority: prev.length + 1,
    }]);
  };

  const removeMaterial = (id: string) => {
    if (materials.length <= 1) return;
    setMaterials(prev => {
      const filtered = prev.filter(m => m.id !== id);
      return filtered.map((m, i) => ({ ...m, priority: i + 1 }));
    });
  };

  const moveMaterial = (idx: number, dir: -1 | 1) => {
    const next = idx + dir;
    if (next < 0 || next >= materials.length) return;
    setMaterials(prev => {
      const copy = [...prev];
      [copy[idx], copy[next]] = [copy[next], copy[idx]];
      return copy.map((m, i) => ({ ...m, priority: i + 1 }));
    });
  };

  const updateMaterial = (id: string, field: keyof MaterialItem, value: string | number) => {
    setMaterials(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const save = () => {
    const metaM = parseFloat(form.metaM) || 0;
    if (!metaM) { alert('Defina sua meta mensal'); return; }
    const validMaterials = materials.filter(m => m.label.trim());
    if (validMaterials.length === 0) { alert('Adicione pelo menos 1 objetivo material'); return; }

    const p: NIProfile = {
      metaM,
      meta180: metaM * 6,
      materials: validMaterials.map((m, i) => ({ ...m, priority: i + 1 })),
      impact: form.impact,
      anchor: form.anchor,
      startDate: profile?.startDate || today(),
      _version: 2,
    };
    db.set(profileKey, p);
    setProfile(p);
    setEditing(false);
  };

  // Days progress
  const daysProgress = (start: string) => {
    if (!start) return { elapsed: 0, remaining: 180, pct: 0 };
    const s = new Date(start + 'T00:00:00Z');
    const n = new Date();
    const elapsed = Math.min(180, Math.round((n.getTime() - s.getTime()) / 86400000));
    return { elapsed, remaining: Math.max(0, 180 - elapsed), pct: Math.round(elapsed / 180 * 100) };
  };

  if (editing || !profile) {
    return (
      <div className="max-w-2xl space-y-4 animate-in">
        <div>
          <h1 className="text-lg font-bold">🔥 Sua Nova Identidade</h1>
          <p className="text-sm text-t3 mt-1">Configure sua visão de 180 dias</p>
        </div>

        <div className="border-l-2 border-vred pl-4 py-2 bg-vred/5 rounded-r-lg text-sm text-t2 italic">
          "A maioria das pessoas subestima o que pode construir em 180 dias com execução diária."
        </div>

        <CardBase className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-t3 uppercase tracking-wider font-semibold">Meta mensal (USD)</label>
              <input type="number" value={form.metaM} onChange={e => setForm({ ...form, metaM: e.target.value })} placeholder="5000"
                className="mt-1 w-full bg-elevated border border-b1 rounded-lg px-4 py-2.5 font-mono text-center text-lg outline-none focus:border-vred/40" />
            </div>
            <div>
              <label className="text-xs text-t3 uppercase tracking-wider font-semibold">Meta 180 dias</label>
              <div className="mt-1 w-full bg-elevated border border-b1 rounded-lg px-4 py-2.5 font-mono text-center text-lg text-t4">
                {form.metaM ? fmt$(parseFloat(form.metaM) * 6) : '—'}
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs text-t3 uppercase tracking-wider font-semibold">Frase âncora pessoal</label>
            <input value={form.anchor} onChange={e => setForm({ ...form, anchor: e.target.value })} placeholder="Ex: Vim de longe demais para desistir."
              className="mt-1 w-full bg-elevated border border-b1 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-vred/40" />
          </div>

          {/* Materials list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs text-t3 uppercase tracking-wider font-semibold">Objetivos Materiais</label>
              <span className="text-2xs text-t4">{materials.length}/6</span>
            </div>
            {materials.map((item, idx) => (
              <div key={item.id} className="bg-elevated/50 border border-b1 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xs text-vgold font-bold">#{idx + 1}</span>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => moveMaterial(idx, -1)} disabled={idx === 0}
                      className="p-1 text-t4 hover:text-t1 disabled:opacity-20"><MoveUp size={12} /></button>
                    <button type="button" onClick={() => moveMaterial(idx, 1)} disabled={idx === materials.length - 1}
                      className="p-1 text-t4 hover:text-t1 disabled:opacity-20"><MoveDown size={12} /></button>
                    <button type="button" onClick={() => removeMaterial(item.id)} disabled={materials.length <= 1}
                      className="p-1 text-t4 hover:text-vred disabled:opacity-20"><Trash2 size={12} /></button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select value={item.category} onChange={e => updateMaterial(item.id, 'category', e.target.value)}
                    className="bg-elevated border border-b1 rounded-lg px-3 py-2 text-sm outline-none focus:border-vred/40 cursor-pointer">
                    <option value="car">🚗 Carro</option>
                    <option value="home">🏠 Moradia</option>
                    <option value="style">✨ Estilo de vida</option>
                    <option value="custom">🎯 Personalizado</option>
                  </select>
                  <input type="number" value={item.value || ''} onChange={e => updateMaterial(item.id, 'value', parseFloat(e.target.value) || 0)}
                    placeholder="Valor (R$)" className="bg-elevated border border-b1 rounded-lg px-3 py-2 font-mono text-sm outline-none focus:border-vred/40" />
                </div>
                <div className="flex gap-2">
                  <input value={item.label} onChange={e => updateMaterial(item.id, 'label', e.target.value)}
                    placeholder="Ex: Porsche 911 GT3" className="flex-1 bg-elevated border border-b1 rounded-lg px-3 py-2 text-sm outline-none focus:border-vred/40" />
                  <label className="relative cursor-pointer shrink-0">
                    <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(item.id, e)} />
                    {item.image ? (
                      <img src={item.image} alt={item.label} className="w-10 h-10 rounded-lg object-cover border border-b1" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-elevated border border-dashed border-b3 flex items-center justify-center text-t4 hover:border-vred/40 hover:text-vred transition-colors">
                        <Camera size={14} />
                      </div>
                    )}
                  </label>
                </div>
              </div>
            ))}
            {materials.length < 6 && (
              <button type="button" onClick={addMaterial}
                className="w-full flex items-center justify-center gap-2 bg-elevated border border-dashed border-b3 rounded-lg py-2.5 text-sm text-t3 hover:text-t1 hover:border-b2 transition-colors">
                <Plus size={14} /> Adicionar Objetivo
              </button>
            )}
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs text-t3 uppercase tracking-wider font-semibold">
              <Heart size={16} /> Quem você quer impactar
            </label>
            <textarea value={form.impact} onChange={e => setForm({ ...form, impact: e.target.value })} placeholder="Ex: Minha mãe, minha filha..."
              className="mt-1 w-full bg-elevated border border-b1 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-vred/40 min-h-[60px] resize-none" />
          </div>
          <button onClick={save} className="w-full flex items-center justify-center gap-2 bg-vred hover:bg-vred-dark text-white font-bold py-3.5 rounded-lg transition-colors">
            <Flame size={18} /> ATIVAR MINHA NOVA IDENTIDADE
          </button>
        </CardBase>
      </div>
    );
  }

  // Dashboard view
  const days = daysProgress(profile.startDate);
  const lifetimeComm = getLifetimeCommission(userId, session.name);
  const fp = profile.metaM > 0 ? Math.min(100, Math.round((lifetimeComm / profile.metaM) * 100)) : 0;
  const primaryItem = profile.materials.find(m => m.priority === 1) || profile.materials[0];

  return (
    <div className="space-y-5 animate-in">
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-vred/15 via-canvas to-canvas border border-vred/15 rounded-lg overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-canvas via-transparent to-transparent" />
        <div className="relative p-4">
          <div className="text-2xs text-t4 uppercase tracking-[0.2em] mb-2">SUA NOVA IDENTIDADE</div>
          <h1 className="text-xl font-bold mb-2">{session.name}</h1>
          {primaryItem && <p className="text-sm text-t3">→ {primaryItem.label}</p>}
          <div className="flex gap-2 mt-4 flex-wrap">
            <span className="bg-vgold/15 text-vgold border border-vgold/20 px-3 py-1 rounded-full text-xs font-bold">
              {fmt$(profile.metaM)}/mes
            </span>
            <span className="bg-elevated text-t3 border border-b1 px-3 py-1 rounded-full text-xs">
              {days.remaining} dias restantes
            </span>
            <span className="bg-vgreen/15 text-vgreen border border-vgreen/20 px-3 py-1 rounded-full text-xs font-bold">
              {fp}% da meta
            </span>
          </div>
        </div>
      </div>

      {/* Anchor */}
      {profile.anchor && (
        <div className="border-l-2 border-vred pl-4 py-3 bg-vred/5 rounded-r-lg text-sm text-t1 italic">
          "{profile.anchor}"
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Materials */}
        <CardBase>
          <h2 className="text-sm font-bold text-t3 uppercase tracking-wider mb-4">Meus Objetivos</h2>
          <div className="space-y-3">
            {profile.materials.map(item => (
              <div key={item.id} className="flex items-center gap-3 text-sm">
                {item.image ? (
                  <img src={item.image} alt={item.label} className="w-8 h-8 rounded-lg object-cover" />
                ) : (
                  <span className="text-lg">{CATEGORY_META[item.category].emoji}</span>
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-t2 truncate block">{item.label}</span>
                  {item.value > 0 && <span className="text-2xs text-vgold font-mono">{fmt$(item.value)}</span>}
                </div>
                {item.priority === 1 && <span className="text-2xs text-vgold font-bold">#1</span>}
              </div>
            ))}
            {profile.impact && (
              <div className="flex items-center gap-3 text-sm">
                <span className="text-lg">❤️</span>
                <span className="text-t2">{profile.impact}</span>
              </div>
            )}
          </div>
        </CardBase>

        {/* Progress */}
        <div className="space-y-4">
          {/* 180 days */}
          <div className="bg-vgold/5 border border-vgold/15 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs text-t3 uppercase tracking-wider font-semibold">Jornada de 180 dias</span>
              <span className="font-mono text-sm text-vgold">{days.elapsed}d / 180d</span>
            </div>
            <div className="h-2 bg-overlay rounded-full overflow-hidden mb-3">
              <div className="h-full bg-gradient-to-r from-vgold-dark to-vgold rounded-full transition-all duration-1000" style={{ width: `${days.pct}%` }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-elevated rounded-lg p-3 text-center">
                <div className="font-mono text-xl font-bold text-vgold">{days.elapsed}</div>
                <div className="text-2xs text-t4 uppercase">Executados</div>
              </div>
              <div className="bg-vred/8 border border-vred/15 rounded-lg p-3 text-center">
                <div className="font-mono text-xl font-bold text-vred">{days.remaining}</div>
                <div className="text-2xs text-t4 uppercase">Restam</div>
              </div>
            </div>
          </div>

          {/* Financial */}
          <CardBase>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold">💰 Financeiro</span>
              <span className="font-mono text-sm font-bold text-vgreen">{fp}%</span>
            </div>
            <div className="h-2 bg-overlay rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-1000 ${fp >= 80 ? 'bg-vgreen' : fp >= 40 ? 'bg-vgold' : 'bg-vred'}`} style={{ width: `${fp}%` }} />
            </div>
          </CardBase>

          <button onClick={() => setEditing(true)} className="w-full bg-elevated border border-b1 rounded-lg py-2.5 text-sm text-t3 hover:text-t1 hover:border-b3 transition-colors flex items-center justify-center gap-2">
            <Save size={14} /> Editar visao
          </button>
        </div>
      </div>
    </div>
  );
}
