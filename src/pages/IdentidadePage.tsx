import { useState } from 'react';
import { Flame, Car, Home, Dumbbell, Sparkles, Heart, Save, Camera } from 'lucide-react';
import { db, today, fmt$, getSession, getMonthSales } from '../lib/store';
import { CardBase } from '../components/ui/CardBase';

export interface NIProfile {
  metaM: number; meta180: number; car: string; home: string; body: string;
  style: string; impact: string; anchor: string; startDate: string;
  images?: Record<string, string>; // base64 images for car/home/body/style
  dreamItemLabel?: string; // which dream item is the primary objective (car/home/body/style)
  dreamItemValue?: number; // total cost of the dream item
}

export function IdentidadePage() {
  const session = getSession() || { id: 'anon', name: 'Anon', role: 'Setter', email: '' };
  const userId = session.id || 'anon';
  const profileKey = `ni_profile_${userId}`;

  const [profile, setProfile] = useState<NIProfile | null>(() => db.get(profileKey));
  const [editing, setEditing] = useState(!profile);
  const [form, setForm] = useState({
    metaM: profile?.metaM?.toString() || '',
    car: profile?.car || '',
    home: profile?.home || '',
    body: profile?.body || '',
    style: profile?.style || '',
    impact: profile?.impact || '',
    anchor: profile?.anchor || '',
    dreamItemLabel: profile?.dreamItemLabel || '',
    dreamItemValue: profile?.dreamItemValue?.toString() || '',
  });

  const [images, setImages] = useState<Record<string, string>>(profile?.images || {});

  const handleImageUpload = (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
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
        setImages(prev => ({ ...prev, [key]: b64 }));
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const save = () => {
    const metaM = parseFloat(form.metaM) || 0;
    if (!metaM) { alert('Defina sua meta mensal'); return; }
    const p: NIProfile = {
      metaM, meta180: metaM * 6,
      car: form.car, home: form.home, body: form.body,
      style: form.style, impact: form.impact, anchor: form.anchor,
      startDate: profile?.startDate || today(),
      images,
      dreamItemLabel: form.dreamItemLabel || undefined,
      dreamItemValue: parseFloat(form.dreamItemValue) || undefined,
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
          {/* Objetivo principal */}
          <div className="bg-vgold/5 border border-vgold/20 rounded-lg p-4 space-y-3">
            <label className="text-xs text-vgold uppercase tracking-wider font-bold">🎯 Objetivo Principal</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-2xs text-t4">Qual objetivo?</label>
                <select value={form.dreamItemLabel} onChange={e => setForm({ ...form, dreamItemLabel: e.target.value })}
                  className="mt-1 w-full bg-elevated border border-b1 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-vgold/40 cursor-pointer">
                  <option value="">Selecione...</option>
                  <option value="car">🚗 Carro</option>
                  <option value="home">🏠 Moradia</option>
                  <option value="body">💪 Corpo</option>
                  <option value="style">✨ Estilo de vida</option>
                </select>
              </div>
              <div>
                <label className="text-2xs text-t4">Valor do objetivo (R$)</label>
                <input type="number" value={form.dreamItemValue} onChange={e => setForm({ ...form, dreamItemValue: e.target.value })}
                  placeholder="Ex: 150000"
                  className="mt-1 w-full bg-elevated border border-b1 rounded-lg px-4 py-2.5 font-mono text-sm outline-none focus:border-vgold/40" />
              </div>
            </div>
          </div>

          {[
            { key: 'car', icon: <Car size={16} />, label: 'Carro desejado', ph: 'Ex: Honda Civic 2023' },
            { key: 'home', icon: <Home size={16} />, label: 'Moradia desejada', ph: 'Ex: Apto 2q Miami' },
            { key: 'body', icon: <Dumbbell size={16} />, label: 'Objetivo físico', ph: 'Ex: Perder 10kg' },
            { key: 'style', icon: <Sparkles size={16} />, label: 'Estilo de vida', ph: 'Ex: Academia diária' },
          ].map(f => (
            <div key={f.key}>
              <label className="flex items-center gap-2 text-xs text-t3 uppercase tracking-wider font-semibold">
                {f.icon} {f.label}
              </label>
              <div className="flex gap-3 mt-1">
                <input value={form[f.key as keyof typeof form]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.ph}
                  className="flex-1 bg-elevated border border-b1 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-vred/40" />
                <label className="relative cursor-pointer shrink-0">
                  <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(f.key, e)} />
                  {images[f.key] ? (
                    <img src={images[f.key]} alt={f.label} className="w-10 h-10 rounded-lg object-cover border border-b1" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-elevated border border-dashed border-b3 flex items-center justify-center text-t4 hover:border-vred/40 hover:text-vred transition-colors">
                      <Camera size={14} />
                    </div>
                  )}
                </label>
              </div>
            </div>
          ))}
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
  // Real financial progress from sales data (using proper db.list)
  const allSales = getMonthSales();
  const mySales = allSales.filter(s => s.sellerName === session.name || s.sellerId === session.id);
  const revenue = mySales.reduce((t, s) => t + (s.sellerSetupComm || 0) + (s.sellerRecComm || 0), 0);
  const fp = profile.metaM > 0 ? Math.min(100, Math.round((revenue / profile.metaM) * 100)) : 0;

  return (
    <div className="space-y-5 animate-in">
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-vred/15 via-canvas to-canvas border border-vred/15 rounded-lg overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-canvas via-transparent to-transparent" />
        <div className="relative p-4">
          <div className="text-2xs text-t4 uppercase tracking-[0.2em] mb-2">SUA NOVA IDENTIDADE</div>
          <h1 className="text-xl font-bold mb-2">{session.name}</h1>
          {profile.car && <p className="text-sm text-t3">→ {profile.car}</p>}
          <div className="flex gap-2 mt-4 flex-wrap">
            <span className="bg-vgold/15 text-vgold border border-vgold/20 px-3 py-1 rounded-full text-xs font-bold">
              {fmt$(profile.metaM)}/mês
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        {/* Vision */}
        <CardBase>
          <h2 className="text-sm font-bold text-t3 uppercase tracking-wider mb-4">Meus Objetivos</h2>
          <div className="space-y-3">
            {[
              { icon: '🚗', val: profile.car, imgKey: 'car' },
              { icon: '🏠', val: profile.home, imgKey: 'home' },
              { icon: '💪', val: profile.body, imgKey: 'body' },
              { icon: '✨', val: profile.style, imgKey: 'style' },
              { icon: '❤️', val: profile.impact, imgKey: '' },
            ].filter(x => x.val).map((x, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                {x.imgKey && profile.images?.[x.imgKey] ? (
                  <img src={profile.images[x.imgKey]} alt="" className="w-8 h-8 rounded-lg object-cover" />
                ) : (
                  <span className="text-lg">{x.icon}</span>
                )}
                <span className="text-t2">{x.val}</span>
              </div>
            ))}
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
            <Save size={14} /> Editar visão
          </button>
        </div>
      </div>
    </div>
  );
}
